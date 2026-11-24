import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FolderOpen, 
  Search, 
  ShieldAlert, 
  CheckSquare, 
  Plus, 
  Trash2, 
  Layers, 
  AlertCircle,
  FileCheck2,
  Lock,
  Unlock,
  Printer,
  X,
  Building2,
  Calendar,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  FileText
} from 'lucide-react';

export default function EnvelopeOpening() {
  const [tenders, setTenders] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [selectedTenderId, setSelectedTenderId] = useState('');
  const [submissions, setSubmissions] = useState([]);
  const [tenderItems, setTenderItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // Active Session Filter for Two Envelopes (فني vs مالي)
  const [sessionPhase, setSessionPhase] = useState('technical'); // 'technical' | 'financial'

  // Drawer / Modal for Opening a specific submission
  const [activeSubmission, setActiveSubmission] = useState(null);
  const [isNewBidModalOpen, setIsNewBidModalOpen] = useState(false);
  const [showMinutesModal, setShowMinutesModal] = useState(false);

  // New Bid Form State
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('نقداً');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0]);
  const [checkNumber, setCheckNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [checkDate, setCheckDate] = useState('');
  const [guaranteeLetterNo, setGuaranteeLetterNo] = useState('');
  const [guaranteeLetterExpiryDate, setGuaranteeLetterExpiryDate] = useState('');
  const [initialInsuranceAmount, setInitialInsuranceAmount] = useState(0);

  // Technical Checklist
  const [checklist, setChecklist] = useState({
    hasCommercialRegister: true,
    hasTaxCard: true,
    hasFederationCert: false,
    hasEInvoiceModel: true,
    hasAdvancePaymentCert: false,
    hasPreviousWorks: true,
    hasVATCert: true,
    hasCatalog: false,
    hasCert14S: false,
    hasCert4S: false,
    sampleSubmitted: false,
    sampleNumber: '',
    sampleNotes: ''
  });

  // Dynamic Bid Items for Active Form
  const [activeItems, setActiveItems] = useState([]);
  const [activeTechnicalNotes, setActiveTechnicalNotes] = useState('');
  const [activeFinancialNotes, setActiveFinancialNotes] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedTenderId) {
      loadTenderDetails(selectedTenderId);
    }
  }, [selectedTenderId]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [tRes, vRes] = await Promise.all([
        axios.get('/api/tenders'),
        axios.get('/api/vendors')
      ]);
      setTenders(tRes.data || []);
      setVendors(vRes.data || []);
      if (tRes.data && tRes.data.length > 0) {
        setSelectedTenderId(tRes.data[0].TenderId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadTenderDetails = async (tenderId) => {
    try {
      setLoading(true);
      const [sRes, iRes] = await Promise.all([
        axios.get(`/api/tenders/${tenderId}/submissions`),
        axios.get(`/api/tenders/${tenderId}/items`)
      ]);
      setSubmissions(sRes.data || []);
      setTenderItems(iRes.data || []);

      const currentTender = tenders.find(t => t.TenderId == tenderId);
      if (currentTender) {
        setInitialInsuranceAmount(currentTender.InitialGuaranteeAmount || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const selectedTender = tenders.find(t => t.TenderId == selectedTenderId);
  const selectedVendor = vendors.find(v => v.VendorId == selectedVendorId);

  const isTwoEnvelopes = selectedTender?.SubmittalType === 'مظروفيين' || selectedTender?.SubmittalType === 'مظروفين';
  const isPointSystem = selectedTender?.TechnicalEvaluationMethod === 'نظام نقاط';
  const minPassingScore = parseFloat(selectedTender?.MinPassingScore) || 70;

  // Initialize Items for a new or existing bid
  const initItemsForSubmission = (existingBidItems = []) => {
    return tenderItems.map((masterItem, idx) => {
      const match = existingBidItems.find(bi => bi.TenderItemId == masterItem.ItemId || bi.ItemName === masterItem.ItemDescription);
      
      // Setup default criteria scores if point system
      let initialCriteriaScores = [];
      if (isPointSystem) {
        const criteriaDefs = masterItem.criteriaList && masterItem.criteriaList.length > 0
          ? masterItem.criteriaList
          : [
              { name: 'مطابقة المواصفات الفنية وجودة الخامات', maxScore: 40 },
              { name: 'سابقة الأعمال والخبرة في مشروعات مماثلة', maxScore: 25 },
              { name: 'شهادات الجودة وفترات الضمان المعتمدة', maxScore: 20 },
              { name: 'البرنامج الزمني للتوريد وسرعة الاستجابة', maxScore: 15 }
            ];

        initialCriteriaScores = criteriaDefs.map(c => {
          const prevCrit = (match?.criteriaScores || []).find(sc => sc.name === c.name);
          return {
            name: c.name,
            maxScore: parseFloat(c.maxScore) || 25,
            score: prevCrit ? parseFloat(prevCrit.score) : parseFloat(c.maxScore) // default full
          };
        });
      }

      const totalItemScore = initialCriteriaScores.reduce((acc, c) => acc + (parseFloat(c.score) || 0), 0);

      return {
        BidItemId: match?.BidItemId,
        tenderItemId: masterItem.ItemId,
        itemNumber: masterItem.ItemNumber || idx + 1,
        itemName: masterItem.ItemDescription,
        specs: masterItem.ItemSpecs || masterItem.Notes || '',
        unitType: masterItem.Unit || 'عدد',
        quantity: parseFloat(masterItem.EstimatedQuantity) || 1,
        unitPrice: match ? parseFloat(match.UnitPrice || match.QuotedUnitPrice || 0) : 0,
        totalPrice: match ? parseFloat(match.TotalPrice || 0) : 0,
        technicalStatus: match?.TechnicalStatus || 'مطابق',
        itemScore: match?.ItemScore !== undefined ? parseFloat(match.ItemScore) : totalItemScore,
        criteriaScores: initialCriteriaScores,
        financialDiscountPercent: match?.FinancialDiscountPercent || 0,
        financialNotes: match?.FinancialNotes || '',
        notes: match?.Notes || ''
      };
    });
  };

  // Open existing submission for inspection/update
  const handleOpenSubmission = (sub) => {
    setActiveSubmission(sub);
    setPaymentMethod(sub.GuaranteePaymentMethod || 'نقداً');
    setReceiptNumber(sub.ReceiptNumber || '');
    setReceiptDate(sub.ReceiptDate ? sub.ReceiptDate.split('T')[0] : '');
    setCheckNumber(sub.CheckNumber || '');
    setBankName(sub.BankName || '');
    setCheckDate(sub.CheckDate ? sub.CheckDate.split('T')[0] : '');
    setGuaranteeLetterNo(sub.GuaranteeLetterNo || '');
    setGuaranteeLetterExpiryDate(sub.GuaranteeLetterExpiryDate ? sub.GuaranteeLetterExpiryDate.split('T')[0] : '');
    setInitialInsuranceAmount(sub.InitialInsuranceAmount || selectedTender?.InitialGuaranteeAmount || 0);

    setChecklist({
      hasCommercialRegister: !!sub.HasCommercialRegister,
      hasTaxCard: !!sub.HasTaxCard,
      hasFederationCert: !!sub.HasFederationCert,
      hasEInvoiceModel: !!sub.HasEInvoiceModel,
      hasAdvancePaymentCert: !!sub.HasAdvancePaymentCert,
      hasPreviousWorks: !!sub.HasPreviousWorks,
      hasVATCert: !!sub.HasVATCert,
      hasCatalog: !!sub.HasCatalog,
      hasCert14S: !!sub.HasCert14S,
      hasCert4S: !!sub.HasCert4S,
      sampleSubmitted: !!sub.SampleSubmitted,
      sampleNumber: sub.SampleNumber || '',
      sampleNotes: sub.SampleNotes || ''
    });

    setActiveTechnicalNotes(sub.TechnicalNotes || '');
    setActiveFinancialNotes(sub.FinancialNotes || '');
    setActiveItems(initItemsForSubmission(sub.items || []));
  };

  // Open modal to add a brand new bid
  const handleStartNewBid = () => {
    setSelectedVendorId('');
    setActiveSubmission(null);
    setPaymentMethod('نقداً');
    setReceiptNumber('');
    setReceiptDate(new Date().toISOString().split('T')[0]);
    setCheckNumber('');
    setBankName('');
    setCheckDate('');
    setGuaranteeLetterNo('');
    setGuaranteeLetterExpiryDate('');
    setInitialInsuranceAmount(selectedTender?.InitialGuaranteeAmount || 0);

    setChecklist({
      hasCommercialRegister: true,
      hasTaxCard: true,
      hasFederationCert: false,
      hasEInvoiceModel: true,
      hasAdvancePaymentCert: false,
      hasPreviousWorks: true,
      hasVATCert: true,
      hasCatalog: false,
      hasCert14S: false,
      hasCert4S: false,
      sampleSubmitted: false,
      sampleNumber: '',
      sampleNotes: ''
    });

    setActiveTechnicalNotes('');
    setActiveFinancialNotes('');
    setActiveItems(initItemsForSubmission([]));
    setIsNewBidModalOpen(true);
  };

  // Criteria score change handler
  const handleCriteriaScoreChange = (itemIdx, critIdx, newScore) => {
    const newItems = [...activeItems];
    const it = newItems[itemIdx];
    const crit = it.criteriaScores[critIdx];
    const val = Math.min(Math.max(parseFloat(newScore) || 0, 0), crit.maxScore);
    crit.score = val;
    it.itemScore = it.criteriaScores.reduce((sum, c) => sum + (parseFloat(c.score) || 0), 0);
    setActiveItems(newItems);
  };

  // Item field change handler
  const handleItemFieldChange = (idx, field, value) => {
    const newItems = [...activeItems];
    newItems[idx][field] = value;
    if (field === 'unitPrice' || field === 'quantity') {
      const q = parseFloat(newItems[idx].quantity || 0);
      const p = parseFloat(newItems[idx].unitPrice || 0);
      newItems[idx].totalPrice = q * p;
    }
    setActiveItems(newItems);
  };

  // Calculate overall technical score and status
  const calculateOverallTechnical = () => {
    if (isPointSystem) {
      if (activeItems.length === 0) return { score: 100, status: 'مقبول أساسي' };
      const avgScore = activeItems.reduce((acc, it) => acc + (parseFloat(it.itemScore) || 0), 0) / activeItems.length;
      const rounded = Math.round(avgScore * 10) / 10;
      const isPass = rounded >= minPassingScore;
      return {
        score: rounded,
        status: isPass ? 'مقبول أساسي' : 'مرفوض فنياً لعدم اجتياز نقاط التقييم'
      };
    } else {
      const hasNonCompliant = activeItems.some(it => it.technicalStatus === 'غير مطابق');
      return {
        score: hasNonCompliant ? 50 : 100,
        status: hasNonCompliant ? 'مرفوض فنياً لعدم مطابقة المواصفات' : 'مقبول أساسي'
      };
    }
  };

  // Save Bid (Create or Update)
  const handleSaveBid = async (e) => {
    e.preventDefault();

    if (!selectedTenderId) {
      alert('يرجى اختيار العملية المطروحة أولاً');
      return;
    }

    const { score: computedScore, status: computedStatus } = calculateOverallTechnical();
    const financialSum = activeItems.reduce((sum, it) => sum + (parseFloat(it.quantity || 0) * parseFloat(it.unitPrice || 0)), 0);

    const payload = {
      tenderId: selectedTenderId,
      vendorId: activeSubmission ? activeSubmission.VendorId : selectedVendorId,
      initialInsuranceAmount,
      guaranteePaymentMethod: paymentMethod,
      initialInsuranceStatus: 'ساري',
      receiptNumber,
      receiptDate,
      checkNumber,
      bankName,
      checkDate,
      guaranteeLetterNo,
      guaranteeLetterExpiryDate,
      ...checklist,
      technicalStatus: activeSubmission ? activeSubmission.TechnicalStatus || computedStatus : computedStatus,
      technicalScore: computedScore,
      envelopeStage: sessionPhase === 'financial' || !isTwoEnvelopes ? 'مكتمل' : 'فني',
      financialEnvelopeOpened: sessionPhase === 'financial' || !isTwoEnvelopes,
      technicalNotes: activeTechnicalNotes,
      financialNotes: activeFinancialNotes,
      items: activeItems
    };

    try {
      if (activeSubmission) {
        // Update
        await axios.put(`/api/submissions/${activeSubmission.SubmissionId}`, payload);
        alert('تم تحديث بيانات تفريغ العطاء بنجاح 💾');
      } else {
        // Create new
        if (!selectedVendorId) {
          alert('يرجى اختيار صاحب العطاء (الشركة / المورد)');
          return;
        }
        if (selectedVendor?.IsBlacklisted) {
          alert(`لا يمكن تسجيل العطاء لأن الشركة (${selectedVendor.CompanyName}) مسجلة بسجل الشطب والممنوعين.`);
          return;
        }
        await axios.post('/api/submissions', payload);
        alert('تم تسجيل واستلام العطاء بنجاح 💾');
      }

      setActiveSubmission(null);
      setIsNewBidModalOpen(false);
      loadTenderDetails(selectedTenderId);
    } catch (err) {
      alert('خطأ أثناء حفظ العطاء: ' + (err.response?.data?.error || err.message));
    }
  };

  // Financial total of all items in current active form
  const activeFinancialTotal = activeItems.reduce((sum, it) => sum + (parseFloat(it.quantity || 0) * parseFloat(it.unitPrice || 0)), 0);

  // Filter submissions by session phase if two envelopes
  const displayedSubmissions = submissions.filter(sub => {
    if (!isTwoEnvelopes) return true;
    if (sessionPhase === 'financial') {
      // In financial session, show all but highlight technically accepted
      return true;
    }
    return true;
  });

  return (
    <div className="space-y-6" dir="rtl">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <FolderOpen className="w-6 h-6 text-sky-600" />
            <span>ثانياً: شاشة فض المظاريف وتفريغ العطاءات</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            إدارة جلسات فتح المظاريف، الفحص الفني للبنود التلقائية، وفض المظاريف المالية طبقاً لأحكام القانون 182 ولائحة الشركة.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMinutesModal(true)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow"
          >
            <Printer className="w-4 h-4 text-sky-400" />
            <span>عرض وطباعة محضر فتح المظاريف</span>
          </button>

          <button
            onClick={handleStartNewBid}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-sky-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>+ تسجيل مظروف عطاء جديد</span>
          </button>
        </div>
      </div>

      {/* Tender Selection & Meta Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        {/* Row 1: Dropdown selector */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-1">
            <span className="p-2.5 rounded-xl bg-sky-100 text-sky-700 shrink-0">
              <Search className="w-4 h-4" />
            </span>
            <div className="flex-1">
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                استعلام واختيار العملية المطروحة:
              </label>
              <select
                value={selectedTenderId}
                onChange={(e) => setSelectedTenderId(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-bold text-slate-800 bg-slate-50 hover:bg-white focus:bg-white focus:ring-2 focus:ring-sky-500 outline-none transition-all cursor-pointer shadow-sm"
              >
                {tenders.map((t) => (
                  <option key={t.TenderId} value={t.TenderId}>
                    [{t.TenderNumber}] {t.OperationName || t.TenderName} — ({t.TenderMethod})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Row 2: Structured Parameter Cards */}
        {selectedTender && (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <span className="text-slate-500 font-semibold">نظام الطرح:</span>
              <span className={`px-2.5 py-0.5 rounded-lg font-bold text-[11px] ${
                isTwoEnvelopes ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
              }`}>
                {isTwoEnvelopes ? 'مظروفين (فني + مالي)' : 'مظروف واحد'}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <span className="text-slate-500 font-semibold">أسلوب التقييم:</span>
              <span className={`px-2.5 py-0.5 rounded-lg font-bold text-[11px] ${
                isPointSystem ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {isPointSystem ? `نقاط (حد أدنى ${minPassingScore}%)` : 'مطابق أو غير مطابق'}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <span className="text-slate-500 font-semibold">التأمين المطلوب:</span>
              <span className="font-mono font-bold text-emerald-800 text-xs">
                {selectedTender.InitialGuaranteeAmount?.toLocaleString()} ج.م
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <span className="text-slate-500 font-semibold">بنود الكراسة:</span>
              <span className="font-mono font-bold text-sky-800 text-xs">
                {tenderItems.length} بنود
              </span>
            </div>
          </div>
        )}

        {/* Two-Envelope Session Toggle */}
        {isTwoEnvelopes && (
          <div className="flex flex-wrap items-center gap-2 border-t pt-3">
            <span className="text-xs font-bold text-slate-600 ml-2">مرحلة جلسة الفض:</span>
            <button
              type="button"
              onClick={() => setSessionPhase('technical')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                sessionPhase === 'technical'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20 ring-2 ring-sky-300'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <FolderOpen className="w-4 h-4" />
              <span>1. جلسة فتح المظاريف الفنية (التأمين والأوراق والمواصفات)</span>
            </button>

            <button
              type="button"
              onClick={() => setSessionPhase('financial')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                sessionPhase === 'financial'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 ring-2 ring-emerald-300'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Unlock className="w-4 h-4" />
              <span>2. جلسة فتح المظاريف المالية (للمقبولين فنياً فقط)</span>
            </button>
          </div>
        )}
      </div>

      {/* Envelopes Cards Grid (المظاريف المقدمة على العملية) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
            <Layers className="w-5 h-5 text-sky-600" />
            <span>المظاريف والعطاءات المقدمة على العملية ({submissions.length} عطاء)</span>
          </div>
          <span className="text-xs text-slate-500">
            اضغط على أي مظروف للدخول في تفاصيل الفض والتفريغ واحد واحد 👇
          </span>
        </div>

        {submissions.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 space-y-3">
            <FolderOpen className="w-12 h-12 mx-auto text-slate-300 stroke-1" />
            <p className="text-sm font-semibold">لم يتم تسجيل أو فض أي عطاءات لهذه العملية حتى الآن.</p>
            <button
              onClick={handleStartNewBid}
              className="px-4 py-2 bg-sky-600 text-white text-xs font-bold rounded-xl shadow hover:bg-sky-700"
            >
              + اضغط هنا لتسجيل أول عطاء
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedSubmissions.map((sub, idx) => {
              const isAccepted = sub.TechnicalStatus?.startsWith('مقبول');
              const isRejected = sub.TechnicalStatus?.includes('مرفوض');
              const isFinancialOpen = sub.FinancialEnvelopeOpened;

              return (
                <div
                  key={sub.SubmissionId}
                  onClick={() => handleOpenSubmission(sub)}
                  className={`rounded-2xl border-2 p-4 cursor-pointer transition-all hover:shadow-lg relative overflow-hidden ${
                    activeSubmission?.SubmissionId === sub.SubmissionId
                      ? 'border-sky-500 bg-sky-50/50 ring-4 ring-sky-100 shadow-md'
                      : isRejected
                      ? 'border-rose-200 bg-rose-50/30 hover:border-rose-300'
                      : isAccepted
                      ? 'border-emerald-200 bg-emerald-50/20 hover:border-emerald-300'
                      : 'border-slate-200 bg-white hover:border-sky-300'
                  }`}
                >
                  {/* Top Bar inside Card */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 flex items-center gap-1">
                      <span>عطاء:</span>
                      <span dir="ltr" className="font-mono font-extrabold">{sub.BidFractionSerial || `${idx + 1}/${submissions.length}`}</span>
                    </span>

                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      sub.IsBlacklisted
                        ? 'bg-rose-100 text-rose-800 border border-rose-300'
                        : sub.IsRegistered
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {sub.IsBlacklisted ? '⛔ مشطوبة' : sub.IsRegistered ? '🟢 مسجلة' : '🟡 سابقة أعمال'}
                    </span>
                  </div>

                  <h4 className="font-bold text-sm text-slate-800 line-clamp-1 mb-2">
                    {sub.CompanyName}
                  </h4>

                  {/* Badges / Status Rows */}
                  <div className="space-y-1.5 text-xs text-slate-600 border-t pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">التأمين الابتدائي:</span>
                      <span className="font-semibold font-mono text-slate-700">
                        {sub.InitialInsuranceAmount?.toLocaleString()} ج.م ({sub.GuaranteePaymentMethod})
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">الحالة الفنية:</span>
                      <span className={`font-bold ${
                        isAccepted ? 'text-emerald-700' : isRejected ? 'text-rose-700' : 'text-slate-700'
                      }`}>
                        {sub.TechnicalStatus || 'تحت التقييم'} {sub.TechnicalScore ? `(${sub.TechnicalScore}%)` : ''}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">المظروف المالي:</span>
                      {isTwoEnvelopes && !isFinancialOpen ? (
                        <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200 flex items-center gap-1">
                          <Lock className="w-3 h-3" />مغلق ومحروز
                        </span>
                      ) : (
                        <span className="font-mono font-bold text-emerald-800">
                          {sub.FinancialTotalAmount?.toLocaleString()} ج.م
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bottom Action Hint */}
                  <div className="mt-3 pt-2.5 border-t flex items-center justify-between text-xs font-bold">
                    <span className="text-sky-600 hover:text-sky-800 flex items-center gap-1">
                      فتح فحص وتفريغ العطاء ←
                    </span>
                    {activeSubmission?.SubmissionId === sub.SubmissionId && (
                      <span className="text-[11px] bg-sky-100 text-sky-800 px-2 py-0.5 rounded-full font-extrabold">
                        قيد التعديل الآن ✍️
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Envelope Inspection & Details Workspace (عند اختيار أي مظروف) */}
      {(activeSubmission || isNewBidModalOpen) && (
        <form onSubmit={handleSaveBid} className="bg-white rounded-2xl border-2 border-sky-400 p-6 shadow-xl space-y-6">
          
          <div className="flex items-center justify-between border-b pb-4 bg-sky-50/60 -mx-6 -mt-6 p-6 rounded-t-2xl">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-sky-600 text-white rounded-xl text-xs font-extrabold">
                  {activeSubmission ? `تفريغ العطاء: ${activeSubmission.BidFractionSerial}` : 'تسجيل عطاء جديد'}
                </span>
                <h3 className="font-extrabold text-slate-800 text-base">
                  {activeSubmission ? activeSubmission.CompanyName : 'إدخال بيانات المظروف والعطاء'}
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                البنود مدرجة تلقائياً من كراسة شروط العملية. يمكنك فحص مطابقة كل بند، إدخال درجات التقييم، وتفريغ الأسعار.
              </p>
            </div>

            <button
              type="button"
              onClick={() => { setActiveSubmission(null); setIsNewBidModalOpen(false); }}
              className="p-2 hover:bg-slate-200 text-slate-500 rounded-xl"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Section 1: Vendor Selection & Initial Guarantee */}
          <div className="space-y-4">
            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2 border-b pb-2">
              <Building2 className="w-4 h-4 text-sky-600" />
              <span>1. بيانات صاحب العطاء والتأمين الابتدائي</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {!activeSubmission ? (
                <div className="lg:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم صاحب العطاء (المورد / المقاول) *</label>
                  <select
                    required
                    value={selectedVendorId}
                    onChange={(e) => setSelectedVendorId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-xs font-semibold focus:ring-2 focus:ring-sky-500 outline-none"
                  >
                    <option value="">-- اختر الشركة المتقدمة بالعطاء --</option>
                    {vendors.map((v) => (
                      <option key={v.VendorId} value={v.VendorId}>
                        {v.CompanyName} (بطاقة: {v.TaxCardNo}) {v.IsBlacklisted ? '⛔ [مشطوبة]' : v.IsRegistered ? '🟢 [مسجلة]' : '🟡 [سابقة أعمال]'}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="lg:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم صاحب العطاء</label>
                  <div className="p-2.5 bg-slate-50 border rounded-xl text-xs font-bold text-slate-800">
                    {activeSubmission.CompanyName} (بطاقة ضريبية: {activeSubmission.TaxCardNo})
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">قيمة التأمين الابتدائي (ج.م)</label>
                <input
                  type="number"
                  required
                  value={initialInsuranceAmount}
                  onChange={(e) => setInitialInsuranceAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border rounded-xl text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">طريقة سداد التأمين</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs font-bold"
                >
                  <option value="نقداً">نقداً بموجب إيصال خزينة</option>
                  <option value="خطاب ضمان">خطاب ضمان بنكي غير مشروط</option>
                  <option value="شيك">شيك مقبول الدفع</option>
                  <option value="خصم من مستحقاته">خصم من مستحقات سارية</option>
                </select>
              </div>
            </div>

            {/* Payment Details Sub-row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border text-xs">
              {paymentMethod === 'نقداً' && (
                <>
                  <div>
                    <label className="block text-slate-600 mb-1">رقم إيصال السداد</label>
                    <input
                      type="text"
                      value={receiptNumber}
                      onChange={(e) => setReceiptNumber(e.target.value)}
                      placeholder="مثال: REC-4921"
                      className="w-full px-3 py-1.5 border rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">تاريخ الإيصال</label>
                    <input
                      type="date"
                      value={receiptDate}
                      onChange={(e) => setReceiptDate(e.target.value)}
                      className="w-full px-3 py-1.5 border rounded-lg"
                    />
                  </div>
                </>
              )}

              {paymentMethod === 'خطاب ضمان' && (
                <>
                  <div>
                    <label className="block text-slate-600 mb-1">رقم خطاب الضمان</label>
                    <input
                      type="text"
                      value={guaranteeLetterNo}
                      onChange={(e) => setGuaranteeLetterNo(e.target.value)}
                      placeholder="مثال: LG-88219"
                      className="w-full px-3 py-1.5 border rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">البنك المصدر</label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="مثال: البنك الأهلي المصري"
                      className="w-full px-3 py-1.5 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">تاريخ انتهاء السريان</label>
                    <input
                      type="date"
                      value={guaranteeLetterExpiryDate}
                      onChange={(e) => setGuaranteeLetterExpiryDate(e.target.value)}
                      className="w-full px-3 py-1.5 border rounded-lg"
                    />
                  </div>
                </>
              )}

              {paymentMethod === 'شيك' && (
                <>
                  <div>
                    <label className="block text-slate-600 mb-1">رقم الشيك المقبول الدفع</label>
                    <input
                      type="text"
                      value={checkNumber}
                      onChange={(e) => setCheckNumber(e.target.value)}
                      className="w-full px-3 py-1.5 border rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">البنك المسحوب عليه</label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full px-3 py-1.5 border rounded-lg"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Section 2: Technical Legal Documents Checklist */}
          <div className="space-y-3 border-t pt-4">
            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-sky-600" />
              <span>2. استيفاء مستندات المظروف الفني والأوراق القانونية</span>
            </h4>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl text-xs border">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist.hasCommercialRegister}
                  onChange={(e) => setChecklist({ ...checklist, hasCommercialRegister: e.target.checked })}
                  className="w-4 h-4 text-sky-600 rounded"
                />
                <span>السجل التجاري ساري</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist.hasTaxCard}
                  onChange={(e) => setChecklist({ ...checklist, hasTaxCard: e.target.checked })}
                  className="w-4 h-4 text-sky-600 rounded"
                />
                <span>البطاقة الضريبية سارية</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist.hasFederationCert}
                  onChange={(e) => setChecklist({ ...checklist, hasFederationCert: e.target.checked })}
                  className="w-4 h-4 text-sky-600 rounded"
                />
                <span>شهادة الاتحاد المصري للبناء</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist.hasEInvoiceModel}
                  onChange={(e) => setChecklist({ ...checklist, hasEInvoiceModel: e.target.checked })}
                  className="w-4 h-4 text-sky-600 rounded"
                />
                <span>منظومة الفاتورة الإلكترونية</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist.hasVATCert}
                  onChange={(e) => setChecklist({ ...checklist, hasVATCert: e.target.checked })}
                  className="w-4 h-4 text-sky-600 rounded"
                />
                <span>شهادة ضريبة القيمة المضافة</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist.hasPreviousWorks}
                  onChange={(e) => setChecklist({ ...checklist, hasPreviousWorks: e.target.checked })}
                  className="w-4 h-4 text-sky-600 rounded"
                />
                <span>سابقة أعمال معتمدة</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist.sampleSubmitted}
                  onChange={(e) => setChecklist({ ...checklist, sampleSubmitted: e.target.checked })}
                  className="w-4 h-4 text-sky-600 rounded"
                />
                <span>تم تقديم عينة معتمدة</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist.hasCatalog}
                  onChange={(e) => setChecklist({ ...checklist, hasCatalog: e.target.checked })}
                  className="w-4 h-4 text-sky-600 rounded"
                />
                <span>كتالوجات المواصفات الفنية</span>
              </label>
            </div>
          </div>

          {/* Section 3: Automatic Items Breakdown & Evaluation */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div>
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <Layers className="w-4 h-4 text-sky-600" />
                  <span>3. تفريغ بنود العملية المطروحة (تلقائياً من كراسة الشروط)</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isPointSystem 
                    ? 'يتم تقييم كل بند وفقاً لمعايير النقاط المحددة في الطرح، وتُجمع الدرجات آلياً.'
                    : 'يتم تحديد مطابقة كل بند للمواصفات الفنية (مطابق / غير مطابق).'}
                </p>
              </div>

              {isTwoEnvelopes && sessionPhase === 'technical' && (
                <div className="text-xs font-bold px-3 py-1 rounded-xl bg-purple-50 text-purple-800 border border-purple-200 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  <span>جلسة فنية: الأسعار المالية تظل مغلقة حتى انتهاء البت الفني</span>
                </div>
              )}
            </div>

            {/* Table of Items */}
            <div className="overflow-x-auto border rounded-2xl shadow-sm">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b">
                  <tr>
                    <th className="p-3 w-12 text-center">#</th>
                    <th className="p-3">اسم البند والمواصفات الفنية</th>
                    <th className="p-3 w-20">الوحدة</th>
                    <th className="p-3 w-24">الكمية</th>
                    
                    {/* Column for Technical Evaluation (Points or Pass/Fail) */}
                    <th className="p-3 min-w-[200px]">
                      {isPointSystem ? 'نقاط التقييم الفني للبند' : 'المطابقة الفنية للبند'}
                    </th>

                    {/* Column for Financial Pricing (if single envelope or financial session) */}
                    {(!isTwoEnvelopes || sessionPhase === 'financial') && (
                      <>
                        <th className="p-3 w-32">سعر الوحدة (ج.م)</th>
                        <th className="p-3 w-32">إجمالي البند</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3 text-center font-bold font-mono text-slate-500">
                        {item.itemNumber}
                      </td>

                      <td className="p-3">
                        <div className="font-bold text-slate-800 text-sm">{item.itemName}</div>
                        {item.specs && (
                          <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                            المواصفة: {item.specs}
                          </div>
                        )}
                      </td>

                      <td className="p-3 font-semibold text-slate-600">{item.unitType}</td>

                      <td className="p-3 font-bold font-mono text-slate-800">{item.quantity}</td>

                      {/* Technical Evaluation Cell */}
                      <td className="p-3">
                        {isPointSystem ? (
                          <div className="space-y-2 bg-slate-50 p-2.5 rounded-xl border">
                            <div className="flex items-center justify-between font-bold text-[11px] text-sky-800">
                              <span>مجموع درجات البند:</span>
                              <span className="font-mono text-xs">{item.itemScore} / 100</span>
                            </div>

                            {item.criteriaScores.map((c, cIdx) => (
                              <div key={cIdx} className="flex items-center justify-between gap-2 text-[10px]">
                                <span className="text-slate-600 truncate max-w-[140px]" title={c.name}>{c.name}:</span>
                                <div className="flex items-center gap-1 shrink-0">
                                  <input
                                    type="number"
                                    min="0"
                                    max={c.maxScore}
                                    step="0.5"
                                    value={c.score}
                                    onChange={(e) => handleCriteriaScoreChange(idx, cIdx, e.target.value)}
                                    className="w-14 px-1.5 py-0.5 border rounded text-center font-mono font-bold bg-white focus:ring-1 focus:ring-sky-500"
                                  />
                                  <span className="text-slate-400 font-mono">/{c.maxScore}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <select
                              value={item.technicalStatus}
                              onChange={(e) => handleItemFieldChange(idx, 'technicalStatus', e.target.value)}
                              className={`w-full px-2.5 py-1.5 border rounded-lg font-bold text-xs outline-none ${
                                item.technicalStatus === 'مطابق'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                  : 'bg-rose-50 text-rose-800 border-rose-300'
                              }`}
                            >
                              <option value="مطابق">✓ مطابق للمواصفات الفنية</option>
                              <option value="غير مطابق">✗ غير مطابق للمواصفات الفنية</option>
                              <option value="مطابق مع تحفظات">⚠️ مطابق مع تحفظات فنية</option>
                            </select>

                            <input
                              type="text"
                              value={item.notes || ''}
                              onChange={(e) => handleItemFieldChange(idx, 'notes', e.target.value)}
                              placeholder="ملاحظات المطابقة الفنية للبند..."
                              className="w-full px-2 py-1 border rounded text-[11px] outline-none"
                            />
                          </div>
                        )}
                      </td>

                      {/* Financial Pricing Cells */}
                      {(!isTwoEnvelopes || sessionPhase === 'financial') && (
                        <>
                          <td className="p-3">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              required
                              value={item.unitPrice}
                              onChange={(e) => handleItemFieldChange(idx, 'unitPrice', e.target.value)}
                              placeholder="سعر الوحدة"
                              className="w-full px-2.5 py-1.5 border rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-sky-500 outline-none"
                            />
                          </td>

                          <td className="p-3 font-mono font-bold text-emerald-800 text-sm">
                            {item.totalPrice?.toLocaleString()} ج.م
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border">
              <div className="flex items-center gap-4 text-xs font-bold">
                <div>
                  <span className="text-slate-500">النتيجة الفنية المحسوبة: </span>
                  {isPointSystem ? (
                    <span className="font-mono text-sm text-sky-800 font-extrabold">
                      {calculateOverallTechnical().score}%
                    </span>
                  ) : (
                    <span className={`font-bold ${
                      calculateOverallTechnical().status.includes('مقبول') ? 'text-emerald-700' : 'text-rose-700'
                    }`}>
                      {calculateOverallTechnical().status}
                    </span>
                  )}
                </div>
              </div>

              {(!isTwoEnvelopes || sessionPhase === 'financial') && (
                <div className="text-sm font-extrabold text-emerald-900 bg-emerald-100/60 px-4 py-2 rounded-xl border border-emerald-300">
                  إجمالي قيمة العطاء المالي: <span className="font-mono text-base">{activeFinancialTotal.toLocaleString()} ج.م</span>
                </div>
              )}
            </div>
          </div>

          {/* Form Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => { setActiveSubmission(null); setIsNewBidModalOpen(false); }}
              className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 font-bold rounded-xl text-xs"
            >
              إلغاء
            </button>

            <button
              type="submit"
              className="px-8 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs shadow-md shadow-sky-600/20"
            >
              {activeSubmission ? 'حفظ وتحديث بيانات العطاء 💾' : 'اعتماد وحفظ العطاء الجديد 💾'}
            </button>
          </div>

        </form>
      )}

      {/* Official Opening Minutes Modal (محضر فتح المظاريف الرسمي) */}
      {showMinutesModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto" dir="rtl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Printer className="w-5 h-5 text-sky-600" />
                <span>محضر جلسة لجنة فتح المظاريف الرسمية (قانون 182 لسنة 2018)</span>
              </h3>
              <button onClick={() => setShowMinutesModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Document Sheet */}
            <div className="border border-slate-300 rounded-xl p-8 bg-white space-y-6 text-slate-800 text-xs leading-relaxed font-sans shadow-sm print:border-none print:shadow-none">
              
              {/* Official Letterhead */}
              <div className="flex items-center justify-between border-b-2 border-slate-800 pb-4">
                <div className="space-y-1">
                  <div className="font-extrabold text-sm">وزارة الإسكان والمرافق والمجتمعات العمرانية</div>
                  <div className="font-bold text-xs">الشركة القابضة لمياه الشرب والصرف الصحي</div>
                  <div className="font-bold text-xs text-sky-900">شركة الصرف الصحي بالإسكندرية (ش.م.ت.م)</div>
                  <div className="text-[11px] text-slate-600">الإدارة العامة للعقود والمشتريات</div>
                </div>
                <div className="text-left space-y-1">
                  <div className="font-bold">رقم العملية: <span className="font-mono">{selectedTender?.TenderNumber}</span></div>
                  <div>تاريخ الجلسة: <span className="font-mono">{selectedTender?.EnvelopeOpeningDate ? new Date(selectedTender.EnvelopeOpeningDate).toLocaleDateString('ar-EG') : '---'}</span></div>
                  <div>نظام الطرح: <span className="font-bold">{isTwoEnvelopes ? 'مظروفين (فني ومالي)' : 'مظروف واحد'}</span></div>
                </div>
              </div>

              {/* Title */}
              <div className="text-center space-y-1 my-4">
                <h2 className="text-base font-extrabold underline decoration-2 underline-offset-4">
                  محضر جلسة فتح المظاريف {isTwoEnvelopes ? (sessionPhase === 'financial' ? 'المالية' : 'الفنية') : 'الفنية والمالية'}
                </h2>
                <p className="text-xs text-slate-600">
                  عن عملية: <span className="font-bold">{selectedTender?.OperationName || selectedTender?.TenderName}</span>
                </p>
              </div>

              {/* Legal Text */}
              <p>
                إنه في يوم الموفق انعقدت لجنة فتح المظاريف المشكلة بالقرار الإداري رقم (....) الصادر من السلطة المختصة، برئاسة السيد/ رئيس اللجنة وعضوية الأعضاء الفني والمالي والقانوني، وقامت اللجنة بفحص وتفريغ العطاءات المقدمة لعملية ({selectedTender?.OperationName}) وفقاً لأحكام قانون تنظيم التعاقدات العامة رقم 182 لسنة 2018 ولائحته التنفيذية، وبيانها كالتالي:
              </p>

              {/* Submissions Table in Minutes */}
              <table className="w-full text-right border-collapse border border-slate-300 text-[11px]">
                <thead className="bg-slate-100 font-bold">
                  <tr>
                    <th className="border border-slate-300 p-2 text-center">رقم العطاء</th>
                    <th className="border border-slate-300 p-2">اسم الشركة المتقدمة</th>
                    <th className="border border-slate-300 p-2">التأمين الابتدائي وطريقة سداده</th>
                    <th className="border border-slate-300 p-2">استيفاء المستندات الفنية</th>
                    {(!isTwoEnvelopes || sessionPhase === 'financial') && (
                      <th className="border border-slate-300 p-2">إجمالي القيمة المالية للعطاء</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((sub, i) => (
                    <tr key={i}>
                      <td className="border border-slate-300 p-2 text-center font-mono font-bold">{sub.BidFractionSerial}</td>
                      <td className="border border-slate-300 p-2 font-bold">{sub.CompanyName}</td>
                      <td className="border border-slate-300 p-2 font-mono">{sub.InitialInsuranceAmount?.toLocaleString()} ج.م ({sub.GuaranteePaymentMethod})</td>
                      <td className="border border-slate-300 p-2">
                        {sub.HasTaxCard && sub.HasCommercialRegister ? 'مستوفى السجل والبطاقة والتأمين' : 'غير مستوفى'}
                      </td>
                      {(!isTwoEnvelopes || sessionPhase === 'financial') && (
                        <td className="border border-slate-300 p-2 font-mono font-bold text-emerald-900">
                          {sub.FinancialTotalAmount?.toLocaleString()} ج.م
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Committee Signatures */}
              <div className="pt-8 grid grid-cols-4 gap-4 text-center text-xs font-bold border-t mt-8">
                <div>
                  <div>عضو اللجنة الفني</div>
                  <div className="mt-8">........................</div>
                </div>
                <div>
                  <div>عضو اللجنة المالي</div>
                  <div className="mt-8">........................</div>
                </div>
                <div>
                  <div>عضو اللجنة القانوني</div>
                  <div className="mt-8">........................</div>
                </div>
                <div>
                  <div>رئيس لجنة فتح المظاريف</div>
                  <div className="mt-8">........................</div>
                </div>
              </div>

            </div>

            <div className="flex justify-end gap-3 pt-3 border-t">
              <button
                onClick={() => window.print()}
                className="px-6 py-2.5 bg-slate-900 text-white font-bold rounded-xl text-xs flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة المحضر</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
