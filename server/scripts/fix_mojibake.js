/**
 * Mojibake Auto-Fix Tool for ProcurementDB (Microsoft SQL Server)
 * Converts any Latin-1/Windows-1252 corrupted UTF-8 Arabic text (e.g. ØªØ¹Ø§Ù‚Ø¯Ø§Øª) back to clean Arabic (تعاقدات).
 */
const sql = require('mssql');
const path = require('path');
const iconv = require('iconv-lite');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const config = {
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_NAME || 'ProcurementDB',
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '1',
  port: parseInt(process.env.DB_PORT, 10) || 1433,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
  },
};

function fixMojibake(str) {
  if (!str || typeof str !== 'string') return str;
  // If string contains mojibake characters like Ø, Ù, etc.
  if (!/[\u00C0-\u00FF]/.test(str)) return str;
  try {
    const candidate = iconv.decode(iconv.encode(str, 'win1252'), 'utf8');
    // If it produced valid Arabic letters (\u0600-\u06FF) and no unprintable replacement chars
    if (/[\u0600-\u06FF]/.test(candidate) && !candidate.includes('\uFFFD')) {
      return candidate;
    }
  } catch (e) {
    // ignore
  }
  return str;
}

function sanitizeMojibake(data) {
  if (data === null || data === undefined) return data;
  if (typeof data === 'string') {
    if ((data.startsWith('[') && data.endsWith(']')) || (data.startsWith('{') && data.endsWith('}'))) {
      try {
        const parsed = JSON.parse(data);
        const cleaned = sanitizeMojibake(parsed);
        return JSON.stringify(cleaned);
      } catch (e) {
        return fixMojibake(data);
      }
    }
    return fixMojibake(data);
  }
  if (Array.isArray(data)) {
    return data.map(sanitizeMojibake);
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const res = {};
    for (const key of Object.keys(data)) {
      res[key] = sanitizeMojibake(data[key]);
    }
    return res;
  }
  return data;
}

const TARGETS = [
  { table: 'NeedsRequests', pk: 'RequestId', columns: ['OperationName', 'OperationType', 'RequestingDepartment', 'ExecutionDuration', 'SpecsAndConditions', 'SampleDetails', 'WarehouseBalance', 'FiscalYear', 'TenderMethodSelected', 'ReservationTypeNew', 'OperationTerms', 'ConstructionDivision', 'ConstructionCategory', 'FinancialNotes', 'ApprovalAuthority', 'AuthorityApprovalStatus', 'AuthorityRejectionReason', 'WorkflowStatus', 'Status', 'TechnicalEvaluationMethod', 'TechnicalCriteriaNotes', 'SpecsFileName', 'OperationItems'] },
  { table: 'Tenders', pk: 'TenderId', columns: ['TenderName', 'TenderMethod', 'RequestingDepartment', 'BudgetHoldReference', 'FiscalYear', 'AdNewspaper1', 'AdNewspaper2', 'AdDetails', 'EvaluationMethod', 'SampleDetails', 'Status', 'BookletFileName', 'TechnicalCriteriaNotes', 'OperationType', 'ExecutionDuration', 'WarehouseBalance', 'SpecsAndConditions', 'ReservationType', 'ConstructionDivision', 'ConstructionCategory', 'FinancialApprovalNotes'] },
  { table: 'TenderItems', pk: 'ItemId', columns: ['ItemDescription', 'Unit', 'Notes', 'ItemCriteria', 'TechSpecsSummary'] },
  { table: 'Vendors', pk: 'VendorId', columns: ['VendorName', 'CommercialName', 'City', 'Address', 'ContactPerson', 'ActivityType', 'CompanyCategory', 'LegalForm'] },
  { table: 'Users', pk: 'UserId', columns: ['FullName', 'Department', 'Role'] },
  { table: 'SupplyCategories', pk: 'CategoryId', columns: ['CategoryName', 'SubCategoryName', 'Description', 'StandardUnit', 'CommonSpecs'] },
  { table: 'ContractorGroups', pk: 'GroupId', columns: ['GroupName', 'Division', 'Category', 'Specialization', 'Description'] },
  { table: 'WarehouseInventory', pk: 'ProductId', columns: ['ProductCode', 'ProductName', 'Category', 'Unit', 'WarehouseLocation', 'Condition'] }
];

async function run() {
  console.log('🔌 Connecting to SQL Server on', config.server, '/', config.database);
  let pool;
  try {
    pool = await sql.connect(config);
    console.log('✅ Connected successfully!');
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  }

  let totalUpdated = 0;

  for (const target of TARGETS) {
    try {
      // Check if table exists
      const tableCheck = await pool.request().query(`SELECT 1 FROM sys.tables WHERE name = '${target.table}'`);
      if (tableCheck.recordset.length === 0) continue;

      const cols = target.columns.join(', ');
      const rows = (await pool.request().query(`SELECT ${target.pk}, ${cols} FROM ${target.table}`)).recordset;

      for (const row of rows) {
        const pkVal = row[target.pk];
        const updates = [];
        const req = pool.request();
        req.input('pkVal', pkVal);

        for (const col of target.columns) {
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
          const updateSql = `UPDATE ${target.table} SET ${updates.join(', ')} WHERE ${target.pk} = @pkVal`;
          await req.query(updateSql);
          totalUpdated++;
          console.log(`[${target.table}] Fixed row #${pkVal} (${updates.length} columns)`);
        }
      }
    } catch (tblErr) {
      console.warn(`Warning processing table ${target.table}:`, tblErr.message);
    }
  }

  console.log(`\n🎉 Mojibake auto-fix complete! Total rows updated: ${totalUpdated}`);
  await pool.close();
}

if (require.main === module) {
  run().catch(console.error);
}

module.exports = { fixMojibake, sanitizeMojibake, run };
