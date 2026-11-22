const { connectDb, query } = require('./config/db');

async function testFrontendPayload() {
  await connectDb();
  const reqs = await query('SELECT * FROM NeedsRequests LIMIT 1');
  if (!reqs || reqs.length === 0) return;
  const req = reqs[0];
  console.log('Original request:', req.RequestId, req.OperationName);

  // This is exactly what formData has when editing:
  const formData = {
    operationName: req.OperationName,
    operationType: req.OperationType,
    requestingDepartment: req.RequestingDepartment,
    executionDuration: req.ExecutionDuration || '',
    fiscalYear: req.FiscalYear || '2025/2026',
    specsAndConditions: req.SpecsAndConditions || '',
    requiresSample: Boolean(req.RequiresSample),
    sampleDetails: req.SampleDetails || '',
    warehouseBalance: req.WarehouseBalance || 'لا يوجد رصيد بالمخازن',
    technicalEvaluationMethod: req.TechnicalEvaluationMethod || 'مطابق أو غير مطابق',
    minPassingScore: req.MinPassingScore || 70,
    allowSplitAwarding: req.AllowSplitAwarding !== undefined ? Boolean(req.AllowSplitAwarding) : (req.OperationType === 'توريدات'),
    technicalCriteriaNotes: req.TechnicalCriteriaNotes || '',
    tenderMethodSelected: req.TenderMethodSelected || 'مناقصة عامة',
    estimatedValue: req.EstimatedValue || '',
    preliminaryReservation: req.PreliminaryReservation || req.InitialReservation || '',
    reservationTypeNew: req.ReservationTypeNew || 'جاري',
    budgetHoldReference: req.BudgetHoldReference || '',
    initialGuaranteePercent: req.InitialGuaranteePercent || 2,
    submittalType: req.SubmittalType || 'مظروفيين',
    bookletPrice: req.BookletPrice || '',
    constructionDivision: req.ConstructionDivision || '',
    constructionCategory: req.ConstructionCategory || '',
    operationTerms: req.OperationTerms || '',
    financialNotes: req.FinancialNotes || '',
    financialApprovalObtained: req.FinancialApprovalObtained !== 0,
    financialApprovalDate: req.FinancialApprovalDate || new Date().toISOString().split('T')[0],
    financialApprovalNotes: req.FinancialApprovalNotes || '',
    approvalAuthority: req.ApprovalAuthority || '',
    authorityApprovalStatus: req.AuthorityApprovalStatus || (req.WorkflowStatus === 'مرفوض' ? 'مرفوض' : 'معتمد'),
    authorityApprovalDate: req.AuthorityApprovalDate || new Date().toISOString().split('T')[0],
    reviewedBy: req.AuthorityReviewedBy || 'المشرف',
    authorityRejectionReason: req.AuthorityRejectionReason || '',
  };

  const operationItems = [{
    description: 'صنف معدل',
    unit: 'عدد',
    quantity: 5,
    unitPrice: 100,
    specs: 'مواصفة',
    itemMaxScore: 100,
    itemMinPassingScore: 70,
    itemCriteria: 'معايير',
    allowSplit: true,
    isExpanded: false
  }];

  const payload = {
    ...formData,
    approvalAuthority: formData.approvalAuthority || 'رئيس مجلس الإدارة',
    operationItems,
  };

  // Now simulate the PUT endpoint:
  const id = req.RequestId;
  try {
    const existing = await query('SELECT * FROM NeedsRequests WHERE RequestId = @id', { id });
    const old = existing[0];

    const {
      operationName, operationType, requestingDepartment, executionDuration,
      specsAndConditions, requiresSample, sampleDetails, fiscalYear, warehouseBalance,
      technicalEvaluationMethod, minPassingScore, allowSplitAwarding, technicalCriteriaNotes,
      tenderMethodSelected, estimatedValue, preliminaryReservation, reservationTypeNew,
      budgetHoldReference, initialGuaranteePercent, submittalType, bookletPrice,
      operationTerms, operationItems: bodyItems, constructionDivision, constructionCategory, financialNotes,
      financialApprovalObtained, financialApprovalDate, financialApprovalNotes,
      approvalAuthority, authorityApprovalStatus, authorityApprovalDate,
      authorityRejectionReason, reviewedBy
    } = payload;

    const opType = operationType || old.OperationType;
    const tMethod = tenderMethodSelected || old.TenderMethodSelected;
    const estVal = estimatedValue !== undefined && estimatedValue !== '' ? parseFloat(estimatedValue) : old.EstimatedValue;
    const fy = fiscalYear || old.FiscalYear || '2025/2026';

    const authority = approvalAuthority || (tMethod && estVal > 0 ? 'رئيس مجلس الإدارة' : old.ApprovalAuthority);
    let symbol = old.FinancialOperationSymbol;

    let operationNumber = old.FinancialOperationNumber;
    let workflowStatus = old.WorkflowStatus;
    let status = old.Status;

    if (authorityApprovalStatus === 'معتمد') {
      workflowStatus = 'معتمد';
      status = old.Status === 'مطروح' ? 'مطروح' : 'معلق';
    } else if (authorityApprovalStatus === 'مرفوض') {
      workflowStatus = 'مرفوض';
      status = 'ملغى';
    } else if (tMethod && estVal > 0) {
      workflowStatus = 'في انتظار السلطة';
    }

    const itemsJson = bodyItems ? (typeof bodyItems === 'string' ? bodyItems : JSON.stringify(bodyItems)) : (old.OperationItems || '[]');

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
      operationName: operationName || old.OperationName,
      operationType: opType,
      requestingDepartment: requestingDepartment || old.RequestingDepartment,
      executionDuration: executionDuration !== undefined ? executionDuration : old.ExecutionDuration,
      specsAndConditions: specsAndConditions !== undefined ? specsAndConditions : old.SpecsAndConditions,
      requiresSample: requiresSample !== undefined ? (requiresSample ? 1 : 0) : old.RequiresSample,
      sampleDetails: sampleDetails !== undefined ? sampleDetails : old.SampleDetails,
      warehouseBalance: warehouseBalance !== undefined ? warehouseBalance : old.WarehouseBalance,
      fiscalYear: fy,
      estimatedValue: estVal,
      tenderMethodSelected: tMethod || null,
      preliminaryReservation: preliminaryReservation !== undefined && preliminaryReservation !== '' ? parseFloat(preliminaryReservation) : (old.PreliminaryReservation || estVal),
      reservationTypeNew: reservationTypeNew || old.ReservationTypeNew || 'جاري',
      budgetHoldReference: budgetHoldReference !== undefined ? budgetHoldReference : old.BudgetHoldReference,
      initialGuaranteePercent: initialGuaranteePercent !== undefined && initialGuaranteePercent !== '' ? parseFloat(initialGuaranteePercent) : (old.InitialGuaranteePercent || 2),
      submittalType: submittalType || old.SubmittalType || 'مظروفيين',
      bookletPrice: bookletPrice !== undefined && bookletPrice !== '' ? parseFloat(bookletPrice) : (old.BookletPrice || 0),
      operationTerms: operationTerms !== undefined ? operationTerms : old.OperationTerms,
      operationItems: itemsJson,
      constructionDivision: constructionDivision !== undefined ? constructionDivision : old.ConstructionDivision,
      constructionCategory: constructionCategory !== undefined ? constructionCategory : old.ConstructionCategory,
      financialNotes: financialNotes !== undefined ? financialNotes : old.FinancialNotes,
      operationNumber: operationNumber || old.FinancialOperationNumber,
      symbol: symbol || old.FinancialOperationSymbol,
      authority: authority || old.ApprovalAuthority,
      financialApprovalObtained: financialApprovalObtained !== undefined ? (financialApprovalObtained ? 1 : 0) : old.FinancialApprovalObtained,
      financialApprovalDate: financialApprovalDate || old.FinancialApprovalDate,
      financialApprovalNotes: financialApprovalNotes !== undefined ? financialApprovalNotes : old.FinancialApprovalNotes,
      authorityApprovalStatus: authorityApprovalStatus || old.AuthorityApprovalStatus,
      authorityApprovalDate: authorityApprovalDate || old.AuthorityApprovalDate,
      authorityRejectionReason: authorityRejectionReason !== undefined ? authorityRejectionReason : old.AuthorityRejectionReason,
      reviewedBy: reviewedBy || old.AuthorityReviewedBy || 'المستخدم',
      technicalEvaluationMethod: technicalEvaluationMethod !== undefined ? technicalEvaluationMethod : (old.TechnicalEvaluationMethod || 'مطابق أو غير مطابق'),
      minPassingScore: minPassingScore !== undefined && minPassingScore !== '' ? parseFloat(minPassingScore) : (old.MinPassingScore || 70),
      allowSplitAwarding: allowSplitAwarding !== undefined ? (allowSplitAwarding ? 1 : 0) : (old.AllowSplitAwarding !== undefined ? old.AllowSplitAwarding : (opType === 'توريدات' ? 1 : 0)),
      technicalCriteriaNotes: technicalCriteriaNotes !== undefined ? technicalCriteriaNotes : (old.TechnicalCriteriaNotes || ''),
      workflowStatus,
      status,
      id
    });

    console.log('Update executed successfully! Changes:', res.changes);
  } catch (err) {
    console.error('Update FAILED with error:', err);
  }
}

testFrontendPayload();
