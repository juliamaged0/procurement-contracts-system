USE [ProcurementDB];
GO

-- Table: NeedsRequests (using existing SQL Server columns only)
SET IDENTITY_INSERT dbo.NeedsRequests ON;
INSERT INTO dbo.NeedsRequests (
    RequestId, OperationName, OperationType, EstimatedValue, RequestingDepartment,
    BudgetHoldReference, ExecutionDuration, FiscalYear, ReservationType, InitialReservation,
    ApprovalAuthorityDate, SubmittalType, WarehouseBalance, ConstructionBranch, RequiredGrade,
    Status, IsDeleted, CreatedAt
)
SELECT
    v.RequestId, v.OperationName, v.OperationType, v.EstimatedValue, v.RequestingDepartment,
    v.BudgetHoldReference, v.ExecutionDuration, v.FiscalYear, v.ReservationType, v.InitialReservation,
    v.ApprovalAuthorityDate, v.SubmittalType, v.WarehouseBalance, v.ConstructionBranch, v.RequiredGrade,
    v.Status, v.IsDeleted, v.CreatedAt
FROM (VALUES
    (1, N'ddddd', N'تعاقدات', CAST(0 AS decimal(18,2)), N'إدارة الموارد البشرية', N'', N'3 اشهر', N'2025/2026', NULL, CAST(4 AS decimal(18,2)), NULL, N'مظروفيين', N'لا يوجد رصيد', NULL, NULL, N'معلق', CAST(0 AS bit), CAST(N'2026-11-22 08:31:11' AS datetime)),
    (2, N'ddddd', N'تعاقدات', CAST(0 AS decimal(18,2)), N'قطاع المياه', NULL, N'3 اشهر', N'2025/2026', NULL, NULL, NULL, NULL, NULL, NULL, NULL, N'معلق', CAST(0 AS bit), CAST(N'2026-11-22 12:06:12' AS datetime))
) AS v(
    RequestId, OperationName, OperationType, EstimatedValue, RequestingDepartment,
    BudgetHoldReference, ExecutionDuration, FiscalYear, ReservationType, InitialReservation,
    ApprovalAuthorityDate, SubmittalType, WarehouseBalance, ConstructionBranch, RequiredGrade,
    Status, IsDeleted, CreatedAt
)
WHERE NOT EXISTS (SELECT 1 FROM dbo.NeedsRequests nr WHERE nr.RequestId = v.RequestId);
SET IDENTITY_INSERT dbo.NeedsRequests OFF;
GO

-- Table: Tenders (using existing SQL Server columns only)
SET IDENTITY_INSERT dbo.Tenders ON;
INSERT INTO dbo.Tenders (
    TenderId, RequestId, TenderNumber, TenderSymbol, TenderName, TenderMethod,
    RequestingDepartment, BudgetHoldReference, FiscalYear, BaseBookletPrice,
    CalculatedBookletPrice, InitialGuaranteeAmount, EnvelopeOpeningDate, AdNewspaper1,
    AdNewspaper2, AdPublishDate, AdDetails, EvaluationMethod, PassingScoreDecimal,
    RequiresSample, SampleDetails, Status, IsDeleted, CreatedAt
)
SELECT
    v.TenderId, v.RequestId, v.TenderNumber, v.TenderSymbol, v.TenderName, v.TenderMethod,
    v.RequestingDepartment, v.BudgetHoldReference, v.FiscalYear, v.BaseBookletPrice,
    v.CalculatedBookletPrice, v.InitialGuaranteeAmount, v.EnvelopeOpeningDate, v.AdNewspaper1,
    v.AdNewspaper2, v.AdPublishDate, v.AdDetails, v.EvaluationMethod, v.PassingScoreDecimal,
    v.RequiresSample, v.SampleDetails, v.Status, v.IsDeleted, v.CreatedAt
FROM (VALUES
    (1, NULL, N'99/2025/2026-هـ', N'هـ', N'عملية صيانة وإحلال محطة رفع سموحة', N'مناقصة عامة', N'إدارة التشغيل والصيانة', N'مذكرة حجز رقم 402/2025', N'2025/2026', CAST(500 AS decimal(18,2)), CAST(715 AS decimal(18,2)), CAST(75000 AS decimal(18,2)), CAST(N'2026-11-15 11:00:00' AS datetime), NULL, NULL, NULL, NULL, N'تقرير فني', NULL, CAST(0 AS bit), NULL, N'نشط', CAST(0 AS bit), CAST(N'2026-10-27 07:52:02' AS datetime)),
    (2, NULL, N'T-2783/2025/2026-هـ', N'هـ', N'عملية صيانة وإحلال محطة رفع سموحة', N'مناقصة عامة', N'إدارة التشغيل والصيانة', N'مذكرة حجز رقم 402/2025', N'2025/2026', CAST(500 AS decimal(18,2)), CAST(715 AS decimal(18,2)), CAST(75000 AS decimal(18,2)), CAST(N'2026-11-15 11:00:00' AS datetime), NULL, NULL, NULL, NULL, N'تقرير فني', NULL, CAST(0 AS bit), NULL, N'مكتمل التوريد والتسليم', CAST(0 AS bit), CAST(N'2026-10-27 07:59:02' AS datetime))
) AS v(
    TenderId, RequestId, TenderNumber, TenderSymbol, TenderName, TenderMethod,
    RequestingDepartment, BudgetHoldReference, FiscalYear, BaseBookletPrice,
    CalculatedBookletPrice, InitialGuaranteeAmount, EnvelopeOpeningDate, AdNewspaper1,
    AdNewspaper2, AdPublishDate, AdDetails, EvaluationMethod, PassingScoreDecimal,
    RequiresSample, SampleDetails, Status, IsDeleted, CreatedAt
)
WHERE NOT EXISTS (SELECT 1 FROM dbo.Tenders t WHERE t.TenderId = v.TenderId);
SET IDENTITY_INSERT dbo.Tenders OFF;
GO

-- Table: TenderItems (using existing SQL Server columns only)
SET IDENTITY_INSERT dbo.TenderItems ON;
INSERT INTO dbo.TenderItems (
    ItemId, TenderId, ItemNumber, ItemDescription, Unit, EstimatedQuantity,
    EstimatedUnitPrice, EstimatedTotalPrice, Notes
)
SELECT
    v.ItemId, v.TenderId, v.ItemNumber, v.ItemDescription, v.Unit, v.EstimatedQuantity,
    v.EstimatedUnitPrice, v.EstimatedTotalPrice, v.Notes
FROM (VALUES
    (1, 1, 1, N'محبس فراشة قطر 600 مم ضغط 16 بار', N'عدد', CAST(4 AS decimal(18,3)), CAST(120000 AS decimal(18,2)), CAST(480000 AS decimal(18,2)), NULL),
    (2, 1, 2, N'طلمبة غاطسة تصرف 500 لتر/ثانية', N'عدد', CAST(2 AS decimal(18,3)), CAST(650000 AS decimal(18,2)), CAST(1300000 AS decimal(18,2)), NULL),
    (3, 1, 3, N'وصلة حائط مرنة صلب', N'طقم', CAST(4 AS decimal(18,3)), CAST(25000 AS decimal(18,2)), CAST(100000 AS decimal(18,2)), NULL),
    (4, 2, 1, N'محبس فراشة قطر 600 مم ضغط 16 بار', N'عدد', CAST(4 AS decimal(18,3)), CAST(120000 AS decimal(18,2)), CAST(480000 AS decimal(18,2)), NULL),
    (5, 2, 2, N'طلمبة غاطسة تصرف 500 لتر/ثانية', N'عدد', CAST(2 AS decimal(18,3)), CAST(650000 AS decimal(18,2)), CAST(1300000 AS decimal(18,2)), NULL),
    (6, 2, 3, N'وصلة حائط مرنة صلب', N'طقم', CAST(4 AS decimal(18,3)), CAST(25000 AS decimal(18,2)), CAST(100000 AS decimal(18,2)), NULL)
) AS v(
    ItemId, TenderId, ItemNumber, ItemDescription, Unit, EstimatedQuantity,
    EstimatedUnitPrice, EstimatedTotalPrice, Notes
)
WHERE NOT EXISTS (SELECT 1 FROM dbo.TenderItems ti WHERE ti.ItemId = v.ItemId);
SET IDENTITY_INSERT dbo.TenderItems OFF;
GO