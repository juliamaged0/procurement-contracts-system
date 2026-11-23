require('dotenv').config();
const sql = require('mssql');
const path = require('path');
const fs = require('fs');

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

// Connect to Database strictly with Microsoft SQL Server
async function connectDb() {
  try {
    console.log(`🔌 جارٍ الاتصال بقاعدة بيانات Microsoft SQL Server على (${mssqlConfig.server} / ${mssqlConfig.database})...`);
    pool = await sql.connect(mssqlConfig);
    console.log('🚀 تم الاتصال بنجاح بقاعدة بيانات Microsoft SQL Server (SSMS)!');

    // Run schema updates if needed
    await ensureSchemaUpToDate();
    return pool;
  } catch (err) {
    console.error('❌ فشل الاتصال بـ Microsoft SQL Server:', err.message);
    console.error('\n⚠️ تنبيه: تم إيقاف محرك SQLite نهائياً بناءً على طلبك. يجب تشغيل خدمة SQL Server والتأكد من بيانات الاتصال في ملف .env:');
    console.error('1. تأكد من أن خدمة SQL Server قيد التشغيل (Running).');
    console.error('2. تأكد من تفعيل بروتوكول TCP/IP في SQL Server Configuration Manager.');
    console.error('3. تحقق من صحة اسم السيرفر وقاعدة البيانات والمستخدم وكلمة المرور في ملف server/.env.');
    throw err;
  }
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
    }
  } catch (err) {
    console.warn('⚠️ ملاحظة في فحص الهيكل:', err.message);
  }
}

// Generic Query Runner for Microsoft SQL Server
async function query(sqlQuery, params = {}) {
  if (!pool) {
    await connectDb();
  }

  const request = pool.request();
  Object.keys(params).forEach(key => {
    request.input(key, params[key]);
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
