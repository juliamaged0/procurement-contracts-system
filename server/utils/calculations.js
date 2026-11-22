/**
 * Procurement & Contracts Calculation Engines & Business Logic
 * محرك الحسابات الآلية لكراسات الشروط والدمغات والاستقطاعات والقيود المحاسبية والتفقيط
 * شركة الصرف الصحي بالإسكندرية (ASDCO)
 */

const { tafqeetCurrency } = require('./tafqeet');

/**
 * حساب سعر كراسة الشروط والمواصفات بالرسوم المحددة في الصفحة 5 و 6 من الكراسة
 * @param {number} basePrice ثمن النسخة غير شامل
 * @param {boolean} isSupply هل عملية توريدات؟
 * @returns {object} تفاصيل التشميل والسعر النهائي
 */
function calculateTenderBookletPrice(basePrice, isSupply = false) {
  const base = parseFloat(basePrice) || 0;
  if (base <= 0) {
    return {
      basePrice: 0,
      adminFees: 0,
      postalStamp: 5,
      mapsFees: isSupply ? 5 : 0,
      vat: 0,
      takafulStamp: 10,
      shaheedStamp: 5,
      rawSum: 20,
      finalPrice: 20,
      miscIncome: 0,
      tafqeet: tafqeetCurrency(20)
    };
  }

  const adminFees = base * 0.20; // مصاريف إدارية 20%
  const postalStamp = 5; // طوابع مراسلات (ثابت)
  const mapsFees = isSupply ? 5 : 0; // خرائط في حالة التوريدات (ثابت 5)
  
  const subtotal = base + adminFees + postalStamp + mapsFees;
  const vat = subtotal * 0.14; // قيمة مضافة 14%

  // شريحة طابع التكافل طبقاً لملاحظة صفحة 6
  let takafulStamp = 150;
  if (base <= 100) takafulStamp = 10;
  else if (base <= 500) takafulStamp = 25;
  else if (base <= 1000) takafulStamp = 50;
  else if (base <= 1500) takafulStamp = 75;
  else if (base <= 2000) takafulStamp = 100;

  const shaheedStamp = 5; // طابع شهيد (ثابت)

  const rawSum = subtotal + vat + takafulStamp + shaheedStamp;
  
  // التكملة لأقرب 5 جنيهات
  const finalPrice = Math.ceil(rawSum / 5) * 5;
  const miscIncome = finalPrice - rawSum;

  return {
    basePrice: Number(base.toFixed(2)),
    adminFees: Number(adminFees.toFixed(2)),
    postalStamp,
    mapsFees,
    subtotal: Number(subtotal.toFixed(2)),
    vat: Number(vat.toFixed(2)),
    takafulStamp,
    shaheedStamp,
    rawSum: Number(rawSum.toFixed(2)),
    finalPrice: Number(finalPrice.toFixed(2)),
    miscIncome: Number(miscIncome.toFixed(2)),
    tafqeet: tafqeetCurrency(finalPrice)
  };
}

/**
 * حساب الاستقطاعات والدمغات الرسمية في شاشة الإسناد (صفحة 27 - 28 من الكراسة)
 * مع قاعدة الـ 5% للتأمين النهائي ومهلة الـ 10 أيام والتفقيط
 * @param {number} awardedAmount مبلغ الترسية الإجمالي
 * @param {boolean} isSupply هل هي توريدات؟
 * @param {number} numOfPages عدد أوراق تقديم العطاء
 * @param {string|Date} awardDate تاريخ الإسناد والترسية
 * @returns {object} تفاصيل التأمين النهائي والدمغات والرسوم والمهلة القانونية
 */
function calculateAwardDeductions(awardedAmount, isSupply = false, numOfPages = 10, awardDate = new Date()) {
  const amount = parseFloat(awardedAmount) || 0;
  const pages = parseInt(numOfPages) || 10;

  // 1. قاعدة التأمين النهائي = 5% من قيمة إجمالي مبلغ الترسية
  const finalGuarantee = amount * 0.05;

  // 2. مهلة الـ 10 أيام: حساب آخر موعد قانوني لسداد التأمين النهائي وتوقيع العقد
  const aDate = new Date(awardDate);
  const deadlineDate = new Date(aDate);
  deadlineDate.setDate(deadlineDate.getDate() + 10);
  const contractSigningDeadline = deadlineDate.toISOString().split('T')[0];

  // 3. دمغة هندسية = إجمالي قيمة الترسية * 0.001
  const engineeringStamp = amount * 0.001;

  // 4. دمغة تطبيقية = 1 للألف الأولى + (كل ألف بعد الأولى * 0.5) * 2
  const thousandsAfterFirst = Math.max(0, Math.ceil((amount - 1000) / 1000));
  const appliedStamp = (1 + (thousandsAfterFirst * 0.5)) * 2;

  // 5. دمغة تنمية = (عدد أوراق العطاء + 3 أمر إسناد + 2 أمر توريد + 6 عقد) * 2
  const devStamp = (pages + 3 + 2 + 6) * 2;

  // 6. دمغة اتساع = دمغة التنمية * 0.90
  const extensionStamp = devStamp * 0.90;

  // 7. الاتحاد المصري للتشييد والبناء = إجمالي قيمة الترسية * 0.0005 (بحد أقصى 5000)
  // لا تحسب لأقل من 200,000 وفي حالة التعاقدات ومقاولات الأعمال فقط
  let federationFee = 0;
  if (!isSupply && amount >= 200000) {
    federationFee = Math.min(5000, amount * 0.0005);
  }

  // 8. طابع شهيد = 5 جنيهات
  const shaheedStamp = 5;

  // 9. تحيا مصر = 1% من قيمة العملية (في حالة التعاقدات ومقاولات الأعمال فقط)
  const tahyaMisrFund = !isSupply ? (amount * 0.01) : 0;

  // 10. الحوالة البريدية (في حالة التعاقدات ومقاولات الأعمال فقط)
  let postalTransferFee = 0;
  if (!isSupply && amount > 0) {
    if (amount > 1000000) {
      postalTransferFee = 40;
    } else {
      const hundredThousandsAfterFirst = Math.max(0, Math.ceil((amount - 100000) / 100000));
      postalTransferFee = Math.min(40, 20 + (hundredThousandsAfterFirst * 2));
    }
  }

  const totalDeductions = engineeringStamp + appliedStamp + devStamp + extensionStamp +
                          federationFee + shaheedStamp + tahyaMisrFund + postalTransferFee;

  const netAwardAmount = amount - totalDeductions;

  return {
    awardedAmount: Number(amount.toFixed(2)),
    awardedAmountTafqeet: tafqeetCurrency(amount),
    finalGuarantee: Number(finalGuarantee.toFixed(2)),
    finalGuaranteeTafqeet: tafqeetCurrency(finalGuarantee),
    contractSigningDeadline,
    daysAllowed: 10,
    engineeringStamp: Number(engineeringStamp.toFixed(2)),
    appliedStamp: Number(appliedStamp.toFixed(2)),
    devStamp: Number(devStamp.toFixed(2)),
    extensionStamp: Number(extensionStamp.toFixed(2)),
    federationFee: Number(federationFee.toFixed(2)),
    shaheedStamp,
    tahyaMisrFund: Number(tahyaMisrFund.toFixed(2)),
    postalTransferFee: Number(postalTransferFee.toFixed(2)),
    totalDeductions: Number(totalDeductions.toFixed(2)),
    totalDeductionsTafqeet: tafqeetCurrency(totalDeductions),
    netAwardAmount: Number(netAwardAmount.toFixed(2)),
    netAwardAmountTafqeet: tafqeetCurrency(netAwardAmount)
  };
}

/**
 * توليد القيود المحاسبية الآلية الخاصة بالعملية
 * @param {string} type نوع القيد: 'INITIAL_GUARANTEE_REFUND' | 'INITIAL_TO_FINAL_TRANSFER' | 'AWARD_DEDUCTIONS'
 * @param {object} params بيانات العملية والمبلغ
 * @returns {object} تفاصيل طرفي القيد المحاسبي والبيان والتفقيط
 */
function generateAccountingJournalEntry(type, params = {}) {
  const amount = parseFloat(params.amount) || 0;
  const tafqeet = tafqeetCurrency(amount);

  if (type === 'INITIAL_GUARANTEE_REFUND') {
    // رد التأمين الابتدائي للمناقصين المستبعدين أو غير الفائزين
    return {
      type: 'رد التأمين الابتدائي',
      debitAccountCode: '218401',
      debitAccountName: 'حـ/ حسابات دائنة أخرى - تأمينات ابتدائية للعمليات (منه)',
      creditAccountCode: '181001',
      creditAccountName: 'حـ/ الحسابات الجارية بالبنوك أو الخزينة الرئيسية (له)',
      amount: Number(amount.toFixed(2)),
      amountTafqeet: tafqeet,
      description: `رد التأمين الابتدائي المسدد للمناقص (${params.vendorName || 'المورد'}) لعملية (${params.tenderNumber || ''}) لعدم الترسية أو انتهاء الغرض`
    };
  }

  if (type === 'INITIAL_TO_FINAL_TRANSFER') {
    // تحويل التأمين الابتدائي إلى نهائي للفائز بموجب إذن التوجيه الحسابي
    return {
      type: 'تحويل تأمين ابتدائي إلى نهائي',
      debitAccountCode: '218401',
      debitAccountName: 'حـ/ حسابات دائنة أخرى - تأمينات ابتدائية (منه)',
      creditAccountCode: '218402',
      creditAccountName: 'حـ/ حسابات دائنة أخرى - تأمينات نهائية للعمليات (له)',
      amount: Number(amount.toFixed(2)),
      amountTafqeet: tafqeet,
      description: `تحويل التأمين الابتدائي إلى تأمين نهائي للفائز (${params.vendorName || 'المورد'}) بموجب إذن التوجيه الحسابي رقم (${params.journalDirectiveNo || ''})`
    };
  }

  if (type === 'AWARD_DEDUCTIONS') {
    // قيد خصم الاستقطاعات والدمغات الرسمية من أمر الإسناد
    return {
      type: 'خصم دمغات ورسوم الإسناد',
      debitAccountCode: '218101',
      debitAccountName: 'حـ/ مستحقات الموردين والمقاولين (منه)',
      creditAccountCode: '218500',
      creditAccountName: 'حـ/ الهيئات والمصالح الدائنة - دمغات ورسوم قانونية وصناديق (له)',
      amount: Number(amount.toFixed(2)),
      amountTafqeet: tafqeet,
      description: `خصم الدمغات الهندسية والتطبيقية والتنمية والرسوم المقررة قانوناً من أمر الإسناد والتوريد رقم (${params.purchaseOrderNo || ''})`
    };
  }

  return null;
}

/**
 * تحديد حدود سلطة الاعتماد المالي طبقاً لجدول صلاحيات السلطة المختصة
 * @param {string} method نوع العملية
 * @param {number} amount القيمة التقديرية
 * @returns {string} الجهة صاحبة السلطة
 */
function getApprovalAuthority(method, amount) {
  const val = parseFloat(amount) || 0;

  if (method === 'مناقصة عامة' || method === 'ممارسة عامة') {
    if (val <= 1500000) return 'نائب رئيس مجلس الإدارة / رئيس القطاع المالي';
    if (val <= 30000000) return 'رئيس مجلس الإدارة';
    return 'مجلس الإدارة';
  }
  if (method === 'مناقصة محدودة' || method === 'ممارسة محدودة') {
    if (val <= 1000000) return 'نائب رئيس مجلس الإدارة';
    if (val <= 15000000) return 'رئيس مجلس الإدارة';
    return 'مجلس الإدارة';
  }
  if (method === 'ممارسة محلية') {
    if (val <= 500000) return 'نائب رئيس مجلس الإدارة';
    if (val <= 5000000) return 'رئيس مجلس الإدارة';
    return 'مجلس الإدارة';
  }
  if (method === 'أمر مباشر') {
    if (val <= 100000) return 'نائب رئيس مجلس الإدارة';
    if (val <= 2000000) return 'رئيس مجلس الإدارة';
    return 'مجلس الإدارة';
  }

  return 'رئيس مجلس الإدارة';
}

module.exports = {
  calculateTenderBookletPrice,
  calculateAwardDeductions,
  generateAccountingJournalEntry,
  getApprovalAuthority,
  tafqeetCurrency
};
