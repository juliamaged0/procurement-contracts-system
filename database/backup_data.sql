-- Backup from local SQLite
USE [ProcurementDB];
GO

-- Table: Users
SET IDENTITY_INSERT Users ON;
INSERT INTO Users (UserId, Username, PasswordHash, FullName, Role, Department, CreatedAt, IsActive) VALUES (1, N'sa', N'$2a$10$HoojbN3OWw1rZzg3CBAJdO6EXIAhGhfQSW.1PmTb6GVN6OE36m/xS', N'المشرف العام (Super Admin)', N'Admin', N'الإدارة العليا', N'2026-10-27 07:47:09', 1);
INSERT INTO Users (UserId, Username, PasswordHash, FullName, Role, Department, CreatedAt, IsActive) VALUES (2, N'tenders_user', N'$2a$10$HoojbN3OWw1rZzg3CBAJdO6EXIAhGhfQSW.1PmTb6GVN6OE36m/xS', N'أحمد سعيد (مسؤول الطرح)', N'TenderOfficer', N'إدارة الطرح والمواصفات', N'2026-10-27 07:47:09', 1);
INSERT INTO Users (UserId, Username, PasswordHash, FullName, Role, Department, CreatedAt, IsActive) VALUES (3, N'committee_user', N'$2a$10$HoojbN3OWw1rZzg3CBAJdO6EXIAhGhfQSW.1PmTb6GVN6OE36m/xS', N'م. محمود رضوان (لجنة البت)', N'CommitteeMember', N'لجنة البت الفني والمالي', N'2026-10-27 07:47:09', 1);
INSERT INTO Users (UserId, Username, PasswordHash, FullName, Role, Department, CreatedAt, IsActive) VALUES (4, N'finance_user', N'$2a$10$HoojbN3OWw1rZzg3CBAJdO6EXIAhGhfQSW.1PmTb6GVN6OE36m/xS', N'أشرف جلال (المراجع المالي)', N'FinancialAuditor', N'إدارة الشئون المالية', N'2026-10-27 07:47:09', 1);
INSERT INTO Users (UserId, Username, PasswordHash, FullName, Role, Department, CreatedAt, IsActive) VALUES (5, N'vendor_user', N'$2a$10$HoojbN3OWw1rZzg3CBAJdO6EXIAhGhfQSW.1PmTb6GVN6OE36m/xS', N'منى خليل (مسؤول الموردين)', N'VendorManager', N'إدارة سجل الموردين والمقاولين', N'2026-10-27 07:47:09', 1);
INSERT INTO Users (UserId, Username, PasswordHash, FullName, Role, Department, CreatedAt, IsActive) VALUES (6, N'security_user', N'$2a$10$HoojbN3OWw1rZzg3CBAJdO6EXIAhGhfQSW.1PmTb6GVN6OE36m/xS', N'كمال فاروق (المراجع الأمني)', N'Auditor', N'إدارة المتابعة والتفتيش', N'2026-10-27 07:47:09', 1);
SET IDENTITY_INSERT Users OFF;

-- Table: SupplyCategories
SET IDENTITY_INSERT SupplyCategories ON;
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
SET IDENTITY_INSERT SupplyCategories OFF;

-- Table: Vendors
SET IDENTITY_INSERT Vendors ON;
INSERT INTO Vendors (VendorId, CompanyName, VendorType, LegalEntity, CompanyType, Address, Phone, Fax, Email, TaxCardNo, TaxCardExpiry, CommercialRegisterNo, CommercialRegisterExpiry, CategoryGroup, ConstructionGrade, ConstructionBranch, IsRegistered, HasPreviousWorks, IsBlacklisted, BlacklistReason, BlacklistAuthority, BlacklistDate, UnblacklistedReason, UnblacklistedAuthority, UnblacklistedDate, IsDeleted, CreatedAt) VALUES (1, N'شركة الحمد للتجارة والتوريدات الفنية', N'مورد', N'شركة مساهمة', N'أفراد', N'11 ش الكهرمان الحضرة القبلية الاسكندرية', N'01012345678', NULL, NULL, N'100-200-300', N'2027-12-31', N'CR-45120', N'2027-12-31', N'المواسير بأنوعها و البلوف و المحابس', N'غير مجدول', NULL, 1, 1, 0, NULL, NULL, NULL, NULL, NULL, NULL, 0, N'2026-10-27 07:47:09');
INSERT INTO Vendors (VendorId, CompanyName, VendorType, LegalEntity, CompanyType, Address, Phone, Fax, Email, TaxCardNo, TaxCardExpiry, CommercialRegisterNo, CommercialRegisterExpiry, CategoryGroup, ConstructionGrade, ConstructionBranch, IsRegistered, HasPreviousWorks, IsBlacklisted, BlacklistReason, BlacklistAuthority, BlacklistDate, UnblacklistedReason, UnblacklistedAuthority, UnblacklistedDate, IsDeleted, CreatedAt) VALUES (2, N'شركة الإسكندرية لمقاولات شبكات الصرف', N'مقاول', N'شركة مساهمة', N'أفراد', N'ابراج الند مارك سموحة الاسكندرية', N'01234567890', NULL, NULL, N'102-202-302', N'2028-06-30', N'CR-88210', N'2028-06-30', N'أعمال المقاولات والإنشاءات', N'الأولى', N'شبكات المياه والصرف الصحي', 1, 1, 0, NULL, NULL, NULL, NULL, NULL, NULL, 0, N'2026-10-27 07:47:09');
INSERT INTO Vendors (VendorId, CompanyName, VendorType, LegalEntity, CompanyType, Address, Phone, Fax, Email, TaxCardNo, TaxCardExpiry, CommercialRegisterNo, CommercialRegisterExpiry, CategoryGroup, ConstructionGrade, ConstructionBranch, IsRegistered, HasPreviousWorks, IsBlacklisted, BlacklistReason, BlacklistAuthority, BlacklistDate, UnblacklistedReason, UnblacklistedAuthority, UnblacklistedDate, IsDeleted, CreatedAt) VALUES (3, N'شركة الكينج للمعدات والخدمات البترولية', N'مؤدي خدمة', N'شركة ذات مسؤولية محدودة', N'أفراد', N'العامرية ك 35 الطريق الصحراوى', N'01123456789', NULL, NULL, N'101-201-301', N'2026-11-15', N'CR-77450', N'2026-11-15', N'قطع غيار الأوناش والمعدات', N'الرابعة', N'الصيانة والمهمات', 1, 1, 0, NULL, NULL, NULL, NULL, NULL, NULL, 0, N'2026-10-27 07:47:09');
INSERT INTO Vendors (VendorId, CompanyName, VendorType, LegalEntity, CompanyType, Address, Phone, Fax, Email, TaxCardNo, TaxCardExpiry, CommercialRegisterNo, CommercialRegisterExpiry, CategoryGroup, ConstructionGrade, ConstructionBranch, IsRegistered, HasPreviousWorks, IsBlacklisted, BlacklistReason, BlacklistAuthority, BlacklistDate, UnblacklistedReason, UnblacklistedAuthority, UnblacklistedDate, IsDeleted, CreatedAt) VALUES (4, N'شركة السماح للمقاولات العمومية', N'مقاول', N'شركة ذات مسؤولية محدودة', N'أفراد', N'شارع النصر الاسكندرية', N'01099988877', NULL, NULL, N'103-203-303', N'2024-01-10', N'CR-12003', N'2024-01-10', N'أعمال الصيانة', N'السادسة', N'أعمال الصيانة', 0, 0, 1, N'مخالفة كراسة الشروط والتأخر الجسيم في التنفيذ', N'مجلس الإدارة', N'2024-05-15', N'تم سداد الغرامات وتوفيق الأوضاع بموجب قرار مجلس الإدارة رقم 45', N'مجلس الإدارة', N'2026-10-27', 0, N'2026-10-27 07:47:09');
SET IDENTITY_INSERT Vendors OFF;

-- Table: NeedsRequests
SET IDENTITY_INSERT NeedsRequests ON;
INSERT INTO NeedsRequests (RequestId, OperationName, OperationType, EstimatedValue, RequestingDepartment, BudgetHoldReference, ExecutionDuration, FiscalYear, ReservationType, InitialReservation, ApprovalAuthorityDate, SubmittalType, WarehouseBalance, ConstructionBranch, RequiredGrade, Status, IsDeleted, CreatedAt, SpecsAndConditions, RequiresSample, SampleDetails, WarehouseQuerySent, WarehouseQueryResponse, WarehouseQueryResponseDate, FinancialOperationNumber, FinancialOperationSymbol, TenderMethodSelected, PreliminaryReservation, ReservationTypeNew, BookletPrice, OperationTerms, ConstructionDivision, ConstructionCategory, ApprovalAuthority, AuthorityApprovalStatus, AuthorityApprovalDate, AuthorityRejectionReason, WorkflowStatus, InitialGuaranteePercent, OperationItems, FinancialNotes, FinancialReviewedAt, FinancialReviewedBy, AuthorityReviewedAt, AuthorityReviewedBy, FinancialApprovalObtained, FinancialApprovalDate, FinancialApprovalNotes, BookletFileName, BookletFilePath, TechnicalEvaluationMethod, MinPassingScore, AllowSplitAwarding, TechnicalCriteriaNotes) VALUES (1, N'ddddd', N'تعاقدات', NULL, N'إدارة الموارد البشرية', N'', N'3 اشهر', N'2025/2026', NULL, 4, NULL, N'مظروفيين', N'لا يوجد رصيد', NULL, NULL, N'معلق', 0, N'2026-11-22 08:31:11', N'ءءءء', 0, N'', 0, NULL, NULL, N'1/2025/2026/م ح', N'م ح', N'ممارسة محدودة', 4, N'جاري', 100, N'', N'', N'', N'رئيس مجلس الإدارة', N'معتمد', N'2026-11-22', N'', N'معتمد', 2, N'[{"description":"صنف معدل","unit":"عدد","quantity":5,"unitPrice":100,"specs":"مواصفة","itemMaxScore":100,"itemMinPassingScore":70,"itemCriteria":"معايير","allowSplit":true,"isExpanded":false}]', N'', N'2026-11-22 08:36:14', NULL, N'2026-11-22 12:25:47', N'المشرف', 1, N'2026-11-22', N'ملاحظة تجريبية', NULL, NULL, N'نظام نقاط', 70, 1, N'معايير تجريبية');
INSERT INTO NeedsRequests (RequestId, OperationName, OperationType, EstimatedValue, RequestingDepartment, BudgetHoldReference, ExecutionDuration, FiscalYear, ReservationType, InitialReservation, ApprovalAuthorityDate, SubmittalType, WarehouseBalance, ConstructionBranch, RequiredGrade, Status, IsDeleted, CreatedAt, SpecsAndConditions, RequiresSample, SampleDetails, WarehouseQuerySent, WarehouseQueryResponse, WarehouseQueryResponseDate, FinancialOperationNumber, FinancialOperationSymbol, TenderMethodSelected, PreliminaryReservation, ReservationTypeNew, BookletPrice, OperationTerms, ConstructionDivision, ConstructionCategory, ApprovalAuthority, AuthorityApprovalStatus, AuthorityApprovalDate, AuthorityRejectionReason, WorkflowStatus, InitialGuaranteePercent, OperationItems, FinancialNotes, FinancialReviewedAt, FinancialReviewedBy, AuthorityReviewedAt, AuthorityReviewedBy, FinancialApprovalObtained, FinancialApprovalDate, FinancialApprovalNotes, BookletFileName, BookletFilePath, TechnicalEvaluationMethod, MinPassingScore, AllowSplitAwarding, TechnicalCriteriaNotes) VALUES (2, N'ddddd', N'تعاقدات', 0, N'قطاع المياه', NULL, N'3 اشهر', N'2025/2026', NULL, NULL, NULL, NULL, NULL, NULL, NULL, N'معلق', 0, N'2026-11-22 12:06:12', N'ب', 1, N'ب', 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, N'في انتظار الموافقة', NULL, NULL, N'في انتظار المالية', 2, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, N'مطابق أو غير مطابق', 70, 0, NULL);
SET IDENTITY_INSERT NeedsRequests OFF;

-- Table: Tenders
SET IDENTITY_INSERT Tenders ON;
INSERT INTO Tenders (TenderId, RequestId, TenderNumber, TenderSymbol, TenderName, TenderMethod, RequestingDepartment, BudgetHoldReference, FiscalYear, BaseBookletPrice, CalculatedBookletPrice, InitialGuaranteeAmount, EnvelopeOpeningDate, AdNewspaper1, AdNewspaper2, AdPublishDate, AdDetails, EvaluationMethod, PassingScoreDecimal, RequiresSample, SampleDetails, Status, IsDeleted, CreatedAt, HasSubFileDistribution, SubFileDistributionId, BookletFileName, BookletFilePath, BookletFileSize, BookletUploadedAt, BookletFileContent, AllowSplitAwarding, TechnicalCriteriaNotes, OperationType, ExecutionDuration, WarehouseBalance, SpecsAndConditions, ReservationType, EstimatedValue, ConstructionDivision, ConstructionCategory, FinancialApprovalObtained, FinancialApprovalDate, FinancialApprovalNotes, InvitedVendorsCount, InvitedVendorsJson) VALUES (1, NULL, N'99/2025/2026-هـ', N'هـ', N'عملية صيانة وإحلال محطة رفع سموحة', N'مناقصة عامة', N'إدارة التشغيل والصيانة', N'مذكرة حجز رقم 402/2025', N'2025/2026', 500, 715, 75000, N'2026-11-15 11:00:00', NULL, NULL, NULL, NULL, N'تقرير فني', NULL, 0, NULL, N'نشط', 0, N'2026-10-27 07:52:02', 0, NULL, NULL, NULL, 0, NULL, NULL, 0, NULL, N'توريدات', NULL, NULL, NULL, N'موازنة الشركة', NULL, NULL, NULL, 0, NULL, NULL, 0, NULL);
INSERT INTO Tenders (TenderId, RequestId, TenderNumber, TenderSymbol, TenderName, TenderMethod, RequestingDepartment, BudgetHoldReference, FiscalYear, BaseBookletPrice, CalculatedBookletPrice, InitialGuaranteeAmount, EnvelopeOpeningDate, AdNewspaper1, AdNewspaper2, AdPublishDate, AdDetails, EvaluationMethod, PassingScoreDecimal, RequiresSample, SampleDetails, Status, IsDeleted, CreatedAt, HasSubFileDistribution, SubFileDistributionId, BookletFileName, BookletFilePath, BookletFileSize, BookletUploadedAt, BookletFileContent, AllowSplitAwarding, TechnicalCriteriaNotes, OperationType, ExecutionDuration, WarehouseBalance, SpecsAndConditions, ReservationType, EstimatedValue, ConstructionDivision, ConstructionCategory, FinancialApprovalObtained, FinancialApprovalDate, FinancialApprovalNotes, InvitedVendorsCount, InvitedVendorsJson) VALUES (2, NULL, N'T-2783/2025/2026-هـ', N'هـ', N'عملية صيانة وإحلال محطة رفع سموحة', N'مناقصة عامة', N'إدارة التشغيل والصيانة', N'مذكرة حجز رقم 402/2025', N'2025/2026', 500, 715, 75000, N'2026-11-15 11:00:00', NULL, NULL, NULL, NULL, N'تقرير فني', NULL, 0, NULL, N'مكتمل التوريد والتسليم', 0, N'2026-10-27 07:59:02', 0, NULL, NULL, NULL, 0, NULL, NULL, 0, NULL, N'توريدات', NULL, NULL, NULL, N'موازنة الشركة', NULL, NULL, NULL, 0, NULL, NULL, 0, NULL);
SET IDENTITY_INSERT Tenders OFF;

-- Table: TenderItems
SET IDENTITY_INSERT TenderItems ON;
INSERT INTO TenderItems (ItemId, TenderId, ItemNumber, ItemDescription, Unit, EstimatedQuantity, EstimatedUnitPrice, EstimatedTotalPrice, Notes, ItemSpecs, ItemMaxScore, ItemMinPassingScore, ItemCriteria, AllowSplit) VALUES (1, 1, 1, N'محبس فراشة قطر 600 مم ضغط 16 بار', N'عدد', 4, 120000, 480000, NULL, NULL, 100, 70, NULL, 1);
INSERT INTO TenderItems (ItemId, TenderId, ItemNumber, ItemDescription, Unit, EstimatedQuantity, EstimatedUnitPrice, EstimatedTotalPrice, Notes, ItemSpecs, ItemMaxScore, ItemMinPassingScore, ItemCriteria, AllowSplit) VALUES (2, 1, 2, N'طلمبة غاطسة تصرف 500 لتر/ثانية', N'عدد', 2, 650000, 1300000, NULL, NULL, 100, 70, NULL, 1);
INSERT INTO TenderItems (ItemId, TenderId, ItemNumber, ItemDescription, Unit, EstimatedQuantity, EstimatedUnitPrice, EstimatedTotalPrice, Notes, ItemSpecs, ItemMaxScore, ItemMinPassingScore, ItemCriteria, AllowSplit) VALUES (3, 1, 3, N'وصلة حائط مرنة صلب', N'طقم', 4, 25000, 100000, NULL, NULL, 100, 70, NULL, 1);
INSERT INTO TenderItems (ItemId, TenderId, ItemNumber, ItemDescription, Unit, EstimatedQuantity, EstimatedUnitPrice, EstimatedTotalPrice, Notes, ItemSpecs, ItemMaxScore, ItemMinPassingScore, ItemCriteria, AllowSplit) VALUES (4, 2, 1, N'محبس فراشة قطر 600 مم ضغط 16 بار', N'عدد', 4, 120000, 480000, NULL, NULL, 100, 70, NULL, 1);
INSERT INTO TenderItems (ItemId, TenderId, ItemNumber, ItemDescription, Unit, EstimatedQuantity, EstimatedUnitPrice, EstimatedTotalPrice, Notes, ItemSpecs, ItemMaxScore, ItemMinPassingScore, ItemCriteria, AllowSplit) VALUES (5, 2, 2, N'طلمبة غاطسة تصرف 500 لتر/ثانية', N'عدد', 2, 650000, 1300000, NULL, NULL, 100, 70, NULL, 1);
INSERT INTO TenderItems (ItemId, TenderId, ItemNumber, ItemDescription, Unit, EstimatedQuantity, EstimatedUnitPrice, EstimatedTotalPrice, Notes, ItemSpecs, ItemMaxScore, ItemMinPassingScore, ItemCriteria, AllowSplit) VALUES (6, 2, 3, N'وصلة حائط مرنة صلب', N'طقم', 4, 25000, 100000, NULL, NULL, 100, 70, NULL, 1);
SET IDENTITY_INSERT TenderItems OFF;
