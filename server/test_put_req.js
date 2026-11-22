const { connectDb, query } = require('./config/db');

async function testPut() {
  await connectDb();
  const reqs = await query('SELECT * FROM NeedsRequests LIMIT 1');
  if (!reqs || reqs.length === 0) {
    console.log('No requests found.');
    return;
  }
  const r = reqs[0];
  console.log('Testing update on RequestId:', r.RequestId);

  try {
    const updateSql = `
      UPDATE NeedsRequests SET
        OperationName = @operationName,
        OperationType = @operationType,
        RequestingDepartment = @requestingDepartment,
        ExecutionDuration = @executionDuration,
        SpecsAndConditions = @specsAndConditions,
        RequiresSample = @requiresSample,
        SampleDetails = @sampleDetails,
        WarehouseBalance = @warehouseBalance,
        FiscalYear = @fiscalYear,
        EstimatedValue = @estimatedValue,
        TenderMethodSelected = @tenderMethodSelected,
        PreliminaryReservation = @preliminaryReservation,
        InitialReservation = @preliminaryReservation,
        ReservationTypeNew = @reservationTypeNew,
        BudgetHoldReference = @budgetHoldReference,
        InitialGuaranteePercent = @initialGuaranteePercent,
        SubmittalType = @submittalType,
        BookletPrice = @bookletPrice,
        OperationTerms = @operationTerms,
        OperationItems = @operationItems,
        ConstructionDivision = @constructionDivision,
        ConstructionCategory = @constructionCategory,
        FinancialNotes = @financialNotes,
        FinancialOperationNumber = @operationNumber,
        FinancialOperationSymbol = @symbol,
        ApprovalAuthority = @authority,
        FinancialApprovalObtained = @financialApprovalObtained,
        FinancialApprovalDate = @financialApprovalDate,
        FinancialApprovalNotes = @financialApprovalNotes,
        AuthorityApprovalStatus = @authorityApprovalStatus,
        AuthorityApprovalDate = @authorityApprovalDate,
        AuthorityRejectionReason = @authorityRejectionReason,
        AuthorityReviewedBy = @reviewedBy,
        AuthorityReviewedAt = CURRENT_TIMESTAMP,
        TechnicalEvaluationMethod = @technicalEvaluationMethod,
        MinPassingScore = @minPassingScore,
        AllowSplitAwarding = @allowSplitAwarding,
        TechnicalCriteriaNotes = @technicalCriteriaNotes,
        WorkflowStatus = @workflowStatus,
        Status = @status
      WHERE RequestId = @id
    `;

    const res = await query(updateSql, {
      operationName: r.OperationName,
      operationType: r.OperationType,
      requestingDepartment: r.RequestingDepartment,
      executionDuration: r.ExecutionDuration,
      specsAndConditions: r.SpecsAndConditions,
      requiresSample: 0,
      sampleDetails: null,
      warehouseBalance: 'لا يوجد رصيد',
      fiscalYear: r.FiscalYear,
      estimatedValue: r.EstimatedValue,
      tenderMethodSelected: r.TenderMethodSelected,
      preliminaryReservation: r.PreliminaryReservation || r.EstimatedValue,
      reservationTypeNew: 'جاري',
      budgetHoldReference: r.BudgetHoldReference,
      initialGuaranteePercent: 2,
      submittalType: 'مظروفيين',
      bookletPrice: 100,
      operationTerms: '',
      operationItems: '[]',
      constructionDivision: null,
      constructionCategory: null,
      financialNotes: '',
      operationNumber: r.FinancialOperationNumber,
      symbol: r.FinancialOperationSymbol,
      authority: r.ApprovalAuthority,
      financialApprovalObtained: 1,
      financialApprovalDate: '2026-11-22',
      financialApprovalNotes: 'ملاحظة تجريبية',
      authorityApprovalStatus: 'معتمد',
      authorityApprovalDate: '2026-11-22',
      authorityRejectionReason: null,
      reviewedBy: 'المشرف',
      technicalEvaluationMethod: 'نظام نقاط',
      minPassingScore: 70,
      allowSplitAwarding: 1,
      technicalCriteriaNotes: 'معايير تجريبية',
      workflowStatus: 'معتمد',
      status: 'معلق',
      id: r.RequestId
    });
    console.log('Update result:', res);
  } catch (err) {
    console.error('Update ERROR:', err);
  }
}

testPut();
