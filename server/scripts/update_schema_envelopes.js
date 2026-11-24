const { connectDb, query } = require('../config/db');

async function run() {
  console.log('Connecting to database...');
  await connectDb();
  console.log('Connected!');

  // 1. Tenders columns
  await query(`
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Tenders') AND name = 'SubmittalType')
      ALTER TABLE Tenders ADD SubmittalType NVARCHAR(50) DEFAULT N'مظروف واحد';
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Tenders') AND name = 'TechnicalEvaluationMethod')
      ALTER TABLE Tenders ADD TechnicalEvaluationMethod NVARCHAR(100) DEFAULT N'مطابق أو غير مطابق';
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Tenders') AND name = 'MinPassingScore')
      ALTER TABLE Tenders ADD MinPassingScore DECIMAL(5,2) DEFAULT 70;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Tenders') AND name = 'OpeningSessionType')
      ALTER TABLE Tenders ADD OpeningSessionType NVARCHAR(50) DEFAULT N'فني';
  `);
  console.log('Tenders columns verified');

  // 2. BidSubmissions columns
  await query(`
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('BidSubmissions') AND name = 'EnvelopeStage')
      ALTER TABLE BidSubmissions ADD EnvelopeStage NVARCHAR(50) DEFAULT N'فني';
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('BidSubmissions') AND name = 'FinancialEnvelopeOpened')
      ALTER TABLE BidSubmissions ADD FinancialEnvelopeOpened BIT DEFAULT 0;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('BidSubmissions') AND name = 'TechnicalNotes')
      ALTER TABLE BidSubmissions ADD TechnicalNotes NVARCHAR(MAX) NULL;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('BidSubmissions') AND name = 'FinancialNotes')
      ALTER TABLE BidSubmissions ADD FinancialNotes NVARCHAR(MAX) NULL;
  `);
  console.log('BidSubmissions columns verified');

  // 3. BidItems columns
  await query(`
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
  console.log('BidItems columns verified');

  // Sync SubmittalType and TechnicalEvaluationMethod from NeedsRequests to Tenders where null
  await query(`
    UPDATE T
    SET T.SubmittalType = ISNULL(T.SubmittalType, ISNULL(N.SubmittalType, N'مظروف واحد')),
        T.TechnicalEvaluationMethod = ISNULL(T.TechnicalEvaluationMethod, ISNULL(N.TechnicalEvaluationMethod, N'مطابق أو غير مطابق')),
        T.MinPassingScore = ISNULL(T.MinPassingScore, ISNULL(N.MinPassingScore, 70))
    FROM Tenders T
    JOIN NeedsRequests N ON T.RequestId = N.RequestId;
  `);
  console.log('Sync from NeedsRequests complete');

  // Also check if any TenderItems need default ItemCriteria if empty and method is نظام نقاط
  console.log('Done!');
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
