-- ============================================================================
-- SQL Server Unified Database Schema for Procurement & Contracts Management System
-- منظومة الدورة المستندية للإدارة العامة للعقود والمشتريات - شركة الصرف الصحي بالإسكندرية (ASDCO)
-- متوافقة 100% مع جميع حقول وجداول النظام، قانون 182 لسنة 2018، والقيود الصارمة (Validations)
-- ============================================================================

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'ProcurementDB')
BEGIN
    CREATE DATABASE ProcurementDB;
END
GO

USE ProcurementDB;
GO

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

-- ============================================================================
-- 0. DROP EXISTING TABLES IN REVERSE DEPENDENCY ORDER
-- ============================================================================
IF OBJECT_ID('SubFileNotifications', 'U') IS NOT NULL DROP TABLE SubFileNotifications;
IF OBJECT_ID('SubFileDeliveries', 'U') IS NOT NULL DROP TABLE SubFileDeliveries;
IF OBJECT_ID('SubFileDistributions', 'U') IS NOT NULL DROP TABLE SubFileDistributions;
IF OBJECT_ID('GuaranteeTransactions', 'U') IS NOT NULL DROP TABLE GuaranteeTransactions;
IF OBJECT_ID('FinancialTransactions', 'U') IS NOT NULL DROP TABLE FinancialTransactions;
IF OBJECT_ID('DistributionDossiers', 'U') IS NOT NULL DROP TABLE DistributionDossiers;
IF OBJECT_ID('Awardings', 'U') IS NOT NULL DROP TABLE Awardings;
IF OBJECT_ID('BidItems', 'U') IS NOT NULL DROP TABLE BidItems;
IF OBJECT_ID('BidSubmissions', 'U') IS NOT NULL DROP TABLE BidSubmissions;
IF OBJECT_ID('TenderInvitedVendors', 'U') IS NOT NULL DROP TABLE TenderInvitedVendors;
IF OBJECT_ID('TenderItems', 'U') IS NOT NULL DROP TABLE TenderItems;
IF OBJECT_ID('Tenders', 'U') IS NOT NULL DROP TABLE Tenders;
IF OBJECT_ID('WarehouseInquiries', 'U') IS NOT NULL DROP TABLE WarehouseInquiries;
IF OBJECT_ID('NeedsRequests', 'U') IS NOT NULL DROP TABLE NeedsRequests;
IF OBJECT_ID('WarehouseInventory', 'U') IS NOT NULL DROP TABLE WarehouseInventory;
IF OBJECT_ID('ContractorGroupMembers', 'U') IS NOT NULL DROP TABLE ContractorGroupMembers;
IF OBJECT_ID('ContractorGroups', 'U') IS NOT NULL DROP TABLE ContractorGroups;
IF OBJECT_ID('VendorSupplyCategories', 'U') IS NOT NULL DROP TABLE VendorSupplyCategories;
IF OBJECT_ID('Vendors', 'U') IS NOT NULL DROP TABLE Vendors;
IF OBJECT_ID('SupplyCategories', 'U') IS NOT NULL DROP TABLE SupplyCategories;
IF OBJECT_ID('Users', 'U') IS NOT NULL DROP TABLE Users;
IF OBJECT_ID('ArchivedItems', 'U') IS NOT NULL DROP TABLE ArchivedItems;
IF OBJECT_ID('AuditLogs', 'U') IS NOT NULL DROP TABLE AuditLogs;
GO

-- ============================================================================
-- 1. USERS & ROLES
-- ============================================================================
CREATE TABLE Users (
    UserId INT IDENTITY(1,1) PRIMARY KEY,
    Username NVARCHAR(50) NOT NULL UNIQUE,
    PasswordHash NVARCHAR(255) NOT NULL,
    FullName NVARCHAR(100) NOT NULL,
    Role NVARCHAR(50) NOT NULL CHECK (Role IN ('Admin', 'TenderOfficer', 'CommitteeMember', 'FinancialAuditor', 'VendorManager', 'Auditor')),
    Department NVARCHAR(150) DEFAULT N'الإدارة العامة للعقود والمشتريات',
    CreatedAt DATETIME DEFAULT GETDATE(),
    IsActive BIT DEFAULT 1
);
CREATE NONCLUSTERED INDEX IX_Users_Username ON Users(Username);
GO

-- ============================================================================
-- 2. VENDOR CATEGORIES (66 Supply Categories)
-- ============================================================================
CREATE TABLE SupplyCategories (
    CategoryId INT PRIMARY KEY,
    CategoryName NVARCHAR(300) NOT NULL
);
GO

-- ============================================================================
-- 3. VENDORS & CONTRACTORS REGISTRY
-- ============================================================================
CREATE TABLE Vendors (
    VendorId INT IDENTITY(1,1) PRIMARY KEY,
    CompanyName NVARCHAR(300) NOT NULL,
    VendorType NVARCHAR(50) NOT NULL DEFAULT N'مورد' CHECK (VendorType IN (N'مورد', N'مقاول', N'مؤدي خدمة')),
    LegalEntity NVARCHAR(50) DEFAULT N'أفراد' CHECK (LegalEntity IN (N'أفراد', N'شركة تضامن', N'شركة توصية بسيطة', N'شركة مساهمة', N'شركة ذات مسؤولية محدودة', N'جهة أخرى')),
    CompanyType NVARCHAR(100) DEFAULT N'أفراد',
    Address NVARCHAR(500),
    Phone NVARCHAR(50),
    Fax NVARCHAR(50),
    Email NVARCHAR(150),
    TaxCardNo NVARCHAR(50) NOT NULL UNIQUE,
    TaxCardExpiry DATE,
    CommercialRegisterNo NVARCHAR(50) NOT NULL UNIQUE,
    CommercialRegisterExpiry DATE,
    CategoryGroup NVARCHAR(300),
    ConstructionGrade NVARCHAR(50) CHECK (ConstructionGrade IN (N'الأولى', N'الثانية', N'الثالثة', N'الرابعة', N'الخامسة', N'السادسة', N'السابعة', N'غير مجدول')),
    ConstructionBranch NVARCHAR(150),
    IsRegistered BIT DEFAULT 1,
    HasPreviousWorks BIT DEFAULT 1,
    IsBlacklisted BIT DEFAULT 0,
    BlacklistReason NVARCHAR(500),
    BlacklistAuthority NVARCHAR(200),
    BlacklistDate DATE,
    UnblacklistedReason NVARCHAR(500),
    UnblacklistedAuthority NVARCHAR(200),
    UnblacklistedDate DATE,
    IsDeleted BIT DEFAULT 0,
    CreatedAt DATETIME DEFAULT GETDATE()
);
CREATE NONCLUSTERED INDEX IX_Vendors_TaxCard ON Vendors(TaxCardNo);
CREATE NONCLUSTERED INDEX IX_Vendors_CommercialRegister ON Vendors(CommercialRegisterNo);
CREATE NONCLUSTERED INDEX IX_Vendors_Blacklist ON Vendors(IsBlacklisted, IsDeleted);
GO

-- ============================================================================
-- 3.1 VENDOR CATEGORY MAPPING
-- ============================================================================
CREATE TABLE VendorSupplyCategories (
    VendorId INT NOT NULL FOREIGN KEY REFERENCES Vendors(VendorId) ON DELETE CASCADE,
    CategoryId INT NOT NULL FOREIGN KEY REFERENCES SupplyCategories(CategoryId) ON DELETE CASCADE,
    PRIMARY KEY (VendorId, CategoryId)
);
GO

-- ============================================================================
-- 3.2 CONTRACTOR GROUPS
-- ============================================================================
CREATE TABLE ContractorGroups (
    GroupId INT IDENTITY(1,1) PRIMARY KEY,
    GroupName NVARCHAR(250) NOT NULL,
    GroupDescription NVARCHAR(500),
    WorkScope NVARCHAR(500),
    IsActive BIT DEFAULT 1,
    CreatedAt DATETIME DEFAULT GETDATE()
);
GO

CREATE TABLE ContractorGroupMembers (
    MemberId INT IDENTITY(1,1) PRIMARY KEY,
    GroupId INT NOT NULL FOREIGN KEY REFERENCES ContractorGroups(GroupId) ON DELETE CASCADE,
    VendorId INT NOT NULL FOREIGN KEY REFERENCES Vendors(VendorId) ON DELETE CASCADE,
    IsFederationMember BIT DEFAULT 0,
    Certificates NVARCHAR(MAX),
    Notes NVARCHAR(500),
    AddedAt DATETIME DEFAULT GETDATE()
);
GO

-- ============================================================================
-- 3.3 WAREHOUSE INVENTORY
-- ============================================================================
CREATE TABLE WarehouseInventory (
    ProductId INT IDENTITY(1,1) PRIMARY KEY,
    ProductName NVARCHAR(300) NOT NULL,
    ProductCode NVARCHAR(100) UNIQUE,
    CategoryId INT FOREIGN KEY REFERENCES SupplyCategories(CategoryId),
    Unit NVARCHAR(50) DEFAULT N'عدد',
    CurrentStock DECIMAL(18,3) DEFAULT 0 CHECK (CurrentStock >= 0),
    MinimumStock DECIMAL(18,3) DEFAULT 0 CHECK (MinimumStock >= 0),
    Location NVARCHAR(200),
    IsActive BIT DEFAULT 1,
    CreatedAt DATETIME DEFAULT GETDATE()
);
GO

-- ============================================================================
-- 4. NEEDS REQUESTS (طلبات الاحتياج ومذكرات الحجز المالي)
-- ============================================================================
CREATE TABLE NeedsRequests (
    RequestId INT IDENTITY(1,1) PRIMARY KEY,
    OperationName NVARCHAR(500) NOT NULL,
    OperationType NVARCHAR(50) NOT NULL DEFAULT N'توريدات' CHECK (OperationType IN (N'توريدات', N'مقاولات', N'خدمات واستشارات', N'تعاقدات', N'مزادات')),
    EstimatedValue DECIMAL(18,2) DEFAULT 0,
    RequestingDepartment NVARCHAR(250) NOT NULL,
    BudgetHoldReference NVARCHAR(100),
    ExecutionDuration NVARCHAR(100),
    FiscalYear NVARCHAR(20) NOT NULL,
    ReservationType NVARCHAR(100) DEFAULT N'موازنة الشركة',
    InitialReservation DECIMAL(18,2) DEFAULT 0,
    ApprovalAuthorityDate DATE,
    SubmittalType NVARCHAR(50) DEFAULT N'مظروفيين' CHECK (SubmittalType IN (N'مظروف واحد', N'مظروفيين')),
    WarehouseBalance NVARCHAR(500) DEFAULT N'لا يوجد رصيد بالمخازن',
    ConstructionBranch NVARCHAR(150),
    RequiredGrade NVARCHAR(50),
    Status NVARCHAR(50) DEFAULT N'معلق' CHECK (Status IN (N'معلق', N'قيد المراجعة', N'معتمد', N'مرفوض', N'مطروح', N'تم البت', N'مسند', N'مكتمل التوريد والتسليم', N'ملغى', N'مؤرشف')),
    IsDeleted BIT DEFAULT 0,
    CreatedAt DATETIME DEFAULT GETDATE(),
    
    -- Detailed Specifications & Samples
    SpecsAndConditions NVARCHAR(MAX),
    RequiresSample BIT DEFAULT 0,
    SampleDetails NVARCHAR(500),
    
    -- Warehouse Query Integration
    WarehouseQuerySent BIT DEFAULT 0,
    WarehouseQueryResponse NVARCHAR(MAX),
    WarehouseQueryResponseDate DATETIME,
    
    -- Financial Operation & Tender Selection
    FinancialOperationNumber NVARCHAR(100),
    FinancialOperationSymbol NVARCHAR(50),
    TenderMethodSelected NVARCHAR(100),
    PreliminaryReservation DECIMAL(18,2) DEFAULT 0,
    ReservationTypeNew NVARCHAR(100),
    BookletPrice DECIMAL(18,2) DEFAULT 0,
    OperationTerms NVARCHAR(MAX),
    ConstructionDivision NVARCHAR(150),
    ConstructionCategory NVARCHAR(100),
    
    -- Approvals & Workflow Tracking
    ApprovalAuthority NVARCHAR(150),
    AuthorityApprovalStatus NVARCHAR(100) DEFAULT N'في انتظار الموافقة',
    AuthorityApprovalDate DATETIME,
    AuthorityRejectionReason NVARCHAR(500),
    WorkflowStatus NVARCHAR(100) DEFAULT N'طلب جديد',
    InitialGuaranteePercent DECIMAL(5,2) DEFAULT 2,
    InitialGuaranteeAmount DECIMAL(18,2) DEFAULT 0,
    OperationItems NVARCHAR(MAX),
    
    -- Financial Review Notes
    FinancialNotes NVARCHAR(MAX),
    FinancialReviewedAt DATETIME,
    FinancialReviewedBy NVARCHAR(100),
    AuthorityReviewedAt DATETIME,
    AuthorityReviewedBy NVARCHAR(100),
    
    -- Financial Approval Confirmation
    FinancialApprovalObtained BIT DEFAULT 0,
    FinancialApprovalDate DATETIME,
    FinancialApprovalNotes NVARCHAR(MAX),
    
    -- Specs & Booklet Documents
    SpecsFileName NVARCHAR(300),
    SpecsFilePath NVARCHAR(500),
    BookletFileName NVARCHAR(300),
    BookletFilePath NVARCHAR(500),
    
    -- Technical Evaluation Rules
    TechnicalEvaluationMethod NVARCHAR(100) DEFAULT N'مطابق أو غير مطابق',
    MinPassingScore DECIMAL(5,2) DEFAULT 70,
    AllowSplitAwarding BIT DEFAULT 0,
    TechnicalCriteriaNotes NVARCHAR(MAX)
);
CREATE NONCLUSTERED INDEX IX_NeedsRequests_Status ON NeedsRequests(Status, WorkflowStatus);
CREATE NONCLUSTERED INDEX IX_NeedsRequests_Department ON NeedsRequests(RequestingDepartment);
GO

-- ============================================================================
-- 4.1 WAREHOUSE INQUIRIES
-- ============================================================================
CREATE TABLE WarehouseInquiries (
    InquiryId INT IDENTITY(1,1) PRIMARY KEY,
    RequestId INT NOT NULL FOREIGN KEY REFERENCES NeedsRequests(RequestId) ON DELETE CASCADE,
    InquiryText NVARCHAR(MAX),
    SentAt DATETIME DEFAULT GETDATE(),
    ResponseText NVARCHAR(MAX),
    ResponseStatus NVARCHAR(50) DEFAULT N'في انتظار الرد',
    RespondedAt DATETIME,
    RespondedBy NVARCHAR(100)
);
GO

-- ============================================================================
-- 5. TENDERS MASTER (جدول الطرح والعمليات)
-- ============================================================================
CREATE TABLE Tenders (
    TenderId INT IDENTITY(1,1) PRIMARY KEY,
    RequestId INT FOREIGN KEY REFERENCES NeedsRequests(RequestId) ON DELETE SET NULL,
    TenderNumber NVARCHAR(50) NOT NULL UNIQUE,
    TenderSymbol NVARCHAR(20) NOT NULL,
    TenderName NVARCHAR(500),
    TenderMethod NVARCHAR(50) NOT NULL CHECK (TenderMethod IN (
        N'مناقصة عامة', N'مناقصة محدودة', N'ممارسة عامة', N'ممارسة محدودة', N'ممارسة محلية', N'أمر مباشر',
        N'مزايدة عامة', N'مزايدة محدودة'
    )),
    RequestingDepartment NVARCHAR(250),
    BudgetHoldReference NVARCHAR(100),
    FiscalYear NVARCHAR(20) NOT NULL,
    BaseBookletPrice DECIMAL(18,2) NOT NULL DEFAULT 0,
    CalculatedBookletPrice DECIMAL(18,2) NOT NULL DEFAULT 0,
    InitialGuaranteeAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
    EnvelopeOpeningDate DATETIME NOT NULL,
    AdNewspaper1 NVARCHAR(150),
    AdNewspaper2 NVARCHAR(150),
    AdPublishDate DATE,
    AdDetails NVARCHAR(MAX),
    EvaluationMethod NVARCHAR(50) DEFAULT N'تقرير فني',
    PassingScoreDecimal DECIMAL(5,2),
    RequiresSample BIT DEFAULT 0,
    SampleDetails NVARCHAR(500),
    Status NVARCHAR(50) DEFAULT N'نشط',
    IsDeleted BIT DEFAULT 0,
    CreatedAt DATETIME DEFAULT GETDATE(),
    
    -- Subfile distribution tracking
    HasSubFileDistribution BIT DEFAULT 0,
    SubFileDistributionId INT,
    
    -- Booklet Document Attachment
    BookletFileName NVARCHAR(300),
    BookletFilePath NVARCHAR(500),
    BookletFileSize BIGINT DEFAULT 0,
    BookletUploadedAt DATETIME,
    BookletFileContent NVARCHAR(MAX),
    
    -- Sync columns from NeedsRequests & Technical Evaluation System
    AllowSplitAwarding BIT DEFAULT 0,
    TechnicalCriteriaNotes NVARCHAR(MAX),
    OperationType NVARCHAR(50) DEFAULT N'توريدات',
    ExecutionDuration NVARCHAR(100),
    WarehouseBalance NVARCHAR(500),
    SpecsAndConditions NVARCHAR(MAX),
    ReservationType NVARCHAR(100) DEFAULT N'موازنة الشركة',
    EstimatedValue DECIMAL(18,2) DEFAULT 0,
    ConstructionDivision NVARCHAR(150),
    ConstructionCategory NVARCHAR(100),
    FinancialApprovalObtained BIT DEFAULT 0,
    FinancialApprovalDate DATETIME,
    FinancialApprovalNotes NVARCHAR(MAX),
    InvitedVendorsCount INT DEFAULT 0,
    InvitedVendorsJson NVARCHAR(MAX)
);
CREATE NONCLUSTERED INDEX IX_Tenders_Number ON Tenders(TenderNumber);
CREATE NONCLUSTERED INDEX IX_Tenders_Status ON Tenders(Status, IsDeleted);
GO

-- ============================================================================
-- 6. TENDER ITEMS (بنود الطرح والكميات التقديرية ونظام النقاط)
-- ============================================================================
CREATE TABLE TenderItems (
    ItemId INT IDENTITY(1,1) PRIMARY KEY,
    TenderId INT NOT NULL FOREIGN KEY REFERENCES Tenders(TenderId) ON DELETE CASCADE,
    ItemNumber INT NOT NULL,
    ItemDescription NVARCHAR(MAX) NOT NULL,
    Unit NVARCHAR(50) NOT NULL,
    EstimatedQuantity DECIMAL(18,3) NOT NULL DEFAULT 0,
    EstimatedUnitPrice DECIMAL(18,2) NOT NULL DEFAULT 0,
    EstimatedTotalPrice AS (EstimatedQuantity * EstimatedUnitPrice),
    Notes NVARCHAR(500),
    ItemSpecs NVARCHAR(MAX),
    ItemMaxScore DECIMAL(5,2) DEFAULT 100,
    ItemMinPassingScore DECIMAL(5,2) DEFAULT 70,
    ItemCriteria NVARCHAR(MAX),
    AllowSplit BIT DEFAULT 1
);
CREATE NONCLUSTERED INDEX IX_TenderItems_TenderId ON TenderItems(TenderId);
GO

-- ============================================================================
-- 6.1 TENDER INVITED VENDORS (الموردين والمقاولين الموجه إليهم الدعوة)
-- ============================================================================
CREATE TABLE TenderInvitedVendors (
    InvitedId INT IDENTITY(1,1) PRIMARY KEY,
    TenderId INT NOT NULL FOREIGN KEY REFERENCES Tenders(TenderId) ON DELETE CASCADE,
    VendorId INT FOREIGN KEY REFERENCES Vendors(VendorId),
    VendorName NVARCHAR(250) NOT NULL,
    TaxCardNo NVARCHAR(50),
    CommercialRegisterNo NVARCHAR(50),
    Phone NVARCHAR(50),
    Email NVARCHAR(150),
    InvitationMethod NVARCHAR(100) DEFAULT N'بريد مسجل بعلم الوصول',
    InvitationLetterNo NVARCHAR(100),
    InvitationDate DATE,
    ResponseStatus NVARCHAR(100) DEFAULT N'تم توجيه الدعوة',
    Notes NVARCHAR(500),
    CreatedAt DATETIME DEFAULT GETDATE()
);
CREATE NONCLUSTERED INDEX IX_TenderInvitedVendors_TenderId ON TenderInvitedVendors(TenderId);
GO

-- ============================================================================
-- 7. BIDDER SUBMISSIONS (فض المظاريف والعطاءات المقدمة)
-- ============================================================================
CREATE TABLE BidSubmissions (
    SubmissionId INT IDENTITY(1,1) PRIMARY KEY,
    TenderId INT NOT NULL FOREIGN KEY REFERENCES Tenders(TenderId) ON DELETE CASCADE,
    VendorId INT NOT NULL FOREIGN KEY REFERENCES Vendors(VendorId),
    BidFractionSerial NVARCHAR(20) NOT NULL,
    SubmissionDate DATETIME DEFAULT GETDATE(),
    InitialInsuranceAmount DECIMAL(18,2) DEFAULT 0,
    GuaranteePaymentMethod NVARCHAR(50),
    InitialInsuranceStatus NVARCHAR(50) DEFAULT N'ساري',
    ReceiptNumber NVARCHAR(100),
    ReceiptDate DATE,
    CheckNumber NVARCHAR(100),
    BankName NVARCHAR(150),
    CheckDate DATE,
    GuaranteeLetterNo NVARCHAR(100),
    GuaranteeLetterIssueDate DATE,
    GuaranteeLetterExpiryDate DATE,
    DeductionNoteNo NVARCHAR(100),
    DeductionNoteDate DATE,
    DeductionEntity NVARCHAR(200),
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
    TechnicalStatus NVARCHAR(50) DEFAULT N'تحت التقييم',
    TechnicalScore DECIMAL(5,2),
    RejectionReason NVARCHAR(500),
    FinancialTotalAmount DECIMAL(18,2) DEFAULT 0,
    FinancialRank INT,
    FinalRank INT,
    IsDeleted BIT DEFAULT 0
);
CREATE NONCLUSTERED INDEX IX_BidSubmissions_TenderId ON BidSubmissions(TenderId);
CREATE NONCLUSTERED INDEX IX_BidSubmissions_VendorId ON BidSubmissions(VendorId);
GO

-- ============================================================================
-- 8. BID ITEMS PRICING (تفريغ المظروف المالي والأسعار المقترحة)
-- ============================================================================
CREATE TABLE BidItems (
    BidItemId INT IDENTITY(1,1) PRIMARY KEY,
    SubmissionId INT NOT NULL FOREIGN KEY REFERENCES BidSubmissions(SubmissionId) ON DELETE CASCADE,
    TenderItemId INT FOREIGN KEY REFERENCES TenderItems(ItemId),
    ItemName NVARCHAR(500) NOT NULL,
    UnitType NVARCHAR(50) NOT NULL,
    Quantity DECIMAL(18,3) NOT NULL DEFAULT 0,
    UnitPrice DECIMAL(18,2) NOT NULL DEFAULT 0,
    TotalPrice DECIMAL(18,2) NOT NULL DEFAULT 0,
    QuotedUnitPrice DECIMAL(18,2) DEFAULT 0,
    TotalItemPrice DECIMAL(18,2) DEFAULT 0,
    TechnicalEvaluation NVARCHAR(100) DEFAULT N'مقبول أساسي',
    Notes NVARCHAR(500)
);
CREATE NONCLUSTERED INDEX IX_BidItems_SubmissionId ON BidItems(SubmissionId);
GO

-- ============================================================================
-- 9. AWARD DECISIONS & ORDERS (جدول البت والترسية وأوامر التوريد)
-- ============================================================================
CREATE TABLE Awardings (
    AwardingId INT IDENTITY(1,1) PRIMARY KEY,
    TenderId INT NOT NULL FOREIGN KEY REFERENCES Tenders(TenderId),
    WinnerSubmissionId INT NOT NULL FOREIGN KEY REFERENCES BidSubmissions(SubmissionId),
    VendorId INT NOT NULL FOREIGN KEY REFERENCES Vendors(VendorId),
    AwardDate DATE NOT NULL,
    AwardedAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
    AwardedAmountTafqeet NVARCHAR(500),
    AuthorityApprovalDate DATE NOT NULL,
    ReservationConfirmDate DATE NOT NULL,
    BudgetSource NVARCHAR(50) DEFAULT N'موازنة الشركة',
    FinalGuaranteeAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
    FinalGuaranteeTafqeet NVARCHAR(500),
    FinalGuaranteeStatus NVARCHAR(50) DEFAULT N'قيد السداد',
    FinalGuaranteePaymentMethod NVARCHAR(100),
    ContractSigningDeadline DATE NOT NULL,
    EngineeringStamp DECIMAL(18,2) DEFAULT 0,
    AppliedStamp DECIMAL(18,2) DEFAULT 0,
    DevelopmentStamp DECIMAL(18,2) DEFAULT 0,
    ExtensionStamp DECIMAL(18,2) DEFAULT 0,
    FederationFee DECIMAL(18,2) DEFAULT 0,
    ShaheedStamp DECIMAL(18,2) DEFAULT 5,
    TahyaMisrFund DECIMAL(18,2) DEFAULT 0,
    PostalTransferFee DECIMAL(18,2) DEFAULT 0,
    TotalDeductions AS (
        ISNULL(EngineeringStamp,0) + ISNULL(AppliedStamp,0) + ISNULL(DevelopmentStamp,0) + ISNULL(ExtensionStamp,0) +
        ISNULL(FederationFee,0) + ISNULL(ShaheedStamp,0) + ISNULL(TahyaMisrFund,0) + ISNULL(PostalTransferFee,0)
    ),
    NetAwardAmount AS (
        AwardedAmount - (
            ISNULL(EngineeringStamp,0) + ISNULL(AppliedStamp,0) + ISNULL(DevelopmentStamp,0) + ISNULL(ExtensionStamp,0) +
            ISNULL(FederationFee,0) + ISNULL(ShaheedStamp,0) + ISNULL(TahyaMisrFund,0) + ISNULL(PostalTransferFee,0)
        )
    ),
    PurchaseOrderNo NVARCHAR(100) UNIQUE,
    PurchaseOrderDate DATE,
    JournalDirectiveNo NVARCHAR(100) UNIQUE,
    JournalDirectiveDate DATE,
    CreatedAt DATETIME DEFAULT GETDATE()
);
GO

-- ============================================================================
-- 10. FINANCIAL TRANSACTIONS & JOURNAL ENTRIES (القيود المحاسبية والتسويات)
-- ============================================================================
CREATE TABLE FinancialTransactions (
    TransactionId INT IDENTITY(1,1) PRIMARY KEY,
    TenderId INT NOT NULL FOREIGN KEY REFERENCES Tenders(TenderId),
    VendorId INT NOT NULL FOREIGN KEY REFERENCES Vendors(VendorId),
    TransactionType NVARCHAR(100) NOT NULL,
    DebitAccountCode NVARCHAR(50) NOT NULL,
    DebitAccountName NVARCHAR(250) NOT NULL,
    CreditAccountCode NVARCHAR(50) NOT NULL,
    CreditAccountName NVARCHAR(250) NOT NULL,
    Amount DECIMAL(18,2) NOT NULL DEFAULT 0,
    AmountTafqeet NVARCHAR(500),
    VoucherNumber NVARCHAR(100) NOT NULL,
    TransactionDate DATE DEFAULT GETDATE(),
    Notes NVARCHAR(500),
    CreatedAt DATETIME DEFAULT GETDATE()
);
GO

-- ============================================================================
-- 11. DISTRIBUTION DOSSIERS (حوافظ التوزيع)
-- ============================================================================
CREATE TABLE DistributionDossiers (
    DossierId INT IDENTITY(1,1) PRIMARY KEY,
    TenderId INT NOT NULL FOREIGN KEY REFERENCES Tenders(TenderId),
    TargetDepartment NVARCHAR(250) NOT NULL,
    DispatchReference NVARCHAR(150) NOT NULL,
    DispatchDate DATE DEFAULT GETDATE(),
    IncludedDocuments NVARCHAR(MAX),
    ReceiptAcknowledged BIT DEFAULT 0,
    ReceiptDate DATE,
    ReceivedBy NVARCHAR(150),
    Notes NVARCHAR(500)
);
GO

-- ============================================================================
-- 12. SUB-FILE DISTRIBUTIONS, DELIVERIES & NOTIFICATIONS
-- ============================================================================
CREATE TABLE SubFileDistributions (
    DistributionId INT IDENTITY(1,1) PRIMARY KEY,
    TenderId INT FOREIGN KEY REFERENCES Tenders(TenderId),
    RequestId INT FOREIGN KEY REFERENCES NeedsRequests(RequestId),
    OperationName NVARCHAR(500),
    OperationType NVARCHAR(100),
    OperationNumber NVARCHAR(100),
    IssuedAt DATETIME DEFAULT GETDATE(),
    IssuedBy NVARCHAR(150),
    Status NVARCHAR(50) DEFAULT N'مُصدر',
    HasFinalGuaranteeReceipt BIT DEFAULT 0,
    FinalGuaranteeReceipt NVARCHAR(200),
    FinalGuaranteeReceivedAt DATETIME,
    HasWarehouseAddition BIT DEFAULT 0,
    WarehouseAdditionNo NVARCHAR(100),
    WarehouseAdditionDate DATE,
    Notes NVARCHAR(MAX),
    DocumentsPackage NVARCHAR(MAX)
);
GO

CREATE TABLE SubFileDeliveries (
    DeliveryId INT IDENTITY(1,1) PRIMARY KEY,
    DistributionId INT NOT NULL FOREIGN KEY REFERENCES SubFileDistributions(DistributionId) ON DELETE CASCADE,
    DeliveryTarget NVARCHAR(250) NOT NULL,
    DeliveryForm NVARCHAR(250),
    DeliveredAt DATETIME DEFAULT GETDATE(),
    ReceivedBy NVARCHAR(150),
    Status NVARCHAR(50) DEFAULT N'مُسلَّم',
    NotificationSent BIT DEFAULT 0
);
GO

CREATE TABLE SubFileNotifications (
    NotificationId INT IDENTITY(1,1) PRIMARY KEY,
    DistributionId INT NOT NULL FOREIGN KEY REFERENCES SubFileDistributions(DistributionId) ON DELETE CASCADE,
    NotificationType NVARCHAR(100),
    TargetDepartment NVARCHAR(250),
    Message NVARCHAR(MAX),
    SentAt DATETIME DEFAULT GETDATE(),
    IsRead BIT DEFAULT 0
);
GO

-- ============================================================================
-- 13. GUARANTEE TRANSACTIONS (حركات خطابات الضمان والتأمينات)
-- ============================================================================
CREATE TABLE GuaranteeTransactions (
    GuaranteeTransactionId INT IDENTITY(1,1) PRIMARY KEY,
    TenderId INT NOT NULL FOREIGN KEY REFERENCES Tenders(TenderId),
    VendorId INT NOT NULL FOREIGN KEY REFERENCES Vendors(VendorId),
    SubmissionId INT FOREIGN KEY REFERENCES BidSubmissions(SubmissionId),
    TransactionType NVARCHAR(100) NOT NULL,
    OriginalAmount DECIMAL(18,2) DEFAULT 0,
    DeductedStamps DECIMAL(18,2) DEFAULT 0,
    DeductedAdminFees DECIMAL(18,2) DEFAULT 0,
    NetRefundAmount DECIMAL(18,2) DEFAULT 0,
    ConvertedToFinal BIT DEFAULT 0,
    FinalGuaranteeAmount DECIMAL(18,2) DEFAULT 0,
    AccountingEntryId INT,
    VoucherNumber NVARCHAR(100),
    Status NVARCHAR(50) DEFAULT N'معلق',
    ProcessedAt DATETIME,
    ProcessedBy NVARCHAR(150),
    Notes NVARCHAR(MAX),
    CreatedAt DATETIME DEFAULT GETDATE()
);
GO

-- ============================================================================
-- 14. AUDIT TRAIL & ARCHIVE REPOSITORY
-- ============================================================================
CREATE TABLE ArchivedItems (
    ArchiveId INT IDENTITY(1,1) PRIMARY KEY,
    EntityType NVARCHAR(50) NOT NULL,
    EntityId INT NOT NULL,
    EntityName NVARCHAR(300) NOT NULL,
    EntityData NVARCHAR(MAX),
    DeletedBy NVARCHAR(100) NOT NULL,
    DeletedAt DATETIME DEFAULT GETDATE(),
    DeletionReason NVARCHAR(500),
    IsRestored BIT DEFAULT 0,
    RestoredBy NVARCHAR(100),
    RestoredAt DATETIME
);
GO

CREATE TABLE AuditLogs (
    LogId INT IDENTITY(1,1) PRIMARY KEY,
    UserId INT,
    Username NVARCHAR(100),
    UserRole NVARCHAR(50),
    Action NVARCHAR(100) NOT NULL,
    EntityName NVARCHAR(100) NOT NULL,
    EntityId NVARCHAR(50),
    Details NVARCHAR(MAX),
    IpAddress NVARCHAR(50),
    Timestamp DATETIME DEFAULT GETDATE()
);
GO

-- ============================================================================
-- 15. BUSINESS VIEWS
-- ============================================================================

-- 1. كشف التفريغ المقارن وجدول مقارنة الأسعار
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

-- 2. تنبيهات قرب انتهاء السجل التجاري والبطاقة الضريبية
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

-- 3. الملف المجمع للدورة المستندية للعملية
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
-- DATA: Users (6 records)
-- ============================================================================
SET IDENTITY_INSERT Users ON;
GO
INSERT INTO Users (UserId, Username, PasswordHash, FullName, Role, Department, CreatedAt, IsActive) VALUES (1, N'sa', N'$2a$10$HoojbN3OWw1rZzg3CBAJdO6EXIAhGhfQSW.1PmTb6GVN6OE36m/xS', N'المشرف العام (Super Admin)', N'Admin', N'الإدارة العليا', N'2026-10-27 07:47:09', 1);
INSERT INTO Users (UserId, Username, PasswordHash, FullName, Role, Department, CreatedAt, IsActive) VALUES (2, N'tenders_user', N'$2a$10$HoojbN3OWw1rZzg3CBAJdO6EXIAhGhfQSW.1PmTb6GVN6OE36m/xS', N'أحمد سعيد (مسؤول الطرح)', N'TenderOfficer', N'إدارة الطرح والمواصفات', N'2026-10-27 07:47:09', 1);
INSERT INTO Users (UserId, Username, PasswordHash, FullName, Role, Department, CreatedAt, IsActive) VALUES (3, N'committee_user', N'$2a$10$HoojbN3OWw1rZzg3CBAJdO6EXIAhGhfQSW.1PmTb6GVN6OE36m/xS', N'م. محمود رضوان (لجنة البت)', N'CommitteeMember', N'لجنة البت الفني والمالي', N'2026-10-27 07:47:09', 1);
INSERT INTO Users (UserId, Username, PasswordHash, FullName, Role, Department, CreatedAt, IsActive) VALUES (4, N'finance_user', N'$2a$10$HoojbN3OWw1rZzg3CBAJdO6EXIAhGhfQSW.1PmTb6GVN6OE36m/xS', N'أشرف جلال (المراجع المالي)', N'FinancialAuditor', N'إدارة الشئون المالية', N'2026-10-27 07:47:09', 1);
INSERT INTO Users (UserId, Username, PasswordHash, FullName, Role, Department, CreatedAt, IsActive) VALUES (5, N'vendor_user', N'$2a$10$HoojbN3OWw1rZzg3CBAJdO6EXIAhGhfQSW.1PmTb6GVN6OE36m/xS', N'منى خليل (مسؤول الموردين)', N'VendorManager', N'إدارة سجل الموردين والمقاولين', N'2026-10-27 07:47:09', 1);
INSERT INTO Users (UserId, Username, PasswordHash, FullName, Role, Department, CreatedAt, IsActive) VALUES (6, N'security_user', N'$2a$10$HoojbN3OWw1rZzg3CBAJdO6EXIAhGhfQSW.1PmTb6GVN6OE36m/xS', N'كمال فاروق (المراجع الأمني)', N'Auditor', N'إدارة المتابعة والتفتيش', N'2026-10-27 07:47:09', 1);
GO
SET IDENTITY_INSERT Users OFF;
GO

-- ============================================================================
-- DATA: SupplyCategories (66 records)
-- ============================================================================
INSERT INTO SupplyCategories (CategoryId, CategoryName) VALUES (1, N'المواسير بأنوعها و البلوف و المحابس و القطع المخصوص');
INSERT INTO SupplyCategories (CategoryId, CategoryName) VALUES (2, N'الأغطيه الخرسانية');
INSERT INTO SupplyCategories (CategoryId, CategoryName) VALUES (3, N'برابخ الفخار');
INSERT INTO SupplyCategories (CategoryId, CategoryName) VALUES (4, N'أغطيه صلب');
INSERT INTO SupplyCategories (CategoryId, CategoryName) VALUES (5, N'السيارات بأنواعها');
INSERT INTO SupplyCategories (CategoryId, CategoryName) VALUES (6, N'قطع غيار السيارات النقل بأنواعها');
INSERT INTO SupplyCategories (CategoryId, CategoryName) VALUES (7, N'قطع غيار السيارات الركايب بأنواعها');
INSERT INTO SupplyCategories (CategoryId, CategoryName) VALUES (8, N'قطع غيار الأوناش');
INSERT INTO SupplyCategories (CategoryId, CategoryName) VALUES (9, N'مواد و مهمات و خامات لورش اللحام و الحداده و الجكمان');
INSERT INTO SupplyCategories (CategoryId, CategoryName) VALUES (10, N'مواد و مهمات و خامات لورش الخراطة و البراده');
INSERT INTO SupplyCategories (CategoryId, CategoryName) VALUES (11, N'مواد و مهمات و خامات و سيور لورش الكاوتشوك');
INSERT INTO SupplyCategories (CategoryId, CategoryName) VALUES (12, N'مواد و مهمات لورش النقش و الدوكو');
INSERT INTO SupplyCategories (CategoryId, CategoryName) VALUES (13, N'مواد و مهمات لورش السروجية');
INSERT INTO SupplyCategories (CategoryId, CategoryName) VALUES (14, N'قطع الغيار الميكانيكية لمحطات التنقية و المعالجة');
INSERT INTO SupplyCategories (CategoryId, CategoryName) VALUES (15, N'قطع الغيار الكهربائية لمحطات التنقية و المعالجة');
INSERT INTO SupplyCategories (CategoryId, CategoryName) VALUES (16, N'مواد و مهمات لورش سمكرة السيارات');
INSERT INTO SupplyCategories (CategoryId, CategoryName) VALUES (17, N'رولمان بلى');
INSERT INTO SupplyCategories (CategoryId, CategoryName) VALUES (18, N'مواد و مهمات لورش الردياتير');
INSERT INTO SupplyCategories (CategoryId, CategoryName) VALUES (19, N'مواد و مهمات لورش النجارة');
INSERT INTO SupplyCategories (CategoryId, CategoryName) VALUES (20, N'مواد و مهمات لورش الكهرباء لجميع انواع السيارات');
INSERT INTO SupplyCategories (CategoryId, CategoryName) VALUES (21, N'أجهزة و معدات الامن الصناعى و أجهزة الأطفاء');
INSERT INTO SupplyCategories (CategoryId, CategoryName) VALUES (22, N'مواد و مهمات الاسعاف');
INSERT INTO SupplyCategories (CategoryId, CategoryName) VALUES (23, N'الخراطيم و الكاوتشكوك و غيرها اللازمة لمعدات الصرف الصحى');
INSERT INTO SupplyCategories (CategoryId, CategoryName) VALUES (24, N'الطلمبات بأنوعها و قطع غيارها');
INSERT INTO SupplyCategories (CategoryId, CategoryName) VALUES (25, N'المولدات بأنوعها و قطع غيارها');
INSERT INTO SupplyCategories (CategoryId, CategoryName) VALUES (26, N'مواد و مهمات و أدوات البناء (طوب – رمل – زلط ...... إلخ)');
INSERT INTO SupplyCategories (CategoryId, CategoryName) VALUES (27, N'المهمات و الأدوات الكهربائية');
INSERT INTO SupplyCategories (CategoryId, CategoryName) VALUES (28, N'الأدوات و المهمات المكتبية');
INSERT INTO SupplyCategories (CategoryId, CategoryName) VALUES (29, N'أدوات النظافة');
INSERT INTO SupplyCategories (CategoryId, CategoryName) VALUES (30, N'إطارات كاوتشوك لجميع أنواع السيارات');
INSERT INTO SupplyCategories (CategoryId, CategoryName) VALUES (31, N'أجهزة المعامل و كيماويات');
INSERT INTO SupplyCategories (CategoryId, CategoryName) VALUES (32, N'قطع غيار المعامل و مواد و مهمات المعامل');
INSERT INTO SupplyCategories (CategoryId, CategoryName) VALUES (33, N'البطاريات لجميع أنواع السيارات');
INSERT INTO SupplyCategories (CategoryId, CategoryName) VALUES (34, N'ضواغط الهواء للمحطات');
INSERT INTO SupplyCategories (CategoryId, CategoryName) VALUES (35, N'أدوات الصيانة و الشبكة');
INSERT INTO SupplyCategories (CategoryId, CategoryName) VALUES (36, N'أسياخ التسليك الصلب');
INSERT INTO SupplyCategories (CategoryId, CategoryName) VALUES (37, N'أجهزة الفاكس');
INSERT INTO SupplyCategories (CategoryId, CategoryName) VALUES (38, N'أجهزة الحاسب الآلى');
INSERT INTO SupplyCategories (CategoryId, CategoryName) VALUES (39, N'مستلزمات الحاسب الآلى');
INSERT INTO SupplyCategories (CategoryId, CategoryName) VALUES (40, N'برامج إدارة المعلومات');
INSERT INTO SupplyCategories (CategoryId, CategoryName) VALUES (41, N'أجهزة اللاسلكى');
INSERT INTO SupplyCategories (CategoryId, CategoryName) VALUES (42, N'أجهزة السنترال');
INSERT INTO SupplyCategories (CategoryId, CategoryName) VALUES (43, N'إحتياجات الحدائق و التشجير');
INSERT INTO SupplyCategories (CategoryId, CategoryName) VALUES (44, N'مبيدات لمكافحة الحشرات');
INSERT INTO SupplyCategories (CategoryId, CategoryName) VALUES (45, N'مهمات و معاجين و دهانات');
INSERT INTO SupplyCategories (CategoryId, CategoryName) VALUES (46, N'المطبوعات');
INSERT INTO SupplyCategories (CategoryId, CategoryName) VALUES (47, N'التفتيش على التوريدات');
INSERT INTO SupplyCategories (CategoryId, CategoryName) VALUES (48, N'مغيرات السرعة للطلمبات بأنواعها');
INSERT INTO SupplyCategories (CategoryId, CategoryName) VALUES (49, N'بادئات التشغيل بأنوعها');
INSERT INTO SupplyCategories (CategoryId, CategoryName) VALUES (50, N'المشغلات الكهربائية للمحابس و البوابات');
INSERT INTO SupplyCategories (CategoryId, CategoryName) VALUES (51, N'الحاكمات المنطقية المبرمجة ( PLC )');
INSERT INTO SupplyCategories (CategoryId, CategoryName) VALUES (52, N'برامج إدارة و صيانة الأصول');
INSERT INTO SupplyCategories (CategoryId, CategoryName) VALUES (53, N'نظم تجميع البيانات و المراقبة و التحكم بالحاسب الآلى Scada');
INSERT INTO SupplyCategories (CategoryId, CategoryName) VALUES (54, N'كابلات الألياف الضوئية و مستلزماتها Fiberoptic');
INSERT INTO SupplyCategories (CategoryId, CategoryName) VALUES (55, N'الكارتات الالكترونية');
INSERT INTO SupplyCategories (CategoryId, CategoryName) VALUES (56, N'أجهزة الحماية و التحكم الالكترونية');
INSERT INTO SupplyCategories (CategoryId, CategoryName) VALUES (57, N'أجهزة القياس');
INSERT INTO SupplyCategories (CategoryId, CategoryName) VALUES (58, N'البرامج الخاصة ببرمجة الاجهزة الالكترونية Softwares');
INSERT INTO SupplyCategories (CategoryId, CategoryName) VALUES (59, N'أغطية GRP');
INSERT INTO SupplyCategories (CategoryId, CategoryName) VALUES (60, N'فلاتر بجميع أنواعها');
INSERT INTO SupplyCategories (CategoryId, CategoryName) VALUES (61, N'بلومير');
INSERT INTO SupplyCategories (CategoryId, CategoryName) VALUES (62, N'آلات تصوير و مستلزماتها');
INSERT INTO SupplyCategories (CategoryId, CategoryName) VALUES (63, N'زيوت و شحومات');
INSERT INTO SupplyCategories (CategoryId, CategoryName) VALUES (64, N'توريد مشتملات منظومة الطاقة الشمسية');
INSERT INTO SupplyCategories (CategoryId, CategoryName) VALUES (65, N'توريد تكييفات');
INSERT INTO SupplyCategories (CategoryId, CategoryName) VALUES (66, N'توريد معدات ثقيلة (لوادر – اوناش)');
GO

-- ============================================================================
-- DATA: Vendors (4 records)
-- ============================================================================
SET IDENTITY_INSERT Vendors ON;
GO
INSERT INTO Vendors (VendorId, CompanyName, VendorType, LegalEntity, CompanyType, Address, Phone, Fax, Email, TaxCardNo, TaxCardExpiry, CommercialRegisterNo, CommercialRegisterExpiry, CategoryGroup, ConstructionGrade, ConstructionBranch, IsRegistered, HasPreviousWorks, IsBlacklisted, BlacklistReason, BlacklistAuthority, BlacklistDate, UnblacklistedReason, UnblacklistedAuthority, UnblacklistedDate, IsDeleted, CreatedAt) VALUES (1, N'شركة الحمد للتجارة والتوريدات الفنية', N'مورد', N'شركة مساهمة', N'أفراد', N'11 ش الكهرمان الحضرة القبلية الاسكندرية', N'01012345678', NULL, NULL, N'100-200-300', N'2027-12-31', N'CR-45120', N'2027-12-31', N'المواسير بأنوعها و البلوف و المحابس', N'غير مجدول', NULL, 1, 1, 0, NULL, NULL, NULL, NULL, NULL, NULL, 0, N'2026-10-27 07:47:09');
INSERT INTO Vendors (VendorId, CompanyName, VendorType, LegalEntity, CompanyType, Address, Phone, Fax, Email, TaxCardNo, TaxCardExpiry, CommercialRegisterNo, CommercialRegisterExpiry, CategoryGroup, ConstructionGrade, ConstructionBranch, IsRegistered, HasPreviousWorks, IsBlacklisted, BlacklistReason, BlacklistAuthority, BlacklistDate, UnblacklistedReason, UnblacklistedAuthority, UnblacklistedDate, IsDeleted, CreatedAt) VALUES (2, N'شركة الإسكندرية لمقاولات شبكات الصرف', N'مقاول', N'شركة مساهمة', N'أفراد', N'ابراج الند مارك سموحة الاسكندرية', N'01234567890', NULL, NULL, N'102-202-302', N'2028-06-30', N'CR-88210', N'2028-06-30', N'أعمال المقاولات والإنشاءات', N'الأولى', N'شبكات المياه والصرف الصحي', 1, 1, 0, NULL, NULL, NULL, NULL, NULL, NULL, 0, N'2026-10-27 07:47:09');
INSERT INTO Vendors (VendorId, CompanyName, VendorType, LegalEntity, CompanyType, Address, Phone, Fax, Email, TaxCardNo, TaxCardExpiry, CommercialRegisterNo, CommercialRegisterExpiry, CategoryGroup, ConstructionGrade, ConstructionBranch, IsRegistered, HasPreviousWorks, IsBlacklisted, BlacklistReason, BlacklistAuthority, BlacklistDate, UnblacklistedReason, UnblacklistedAuthority, UnblacklistedDate, IsDeleted, CreatedAt) VALUES (3, N'شركة الكينج للمعدات والخدمات البترولية', N'مؤدي خدمة', N'شركة ذات مسؤولية محدودة', N'أفراد', N'العامرية ك 35 الطريق الصحراوى', N'01123456789', NULL, NULL, N'101-201-301', N'2026-11-15', N'CR-77450', N'2026-11-15', N'قطع غيار الأوناش والمعدات', N'الرابعة', N'الصيانة والمهمات', 1, 1, 0, NULL, NULL, NULL, NULL, NULL, NULL, 0, N'2026-10-27 07:47:09');
INSERT INTO Vendors (VendorId, CompanyName, VendorType, LegalEntity, CompanyType, Address, Phone, Fax, Email, TaxCardNo, TaxCardExpiry, CommercialRegisterNo, CommercialRegisterExpiry, CategoryGroup, ConstructionGrade, ConstructionBranch, IsRegistered, HasPreviousWorks, IsBlacklisted, BlacklistReason, BlacklistAuthority, BlacklistDate, UnblacklistedReason, UnblacklistedAuthority, UnblacklistedDate, IsDeleted, CreatedAt) VALUES (4, N'شركة السماح للمقاولات العمومية', N'مقاول', N'شركة ذات مسؤولية محدودة', N'أفراد', N'شارع النصر الاسكندرية', N'01099988877', NULL, NULL, N'103-203-303', N'2024-01-10', N'CR-12003', N'2024-01-10', N'أعمال الصيانة', N'السادسة', N'أعمال الصيانة', 0, 0, 1, N'مخالفة كراسة الشروط والتأخر الجسيم في التنفيذ', N'مجلس الإدارة', N'2024-05-15', N'تم سداد الغرامات وتوفيق الأوضاع بموجب قرار مجلس الإدارة رقم 45', N'مجلس الإدارة', N'2026-10-27', 0, N'2026-10-27 07:47:09');
GO
SET IDENTITY_INSERT Vendors OFF;
GO

-- ============================================================================
-- DATA: ContractorGroups (9 records)
-- ============================================================================
SET IDENTITY_INSERT ContractorGroups ON;
GO
INSERT INTO ContractorGroups (GroupId, GroupName, GroupDescription, WorkScope, IsActive, CreatedAt) VALUES (1, N'أعمال البناء والتشييد العامة', N'مجموعة أعمال البناء والإنشاء العام', N'بناء وتشييد المباني والمنشآت العامة', 1, N'2026-11-18 10:33:27');
INSERT INTO ContractorGroups (GroupId, GroupName, GroupDescription, WorkScope, IsActive, CreatedAt) VALUES (2, N'شبكات المياه والصرف الصحي', N'مجموعة شبكات المياه ومحطات المعالجة', N'مد وإصلاح شبكات المياه والصرف وأعمال محطات المعالجة', 1, N'2026-11-18 10:33:27');
INSERT INTO ContractorGroups (GroupId, GroupName, GroupDescription, WorkScope, IsActive, CreatedAt) VALUES (3, N'الأعمال الكهربائية', N'مجموعة المقاولين الكهربائيين', N'أعمال الكهرباء والتمديدات والمحطات الكهربائية', 1, N'2026-11-18 10:33:27');
INSERT INTO ContractorGroups (GroupId, GroupName, GroupDescription, WorkScope, IsActive, CreatedAt) VALUES (4, N'الأعمال الميكانيكية', N'مجموعة المقاولين الميكانيكيين', N'تركيب وصيانة الماكينات والمضخات والمعدات الميكانيكية', 1, N'2026-11-18 10:33:27');
INSERT INTO ContractorGroups (GroupId, GroupName, GroupDescription, WorkScope, IsActive, CreatedAt) VALUES (5, N'الطرق والبنية التحتية', N'مجموعة أعمال الطرق والبنية التحتية', N'إنشاء وإصلاح الطرق والأرصفة والبنية التحتية', 1, N'2026-11-18 10:33:27');
INSERT INTO ContractorGroups (GroupId, GroupName, GroupDescription, WorkScope, IsActive, CreatedAt) VALUES (6, N'الأعمال المعمارية والتشطيبات', N'مجموعة أعمال التشطيبات الداخلية والخارجية', N'أعمال الدهانات والسيراميك والأعمال المعمارية', 1, N'2026-11-18 10:33:27');
INSERT INTO ContractorGroups (GroupId, GroupName, GroupDescription, WorkScope, IsActive, CreatedAt) VALUES (7, N'الأعمال المدنية والجسور', N'مجموعة المقاولين المدنيين', N'إنشاء الكباري والجسور والأعمال المدنية الكبرى', 1, N'2026-11-18 10:33:27');
INSERT INTO ContractorGroups (GroupId, GroupName, GroupDescription, WorkScope, IsActive, CreatedAt) VALUES (8, N'أعمال الحراسة والأمن', N'مجموعة شركات الحراسة والأمن الصناعي', N'تقديم خدمات الحراسة والأمن والسلامة الصناعية', 1, N'2026-11-18 10:33:27');
INSERT INTO ContractorGroups (GroupId, GroupName, GroupDescription, WorkScope, IsActive, CreatedAt) VALUES (9, N'الخدمات والصيانة العامة', N'مجموعة شركات الخدمات والصيانة المتنوعة', N'تقديم خدمات الصيانة والنظافة وأعمال الخدمات العامة', 1, N'2026-11-18 10:33:27');
GO
SET IDENTITY_INSERT ContractorGroups OFF;
GO

-- ============================================================================
-- DATA: WarehouseInventory (8 records)
-- ============================================================================
SET IDENTITY_INSERT WarehouseInventory ON;
GO
INSERT INTO WarehouseInventory (ProductId, ProductName, ProductCode, CategoryId, Unit, CurrentStock, MinimumStock, Location, IsActive, CreatedAt) VALUES (1, N'مواسير PVC قطر 150مم', N'PIPE-PVC-150', NULL, N'متر', 500, 100, N'مخزن رقم 1', 1, N'2026-11-18 10:33:27');
INSERT INTO WarehouseInventory (ProductId, ProductName, ProductCode, CategoryId, Unit, CurrentStock, MinimumStock, Location, IsActive, CreatedAt) VALUES (2, N'صمامات بوابة 6 بوصة', N'VLV-GATE-6', NULL, N'عدد', 25, 5, N'مخزن رقم 2', 1, N'2026-11-18 10:33:27');
INSERT INTO WarehouseInventory (ProductId, ProductName, ProductCode, CategoryId, Unit, CurrentStock, MinimumStock, Location, IsActive, CreatedAt) VALUES (3, N'مضخة طرد مركزي 10HP', N'PUMP-CF-10', NULL, N'عدد', 3, 1, N'مخزن رقم 3', 1, N'2026-11-18 10:33:27');
INSERT INTO WarehouseInventory (ProductId, ProductName, ProductCode, CategoryId, Unit, CurrentStock, MinimumStock, Location, IsActive, CreatedAt) VALUES (4, N'كابل كهربائي 50مم2', N'CABLE-50', NULL, N'متر', 200, 50, N'مخزن رقم 4', 1, N'2026-11-18 10:33:27');
INSERT INTO WarehouseInventory (ProductId, ProductName, ProductCode, CategoryId, Unit, CurrentStock, MinimumStock, Location, IsActive, CreatedAt) VALUES (5, N'زيت هيدروليك ISO 46', N'OIL-HYD-46', NULL, N'لتر', 150, 30, N'مخزن رقم 5', 1, N'2026-11-18 10:33:27');
INSERT INTO WarehouseInventory (ProductId, ProductName, ProductCode, CategoryId, Unit, CurrentStock, MinimumStock, Location, IsActive, CreatedAt) VALUES (6, N'مفتاح كهربائي 3 فاز 100A', N'SW-3P-100', NULL, N'عدد', 10, 2, N'مخزن رقم 2', 1, N'2026-11-18 10:33:27');
INSERT INTO WarehouseInventory (ProductId, ProductName, ProductCode, CategoryId, Unit, CurrentStock, MinimumStock, Location, IsActive, CreatedAt) VALUES (7, N'أنابيب GRP قطر 300مم', N'PIPE-GRP-300', NULL, N'متر', 80, 20, N'المخزن الخارجي', 1, N'2026-11-18 10:33:27');
INSERT INTO WarehouseInventory (ProductId, ProductName, ProductCode, CategoryId, Unit, CurrentStock, MinimumStock, Location, IsActive, CreatedAt) VALUES (8, N'قواعد توزيع كهربائي لوحة 24 خط', N'PANEL-24', NULL, N'عدد', 2, 1, N'مخزن رقم 2', 1, N'2026-11-18 10:33:27');
GO
SET IDENTITY_INSERT WarehouseInventory OFF;
GO

-- ============================================================================
-- DATA: NeedsRequests (2 records)
-- ============================================================================
SET IDENTITY_INSERT NeedsRequests ON;
GO
INSERT INTO NeedsRequests (RequestId, OperationName, OperationType, EstimatedValue, RequestingDepartment, BudgetHoldReference, ExecutionDuration, FiscalYear, ReservationType, InitialReservation, ApprovalAuthorityDate, SubmittalType, WarehouseBalance, ConstructionBranch, RequiredGrade, Status, IsDeleted, CreatedAt, SpecsAndConditions, RequiresSample, SampleDetails, WarehouseQuerySent, WarehouseQueryResponse, WarehouseQueryResponseDate, FinancialOperationNumber, FinancialOperationSymbol, TenderMethodSelected, PreliminaryReservation, ReservationTypeNew, BookletPrice, OperationTerms, ConstructionDivision, ConstructionCategory, ApprovalAuthority, AuthorityApprovalStatus, AuthorityApprovalDate, AuthorityRejectionReason, WorkflowStatus, InitialGuaranteePercent, OperationItems, FinancialNotes, FinancialReviewedAt, FinancialReviewedBy, AuthorityReviewedAt, AuthorityReviewedBy, FinancialApprovalObtained, FinancialApprovalDate, FinancialApprovalNotes, BookletFileName, BookletFilePath, TechnicalEvaluationMethod, MinPassingScore, AllowSplitAwarding, TechnicalCriteriaNotes) VALUES (1, N'ddddd', N'تعاقدات', 500.00, N'إدارة الموارد البشرية', N'', N'3 اشهر', N'2025/2026', NULL, 4, NULL, N'مظروفيين', N'لا يوجد رصيد', NULL, NULL, N'معلق', 0, N'2026-11-22 08:31:11', N'ءءءء', 0, N'', 0, NULL, NULL, N'1/2025/2026/م ح', N'م ح', N'ممارسة محدودة', 4, N'جاري', 100, N'', N'', N'', N'رئيس مجلس الإدارة', N'معتمد', N'2026-11-22', N'', N'معتمد', 2, N'[{"description":"صنف معدل","unit":"عدد","quantity":5,"unitPrice":100,"specs":"مواصفة","itemMaxScore":100,"itemMinPassingScore":70,"itemCriteria":"معايير","allowSplit":true,"isExpanded":false}]', N'', N'2026-11-22 08:36:14', NULL, N'2026-11-22 12:25:47', N'المشرف', 1, N'2026-11-22', N'ملاحظة تجريبية', NULL, NULL, N'نظام نقاط', 70, 1, N'معايير تجريبية');
INSERT INTO NeedsRequests (RequestId, OperationName, OperationType, EstimatedValue, RequestingDepartment, BudgetHoldReference, ExecutionDuration, FiscalYear, ReservationType, InitialReservation, ApprovalAuthorityDate, SubmittalType, WarehouseBalance, ConstructionBranch, RequiredGrade, Status, IsDeleted, CreatedAt, SpecsAndConditions, RequiresSample, SampleDetails, WarehouseQuerySent, WarehouseQueryResponse, WarehouseQueryResponseDate, FinancialOperationNumber, FinancialOperationSymbol, TenderMethodSelected, PreliminaryReservation, ReservationTypeNew, BookletPrice, OperationTerms, ConstructionDivision, ConstructionCategory, ApprovalAuthority, AuthorityApprovalStatus, AuthorityApprovalDate, AuthorityRejectionReason, WorkflowStatus, InitialGuaranteePercent, OperationItems, FinancialNotes, FinancialReviewedAt, FinancialReviewedBy, AuthorityReviewedAt, AuthorityReviewedBy, FinancialApprovalObtained, FinancialApprovalDate, FinancialApprovalNotes, BookletFileName, BookletFilePath, TechnicalEvaluationMethod, MinPassingScore, AllowSplitAwarding, TechnicalCriteriaNotes) VALUES (2, N'ddddd', N'تعاقدات', 0, N'قطاع المياه', NULL, N'3 اشهر', N'2025/2026', NULL, NULL, NULL, NULL, NULL, NULL, NULL, N'معلق', 0, N'2026-11-22 12:06:12', N'ب', 1, N'ب', 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, N'في انتظار الموافقة', NULL, NULL, N'في انتظار المالية', 2, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, N'مطابق أو غير مطابق', 70, 0, NULL);
GO
SET IDENTITY_INSERT NeedsRequests OFF;
GO

-- ============================================================================
-- DATA: Tenders (2 records)
-- ============================================================================
SET IDENTITY_INSERT Tenders ON;
GO
INSERT INTO Tenders (TenderId, RequestId, TenderNumber, TenderSymbol, TenderName, TenderMethod, RequestingDepartment, BudgetHoldReference, FiscalYear, BaseBookletPrice, CalculatedBookletPrice, InitialGuaranteeAmount, EnvelopeOpeningDate, AdNewspaper1, AdNewspaper2, AdPublishDate, AdDetails, EvaluationMethod, PassingScoreDecimal, RequiresSample, SampleDetails, Status, IsDeleted, CreatedAt, HasSubFileDistribution, SubFileDistributionId, BookletFileName, BookletFilePath, BookletFileSize, BookletUploadedAt, BookletFileContent, AllowSplitAwarding, TechnicalCriteriaNotes, OperationType, ExecutionDuration, WarehouseBalance, SpecsAndConditions, ReservationType, EstimatedValue, ConstructionDivision, ConstructionCategory, FinancialApprovalObtained, FinancialApprovalDate, FinancialApprovalNotes, InvitedVendorsCount, InvitedVendorsJson) VALUES (1, NULL, N'99/2025/2026-هـ', N'هـ', N'عملية صيانة وإحلال محطة رفع سموحة', N'مناقصة عامة', N'إدارة التشغيل والصيانة', N'مذكرة حجز رقم 402/2025', N'2025/2026', 500, 715, 75000, N'2026-11-15 11:00:00', NULL, NULL, NULL, NULL, N'تقرير فني', NULL, 0, NULL, N'نشط', 0, N'2026-10-27 07:52:02', 0, NULL, NULL, NULL, 0, NULL, NULL, 0, NULL, N'توريدات', NULL, NULL, NULL, N'موازنة الشركة', 500.00, NULL, NULL, 0, NULL, NULL, 0, NULL);
INSERT INTO Tenders (TenderId, RequestId, TenderNumber, TenderSymbol, TenderName, TenderMethod, RequestingDepartment, BudgetHoldReference, FiscalYear, BaseBookletPrice, CalculatedBookletPrice, InitialGuaranteeAmount, EnvelopeOpeningDate, AdNewspaper1, AdNewspaper2, AdPublishDate, AdDetails, EvaluationMethod, PassingScoreDecimal, RequiresSample, SampleDetails, Status, IsDeleted, CreatedAt, HasSubFileDistribution, SubFileDistributionId, BookletFileName, BookletFilePath, BookletFileSize, BookletUploadedAt, BookletFileContent, AllowSplitAwarding, TechnicalCriteriaNotes, OperationType, ExecutionDuration, WarehouseBalance, SpecsAndConditions, ReservationType, EstimatedValue, ConstructionDivision, ConstructionCategory, FinancialApprovalObtained, FinancialApprovalDate, FinancialApprovalNotes, InvitedVendorsCount, InvitedVendorsJson) VALUES (2, NULL, N'T-2783/2025/2026-هـ', N'هـ', N'عملية صيانة وإحلال محطة رفع سموحة', N'مناقصة عامة', N'إدارة التشغيل والصيانة', N'مذكرة حجز رقم 402/2025', N'2025/2026', 500, 715, 75000, N'2026-11-15 11:00:00', NULL, NULL, NULL, NULL, N'تقرير فني', NULL, 0, NULL, N'مكتمل التوريد والتسليم', 0, N'2026-10-27 07:59:02', 0, NULL, NULL, NULL, 0, NULL, NULL, 0, NULL, N'توريدات', NULL, NULL, NULL, N'موازنة الشركة', 500.00, NULL, NULL, 0, NULL, NULL, 0, NULL);
GO
SET IDENTITY_INSERT Tenders OFF;
GO

-- ============================================================================
-- DATA: TenderItems (6 records)
-- ============================================================================
SET IDENTITY_INSERT TenderItems ON;
GO
INSERT INTO TenderItems (ItemId, TenderId, ItemNumber, ItemDescription, Unit, EstimatedQuantity, EstimatedUnitPrice, Notes, ItemSpecs, ItemMaxScore, ItemMinPassingScore, ItemCriteria, AllowSplit) VALUES (1, 1, 1, N'محبس فراشة قطر 600 مم ضغط 16 بار', N'عدد', 4, 120000, NULL, NULL, 100, 70, NULL, 1);
INSERT INTO TenderItems (ItemId, TenderId, ItemNumber, ItemDescription, Unit, EstimatedQuantity, EstimatedUnitPrice, Notes, ItemSpecs, ItemMaxScore, ItemMinPassingScore, ItemCriteria, AllowSplit) VALUES (2, 1, 2, N'طلمبة غاطسة تصرف 500 لتر/ثانية', N'عدد', 2, 650000, NULL, NULL, 100, 70, NULL, 1);
INSERT INTO TenderItems (ItemId, TenderId, ItemNumber, ItemDescription, Unit, EstimatedQuantity, EstimatedUnitPrice, Notes, ItemSpecs, ItemMaxScore, ItemMinPassingScore, ItemCriteria, AllowSplit) VALUES (3, 1, 3, N'وصلة حائط مرنة صلب', N'طقم', 4, 25000, NULL, NULL, 100, 70, NULL, 1);
INSERT INTO TenderItems (ItemId, TenderId, ItemNumber, ItemDescription, Unit, EstimatedQuantity, EstimatedUnitPrice, Notes, ItemSpecs, ItemMaxScore, ItemMinPassingScore, ItemCriteria, AllowSplit) VALUES (4, 2, 1, N'محبس فراشة قطر 600 مم ضغط 16 بار', N'عدد', 4, 120000, NULL, NULL, 100, 70, NULL, 1);
INSERT INTO TenderItems (ItemId, TenderId, ItemNumber, ItemDescription, Unit, EstimatedQuantity, EstimatedUnitPrice, Notes, ItemSpecs, ItemMaxScore, ItemMinPassingScore, ItemCriteria, AllowSplit) VALUES (5, 2, 2, N'طلمبة غاطسة تصرف 500 لتر/ثانية', N'عدد', 2, 650000, NULL, NULL, 100, 70, NULL, 1);
INSERT INTO TenderItems (ItemId, TenderId, ItemNumber, ItemDescription, Unit, EstimatedQuantity, EstimatedUnitPrice, Notes, ItemSpecs, ItemMaxScore, ItemMinPassingScore, ItemCriteria, AllowSplit) VALUES (6, 2, 3, N'وصلة حائط مرنة صلب', N'طقم', 4, 25000, NULL, NULL, 100, 70, NULL, 1);
GO
SET IDENTITY_INSERT TenderItems OFF;
GO

-- ============================================================================
-- DATA: BidSubmissions (6 records)
-- ============================================================================
SET IDENTITY_INSERT BidSubmissions ON;
GO
INSERT INTO BidSubmissions (SubmissionId, TenderId, VendorId, BidFractionSerial, SubmissionDate, InitialInsuranceAmount, GuaranteePaymentMethod, InitialInsuranceStatus, ReceiptNumber, ReceiptDate, CheckNumber, BankName, CheckDate, GuaranteeLetterNo, GuaranteeLetterIssueDate, GuaranteeLetterExpiryDate, DeductionNoteNo, DeductionNoteDate, DeductionEntity, HasCommercialRegister, CommercialRegisterNo, CommercialRegisterValidUntil, HasTaxCard, TaxCardNo, TaxCardValidUntil, HasFederationCert, FederationGrade, HasEInvoiceModel, HasAdvancePaymentCert, HasPreviousWorks, HasVATCert, HasCatalog, HasCert14S, HasCert4S, HasApprovalCert, SampleSubmitted, SampleNumber, SampleDeliveryDate, SampleNotes, TechnicalStatus, TechnicalScore, FinancialTotalAmount, FinalRank, IsDeleted) VALUES (1, 1, 1, N'1/3', N'2026-10-27 07:52:02', 75000, N'خطاب ضمان', N'ساري', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, NULL, NULL, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, N'مقبول', NULL, 1750000, NULL, 0);
INSERT INTO BidSubmissions (SubmissionId, TenderId, VendorId, BidFractionSerial, SubmissionDate, InitialInsuranceAmount, GuaranteePaymentMethod, InitialInsuranceStatus, ReceiptNumber, ReceiptDate, CheckNumber, BankName, CheckDate, GuaranteeLetterNo, GuaranteeLetterIssueDate, GuaranteeLetterExpiryDate, DeductionNoteNo, DeductionNoteDate, DeductionEntity, HasCommercialRegister, CommercialRegisterNo, CommercialRegisterValidUntil, HasTaxCard, TaxCardNo, TaxCardValidUntil, HasFederationCert, FederationGrade, HasEInvoiceModel, HasAdvancePaymentCert, HasPreviousWorks, HasVATCert, HasCatalog, HasCert14S, HasCert4S, HasApprovalCert, SampleSubmitted, SampleNumber, SampleDeliveryDate, SampleNotes, TechnicalStatus, TechnicalScore, FinancialTotalAmount, FinalRank, IsDeleted) VALUES (2, 1, 2, N'2/3', N'2026-10-27 07:52:02', 75000, N'نقداً', N'ساري', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, NULL, NULL, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, N'مقبول', NULL, 1620000, NULL, 0);
INSERT INTO BidSubmissions (SubmissionId, TenderId, VendorId, BidFractionSerial, SubmissionDate, InitialInsuranceAmount, GuaranteePaymentMethod, InitialInsuranceStatus, ReceiptNumber, ReceiptDate, CheckNumber, BankName, CheckDate, GuaranteeLetterNo, GuaranteeLetterIssueDate, GuaranteeLetterExpiryDate, DeductionNoteNo, DeductionNoteDate, DeductionEntity, HasCommercialRegister, CommercialRegisterNo, CommercialRegisterValidUntil, HasTaxCard, TaxCardNo, TaxCardValidUntil, HasFederationCert, FederationGrade, HasEInvoiceModel, HasAdvancePaymentCert, HasPreviousWorks, HasVATCert, HasCatalog, HasCert14S, HasCert4S, HasApprovalCert, SampleSubmitted, SampleNumber, SampleDeliveryDate, SampleNotes, TechnicalStatus, TechnicalScore, FinancialTotalAmount, FinalRank, IsDeleted) VALUES (3, 1, 3, N'3/3', N'2026-10-27 07:52:02', 75000, N'شيك', N'ساري', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, NULL, NULL, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, N'مرفوض', NULL, 1400000, NULL, 0);
INSERT INTO BidSubmissions (SubmissionId, TenderId, VendorId, BidFractionSerial, SubmissionDate, InitialInsuranceAmount, GuaranteePaymentMethod, InitialInsuranceStatus, ReceiptNumber, ReceiptDate, CheckNumber, BankName, CheckDate, GuaranteeLetterNo, GuaranteeLetterIssueDate, GuaranteeLetterExpiryDate, DeductionNoteNo, DeductionNoteDate, DeductionEntity, HasCommercialRegister, CommercialRegisterNo, CommercialRegisterValidUntil, HasTaxCard, TaxCardNo, TaxCardValidUntil, HasFederationCert, FederationGrade, HasEInvoiceModel, HasAdvancePaymentCert, HasPreviousWorks, HasVATCert, HasCatalog, HasCert14S, HasCert4S, HasApprovalCert, SampleSubmitted, SampleNumber, SampleDeliveryDate, SampleNotes, TechnicalStatus, TechnicalScore, FinancialTotalAmount, FinalRank, IsDeleted) VALUES (4, 2, 1, N'1/3', N'2026-10-27 07:59:02', 75000, N'خطاب ضمان', N'ساري', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, NULL, NULL, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, N'مقبول', NULL, 1750000, NULL, 0);
INSERT INTO BidSubmissions (SubmissionId, TenderId, VendorId, BidFractionSerial, SubmissionDate, InitialInsuranceAmount, GuaranteePaymentMethod, InitialInsuranceStatus, ReceiptNumber, ReceiptDate, CheckNumber, BankName, CheckDate, GuaranteeLetterNo, GuaranteeLetterIssueDate, GuaranteeLetterExpiryDate, DeductionNoteNo, DeductionNoteDate, DeductionEntity, HasCommercialRegister, CommercialRegisterNo, CommercialRegisterValidUntil, HasTaxCard, TaxCardNo, TaxCardValidUntil, HasFederationCert, FederationGrade, HasEInvoiceModel, HasAdvancePaymentCert, HasPreviousWorks, HasVATCert, HasCatalog, HasCert14S, HasCert4S, HasApprovalCert, SampleSubmitted, SampleNumber, SampleDeliveryDate, SampleNotes, TechnicalStatus, TechnicalScore, FinancialTotalAmount, FinalRank, IsDeleted) VALUES (5, 2, 2, N'2/3', N'2026-10-27 07:59:02', 75000, N'نقداً', N'ساري', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, NULL, NULL, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, N'مقبول', NULL, 1620000, NULL, 0);
INSERT INTO BidSubmissions (SubmissionId, TenderId, VendorId, BidFractionSerial, SubmissionDate, InitialInsuranceAmount, GuaranteePaymentMethod, InitialInsuranceStatus, ReceiptNumber, ReceiptDate, CheckNumber, BankName, CheckDate, GuaranteeLetterNo, GuaranteeLetterIssueDate, GuaranteeLetterExpiryDate, DeductionNoteNo, DeductionNoteDate, DeductionEntity, HasCommercialRegister, CommercialRegisterNo, CommercialRegisterValidUntil, HasTaxCard, TaxCardNo, TaxCardValidUntil, HasFederationCert, FederationGrade, HasEInvoiceModel, HasAdvancePaymentCert, HasPreviousWorks, HasVATCert, HasCatalog, HasCert14S, HasCert4S, HasApprovalCert, SampleSubmitted, SampleNumber, SampleDeliveryDate, SampleNotes, TechnicalStatus, TechnicalScore, FinancialTotalAmount, FinalRank, IsDeleted) VALUES (6, 2, 3, N'3/3', N'2026-10-27 07:59:02', 75000, N'شيك', N'ساري', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, NULL, NULL, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, N'مرفوض', NULL, 1400000, NULL, 0);
GO
SET IDENTITY_INSERT BidSubmissions OFF;
GO

-- ============================================================================
-- DATA: Awardings (1 records)
-- ============================================================================
SET IDENTITY_INSERT Awardings ON;
GO
INSERT INTO Awardings (AwardingId, TenderId, WinnerSubmissionId, VendorId, AwardedAmount, AwardedAmountTafqeet, AuthorityApprovalDate, ReservationConfirmDate, BudgetSource, FinalGuaranteeAmount, FinalGuaranteeTafqeet, FinalGuaranteeStatus, FinalGuaranteePaymentMethod, ContractSigningDeadline, EngineeringStamp, AppliedStamp, DevelopmentStamp, ExtensionStamp, FederationFee, ShaheedStamp, TahyaMisrFund, PostalTransferFee, PurchaseOrderNo, PurchaseOrderDate, JournalDirectiveNo, JournalDirectiveDate, CreatedAt, AwardDate) VALUES (1, 2, 5, 2, 1620000, N'فقط مليون وستمائة وعشرون ألف جنيهاً مصرياً لا غير', N'2026-10-27', N'2026-10-27', N'موازنة الشركة', 81000, N'فقط واحد وثمانون ألف جنيهاً مصرياً لا غير', N'مسدد', NULL, N'2026-11-06', 0, 0, 0, 0, 0, 5, 0, 0, N'PO-2/1793087942786', NULL, N'JD-2/1793087942786', NULL, N'2026-10-27 07:59:02', N'2026-10-27');
GO
SET IDENTITY_INSERT Awardings OFF;
GO

-- ============================================================================
-- DATA: FinancialTransactions (1 records)
-- ============================================================================
SET IDENTITY_INSERT FinancialTransactions ON;
GO
INSERT INTO FinancialTransactions (TransactionId, TenderId, VendorId, TransactionType, DebitAccountCode, DebitAccountName, CreditAccountCode, CreditAccountName, Amount, AmountTafqeet, VoucherNumber, TransactionDate, Notes, CreatedAt) VALUES (1, 2, 1, N'رد التأمين الابتدائي', N'218401', N'حـ/ حسابات دائنة أخرى - تأمينات ابتدائية للعمليات (منه)', N'181001', N'حـ/ الحسابات الجارية بالبنوك أو الخزينة الرئيسية (له)', 75000, N'فقط خمسة وسبعون ألف جنيهاً مصرياً لا غير', N'RV-009901', N'2026-10-27 07:59:02', N'رد التأمين الابتدائي المسدد للمناقص (شركة الحمد للتجارة والتوريدات الفنية) لعملية (99/2025/2026-هـ) لعدم الترسية أو انتهاء الغرض', N'2026-10-27 07:59:02');
GO
SET IDENTITY_INSERT FinancialTransactions OFF;
GO

-- ============================================================================
-- DATA: DistributionDossiers (4 records)
-- ============================================================================
SET IDENTITY_INSERT DistributionDossiers ON;
GO
INSERT INTO DistributionDossiers (DossierId, TenderId, TargetDepartment, DispatchReference, DispatchDate, IncludedDocuments, ReceiptAcknowledged, ReceiptDate, ReceivedBy, Notes) VALUES (1, 2, N'الإدارة العامة للمخازن العامة', N'DISP-2-الإد', N'2026-10-27 07:59:02', N'["أمر التوريد","المواصفات الفنية","محضر البت"]', 0, NULL, NULL, N'ملف فرعي رسمي');
INSERT INTO DistributionDossiers (DossierId, TenderId, TargetDepartment, DispatchReference, DispatchDate, IncludedDocuments, ReceiptAcknowledged, ReceiptDate, ReceivedBy, Notes) VALUES (2, 2, N'قطاع المشروعات', N'DISP-2-قطاع', N'2026-10-27 07:59:02', N'["أمر التوريد","المواصفات الفنية","محضر البت"]', 0, NULL, NULL, N'ملف فرعي رسمي');
INSERT INTO DistributionDossiers (DossierId, TenderId, TargetDepartment, DispatchReference, DispatchDate, IncludedDocuments, ReceiptAcknowledged, ReceiptDate, ReceivedBy, Notes) VALUES (3, 2, N'إدارة التنسيق الخارجي والتسويات المالية', N'DISP-2-إدار', N'2026-10-27 07:59:02', N'["أمر التوريد","المواصفات الفنية","محضر البت"]', 0, NULL, NULL, N'ملف فرعي رسمي');
INSERT INTO DistributionDossiers (DossierId, TenderId, TargetDepartment, DispatchReference, DispatchDate, IncludedDocuments, ReceiptAcknowledged, ReceiptDate, ReceivedBy, Notes) VALUES (4, 2, N'إدارة الاحتياجات ومتابعة المخزون', N'DISP-2-إدار', N'2026-10-27 07:59:02', N'["أمر التوريد","المواصفات الفنية","محضر البت"]', 0, NULL, NULL, N'ملف فرعي رسمي');
GO
SET IDENTITY_INSERT DistributionDossiers OFF;
GO

-- ============================================================================
-- DATA: AuditLogs (4 records)
-- ============================================================================
SET IDENTITY_INSERT AuditLogs ON;
GO
INSERT INTO AuditLogs (LogId, UserId, Username, UserRole, Action, EntityName, EntityId, Details, IpAddress, Timestamp) VALUES (1, 1, N'sa', N'Admin', N'تقديم طلب احتياج', N'NeedsRequests', N'1', N'تم تقديم طلب احتياج: ddddd من إدارة: إدارة الموارد البشرية', N'::1', N'2026-11-22 08:31:11');
INSERT INTO AuditLogs (LogId, UserId, Username, UserRole, Action, EntityName, EntityId, Details, IpAddress, Timestamp) VALUES (2, 1, N'sa', N'Admin', N'مراجعة مالية للطلب', N'NeedsRequests', N'1', N'تمت المراجعة المالية لطلب رقم 1 - رقم العملية: 1/2025/2026/م ح - السلطة المختصة: رئيس مجلس الإدارة', N'::1', N'2026-11-22 08:36:14');
INSERT INTO AuditLogs (LogId, UserId, Username, UserRole, Action, EntityName, EntityId, Details, IpAddress, Timestamp) VALUES (3, 1, N'sa', N'Admin', N'رفض طلب احتياج', N'NeedsRequests', N'1', N'تم رفض طلب الاحتياج رقم 1 - السبب: ؤؤؤؤؤؤؤؤؤ', N'::1', N'2026-11-22 08:36:50');
INSERT INTO AuditLogs (LogId, UserId, Username, UserRole, Action, EntityName, EntityId, Details, IpAddress, Timestamp) VALUES (4, 1, N'sa', N'Admin', N'تقديم طلب احتياج', N'NeedsRequests', N'2', N'تم تقديم طلب احتياج: ddddd من إدارة: قطاع المياه', N'::1', N'2026-11-22 12:06:12');
GO
SET IDENTITY_INSERT AuditLogs OFF;
GO

-- ============================================================================
-- 23. VENDOR & CONTRACTOR DETAILED REGISTRY (Reg_*)
-- ============================================================================
IF OBJECT_ID('Reg_ContractorDocuments', 'U') IS NULL
BEGIN
    CREATE TABLE Reg_SupplyGroups (
        GroupId INT IDENTITY(1,1) PRIMARY KEY,
        GroupNo INT,
        GroupName NVARCHAR(300) NOT NULL UNIQUE
    );

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

    CREATE TABLE Reg_ContractGroups (
        GroupId INT IDENTITY(1,1) PRIMARY KEY,
        GroupNo INT,
        GroupName NVARCHAR(300) NOT NULL UNIQUE,
        RequirementType NVARCHAR(50) NOT NULL DEFAULT 'NONE'
    );

    CREATE TABLE Reg_ContractSubGroups (
        SubGroupId INT IDENTITY(1,1) PRIMARY KEY,
        GroupId INT NOT NULL FOREIGN KEY REFERENCES Reg_ContractGroups(GroupId) ON DELETE CASCADE,
        SubGroupName NVARCHAR(300) NOT NULL
    );

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
GO

