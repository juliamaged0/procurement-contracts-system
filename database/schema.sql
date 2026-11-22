-- ============================================================================
-- SQL Server Database Schema for Procurement & Contracts Management System
-- منظومة الدورة المستندية للإدارة العامة للعقود والمشتريات - شركة الصرف الصحي بالإسكندرية (ASDCO)
-- Design & Verification for: Vendors Registry, Tenders Master/Items, Evaluation,
-- Awarding, Financial Journal Entries, Distribution Logic & Government Reports
-- ============================================================================

IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'ProcurementDB')
BEGIN
    CREATE DATABASE ProcurementDB;
END
GO

USE ProcurementDB;
GO

-- ============================================================================
-- 1. USERS & ROLES
-- ============================================================================
IF OBJECT_ID('Users', 'U') IS NOT NULL DROP TABLE Users;
CREATE TABLE Users (
    UserId INT IDENTITY(1,1) PRIMARY KEY,
    Username NVARCHAR(50) NOT NULL UNIQUE,
    PasswordHash NVARCHAR(255) NOT NULL,
    FullName NVARCHAR(100) NOT NULL,
    Role NVARCHAR(50) NOT NULL CHECK (Role IN ('Admin', 'TenderOfficer', 'CommitteeMember', 'FinancialAuditor', 'VendorManager', 'Auditor')),
    Department NVARCHAR(100) DEFAULT N'الإدارة العامة للعقود والمشتريات',
    CreatedAt DATETIME DEFAULT GETDATE(),
    IsActive BIT DEFAULT 1
);

-- ============================================================================
-- 2. VENDOR CATEGORIES (66 Supply Categories)
-- ============================================================================
IF OBJECT_ID('SupplyCategories', 'U') IS NOT NULL DROP TABLE SupplyCategories;
CREATE TABLE SupplyCategories (
    CategoryId INT PRIMARY KEY,
    CategoryName NVARCHAR(200) NOT NULL
);

-- ============================================================================
-- 3. VENDOR & CONTRACTOR REGISTRY & BLACKLIST (جدول الشركات والموردين والمقاولين)
-- ============================================================================
IF OBJECT_ID('Vendors', 'U') IS NOT NULL DROP TABLE Vendors;
CREATE TABLE Vendors (
    VendorId INT IDENTITY(1,1) PRIMARY KEY,
    CompanyName NVARCHAR(200) NOT NULL, -- Vendor_Name
    VendorType NVARCHAR(50) NOT NULL DEFAULT N'مورد' CHECK (VendorType IN (N'مورد', N'مقاول', N'مؤدي خدمة')),
    LegalEntity NVARCHAR(50) DEFAULT N'أفراد' CHECK (LegalEntity IN (N'أفراد', N'شركة تضامن', N'شركة مساهمة', N'شركة ذات مسؤولية محدودة', N'جهة أخرى')),
    Address NVARCHAR(300),
    Phone NVARCHAR(50),
    Fax NVARCHAR(50),
    Email NVARCHAR(100),
    TaxCardNo NVARCHAR(50) NOT NULL UNIQUE, -- Tax_Card_Number (Unique Constraint)
    TaxCardExpiry DATE,
    CommercialRegisterNo NVARCHAR(50) NOT NULL UNIQUE, -- Commercial_Register_Number (Unique Constraint)
    CommercialRegisterExpiry DATE,
    CategoryGroup NVARCHAR(200), -- المجموعة السلعية / التصنيف
    ConstructionGrade NVARCHAR(50) CHECK (ConstructionGrade IN (N'الأولى', N'الثانية', N'الثالثة', N'الرابعة', N'الخامسة', N'السادسة', N'السابعة', N'غير مجدول')),
    ConstructionBranch NVARCHAR(100), -- الشعبة التخصصية (أعمال الصرف الصحي، الأعمال المدنية، إلخ)
    IsRegistered BIT DEFAULT 1,
    HasPreviousWorks BIT DEFAULT 1,
    
    -- Blacklist Management (سجل الشطب والممنوعين من التعامل)
    IsBlacklisted BIT DEFAULT 0,
    BlacklistReason NVARCHAR(500),
    BlacklistAuthority NVARCHAR(200),
    BlacklistDate DATE,
    
    -- Unblacklist / Rehabilitation Tracking (إلغاء الشطب وإحياء السجل)
    UnblacklistedReason NVARCHAR(500),
    UnblacklistedAuthority NVARCHAR(200),
    UnblacklistedDate DATE,
    
    IsDeleted BIT DEFAULT 0,
    CreatedAt DATETIME DEFAULT GETDATE()
);

-- Indexing for fast search and unique integrity
CREATE NONCLUSTERED INDEX IX_Vendors_TaxCard ON Vendors(TaxCardNo);
CREATE NONCLUSTERED INDEX IX_Vendors_CommercialRegister ON Vendors(CommercialRegisterNo);

-- Vendor Category Mapping
IF OBJECT_ID('VendorSupplyCategories', 'U') IS NOT NULL DROP TABLE VendorSupplyCategories;
CREATE TABLE VendorSupplyCategories (
    VendorId INT FOREIGN KEY REFERENCES Vendors(VendorId) ON DELETE CASCADE,
    CategoryId INT FOREIGN KEY REFERENCES SupplyCategories(CategoryId) ON DELETE CASCADE,
    PRIMARY KEY (VendorId, CategoryId)
);

-- ============================================================================
-- 4. NEEDS REQUESTS (طلبات الاحتياج ومذكرات الحجز المالي)
-- ============================================================================
IF OBJECT_ID('NeedsRequests', 'U') IS NOT NULL DROP TABLE NeedsRequests;
CREATE TABLE NeedsRequests (
    RequestId INT IDENTITY(1,1) PRIMARY KEY,
    OperationName NVARCHAR(300) NOT NULL,
    OperationType NVARCHAR(50) NOT NULL CHECK (OperationType IN (N'تعاقدات', N'توريدات', N'مزادات')),
    EstimatedValue DECIMAL(18,2) NOT NULL,
    RequestingDepartment NVARCHAR(200) NOT NULL,
    BudgetHoldReference NVARCHAR(100), -- رقم مذكرة حجز المنطقة / الموازنة
    ExecutionDuration NVARCHAR(100),
    FiscalYear NVARCHAR(20) NOT NULL, -- e.g. 2025/2026
    ReservationType NVARCHAR(100) DEFAULT N'موازنة الشركة',
    InitialReservation DECIMAL(18,2),
    ApprovalAuthorityDate DATE,
    SubmittalType NVARCHAR(50) CHECK (SubmittalType IN (N'مظروف واحد', N'مظروفيين')),
    WarehouseBalance NVARCHAR(200),
    ConstructionBranch NVARCHAR(100),
    RequiredGrade NVARCHAR(50),
    Status NVARCHAR(50) DEFAULT N'معلق' CHECK (Status IN (N'معلق', N'مطروح', N'تم البت', N'مسند', N'مكتمل التوريد والتسليم', N'ملغى', N'مؤرشف')),
    IsDeleted BIT DEFAULT 0,
    CreatedAt DATETIME DEFAULT GETDATE()
);

-- ============================================================================
-- 5. TENDERS MASTER (جدول الطرح والعمليات)
-- ============================================================================
IF OBJECT_ID('Tenders', 'U') IS NOT NULL DROP TABLE Tenders;
CREATE TABLE Tenders (
    TenderId INT IDENTITY(1,1) PRIMARY KEY,
    RequestId INT FOREIGN KEY REFERENCES NeedsRequests(RequestId) ON DELETE SET NULL,
    TenderNumber NVARCHAR(50) NOT NULL UNIQUE, -- Serial format e.g. 1/2025/2026-هـ
    TenderSymbol NVARCHAR(10) NOT NULL, -- هـ, ت, ز, م ع, إلخ
    TenderName NVARCHAR(300), -- اسم وموضوع العملية
    TenderMethod NVARCHAR(50) NOT NULL CHECK (TenderMethod IN (
        N'مناقصة عامة', N'مناقصة محدودة', N'ممارسة عامة', N'ممارسة محدودة', N'ممارسة محلية', N'أمر مباشر',
        N'مزايدة عامة', N'مزايدة محدودة'
    )),
    RequestingDepartment NVARCHAR(200),
    BudgetHoldReference NVARCHAR(100), -- رقم مذكرة حجز الموازنة / المخطط العام
    FiscalYear NVARCHAR(20) NOT NULL,
    BaseBookletPrice DECIMAL(18,2) NOT NULL,
    CalculatedBookletPrice DECIMAL(18,2) NOT NULL,
    InitialGuaranteeAmount DECIMAL(18,2) NOT NULL,
    EnvelopeOpeningDate DATETIME NOT NULL,
    AdNewspaper1 NVARCHAR(100),
    AdNewspaper2 NVARCHAR(100),
    AdPublishDate DATE,
    AdDetails NVARCHAR(MAX),
    EvaluationMethod NVARCHAR(50) DEFAULT N'تقرير فني' CHECK (EvaluationMethod IN (N'تقرير فني', N'نظام النقاط')),
    PassingScoreDecimal DECIMAL(5,2),
    RequiresSample BIT DEFAULT 0,
    SampleDetails NVARCHAR(500),
    Status NVARCHAR(50) DEFAULT N'نشط' CHECK (Status IN (N'نشط', N'مفضوض المظاريف', N'مبتوت', N'مسند', N'مكتمل التوريد والتسليم', N'ملغى', N'مؤرشف')),
    IsDeleted BIT DEFAULT 0,
    CreatedAt DATETIME DEFAULT GETDATE()
);

-- ============================================================================
-- 6. TENDER ITEMS (جدول بنود الطرح والكميات التقديرية)
-- ============================================================================
IF OBJECT_ID('TenderItems', 'U') IS NOT NULL DROP TABLE TenderItems;
CREATE TABLE TenderItems (
    ItemId INT IDENTITY(1,1) PRIMARY KEY,
    TenderId INT NOT NULL FOREIGN KEY REFERENCES Tenders(TenderId) ON DELETE CASCADE,
    ItemNumber INT NOT NULL, -- مسلسل البند (1, 2, 3...)
    ItemDescription NVARCHAR(500) NOT NULL,
    Unit NVARCHAR(50) NOT NULL CHECK (Unit IN (N'طقم', N'عدد', N'متر', N'علبة', N'كيلو', N'طن', N'مقطوعية', N'لتر', N'باكت', N'متر مكعب', N'متر مسطح')),
    EstimatedQuantity DECIMAL(18,3) NOT NULL,
    EstimatedUnitPrice DECIMAL(18,2) NOT NULL,
    EstimatedTotalPrice AS (EstimatedQuantity * EstimatedUnitPrice) PERSISTED,
    Notes NVARCHAR(300)
);

-- ============================================================================
-- 7. BIDDER SUBMISSIONS (فض المظاريف وتقييم العطاءات)
-- ============================================================================
IF OBJECT_ID('BidSubmissions', 'U') IS NOT NULL DROP TABLE BidSubmissions;
CREATE TABLE BidSubmissions (
    SubmissionId INT IDENTITY(1,1) PRIMARY KEY,
    TenderId INT NOT NULL FOREIGN KEY REFERENCES Tenders(TenderId) ON DELETE CASCADE,
    VendorId INT NOT NULL FOREIGN KEY REFERENCES Vendors(VendorId),
    BidFractionSerial NVARCHAR(20) NOT NULL, -- e.g. 1/5, 2/5
    SubmissionDate DATETIME DEFAULT GETDATE(),
    
    -- Initial Guarantee Payment Details (التأمين الابتدائي)
    InitialInsuranceAmount DECIMAL(18,2),
    GuaranteePaymentMethod NVARCHAR(50) CHECK (GuaranteePaymentMethod IN (N'نقداً', N'خطاب ضمان', N'شيك', N'خصم من مستحقاته')),
    InitialInsuranceStatus NVARCHAR(50) DEFAULT N'ساري' CHECK (InitialInsuranceStatus IN (N'ساري', N'محول للنهائي', N'مردود للمناقص', N'مصادر')),
    ReceiptNumber NVARCHAR(50),
    ReceiptDate DATE,
    CheckNumber NVARCHAR(50),
    BankName NVARCHAR(100),
    CheckDate DATE,
    GuaranteeLetterNo NVARCHAR(50),
    GuaranteeLetterIssueDate DATE,
    GuaranteeLetterExpiryDate DATE,
    DeductionNoteNo NVARCHAR(50),
    DeductionNoteDate DATE,
    DeductionEntity NVARCHAR(200),
    
    -- Technical Envelope Checklist
    HasCommercialRegister BIT DEFAULT 0,
    CommercialRegisterNo NVARCHAR(50),
    CommercialRegisterValidUntil DATE,
    HasTaxCard BIT DEFAULT 0,
    TaxCardNo NVARCHAR(50),
    TaxCardValidUntil DATE,
    HasFederationCert BIT DEFAULT 0,
    FederationGrade NVARCHAR(50),
    HasEInvoiceModel BIT DEFAULT 0,
    HasAdvancePaymentCert BIT DEFAULT 0,
    HasPreviousWorks BIT DEFAULT 0,
    HasVATCert BIT DEFAULT 0,
    HasCatalog BIT DEFAULT 0,
    HasCert14S BIT DEFAULT 0,
    HasCert4S BIT DEFAULT 0,
    HasApprovalCert BIT DEFAULT 0,
    SampleSubmitted BIT DEFAULT 0,
    SampleNumber NVARCHAR(50),
    SampleDeliveryDate DATE,
    SampleNotes NVARCHAR(500),
    
    -- Technical & Financial Evaluation
    TechnicalStatus NVARCHAR(50) DEFAULT N'تحت التقييم' CHECK (TechnicalStatus IN (N'تحت التقييم', N'مقبول', N'مرفوض')),
    TechnicalScore DECIMAL(5,2),
    RejectionReason NVARCHAR(300),
    FinancialTotalAmount DECIMAL(18,2) DEFAULT 0,
    FinancialRank INT,
    IsDeleted BIT DEFAULT 0
);

-- ============================================================================
-- 8. BIDDER ITEMS PRICING (تفريغ المظروف المالي والأسعار المقترحة)
-- ============================================================================
IF OBJECT_ID('BidItems', 'U') IS NOT NULL DROP TABLE BidItems;
CREATE TABLE BidItems (
    BidItemId INT IDENTITY(1,1) PRIMARY KEY,
    SubmissionId INT NOT NULL FOREIGN KEY REFERENCES BidSubmissions(SubmissionId) ON DELETE CASCADE,
    TenderItemId INT FOREIGN KEY REFERENCES TenderItems(ItemId),
    ItemName NVARCHAR(300) NOT NULL,
    UnitType NVARCHAR(50) NOT NULL,
    Quantity DECIMAL(18,3) NOT NULL,
    QuotedUnitPrice DECIMAL(18,2) NOT NULL,
    TotalItemPrice AS (Quantity * QuotedUnitPrice) PERSISTED,
    TechnicalEvaluation NVARCHAR(100) DEFAULT N'مقبول أساسي',
    Notes NVARCHAR(300)
);

-- ============================================================================
-- 9. AWARD DECISIONS & ORDERS (جدول البت والترسية وأوامر التوريد)
-- ============================================================================
IF OBJECT_ID('Awardings', 'U') IS NOT NULL DROP TABLE Awardings;
CREATE TABLE Awardings (
    AwardingId INT IDENTITY(1,1) PRIMARY KEY,
    TenderId INT NOT NULL FOREIGN KEY REFERENCES Tenders(TenderId),
    WinnerSubmissionId INT NOT NULL FOREIGN KEY REFERENCES BidSubmissions(SubmissionId),
    VendorId INT NOT NULL FOREIGN KEY REFERENCES Vendors(VendorId),
    AwardDate DATE NOT NULL,
    AwardedAmount DECIMAL(18,2) NOT NULL,
    AwardedAmountTafqeet NVARCHAR(500), -- التفقيط باللغة العربية
    AuthorityApprovalDate DATE NOT NULL,
    ReservationConfirmDate DATE NOT NULL,
    BudgetSource NVARCHAR(50) CHECK (BudgetSource IN (N'موازنة الشركة', N'مخطط عام')),
    
    -- 5% Final Guarantee & 10 Days Deadline
    FinalGuaranteeAmount DECIMAL(18,2) NOT NULL, -- 5% of Awarded Amount
    FinalGuaranteeTafqeet NVARCHAR(500),
    FinalGuaranteeStatus NVARCHAR(50) DEFAULT N'قيد السداد' CHECK (FinalGuaranteeStatus IN (N'قيد السداد', N'مسدد', N'محول من الابتدائي')),
    ContractSigningDeadline DATE NOT NULL, -- AwardDate + 10 Days
    
    -- Stamp Duties & Fees Breakdown
    EngineeringStamp DECIMAL(18,2) DEFAULT 0,
    AppliedStamp DECIMAL(18,2) DEFAULT 0,
    DevelopmentStamp DECIMAL(18,2) DEFAULT 0,
    ExtensionStamp DECIMAL(18,2) DEFAULT 0,
    FederationFee DECIMAL(18,2) DEFAULT 0,
    ShaheedStamp DECIMAL(18,2) DEFAULT 5,
    TahyaMisrFund DECIMAL(18,2) DEFAULT 0,
    PostalTransferFee DECIMAL(18,2) DEFAULT 0,
    TotalDeductions AS (
        EngineeringStamp + AppliedStamp + DevelopmentStamp + ExtensionStamp +
        FederationFee + ShaheedStamp + TahyaMisrFund + PostalTransferFee
    ) PERSISTED,
    NetAwardAmount AS (
        AwardedAmount - (
            EngineeringStamp + AppliedStamp + DevelopmentStamp + ExtensionStamp +
            FederationFee + ShaheedStamp + TahyaMisrFund + PostalTransferFee
        )
    ) PERSISTED,
    
    PurchaseOrderNo NVARCHAR(50) UNIQUE, -- أمر التوريد
    PurchaseOrderDate DATE,
    JournalDirectiveNo NVARCHAR(50) UNIQUE, -- إذن التوجيه الحسابي
    JournalDirectiveDate DATE,
    CreatedAt DATETIME DEFAULT GETDATE()
);

-- ============================================================================
-- 10. FINANCIAL TRANSACTIONS & JOURNAL ENTRIES (جدول القيود المالية والتسويات)
-- ============================================================================
IF OBJECT_ID('FinancialTransactions', 'U') IS NOT NULL DROP TABLE FinancialTransactions;
CREATE TABLE FinancialTransactions (
    TransactionId INT IDENTITY(1,1) PRIMARY KEY,
    TenderId INT NOT NULL FOREIGN KEY REFERENCES Tenders(TenderId),
    VendorId INT NOT NULL FOREIGN KEY REFERENCES Vendors(VendorId),
    TransactionType NVARCHAR(100) NOT NULL CHECK (TransactionType IN (
        N'رد تأمين ابتدائي', N'تحويل تأمين نهائي', N'سداد تأمين نهائي', N'خصم استقطاعات ودمغات', N'صرف مستخلص'
    )),
    DebitAccountCode NVARCHAR(50) NOT NULL, -- e.g. 218401
    DebitAccountName NVARCHAR(200) NOT NULL, -- من حـ/ حسابات دائنة أخرى - تأمينات ابتدائية
    CreditAccountCode NVARCHAR(50) NOT NULL, -- e.g. 181001 / 218402
    CreditAccountName NVARCHAR(200) NOT NULL, -- إلى حـ/ البنوك الجارية أو تأمينات نهائية
    Amount DECIMAL(18,2) NOT NULL,
    AmountTafqeet NVARCHAR(500),
    VoucherNumber NVARCHAR(100) NOT NULL, -- رقم السند أو إذن التوجيه
    TransactionDate DATE DEFAULT GETDATE(),
    Notes NVARCHAR(500),
    CreatedAt DATETIME DEFAULT GETDATE()
);

-- ============================================================================
-- 11. DISTRIBUTION FILES & RECEIPT LOG (الملفات الفرعية وحوافظ التوزيع)
-- ============================================================================
IF OBJECT_ID('DistributionDossiers', 'U') IS NOT NULL DROP TABLE DistributionDossiers;
CREATE TABLE DistributionDossiers (
    DossierId INT IDENTITY(1,1) PRIMARY KEY,
    TenderId INT NOT NULL FOREIGN KEY REFERENCES Tenders(TenderId),
    TargetDepartment NVARCHAR(100) NOT NULL CHECK (TargetDepartment IN (
        N'الإدارة العامة للمخازن العامة',
        N'قطاع المشروعات',
        N'إدارة التنسيق الخارجي والتسويات المالية',
        N'إدارة الاحتياجات ومتابعة المخزون'
    )),
    DispatchReference NVARCHAR(100) NOT NULL,
    DispatchDate DATE DEFAULT GETDATE(),
    IncludedDocuments NVARCHAR(MAX), -- JSON or text list of attached official papers
    ReceiptAcknowledged BIT DEFAULT 0,
    ReceiptDate DATE,
    ReceivedBy NVARCHAR(100),
    Notes NVARCHAR(500)
);

-- ============================================================================
-- 12. AUDIT TRAIL & ARCHIVE REPOSITORY
-- ============================================================================
IF OBJECT_ID('ArchivedItems', 'U') IS NOT NULL DROP TABLE ArchivedItems;
CREATE TABLE ArchivedItems (
    ArchiveId INT IDENTITY(1,1) PRIMARY KEY,
    EntityType NVARCHAR(50) NOT NULL,
    EntityId INT NOT NULL,
    EntityName NVARCHAR(300) NOT NULL,
    EntityData NVARCHAR(MAX),
    DeletedBy NVARCHAR(50) NOT NULL,
    DeletedAt DATETIME DEFAULT GETDATE(),
    DeletionReason NVARCHAR(500),
    IsRestored BIT DEFAULT 0,
    RestoredBy NVARCHAR(50),
    RestoredAt DATETIME
);

IF OBJECT_ID('AuditLogs', 'U') IS NOT NULL DROP TABLE AuditLogs;
CREATE TABLE AuditLogs (
    LogId INT IDENTITY(1,1) PRIMARY KEY,
    UserId INT,
    Username NVARCHAR(50),
    UserRole NVARCHAR(50),
    Action NVARCHAR(100) NOT NULL,
    EntityName NVARCHAR(100) NOT NULL,
    EntityId NVARCHAR(50),
    Details NVARCHAR(MAX),
    IpAddress NVARCHAR(50),
    Timestamp DATETIME DEFAULT GETDATE()
);

-- ============================================================================
-- 13. BUSINESS VIEWS (كشف التفريغ المقارن وتنبيهات الصلاحية والملف المجمع)
-- ============================================================================

-- 1. كشف التفريغ المقارن وجدول مقارنة الأسعار للعطاءات المقبولة فنياً مرتبة تصاعدياً
IF OBJECT_ID('vw_ComparativeBidAnalysis', 'V') IS NOT NULL DROP VIEW vw_ComparativeBidAnalysis;
GO
CREATE VIEW vw_ComparativeBidAnalysis AS
SELECT 
    T.TenderId,
    T.TenderNumber,
    T.FiscalYear,
    S.SubmissionId,
    S.BidFractionSerial,
    V.VendorId,
    V.CompanyName,
    V.TaxCardNo,
    V.CommercialRegisterNo,
    V.ConstructionGrade,
    S.TechnicalStatus,
    S.TechnicalScore,
    S.FinancialTotalAmount,
    S.InitialInsuranceAmount,
    S.GuaranteePaymentMethod,
    DENSE_RANK() OVER (
        PARTITION BY T.TenderId 
        ORDER BY CASE WHEN S.TechnicalStatus = N'مقبول' THEN S.FinancialTotalAmount ELSE 999999999 END ASC
    ) AS CalculatedPriceRank
FROM Tenders T
JOIN BidSubmissions S ON T.TenderId = S.TenderId
JOIN Vendors V ON S.VendorId = V.VendorId
WHERE S.IsDeleted = 0;
GO

-- 2. تنبيهات قرب انتهاء السجل التجاري والبطاقة الضريبية للموردين
IF OBJECT_ID('vw_VendorExpirationAlerts', 'V') IS NOT NULL DROP VIEW vw_VendorExpirationAlerts;
GO
CREATE VIEW vw_VendorExpirationAlerts AS
SELECT 
    VendorId,
    CompanyName,
    VendorType,
    TaxCardNo,
    TaxCardExpiry,
    DATEDIFF(day, GETDATE(), TaxCardExpiry) AS DaysToTaxCardExpiry,
    CASE 
        WHEN TaxCardExpiry < GETDATE() THEN N'منتهية'
        WHEN DATEDIFF(day, GETDATE(), TaxCardExpiry) <= 30 THEN N'توشك على الانتهاء (أقل من 30 يوماً)'
        WHEN DATEDIFF(day, GETDATE(), TaxCardExpiry) <= 60 THEN N'قاربت على الانتهاء (أقل من 60 يوماً)'
        ELSE N'سارية'
    END AS TaxCardAlertStatus,
    CommercialRegisterNo,
    CommercialRegisterExpiry,
    DATEDIFF(day, GETDATE(), CommercialRegisterExpiry) AS DaysToCommercialRegisterExpiry,
    CASE 
        WHEN CommercialRegisterExpiry < GETDATE() THEN N'منتهي'
        WHEN DATEDIFF(day, GETDATE(), CommercialRegisterExpiry) <= 30 THEN N'يوشك على الانتهاء (أقل من 30 يوماً)'
        WHEN DATEDIFF(day, GETDATE(), CommercialRegisterExpiry) <= 60 THEN N'قارب على الانتهاء (أقل من 60 يوماً)'
        ELSE N'سارٍ'
    END AS CommercialRegisterAlertStatus,
    IsBlacklisted
FROM Vendors
WHERE IsDeleted = 0;
GO

-- 3. الملف المجمع للدورة المستندية للعملية وحافظة التوزيع (Dossier View)
IF OBJECT_ID('vw_TenderComprehensiveDossier', 'V') IS NOT NULL DROP VIEW vw_TenderComprehensiveDossier;
GO
CREATE VIEW vw_TenderComprehensiveDossier AS
SELECT 
    T.TenderId,
    T.TenderNumber,
    T.TenderMethod,
    T.FiscalYear,
    N.OperationName,
    N.OperationType,
    N.RequestingDepartment,
    N.BudgetHoldReference,
    N.ApprovalAuthorityDate,
    T.EnvelopeOpeningDate,
    T.InitialGuaranteeAmount,
    (SELECT COUNT(*) FROM BidSubmissions WHERE TenderId = T.TenderId AND IsDeleted = 0) AS TotalBidsCount,
    (SELECT COUNT(*) FROM BidSubmissions WHERE TenderId = T.TenderId AND TechnicalStatus = N'مقبول' AND IsDeleted = 0) AS AcceptedBidsCount,
    A.AwardingId,
    A.AwardDate,
    A.AwardedAmount,
    A.FinalGuaranteeAmount,
    A.ContractSigningDeadline,
    A.PurchaseOrderNo,
    A.JournalDirectiveNo,
    W.CompanyName AS WinnerVendorName,
    W.TaxCardNo AS WinnerTaxCardNo,
    W.CommercialRegisterNo AS WinnerCommercialRegisterNo,
    T.Status AS TenderStatus
FROM Tenders T
LEFT JOIN NeedsRequests N ON T.RequestId = N.RequestId
LEFT JOIN Awardings A ON T.TenderId = A.TenderId
LEFT JOIN Vendors W ON A.VendorId = W.VendorId
WHERE T.IsDeleted = 0;
GO

-- ============================================================================
-- 14. SEED DATA (قاعدة البيانات الأساسية)
-- ============================================================================

INSERT INTO Users (Username, PasswordHash, FullName, Role, Department) VALUES
(N'sa', N'$2a$10$HoojbN3OWw1rZzg3CBAJdO6EXIAhGhfQSW.1PmTb6GVN6OE36m/xS', N'المشرف العام (Super Admin)', N'Admin', N'الإدارة العليا'),
(N'tenders_user', N'$2a$10$HoojbN3OWw1rZzg3CBAJdO6EXIAhGhfQSW.1PmTb6GVN6OE36m/xS', N'أحمد سعيد (مسؤول الطرح)', N'TenderOfficer', N'إدارة الطرح والمواصفات'),
(N'committee_user', N'$2a$10$HoojbN3OWw1rZzg3CBAJdO6EXIAhGhfQSW.1PmTb6GVN6OE36m/xS', N'م. محمود رضوان (لجنة البت والتفريغ)', N'CommitteeMember', N'لجنة البت الفني والمالي'),
(N'finance_user', N'$2a$10$HoojbN3OWw1rZzg3CBAJdO6EXIAhGhfQSW.1PmTb6GVN6OE36m/xS', N'أشرف جلال (المراجع المالي والإسناد)', N'FinancialAuditor', N'إدارة الشئون المالية والتسويات'),
(N'vendor_user', N'$2a$10$HoojbN3OWw1rZzg3CBAJdO6EXIAhGhfQSW.1PmTb6GVN6OE36m/xS', N'منى خليل (مسؤول قيد الموردين)', N'VendorManager', N'إدارة سجل الموردين والمقاولين'),
(N'security_user', N'$2a$10$HoojbN3OWw1rZzg3CBAJdO6EXIAhGhfQSW.1PmTb6GVN6OE36m/xS', N'كمال فاروق (المراجع الأمني والرقابي)', N'Auditor', N'إدارة المتابعة والتفتيش المالي والإداري');

-- Insert 66 Supply Categories
INSERT INTO SupplyCategories (CategoryId, CategoryName) VALUES
(1, N'المواسير بأنوعها و البلوف و المحابس و القطع المخصوص'),
(2, N'الأغطيه الخرسانية'),
(3, N'برابخ الفخار'),
(4, N'أغطيه صلب'),
(5, N'السيارات بأنواعها'),
(6, N'قطع غيار السيارات النقل بأنواعها'),
(7, N'قطع غيار السيارات الركايب بأنواعها'),
(8, N'قطع غيار الأوناش'),
(9, N'مواد و مهمات و خامات لورش اللحام و الحداده و الجكمان'),
(10, N'مواد و مهمات و خامات لورش الخراطة و البراده'),
(11, N'مواد و مهمات و خامات و سيور لورش الكاوتشوك'),
(12, N'مواد و مهمات لورش النقش و الدوكو'),
(13, N'مواد و مهمات لورش السروجية'),
(14, N'قطع الغيار الميكانيكية لمحطات التنقية و المعالجة'),
(15, N'قطع الغيار الكهربائية لمحطات التنقية و المعالجة'),
(16, N'مواد و مهمات لورش سمكرة السيارات'),
(17, N'رولمان بلى'),
(18, N'مواد و مهمات لورش الردياتير'),
(19, N'مواد و مهمات لورش النجارة'),
(20, N'مواد و مهمات لورش الكهرباء لجميع انواع السيارات'),
(21, N'أجهزة و معدات الامن الصناعى و أجهزة الأطفاء'),
(22, N'مواد و مهمات الاسعاف'),
(23, N'الخراطيم و الكاوتشكوك و غيرها اللازمة لمعدات الصرف الصحى'),
(24, N'الطلمبات بأنوعها و قطع غيارها'),
(25, N'المولدات بأنوعها و قطع غيارها'),
(26, N'مواد و مهمات و أدوات البناء (طوب – رمل – زلط ...... إلخ)'),
(27, N'المهمات و الأدوات الكهربائية'),
(28, N'الأدوات و المهمات المكتبية'),
(29, N'أدوات النظافة'),
(30, N'إطارات كاوتشوك لجميع أنواع السيارات'),
(31, N'أجهزة المعامل و كيماويات'),
(32, N'قطع غيار المعامل و مواد و مهمات المعامل'),
(33, N'البطاريات لجميع أنواع السيارات'),
(34, N'ضواغط الهواء للمحطات'),
(35, N'أدوات الصيانة و الشبكة'),
(36, N'أسياخ التسليك الصلب'),
(37, N'أجهزة الفاكس'),
(38, N'أجهزة الحاسب الآلى'),
(39, N'مستلزمات الحاسب الآلى'),
(40, N'برامج إدارة المعلومات'),
(41, N'أجهزة اللاسلكى'),
(42, N'أجهزة السنترال'),
(43, N'إحتياجات الحدائق و التشجير'),
(44, N'مبيدات لمكافحة الحشرات'),
(45, N'مهمات و معاجين و دهانات'),
(46, N'المطبوعات'),
(47, N'التفتيش على التوريدات'),
(48, N'مغيرات السرعة للطلمبات بأنواعها'),
(49, N'بادئات التشغيل بأنوعها'),
(50, N'المشغلات الكهربائية للمحابس و البوابات'),
(51, N'الحاكمات المنطقية المبرمجة ( PLC )'),
(52, N'برامج إدارة و صيانة الأصول'),
(53, N'نظم تجميع البيانات و المراقبة و التحكم بالحاسب الآلى Scada'),
(54, N'كابلات الألياف الضوئية و مستلزماتها Fiberoptic'),
(55, N'الكارتات الالكترونية'),
(56, N'أجهزة الحماية و التحكم الالكترونية'),
(57, N'أجهزة القياس'),
(58, N'البرامج الخاصة ببرمجة الاجهزة الالكترونية Softwares'),
(59, N'أغطية GRP'),
(60, N'فلاتر بجميع أنواعها'),
(61, N'بلومير'),
(62, N'آلات تصوير و مستلزماتها'),
(63, N'زيوت و شحومات'),
(64, N'توريد مشتملات منظومة الطاقة الشمسية'),
(65, N'توريد تكييفات'),
(66, N'توريد معدات ثقيلة (لوادر – اوناش)');

-- Sample Vendors with Unique Tax & Commercial Numbers, Type & Expiry Dates
INSERT INTO Vendors (
    CompanyName, VendorType, LegalEntity, Address, Phone, TaxCardNo, TaxCardExpiry,
    CommercialRegisterNo, CommercialRegisterExpiry, CategoryGroup, ConstructionGrade, ConstructionBranch,
    IsRegistered, HasPreviousWorks, IsBlacklisted, BlacklistReason, BlacklistAuthority, BlacklistDate
) VALUES 
(N'شركة الحمد للتجارة والتوريدات الفنية', N'مورد', N'شركة مساهمة', N'11 ش الكهرمان الحضرة القبلية الاسكندرية', N'01012345678', N'100-200-300', '2027-12-31', N'CR-45120', '2027-12-31', N'المواسير بأنوعها و البلوف و المحابس', N'غير مجدول', NULL, 1, 1, 0, NULL, NULL, NULL),
(N'شركة الإسكندرية لمقاولات شبكات الصرف', N'مقاول', N'شركة مساهمة', N'ابراج الند مارك سموحة الاسكندرية', N'01234567890', N'102-202-302', '2028-06-30', N'CR-88210', '2028-06-30', N'أعمال المقاولات والإنشاءات', N'الأولى', N'شبكات المياه والصرف الصحي', 1, 1, 0, NULL, NULL, NULL),
(N'شركة الكينج للمعدات والخدمات البترولية', N'مؤدي خدمة', N'شركة ذات مسؤولية محدودة', N'العامرية ك 35 الطريق الصحراوى', N'01123456789', N'101-201-301', '2026-11-15', N'CR-77450', '2026-11-15', N'قطع غيار الأوناش والمعدات', N'الرابعة', N'الصيانة والمهمات', 1, 1, 0, NULL, NULL, NULL),
(N'شركة السماح للمقاولات العمومية', N'مقاول', N'شركة ذات مسؤولية محدودة', N'شارع النصر الاسكندرية', N'01099988877', N'103-203-303', '2024-01-10', N'CR-12003', '2024-01-10', N'أعمال الصيانة', N'السادسة', N'أعمال الصيانة', 0, 0, 1, N'مخالفة كراسة الشروط والتأخر الجسيم في التنفيذ', N'مجلس الإدارة', '2024-05-15');

GO
