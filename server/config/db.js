require('dotenv').config();
const sql = require('mssql');
const path = require('path');
const fs = require('fs');
const iconv = require('iconv-lite');

// Mojibake auto-fix: converts any Windows-1252 misinterpreted UTF-8 Arabic text back to pure Arabic
function fixMojibake(val) {
  if (typeof val !== 'string' || !val) return val;
  if (!/[\u00C0-\u00FF]/.test(val)) return val;
  try {
    const candidate = iconv.decode(iconv.encode(val, 'win1252'), 'utf8');
    if (/[\u0600-\u06FF]/.test(candidate) && !candidate.includes('\uFFFD')) {
      return candidate;
    }
  } catch (e) {
    // fallback
  }
  return val;
}

function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (typeof v === 'string') {
      obj[k] = fixMojibake(v);
    } else if (Array.isArray(v)) {
      v.forEach(item => sanitizeObject(item));
    } else if (typeof v === 'object' && v !== null && !(v instanceof Date)) {
      sanitizeObject(v);
    }
  }
  return obj;
}

// SQL Server Configuration
const mssqlConfig = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '1',
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_NAME || 'ProcurementDB',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : undefined,
  connectionTimeout: parseInt(process.env.DB_TIMEOUT || '15000', 10),
  requestTimeout: parseInt(process.env.DB_REQUEST_TIMEOUT || '30000', 10),
  pool: {
    max: 20,
    min: 0,
    idleTimeoutMillis: 30000
  },
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: true,
    enableArithAbort: true
  }
};

let pool = null;

// Connect to Database strictly with Microsoft SQL Server with Auto-Failover
async function connectDb() {
  const candidates = [
    { name: `الأساسي (${mssqlConfig.server}:${mssqlConfig.port || 1433})`, config: mssqlConfig },
    { name: 'مثيل ASDCO (Port 14330)', config: { ...mssqlConfig, port: 14330, options: { ...mssqlConfig.options, instanceName: undefined } } },
    { name: 'المثيل المسمى ASDCO', config: { ...mssqlConfig, port: undefined, server: 'localhost', options: { ...mssqlConfig.options, instanceName: 'ASDCO' } } },
    { name: 'المثيل المحلي (.)', config: { ...mssqlConfig, server: '.', port: undefined, options: { ...mssqlConfig.options, instanceName: undefined } } },
    { name: 'المثيل MSSQLSERVER01', config: { ...mssqlConfig, port: undefined, server: 'localhost', options: { ...mssqlConfig.options, instanceName: 'MSSQLSERVER01' } } }
  ];

  let lastError = null;
  for (const cand of candidates) {
    try {
      console.log(`🔌 محاولة الاتصال بـ Microsoft SQL Server عبر [${cand.name}]...`);
      pool = await new sql.ConnectionPool({ ...cand.config, connectionTimeout: 6000 }).connect();
      console.log(`🚀 تم الاتصال بنجاح بقاعدة البيانات (${cand.config.database}) عبر [${cand.name}]!`);
      await ensureSchemaUpToDate();
      return pool;
    } catch (err) {
      lastError = err;
      // If error is database does not exist, try creating it via master
      if (err.message && (err.message.includes('Cannot open database') || err.message.includes('does not exist'))) {
        try {
          console.log(`ℹ️ جاري إنشاء قاعدة البيانات ${cand.config.database} على المثيل...`);
          const masterPool = await new sql.ConnectionPool({ ...cand.config, database: 'master', connectionTimeout: 5000 }).connect();
          await masterPool.request().query(`IF DB_ID('${cand.config.database}') IS NULL CREATE DATABASE [${cand.config.database}];`);
          await masterPool.close();
          pool = await new sql.ConnectionPool({ ...cand.config, connectionTimeout: 6000 }).connect();
          console.log(`🚀 تم إنشاء والاتصال بقاعدة البيانات (${cand.config.database}) عبر [${cand.name}]!`);
          await ensureSchemaUpToDate();
          return pool;
        } catch (mErr) {
          // continue
        }
      }
    }
  }

  console.error('❌ تعذر الاتصال بـ Microsoft SQL Server بعد فحص جميع المثيلات المتاحة.');
  console.error('الخطأ الأخير:', lastError?.message);
  console.error('\n🛠️ حل المشكلة في خطوتين بسيطتين:');
  console.error('1. افتح برنامج SSMS وافتح الملف Fix_SSMS_Connection.sql الموجود في مجلد المشروع واضغط Execute (F5).');
  console.error('2. اضغط كليك يمين على اسم السيرفر في أعلى SSMS واختر Restart.');
  throw lastError;
}

// Auto-migration helper to ensure newer columns exist
async function ensureSchemaUpToDate() {
  try {
    const checkTable = await pool.request().query("SELECT 1 FROM sys.tables WHERE name = 'Tenders'");
    if (checkTable.recordset.length === 0) {
      console.log('ℹ️ جداول النظام غير موجودة، جارٍ استيراد الهيكل من schema.sql...');
      const schemaPath = path.join(__dirname, '..', '..', 'database', 'schema.sql');
      if (fs.existsSync(schemaPath)) {
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        const batches = schemaSql.split(/^\s*GO\s*$/gim);
        for (const batch of batches) {
          const clean = batch.trim();
          if (clean && !clean.startsWith('USE ')) {
            try {
              await pool.request().query(clean);
            } catch (bErr) {
              // ignore minor drops
            }
          }
        }
        console.log('✅ تم إنشاء جداول قاعدة البيانات بنجاح في SQL Server!');
      }
    } else {
      // Ensure latest columns exist in NeedsRequests
      await pool.request().query(`
        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('NeedsRequests') AND name = 'WorkflowStatus')
        BEGIN
            ALTER TABLE NeedsRequests ADD
                SpecsAndConditions NVARCHAR(MAX) NULL,
                RequiresSample BIT DEFAULT 0,
                SampleDetails NVARCHAR(500) NULL,
                WarehouseQuerySent BIT DEFAULT 0,
                WarehouseQueryResponse NVARCHAR(MAX) NULL,
                WarehouseQueryResponseDate DATETIME NULL,
                FinancialOperationNumber NVARCHAR(100) NULL,
                FinancialOperationSymbol NVARCHAR(50) NULL,
                TenderMethodSelected NVARCHAR(100) NULL,
                PreliminaryReservation DECIMAL(18,2) DEFAULT 0,
                ReservationTypeNew NVARCHAR(100) NULL,
                BookletPrice DECIMAL(18,2) DEFAULT 0,
                OperationTerms NVARCHAR(MAX) NULL,
                ConstructionDivision NVARCHAR(150) NULL,
                ConstructionCategory NVARCHAR(100) NULL,
                ApprovalAuthority NVARCHAR(150) NULL,
                AuthorityApprovalStatus NVARCHAR(100) DEFAULT N'في انتظار الموافقة',
                AuthorityApprovalDate DATETIME NULL,
                AuthorityRejectionReason NVARCHAR(500) NULL,
                WorkflowStatus NVARCHAR(100) DEFAULT N'طلب جديد',
                InitialGuaranteePercent DECIMAL(5,2) DEFAULT 2,
                InitialGuaranteeAmount DECIMAL(18,2) DEFAULT 0,
                OperationItems NVARCHAR(MAX) NULL,
                FinancialNotes NVARCHAR(MAX) NULL,
                FinancialReviewedAt DATETIME NULL,
                FinancialReviewedBy NVARCHAR(100) NULL,
                AuthorityReviewedAt DATETIME NULL,
                AuthorityReviewedBy NVARCHAR(100) NULL,
                FinancialApprovalObtained BIT DEFAULT 0,
                FinancialApprovalDate DATETIME NULL,
                FinancialApprovalNotes NVARCHAR(MAX) NULL,
                SpecsFileName NVARCHAR(300) NULL,
                SpecsFilePath NVARCHAR(500) NULL,
                BookletFileName NVARCHAR(300) NULL,
                BookletFilePath NVARCHAR(500) NULL,
                TechnicalEvaluationMethod NVARCHAR(100) DEFAULT N'مطابق أو غير مطابق',
                MinPassingScore DECIMAL(5,2) DEFAULT 70,
                AllowSplitAwarding BIT DEFAULT 0,
                TechnicalCriteriaNotes NVARCHAR(MAX) NULL;
        END
      `);

      // Ensure latest columns exist in Tenders
      await pool.request().query(`
        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Tenders') AND name = 'BookletFileName')
        BEGIN
            ALTER TABLE Tenders ADD 
                OperationType NVARCHAR(100) NULL,
                ExecutionDuration NVARCHAR(100) NULL,
                WarehouseBalance NVARCHAR(500) NULL,
                SpecsAndConditions NVARCHAR(MAX) NULL,
                ReservationType NVARCHAR(100) NULL,
                EstimatedValue DECIMAL(18,2) NULL,
                ConstructionDivision NVARCHAR(200) NULL,
                ConstructionCategory NVARCHAR(100) NULL,
                FinancialApprovalObtained NVARCHAR(10) NULL,
                FinancialApprovalDate DATETIME NULL,
                FinancialApprovalNotes NVARCHAR(MAX) NULL,
                AllowSplitAwarding NVARCHAR(10) NULL,
                TechnicalCriteriaNotes NVARCHAR(MAX) NULL,
                BookletFileName NVARCHAR(500) NULL,
                BookletFilePath NVARCHAR(1000) NULL,
                BookletFileSize INT NULL,
                BookletUploadedAt DATETIME NULL,
                InvitedVendorsCount INT DEFAULT 0,
                InvitedVendorsJson NVARCHAR(MAX) NULL;
        END
      `);

      // Ensure InitialGuaranteeAmount exists in NeedsRequests
      await pool.request().query(`
        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('NeedsRequests') AND name = 'InitialGuaranteeAmount')
        BEGIN
            ALTER TABLE NeedsRequests ADD InitialGuaranteeAmount DECIMAL(18,2) DEFAULT 0;
        END
      `);

      // Ensure latest columns exist in TenderItems
      await pool.request().query(`
        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('TenderItems') AND name = 'ItemCriteria')
        BEGIN
            ALTER TABLE TenderItems ADD 
                ItemSpecs NVARCHAR(MAX) NULL,
                ItemMaxScore DECIMAL(5,2) NULL,
                ItemMinPassingScore DECIMAL(5,2) NULL,
                ItemCriteria NVARCHAR(MAX) NULL,
                AllowSplit BIT DEFAULT 1;
        END
      `);

      // Ensure TenderInvitedVendors table exists
      await pool.request().query(`
        IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'TenderInvitedVendors')
        BEGIN
            CREATE TABLE TenderInvitedVendors (
                InvitedId INT IDENTITY(1,1) PRIMARY KEY,
                TenderId INT NOT NULL,
                VendorId INT NULL,
                CompanyName NVARCHAR(255) NOT NULL,
                TaxCardNo NVARCHAR(50) NULL,
                CommercialRegisterNo NVARCHAR(50) NULL,
                ContactPerson NVARCHAR(150) NULL,
                Phone NVARCHAR(50) NULL,
                Fax NVARCHAR(50) NULL,
                Email NVARCHAR(100) NULL,
                InvitationMethod NVARCHAR(50) DEFAULT N'خطاب موصى عليه بعلم الوصول',
                DispatchDate DATETIME DEFAULT GETDATE(),
                ReceiptConfirmed BIT DEFAULT 0,
                ReceiptDate DATETIME NULL,
                Notes NVARCHAR(MAX) NULL,
                CreatedAt DATETIME DEFAULT GETDATE(),
                FOREIGN KEY (TenderId) REFERENCES Tenders(TenderId)
            );
        END
      `);

      // Ensure modern evaluation and envelope columns exist
      await pool.request().query(`
        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Tenders') AND name = 'SubmittalType')
          ALTER TABLE Tenders ADD SubmittalType NVARCHAR(50) DEFAULT N'مظروف واحد';
        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Tenders') AND name = 'TechnicalEvaluationMethod')
          ALTER TABLE Tenders ADD TechnicalEvaluationMethod NVARCHAR(100) DEFAULT N'مطابق أو غير مطابق';
        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Tenders') AND name = 'MinPassingScore')
          ALTER TABLE Tenders ADD MinPassingScore DECIMAL(5,2) DEFAULT 70;
        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Tenders') AND name = 'OpeningSessionType')
          ALTER TABLE Tenders ADD OpeningSessionType NVARCHAR(50) DEFAULT N'فني';

        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('BidSubmissions') AND name = 'EnvelopeStage')
          ALTER TABLE BidSubmissions ADD EnvelopeStage NVARCHAR(50) DEFAULT N'فني';
        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('BidSubmissions') AND name = 'FinancialEnvelopeOpened')
          ALTER TABLE BidSubmissions ADD FinancialEnvelopeOpened BIT DEFAULT 0;
        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('BidSubmissions') AND name = 'TechnicalNotes')
          ALTER TABLE BidSubmissions ADD TechnicalNotes NVARCHAR(MAX) NULL;
        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('BidSubmissions') AND name = 'FinancialNotes')
          ALTER TABLE BidSubmissions ADD FinancialNotes NVARCHAR(MAX) NULL;

        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('BidItems') AND name = 'TechnicalStatus')
          ALTER TABLE BidItems ADD TechnicalStatus NVARCHAR(50) DEFAULT N'مطابق';
        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('BidItems') AND name = 'ItemScore')
          ALTER TABLE BidItems ADD ItemScore DECIMAL(5,2) DEFAULT 0;
        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('BidItems') AND name = 'CriteriaScores')
          ALTER TABLE BidItems ADD CriteriaScores NVARCHAR(MAX) NULL;
        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('BidItems') AND name = 'FinancialDiscountPercent')
          ALTER TABLE BidItems ADD FinancialDiscountPercent DECIMAL(5,2) DEFAULT 0;
        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('BidItems') AND name = 'FinancialNotes')
          ALTER TABLE BidItems ADD FinancialNotes NVARCHAR(500) NULL;
      `);

      // Ensure Registry tables (Reg_*) exist for سجل الموردين والمقاولين
      await pool.request().query(`
        IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Reg_SupplyGroups')
        BEGIN
          CREATE TABLE Reg_SupplyGroups (
            GroupId INT IDENTITY(1,1) PRIMARY KEY,
            GroupNo INT,
            GroupName NVARCHAR(300) NOT NULL UNIQUE
          );
        END

        IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Reg_SupplyVendors')
        BEGIN
          CREATE TABLE Reg_SupplyVendors (
            VendorId INT IDENTITY(1,1) PRIMARY KEY,
            GroupId INT NOT NULL FOREIGN KEY REFERENCES Reg_SupplyGroups(GroupId) ON DELETE CASCADE,
            CompanyName NVARCHAR(300) NOT NULL,
            Address NVARCHAR(500) NULL,
            Phone NVARCHAR(100) NULL,
            Status NVARCHAR(20) NOT NULL DEFAULT 'GREEN',
            BlacklistReason NVARCHAR(MAX) NULL,
            CreatedAt DATETIME DEFAULT GETDATE()
          );
        END

        IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Reg_ContractGroups')
        BEGIN
          CREATE TABLE Reg_ContractGroups (
            GroupId INT IDENTITY(1,1) PRIMARY KEY,
            GroupNo INT,
            GroupName NVARCHAR(300) NOT NULL UNIQUE,
            RequirementType NVARCHAR(50) NOT NULL DEFAULT 'NONE'
          );
        END

        IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Reg_ContractSubGroups')
        BEGIN
          CREATE TABLE Reg_ContractSubGroups (
            SubGroupId INT IDENTITY(1,1) PRIMARY KEY,
            GroupId INT NOT NULL FOREIGN KEY REFERENCES Reg_ContractGroups(GroupId) ON DELETE CASCADE,
            SubGroupName NVARCHAR(300) NOT NULL
          );
        END

        IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Reg_Contractors')
        BEGIN
          CREATE TABLE Reg_Contractors (
            ContractorId INT IDENTITY(1,1) PRIMARY KEY,
            SubGroupId INT NOT NULL FOREIGN KEY REFERENCES Reg_ContractSubGroups(SubGroupId) ON DELETE CASCADE,
            CompanyName NVARCHAR(300) NOT NULL,
            Address NVARCHAR(500) NULL,
            Phone NVARCHAR(100) NULL,
            Status NVARCHAR(20) NOT NULL DEFAULT 'GREEN',
            BlacklistReason NVARCHAR(MAX) NULL,
            FederationRegistered BIT NULL,
            FederationBranch NVARCHAR(200) NULL,
            FederationGrade NVARCHAR(100) NULL,
            QualifiedAndLicensed BIT NULL,
            CreatedAt DATETIME DEFAULT GETDATE()
          );
        END

        IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Reg_ContractorDocuments')
        BEGIN
          CREATE TABLE Reg_ContractorDocuments (
            DocId INT IDENTITY(1,1) PRIMARY KEY,
            ContractorId INT NOT NULL FOREIGN KEY REFERENCES Reg_Contractors(ContractorId) ON DELETE CASCADE,
            DocType NVARCHAR(50) NULL,
            FileName NVARCHAR(300) NOT NULL,
            FilePath NVARCHAR(500) NOT NULL,
            MimeType NVARCHAR(100) NULL,
            UploadedAt DATETIME DEFAULT GETDATE()
          );
        END
      `);

      // Ensure Reg_SupplyGroups is populated if empty
      const rCheck = await pool.request().query('SELECT COUNT(*) AS c FROM Reg_SupplyGroups');
      if (rCheck.recordset[0].c === 0) {
        await pool.request().query(`
          INSERT INTO Reg_SupplyGroups (GroupNo, GroupName)
          SELECT CategoryId, CategoryName FROM SupplyCategories;
        `);
      }
    }

    // Auto-repair any existing mojibake in tables
    await runMojibakeRepair(pool);
  } catch (err) {
    console.warn('⚠️ ملاحظة في فحص الهيكل:', err.message);
  }
}

// Automatically repair Latin-1 / Windows-1252 corrupted text in SQL Server tables
async function runMojibakeRepair(activePool) {
  const p = activePool || pool;
  if (!p) return;
  const TABLES = [
    { table: 'NeedsRequests', pk: 'RequestId', columns: ['OperationName', 'OperationType', 'RequestingDepartment', 'ExecutionDuration', 'SpecsAndConditions', 'WarehouseBalance', 'TenderMethodSelected', 'ReservationTypeNew', 'WorkflowStatus', 'Status', 'TechnicalEvaluationMethod', 'FinancialApprovalNotes', 'FinancialNotes', 'ApprovalAuthority'] },
    { table: 'Tenders', pk: 'TenderId', columns: ['TenderName', 'TenderMethod', 'RequestingDepartment', 'BudgetHoldReference', 'EvaluationMethod', 'Status', 'OperationType', 'ExecutionDuration', 'WarehouseBalance', 'SpecsAndConditions', 'ReservationType', 'ConstructionDivision'] },
    { table: 'TenderItems', pk: 'ItemId', columns: ['ItemDescription', 'Unit', 'Notes', 'ItemCriteria'] },
    { table: 'Vendors', pk: 'VendorId', columns: ['CompanyName', 'Address', 'CategoryGroup', 'ConstructionBranch'] },
    { table: 'Users', pk: 'UserId', columns: ['FullName', 'Department', 'Role'] },
    { table: 'SupplyCategories', pk: 'CategoryId', columns: ['CategoryName'] },
    { table: 'ContractorGroups', pk: 'GroupId', columns: ['GroupName', 'GroupDescription', 'WorkScope'] },
    { table: 'WarehouseInventory', pk: 'ProductId', columns: ['ProductName', 'Unit', 'Location'] }
  ];

  for (const t of TABLES) {
    try {
      const check = await p.request().query(`SELECT 1 FROM sys.tables WHERE name = '${t.table}'`);
      if (check.recordset.length === 0) continue;
      const cols = t.columns.join(', ');
      const rows = (await p.request().query(`SELECT ${t.pk}, ${cols} FROM ${t.table}`)).recordset;
      for (const row of rows) {
        const pkVal = row[t.pk];
        const updates = [];
        const req = p.request();
        req.input('pkVal', pkVal);
        for (const col of t.columns) {
          const val = row[col];
          if (typeof val === 'string' && val.length > 0) {
            const fixed = fixMojibake(val);
            if (fixed !== val) {
              updates.push(`${col} = @val_${col}`);
              req.input(`val_${col}`, fixed);
            }
          }
        }
        if (updates.length > 0) {
          await req.query(`UPDATE ${t.table} SET ${updates.join(', ')} WHERE ${t.pk} = @pkVal`);
        }
      }
    } catch (e) {
      // ignore
    }
  }
}

// Generic Query Runner for Microsoft SQL Server
async function query(sqlQuery, params = {}) {
  if (!pool) {
    await connectDb();
  }

  const request = pool.request();
  Object.keys(params).forEach(key => {
    const rawVal = params[key];
    const cleanVal = typeof rawVal === 'string' ? fixMojibake(rawVal) : rawVal;
    request.input(key, cleanVal);
  });

  let execQuery = sqlQuery.trim();
  const isInsert = /^INSERT\s+INTO/i.test(execQuery);
  const hasScopeIdentity = /SCOPE_IDENTITY\s*\(\s*\)/i.test(execQuery);
  const hasOutput = /\bOUTPUT\b/i.test(execQuery);

  if (isInsert && !hasScopeIdentity && !hasOutput) {
    execQuery += '; SELECT SCOPE_IDENTITY() AS lastID;';
  }

  const result = await request.query(execQuery);
  
  let lastID = null;
  if (result.recordset && result.recordset.length > 0 && result.recordset[0].lastID !== undefined) {
    lastID = result.recordset[0].lastID;
  }

  const records = result.recordset || [];
  
  // Clean all records before returning to application
  if (Array.isArray(records)) {
    for (let i = 0; i < records.length; i++) {
      sanitizeObject(records[i]);
    }
  }

  records.lastID = lastID;
  records.rowsAffected = result.rowsAffected ? result.rowsAffected[0] : 0;
  records.recordset = result.recordset;

  return records;
}

module.exports = {
  connectDb,
  query,
  sql
};
