const sql = require('mssql');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let isSqlServerConnected = false;
let sqliteDb = null;

// SQL Server Configuration
const mssqlConfig = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '1',
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_NAME || 'ProcurementDB',
  connectionTimeout: 1500,
  requestTimeout: 1500,
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

// Initialize SQLite Fallback Storage
function initSqliteFallback() {
  const dbPath = path.join(__dirname, '..', 'procurement_local.db');
  sqliteDb = new Database(dbPath);
  sqliteDb.pragma('journal_mode = WAL');

  // Create SQLite tables mirroring enhanced SQL Server schema
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS Users (
      UserId INTEGER PRIMARY KEY AUTOINCREMENT,
      Username TEXT UNIQUE,
      PasswordHash TEXT,
      FullName TEXT,
      Role TEXT,
      Department TEXT,
      CreatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      IsActive INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS SupplyCategories (
      CategoryId INTEGER PRIMARY KEY,
      CategoryName TEXT
    );

    CREATE TABLE IF NOT EXISTS Vendors (
      VendorId INTEGER PRIMARY KEY AUTOINCREMENT,
      CompanyName TEXT NOT NULL,
      VendorType TEXT DEFAULT 'مورد',
      LegalEntity TEXT DEFAULT 'أفراد',
      CompanyType TEXT DEFAULT 'أفراد',
      Address TEXT,
      Phone TEXT,
      Fax TEXT,
      Email TEXT,
      TaxCardNo TEXT UNIQUE,
      TaxCardExpiry TEXT,
      CommercialRegisterNo TEXT UNIQUE,
      CommercialRegisterExpiry TEXT,
      CategoryGroup TEXT,
      ConstructionGrade TEXT,
      ConstructionBranch TEXT,
      IsRegistered INTEGER DEFAULT 1,
      HasPreviousWorks INTEGER DEFAULT 1,
      IsBlacklisted INTEGER DEFAULT 0,
      BlacklistReason TEXT,
      BlacklistAuthority TEXT,
      BlacklistDate TEXT,
      UnblacklistedReason TEXT,
      UnblacklistedAuthority TEXT,
      UnblacklistedDate TEXT,
      IsDeleted INTEGER DEFAULT 0,
      CreatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS NeedsRequests (
      RequestId INTEGER PRIMARY KEY AUTOINCREMENT,
      OperationName TEXT,
      OperationType TEXT,
      EstimatedValue REAL,
      RequestingDepartment TEXT,
      BudgetHoldReference TEXT,
      ExecutionDuration TEXT,
      FiscalYear TEXT,
      ReservationType TEXT,
      InitialReservation REAL,
      ApprovalAuthorityDate TEXT,
      SubmittalType TEXT,
      WarehouseBalance TEXT,
      ConstructionBranch TEXT,
      RequiredGrade TEXT,
      Status TEXT DEFAULT 'معلق',
      IsDeleted INTEGER DEFAULT 0,
      CreatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS Tenders (
      TenderId INTEGER PRIMARY KEY AUTOINCREMENT,
      RequestId INTEGER,
      TenderNumber TEXT UNIQUE,
      TenderSymbol TEXT,
      TenderName TEXT,
      TenderMethod TEXT,
      RequestingDepartment TEXT,
      BudgetHoldReference TEXT,
      FiscalYear TEXT,
      BaseBookletPrice REAL,
      CalculatedBookletPrice REAL,
      InitialGuaranteeAmount REAL,
      EnvelopeOpeningDate TEXT,
      AdNewspaper1 TEXT,
      AdNewspaper2 TEXT,
      AdPublishDate TEXT,
      AdDetails TEXT,
      EvaluationMethod TEXT DEFAULT 'تقرير فني',
      PassingScoreDecimal REAL,
      RequiresSample INTEGER DEFAULT 0,
      SampleDetails TEXT,
      Status TEXT DEFAULT 'نشط',
      IsDeleted INTEGER DEFAULT 0,
      CreatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS TenderItems (
      ItemId INTEGER PRIMARY KEY AUTOINCREMENT,
      TenderId INTEGER,
      ItemNumber INTEGER,
      ItemDescription TEXT NOT NULL,
      Unit TEXT NOT NULL,
      EstimatedQuantity REAL NOT NULL,
      EstimatedUnitPrice REAL NOT NULL,
      EstimatedTotalPrice REAL NOT NULL,
      Notes TEXT
    );

    CREATE TABLE IF NOT EXISTS BidSubmissions (
      SubmissionId INTEGER PRIMARY KEY AUTOINCREMENT,
      TenderId INTEGER,
      VendorId INTEGER,
      BidFractionSerial TEXT,
      SubmissionDate TEXT DEFAULT CURRENT_TIMESTAMP,
      InitialInsuranceAmount REAL,
      GuaranteePaymentMethod TEXT,
      InitialInsuranceStatus TEXT DEFAULT 'ساري',
      ReceiptNumber TEXT,
      ReceiptDate TEXT,
      CheckNumber TEXT,
      BankName TEXT,
      CheckDate TEXT,
      GuaranteeLetterNo TEXT,
      GuaranteeLetterIssueDate TEXT,
      GuaranteeLetterExpiryDate TEXT,
      DeductionNoteNo TEXT,
      DeductionNoteDate TEXT,
      DeductionEntity TEXT,
      HasCommercialRegister INTEGER DEFAULT 0,
      CommercialRegisterNo TEXT,
      CommercialRegisterValidUntil TEXT,
      HasTaxCard INTEGER DEFAULT 0,
      TaxCardNo TEXT,
      TaxCardValidUntil TEXT,
      HasFederationCert INTEGER DEFAULT 0,
      FederationGrade TEXT,
      HasEInvoiceModel INTEGER DEFAULT 0,
      HasAdvancePaymentCert INTEGER DEFAULT 0,
      HasPreviousWorks INTEGER DEFAULT 0,
      HasVATCert INTEGER DEFAULT 0,
      HasCatalog INTEGER DEFAULT 0,
      HasCert14S INTEGER DEFAULT 0,
      HasCert4S INTEGER DEFAULT 0,
      HasApprovalCert INTEGER DEFAULT 0,
      SampleSubmitted INTEGER DEFAULT 0,
      SampleNumber TEXT,
      SampleDeliveryDate TEXT,
      SampleNotes TEXT,
      TechnicalStatus TEXT DEFAULT 'تحت التقييم',
      TechnicalScore REAL,
      FinancialTotalAmount REAL DEFAULT 0,
      FinalRank INTEGER,
      IsDeleted INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS BidItems (
      BidItemId INTEGER PRIMARY KEY AUTOINCREMENT,
      SubmissionId INTEGER,
      TenderItemId INTEGER,
      ItemName TEXT,
      UnitType TEXT,
      Quantity REAL,
      UnitPrice REAL,
      TotalPrice REAL,
      TechnicalEvaluation TEXT DEFAULT 'مقبول أساسي',
      Notes TEXT
    );

    CREATE TABLE IF NOT EXISTS Awardings (
      AwardingId INTEGER PRIMARY KEY AUTOINCREMENT,
      TenderId INTEGER,
      WinnerSubmissionId INTEGER,
      VendorId INTEGER,
      AwardedAmount REAL,
      AwardedAmountTafqeet TEXT,
      AuthorityApprovalDate TEXT,
      ReservationConfirmDate TEXT,
      BudgetSource TEXT,
      FinalGuaranteeAmount REAL,
      FinalGuaranteeTafqeet TEXT,
      FinalGuaranteeStatus TEXT DEFAULT 'قيد السداد',
      FinalGuaranteePaymentMethod TEXT,
      ContractSigningDeadline TEXT,
      EngineeringStamp REAL DEFAULT 0,
      AppliedStamp REAL DEFAULT 0,
      DevelopmentStamp REAL DEFAULT 0,
      ExtensionStamp REAL DEFAULT 0,
      FederationFee REAL DEFAULT 0,
      ShaheedStamp REAL DEFAULT 5,
      TahyaMisrFund REAL DEFAULT 0,
      PostalTransferFee REAL DEFAULT 0,
      TotalDeductions REAL DEFAULT 0,
      NetAwardAmount REAL DEFAULT 0,
      PurchaseOrderNo TEXT UNIQUE,
      PurchaseOrderDate TEXT,
      JournalDirectiveNo TEXT UNIQUE,
      JournalDirectiveDate TEXT,
      CreatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS FinancialTransactions (
      TransactionId INTEGER PRIMARY KEY AUTOINCREMENT,
      TenderId INTEGER,
      VendorId INTEGER,
      TransactionType TEXT NOT NULL,
      DebitAccountCode TEXT NOT NULL,
      DebitAccountName TEXT NOT NULL,
      CreditAccountCode TEXT NOT NULL,
      CreditAccountName TEXT NOT NULL,
      Amount REAL NOT NULL,
      AmountTafqeet TEXT,
      VoucherNumber TEXT NOT NULL,
      TransactionDate TEXT DEFAULT CURRENT_TIMESTAMP,
      Notes TEXT,
      CreatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS DistributionDossiers (
      DossierId INTEGER PRIMARY KEY AUTOINCREMENT,
      TenderId INTEGER,
      TargetDepartment TEXT NOT NULL,
      DispatchReference TEXT NOT NULL,
      DispatchDate TEXT DEFAULT CURRENT_TIMESTAMP,
      IncludedDocuments TEXT,
      ReceiptAcknowledged INTEGER DEFAULT 0,
      ReceiptDate TEXT,
      ReceivedBy TEXT,
      Notes TEXT
    );

    CREATE TABLE IF NOT EXISTS ArchivedItems (
      ArchiveId INTEGER PRIMARY KEY AUTOINCREMENT,
      EntityType TEXT NOT NULL,
      EntityId INTEGER NOT NULL,
      EntityName TEXT NOT NULL,
      EntityData TEXT,
      DeletedBy TEXT NOT NULL,
      DeletedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      DeletionReason TEXT,
      IsRestored INTEGER DEFAULT 0,
      RestoredBy TEXT,
      RestoredAt TEXT
    );

    CREATE TABLE IF NOT EXISTS AuditLogs (
      LogId INTEGER PRIMARY KEY AUTOINCREMENT,
      UserId INTEGER,
      Username TEXT,
      UserRole TEXT,
      Action TEXT,
      EntityName TEXT,
      EntityId TEXT,
      Details TEXT,
      IpAddress TEXT,
      Timestamp TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS WarehouseInventory (
      ProductId INTEGER PRIMARY KEY AUTOINCREMENT,
      ProductName TEXT NOT NULL,
      ProductCode TEXT UNIQUE,
      CategoryId INTEGER,
      Unit TEXT DEFAULT 'عدد',
      CurrentStock REAL DEFAULT 0,
      MinimumStock REAL DEFAULT 0,
      Location TEXT,
      IsActive INTEGER DEFAULT 1,
      CreatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS WarehouseInquiries (
      InquiryId INTEGER PRIMARY KEY AUTOINCREMENT,
      RequestId INTEGER,
      InquiryText TEXT,
      SentAt TEXT DEFAULT CURRENT_TIMESTAMP,
      ResponseText TEXT,
      ResponseStatus TEXT DEFAULT 'في انتظار الرد',
      RespondedAt TEXT,
      RespondedBy TEXT
    );

    CREATE TABLE IF NOT EXISTS ContractorGroups (
      GroupId INTEGER PRIMARY KEY AUTOINCREMENT,
      GroupName TEXT NOT NULL,
      GroupDescription TEXT,
      WorkScope TEXT,
      IsActive INTEGER DEFAULT 1,
      CreatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ContractorGroupMembers (
      MemberId INTEGER PRIMARY KEY AUTOINCREMENT,
      GroupId INTEGER,
      VendorId INTEGER,
      IsFederationMember INTEGER DEFAULT 0,
      Certificates TEXT,
      Notes TEXT,
      AddedAt TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migrate any missing columns if existing SQLite DB was created prior
  const migrations = [
    { table: 'Vendors', column: 'VendorType TEXT DEFAULT "مورد"' },
    { table: 'Vendors', column: 'LegalEntity TEXT DEFAULT "أفراد"' },
    { table: 'Vendors', column: 'CategoryGroup TEXT' },
    { table: 'Vendors', column: 'CommercialRegisterNo TEXT' },
    { table: 'Vendors', column: 'CommercialRegisterExpiry TEXT' },
    { table: 'NeedsRequests', column: 'BudgetHoldReference TEXT' },
    { table: 'Tenders', column: 'BudgetHoldReference TEXT' },
    { table: 'Tenders', column: 'TenderName TEXT' },
    { table: 'Awardings', column: 'AwardDate TEXT' },
    { table: 'Awardings', column: 'AwardedAmountTafqeet TEXT' },
    { table: 'Awardings', column: 'FinalGuaranteeTafqeet TEXT' },
    { table: 'Awardings', column: 'FinalGuaranteeStatus TEXT DEFAULT "قيد السداد"' },
    { table: 'Awardings', column: 'ContractSigningDeadline TEXT' },
    { table: 'Awardings', column: 'NetAwardAmount REAL DEFAULT 0' },
    { table: 'Awardings', column: 'VendorId INTEGER' },
    { table: 'BidSubmissions', column: 'InitialInsuranceAmount REAL' },
    { table: 'BidSubmissions', column: 'InitialInsuranceStatus TEXT DEFAULT "ساري"' },
    // NeedsRequests new columns
    { table: 'NeedsRequests', column: 'SpecsAndConditions TEXT' },
    { table: 'NeedsRequests', column: 'RequiresSample INTEGER DEFAULT 0' },
    { table: 'NeedsRequests', column: 'SampleDetails TEXT' },
    { table: 'NeedsRequests', column: 'WarehouseQuerySent INTEGER DEFAULT 0' },
    { table: 'NeedsRequests', column: 'WarehouseQueryResponse TEXT' },
    { table: 'NeedsRequests', column: 'WarehouseQueryResponseDate TEXT' },
    { table: 'NeedsRequests', column: 'FinancialOperationNumber TEXT' },
    { table: 'NeedsRequests', column: 'FinancialOperationSymbol TEXT' },
    { table: 'NeedsRequests', column: 'TenderMethodSelected TEXT' },
    { table: 'NeedsRequests', column: 'PreliminaryReservation REAL' },
    { table: 'NeedsRequests', column: 'ReservationTypeNew TEXT' },
    { table: 'NeedsRequests', column: 'BookletPrice REAL' },
    { table: 'NeedsRequests', column: 'OperationTerms TEXT' },
    { table: 'NeedsRequests', column: 'ConstructionDivision TEXT' },
    { table: 'NeedsRequests', column: 'ConstructionCategory TEXT' },
    { table: 'NeedsRequests', column: 'ApprovalAuthority TEXT' },
    { table: 'NeedsRequests', column: "AuthorityApprovalStatus TEXT DEFAULT 'في انتظار الموافقة'" },
    { table: 'NeedsRequests', column: 'AuthorityApprovalDate TEXT' },
    { table: 'NeedsRequests', column: 'AuthorityRejectionReason TEXT' },
    { table: 'NeedsRequests', column: "WorkflowStatus TEXT DEFAULT 'طلب جديد'" },
    { table: 'NeedsRequests', column: 'InitialGuaranteePercent REAL DEFAULT 2' },
    { table: 'NeedsRequests', column: 'OperationItems TEXT' },
    { table: 'NeedsRequests', column: 'FinancialNotes TEXT' },
    { table: 'NeedsRequests', column: 'FinancialReviewedAt TEXT' },
    { table: 'NeedsRequests', column: 'FinancialReviewedBy TEXT' },
    { table: 'NeedsRequests', column: 'AuthorityReviewedAt TEXT' },
    { table: 'NeedsRequests', column: 'AuthorityReviewedBy TEXT' },
    // SubFileDistribution columns on Tenders
    { table: 'Tenders', column: 'HasSubFileDistribution INTEGER DEFAULT 0' },
    { table: 'Tenders', column: 'SubFileDistributionId INTEGER' },
  ];

  for (const m of migrations) {
    try {
      sqliteDb.exec(`ALTER TABLE ${m.table} ADD COLUMN ${m.column};`);
    } catch (e) {
      // Column likely already exists
    }
  }

  // Seed default multi-role users if empty
  const userCount = sqliteDb.prepare("SELECT COUNT(*) as count FROM Users").get();
  if (userCount.count === 0) {
    const insertUser = sqliteDb.prepare(`
      INSERT INTO Users (Username, PasswordHash, FullName, Role, Department)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const pwdHash = '$2a$10$HoojbN3OWw1rZzg3CBAJdO6EXIAhGhfQSW.1PmTb6GVN6OE36m/xS'; // password '1'
    
    insertUser.run('sa', pwdHash, 'المشرف العام (Super Admin)', 'Admin', 'الإدارة العليا');
    insertUser.run('tenders_user', pwdHash, 'أحمد سعيد (مسؤول الطرح)', 'TenderOfficer', 'إدارة الطرح والمواصفات');
    insertUser.run('committee_user', pwdHash, 'م. محمود رضوان (لجنة البت)', 'CommitteeMember', 'لجنة البت الفني والمالي');
    insertUser.run('finance_user', pwdHash, 'أشرف جلال (المراجع المالي)', 'FinancialAuditor', 'إدارة الشئون المالية');
    insertUser.run('vendor_user', pwdHash, 'منى خليل (مسؤول الموردين)', 'VendorManager', 'إدارة سجل الموردين والمقاولين');
    insertUser.run('security_user', pwdHash, 'كمال فاروق (المراجع الأمني)', 'Auditor', 'إدارة المتابعة والتفتيش');
  }

  // Seed Supply Categories if empty
  const catCount = sqliteDb.prepare("SELECT COUNT(*) as count FROM SupplyCategories").get();
  if (catCount.count === 0) {
    const categories = [
      "المواسير بأنوعها و البلوف و المحابس و القطع المخصوص", "الأغطيه الخرسانية", "برابخ الفخار", "أغطيه صلب",
      "السيارات بأنواعها", "قطع غيار السيارات النقل بأنواعها", "قطع غيار السيارات الركايب بأنواعها", "قطع غيار الأوناش",
      "مواد و مهمات و خامات لورش اللحام و الحداده و الجكمان", "مواد و مهمات و خامات لورش الخراطة و البراده",
      "مواد و مهمات و خامات و سيور لورش الكاوتشوك", "مواد و مهمات لورش النقش و الدوكو", "مواد و مهمات لورش السروجية",
      "قطع الغيار الميكانيكية لمحطات التنقية و المعالجة", "قطع الغيار الكهربائية لمحطات التنقية و المعالجة",
      "مواد و مهمات لورش سمكرة السيارات", "رولمان بلى", "مواد و مهمات لورش الردياتير", "مواد و مهمات لورش النجارة",
      "مواد و مهمات لورش الكهرباء لجميع انواع السيارات", "أجهزة و معدات الامن الصناعى و أجهزة الأطفاء",
      "مواد و مهمات الاسعاف", "الخراطيم و الكاوتشكوك و غيرها اللازمة لمعدات الصرف الصحى", "الطلمبات بأنوعها و قطع غيارها",
      "المولدات بأنوعها و قطع غيارها", "مواد و مهمات و أدوات البناء (طوب – رمل – زلط ...... إلخ)",
      "المهمات و الأدوات الكهربائية", "الأدوات و المهمات المكتبية", "أدوات النظافة", "إطارات كاوتشوك لجميع أنواع السيارات",
      "أجهزة المعامل و كيماويات", "قطع غيار المعامل و مواد و مهمات المعامل", "البطاريات لجميع أنواع السيارات",
      "ضواغط الهواء للمحطات", "أدوات الصيانة و الشبكة", "أسياخ التسليك الصلب", "أجهزة الفاكس", "أجهزة الحاسب الآلى",
      "مستلزمات الحاسب الآلى", "برامج إدارة المعلومات", "أجهزة اللاسلكى", "أجهزة السنترال", "إحتياجات الحدائق و التشجير",
      "مبيدات لمكافحة الحشرات", "مهمات و معاجين و دهانات", "المطبوعات", "التفتيش على التوريدات", "مغيرات السرعة للطلمبات بأنواعها",
      "بادئات التشغيل بأنوعها", "المشغلات الكهربائية للمحابس و البوابات", "الحاكمات المنطقية المبرمجة ( PLC )",
      "برامج إدارة و صيانة الأصول", "نظم تجميع البيانات و المراقبة و التحكم بالحاسب الآلى Scada",
      "كابلات الألياف الضوئية و مستلزماتها Fiberoptic", "الكارتات الالكترونية", "أجهزة الحماية و التحكم الالكترونية",
      "أجهزة القياس", "البرامج الخاصة ببرمجة الاجهزة الالكترونية Softwares", "أغطية GRP", "فلاتر بجميع أنواعها",
      "بلومير", "آلات تصوير و مستلزماتها", "زيوت و شحومات", "توريد مشتملات منظومة الطاقة الشمسية",
      "توريد تكييفات", "توريد معدات ثقيلة (لوادر – اوناش)"
    ];
    const insertCat = sqliteDb.prepare("INSERT INTO SupplyCategories (CategoryId, CategoryName) VALUES (?, ?)");
    categories.forEach((name, idx) => insertCat.run(idx + 1, name));
  }

  // Seed sample Vendors if empty
  const vendorCount = sqliteDb.prepare("SELECT COUNT(*) as count FROM Vendors").get();
  if (vendorCount.count === 0) {
    const insertVendor = sqliteDb.prepare(`
      INSERT INTO Vendors (
        CompanyName, VendorType, LegalEntity, Address, Phone, TaxCardNo, TaxCardExpiry,
        CommercialRegisterNo, CommercialRegisterExpiry, CategoryGroup, ConstructionGrade, ConstructionBranch,
        IsRegistered, HasPreviousWorks, IsBlacklisted, BlacklistReason, BlacklistAuthority, BlacklistDate
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertVendor.run('شركة الحمد للتجارة والتوريدات الفنية', 'مورد', 'شركة مساهمة', '11 ش الكهرمان الحضرة القبلية الاسكندرية', '01012345678', '100-200-300', '2027-12-31', 'CR-45120', '2027-12-31', 'المواسير بأنوعها و البلوف و المحابس', 'غير مجدول', null, 1, 1, 0, null, null, null);
    insertVendor.run('شركة الإسكندرية لمقاولات شبكات الصرف', 'مقاول', 'شركة مساهمة', 'ابراج الند مارك سموحة الاسكندرية', '01234567890', '102-202-302', '2028-06-30', 'CR-88210', '2028-06-30', 'أعمال المقاولات والإنشاءات', 'الأولى', 'شبكات المياه والصرف الصحي', 1, 1, 0, null, null, null);
    insertVendor.run('شركة الكينج للمعدات والخدمات البترولية', 'مؤدي خدمة', 'شركة ذات مسؤولية محدودة', 'العامرية ك 35 الطريق الصحراوى', '01123456789', '101-201-301', '2026-11-15', 'CR-77450', '2026-11-15', 'قطع غيار الأوناش والمعدات', 'الرابعة', 'الصيانة والمهمات', 1, 1, 0, null, null, null);
    insertVendor.run('شركة السماح للمقاولات العمومية', 'مقاول', 'شركة ذات مسؤولية محدودة', 'شارع النصر الاسكندرية', '01099988877', '103-203-303', '2024-01-10', 'CR-12003', '2024-01-10', 'أعمال الصيانة', 'السادسة', 'أعمال الصيانة', 0, 0, 1, 'مخالفة كراسة الشروط والتأخر الجسيم في التنفيذ', 'مجلس الإدارة', '2024-05-15');
  }

  // Seed Warehouse Inventory if empty
  const warehouseCount = sqliteDb.prepare("SELECT COUNT(*) as count FROM WarehouseInventory").get();
  if (warehouseCount.count === 0) {
    const insertProduct = sqliteDb.prepare(`
      INSERT INTO WarehouseInventory (ProductName, ProductCode, Unit, CurrentStock, MinimumStock, Location)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertProduct.run('مواسير PVC قطر 150مم', 'PIPE-PVC-150', 'متر', 500, 100, 'مخزن رقم 1');
    insertProduct.run('صمامات بوابة 6 بوصة', 'VLV-GATE-6', 'عدد', 25, 5, 'مخزن رقم 2');
    insertProduct.run('مضخة طرد مركزي 10HP', 'PUMP-CF-10', 'عدد', 3, 1, 'مخزن رقم 3');
    insertProduct.run('كابل كهربائي 50مم2', 'CABLE-50', 'متر', 200, 50, 'مخزن رقم 4');
    insertProduct.run('زيت هيدروليك ISO 46', 'OIL-HYD-46', 'لتر', 150, 30, 'مخزن رقم 5');
    insertProduct.run('مفتاح كهربائي 3 فاز 100A', 'SW-3P-100', 'عدد', 10, 2, 'مخزن رقم 2');
    insertProduct.run('أنابيب GRP قطر 300مم', 'PIPE-GRP-300', 'متر', 80, 20, 'المخزن الخارجي');
    insertProduct.run('قواعد توزيع كهربائي لوحة 24 خط', 'PANEL-24', 'عدد', 2, 1, 'مخزن رقم 2');
  }

  // Seed ContractorGroups if empty (9 groups)
  const cgCount = sqliteDb.prepare("SELECT COUNT(*) as count FROM ContractorGroups").get();
  if (cgCount.count === 0) {
    const insertGroup = sqliteDb.prepare(`
      INSERT INTO ContractorGroups (GroupName, GroupDescription, WorkScope) VALUES (?, ?, ?)
    `);
    insertGroup.run('أعمال البناء والتشييد العامة', 'مجموعة أعمال البناء والإنشاء العام', 'بناء وتشييد المباني والمنشآت العامة');
    insertGroup.run('شبكات المياه والصرف الصحي', 'مجموعة شبكات المياه ومحطات المعالجة', 'مد وإصلاح شبكات المياه والصرف وأعمال محطات المعالجة');
    insertGroup.run('الأعمال الكهربائية', 'مجموعة المقاولين الكهربائيين', 'أعمال الكهرباء والتمديدات والمحطات الكهربائية');
    insertGroup.run('الأعمال الميكانيكية', 'مجموعة المقاولين الميكانيكيين', 'تركيب وصيانة الماكينات والمضخات والمعدات الميكانيكية');
    insertGroup.run('الطرق والبنية التحتية', 'مجموعة أعمال الطرق والبنية التحتية', 'إنشاء وإصلاح الطرق والأرصفة والبنية التحتية');
    insertGroup.run('الأعمال المعمارية والتشطيبات', 'مجموعة أعمال التشطيبات الداخلية والخارجية', 'أعمال الدهانات والسيراميك والأعمال المعمارية');
    insertGroup.run('الأعمال المدنية والجسور', 'مجموعة المقاولين المدنيين', 'إنشاء الكباري والجسور والأعمال المدنية الكبرى');
    insertGroup.run('أعمال الحراسة والأمن', 'مجموعة شركات الحراسة والأمن الصناعي', 'تقديم خدمات الحراسة والأمن والسلامة الصناعية');
    insertGroup.run('الخدمات والصيانة العامة', 'مجموعة شركات الخدمات والصيانة المتنوعة', 'تقديم خدمات الصيانة والنظافة وأعمال الخدمات العامة');
  }

  // SubFileDistribution tables
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS SubFileDistributions (
      DistributionId INTEGER PRIMARY KEY AUTOINCREMENT,
      TenderId INTEGER,
      RequestId INTEGER,
      OperationName TEXT,
      OperationType TEXT,
      OperationNumber TEXT,
      IssuedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      IssuedBy TEXT,
      Status TEXT DEFAULT 'مُصدر',
      HasFinalGuaranteeReceipt INTEGER DEFAULT 0,
      FinalGuaranteeReceipt TEXT,
      FinalGuaranteeReceivedAt TEXT,
      HasWarehouseAddition INTEGER DEFAULT 0,
      WarehouseAdditionNo TEXT,
      WarehouseAdditionDate TEXT,
      Notes TEXT,
      DocumentsPackage TEXT
    );

    CREATE TABLE IF NOT EXISTS SubFileDeliveries (
      DeliveryId INTEGER PRIMARY KEY AUTOINCREMENT,
      DistributionId INTEGER NOT NULL,
      DeliveryTarget TEXT NOT NULL,
      DeliveryForm TEXT,
      DeliveredAt TEXT DEFAULT CURRENT_TIMESTAMP,
      ReceivedBy TEXT,
      Status TEXT DEFAULT 'مُسلَّم',
      NotificationSent INTEGER DEFAULT 0,
      FOREIGN KEY (DistributionId) REFERENCES SubFileDistributions(DistributionId)
    );

    CREATE TABLE IF NOT EXISTS SubFileNotifications (
      NotificationId INTEGER PRIMARY KEY AUTOINCREMENT,
      DistributionId INTEGER NOT NULL,
      NotificationType TEXT,
      TargetDepartment TEXT,
      Message TEXT,
      SentAt TEXT DEFAULT CURRENT_TIMESTAMP,
      IsRead INTEGER DEFAULT 0,
      FOREIGN KEY (DistributionId) REFERENCES SubFileDistributions(DistributionId)
    );
  `);

  // GuaranteeTransactions table for accounting entries & guarantees
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS GuaranteeTransactions (
      GuaranteeTransactionId INTEGER PRIMARY KEY AUTOINCREMENT,
      TenderId INTEGER NOT NULL,
      VendorId INTEGER NOT NULL,
      SubmissionId INTEGER,
      TransactionType TEXT NOT NULL,
      OriginalAmount REAL DEFAULT 0,
      DeductedStamps REAL DEFAULT 0,
      DeductedAdminFees REAL DEFAULT 0,
      NetRefundAmount REAL DEFAULT 0,
      ConvertedToFinal INTEGER DEFAULT 0,
      FinalGuaranteeAmount REAL DEFAULT 0,
      AccountingEntryId INTEGER,
      VoucherNumber TEXT,
      Status TEXT DEFAULT 'معلق',
      ProcessedAt TEXT,
      ProcessedBy TEXT,
      Notes TEXT,
      CreatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (TenderId) REFERENCES Tenders(TenderId),
      FOREIGN KEY (VendorId) REFERENCES Vendors(VendorId)
    );
  `);

  console.log('✅ SQLite Local Database initialized with multi-role users & ready at: ' + dbPath);
}

// Connect to Database (Tries MSSQL first, falls back to SQLite)
async function connectDb() {
  try {
    await sql.connect(mssqlConfig);
    isSqlServerConnected = true;
    console.log('🚀 Connected to Microsoft SQL Server successfully!');
  } catch (err) {
    console.log('ℹ️ SQL Server connection not detected. Using SQLite Local Fallback Engine.');
    initSqliteFallback();
  }
}

// Generic Query Runner that abstracts SQL Server vs SQLite
async function query(sqlQuery, params = {}) {
  if (isSqlServerConnected) {
    const request = new sql.Request();
    Object.keys(params).forEach(key => {
      request.input(key, params[key]);
    });
    const result = await request.query(sqlQuery);
    return result.recordset;
  } else {
    let paramValues = [];
    // Convert N'string' literal to 'string' literal for SQLite compatibility
    let transformedQuery = sqlQuery.replace(/N'([^']*)'/g, "'$1'");
    transformedQuery = transformedQuery.replace(/@(\w+)/g, (match, paramName) => {
      paramValues.push(params[paramName] !== undefined ? params[paramName] : null);
      return '?';
    });

    const isSelect = transformedQuery.trim().toUpperCase().startsWith('SELECT');
    if (isSelect) {
      return sqliteDb.prepare(transformedQuery).all(...paramValues);
    } else {
      const info = sqliteDb.prepare(transformedQuery).run(...paramValues);
      return { lastID: info.lastInsertRowid, changes: info.changes };
    }
  }
}

module.exports = {
  connectDb,
  query,
  sql
};
