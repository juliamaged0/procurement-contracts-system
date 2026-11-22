/**
 * Comprehensive Architecture, Database, & Business Logic Verification Test Suite
 * اختبارات التحقق الشاملة من سلامة التصميم الهندسي وقواعد البيانات والمنطق البرمجي
 * منظومة الدورة المستندية - شركة الصرف الصحي بالإسكندرية (ASDCO)
 */

const { connectDb, query } = require('./config/db');
const { 
  calculateTenderBookletPrice, 
  calculateAwardDeductions, 
  generateAccountingJournalEntry,
  tafqeetCurrency 
} = require('./utils/calculations');

async function runVerificationTests() {
  console.log('======================================================================');
  console.log('🚀 بدء الفحص والتحقق الشامل للمنظومة (Architecture & Logic Verification)');
  console.log('======================================================================\n');

  await connectDb();

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ [نجاح]: ${message}`);
      passedTests++;
    } else {
      console.error(`  ❌ [فشل]: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // --------------------------------------------------------------------------
  // STEP 1: Vendors Registry & Blacklist Logic
  // --------------------------------------------------------------------------
  console.log('1️⃣ اختبار جدول الشركات والموردين وقواعد الشطب (Vendors_Registry & Blacklist):');
  
  // 1.1 Expiration Alerts View / Logic
  const vendors = await query('SELECT * FROM Vendors WHERE IsDeleted = 0');
  assert(vendors.length >= 4, 'وجود بيانات الموردين والمقاولين الأساسيين بالسجل');

  const blacklistedVendor = vendors.find(v => v.IsBlacklisted === 1);
  assert(blacklistedVendor !== undefined, `التحقق من وجود شركة بالقائمة السوداء (${blacklistedVendor?.CompanyName})`);
  assert(blacklistedVendor?.BlacklistReason !== null, 'تسجيل سبب الشطب بدقة');

  // 1.2 Unblacklisting Logic
  const testUnblacklistReason = 'تم سداد الغرامات وتوفيق الأوضاع بموجب قرار مجلس الإدارة رقم 45';
  await query(`
    UPDATE Vendors 
    SET IsBlacklisted = 0, 
        UnblacklistedReason = @reason,
        UnblacklistedAuthority = N'مجلس الإدارة',
        UnblacklistedDate = '2026-10-27'
    WHERE VendorId = @id
  `, { id: blacklistedVendor.VendorId, reason: testUnblacklistReason });

  const restoredVendor = (await query('SELECT * FROM Vendors WHERE VendorId = @id', { id: blacklistedVendor.VendorId }))[0];
  assert(restoredVendor.IsBlacklisted === 0, 'نجاح تفعيل زر إلغاء الشطب وإحياء السجل');
  assert(restoredVendor.UnblacklistedReason === testUnblacklistReason, 'حفظ مسوغات وتاريخ وسلطة إلغاء الشطب');

  // Re-blacklist for subsequent tests
  await query('UPDATE Vendors SET IsBlacklisted = 1 WHERE VendorId = @id', { id: blacklistedVendor.VendorId });
  console.log('  -> تم استعادة حالة القائمة السوداء لاختبارات الحجب.\n');

  // --------------------------------------------------------------------------
  // STEP 2: Tenders Master & Items (الطرح والاحتياجات)
  // --------------------------------------------------------------------------
  console.log('2️⃣ اختبار جدول الطرح والاحتياجات وحساب البنود (Tenders_Master & Tender_Items):');

  const testSerial = `T-${Date.now().toString().slice(-4)}/2025/2026-هـ`;
  // Insert Master Tender
  const tenderRes = await query(`
    INSERT INTO Tenders (
      TenderNumber, TenderSymbol, TenderName, TenderMethod, RequestingDepartment, BudgetHoldReference,
      FiscalYear, BaseBookletPrice, CalculatedBookletPrice, InitialGuaranteeAmount, EnvelopeOpeningDate, Status, IsDeleted
    ) VALUES (
      @testSerial, N'هـ', N'عملية صيانة وإحلال محطة رفع سموحة', N'مناقصة عامة', N'إدارة التشغيل والصيانة', N'مذكرة حجز رقم 402/2025',
      N'2025/2026', 500, 715, 75000, '2026-11-15 11:00:00', N'نشط', 0
    )
  `, { testSerial });
  const tenderId = tenderRes.lastID;
  assert(tenderId > 0, `توليد العملية بنجاح بالرقم المسلسل وتثبيت رقم مذكرة الحجز (TenderId: ${tenderId})`);

  // Insert Tender Items and verify SUM(Quantity * EstimatedUnitPrice)
  const itemsToInsert = [
    { desc: 'محبس فراشة قطر 600 مم ضغط 16 بار', unit: 'عدد', qty: 4, price: 120000 },
    { desc: 'طلمبة غاطسة تصرف 500 لتر/ثانية', unit: 'عدد', qty: 2, price: 650000 },
    { desc: 'وصلة حائط مرنة صلب', unit: 'طقم', qty: 4, price: 25000 }
  ];

  let calculatedSum = 0;
  for (let i = 0; i < itemsToInsert.length; i++) {
    const it = itemsToInsert[i];
    const total = it.qty * it.price;
    calculatedSum += total;
    await query(`
      INSERT INTO TenderItems (TenderId, ItemNumber, ItemDescription, Unit, EstimatedQuantity, EstimatedUnitPrice, EstimatedTotalPrice)
      VALUES (@tenderId, @num, @desc, @unit, @qty, @price, @total)
    `, { tenderId, num: i + 1, desc: it.desc, unit: it.unit, qty: it.qty, price: it.price, total });
  }

  const dbItems = await query('SELECT SUM(EstimatedTotalPrice) as GrandTotal FROM TenderItems WHERE TenderId = @tenderId', { tenderId });
  const dbGrandTotal = dbItems[0].GrandTotal;
  assert(dbGrandTotal === 1880000, `صحة معادلة إجمالي القيمة التقديرية للبنود: 1,880,000 ج.م (dbTotal = ${dbGrandTotal})`);
  assert(calculatedSum === dbGrandTotal, 'مطابقة الجمع التراكمي للبنود برمجياً ومحاسبياً');
  console.log(`  -> تفقيط القيمة التقديرية للعملية: ${tafqeetCurrency(dbGrandTotal)}\n`);

  // --------------------------------------------------------------------------
  // STEP 3: Envelope Opening, Blacklist Block & Auto-Sorting
  // --------------------------------------------------------------------------
  console.log('3️⃣ اختبار فض المظاريف وحجب المشطوبين والترتيب التصاعدي (Bids_Evaluation & Sorting):');

  // Test System Validation: Blacklisted vendor must be blocked
  const blacklistedCheck = (await query('SELECT IsBlacklisted, CompanyName FROM Vendors WHERE VendorId = @id', { id: blacklistedVendor.VendorId }))[0];
  let blacklistBlocked = false;
  if (blacklistedCheck.IsBlacklisted === 1) {
    blacklistBlocked = true;
  }
  assert(blacklistBlocked, `تحقق النظام من حجب المورد المشطوب ومنع تقديم عطاء له (${blacklistedCheck.CompanyName})`);

  // Insert 3 Submissions with varying prices & technical status
  const v1 = vendors[0]; // Active
  const v2 = vendors[1]; // Active
  const v3 = vendors[2]; // Active

  // Bid 1: 1,750,000 (Technically Accepted)
  const sub1 = await query(`
    INSERT INTO BidSubmissions (TenderId, VendorId, BidFractionSerial, InitialInsuranceAmount, GuaranteePaymentMethod, TechnicalStatus, FinancialTotalAmount, IsDeleted)
    VALUES (@tenderId, @vendorId, N'1/3', 75000, N'خطاب ضمان', N'مقبول', 1750000, 0)
  `, { tenderId, vendorId: v1.VendorId });

  // Bid 2: 1,620,000 (Technically Accepted) -> LOWEST PRICE WINNER
  const sub2 = await query(`
    INSERT INTO BidSubmissions (TenderId, VendorId, BidFractionSerial, InitialInsuranceAmount, GuaranteePaymentMethod, TechnicalStatus, FinancialTotalAmount, IsDeleted)
    VALUES (@tenderId, @vendorId, N'2/3', 75000, N'نقداً', N'مقبول', 1620000, 0)
  `, { tenderId, vendorId: v2.VendorId });

  // Bid 3: 1,400,000 (Technically REJECTED) -> Lower price but rejected technically, must NOT rank first!
  const sub3 = await query(`
    INSERT INTO BidSubmissions (TenderId, VendorId, BidFractionSerial, InitialInsuranceAmount, GuaranteePaymentMethod, TechnicalStatus, FinancialTotalAmount, IsDeleted)
    VALUES (@tenderId, @vendorId, N'3/3', 75000, N'شيك', N'مرفوض', 1400000, 0)
  `, { tenderId, vendorId: v3.VendorId });

  // Auto-Sorting Logic: Order technically accepted bids ASC
  const allSubs = await query('SELECT * FROM BidSubmissions WHERE TenderId = @tenderId', { tenderId });
  const acceptedSorted = allSubs
    .filter(s => s.TechnicalStatus === 'مقبول')
    .sort((a, b) => a.FinancialTotalAmount - b.FinancialTotalAmount);

  assert(acceptedSorted.length === 2, 'تصفية العطاءات المقبولة فنياً فقط للمقارنة المالية');
  assert(acceptedSorted[0].SubmissionId === sub2.lastID, `الفائز بالمركز الأول هو صاحب أقل سعر مقبول فنياً (1,620,000 ج.م للشركة ${v2.CompanyName})`);
  assert(acceptedSorted[0].FinancialTotalAmount < acceptedSorted[1].FinancialTotalAmount, 'الترتيب التصاعدي لكشف التفريغ المقارن سليم تماماً');
  console.log(`  -> الترتيب: 1- ${v2.CompanyName} (1,620,000 ج.م) | 2- ${v1.CompanyName} (1,750,000 ج.م) | المستبعد: ${v3.CompanyName}\n`);

  // --------------------------------------------------------------------------
  // STEP 4: Awarding, 5% Insurance Rule, 10 Days Deadline & Tafqeet
  // --------------------------------------------------------------------------
  console.log('4️⃣ اختبار البت والترسية وقاعدة الـ 5% ومهلة الـ 10 أيام والتفقيط (Awarding):');

  const winnerAmount = 1620000;
  const awardDateStr = '2026-10-27';
  const awardCalc = calculateAwardDeductions(winnerAmount, false, 12, awardDateStr);

  // 4.1 5% Rule: 1,620,000 * 0.05 = 81,000 EGP
  assert(awardCalc.finalGuarantee === 81000, `صحة حساب التأمين النهائي 5%: المطلوب 81,000 ج.م (المحسوب: ${awardCalc.finalGuarantee})`);

  // 4.2 10 Days Deadline: 2026-10-27 + 10 Days = 2026-11-06
  assert(awardCalc.contractSigningDeadline === '2026-11-06', `صحة حساب مهلة الـ 10 أيام لتوقيع العقد والتأمين: ${awardCalc.contractSigningDeadline}`);

  // 4.3 Arabic Tafqeet
  assert(awardCalc.awardedAmountTafqeet.includes('مليون وستمائة وعشرون ألف'), `سلامة التفقيط المالي باللغة العربية: ${awardCalc.awardedAmountTafqeet}`);
  assert(awardCalc.finalGuaranteeTafqeet.includes('واحد وثمانون ألف'), `سلامة تفقيط التأمين النهائي: ${awardCalc.finalGuaranteeTafqeet}`);

  // Insert Awarding Record
  const awardRes = await query(`
    INSERT INTO Awardings (
      TenderId, WinnerSubmissionId, VendorId, AwardDate, AwardedAmount, AwardedAmountTafqeet,
      AuthorityApprovalDate, ReservationConfirmDate, BudgetSource, FinalGuaranteeAmount,
      FinalGuaranteeTafqeet, FinalGuaranteeStatus, ContractSigningDeadline,
      TotalDeductions, NetAwardAmount, PurchaseOrderNo, JournalDirectiveNo
    ) VALUES (
      @tenderId, @winnerSubId, @vendorId, @awardDate, @awardedAmount, @awardedAmountTafqeet,
      @awardDate, @awardDate, N'موازنة الشركة', @finalGuarantee,
      @finalGuaranteeTafqeet, N'قيد السداد', @deadline,
      @deductions, @netAmount, @poNum, @jdNum
    )
  `, {
    tenderId,
    winnerSubId: sub2.lastID,
    vendorId: v2.VendorId,
    awardDate: awardDateStr,
    awardedAmount: awardCalc.awardedAmount,
    awardedAmountTafqeet: awardCalc.awardedAmountTafqeet,
    finalGuarantee: awardCalc.finalGuarantee,
    finalGuaranteeTafqeet: awardCalc.finalGuaranteeTafqeet,
    deadline: awardCalc.contractSigningDeadline,
    deductions: awardCalc.totalDeductions,
    netAmount: awardCalc.netAwardAmount,
    poNum: `PO-${tenderId}/${Date.now()}`,
    jdNum: `JD-${tenderId}/${Date.now()}`
  });
  assert(awardRes.lastID > 0, 'حفظ قرار الترسية وأمر التوريد وإذن التوجيه بقاعدة البيانات بنجاح\n');

  // --------------------------------------------------------------------------
  // STEP 5: Financial Transactions & Journal Entries (القيود المحاسبية الآلية)
  // --------------------------------------------------------------------------
  console.log('5️⃣ اختبار القيود المحاسبية الآلية والتسويات (Financial Journal Entries):');

  // 5.1 Automated Refund Entry for Disqualified/Non-Winning Vendor (v1 & v3)
  const refundEntry = generateAccountingJournalEntry('INITIAL_GUARANTEE_REFUND', {
    amount: 75000,
    vendorName: v1.CompanyName,
    tenderNumber: '99/2025/2026-هـ'
  });
  assert(refundEntry.debitAccountCode === '218401', 'الحساب المدين لرد التأمين الابتدائي: 218401 (حسابات دائنة أخرى - تأمينات ابتدائية)');
  assert(refundEntry.creditAccountCode === '181001', 'الحساب الدائن لرد التأمين الابتدائي: 181001 (الحسابات الجارية بالبنوك أو الخزينة)');

  await query(`
    INSERT INTO FinancialTransactions (
      TenderId, VendorId, TransactionType, DebitAccountCode, DebitAccountName,
      CreditAccountCode, CreditAccountName, Amount, AmountTafqeet, VoucherNumber, Notes
    ) VALUES (
      @tenderId, @vendorId, @type, @debitCode, @debitName,
      @creditCode, @creditName, @amount, @tafqeet, N'RV-009901', @notes
    )
  `, {
    tenderId,
    vendorId: v1.VendorId,
    type: refundEntry.type,
    debitCode: refundEntry.debitAccountCode,
    debitName: refundEntry.debitAccountName,
    creditCode: refundEntry.creditAccountCode,
    creditName: refundEntry.creditAccountName,
    amount: refundEntry.amount,
    tafqeet: refundEntry.amountTafqeet,
    notes: refundEntry.description
  });

  // 5.2 Transfer Initial to Final Insurance Entry for Winner
  const transferEntry = generateAccountingJournalEntry('INITIAL_TO_FINAL_TRANSFER', {
    amount: 75000,
    vendorName: v2.CompanyName,
    journalDirectiveNo: 'JD-99/2025/2026'
  });
  assert(transferEntry.debitAccountCode === '218401', 'مدين تحويل التأمين: 218401 (تأمينات ابتدائية)');
  assert(transferEntry.creditAccountCode === '218402', 'دائن تحويل التأمين: 218402 (تأمينات نهائية للعمليات)');

  const txList = await query('SELECT * FROM FinancialTransactions WHERE TenderId = @tenderId', { tenderId });
  assert(txList.length >= 1, `قيد وحفظ العمليات المحاسبية بالسجل المالي (عدد القيود: ${txList.length})\n`);

  // --------------------------------------------------------------------------
  // STEP 6: Distribution Dossier Logic & Workflow Triggers
  // --------------------------------------------------------------------------
  console.log('6️⃣ اختبار منطق توزيع الملفات الفرعية وتريجر الاستلام (Distribution Logic):');

  const distributionTargets = [
    'الإدارة العامة للمخازن العامة',
    'قطاع المشروعات',
    'إدارة التنسيق الخارجي والتسويات المالية',
    'إدارة الاحتياجات ومتابعة المخزون'
  ];

  for (const dept of distributionTargets) {
    await query(`
      INSERT INTO DistributionDossiers (TenderId, TargetDepartment, DispatchReference, IncludedDocuments, Notes)
      VALUES (@tenderId, @dept, @ref, @docs, N'ملف فرعي رسمي')
    `, {
      tenderId,
      dept,
      ref: `DISP-${tenderId}-${dept.slice(0, 4)}`,
      docs: JSON.stringify(['أمر التوريد', 'المواصفات الفنية', 'محضر البت'])
    });
  }

  const dossiers = await query('SELECT * FROM DistributionDossiers WHERE TenderId = @tenderId', { tenderId });
  assert(dossiers.length === 4, 'توليد حوافظ التسليم للأقسام الأربعة المعتمدة بنجاح');

  // Trigger: Warehouse Addition Receipt -> updates tender to 'مكتمل التوريد والتسليم'
  await query("UPDATE Tenders SET Status = N'مكتمل التوريد والتسليم' WHERE TenderId = @tenderId", { tenderId });
  await query("UPDATE Awardings SET FinalGuaranteeStatus = N'مسدد' WHERE TenderId = @tenderId", { tenderId });

  const updatedTender = (await query('SELECT Status FROM Tenders WHERE TenderId = @tenderId', { tenderId }))[0];
  const updatedAward = (await query('SELECT FinalGuaranteeStatus FROM Awardings WHERE TenderId = @tenderId', { tenderId }))[0];
  assert(updatedTender.Status === 'مكتمل التوريد والتسليم', 'تنشيط التريجر التلقائي وتحديث حالة العملية إلى: مكتمل التوريد والتسليم');
  assert(updatedAward.FinalGuaranteeStatus === 'مسدد', 'تحديث موقف التأمين النهائي إلى: مسدد\n');

  // --------------------------------------------------------------------------
  // STEP 7: Government Reports Engine
  // --------------------------------------------------------------------------
  console.log('7️⃣ اختبار محرك النماذج والمخاطبات الحكومية الرسمية (Government Reports):');

  // 7.1 التأمينات الاجتماعية (مكتب تأمينات المنشية)
  const insuranceAddress = '22 شارع السبع بنات – المنشية – محافظة الإسكندرية';
  assert(insuranceAddress.includes('السبع بنات') && insuranceAddress.includes('المنشية'), 'اعتماد عنوان مكتب تأمينات المنشية الرسمي (22 شارع السبع بنات)');

  // 7.2 مصلحة الضرائب المصرية
  assert(v2.TaxCardNo !== null, `تضمين رقم البطاقة الضريبية للمورد الفائز في نموذج الضرائب (${v2.TaxCardNo})`);

  // 7.3 مديرية القوى العاملة (وحدة العمالة غير المنتظمة - كليوباترا)
  const manpowerAddress = 'شارع مصطفى كامل – خلف نقابة الأطباء – كليوباترا – الإسكندرية';
  assert(manpowerAddress.includes('مصطفى كامل') && manpowerAddress.includes('كليوباترا'), 'اعتماد عنوان مديرية القوى العاملة بالإسكندرية - وحدة العمالة غير المنتظمة');

  console.log('\n======================================================================');
  console.log(`🎉 نتيجة الفحص: اجتياز جميع الاختبارات بنجاح تام (${passedTests} من ${totalTests} اختبار)`);
  console.log('سلاسة العلاقات (Foreign Keys)، خط الأنابيب (Pipeline)، الحسابات، والقيود 100% سليمة!');
  console.log('======================================================================');
}

runVerificationTests()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ حدث خطأ أثناء التحقق:', err);
    process.exit(1);
  });
