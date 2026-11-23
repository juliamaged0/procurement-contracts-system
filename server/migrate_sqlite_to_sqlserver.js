require('dotenv').config();
const Database = require('better-sqlite3');
const sql = require('mssql');
const path = require('path');

const mssqlConfig = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '1',
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_NAME || 'ProcurementDB',
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

async function migrate() {
  const dbPath = path.join(__dirname, 'procurement_local.db');
  const sqliteDb = new Database(dbPath);

  console.log('🔄 محاولة الاتصال بـ Microsoft SQL Server...');
  try {
    const pool = await sql.connect(mssqlConfig);
    console.log('✅ تم الاتصال بنجاح بـ SQL Server!');

    const tables = [
      'Users',
      'SupplyCategories',
      'Vendors',
      'NeedsRequests',
      'NeedsRequestItems',
      'Tenders',
      'TenderItems',
      'TenderInvitedVendors',
      'VendorSubmissions',
      'TenderItemOffers',
      'FinancialGuarantees',
      'AwardDecisions'
    ];

    for (const table of tables) {
      try {
        const rows = sqliteDb.prepare(`SELECT * FROM ${table}`).all();
        if (rows.length === 0) continue;

        console.log(`⏳ نقل بيانات جدول ${table} (${rows.length} سجل)...`);
        
        for (const row of rows) {
          const keys = Object.keys(row);
          const columns = keys.join(', ');
          const paramNames = keys.map(k => `@${k}`).join(', ');

          const request = new sql.Request(pool);
          keys.forEach(k => {
            request.input(k, row[k]);
          });

          // IDENTITY_INSERT if primary key is present
          const idCol = keys[0];
          try {
            await pool.request().query(`SET IDENTITY_INSERT ${table} ON; INSERT INTO ${table} (${columns}) VALUES (${paramNames}); SET IDENTITY_INSERT ${table} OFF;`);
          } catch (insertErr) {
            // Try standard insert if identity insert is not applicable
            try {
              const standardReq = new sql.Request(pool);
              keys.forEach(k => standardReq.input(k, row[k]));
              await standardReq.query(`INSERT INTO ${table} (${columns}) VALUES (${paramNames})`);
            } catch (fallbackErr) {
              // Row might already exist
            }
          }
        }
        console.log(`✅ تم نقل جدول ${table} بنجاح.`);
      } catch (err) {
        console.log(`⚠️ تخطي جدول ${table}: ${err.message}`);
      }
    }

    console.log('🎉 اكتملت عملية الترحيل بنجاح إلى Microsoft SQL Server!');
    process.exit(0);
  } catch (err) {
    console.error('❌ تعذر الاتصال بـ SQL Server:', err.message);
    console.log('\nتأكد من:');
    console.log('1. تشغيل خدمة SQL Server.');
    console.log('2. صحة بيانات السيرفر والمستخدم وكلمة المرور في ملف .env.');
    console.log('3. تفعيل بروتوكول TCP/IP من SQL Server Configuration Manager.');
    process.exit(1);
  }
}

migrate();
