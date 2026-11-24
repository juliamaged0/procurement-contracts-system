/**
 * SQL Server Instance Connection Diagnostic Tool
 */
const sql = require('mssql');

const CANDIDATES = [
  { name: '1. Localhost (Port 1433)', config: { server: 'localhost', port: 1433, user: 'sa', password: '1', database: 'ProcurementDB', options: { encrypt: false, trustServerCertificate: true } } },
  { name: '2. ASDCO Instance (Port 14330)', config: { server: 'localhost', port: 14330, user: 'sa', password: '1', database: 'ProcurementDB', options: { encrypt: false, trustServerCertificate: true } } },
  { name: '3. Named Instance ASDCO', config: { server: 'localhost', user: 'sa', password: '1', database: 'ProcurementDB', options: { encrypt: false, trustServerCertificate: true, instanceName: 'ASDCO' } } },
  { name: '4. Named Instance MSSQLSERVER01', config: { server: 'localhost', user: 'sa', password: '1', database: 'ProcurementDB', options: { encrypt: false, trustServerCertificate: true, instanceName: 'MSSQLSERVER01' } } },
  { name: '5. Dot notation (.)', config: { server: '.', user: 'sa', password: '1', database: 'ProcurementDB', options: { encrypt: false, trustServerCertificate: true } } }
];

async function testAll() {
  console.log('================================================================');
  console.log('    فحص وتشخيص الاتصال بمحركات Microsoft SQL Server (SSMS)');
  console.log('================================================================\n');

  let anySuccess = false;

  for (const cand of CANDIDATES) {
    process.stdout.write(`Testing [${cand.name}] ... `);
    try {
      const pool = await new sql.ConnectionPool({ ...cand.config, connectionTimeout: 4000 }).connect();
      const res = await pool.request().query('SELECT @@SERVERNAME AS srv, DB_NAME() AS db, COUNT(*) AS tblCnt FROM sys.tables');
      console.log('✅ نجح الاتصال!');
      console.log(`   السيرفر: ${res.recordset[0].srv} | قاعدة البيانات: ${res.recordset[0].db} | عدد الجداول: ${res.recordset[0].tblCnt}\n`);
      await pool.close();
      anySuccess = true;
      break;
    } catch (err) {
      console.log(`❌ فشل: ${err.message}`);
    }
  }

  if (!anySuccess) {
    console.log('\n⚠️ لم ينجح الاتصال بأي من المحركات. الأسباب المحتملة:');
    console.log('1. خدمة SQL Server متوقفة، يرجى فتح SSMS والضغط كليك يمين على السيرفر ثم Restart.');
    console.log('2. لم يتم تفعيل مصادقة Mixed Mode لمستخدم sa. قم بفتح ملف Fix_SSMS_Connection.sql داخل SSMS واضغط Execute (F5).');
  }
}

testAll().catch(console.error);
