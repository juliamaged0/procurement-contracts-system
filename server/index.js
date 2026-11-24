require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const { connectDb, query } = require('./config/db')
const { 
  calculateTenderBookletPrice, 
  calculateAwardDeductions, 
  generateAccountingJournalEntry,
  getApprovalAuthority,
  tafqeetCurrency 
} = require('./utils/calculations');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'procurement_super_secret_key_2026';

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/registry', require('./config/registryRoutes'));   

const { sanitizeMojibake } = require('./scripts/fix_mojibake');
// Global response sanitizer: automatically decodes any mojibake in outgoing JSON
app.use((req, res, next) => {
  const originalJson = res.json;
  res.json = function(data) {
    return originalJson.call(this, sanitizeMojibake(data));
  };
  next();
});

// Helper: Audit Logger
async function logAudit(req, action, entityName, entityId, details) {
  try {
    const user = req.user || { UserId: 1, Username: 'sa', Role: 'Admin' };
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
    
    await query(`
      INSERT INTO AuditLogs (UserId, Username, UserRole, Action, EntityName, EntityId, Details, IpAddress)
      VALUES (@userId, @username, @userRole, @action, @entityName, @entityId, @details, @ipAddress)
    `, {
      userId: user.UserId || 1,
      username: user.Username || 'sa',
      userRole: user.Role || 'Admin',
      action,
      entityName,
      entityId: String(entityId || ''),
      details: typeof details === 'object' ? JSON.stringify(details) : String(details || ''),
      ipAddress: String(ip)
    });
  } catch (err) {
    console.error('Audit Logging Error:', err.message);
  }
}

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    req.user = { UserId: 1, Username: 'sa', Role: 'Admin', FullName: 'المشرف العام (Super Admin)' };
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      req.user = { UserId: 1, Username: 'sa', Role: 'Admin', FullName: 'المشرف العام (Super Admin)' };
    } else {
      req.user = user;
    }
    next();
  });
};

const requireRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'غير مصرح لك بالوصول - يجب تسجيل الدخول' });
    }
    if (req.user.Role === 'Admin') return next();
    if (!roles.includes(req.user.Role)) {
      return res.status(403).json({ 
        error: `عفواً! ليس لديك صلاحية للقيام بهذا الإجراء. الصلاحيات المطلوبة: [${roles.join(', ')}]` 
      });
    }
    next();
  };
};

// ============================================================================
// 1. AUTHENTICATION & USERS
// ============================================================================

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'برجاء إدخال اسم المستخدم وكلمة المرور' });
    }

    const users = await query('SELECT * FROM Users WHERE Username = @username AND IsActive = 1', { username });
    if (!users || users.length === 0) {
      return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.PasswordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    }

    const token = jwt.sign(
      { UserId: user.UserId, Username: user.Username, Role: user.Role, FullName: user.FullName, Department: user.Department },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    await logAudit({ user }, 'تسجيل دخول ناجح', 'المستخدمين', user.UserId, `تسجيل الدخول للمستخدم ${user.FullName} كـ ${user.Role}`);

    res.json({
      token,
      user: {
        userId: user.UserId,
        username: user.Username,
        role: user.Role,
        fullName: user.FullName,
        department: user.Department
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  res.json({ user: req.user });
});

app.get('/api/users', authenticateToken, requireRoles('Admin'), async (req, res) => {
  try {
    const users = await query('SELECT UserId, Username, FullName, Role, Department, CreatedAt, IsActive FROM Users ORDER BY UserId ASC');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', authenticateToken, requireRoles('Admin'), async (req, res) => {
  try {
    const { username, password, fullName, role, department } = req.body;
    const existing = await query('SELECT UserId FROM Users WHERE Username = @username', { username });
    if (existing && existing.length > 0) {
      return res.status(400).json({ error: 'اسم المستخدم مسجل مسبقاً' });
    }

    const passwordHash = await bcrypt.hash(password || '1', 10);
    const result = await query(`
      INSERT INTO Users (Username, PasswordHash, FullName, Role, Department, IsActive)
      VALUES (@username, @passwordHash, @fullName, @role, @department, 1)
    `, {
      username, passwordHash, fullName, role, department: department || 'الإدارة العامة للعقود والمشتريات'
    });

    const newUserId = result.lastID;
    await logAudit(req, 'إنشاء مستخدم جديد', 'المستخدمين', newUserId, `تم إنشاء الحساب ${username} باسم ${fullName} بالصلاحية ${role}`);
    res.json({ message: 'تم إنشاء المستخدم بنجاح', userId: newUserId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// 2. AUDIT TRAIL & ARCHIVE
// ============================================================================

app.get('/api/audit-logs', authenticateToken, async (req, res) => {
  try {
    const logs = await query('SELECT * FROM AuditLogs ORDER BY LogId DESC LIMIT 200');
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/archive', authenticateToken, async (req, res) => {
  try {
    const { entityType } = req.query;
    let sqlQuery = 'SELECT * FROM ArchivedItems WHERE IsRestored = 0';
    let params = {};
    if (entityType) {
      sqlQuery += ' AND EntityType = @entityType';
      params.entityType = entityType;
    }
    sqlQuery += ' ORDER BY ArchiveId DESC';
    const archives = await query(sqlQuery, params);
    res.json(archives);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// 3. STEP 1: VENDORS REGISTRY & BLACKLIST
// ============================================================================

app.get('/api/vendors', authenticateToken, async (req, res) => {
  try {
    const { isBlacklisted, isRegistered, search, vendorType } = req.query;
    let sqlQuery = 'SELECT * FROM Vendors WHERE IsDeleted = 0';
    let params = {};

    if (isBlacklisted !== undefined) {
      sqlQuery += ' AND IsBlacklisted = @isBlacklisted';
      params.isBlacklisted = isBlacklisted === 'true' ? 1 : 0;
    }
    if (isRegistered !== undefined) {
      sqlQuery += ' AND IsRegistered = @isRegistered';
      params.isRegistered = isRegistered === 'true' ? 1 : 0;
    }
    if (vendorType) {
      sqlQuery += ' AND VendorType = @vendorType';
      params.vendorType = vendorType;
    }
    if (search) {
      sqlQuery += ' AND (CompanyName LIKE @search OR TaxCardNo LIKE @search OR CommercialRegisterNo LIKE @search)';
      params.search = `%${search}%`;
    }

    sqlQuery += ' ORDER BY VendorId DESC';
    const vendors = await query(sqlQuery, params);

    // Calculate Expiry Status Alerts
    const now = new Date();
    const enriched = vendors.map(v => {
      let taxDays = null;
      let taxAlert = 'سارية';
      if (v.TaxCardExpiry) {
        const exp = new Date(v.TaxCardExpiry);
        taxDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
        if (taxDays < 0) taxAlert = 'منتهية';
        else if (taxDays <= 30) taxAlert = 'توشك على الانتهاء (أقل من 30 يوماً)';
        else if (taxDays <= 60) taxAlert = 'قاربت على الانتهاء (أقل من 60 يوماً)';
      }

      let crDays = null;
      let crAlert = 'سارٍ';
      if (v.CommercialRegisterExpiry) {
        const exp = new Date(v.CommercialRegisterExpiry);
        crDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
        if (crDays < 0) crAlert = 'منتهي';
        else if (crDays <= 30) crAlert = 'يوشك على الانتهاء (أقل من 30 يوماً)';
        else if (crDays <= 60) crAlert = 'قارب على الانتهاء (أقل من 60 يوماً)';
      }

      return {
        ...v,
        TaxCardDaysRemaining: taxDays,
        TaxCardAlertStatus: taxAlert,
        CommercialRegisterDaysRemaining: crDays,
        CommercialRegisterAlertStatus: crAlert,
        HasExpiringDocuments: (taxDays !== null && taxDays <= 60) || (crDays !== null && crDays <= 60)
      };
    });

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/vendors', authenticateToken, requireRoles('Admin', 'VendorManager'), async (req, res) => {
  try {
    const {
      companyName, vendorType, legalEntity, companyType, address, phone, fax, email, 
      taxCardNo, taxCardExpiry, commercialRegisterNo, commercialRegisterExpiry, 
      categoryGroup, constructionGrade, constructionBranch, isRegistered, hasPreviousWorks
    } = req.body;

    if (!companyName || !taxCardNo) {
      return res.status(400).json({ error: 'اسم الشركة ورقم البطاقة الضريبية حقول إجبارية' });
    }

    // Unique Constraints Check
    const existingTax = await query('SELECT VendorId FROM Vendors WHERE TaxCardNo = @taxCardNo AND IsDeleted = 0', { taxCardNo });
    if (existingTax && existingTax.length > 0) {
      return res.status(400).json({ error: `عفواً! رقم البطاقة الضريبية (${taxCardNo}) مسجل مسبقاً لشركة أخرى في النظام (قيد فريد يمنع التكرار)` });
    }

    if (commercialRegisterNo) {
      const existingCR = await query('SELECT VendorId FROM Vendors WHERE CommercialRegisterNo = @commercialRegisterNo AND IsDeleted = 0', { commercialRegisterNo });
      if (existingCR && existingCR.length > 0) {
        return res.status(400).json({ error: `عفواً! رقم السجل التجاري (${commercialRegisterNo}) مسجل مسبقاً لشركة أخرى في النظام (قيد فريد يمنع التكرار)` });
      }
    }

    const finalLegalEntity = legalEntity || companyType || 'أفراد';
    const finalVendorType = vendorType || (constructionGrade && constructionGrade !== 'غير مجدول' ? 'مقاول' : 'مورد');

    const result = await query(`
      INSERT INTO Vendors (
        CompanyName, VendorType, LegalEntity, CompanyType, Address, Phone, Fax, Email, 
        TaxCardNo, TaxCardExpiry, CommercialRegisterNo, CommercialRegisterExpiry, 
        CategoryGroup, ConstructionGrade, ConstructionBranch,
        IsRegistered, HasPreviousWorks, IsBlacklisted, IsDeleted
      ) VALUES (
        @companyName, @vendorType, @legalEntity, @companyType, @address, @phone, @fax, @email,
        @taxCardNo, @taxCardExpiry, @commercialRegisterNo, @commercialRegisterExpiry,
        @categoryGroup, @constructionGrade, @constructionBranch,
        @isRegistered, @hasPreviousWorks, 0, 0
      )
    `, {
      companyName,
      vendorType: finalVendorType,
      legalEntity: finalLegalEntity,
      companyType: finalLegalEntity,
      address: address || null,
      phone: phone || null,
      fax: fax || null,
      email: email || null,
      taxCardNo,
      taxCardExpiry: taxCardExpiry || null,
      commercialRegisterNo: commercialRegisterNo || null,
      commercialRegisterExpiry: commercialRegisterExpiry || null,
      categoryGroup: categoryGroup || null,
      constructionGrade: constructionGrade || 'غير مجدول',
      constructionBranch: constructionBranch || null,
      isRegistered: isRegistered !== undefined ? (isRegistered ? 1 : 0) : 1,
      hasPreviousWorks: hasPreviousWorks !== undefined ? (hasPreviousWorks ? 1 : 0) : 1
    });

    const vendorId = result.lastID;
    await logAudit(req, 'تسجيل شركة/مورد', 'سجل الموردين', vendorId, `تم تسجيل ${companyName} كـ ${finalVendorType} (بطاقة: ${taxCardNo} - سجل: ${commercialRegisterNo || 'غير مدخل'})`);

    res.json({ message: 'تم تسجيل الشركة بنجاح بسجل الموردين والمقاولين', vendorId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Blacklist Vendor
app.post('/api/vendors/:id/blacklist', authenticateToken, requireRoles('Admin', 'VendorManager'), async (req, res) => {
  try {
    const vendorId = req.params.id;
    const { blacklistReason, blacklistAuthority, blacklistDate } = req.body;

    if (!blacklistReason) {
      return res.status(400).json({ error: 'برجاء توضيح سبب الشطب والإدراج بالقائمة السوداء' });
    }

    await query(`
      UPDATE Vendors
      SET IsBlacklisted = 1,
          BlacklistReason = @blacklistReason,
          BlacklistAuthority = @blacklistAuthority,
          BlacklistDate = @blacklistDate
      WHERE VendorId = @vendorId
    `, {
      vendorId,
      blacklistReason,
      blacklistAuthority: blacklistAuthority || 'مجلس الإدارة / السلطة المختصة',
      blacklistDate: blacklistDate || new Date().toISOString().split('T')[0]
    });

    await logAudit(req, 'إدراج بسجل الشطب ⛔', 'سجل الشطب', vendorId, `تم إدراج الشركة بسجل الشطب والممنوعين من التعامل. السبب: ${blacklistReason}`);
    res.json({ message: 'تم إضافة الشركة إلى سجل الشطب والممنوعين من التعامل بنجاح' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Unblacklist Vendor (زر إلغاء الشطب لإحياء السجل مع تسجيل السبب والتاريخ)
app.post('/api/vendors/:id/unblacklist', authenticateToken, requireRoles('Admin', 'VendorManager'), async (req, res) => {
  try {
    const vendorId = req.params.id;
    const { unblacklistedReason, unblacklistedAuthority, unblacklistedDate } = req.body;

    if (!unblacklistedReason) {
      return res.status(400).json({ error: 'برجاء تسجيل مسوغات وقرار إلغاء الشطب لإحياء السجل' });
    }

    await query(`
      UPDATE Vendors
      SET IsBlacklisted = 0,
          UnblacklistedReason = @unblacklistedReason,
          UnblacklistedAuthority = @unblacklistedAuthority,
          UnblacklistedDate = @unblacklistedDate
      WHERE VendorId = @vendorId
    `, {
      vendorId,
      unblacklistedReason,
      unblacklistedAuthority: unblacklistedAuthority || 'مجلس الإدارة',
      unblacklistedDate: unblacklistedDate || new Date().toISOString().split('T')[0]
    });

    await logAudit(req, 'إلغاء الشطب وإعادة قيد الشركة ✅', 'سجل الشطب', vendorId, `تم إلغاء الشطب وإعادة قيد الشركة بالسجل. المسوغات: ${unblacklistedReason}`);
    res.json({ message: 'تم إلغاء الشطب وإعادة قيد الشركة بنجاح في سجل الموردين والمقاولين' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/supply-categories', async (req, res) => {
  try {
    const categories = await query('SELECT * FROM SupplyCategories ORDER BY CategoryId ASC');
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// 4. STEP 2: TENDERS MASTER & TENDER ITEMS (الطرح والاحتياجات)
// ============================================================================

app.get('/api/needs-requests', authenticateToken, async (req, res) => {
  try {
    const requests = await query('SELECT * FROM NeedsRequests WHERE IsDeleted = 0 ORDER BY RequestId DESC');
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/needs-requests', authenticateToken, requireRoles('Admin', 'TenderOfficer'), async (req, res) => {
  try {
    const {
      operationName, operationType, estimatedValue, requestingDepartment, budgetHoldReference,
      executionDuration, fiscalYear, reservationType, initialReservation,
      approvalAuthorityDate, submittalType, warehouseBalance, constructionBranch, requiredGrade
    } = req.body;

    const result = await query(`
      INSERT INTO NeedsRequests (
        OperationName, OperationType, EstimatedValue, RequestingDepartment, BudgetHoldReference, ExecutionDuration,
        FiscalYear, ReservationType, InitialReservation, ApprovalAuthorityDate, SubmittalType,
        WarehouseBalance, ConstructionBranch, RequiredGrade, Status, IsDeleted
      ) VALUES (
        @operationName, @operationType, @estimatedValue, @requestingDepartment, @budgetHoldReference, @executionDuration,
        @fiscalYear, @reservationType, @initialReservation, @approvalAuthorityDate, @submittalType,
        @warehouseBalance, @constructionBranch, @requiredGrade, N'معلق', 0
      )
    `, {
      operationName, operationType, estimatedValue, requestingDepartment, 
      budgetHoldReference: budgetHoldReference || null,
      executionDuration: executionDuration || null,
      fiscalYear: fiscalYear || '2025/2026', reservationType: reservationType || 'موازنة الشركة', 
      initialReservation: initialReservation || estimatedValue,
      approvalAuthorityDate: approvalAuthorityDate || null, submittalType: submittalType || 'مظروفيين',
      warehouseBalance: warehouseBalance || 'لا يوجد رصيد بالمخازن', constructionBranch: constructionBranch || null, 
      requiredGrade: requiredGrade || null
    });

    const requestId = result.lastID;
    await logAudit(req, 'إضافة طلب احتياج', 'طلبات الاحتياج', requestId, `تم إنشاء طلب احتياج لعملية: ${operationName} بمذكرة حجز رقم ${budgetHoldReference || 'بدون'} بقيمة تقديرية ${estimatedValue} ج.م`);

    res.json({ message: 'تم إضافة طلب الاحتياج بنجاح', requestId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function generateTenderNumber(operationType, tenderMethod, fiscalYear) {
  let symbol = 'هـ';
  if (operationType === 'تعاقدات') {
    if (tenderMethod === 'مناقصة عامة') symbol = 'هـ';
    else if (tenderMethod === 'مناقصة محدودة') symbol = 'هـ م';
    else if (tenderMethod === 'ممارسة عامة') symbol = 'م ع';
    else if (tenderMethod === 'ممارسة محدودة') symbol = 'م ح';
    else if (tenderMethod === 'ممارسة محلية') symbol = 'م م';
    else if (tenderMethod === 'أمر مباشر') symbol = 'ا م';
  } else if (operationType === 'توريدات') {
    if (tenderMethod === 'مناقصة عامة') symbol = 'ت';
    else if (tenderMethod === 'مناقصة محدودة') symbol = 'ت م';
    else if (tenderMethod === 'ممارسة عامة') symbol = 'م ت';
    else if (tenderMethod === 'ممارسة محلية') symbol = 'م';
    else if (tenderMethod === 'أمر مباشر') symbol = 'أ';
  } else if (operationType === 'مزادات') {
    if (tenderMethod === 'مزايدة عامة') symbol = 'ز';
    else if (tenderMethod === 'مزايدة محدودة') symbol = 'ز م';
    else if (tenderMethod === 'أمر مباشر') symbol = 'ز أ';
  }

  const existing = await query(
    'SELECT COUNT(*) as count FROM Tenders WHERE TenderSymbol = @symbol AND FiscalYear = @fiscalYear',
    { symbol, fiscalYear }
  );

  const count = (existing && existing[0] && existing[0].count ? existing[0].count : 0) + 1;
  return {
    tenderNumber: `${count}/${fiscalYear}-${symbol}`,
    tenderSymbol: symbol
  };
}

app.get('/api/tenders', authenticateToken, async (req, res) => {
  try {
    const tenders = await query(`
      SELECT T.*, N.OperationName, N.OperationType, N.EstimatedValue, N.RequestingDepartment, N.BudgetHoldReference as ReqBudgetRef
      FROM Tenders T
      LEFT JOIN NeedsRequests N ON T.RequestId = N.RequestId
      WHERE T.IsDeleted = 0
      ORDER BY T.TenderId DESC
    `);
    res.json(tenders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/tenders/:tenderId/items', authenticateToken, async (req, res) => {
  try {
    const { tenderId } = req.params;
    const items = await query('SELECT * FROM TenderItems WHERE TenderId = @tenderId ORDER BY ItemNumber ASC', { tenderId });
    const parsed = (items || []).map(it => {
      let criteriaList = [];
      if (it.ItemCriteria) {
        try {
          if (it.ItemCriteria.trim().startsWith('[') || it.ItemCriteria.trim().startsWith('{')) {
            criteriaList = JSON.parse(it.ItemCriteria);
          }
        } catch (e) {
          criteriaList = [];
        }
      }
      return {
        ...it,
        criteriaList: Array.isArray(criteriaList) ? criteriaList : []
      };
    });
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tenders/calculate-booklet', async (req, res) => {
  const { basePrice, isSupply } = req.body;
  const result = calculateTenderBookletPrice(basePrice, isSupply);
  res.json(result);
});

// Master Tender Creation with Master Items & Total Estimated Value Auto-Calculation & Synchronized NeedsRequest Fields
app.post('/api/tenders', authenticateToken, requireRoles('Admin', 'TenderOfficer'), async (req, res) => {
  try {
    const {
      requestId, tenderName, operationName, operationType, requestingDepartment, tenderMethod, 
      baseBookletPrice, initialGuaranteeAmount, envelopeOpeningDate, budgetHoldReference, reservationType,
      fiscalYear, executionDuration, specsAndConditions, warehouseBalance, estimatedValue,
      adNewspaper1, adNewspaper2, adPublishDate, adDetails,
      evaluationMethod, technicalEvaluationMethod, passingScoreDecimal, minPassingScore,
      allowSplitAwarding, technicalCriteriaNotes, requiresSample, sampleDetails,
      constructionDivision, constructionCategory,
      financialApprovalObtained, financialApprovalDate, financialApprovalNotes,
      bookletFile, items, invitedVendors
    } = req.body;

    const requestData = requestId ? await query('SELECT * FROM NeedsRequests WHERE RequestId = @requestId', { requestId }) : [];
    let reqObj = null;
    let opType = operationType || 'توريدات';
    let fYear = fiscalYear || '2025/2026';
    let finalBudgetRef = budgetHoldReference;

    if (requestData && requestData.length > 0) {
      reqObj = requestData[0];
      // Guard: Block rejected needs requests from ever being tendered
      if (reqObj.WorkflowStatus === 'مرفوض' || reqObj.AuthorityApprovalStatus === 'مرفوض') {
        return res.status(400).json({ 
          error: 'عفواً! هذا الطلب مرفوض من قِبل السلطة المختصة ولا يمكن طرحه. يجب على الإدارة الطالبة تقديم طلب احتياج جديد من البداية.' 
        });
      }
      opType = operationType || reqObj.OperationType || 'توريدات';
      fYear = fiscalYear || reqObj.FiscalYear || '2025/2026';
      finalBudgetRef = finalBudgetRef || reqObj.BudgetHoldReference || 'موازنة الشركة';
    }

    const isSupply = opType === 'توريدات';
    const finalMethod = tenderMethod || (reqObj ? reqObj.TenderMethodSelected : 'مناقصة عامة') || 'مناقصة عامة';
    const { tenderNumber, tenderSymbol } = await generateTenderNumber(opType, finalMethod, fYear);
    const bookletCalc = calculateTenderBookletPrice(baseBookletPrice, isSupply);

    // Parse items from request body or fallback to NeedsRequest OperationItems
    let tenderItemsToSave = [];
    if (items && Array.isArray(items) && items.length > 0) {
      tenderItemsToSave = items;
    } else if (reqObj && reqObj.OperationItems) {
      try {
        const parsed = typeof reqObj.OperationItems === 'string' ? JSON.parse(reqObj.OperationItems) : reqObj.OperationItems;
        if (Array.isArray(parsed) && parsed.length > 0) {
          tenderItemsToSave = parsed;
        }
      } catch (e) {
        tenderItemsToSave = [];
      }
    }

    // Calculate Total Estimated Value from Tender Items or provided value
    let calculatedTotalEstimated = 0;
    if (tenderItemsToSave.length > 0) {
      calculatedTotalEstimated = tenderItemsToSave.reduce((sum, it) => sum + (parseFloat(it.estimatedQuantity || it.quantity || 0) * parseFloat(it.estimatedUnitPrice || it.unitPrice || 0)), 0);
    } else if (estimatedValue) {
      calculatedTotalEstimated = parseFloat(estimatedValue) || 0;
    } else if (reqObj) {
      calculatedTotalEstimated = reqObj.EstimatedValue;
    }

    const finalTenderName = tenderName || operationName || (reqObj ? reqObj.OperationName : 'عملية بدون عنوان');
    const finalDept = requestingDepartment || (reqObj ? reqObj.RequestingDepartment : 'الإدارة العامة للعقود والمشتريات');
    const finalExecDuration = executionDuration || (reqObj ? reqObj.ExecutionDuration : null);
    const finalSpecs = specsAndConditions || (reqObj ? reqObj.SpecsAndConditions : null);
    const finalWarehouse = warehouseBalance || (reqObj ? reqObj.WarehouseBalance : null);
    const finalReservationType = reservationType || (reqObj ? (reqObj.ReservationTypeNew || reqObj.ReservationType) : 'موازنة الشركة');
    const finalEvalMethod = evaluationMethod || technicalEvaluationMethod || (reqObj ? reqObj.TechnicalEvaluationMethod : 'تقرير فني') || 'تقرير فني';
    const finalMinScore = passingScoreDecimal || minPassingScore || (reqObj ? reqObj.MinPassingScore : 70) || 70;
    const finalAllowSplit = allowSplitAwarding !== undefined ? (allowSplitAwarding ? 1 : 0) : (reqObj ? (reqObj.AllowSplitAwarding || (isSupply ? 1 : 0)) : (isSupply ? 1 : 0));
    const finalCriteriaNotes = technicalCriteriaNotes || (reqObj ? reqObj.TechnicalCriteriaNotes : '');
    const finalConstructionDiv = constructionDivision || (reqObj ? (reqObj.ConstructionDivision || reqObj.ConstructionBranch) : null);
    const finalConstructionCat = constructionCategory || (reqObj ? (reqObj.ConstructionCategory || reqObj.RequiredGrade) : null);
    const finalFinApprObtained = financialApprovalObtained !== undefined ? (financialApprovalObtained ? 1 : 0) : (reqObj ? reqObj.FinancialApprovalObtained : 0);
    const finalFinApprDate = financialApprovalDate || (reqObj ? reqObj.FinancialApprovalDate : null);
    const finalFinApprNotes = financialApprovalNotes || (reqObj ? reqObj.FinancialApprovalNotes : null);

    // Handle optional booklet document file upload during tender creation
    let bookletFileName = null;
    let bookletFilePath = null;
    let bookletFileSize = 0;
    let bookletUploadedAt = null;

    if (bookletFile && bookletFile.fileData) {
      try {
        const uploadsDir = path.join(__dirname, 'uploads', 'booklets');
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

        const bFile = bookletFile;
        let base64Content = bFile.fileData;
        let ext = '.pdf';
        if (bFile.fileName && bFile.fileName.includes('.')) {
          ext = path.extname(bFile.fileName);
        }
        if (base64Content.includes(';base64,')) {
          base64Content = base64Content.split(';base64,')[1];
        }
        const uniqueName = `booklet-${Date.now()}-${Math.floor(Math.random() * 1000)}${ext}`;
        const targetPath = path.join(uploadsDir, uniqueName);
        fs.writeFileSync(targetPath, Buffer.from(base64Content, 'base64'));

        bookletFileName = bFile.fileName || `كراسة_شروط_${uniqueName}`;
        bookletFilePath = `/uploads/booklets/${uniqueName}`;
        bookletFileSize = bFile.fileSize || Buffer.from(base64Content, 'base64').length;
        bookletUploadedAt = new Date().toISOString();
      } catch (uploadErr) {
        console.error('Error saving booklet file during tender creation:', uploadErr);
      }
    }

    // Process Invited Vendors for limited tenders
    const invitedList = Array.isArray(invitedVendors) ? invitedVendors : [];
    const invitedVendorsCount = invitedList.length;
    const invitedVendorsJson = JSON.stringify(invitedList);

    const result = await query(`
      INSERT INTO Tenders (
        RequestId, TenderNumber, TenderSymbol, TenderName, TenderMethod, RequestingDepartment, BudgetHoldReference,
        FiscalYear, BaseBookletPrice, CalculatedBookletPrice, InitialGuaranteeAmount, EnvelopeOpeningDate, 
        AdNewspaper1, AdNewspaper2, AdPublishDate, AdDetails, EvaluationMethod, PassingScoreDecimal,
        RequiresSample, SampleDetails, BookletFileName, BookletFilePath, BookletFileSize, BookletUploadedAt,
        AllowSplitAwarding, TechnicalCriteriaNotes,
        OperationType, ExecutionDuration, WarehouseBalance, SpecsAndConditions, ReservationType, EstimatedValue,
        ConstructionDivision, ConstructionCategory, FinancialApprovalObtained, FinancialApprovalDate, FinancialApprovalNotes,
        InvitedVendorsCount, InvitedVendorsJson,
        Status, IsDeleted
      ) VALUES (
        @requestId, @tenderNumber, @tenderSymbol, @finalTenderName, @finalMethod, @finalDept, @finalBudgetRef,
        @fiscalYear, @baseBookletPrice, @calculatedBookletPrice, @initialGuaranteeAmount, @envelopeOpeningDate,
        @adNewspaper1, @adNewspaper2, @adPublishDate, @adDetails, @finalEvalMethod, @finalMinScore,
        @requiresSample, @sampleDetails, @bookletFileName, @bookletFilePath, @bookletFileSize, @bookletUploadedAt,
        @finalAllowSplit, @finalCriteriaNotes,
        @opType, @finalExecDuration, @finalWarehouse, @finalSpecs, @finalReservationType, @calculatedTotalEstimated,
        @finalConstructionDiv, @finalConstructionCat, @finalFinApprObtained, @finalFinApprDate, @finalFinApprNotes,
        @invitedVendorsCount, @invitedVendorsJson,
        N'نشط', 0
      )
    `, {
      requestId: requestId || null,
      tenderNumber,
      tenderSymbol,
      finalTenderName,
      finalMethod,
      finalDept,
      finalBudgetRef: finalBudgetRef || 'موازنة الشركة',
      fiscalYear: fYear,
      baseBookletPrice,
      calculatedBookletPrice: bookletCalc.finalPrice,
      initialGuaranteeAmount: initialGuaranteeAmount || (calculatedTotalEstimated * 0.015), // standard ~1.5%
      envelopeOpeningDate,
      adNewspaper1: adNewspaper1 || 'الأهرام',
      adNewspaper2: adNewspaper2 || 'الأخبار',
      adPublishDate: adPublishDate || null,
      adDetails: adDetails || null,
      finalEvalMethod,
      finalMinScore,
      requiresSample: requiresSample ? 1 : 0,
      sampleDetails: sampleDetails || null,
      bookletFileName,
      bookletFilePath,
      bookletFileSize,
      bookletUploadedAt,
      finalAllowSplit,
      finalCriteriaNotes,
      opType,
      finalExecDuration,
      finalWarehouse,
      finalSpecs,
      finalReservationType,
      calculatedTotalEstimated,
      finalConstructionDiv,
      finalConstructionCat,
      finalFinApprObtained,
      finalFinApprDate,
      finalFinApprNotes,
      invitedVendorsCount,
      invitedVendorsJson
    });

    const tenderId = result.lastID;

    // Save Master Tender Items
    if (tenderItemsToSave.length > 0) {
      for (let i = 0; i < tenderItemsToSave.length; i++) {
        const it = tenderItemsToSave[i];
        const qty = parseFloat(it.estimatedQuantity || it.quantity || 0);
        const price = parseFloat(it.estimatedUnitPrice || it.unitPrice || 0);
        const total = qty * price;
        await query(`
          INSERT INTO TenderItems (
            TenderId, ItemNumber, ItemDescription, Unit, EstimatedQuantity, EstimatedUnitPrice, EstimatedTotalPrice, Notes,
            ItemSpecs, ItemMaxScore, ItemMinPassingScore, ItemCriteria, AllowSplit
          )
          VALUES (
            @tenderId, @itemNumber, @itemDescription, @unit, @estimatedQuantity, @estimatedUnitPrice, @estimatedTotalPrice, @notes,
            @itemSpecs, @itemMaxScore, @itemMinPassingScore, @itemCriteria, @allowSplit
          )
        `, {
          tenderId,
          itemNumber: i + 1,
          itemDescription: it.itemDescription || it.description || it.name || 'بند غير مسمى',
          unit: it.unit || 'عدد',
          estimatedQuantity: qty,
          estimatedUnitPrice: price,
          estimatedTotalPrice: total,
          notes: it.notes || null,
          itemSpecs: it.specs || it.itemSpecs || null,
          itemMaxScore: parseFloat(it.itemMaxScore) || 100,
          itemMinPassingScore: parseFloat(it.itemMinPassingScore) || 70,
          itemCriteria: (it.criteriaList && Array.isArray(it.criteriaList) && it.criteriaList.length > 0)
            ? JSON.stringify(it.criteriaList)
            : (typeof it.itemCriteria === 'object' ? JSON.stringify(it.itemCriteria) : (it.itemCriteria || null)),
          allowSplit: it.allowSplit !== undefined ? (it.allowSplit ? 1 : 0) : 1
        });
      }
    }

    // Save Invited Vendors into TenderInvitedVendors table
    if (invitedList.length > 0) {
      for (const iv of invitedList) {
        await query(`
          INSERT INTO TenderInvitedVendors (
            TenderId, VendorId, VendorName, TaxCardNo, CommercialRegisterNo, Phone, Email,
            InvitationMethod, InvitationLetterNo, InvitationDate, ResponseStatus, Notes
          ) VALUES (
            @tenderId, @vendorId, @vendorName, @taxCardNo, @commercialRegisterNo, @phone, @email,
            @invitationMethod, @invitationLetterNo, @invitationDate, @responseStatus, @notes
          )
        `, {
          tenderId,
          vendorId: iv.vendorId || iv.VendorId || null,
          vendorName: iv.vendorName || iv.VendorName || iv.companyName || iv.CompanyName || 'شركة غير محددة',
          taxCardNo: iv.taxCardNo || iv.TaxCardNo || null,
          commercialRegisterNo: iv.commercialRegisterNo || iv.CommercialRegisterNo || null,
          phone: iv.phone || iv.Phone || null,
          email: iv.email || iv.Email || null,
          invitationMethod: iv.invitationMethod || 'بريد مسجل بعلم الوصول',
          invitationLetterNo: iv.invitationLetterNo || null,
          invitationDate: iv.invitationDate || new Date().toISOString().split('T')[0],
          responseStatus: iv.responseStatus || 'تم توجيه الدعوة',
          notes: iv.notes || null
        });
      }
    }

    if (requestId) {
      await query("UPDATE NeedsRequests SET Status = N'مطروح' WHERE RequestId = @requestId", { requestId });
    }

    await logAudit(req, 'طرح عملية جديدة', 'شاشة الطرح', tenderId, `تم طرح العملية برقم ${tenderNumber} (${finalMethod}) بقيمة تقديرية ${calculatedTotalEstimated} ج.م ومذكرة حجز: ${finalBudgetRef}. مدعوين: ${invitedVendorsCount}`);

    res.json({ 
      message: 'تم طرح العملية بنجاح برقم: ' + tenderNumber, 
      tenderNumber, 
      tenderId,
      calculatedTotalEstimated,
      totalEstimatedTafqeet: tafqeetCurrency(calculatedTotalEstimated),
      invitedVendorsCount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET: Tender Invited Vendors for Limited Tenders / Practices
app.get('/api/tenders/:tenderId/invited-vendors', authenticateToken, async (req, res) => {
  try {
    const { tenderId } = req.params;
    const list = await query(
      'SELECT * FROM TenderInvitedVendors WHERE TenderId = @tenderId ORDER BY InvitedId ASC',
      { tenderId }
    );
    res.json(list || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST: Add Invited Vendor to a Tender
app.post('/api/tenders/:tenderId/invited-vendors', authenticateToken, requireRoles('Admin', 'TenderOfficer'), async (req, res) => {
  try {
    const { tenderId } = req.params;
    const {
      vendorId, vendorName, taxCardNo, commercialRegisterNo, phone, email,
      invitationMethod, invitationLetterNo, invitationDate, responseStatus, notes
    } = req.body;

    if (!vendorName) {
      return res.status(400).json({ error: 'اسم المورد أو المقاول حقل إجباري' });
    }

    const insRes = await query(`
      INSERT INTO TenderInvitedVendors (
        TenderId, VendorId, VendorName, TaxCardNo, CommercialRegisterNo, Phone, Email,
        InvitationMethod, InvitationLetterNo, InvitationDate, ResponseStatus, Notes
      ) VALUES (
        @tenderId, @vendorId, @vendorName, @taxCardNo, @commercialRegisterNo, @phone, @email,
        @invitationMethod, @invitationLetterNo, @invitationDate, @responseStatus, @notes
      )
    `, {
      tenderId,
      vendorId: vendorId || null,
      vendorName,
      taxCardNo: taxCardNo || null,
      commercialRegisterNo: commercialRegisterNo || null,
      phone: phone || null,
      email: email || null,
      invitationMethod: invitationMethod || 'بريد مسجل بعلم الوصول',
      invitationLetterNo: invitationLetterNo || null,
      invitationDate: invitationDate || new Date().toISOString().split('T')[0],
      responseStatus: responseStatus || 'تم توجيه الدعوة',
      notes: notes || null
    });

    // Update count in Tenders table
    const countRes = await query('SELECT COUNT(*) as cnt FROM TenderInvitedVendors WHERE TenderId = @tenderId', { tenderId });
    const cnt = countRes[0]?.cnt || 1;
    await query('UPDATE Tenders SET InvitedVendorsCount = @cnt WHERE TenderId = @tenderId', { cnt, tenderId });

    res.json({ message: 'تم إضافة المورد/المقاول لقائمة المدعوين بنجاح', invitedId: insRes.lastID, count: cnt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE: Remove Invited Vendor
app.delete('/api/tenders/:tenderId/invited-vendors/:invitedId', authenticateToken, requireRoles('Admin', 'TenderOfficer'), async (req, res) => {
  try {
    const { tenderId, invitedId } = req.params;
    await query('DELETE FROM TenderInvitedVendors WHERE InvitedId = @invitedId AND TenderId = @tenderId', { invitedId, tenderId });
    const countRes = await query('SELECT COUNT(*) as cnt FROM TenderInvitedVendors WHERE TenderId = @tenderId', { tenderId });
    const cnt = countRes[0]?.cnt || 0;
    await query('UPDATE Tenders SET InvitedVendorsCount = @cnt WHERE TenderId = @tenderId', { cnt, tenderId });

    res.json({ message: 'تم حذف المورد من قائمة المدعوين', count: cnt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload/Attach Booklet document to an existing tender
app.post('/api/tenders/:id/booklet', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { fileName, fileData, fileSize } = req.body;
    if (!fileData) {
      return res.status(400).json({ error: 'لم يتم إرسال ملف كراسة الشروط' });
    }

    const uploadsDir = path.join(__dirname, 'uploads', 'booklets');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    let base64Content = fileData;
    let ext = '.pdf';
    if (fileName && fileName.includes('.')) {
      ext = path.extname(fileName);
    }
    if (base64Content.includes(';base64,')) {
      base64Content = base64Content.split(';base64,')[1];
    }
    const uniqueName = `booklet-tender-${id}-${Date.now()}${ext}`;
    const targetPath = path.join(uploadsDir, uniqueName);
    fs.writeFileSync(targetPath, Buffer.from(base64Content, 'base64'));

    const originalName = fileName || `كراسة_شروط_عملية_${id}${ext}`;
    const publicUrl = `/uploads/booklets/${uniqueName}`;
    const calculatedSize = fileSize || Buffer.from(base64Content, 'base64').length;
    const uploadTime = new Date().toISOString();

    await query(`
      UPDATE Tenders SET
        BookletFileName = @originalName,
        BookletFilePath = @publicUrl,
        BookletFileSize = @calculatedSize,
        BookletUploadedAt = @uploadTime
      WHERE TenderId = @id
    `, { originalName, publicUrl, calculatedSize, uploadTime, id });

    await logAudit(req, 'رفع كراسة الشروط', 'Tenders', id, `تم رفع مستند كراسة الشروط: ${originalName} بحجم ${calculatedSize} بايت`);

    res.json({
      success: true,
      message: 'تم رفع وحفظ مستند كراسة الشروط بنجاح',
      booklet: {
        fileName: originalName,
        filePath: publicUrl,
        fileSize: calculatedSize,
        uploadedAt: uploadTime
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Remove Booklet document from a tender
app.delete('/api/tenders/:id/booklet', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const tenders = await query('SELECT * FROM Tenders WHERE TenderId = @id', { id });
    if (tenders && tenders.length > 0 && tenders[0].BookletFilePath) {
      const fullPath = path.join(__dirname, tenders[0].BookletFilePath);
      if (fs.existsSync(fullPath)) {
        try { fs.unlinkSync(fullPath); } catch (e) {}
      }
    }

    await query(`
      UPDATE Tenders SET
        BookletFileName = NULL,
        BookletFilePath = NULL,
        BookletFileSize = 0,
        BookletUploadedAt = NULL
      WHERE TenderId = @id
    `, { id });

    await logAudit(req, 'حذف كراسة الشروط', 'Tenders', id, `تم حذف مستند كراسة الشروط للعملية رقم ${id}`);
    res.json({ success: true, message: 'تم حذف مستند كراسة الشروط' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Download Booklet document
app.get('/api/tenders/:id/booklet/download', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const tenders = await query('SELECT * FROM Tenders WHERE TenderId = @id', { id });
    if (!tenders || tenders.length === 0 || !tenders[0].BookletFilePath) {
      return res.status(404).json({ error: 'ملف كراسة الشروط غير متوفر لهذه العملية' });
    }
    const t = tenders[0];
    const fullPath = path.join(__dirname, t.BookletFilePath);
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'الملف غير موجود على الخادم' });
    }
    res.download(fullPath, t.BookletFileName || path.basename(fullPath));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// 5. STEP 3: ENVELOPE OPENING & COMPARATIVE BID EVALUATION
// ============================================================================

app.get('/api/tenders/:tenderId/submissions', authenticateToken, async (req, res) => {
  try {
    const { tenderId } = req.params;
    const submissions = await query(`
      SELECT S.*, V.CompanyName, V.VendorType, V.TaxCardNo, V.CommercialRegisterNo, V.IsRegistered, V.HasPreviousWorks, V.IsBlacklisted, V.BlacklistReason
      FROM BidSubmissions S
      JOIN Vendors V ON S.VendorId = V.VendorId
      WHERE S.TenderId = @tenderId AND S.IsDeleted = 0
      ORDER BY S.SubmissionId ASC
    `, { tenderId });

    for (let sub of submissions) {
      sub.items = await query('SELECT * FROM BidItems WHERE SubmissionId = @submissionId', { submissionId: sub.SubmissionId });
    }

    res.json(submissions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Submissions with System Validation against Blacklisted Vendors & Auto Price Calculation
app.post('/api/submissions', authenticateToken, requireRoles('Admin', 'CommitteeMember'), async (req, res) => {
  try {
    const {
      tenderId, vendorId, initialInsuranceAmount, guaranteePaymentMethod, initialInsuranceStatus,
      receiptNumber, receiptDate, checkNumber, bankName, checkDate, guaranteeLetterNo, 
      guaranteeLetterIssueDate, guaranteeLetterExpiryDate, deductionNoteNo, deductionNoteDate, deductionEntity,
      hasCommercialRegister, commercialRegisterNo, commercialRegisterValidUntil,
      hasTaxCard, taxCardNo, taxCardValidUntil, hasFederationCert, federationGrade,
      hasEInvoiceModel, hasAdvancePaymentCert, hasPreviousWorks, hasVATCert, hasCatalog,
      hasCert14S, hasCert4S, hasApprovalCert, sampleSubmitted, sampleNumber, sampleDeliveryDate, sampleNotes,
      items
    } = req.body;

    // SYSTEM VALIDATION: Blacklist Enforcement
    const vendorData = await query('SELECT * FROM Vendors WHERE VendorId = @vendorId', { vendorId });
    if (!vendorData || vendorData.length === 0) {
      return res.status(404).json({ error: 'المورد أو الشركة غير موجودة بالنظام' });
    }

    if (vendorData[0].IsBlacklisted) {
      await logAudit(req, 'محاولة تسجيل عطاء محظور ⛔', 'فض المظاريف', vendorId, `تم منع محاولة تسجيل عطاء للشركة المشطوبة: ${vendorData[0].CompanyName}`);
      return res.status(400).json({
        error: `عفواً! لا يمكن تسجيل العطاء لأن الشركة (${vendorData[0].CompanyName}) مدرجة بالقائمة السوداء وسجل الشطب ومحظور التعامل معها فـوراً. السبب: ${vendorData[0].BlacklistReason || 'قرار سلطة مختصة'}`
      });
    }

    const existing = await query('SELECT COUNT(*) as count FROM BidSubmissions WHERE TenderId = @tenderId', { tenderId });
    const count = (existing && existing[0] && existing[0].count ? existing[0].count : 0) + 1;
    const bidFractionSerial = `${count}/${count}`;

    // Item pricing calculation: Quoted_Unit_Price * Estimated_Quantity
    let financialTotal = 0;
    if (items && Array.isArray(items)) {
      financialTotal = items.reduce((sum, item) => sum + (parseFloat(item.quantity || 0) * parseFloat(item.unitPrice || 0)), 0);
    }

    const result = await query(`
      INSERT INTO BidSubmissions (
        TenderId, VendorId, BidFractionSerial, InitialInsuranceAmount, GuaranteePaymentMethod, InitialInsuranceStatus,
        ReceiptNumber, ReceiptDate, CheckNumber, BankName, CheckDate, GuaranteeLetterNo, GuaranteeLetterIssueDate, GuaranteeLetterExpiryDate,
        DeductionNoteNo, DeductionNoteDate, DeductionEntity, HasCommercialRegister, CommercialRegisterNo,
        CommercialRegisterValidUntil, HasTaxCard, TaxCardNo, TaxCardValidUntil, HasFederationCert, FederationGrade,
        HasEInvoiceModel, HasAdvancePaymentCert, HasPreviousWorks, HasVATCert, HasCatalog, HasCert14S, HasCert4S,
        HasApprovalCert, SampleSubmitted, SampleNumber, SampleDeliveryDate, SampleNotes, TechnicalStatus, FinancialTotalAmount, IsDeleted
      ) VALUES (
        @tenderId, @vendorId, @bidFractionSerial, @initialInsuranceAmount, @guaranteePaymentMethod, @initialInsuranceStatus,
        @receiptNumber, @receiptDate, @checkNumber, @bankName, @checkDate, @guaranteeLetterNo, @guaranteeLetterIssueDate, @guaranteeLetterExpiryDate,
        @deductionNoteNo, @deductionNoteDate, @deductionEntity, @hasCommercialRegister, @commercialRegisterNo,
        @commercialRegisterValidUntil, @hasTaxCard, @taxCardNo, @taxCardValidUntil, @hasFederationCert, @federationGrade,
        @hasEInvoiceModel, @hasAdvancePaymentCert, @hasPreviousWorks, @hasVATCert, @hasCatalog, @hasCert14S, @hasCert4S,
        @hasApprovalCert, @sampleSubmitted, @sampleNumber, @sampleDeliveryDate, @sampleNotes, N'تحت التقييم', @financialTotal, 0
      )
    `, {
      tenderId, vendorId, bidFractionSerial,
      initialInsuranceAmount: initialInsuranceAmount || 0,
      guaranteePaymentMethod: guaranteePaymentMethod || 'نقداً',
      initialInsuranceStatus: initialInsuranceStatus || 'ساري',
      receiptNumber: receiptNumber || null, receiptDate: receiptDate || null,
      checkNumber: checkNumber || null, bankName: bankName || null, checkDate: checkDate || null,
      guaranteeLetterNo: guaranteeLetterNo || null, guaranteeLetterIssueDate: guaranteeLetterIssueDate || null, guaranteeLetterExpiryDate: guaranteeLetterExpiryDate || null,
      deductionNoteNo: deductionNoteNo || null, deductionNoteDate: deductionNoteDate || null, deductionEntity: deductionEntity || null,
      hasCommercialRegister: hasCommercialRegister ? 1 : 0, commercialRegisterNo: commercialRegisterNo || null, commercialRegisterValidUntil: commercialRegisterValidUntil || null,
      hasTaxCard: hasTaxCard ? 1 : 0, taxCardNo: taxCardNo || null, taxCardValidUntil: taxCardValidUntil || null,
      hasFederationCert: hasFederationCert ? 1 : 0, federationGrade: federationGrade || null,
      hasEInvoiceModel: hasEInvoiceModel ? 1 : 0, hasAdvancePaymentCert: hasAdvancePaymentCert ? 1 : 0,
      hasPreviousWorks: hasPreviousWorks ? 1 : 0, hasVATCert: hasVATCert ? 1 : 0, hasCatalog: hasCatalog ? 1 : 0,
      hasCert14S: hasCert14S ? 1 : 0, hasCert4S: hasCert4S ? 1 : 0, hasApprovalCert: hasApprovalCert ? 1 : 0,
      sampleSubmitted: sampleSubmitted ? 1 : 0, sampleNumber: sampleNumber || null, sampleDeliveryDate: sampleDeliveryDate || null, sampleNotes: sampleNotes || null,
      financialTotal
    });

    const submissionId = result.lastID || count;

    if (items && Array.isArray(items)) {
      for (let item of items) {
        const qty = parseFloat(item.quantity || 0);
        const price = parseFloat(item.unitPrice || 0);
        await query(`
          INSERT INTO BidItems (SubmissionId, TenderItemId, ItemName, UnitType, Quantity, UnitPrice, TotalPrice, TechnicalEvaluation, Notes)
          VALUES (@submissionId, @tenderItemId, @itemName, @unitType, @quantity, @unitPrice, @totalPrice, @technicalEvaluation, @notes)
        `, {
          submissionId,
          tenderItemId: item.tenderItemId || null,
          itemName: item.itemName,
          unitType: item.unitType || 'عدد',
          quantity: qty,
          unitPrice: price,
          totalPrice: qty * price,
          technicalEvaluation: item.technicalEvaluation || 'مقبول أساسي',
          notes: item.notes || null
        });
      }
    }

    await logAudit(req, 'تفريغ عطاء جديد', 'فض المظاريف', submissionId, `تم تفريغ عطاء ${vendorData[0].CompanyName} بالكسر ${bidFractionSerial} وإجمالي ${financialTotal} ج.م`);

    res.json({ message: 'تم إدخال وتفريغ العطاء بنجاح', submissionId, bidFractionSerial, financialTotal });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Auto-Sorting Logic: كشف التفريغ المقارن وجدول مقارنة الأسعار للعطاءات المقبولة فنياً
app.get('/api/tenders/:tenderId/comparative-analysis', authenticateToken, async (req, res) => {
  try {
    const { tenderId } = req.params;
    const submissions = await query(`
      SELECT S.*, V.CompanyName, V.VendorType, V.TaxCardNo, V.CommercialRegisterNo, V.ConstructionGrade
      FROM BidSubmissions S
      JOIN Vendors V ON S.VendorId = V.VendorId
      WHERE S.TenderId = @tenderId AND S.IsDeleted = 0
    `, { tenderId });

    // Separate Technically Accepted vs Rejected
    const acceptedBids = submissions
      .filter(s => s.TechnicalStatus === 'مقبول')
      .sort((a, b) => parseFloat(a.FinancialTotalAmount || 0) - parseFloat(b.FinancialTotalAmount || 0));

    // Assign ASC Financial Rank
    acceptedBids.forEach((bid, idx) => {
      bid.FinancialRank = idx + 1;
      bid.IsLowestPrice = idx === 0;
      bid.FinancialTotalTafqeet = tafqeetCurrency(bid.FinancialTotalAmount);
    });

    const rejectedBids = submissions.filter(s => s.TechnicalStatus === 'مرفوض');
    const underReviewBids = submissions.filter(s => s.TechnicalStatus === 'تحت التقييم');

    res.json({
      tenderId,
      totalBids: submissions.length,
      acceptedCount: acceptedBids.length,
      rejectedCount: rejectedBids.length,
      comparativeRanking: acceptedBids,
      rejectedBids,
      underReviewBids,
      lowestBidder: acceptedBids.length > 0 ? acceptedBids[0] : null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Evaluate Bids
app.post('/api/tenders/:tenderId/evaluate', authenticateToken, requireRoles('Admin', 'CommitteeMember'), async (req, res) => {
  try {
    const { tenderId } = req.params;
    const { evaluations } = req.body;

    if (evaluations && Array.isArray(evaluations)) {
      for (let ev of evaluations) {
        await query(`
          UPDATE BidSubmissions
          SET TechnicalStatus = @technicalStatus,
              TechnicalScore = @technicalScore
          WHERE SubmissionId = @submissionId
        `, {
          submissionId: ev.submissionId,
          technicalStatus: ev.technicalStatus,
          technicalScore: ev.technicalScore || 0
        });
      }
    }

    await query("UPDATE Tenders SET Status = N'مبتوت' WHERE TenderId = @tenderId", { tenderId });
    await logAudit(req, 'اعتماد محضر البت', 'شاشة البت', tenderId, `تم اعتماد تقييم البت الفني والمالي للعملية رقم ${tenderId}`);

    res.json({ message: 'تم إتمام عملية البت الفني والمالي بنجاح' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// 6. STEP 4: AWARDING, ORDERS, 5% FINAL GUARANTEE & 10 DAYS DEADLINE
// ============================================================================

app.post('/api/awardings/calculate-deductions', async (req, res) => {
  const { awardedAmount, isSupply, numOfPages, awardDate } = req.body;
  const result = calculateAwardDeductions(awardedAmount, isSupply, numOfPages, awardDate || new Date());
  res.json(result);
});

app.post('/api/awardings', authenticateToken, requireRoles('Admin', 'FinancialAuditor'), async (req, res) => {
  try {
    const {
      tenderId, winnerSubmissionId, awardedAmount, authorityApprovalDate,
      reservationConfirmDate, budgetSource, finalGuaranteePaymentMethod, numOfPages, awardDate
    } = req.body;

    const tenderObj = await query(`
      SELECT T.*, N.OperationType, N.FiscalYear, N.OperationName
      FROM Tenders T
      LEFT JOIN NeedsRequests N ON T.RequestId = N.RequestId
      WHERE T.TenderId = @tenderId
    `, { tenderId });

    if (!tenderObj || tenderObj.length === 0) {
      return res.status(404).json({ error: 'العملية غير موجودة' });
    }

    const tData = tenderObj[0];
    const subObj = await query('SELECT S.*, V.VendorId, V.CompanyName FROM BidSubmissions S JOIN Vendors V ON S.VendorId = V.VendorId WHERE S.SubmissionId = @winnerSubmissionId', { winnerSubmissionId });
    if (!subObj || subObj.length === 0) {
      return res.status(404).json({ error: 'عطاء الترسية غير موجود' });
    }
    const winnerVendor = subObj[0];

    const isSupply = tData.OperationType === 'توريدات';
    const awardDateStr = awardDate || new Date().toISOString().split('T')[0];
    
    // Core Business Logic: 5% Insurance Rule & 10 Days Deadline & Tafqeet
    const deductions = calculateAwardDeductions(awardedAmount, isSupply, numOfPages || 10, awardDateStr);

    const poCount = (await query('SELECT COUNT(*) as count FROM Awardings'))[0].count + 1;
    const purchaseOrderNo = `PO-${poCount}/${tData.FiscalYear}`;
    const journalDirectiveNo = `JD-${poCount}/${tData.FiscalYear}`;

    await query(`
      INSERT INTO Awardings (
        TenderId, WinnerSubmissionId, VendorId, AwardDate, AwardedAmount, AwardedAmountTafqeet,
        AuthorityApprovalDate, ReservationConfirmDate, BudgetSource, FinalGuaranteeAmount,
        FinalGuaranteeTafqeet, FinalGuaranteeStatus, FinalGuaranteePaymentMethod, ContractSigningDeadline,
        EngineeringStamp, AppliedStamp, DevelopmentStamp, ExtensionStamp, FederationFee,
        ShaheedStamp, TahyaMisrFund, PostalTransferFee, TotalDeductions, NetAwardAmount,
        PurchaseOrderNo, PurchaseOrderDate, JournalDirectiveNo, JournalDirectiveDate
      ) VALUES (
        @tenderId, @winnerSubmissionId, @vendorId, @awardDateStr, @awardedAmount, @awardedAmountTafqeet,
        @authorityApprovalDate, @reservationConfirmDate, @budgetSource, @finalGuaranteeAmount,
        @finalGuaranteeTafqeet, N'قيد السداد', @finalGuaranteePaymentMethod, @contractSigningDeadline,
        @engineeringStamp, @appliedStamp, @developmentStamp, @extensionStamp, @federationFee,
        @shaheedStamp, @tahyaMisrFund, @postalTransferFee, @totalDeductions, @netAwardAmount,
        @purchaseOrderNo, @awardDateStr, @journalDirectiveNo, @awardDateStr
      )
    `, {
      tenderId,
      winnerSubmissionId,
      vendorId: winnerVendor.VendorId,
      awardDateStr,
      awardedAmount: deductions.awardedAmount,
      awardedAmountTafqeet: deductions.awardedAmountTafqeet,
      authorityApprovalDate: authorityApprovalDate || awardDateStr,
      reservationConfirmDate: reservationConfirmDate || awardDateStr,
      budgetSource: budgetSource || 'موازنة الشركة',
      finalGuaranteeAmount: deductions.finalGuarantee,
      finalGuaranteeTafqeet: deductions.finalGuaranteeTafqeet,
      finalGuaranteePaymentMethod: finalGuaranteePaymentMethod || 'نقداً',
      contractSigningDeadline: deductions.contractSigningDeadline,
      engineeringStamp: deductions.engineeringStamp,
      appliedStamp: deductions.appliedStamp,
      developmentStamp: deductions.devStamp,
      extensionStamp: deductions.extensionStamp,
      federationFee: deductions.federationFee,
      shaheedStamp: deductions.shaheedStamp,
      tahyaMisrFund: deductions.tahyaMisrFund,
      postalTransferFee: deductions.postalTransferFee,
      totalDeductions: deductions.totalDeductions,
      netAwardAmount: deductions.netAwardAmount,
      purchaseOrderNo,
      journalDirectiveNo
    });

    // Automated Accounting Entries Generation (STEP 5 Integration)
    // 1. قيد تحويل التأمين الابتدائي لنهائي بموجب إذن التوجيه الحسابي
    const transferEntry = generateAccountingJournalEntry('INITIAL_TO_FINAL_TRANSFER', {
      amount: winnerVendor.InitialInsuranceAmount || deductions.finalGuarantee,
      vendorName: winnerVendor.CompanyName,
      journalDirectiveNo
    });

    await query(`
      INSERT INTO FinancialTransactions (
        TenderId, VendorId, TransactionType, DebitAccountCode, DebitAccountName,
        CreditAccountCode, CreditAccountName, Amount, AmountTafqeet, VoucherNumber, TransactionDate, Notes
      ) VALUES (
        @tenderId, @vendorId, @type, @debitCode, @debitName,
        @creditCode, @creditName, @amount, @tafqeet, @voucher, @txDate, @notes
      )
    `, {
      tenderId,
      vendorId: winnerVendor.VendorId,
      type: transferEntry.type,
      debitCode: transferEntry.debitAccountCode,
      debitName: transferEntry.debitAccountName,
      creditCode: transferEntry.creditAccountCode,
      creditName: transferEntry.creditAccountName,
      amount: transferEntry.amount,
      tafqeet: transferEntry.amountTafqeet,
      voucher: journalDirectiveNo,
      txDate: awardDateStr,
      notes: transferEntry.description
    });

    // 2. قيد خصم الاستقطاعات والدمغات الرسمية
    const deductionsEntry = generateAccountingJournalEntry('AWARD_DEDUCTIONS', {
      amount: deductions.totalDeductions,
      purchaseOrderNo
    });

    await query(`
      INSERT INTO FinancialTransactions (
        TenderId, VendorId, TransactionType, DebitAccountCode, DebitAccountName,
        CreditAccountCode, CreditAccountName, Amount, AmountTafqeet, VoucherNumber, TransactionDate, Notes
      ) VALUES (
        @tenderId, @vendorId, @type, @debitCode, @debitName,
        @creditCode, @creditName, @amount, @tafqeet, @voucher, @txDate, @notes
      )
    `, {
      tenderId,
      vendorId: winnerVendor.VendorId,
      type: deductionsEntry.type,
      debitCode: deductionsEntry.debitAccountCode,
      debitName: deductionsEntry.debitAccountName,
      creditCode: deductionsEntry.creditAccountCode,
      creditName: deductionsEntry.creditAccountName,
      amount: deductionsEntry.amount,
      tafqeet: deductionsEntry.amountTafqeet,
      voucher: purchaseOrderNo,
      txDate: awardDateStr,
      notes: deductionsEntry.description
    });

    await query("UPDATE Tenders SET Status = N'مسند' WHERE TenderId = @tenderId", { tenderId });
    if (tData.RequestId) {
      await query("UPDATE NeedsRequests SET Status = N'مسند' WHERE RequestId = @requestId", { requestId: tData.RequestId });
    }

    await logAudit(req, 'إصدار أمر إسناد وتوريد', 'شاشة الإسناد', tenderId, `تم إصدار أمر التوريد ${purchaseOrderNo} للشركة ${winnerVendor.CompanyName} بقيمة ${awardedAmount} ج.م مع قيد القيود المالية آلياً`);

    res.json({
      message: 'تم إسناد العملية وتوليد أمر التوريد وإذن التوجيه والقيود المحاسبية بنجاح',
      purchaseOrderNo,
      journalDirectiveNo,
      deductions,
      transferEntry,
      deductionsEntry
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// 7. STEP 5: FINANCIAL TRANSACTIONS & JOURNAL ENTRIES (رد التأمين الابتدائي والتسويات)
// ============================================================================

app.get('/api/financial-transactions', authenticateToken, async (req, res) => {
  try {
    const { tenderId, vendorId } = req.query;
    let sqlQuery = `
      SELECT FT.*, V.CompanyName, T.TenderNumber
      FROM FinancialTransactions FT
      JOIN Vendors V ON FT.VendorId = V.VendorId
      JOIN Tenders T ON FT.TenderId = T.TenderId
      WHERE 1=1
    `;
    let params = {};
    if (tenderId) {
      sqlQuery += ' AND FT.TenderId = @tenderId';
      params.tenderId = tenderId;
    }
    if (vendorId) {
      sqlQuery += ' AND FT.VendorId = @vendorId';
      params.vendorId = vendorId;
    }
    sqlQuery += ' ORDER BY FT.TransactionId DESC';

    const transactions = await query(sqlQuery, params);
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Automated Accounting Entry for Initial Guarantee Refund (رد التأمين الابتدائي للمستبعدين)
app.post('/api/financial-transactions/refund-initial', authenticateToken, requireRoles('Admin', 'FinancialAuditor'), async (req, res) => {
  try {
    const { submissionId, voucherNumber, notes } = req.body;
    const subObj = await query(`
      SELECT S.*, V.VendorId, V.CompanyName, T.TenderNumber
      FROM BidSubmissions S
      JOIN Vendors V ON S.VendorId = V.VendorId
      JOIN Tenders T ON S.TenderId = T.TenderId
      WHERE S.SubmissionId = @submissionId
    `, { submissionId });

    if (!subObj || subObj.length === 0) {
      return res.status(404).json({ error: 'العطاء غير موجود' });
    }

    const sub = subObj[0];
    const amount = parseFloat(sub.InitialInsuranceAmount || 0);

    if (amount <= 0) {
      return res.status(400).json({ error: 'لا يوجد مبلغ تأمين مسدد لرده لهذا المناقص' });
    }

    const finalVoucher = voucherNumber || `RV-${Date.now().toString().slice(-6)}`;
    const refundEntry = generateAccountingJournalEntry('INITIAL_GUARANTEE_REFUND', {
      amount,
      vendorName: sub.CompanyName,
      tenderNumber: sub.TenderNumber
    });

    const todayStr = new Date().toISOString().split('T')[0];

    const result = await query(`
      INSERT INTO FinancialTransactions (
        TenderId, VendorId, TransactionType, DebitAccountCode, DebitAccountName,
        CreditAccountCode, CreditAccountName, Amount, AmountTafqeet, VoucherNumber, TransactionDate, Notes
      ) VALUES (
        @tenderId, @vendorId, @type, @debitCode, @debitName,
        @creditCode, @creditName, @amount, @tafqeet, @voucher, @todayStr, @notes
      )
    `, {
      tenderId: sub.TenderId,
      vendorId: sub.VendorId,
      type: refundEntry.type,
      debitCode: refundEntry.debitAccountCode,
      debitName: refundEntry.debitAccountName,
      creditCode: refundEntry.creditAccountCode,
      creditName: refundEntry.creditAccountName,
      amount: refundEntry.amount,
      tafqeet: refundEntry.amountTafqeet,
      voucher: finalVoucher,
      todayStr,
      notes: notes || refundEntry.description
    });

    await query("UPDATE BidSubmissions SET InitialInsuranceStatus = N'مردود للمناقص' WHERE SubmissionId = @submissionId", { submissionId });

    await logAudit(req, 'قيد رد تأمين ابتدائي', 'الشئون المالية', result.lastID, `تم قيد رد التأمين الابتدائي للشركة ${sub.CompanyName} بمبلغ ${amount} ج.م`);

    res.json({
      message: 'تم قيد رد التأمين الابتدائي وتوليد السند المحاسبي بنجاح',
      transactionId: result.lastID,
      refundEntry
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// 8. STEP 6: SYSTEM DISTRIBUTION LOGIC (الملفات الفرعية وحوافظ التوزيع)
// ============================================================================

// Comprehensive Aggregation Pipeline for the Tender Dossier
app.get('/api/tenders/:tenderId/dossier', authenticateToken, async (req, res) => {
  try {
    const { tenderId } = req.params;

    const tender = (await query(`
      SELECT T.*, N.OperationName, N.OperationType, N.EstimatedValue, N.RequestingDepartment as ReqDept, N.BudgetHoldReference as ReqBudgetRef
      FROM Tenders T
      LEFT JOIN NeedsRequests N ON T.RequestId = N.RequestId
      WHERE T.TenderId = @tenderId AND T.IsDeleted = 0
    `, { tenderId }))[0];

    if (!tender) return res.status(404).json({ error: 'العملية غير موجودة' });

    const items = await query('SELECT * FROM TenderItems WHERE TenderId = @tenderId', { tenderId });
    const submissions = await query(`
      SELECT S.*, V.CompanyName, V.VendorType, V.TaxCardNo, V.CommercialRegisterNo
      FROM BidSubmissions S
      JOIN Vendors V ON S.VendorId = V.VendorId
      WHERE S.TenderId = @tenderId AND S.IsDeleted = 0
    `, { tenderId });

    const awarding = (await query(`
      SELECT A.*, V.CompanyName as WinnerCompanyName, V.TaxCardNo as WinnerTaxCardNo, V.CommercialRegisterNo as WinnerCRNo, V.Address as WinnerAddress
      FROM Awardings A
      JOIN Vendors V ON A.VendorId = V.VendorId
      WHERE A.TenderId = @tenderId
    `, { tenderId }))[0] || null;

    const transactions = await query(`
      SELECT FT.*, V.CompanyName
      FROM FinancialTransactions FT
      JOIN Vendors V ON FT.VendorId = V.VendorId
      WHERE FT.TenderId = @tenderId
      ORDER BY FT.TransactionId ASC
    `, { tenderId });

    // Official 4 Target Distribution Entities
    const distributionDepartments = [
      {
        id: 'warehouses',
        name: 'الإدارة العامة للمخازن العامة',
        purpose: 'فحص واستلام التوريدات ومطابقتها بأمر التوريد وإصدار إذن الإضافة المخزنية (نموذج 1 مخازن)',
        documents: ['صورة أمر التوريد المعتمد', 'جدول المواصفات والكميات الفنية', 'محضر جلسة البت المالي'],
        status: awarding ? 'جاهز للتسليم' : 'معلق لحين الإسناد'
      },
      {
        id: 'projects',
        name: 'قطاع المشروعات',
        purpose: 'الإشراف الميداني واستلام مواقع المقاولات والتعاقدات ومتابعة المستخلصات التنفيذية',
        documents: ['عقد العملية والشروط العامة والخاصة', 'محاضر الفتح والبت الفني', 'برنامج التنفيذ الزمني'],
        status: tender.OperationType === 'تعاقدات' && awarding ? 'جاهز للتسليم' : (tender.OperationType === 'تعاقدات' ? 'معلق لحين الإسناد' : 'غير مطلوب (عملية توريدات)')
      },
      {
        id: 'finance',
        name: 'إدارة التنسيق الخارجي والتسويات المالية',
        purpose: 'متابعة سداد التأمين النهائي وفتح ملفات التأمينات والضرائب وإجراءات الخصم والإضافة',
        documents: ['إذن التوجيه الحسابي', 'إيصال سداد التأمين النهائي 5%', 'مذكرة حجز الموازنة', 'نماذج الضرائب والتأمينات'],
        status: awarding ? 'جاهز للتسليم' : 'معلق لحين الإسناد'
      },
      {
        id: 'inventory_control',
        name: 'إدارة الاحتياجات ومتابعة المخزون',
        purpose: 'تحديث أرصدة المنظومة وإسقاط الاحتياجات الموردة من سجل الاحتياج السنوي',
        documents: ['طلب الاحتياج الأصلي', 'كشف التفريغ المعتمد', 'صورة أمر التوريد'],
        status: awarding ? 'جاهز للتسليم' : 'معلق لحين الإسناد'
      }
    ];

    res.json({
      tender,
      items,
      submissionsCount: submissions.length,
      submissions,
      awarding,
      transactions,
      distributionDepartments
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Automated Triggers: Etmam el-Estekmal 3end edkhal el-edafa el-makhzeniyya aw esal el-ta'meen el-neha'y
app.post('/api/tenders/:tenderId/warehouse-receipt', authenticateToken, requireRoles('Admin', 'FinancialAuditor'), async (req, res) => {
  try {
    const { tenderId } = req.params;
    const { receiptSlipNo, receiptDate, inspectorName, finalInsuranceReceiptNo } = req.body;

    await query(`
      UPDATE Tenders
      SET Status = N'مكتمل التوريد والتسليم'
      WHERE TenderId = @tenderId
    `, { tenderId });

    if (finalInsuranceReceiptNo) {
      await query(`
        UPDATE Awardings
        SET FinalGuaranteeStatus = N'مسدد'
        WHERE TenderId = @tenderId
      `, { tenderId });
    }

    await logAudit(req, 'إتمام استلام وتوريد العملية', 'المخازن والتسويات', tenderId, `تم إدخال إذن الإضافة المخزنية رقم ${receiptSlipNo || '---'} وإيصال التأمين النهائي ${finalInsuranceReceiptNo || '---'} وتحديث حالة العملية إلى مكتمل التوريد`);

    res.json({
      message: 'تم إثبات الإضافة المخزنية وإيصال التأمين النهائي بنجاح، وتحديث حالة العملية إلى: مكتمل التوريد والتسليم',
      status: 'مكتمل التوريد والتسليم'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// 9. STEP 7: GOVERNMENT REPORTS ENGINE DATA (المخاطبات الخارجية الرسمية)
// ============================================================================

app.get('/api/reports/official-letters/:tenderId', authenticateToken, async (req, res) => {
  try {
    const { tenderId } = req.params;
    const data = (await query(`
      SELECT 
        T.TenderId, T.TenderNumber, T.TenderMethod, T.FiscalYear,
        N.OperationName, N.OperationType, N.EstimatedValue, N.RequestingDepartment,
        A.AwardDate, A.AwardedAmount, A.AwardedAmountTafqeet, A.PurchaseOrderNo, A.JournalDirectiveNo,
        V.CompanyName as WinnerCompanyName, V.VendorType as WinnerVendorType, V.LegalEntity as WinnerLegalEntity,
        V.TaxCardNo as WinnerTaxCardNo, V.CommercialRegisterNo as WinnerCRNo, V.ConstructionGrade, V.Address as WinnerAddress
      FROM Tenders T
      LEFT JOIN NeedsRequests N ON T.RequestId = N.RequestId
      LEFT JOIN Awardings A ON T.TenderId = A.TenderId
      LEFT JOIN Vendors V ON A.VendorId = V.VendorId
      WHERE T.TenderId = @tenderId
    `, { tenderId }))[0];

    if (!data) return res.status(404).json({ error: 'بيانات العملية غير موجودة' });

    res.json({
      ...data,
      insuranceOffice: {
        name: 'مكتب تأمينات المنشية',
        address: '22 شارع السبع بنات – المنشية – محافظة الإسكندرية',
        department: 'قسم مقاولات وتوريدات قطاع الأعمال'
      },
      taxAuthority: {
        name: 'مصلحة الضرائب المصرية — منطقة ضرائب الإسكندرية',
        note: 'إخطار إسناد وعملية لإعمال أحكام الخصم والإضافة والفاتورة الإلكترونية'
      },
      manpowerDirectorate: {
        name: 'مديرية القوى العاملة بالإسكندرية — وحدة تشغيل ورعاية العمالة غير المنتظمة',
        address: 'شارع مصطفى كامل – خلف نقابة الأطباء – كليوباترا – الإسكندرية',
        companyAddress: '21 شارع محمد شفيق غربال - الشاطبي - الإسكندرية (الرقم البريدي 21525)'
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// WORKFLOW: NEEDS REQUESTS - NEW ENHANCED ENDPOINTS
// ============================================================================

// GET needs requests with workflow status filter
app.get('/api/needs-requests/workflow', authenticateToken, async (req, res) => {
  try {
    const { workflowStatus, pendingFor } = req.query;
    let whereClause = 'WHERE IsDeleted = 0';
    const params = {};
    if (workflowStatus) {
      whereClause += ' AND WorkflowStatus = @workflowStatus';
      params.workflowStatus = workflowStatus;
    }
    if (pendingFor === 'financial') {
      whereClause += ` AND WorkflowStatus = 'في انتظار المالية'`;
    }
    if (pendingFor === 'authority') {
      whereClause += ` AND WorkflowStatus = 'في انتظار السلطة'`;
    }
    if (pendingFor === 'tenders') {
      whereClause += ` AND WorkflowStatus = 'معتمد'`;
    }
    const requests = await query(`SELECT * FROM NeedsRequests ${whereClause} ORDER BY RequestId DESC`, params);
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET count of pending requests (for notification bell)
app.get('/api/needs-requests/pending-count', authenticateToken, async (req, res) => {
  try {
    const { role } = req.query;
    let status = '';
    if (role === 'FinancialAuditor') status = 'في انتظار المالية';
    else if (role === 'TenderOfficer') status = 'معتمد';
    else if (role === 'Authority') status = 'في انتظار السلطة';

    if (!status) return res.json({ count: 0 });

    const result = await query(
      `SELECT COUNT(*) as count FROM NeedsRequests WHERE WorkflowStatus = @status AND IsDeleted = 0`,
      { status }
    );
    res.json({ count: result[0]?.count || 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST: Submit needs request (Comprehensive: Sections 1, 2, 3 all in one unified screen)
app.post('/api/needs-requests/submit', authenticateToken, async (req, res) => {
  try {
    const {
      // Section 1: Basic & Technical Specs
      operationName, operationType, requestingDepartment, executionDuration,
      specsAndConditions, requiresSample, sampleDetails, fiscalYear, warehouseBalance,
      technicalEvaluationMethod, minPassingScore, allowSplitAwarding, technicalCriteriaNotes,
      
      // Section 2: Financial Review & Items
      tenderMethodSelected, estimatedValue, preliminaryReservation, reservationTypeNew,
      budgetHoldReference, initialGuaranteePercent, initialGuaranteeAmount, submittalType, bookletPrice,
      operationTerms, operationItems, constructionDivision, constructionCategory, financialNotes,
      
      // Section 3: Paper Approvals & Authority
      financialApprovalObtained, financialApprovalDate, financialApprovalNotes,
      approvalAuthority, authorityApprovalStatus, authorityApprovalDate,
      authorityRejectionReason, reviewedBy
    } = req.body;

    if (!operationName || !operationType || !requestingDepartment) {
      return res.status(400).json({ error: 'برجاء تعبئة اسم العملية ونوعها والجهة الطالبة' });
    }

    const fy = fiscalYear || '2025/2026';
    const estVal = parseFloat(estimatedValue) || 0;

    // Compute approval authority
    const authority = approvalAuthority || (tenderMethodSelected && estVal > 0 ? getApprovalAuthority(tenderMethodSelected, estVal) : '');

    // Generate symbol
    let symbol = '';
    if (operationType === 'تعاقدات') {
      if (tenderMethodSelected === 'مناقصة عامة') symbol = 'هـ';
      else if (tenderMethodSelected === 'مناقصة محدودة') symbol = 'هـ م';
      else if (tenderMethodSelected === 'ممارسة عامة') symbol = 'م ع';
      else if (tenderMethodSelected === 'ممارسة محدودة') symbol = 'م ح';
      else if (tenderMethodSelected === 'ممارسة محلية') symbol = 'م م';
      else if (tenderMethodSelected === 'أمر مباشر') symbol = 'ا م';
    } else if (operationType === 'توريدات') {
      if (tenderMethodSelected === 'مناقصة عامة') symbol = 'ت';
      else if (tenderMethodSelected === 'مناقصة محدودة') symbol = 'ت م';
      else if (tenderMethodSelected === 'ممارسة عامة') symbol = 'م ت';
      else if (tenderMethodSelected === 'ممارسة محدودة') symbol = 'م';
      else if (tenderMethodSelected === 'أمر مباشر') symbol = 'أ';
    } else if (operationType === 'مزادات') {
      if (tenderMethodSelected === 'مزايدة عامة') symbol = 'ز';
      else if (tenderMethodSelected === 'مزايدة محدودة') symbol = 'ز م';
      else if (tenderMethodSelected === 'أمر مباشر') symbol = 'ز أ';
    }

    let operationNumber = '';
    if (symbol) {
      const countRes = await query(
        `SELECT COUNT(*) as cnt FROM NeedsRequests WHERE FinancialOperationSymbol = @symbol AND FiscalYear = @fy`,
        { symbol, fy }
      );
      const seq = (countRes[0]?.cnt || 0) + 1;
      operationNumber = `${seq}/${fy}/${symbol}`;
    }

    // Determine workflow & system status
    let workflowStatus = 'طلب جديد';
    let status = 'معلق';

    if (authorityApprovalStatus === 'معتمد') {
      workflowStatus = 'معتمد';
      status = 'معلق'; // ready for tendering
    } else if (authorityApprovalStatus === 'مرفوض') {
      workflowStatus = 'مرفوض';
      status = 'ملغى'; // cancelled / cannot be tendered
    } else if (tenderMethodSelected && estVal > 0) {
      workflowStatus = 'في انتظار السلطة';
      status = 'معلق';
    } else {
      workflowStatus = 'في انتظار المالية';
      status = 'معلق';
    }

    const itemsJson = operationItems ? (typeof operationItems === 'string' ? operationItems : JSON.stringify(operationItems)) : '[]';

    let finalSpecsFileName = req.body.specsFileName || null;
    let finalSpecsFilePath = req.body.specsFilePath || null;
    if (req.body.specsFileData) {
      try {
        const specsUploadsDir = path.join(__dirname, 'uploads', 'specs');
        if (!fs.existsSync(specsUploadsDir)) fs.mkdirSync(specsUploadsDir, { recursive: true });
        let base64Content = req.body.specsFileData;
        if (base64Content.includes(';base64,')) base64Content = base64Content.split(';base64,')[1];
        const ext = path.extname(req.body.specsFileName || 'document.pdf') || '.pdf';
        const uniqueName = `specs-req-${Date.now()}${ext}`;
        const targetPath = path.join(specsUploadsDir, uniqueName);
        fs.writeFileSync(targetPath, Buffer.from(base64Content, 'base64'));
        finalSpecsFileName = req.body.specsFileName || uniqueName;
        finalSpecsFilePath = `/uploads/specs/${uniqueName}`;
      } catch (fileErr) {
        console.error('Specs file save error:', fileErr.message);
      }
    }

    const finalGuaranteeAmt = parseFloat(initialGuaranteeAmount) || (estVal > 0 ? Math.round((estVal * (parseFloat(initialGuaranteePercent) || 2)) / 100) : 0);
    const finalGuaranteePct = estVal > 0 && finalGuaranteeAmt > 0 ? parseFloat(((finalGuaranteeAmt / estVal) * 100).toFixed(2)) : (parseFloat(initialGuaranteePercent) || 2);

    const result = await query(`
      INSERT INTO NeedsRequests (
        OperationName, OperationType, RequestingDepartment, ExecutionDuration,
        SpecsAndConditions, RequiresSample, SampleDetails, WarehouseBalance,
        FiscalYear, EstimatedValue, TenderMethodSelected, PreliminaryReservation, InitialReservation,
        ReservationTypeNew, BudgetHoldReference, InitialGuaranteePercent, InitialGuaranteeAmount, SubmittalType, BookletPrice,
        OperationTerms, OperationItems, ConstructionDivision, ConstructionCategory, FinancialNotes,
        FinancialOperationNumber, FinancialOperationSymbol, ApprovalAuthority,
        FinancialApprovalObtained, FinancialApprovalDate, FinancialApprovalNotes,
        AuthorityApprovalStatus, AuthorityApprovalDate, AuthorityRejectionReason,
        AuthorityReviewedBy, AuthorityReviewedAt, FinancialReviewedAt, FinancialReviewedBy,
        TechnicalEvaluationMethod, MinPassingScore, AllowSplitAwarding, TechnicalCriteriaNotes,
        SpecsFileName, SpecsFilePath,
        WorkflowStatus, Status, IsDeleted
      ) VALUES (
        @operationName, @operationType, @requestingDepartment, @executionDuration,
        @specsAndConditions, @requiresSample, @sampleDetails, @warehouseBalance,
        @fiscalYear, @estimatedValue, @tenderMethodSelected, @preliminaryReservation, @initialReservation,
        @reservationTypeNew, @budgetHoldReference, @initialGuaranteePercent, @initialGuaranteeAmount, @submittalType, @bookletPrice,
        @operationTerms, @operationItems, @constructionDivision, @constructionCategory, @financialNotes,
        @operationNumber, @symbol, @authority,
        @financialApprovalObtained, @financialApprovalDate, @financialApprovalNotes,
        @authorityApprovalStatus, @authorityApprovalDate, @authorityRejectionReason,
        @reviewedBy, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, @reviewedBy,
        @technicalEvaluationMethod, @minPassingScore, @allowSplitAwarding, @technicalCriteriaNotes,
        @finalSpecsFileName, @finalSpecsFilePath,
        @workflowStatus, @status, 0
      )
    `, {
      operationName, operationType, requestingDepartment,
      executionDuration: executionDuration || null,
      specsAndConditions: specsAndConditions || null,
      requiresSample: requiresSample ? 1 : 0,
      sampleDetails: sampleDetails || null,
      warehouseBalance: warehouseBalance || null,
      fiscalYear: fy,
      estimatedValue: estVal,
      tenderMethodSelected: tenderMethodSelected || null,
      preliminaryReservation: parseFloat(preliminaryReservation) || estVal,
      initialReservation: parseFloat(preliminaryReservation) || estVal,
      reservationTypeNew: reservationTypeNew || 'جاري',
      budgetHoldReference: budgetHoldReference || null,
      initialGuaranteePercent: finalGuaranteePct,
      initialGuaranteeAmount: finalGuaranteeAmt,
      submittalType: submittalType || 'مظروفيين',
      bookletPrice: parseFloat(bookletPrice) || 0,
      operationTerms: operationTerms || '',
      operationItems: itemsJson,
      constructionDivision: constructionDivision || null,
      constructionCategory: constructionCategory || null,
      financialNotes: financialNotes || '',
      operationNumber: operationNumber || null,
      symbol: symbol || null,
      authority: authority || null,
      financialApprovalObtained: financialApprovalObtained ? 1 : 0,
      financialApprovalDate: financialApprovalDate || null,
      financialApprovalNotes: financialApprovalNotes || null,
      authorityApprovalStatus: authorityApprovalStatus || (workflowStatus === 'معتمد' ? 'معتمد' : (workflowStatus === 'مرفوض' ? 'مرفوض' : 'في انتظار الموافقة')),
      authorityApprovalDate: authorityApprovalDate || (authorityApprovalStatus ? new Date().toISOString().split('T')[0] : null),
      authorityRejectionReason: authorityRejectionReason || null,
      reviewedBy: reviewedBy || req.user?.FullName || 'المستخدم',
      technicalEvaluationMethod: technicalEvaluationMethod || 'مطابق أو غير مطابق',
      minPassingScore: parseFloat(minPassingScore) || 70,
      allowSplitAwarding: allowSplitAwarding ? 1 : (operationType === 'توريدات' ? 1 : 0),
      technicalCriteriaNotes: technicalCriteriaNotes || '',
      finalSpecsFileName,
      finalSpecsFilePath,
      workflowStatus,
      status
    });

    const requestId = result.lastID;
    await logAudit(req, 'تقديم طلب احتياج شامل', 'NeedsRequests', requestId,
      `تم تسجيل طلب احتياج متكامل: ${operationName} من إدارة: ${requestingDepartment} (الحالة: ${workflowStatus})`);

    res.json({ success: true, requestId, operationNumber, workflowStatus, message: 'تم حفظ طلب الاحتياج بنجاح' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT: Update comprehensive needs request (Both /:id/comprehensive and /:id)
const handleUpdateNeedsRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await query('SELECT * FROM NeedsRequests WHERE RequestId = @id', { id });
    if (!existing || existing.length === 0) return res.status(404).json({ error: 'الطلب غير موجود' });
    const old = existing[0];

    const {
      operationName, operationType, requestingDepartment, executionDuration,
      specsAndConditions, requiresSample, sampleDetails, fiscalYear, warehouseBalance,
      technicalEvaluationMethod, minPassingScore, allowSplitAwarding, technicalCriteriaNotes,
      tenderMethodSelected, estimatedValue, preliminaryReservation, reservationTypeNew,
      budgetHoldReference, initialGuaranteePercent, initialGuaranteeAmount, submittalType, bookletPrice,
      operationTerms, operationItems, constructionDivision, constructionCategory, financialNotes,
      financialApprovalObtained, financialApprovalDate, financialApprovalNotes,
      approvalAuthority, authorityApprovalStatus, authorityApprovalDate,
      authorityRejectionReason, reviewedBy
    } = req.body;

    const safeFloat = (val, fallback = 0) => {
      if (val === undefined || val === null || val === '') return fallback;
      const num = parseFloat(val);
      return isNaN(num) ? fallback : num;
    };

    const opType = operationType || old.OperationType;
    const tMethod = tenderMethodSelected || old.TenderMethodSelected;
    const estVal = safeFloat(estimatedValue, old.EstimatedValue || 0);
    const fy = fiscalYear || old.FiscalYear || '2025/2026';

    const authority = approvalAuthority || (tMethod && estVal > 0 ? getApprovalAuthority(tMethod, estVal) : old.ApprovalAuthority);

    let symbol = old.FinancialOperationSymbol;
    if (opType === 'تعاقدات') {
      if (tMethod === 'مناقصة عامة') symbol = 'هـ';
      else if (tMethod === 'مناقصة محدودة') symbol = 'هـ م';
      else if (tMethod === 'ممارسة عامة') symbol = 'م ع';
      else if (tMethod === 'ممارسة محدودة') symbol = 'م ح';
      else if (tMethod === 'ممارسة محلية') symbol = 'م م';
      else if (tMethod === 'أمر مباشر') symbol = 'ا م';
    } else if (opType === 'توريدات') {
      if (tMethod === 'مناقصة عامة') symbol = 'ت';
      else if (tMethod === 'مناقصة محدودة') symbol = 'ت م';
      else if (tMethod === 'ممارسة عامة') symbol = 'م ت';
      else if (tMethod === 'ممارسة محدودة') symbol = 'م';
      else if (tMethod === 'أمر مباشر') symbol = 'أ';
    } else if (opType === 'مزادات') {
      if (tMethod === 'مزايدة عامة') symbol = 'ز';
      else if (tMethod === 'مزايدة محدودة') symbol = 'ز م';
      else if (tMethod === 'أمر مباشر') symbol = 'ز أ';
    }

    let operationNumber = old.FinancialOperationNumber;
    if (!operationNumber && symbol) {
      const countRes = await query(
        `SELECT COUNT(*) as cnt FROM NeedsRequests WHERE FinancialOperationSymbol = @symbol AND FiscalYear = @fy AND RequestId != @id`,
        { symbol, fy, id }
      );
      const seq = (countRes[0]?.cnt || 0) + 1;
      operationNumber = `${seq}/${fy}/${symbol}`;
    }

    let workflowStatus = old.WorkflowStatus;
    let status = old.Status;

    if (authorityApprovalStatus === 'معتمد') {
      workflowStatus = 'معتمد';
      status = old.Status === 'مطروح' ? 'مطروح' : 'معلق';
    } else if (authorityApprovalStatus === 'مرفوض') {
      workflowStatus = 'مرفوض';
      status = 'ملغى';
    } else if (tMethod && estVal > 0) {
      workflowStatus = 'في انتظار السلطة';
    }

    const itemsJson = operationItems ? (typeof operationItems === 'string' ? operationItems : JSON.stringify(operationItems)) : (old.OperationItems || '[]');

    let finalSpecsFileName = req.body.specsFileName !== undefined ? req.body.specsFileName : old.SpecsFileName;
    let finalSpecsFilePath = req.body.specsFilePath !== undefined ? req.body.specsFilePath : old.SpecsFilePath;
    if (req.body.specsFileData) {
      try {
        const specsUploadsDir = path.join(__dirname, 'uploads', 'specs');
        if (!fs.existsSync(specsUploadsDir)) fs.mkdirSync(specsUploadsDir, { recursive: true });
        let base64Content = req.body.specsFileData;
        if (base64Content.includes(';base64,')) base64Content = base64Content.split(';base64,')[1];
        const ext = path.extname(req.body.specsFileName || 'document.pdf') || '.pdf';
        const uniqueName = `specs-req-${id}-${Date.now()}${ext}`;
        const targetPath = path.join(specsUploadsDir, uniqueName);
        fs.writeFileSync(targetPath, Buffer.from(base64Content, 'base64'));
        finalSpecsFileName = req.body.specsFileName || uniqueName;
        finalSpecsFilePath = `/uploads/specs/${uniqueName}`;
      } catch (fileErr) {
        console.error('Specs file save error:', fileErr.message);
      }
    }

    await query(`
      UPDATE NeedsRequests SET
        OperationName = @operationName,
        OperationType = @operationType,
        RequestingDepartment = @requestingDepartment,
        ExecutionDuration = @executionDuration,
        SpecsAndConditions = @specsAndConditions,
        RequiresSample = @requiresSample,
        SampleDetails = @sampleDetails,
        WarehouseBalance = @warehouseBalance,
        FiscalYear = @fiscalYear,
        EstimatedValue = @estimatedValue,
        TenderMethodSelected = @tenderMethodSelected,
        PreliminaryReservation = @preliminaryReservation,
        InitialReservation = @preliminaryReservation,
        ReservationTypeNew = @reservationTypeNew,
        BudgetHoldReference = @budgetHoldReference,
        InitialGuaranteePercent = @initialGuaranteePercent,
        InitialGuaranteeAmount = @initialGuaranteeAmount,
        SubmittalType = @submittalType,
        BookletPrice = @bookletPrice,
        OperationTerms = @operationTerms,
        OperationItems = @operationItems,
        ConstructionDivision = @constructionDivision,
        ConstructionCategory = @constructionCategory,
        FinancialNotes = @financialNotes,
        FinancialOperationNumber = @operationNumber,
        FinancialOperationSymbol = @symbol,
        ApprovalAuthority = @authority,
        FinancialApprovalObtained = @financialApprovalObtained,
        FinancialApprovalDate = @financialApprovalDate,
        FinancialApprovalNotes = @financialApprovalNotes,
        AuthorityApprovalStatus = @authorityApprovalStatus,
        AuthorityApprovalDate = @authorityApprovalDate,
        AuthorityRejectionReason = @authorityRejectionReason,
        AuthorityReviewedBy = @reviewedBy,
        AuthorityReviewedAt = CURRENT_TIMESTAMP,
        TechnicalEvaluationMethod = @technicalEvaluationMethod,
        MinPassingScore = @minPassingScore,
        AllowSplitAwarding = @allowSplitAwarding,
        TechnicalCriteriaNotes = @technicalCriteriaNotes,
        SpecsFileName = @finalSpecsFileName,
        SpecsFilePath = @finalSpecsFilePath,
        WorkflowStatus = @workflowStatus,
        Status = @status
      WHERE RequestId = @id
    `, {
      operationName: operationName || old.OperationName,
      operationType: opType,
      requestingDepartment: requestingDepartment || old.RequestingDepartment,
      executionDuration: executionDuration !== undefined ? executionDuration : old.ExecutionDuration,
      specsAndConditions: specsAndConditions !== undefined ? specsAndConditions : old.SpecsAndConditions,
      requiresSample: requiresSample !== undefined ? (requiresSample ? 1 : 0) : old.RequiresSample,
      sampleDetails: sampleDetails !== undefined ? sampleDetails : old.SampleDetails,
      warehouseBalance: warehouseBalance !== undefined ? warehouseBalance : old.WarehouseBalance,
      fiscalYear: fy,
      estimatedValue: estVal,
      tenderMethodSelected: tMethod || null,
      preliminaryReservation: safeFloat(preliminaryReservation, old.PreliminaryReservation || estVal || 0),
      reservationTypeNew: reservationTypeNew || old.ReservationTypeNew || 'جاري',
      budgetHoldReference: budgetHoldReference !== undefined ? budgetHoldReference : old.BudgetHoldReference,
      initialGuaranteePercent: estVal > 0 && safeFloat(initialGuaranteeAmount, old.InitialGuaranteeAmount || 0) > 0
        ? parseFloat(((safeFloat(initialGuaranteeAmount, old.InitialGuaranteeAmount || 0) / estVal) * 100).toFixed(2))
        : safeFloat(initialGuaranteePercent, old.InitialGuaranteePercent || 2),
      initialGuaranteeAmount: safeFloat(initialGuaranteeAmount, old.InitialGuaranteeAmount || (estVal > 0 ? Math.round((estVal * safeFloat(initialGuaranteePercent, old.InitialGuaranteePercent || 2)) / 100) : 0)),
      submittalType: submittalType || old.SubmittalType || 'مظروفيين',
      bookletPrice: safeFloat(bookletPrice, old.BookletPrice || 0),
      operationTerms: operationTerms !== undefined ? operationTerms : old.OperationTerms,
      operationItems: itemsJson,
      constructionDivision: constructionDivision !== undefined ? constructionDivision : old.ConstructionDivision,
      constructionCategory: constructionCategory !== undefined ? constructionCategory : old.ConstructionCategory,
      financialNotes: financialNotes !== undefined ? financialNotes : old.FinancialNotes,
      operationNumber: operationNumber || old.FinancialOperationNumber,
      symbol: symbol || old.FinancialOperationSymbol,
      authority: authority || old.ApprovalAuthority,
      financialApprovalObtained: financialApprovalObtained !== undefined ? (financialApprovalObtained ? 1 : 0) : old.FinancialApprovalObtained,
      financialApprovalDate: financialApprovalDate || old.FinancialApprovalDate,
      financialApprovalNotes: financialApprovalNotes !== undefined ? financialApprovalNotes : old.FinancialApprovalNotes,
      authorityApprovalStatus: authorityApprovalStatus || old.AuthorityApprovalStatus,
      authorityApprovalDate: authorityApprovalDate || old.AuthorityApprovalDate,
      authorityRejectionReason: authorityRejectionReason !== undefined ? authorityRejectionReason : old.AuthorityRejectionReason,
      reviewedBy: reviewedBy || req.user?.FullName || old.AuthorityReviewedBy || 'المستخدم',
      technicalEvaluationMethod: technicalEvaluationMethod !== undefined ? technicalEvaluationMethod : (old.TechnicalEvaluationMethod || 'مطابق أو غير مطابق'),
      minPassingScore: safeFloat(minPassingScore, old.MinPassingScore || 70),
      allowSplitAwarding: allowSplitAwarding !== undefined ? (allowSplitAwarding ? 1 : 0) : (old.AllowSplitAwarding !== undefined ? old.AllowSplitAwarding : (opType === 'توريدات' ? 1 : 0)),
      technicalCriteriaNotes: technicalCriteriaNotes !== undefined ? technicalCriteriaNotes : (old.TechnicalCriteriaNotes || ''),
      finalSpecsFileName,
      finalSpecsFilePath,
      workflowStatus,
      status,
      id
    });

    await logAudit(req, 'تعديل طلب احتياج', 'NeedsRequests', id, `تم تحديث بيانات طلب الاحتياج رقم ${id} (الحالة: ${workflowStatus})`);
    res.json({ success: true, message: 'تم تحديث طلب الاحتياج بنجاح', workflowStatus });
  } catch (err) {
    console.error('Error updating needs request:', err);
    res.status(500).json({ error: 'خطأ في تحديث طلب الاحتياج: ' + err.message });
  }
};

app.put('/api/needs-requests/:id/comprehensive', authenticateToken, handleUpdateNeedsRequest);
app.put('/api/needs-requests/:id', authenticateToken, handleUpdateNeedsRequest);

// DELETE: Archive needs request
app.delete('/api/needs-requests/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};
    const existing = await query('SELECT * FROM NeedsRequests WHERE RequestId = @id', { id });
    if (!existing || existing.length === 0) return res.status(404).json({ error: 'الطلب غير موجود' });

    await query("UPDATE NeedsRequests SET IsDeleted = 1, Status = N'مؤرشف' WHERE RequestId = @id", { id });

    // Also record in ArchivedItems
    await query(`
      INSERT INTO ArchivedItems (EntityType, EntityId, EntityData, Reason, ArchivedBy, ArchivedAt)
      VALUES (N'طلب احتياج', @id, @data, @reason, @archivedBy, CURRENT_TIMESTAMP)
    `, {
      id: String(id),
      data: JSON.stringify(existing[0]),
      reason: reason || 'حذف ونقل للأرشيف',
      archivedBy: req.user?.FullName || req.user?.Username || 'النظام'
    });

    await logAudit(req, 'أرشفة طلب احتياج', 'NeedsRequests', id, `تم نقل طلب الاحتياج رقم ${id} للأرشيف - السبب: ${reason || 'بدون'}`);
    res.json({ success: true, message: 'تم نقل طلب الاحتياج إلى الأرشيف بنجاح' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT: Financial review (Step 2 - FinancialAuditor fills financial data)
app.put('/api/needs-requests/:id/financial-review', authenticateToken, requireRoles('Admin', 'FinancialAuditor'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      tenderMethodSelected, estimatedValue, preliminaryReservation, reservationTypeNew,
      initialGuaranteePercent, submittalType, bookletPrice, operationTerms,
      operationItems, constructionDivision, constructionCategory, financialNotes,
      specsAndConditions, fiscalYear
    } = req.body;

    // Compute approval authority
    const authority = getApprovalAuthority(tenderMethodSelected, estimatedValue);

    // Generate operation symbol
    let symbol = '';
    // Note: operationType comes from the existing record
    const existing = await query('SELECT * FROM NeedsRequests WHERE RequestId = @id', { id });
    if (!existing || existing.length === 0) return res.status(404).json({ error: 'الطلب غير موجود' });
    const req_record = existing[0];

    if (req_record.OperationType === 'تعاقدات') {
      if (tenderMethodSelected === 'مناقصة عامة') symbol = 'هـ';
      else if (tenderMethodSelected === 'مناقصة محدودة') symbol = 'هـ م';
      else if (tenderMethodSelected === 'ممارسة عامة') symbol = 'م ع';
      else if (tenderMethodSelected === 'ممارسة محدودة') symbol = 'م ح';
      else if (tenderMethodSelected === 'ممارسة محلية') symbol = 'م م';
      else if (tenderMethodSelected === 'أمر مباشر') symbol = 'ا م';
    } else if (req_record.OperationType === 'توريدات') {
      if (tenderMethodSelected === 'مناقصة عامة') symbol = 'ت';
      else if (tenderMethodSelected === 'مناقصة محدودة') symbol = 'ت م';
      else if (tenderMethodSelected === 'ممارسة عامة') symbol = 'م ت';
      else if (tenderMethodSelected === 'ممارسة محدودة') symbol = 'م';
      else if (tenderMethodSelected === 'أمر مباشر') symbol = 'أ';
    } else if (req_record.OperationType === 'مزادات') {
      if (tenderMethodSelected === 'مزايدة عامة') symbol = 'ز';
      else if (tenderMethodSelected === 'مزايدة محدودة') symbol = 'ز م';
      else if (tenderMethodSelected === 'أمر مباشر') symbol = 'ز أ';
    }

    // Generate sequential operation number for this fiscal year & symbol
    const fy = fiscalYear || req_record.FiscalYear || '2025/2026';
    const countRes = await query(
      `SELECT COUNT(*) as cnt FROM NeedsRequests WHERE FinancialOperationSymbol = @symbol AND FiscalYear = @fy AND RequestId != @id`,
      { symbol, fy, id }
    );
    const seq = (countRes[0]?.cnt || 0) + 1;
    const operationNumber = `${seq}/${fy}/${symbol}`;

    await query(`
      UPDATE NeedsRequests SET
        TenderMethodSelected = @tenderMethodSelected,
        EstimatedValue = @estimatedValue,
        PreliminaryReservation = @preliminaryReservation,
        InitialReservation = @preliminaryReservation,
        ReservationTypeNew = @reservationTypeNew,
        InitialGuaranteePercent = @initialGuaranteePercent,
        SubmittalType = @submittalType,
        BookletPrice = @bookletPrice,
        OperationTerms = @operationTerms,
        OperationItems = @operationItems,
        ConstructionDivision = @constructionDivision,
        ConstructionCategory = @constructionCategory,
        FinancialNotes = @financialNotes,
        FinancialOperationNumber = @operationNumber,
        FinancialOperationSymbol = @symbol,
        ApprovalAuthority = @authority,
        WorkflowStatus = N'في انتظار السلطة',
        FinancialReviewedAt = CURRENT_TIMESTAMP,
        FiscalYear = @fy
      WHERE RequestId = @id
    `, {
      tenderMethodSelected, estimatedValue, preliminaryReservation,
      reservationTypeNew: reservationTypeNew || 'جاري',
      initialGuaranteePercent: initialGuaranteePercent || 2,
      submittalType: submittalType || 'مظروفيين',
      bookletPrice: bookletPrice || 0,
      operationTerms: operationTerms || '',
      operationItems: operationItems ? JSON.stringify(operationItems) : '[]',
      constructionDivision: constructionDivision || null,
      constructionCategory: constructionCategory || null,
      financialNotes: financialNotes || '',
      operationNumber, symbol, authority, fy, id
    });

    await logAudit(req, 'مراجعة مالية للطلب', 'NeedsRequests', id,
      `تمت المراجعة المالية لطلب رقم ${id} - رقم العملية: ${operationNumber} - السلطة المختصة: ${authority}`);

    res.json({ success: true, operationNumber, symbol, authority, message: 'تمت المراجعة المالية وأُرسل الطلب لاعتماد السلطة المختصة' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT: Authority approval (Step 3)
app.put('/api/needs-requests/:id/authority-approval', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { approved, approvalDate, rejectionReason, reviewedBy } = req.body;

    if (approved) {
      await query(`
        UPDATE NeedsRequests SET
          AuthorityApprovalStatus = N'معتمد',
          AuthorityApprovalDate = @approvalDate,
          WorkflowStatus = N'معتمد',
          Status = N'معلق',
          AuthorityReviewedAt = CURRENT_TIMESTAMP,
          AuthorityReviewedBy = @reviewedBy
        WHERE RequestId = @id
      `, { approvalDate: approvalDate || new Date().toISOString().split('T')[0], reviewedBy: reviewedBy || '', id });

      await logAudit(req, 'اعتماد طلب احتياج', 'NeedsRequests', id,
        `تمت الموافقة على طلب الاحتياج رقم ${id} بتاريخ ${approvalDate} - جاهز للطرح`);

      res.json({ success: true, message: 'تمت الموافقة على الطلب وهو الآن جاهز للطرح' });
    } else {
      await query(`
        UPDATE NeedsRequests SET
          AuthorityApprovalStatus = N'مرفوض',
          AuthorityRejectionReason = @rejectionReason,
          WorkflowStatus = N'مرفوض',
          AuthorityReviewedAt = CURRENT_TIMESTAMP,
          AuthorityReviewedBy = @reviewedBy
        WHERE RequestId = @id
      `, { rejectionReason: rejectionReason || 'لم يتم ذكر السبب', reviewedBy: reviewedBy || '', id });

      await logAudit(req, 'رفض طلب احتياج', 'NeedsRequests', id,
        `تم رفض طلب الاحتياج رقم ${id} - السبب: ${rejectionReason}`);

      res.json({ success: true, message: 'تم رفض الطلب وإعادته للمراجعة' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// WAREHOUSE INVENTORY & INQUIRIES
// ============================================================================

app.get('/api/warehouse/inventory', authenticateToken, async (req, res) => {
  try {
    const { search } = req.query;
    let sql = 'SELECT * FROM WarehouseInventory WHERE IsActive = 1';
    const params = {};
    if (search) {
      sql += ' AND (ProductName LIKE @search OR ProductCode LIKE @search)';
      params.search = `%${search}%`;
    }
    sql += ' ORDER BY ProductName ASC';
    const products = await query(sql, params);
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/warehouse/inventory', authenticateToken, requireRoles('Admin', 'VendorManager'), async (req, res) => {
  try {
    const { productName, productCode, categoryId, unit, currentStock, minimumStock, location } = req.body;
    await query(`
      INSERT INTO WarehouseInventory (ProductName, ProductCode, CategoryId, Unit, CurrentStock, MinimumStock, Location)
      VALUES (@productName, @productCode, @categoryId, @unit, @currentStock, @minimumStock, @location)
    `, { productName, productCode: productCode || null, categoryId: categoryId || null, unit: unit || 'عدد', currentStock: currentStock || 0, minimumStock: minimumStock || 0, location: location || null });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/warehouse/inquiry', authenticateToken, async (req, res) => {
  try {
    const { requestId, inquiryText } = req.body;
    await query(`
      INSERT INTO WarehouseInquiries (RequestId, InquiryText) VALUES (@requestId, @inquiryText)
    `, { requestId, inquiryText });
    // Mark request as warehouse query sent
    await query(`UPDATE NeedsRequests SET WarehouseQuerySent = 1 WHERE RequestId = @requestId`, { requestId });
    await logAudit(req, 'إرسال استفسار مخازن', 'WarehouseInquiries', requestId, `تم إرسال استفسار للمخازن عن طلب رقم ${requestId}`);
    res.json({ success: true, message: 'تم إرسال الاستفسار لإدارة المخازن' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/warehouse/inquiries', authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.query;
    let sql = 'SELECT * FROM WarehouseInquiries';
    const params = {};
    if (requestId) { sql += ' WHERE RequestId = @requestId'; params.requestId = requestId; }
    sql += ' ORDER BY SentAt DESC';
    res.json(await query(sql, params));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Warehouse manager responds to inquiry
app.put('/api/warehouse/inquiry/:id/respond', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { responseText, responseStatus } = req.body;
    await query(`
      UPDATE WarehouseInquiries SET
        ResponseText = @responseText,
        ResponseStatus = @responseStatus,
        RespondedAt = CURRENT_TIMESTAMP,
        RespondedBy = @respondedBy
      WHERE InquiryId = @id
    `, { responseText, responseStatus, respondedBy: req.user?.Username || 'مسؤول المخازن', id });
    // Update request warehouse balance field
    const inq = await query('SELECT RequestId FROM WarehouseInquiries WHERE InquiryId = @id', { id });
    if (inq && inq.length > 0) {
      await query(`UPDATE NeedsRequests SET WarehouseQueryResponse = @responseText WHERE RequestId = @requestId`,
        { responseText, requestId: inq[0].RequestId });
    }
    await logAudit(req, 'رد على استفسار مخازن', 'WarehouseInquiries', id, `تم الرد على الاستفسار: ${responseStatus}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// CONTRACTOR GROUPS (9 GROUPS)
// ============================================================================

app.get('/api/contractor-groups', authenticateToken, async (req, res) => {
  try {
    const groups = await query('SELECT * FROM ContractorGroups WHERE IsActive = 1 ORDER BY GroupId ASC', {});
    // For each group, get member count
    for (let g of groups) {
      const countRes = await query('SELECT COUNT(*) as cnt FROM ContractorGroupMembers WHERE GroupId = @gid', { gid: g.GroupId });
      g.MemberCount = countRes[0]?.cnt || 0;
    }
    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/contractor-groups/:id/members', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const members = await query(`
      SELECT cgm.*, v.CompanyName, v.Phone, v.Email, v.TaxCardNo, v.Address, v.IsBlacklisted
      FROM ContractorGroupMembers cgm
      LEFT JOIN Vendors v ON cgm.VendorId = v.VendorId
      WHERE cgm.GroupId = @id
      ORDER BY cgm.MemberId ASC
    `, { id });
    res.json(members);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/contractor-groups', authenticateToken, requireRoles('Admin', 'VendorManager'), async (req, res) => {
  try {
    const { groupName, groupDescription, workScope } = req.body;
    const result = await query(`
      INSERT INTO ContractorGroups (GroupName, GroupDescription, WorkScope) VALUES (@groupName, @groupDescription, @workScope)
    `, { groupName, groupDescription: groupDescription || '', workScope: workScope || '' });
    res.json({ success: true, groupId: result.lastID });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/contractor-groups/:id/members', authenticateToken, requireRoles('Admin', 'VendorManager'), async (req, res) => {
  try {
    const { id } = req.params;
    const { vendorId, isFederationMember, certificates, notes } = req.body;
    await query(`
      INSERT INTO ContractorGroupMembers (GroupId, VendorId, IsFederationMember, Certificates, Notes)
      VALUES (@id, @vendorId, @isFederationMember, @certificates, @notes)
    `, { id, vendorId, isFederationMember: isFederationMember ? 1 : 0, certificates: certificates || '', notes: notes || '' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// SEND TENDER INVITATION EMAILS (simulation)
// ============================================================================

app.post('/api/tenders/send-invitations', authenticateToken, requireRoles('Admin', 'TenderOfficer'), async (req, res) => {
  try {
    const { tenderId, vendorIds, invitationType, tenderDetails } = req.body;
    // Log the invitation sending (actual email sending would require nodemailer)
    const sent = [];
    for (const vid of vendorIds) {
      const vendor = await query('SELECT CompanyName, Email, Phone FROM Vendors WHERE VendorId = @vid', { vid });
      if (vendor && vendor.length > 0) {
        sent.push({ vendorId: vid, companyName: vendor[0].CompanyName, email: vendor[0].Email });
      }
    }
    await logAudit(req, 'إرسال دعوات مناقصة', 'Tenders', tenderId,
      `تم إرسال ${sent.length} دعوة ${invitationType === 'general' ? 'عامة' : 'محدودة'} لمناقصة رقم ${tenderId}`);
    res.json({ success: true, sentCount: sent.length, recipients: sent, message: `تم إرسال الدعوات لـ ${sent.length} مورد/مقاول` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// SUB-FILE DISTRIBUTION ROUTES
// ============================================================================

// Get all distributions (with optional tenderId filter)
app.get('/api/sub-files', authenticateToken, async (req, res) => {
  try {
    const { tenderId } = req.query;
    let rows;
    if (tenderId) {
      rows = await query(`
        SELECT sfd.*, t.TenderNumber, t.TenderMethod, t.CalculatedBookletPrice,
               t.EnvelopeOpeningDate, t.InitialGuaranteeAmount,
               nr.RequestingDepartment, nr.EstimatedValue, nr.OperationDuration,
               nr.SpecsAndConditions, nr.ConstructionDivision, nr.ConstructionCategory,
               nr.PreliminaryReservation, nr.ReservationTypeNew, nr.FinancialFiscalYear,
               nr.FinancialOperationNumber, nr.FinancialOperationSymbol,
               nr.ApprovalAuthority, nr.AuthorityApprovalDate,
               nr.OperationItems, nr.OperationTerms, nr.BookletPrice
        FROM SubFileDistributions sfd
        LEFT JOIN Tenders t ON sfd.TenderId = t.TenderId
        LEFT JOIN NeedsRequests nr ON sfd.RequestId = nr.RequestId
        WHERE sfd.TenderId = @tenderId
        ORDER BY sfd.IssuedAt DESC
      `, { tenderId: parseInt(tenderId) });
    } else {
      rows = await query(`
        SELECT sfd.*, t.TenderNumber, t.TenderMethod
        FROM SubFileDistributions sfd
        LEFT JOIN Tenders t ON sfd.TenderId = t.TenderId
        ORDER BY sfd.IssuedAt DESC
      `, {});
    }
    res.json(rows || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single distribution with deliveries + notifications
app.get('/api/sub-files/:id', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [dist] = await query(`
      SELECT sfd.*, t.TenderNumber, t.TenderMethod, t.CalculatedBookletPrice,
             t.EnvelopeOpeningDate, t.InitialGuaranteeAmount,
             nr.RequestingDepartment, nr.EstimatedValue, nr.OperationDuration,
             nr.SpecsAndConditions, nr.ConstructionDivision, nr.ConstructionCategory,
             nr.PreliminaryReservation, nr.ReservationTypeNew,
             nr.FinancialOperationNumber, nr.FinancialOperationSymbol,
             nr.ApprovalAuthority, nr.AuthorityApprovalDate,
             nr.OperationItems, nr.OperationTerms, nr.BookletPrice
      FROM SubFileDistributions sfd
      LEFT JOIN Tenders t ON sfd.TenderId = t.TenderId
      LEFT JOIN NeedsRequests nr ON sfd.RequestId = nr.RequestId
      WHERE sfd.DistributionId = @id
    `, { id });
    if (!dist) return res.status(404).json({ error: 'Distribution not found' });

    const deliveries = await query(
      'SELECT * FROM SubFileDeliveries WHERE DistributionId = @id ORDER BY DeliveredAt',
      { id }
    );
    const notifications = await query(
      'SELECT * FROM SubFileNotifications WHERE DistributionId = @id ORDER BY SentAt DESC',
      { id }
    );
    res.json({ ...dist, deliveries, notifications });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Issue new sub-file distribution for a tender
app.post('/api/sub-files/issue', authenticateToken, requireRoles('Admin', 'TenderOfficer', 'FinancialAuditor'), async (req, res) => {
  try {
    const { tenderId, requestId, issuedBy, notes } = req.body;
    if (!tenderId) return res.status(400).json({ error: 'tenderId مطلوب' });

    // Get tender + request data
    const [tender] = await query('SELECT * FROM Tenders WHERE TenderId = @tid', { tid: parseInt(tenderId) });
    if (!tender) return res.status(404).json({ error: 'العملية غير موجودة' });

    const [nr] = requestId
      ? await query('SELECT * FROM NeedsRequests WHERE RequestId = @rid', { rid: parseInt(requestId) })
      : [{}];

    // Auto-generate documents package metadata
    const docPackage = JSON.stringify({
      approvalDoc: 'موافقة الطرح ✓',
      vendorOffers: 'عروض الموردين ✓',
      envelopeOpeningRecord: 'محضر فض المظاريف ✓',
      clarificationSheet: 'كشف التفريغ ✓',
      awardingRecord: 'محضر البت والإسناد ✓',
      budgetReservation: 'حجز الميزانية ✓',
      acceptanceNotices: 'إخطارات القبول ✓',
      supplyOrder: (nr?.OperationType === 'توريدات') ? 'أمر التوريد ✓' : null,
      contractOrder: (nr?.OperationType === 'تعاقدات') ? 'أمر التعاقد ✓' : null,
    });

    const result = await query(`
      INSERT INTO SubFileDistributions
        (TenderId, RequestId, OperationName, OperationType, OperationNumber, IssuedBy, Notes, DocumentsPackage)
      VALUES
        (@tenderId, @requestId, @operationName, @operationType, @operationNumber, @issuedBy, @notes, @docPackage)
    `, {
      tenderId: parseInt(tenderId),
      requestId: requestId ? parseInt(requestId) : null,
      operationName: tender.OperationName || nr?.OperationName || 'بدون اسم',
      operationType: nr?.OperationType || 'تعاقدات',
      operationNumber: tender.TenderNumber || '',
      issuedBy: issuedBy || 'النظام',
      notes: notes || '',
      docPackage
    });

    const distId = result.lastID;

    // Auto-create 4 delivery forms
    const operationType = nr?.OperationType || 'تعاقدات';
    const targets = [
      { target: 'المخازن العامة', form: 'نموذج تسليم للمخازن العامة' },
      ...(operationType === 'تعاقدات' ? [{ target: 'قطاع المشروعات', form: 'نموذج تسليم لقطاع المشروعات' }] : []),
      { target: 'التنسيق الخارجي والتسويات المالية', form: 'نموذج تسليم للتنسيق الخارجي والتسويات المالية' },
      { target: 'إدارة الاحتياجات ومتابعة المخزون', form: 'نموذج تسليم لإدارة الاحتياجات ومتابعة المخزون' },
    ];

    for (const t of targets) {
      await query(`
        INSERT INTO SubFileDeliveries (DistributionId, DeliveryTarget, DeliveryForm)
        VALUES (@distId, @target, @form)
      `, { distId, target: t.target, form: t.form });
    }

    // Update tender to mark it has distribution
    await query(
      'UPDATE Tenders SET HasSubFileDistribution = 1, SubFileDistributionId = @distId WHERE TenderId = @tid',
      { distId, tid: parseInt(tenderId) }
    );

    await logAudit(req, 'إصدار ملفات فرعية', 'SubFileDistributions', distId,
      `تم إصدار وتوزيع الملفات الفرعية للعملية رقم ${tender.TenderNumber}`);

    res.json({ success: true, distributionId: distId, message: 'تم إصدار وتوزيع الملفات الفرعية بنجاح' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add attachment (warehouse addition OR final guarantee receipt)
app.put('/api/sub-files/:id/attachment', authenticateToken, requireRoles('Admin', 'TenderOfficer', 'FinancialAuditor'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { attachmentType, value, date, notes } = req.body;

    let updateSql = '';
    let notifMsg = '';

    if (attachmentType === 'warehouse') {
      updateSql = `UPDATE SubFileDistributions
        SET HasWarehouseAddition = 1, WarehouseAdditionNo = @val, WarehouseAdditionDate = @dt
        WHERE DistributionId = @id`;
      notifMsg = `تم إضافة إضافة مخزنية رقم ${value} بتاريخ ${date}`;
    } else if (attachmentType === 'guarantee') {
      updateSql = `UPDATE SubFileDistributions
        SET HasFinalGuaranteeReceipt = 1, FinalGuaranteeReceipt = @val, FinalGuaranteeReceivedAt = @dt
        WHERE DistributionId = @id`;
      notifMsg = `تم استلام إيصال التأمين النهائي رقم ${value} بتاريخ ${date}`;
    } else {
      return res.status(400).json({ error: 'نوع المرفق غير صحيح' });
    }

    await query(updateSql, { val: value, dt: date, id });

    // Auto-send completion notifications to all departments
    const departments = [
      'المخازن العامة',
      'قطاع المشروعات',
      'التنسيق الخارجي والتسويات المالية',
      'إدارة الاحتياجات ومتابعة المخزون'
    ];
    for (const dept of departments) {
      await query(`
        INSERT INTO SubFileNotifications (DistributionId, NotificationType, TargetDepartment, Message)
        VALUES (@distId, @type, @dept, @msg)
      `, {
        distId: id,
        type: attachmentType === 'warehouse' ? 'إضافة مخزنية' : 'إيصال تأمين نهائي',
        dept,
        msg: notifMsg + (notes ? ` — ملاحظة: ${notes}` : '')
      });
    }

    await logAudit(req, 'إضافة مرفق ملف فرعي', 'SubFileDistributions', id, notifMsg);
    res.json({ success: true, message: notifMsg + ' — تم إرسال إشعارات الاستكمال لجميع الإدارات' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark notification as read
app.put('/api/sub-files/notifications/:nid/read', authenticateToken, async (req, res) => {
  try {
    await query('UPDATE SubFileNotifications SET IsRead = 1 WHERE NotificationId = @nid', { nid: parseInt(req.params.nid) });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all distributions list (for dashboard/listing)
app.get('/api/sub-files/list/all', authenticateToken, async (req, res) => {
  try {
    const rows = await query(`
      SELECT sfd.DistributionId, sfd.OperationName, sfd.OperationType, sfd.OperationNumber,
             sfd.IssuedAt, sfd.IssuedBy, sfd.Status, sfd.HasFinalGuaranteeReceipt,
             sfd.HasWarehouseAddition, t.TenderNumber, t.TenderMethod
      FROM SubFileDistributions sfd
      LEFT JOIN Tenders t ON sfd.TenderId = t.TenderId
      ORDER BY sfd.IssuedAt DESC
    `, {});
    res.json(rows || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// ACCOUNTING ENTRIES & GUARANTEES (القيود المحاسبية والتأمينات)
// ============================================================================

// Get tenders that have awarding (for the page dropdown)
app.get('/api/guarantees/awarded-tenders', authenticateToken, async (req, res) => {
  try {
    const rows = await query(`
      SELECT DISTINCT t.TenderId, t.TenderNumber, t.TenderName, t.Status,
             a.AwardingId, a.AwardedAmount, a.VendorId as WinnerVendorId,
             v.CompanyName as WinnerCompanyName,
             a.FinalGuaranteeAmount, a.FinalGuaranteeStatus, a.TotalDeductions, a.NetAwardAmount
      FROM Tenders t
      INNER JOIN Awardings a ON t.TenderId = a.TenderId
      LEFT JOIN Vendors v ON a.VendorId = v.VendorId
      ORDER BY t.TenderId DESC
    `, {});
    res.json(rows || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all bid submissions for a tender (with vendor info & guarantee status)
app.get('/api/guarantees/tender/:tenderId/bids', authenticateToken, async (req, res) => {
  try {
    const tenderId = parseInt(req.params.tenderId);
    const bids = await query(`
      SELECT bs.SubmissionId, bs.VendorId, bs.InitialInsuranceAmount, bs.InitialInsuranceStatus,
             bs.GuaranteePaymentMethod, bs.ReceiptNumber, bs.CheckNumber, bs.BankName,
             bs.GuaranteeLetterNo, bs.FinancialTotalAmount, bs.FinalRank, bs.TechnicalStatus,
             v.CompanyName, v.Phone, v.Email
      FROM BidSubmissions bs
      LEFT JOIN Vendors v ON bs.VendorId = v.VendorId
      WHERE bs.TenderId = @tenderId AND (bs.IsDeleted = 0 OR bs.IsDeleted IS NULL)
      ORDER BY bs.FinalRank ASC
    `, { tenderId });

    // Check awarding to know who won
    const [awarding] = await query('SELECT VendorId as WinnerVendorId FROM Awardings WHERE TenderId = @tid', { tid: tenderId });

    // Get existing guarantee transactions
    const gTrans = await query('SELECT * FROM GuaranteeTransactions WHERE TenderId = @tid', { tid: tenderId });

    res.json({
      bids: bids || [],
      winnerVendorId: awarding?.WinnerVendorId || null,
      guaranteeTransactions: gTrans || []
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Process guarantee refund for LOSING vendors (رد التأمين الابتدائي للمرفوضين)
app.post('/api/guarantees/refund-losers', authenticateToken, requireRoles('Admin', 'FinancialAuditor'), async (req, res) => {
  try {
    const { tenderId, loserVendorIds, processedBy, stampDeductionPercent, adminFeePercent } = req.body;
    if (!tenderId || !loserVendorIds?.length) return res.status(400).json({ error: 'بيانات ناقصة' });

    const results = [];
    for (const vendorId of loserVendorIds) {
      // Get bid data
      const [bid] = await query(`
        SELECT SubmissionId, InitialInsuranceAmount, GuaranteePaymentMethod
        FROM BidSubmissions WHERE TenderId = @tid AND VendorId = @vid AND (IsDeleted = 0 OR IsDeleted IS NULL)
      `, { tid: parseInt(tenderId), vid: parseInt(vendorId) });

      if (!bid) continue;

      const originalAmount = bid.InitialInsuranceAmount || 0;
      const stampDeduction = Math.round((originalAmount * (stampDeductionPercent || 0)) / 100 * 100) / 100;
      const adminFee = Math.round((originalAmount * (adminFeePercent || 0)) / 100 * 100) / 100;
      const netRefund = Math.round((originalAmount - stampDeduction - adminFee) * 100) / 100;

      // Generate voucher number
      const countRes = await query('SELECT COUNT(*) as cnt FROM GuaranteeTransactions', {});
      const voucherNo = `GR-${new Date().getFullYear()}-${(countRes[0]?.cnt || 0) + 1}`;

      // Create guarantee transaction
      await query(`
        INSERT INTO GuaranteeTransactions
          (TenderId, VendorId, SubmissionId, TransactionType, OriginalAmount, DeductedStamps, DeductedAdminFees, NetRefundAmount, VoucherNumber, Status, ProcessedAt, ProcessedBy)
        VALUES
          (@tid, @vid, @sid, @type, @orig, @stamps, @admin, @net, @voucher, @status, CURRENT_TIMESTAMP, @processedBy)
      `, {
        tid: parseInt(tenderId), vid: parseInt(vendorId), sid: bid.SubmissionId,
        type: 'رد تأمين ابتدائي', orig: originalAmount, stamps: stampDeduction,
        admin: adminFee, net: netRefund, voucher: voucherNo, status: 'تم الصرف', processedBy: processedBy || 'النظام'
      });

      // Create accounting entry (journal entry)
      // من حـ/ حسابات دائنة أخرى - تأمين ابتدائي  إلى حـ/ حسابات جارية بالبنوك
      await query(`
        INSERT INTO FinancialTransactions
          (TenderId, VendorId, TransactionType, DebitAccountCode, DebitAccountName, CreditAccountCode, CreditAccountName, Amount, VoucherNumber, TransactionDate, Notes)
        VALUES
          (@tid, @vid, @type, @dCode, @dName, @cCode, @cName, @amount, @voucher, date('now'), @notes)
      `, {
        tid: parseInt(tenderId), vid: parseInt(vendorId),
        type: 'رد تأمين ابتدائي',
        dCode: '3301', dName: 'حسابات دائنة أخرى - تأمين ابتدائي',
        cCode: '1201', cName: 'حسابات جارية بالبنوك / الخزينة',
        amount: netRefund, voucher: voucherNo,
        notes: `رد تأمين ابتدائي - المبلغ الأصلي: ${originalAmount} - خصم دمغات: ${stampDeduction} - مصاريف إدارية: ${adminFee} - صافي الرد: ${netRefund}`
      });

      // Update bid submission status
      await query('UPDATE BidSubmissions SET InitialInsuranceStatus = @status WHERE SubmissionId = @sid', {
        status: 'تم رد التأمين', sid: bid.SubmissionId
      });

      results.push({ vendorId, voucherNo, originalAmount, stampDeduction, adminFee, netRefund });
    }

    await logAudit(req, 'رد تأمينات ابتدائية', 'GuaranteeTransactions', tenderId,
      `تم رد التأمين الابتدائي لـ ${results.length} مورد/مقاول بقيمة إجمالية ${results.reduce((s, r) => s + r.netRefund, 0)} ج.م`);

    res.json({ success: true, processed: results, message: `تم رد التأمين الابتدائي لـ ${results.length} مورد/مقاول وإنشاء القيود المحاسبية` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Process winner guarantee conversion (تحويل التأمين الابتدائي لنهائي للفائز)
app.post('/api/guarantees/convert-winner', authenticateToken, requireRoles('Admin', 'FinancialAuditor'), async (req, res) => {
  try {
    const { tenderId, winnerVendorId, processedBy, awardedAmount } = req.body;
    if (!tenderId || !winnerVendorId) return res.status(400).json({ error: 'بيانات ناقصة' });

    // Get winner bid
    const [bid] = await query(`
      SELECT SubmissionId, InitialInsuranceAmount, GuaranteePaymentMethod
      FROM BidSubmissions WHERE TenderId = @tid AND VendorId = @vid AND (IsDeleted = 0 OR IsDeleted IS NULL)
    `, { tid: parseInt(tenderId), vid: parseInt(winnerVendorId) });

    if (!bid) return res.status(404).json({ error: 'لم يتم العثور على عطاء الفائز' });

    const initialAmount = bid.InitialInsuranceAmount || 0;
    // Final guarantee = 5% of awarded amount (standard)
    const finalGuaranteeAmount = awardedAmount ? Math.round(awardedAmount * 0.05 * 100) / 100 : initialAmount;
    const difference = finalGuaranteeAmount - initialAmount;

    const countRes = await query('SELECT COUNT(*) as cnt FROM GuaranteeTransactions', {});
    const voucherNo = `GC-${new Date().getFullYear()}-${(countRes[0]?.cnt || 0) + 1}`;

    // Create guarantee transaction
    await query(`
      INSERT INTO GuaranteeTransactions
        (TenderId, VendorId, SubmissionId, TransactionType, OriginalAmount, ConvertedToFinal, FinalGuaranteeAmount, VoucherNumber, Status, ProcessedAt, ProcessedBy, Notes)
      VALUES
        (@tid, @vid, @sid, @type, @orig, 1, @finalAmt, @voucher, @status, CURRENT_TIMESTAMP, @processedBy, @notes)
    `, {
      tid: parseInt(tenderId), vid: parseInt(winnerVendorId), sid: bid.SubmissionId,
      type: 'تحويل تأمين ابتدائي لنهائي', orig: initialAmount, finalAmt: finalGuaranteeAmount,
      voucher: voucherNo, status: 'تم التحويل', processedBy: processedBy || 'النظام',
      notes: difference > 0 ? `يلزم سداد فرق ${difference} ج.م لاستكمال التأمين النهائي` : 'التأمين الابتدائي يغطي التأمين النهائي'
    });

    // Create accounting entry for conversion
    await query(`
      INSERT INTO FinancialTransactions
        (TenderId, VendorId, TransactionType, DebitAccountCode, DebitAccountName, CreditAccountCode, CreditAccountName, Amount, VoucherNumber, TransactionDate, Notes)
      VALUES
        (@tid, @vid, @type, @dCode, @dName, @cCode, @cName, @amount, @voucher, date('now'), @notes)
    `, {
      tid: parseInt(tenderId), vid: parseInt(winnerVendorId),
      type: 'تحويل تأمين لنهائي',
      dCode: '3301', dName: 'حسابات دائنة أخرى - تأمين ابتدائي',
      cCode: '3302', cName: 'حسابات دائنة أخرى - تأمين نهائي',
      amount: initialAmount, voucher: voucherNo,
      notes: `تحويل تأمين ابتدائي ${initialAmount} ج.م لتأمين نهائي ${finalGuaranteeAmount} ج.م — الفرق: ${difference} ج.م`
    });

    // Update bid submission
    await query('UPDATE BidSubmissions SET InitialInsuranceStatus = @status WHERE SubmissionId = @sid', {
      status: 'محوَّل لتأمين نهائي', sid: bid.SubmissionId
    });

    // Update awarding
    await query(`
      UPDATE Awardings SET FinalGuaranteeStatus = @status, FinalGuaranteeAmount = @amt WHERE TenderId = @tid
    `, { status: 'تم التحويل من التأمين الابتدائي', amt: finalGuaranteeAmount, tid: parseInt(tenderId) });

    // Auto-refund all OTHER (losing) bids for this tender
    const losers = await query(`
      SELECT VendorId FROM BidSubmissions
      WHERE TenderId = @tid AND VendorId != @wid AND (IsDeleted = 0 OR IsDeleted IS NULL)
        AND (InitialInsuranceStatus IS NULL OR InitialInsuranceStatus NOT IN ('تم رد التأمين', 'محوَّل لتأمين نهائي'))
        AND InitialInsuranceAmount > 0
    `, { tid: parseInt(tenderId), wid: parseInt(winnerVendorId) });

    let autoRefunded = 0;
    for (const loser of (losers || [])) {
      const [loserBid] = await query(`
        SELECT SubmissionId, InitialInsuranceAmount FROM BidSubmissions
        WHERE TenderId = @tid AND VendorId = @vid AND (IsDeleted = 0 OR IsDeleted IS NULL)
      `, { tid: parseInt(tenderId), vid: loser.VendorId });

      if (!loserBid) continue;

      const loserAmount = loserBid.InitialInsuranceAmount || 0;
      const countRes2 = await query('SELECT COUNT(*) as cnt FROM GuaranteeTransactions', {});
      const loserVoucher = `GR-${new Date().getFullYear()}-${(countRes2[0]?.cnt || 0) + 1}`;

      await query(`
        INSERT INTO GuaranteeTransactions
          (TenderId, VendorId, SubmissionId, TransactionType, OriginalAmount, NetRefundAmount, VoucherNumber, Status, ProcessedAt, ProcessedBy)
        VALUES
          (@tid, @vid, @sid, @type, @orig, @net, @voucher, @status, CURRENT_TIMESTAMP, @processedBy)
      `, {
        tid: parseInt(tenderId), vid: loser.VendorId, sid: loserBid.SubmissionId,
        type: 'رد تأمين ابتدائي (تلقائي)', orig: loserAmount, net: loserAmount,
        voucher: loserVoucher, status: 'تم الصرف', processedBy: 'النظام (تلقائي)'
      });

      await query(`
        INSERT INTO FinancialTransactions
          (TenderId, VendorId, TransactionType, DebitAccountCode, DebitAccountName, CreditAccountCode, CreditAccountName, Amount, VoucherNumber, TransactionDate, Notes)
        VALUES
          (@tid, @vid, @type, @dCode, @dName, @cCode, @cName, @amount, @voucher, date('now'), @notes)
      `, {
        tid: parseInt(tenderId), vid: loser.VendorId,
        type: 'رد تأمين ابتدائي',
        dCode: '3301', dName: 'حسابات دائنة أخرى - تأمين ابتدائي',
        cCode: '1201', cName: 'حسابات جارية بالبنوك / الخزينة',
        amount: loserAmount, voucher: loserVoucher,
        notes: `رد تأمين ابتدائي تلقائي بعد ترسية العملية على مورد آخر`
      });

      await query('UPDATE BidSubmissions SET InitialInsuranceStatus = @status WHERE SubmissionId = @sid', {
        status: 'تم رد التأمين', sid: loserBid.SubmissionId
      });

      autoRefunded++;
    }

    await logAudit(req, 'تحويل تأمين ابتدائي لنهائي', 'GuaranteeTransactions', tenderId,
      `تم تحويل تأمين الفائز ${initialAmount} ج.م لنهائي ${finalGuaranteeAmount} ج.م + رد تأمين ${autoRefunded} مورد تلقائياً`);

    res.json({
      success: true,
      voucherNo,
      initialAmount,
      finalGuaranteeAmount,
      difference,
      autoRefundedCount: autoRefunded,
      message: `تم تحويل التأمين للنهائي + رد تأمين ${autoRefunded} مورد/مقاول خاسر تلقائياً`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all guarantee transactions (with filtering)
app.get('/api/guarantees/transactions', authenticateToken, async (req, res) => {
  try {
    const { tenderId } = req.query;
    let sqlStr = `
      SELECT gt.*, v.CompanyName, t.TenderNumber, t.TenderName
      FROM GuaranteeTransactions gt
      LEFT JOIN Vendors v ON gt.VendorId = v.VendorId
      LEFT JOIN Tenders t ON gt.TenderId = t.TenderId
    `;
    const params = {};
    if (tenderId) {
      sqlStr += ' WHERE gt.TenderId = @tid';
      params.tid = parseInt(tenderId);
    }
    sqlStr += ' ORDER BY gt.CreatedAt DESC';
    const rows = await query(sqlStr, params);
    res.json(rows || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get accounting entries summary for a tender
app.get('/api/guarantees/accounting/:tenderId', authenticateToken, async (req, res) => {
  try {
    const tid = parseInt(req.params.tenderId);
    const entries = await query(`
      SELECT ft.*, v.CompanyName
      FROM FinancialTransactions ft
      LEFT JOIN Vendors v ON ft.VendorId = v.VendorId
      WHERE ft.TenderId = @tid AND ft.TransactionType IN ('رد تأمين ابتدائي', 'تحويل تأمين لنهائي')
      ORDER BY ft.CreatedAt DESC
    `, { tid });
    res.json(entries || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start Server
connectDb().then(() => {
  app.listen(PORT, () => {
    console.log(`🌐 ASDCO Procurement & Contracts Backend Server running on http://localhost:${PORT}`);
  });
});
