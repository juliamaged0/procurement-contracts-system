import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FileCheck, 
  Calculator, 
  Printer, 
  ShieldCheck, 
  Send, 
  ArrowLeftRight,
  FileSpreadsheet
} from 'lucide-react';

export default function Awarding() {
  const [tenders, setTenders] = useState([]);
  const [selectedTenderId, setSelectedTenderId] = useState('');
  const [submissions, setSubmissions] = useState([]);

  // Awarding Form State
  const [awardedAmount, setAwardedAmount] = useState(0);
  const [winnerSubmissionId, setWinnerSubmissionId] = useState('');
  const [authorityApprovalDate, setAuthorityApprovalDate] = useState(new Date().toISOString().split('T')[0]);
  const [reservationConfirmDate, setReservationConfirmDate] = useState(new Date().toISOString().split('T')[0]);
  const [budgetSource, setBudgetSource] = useState('موازنة الشركة');
  const [finalGuaranteePaymentMethod, setFinalGuaranteePaymentMethod] = useState('نقداً');
  const [numOfPages, setNumOfPages] = useState(10);

  // Live Deductions Calculation
  const [deductionsCalc, setDeductionsCalc] = useState({
    awardedAmount: 0,
    finalGuarantee: 0,
    engineeringStamp: 0,
    appliedStamp: 0,
    devStamp: 0,
    extensionStamp: 0,
    federationFee: 0,
    shaheedStamp: 5,
    tahyaMisrFund: 0,
    postalTransferFee: 0,
    totalDeductions: 5,
    netAwardAmount: 0
  });

  const [lastIssuedPO, setLastIssuedPO] = useState(null);

  useEffect(() => {
    fetchTenders();
  }, []);

  useEffect(() => {
    if (selectedTenderId) {
      fetchSubmissions(selectedTenderId);
    }
  }, [selectedTenderId]);

  useEffect(() => {
    const selectedTender = tenders.find(t => t.TenderId == selectedTenderId);
    const isSupply = selectedTender?.OperationType === 'توريدات';
    calculateDeductions(awardedAmount, isSupply, numOfPages);
  }, [awardedAmount, selectedTenderId, numOfPages, tenders]);

  const fetchTenders = async () => {
    try {
      const res = await axios.get('/api/tenders');
      const list = (res.data || []).filter(t => t.Status === 'مبتوت' || t.Status === 'مطروح' || t.Status === 'مسند');
      setTenders(list);
      if (list.length > 0) setSelectedTenderId(list[0].TenderId);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSubmissions = async (tenderId) => {
    try {
      const res = await axios.get(`/api/tenders/${tenderId}/submissions`);
      const subs = res.data || [];
      setSubmissions(subs);
      if (subs.length > 0) {
        setWinnerSubmissionId(subs[0].SubmissionId);
        setAwardedAmount(subs[0].FinancialTotalAmount || 0);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const calculateDeductions = async (amount, isSupply, pages) => {
    try {
      const res = await axios.post('/api/awardings/calculate-deductions', {
        awardedAmount: amount,
        isSupply,
        numOfPages: pages
      });
      setDeductionsCalc(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const selectedTender = tenders.find(t => t.TenderId == selectedTenderId);
  const selectedWinner = submissions.find(s => s.SubmissionId == winnerSubmissionId);

  const handleIssueAwarding = async (e) => {
    e.preventDefault();
    if (!selectedTenderId || !winnerSubmissionId) {
      alert('يرجى اختيار العملية والشركة المرشحة للإسناد');
      return;
    }

    try {
      const res = await axios.post('/api/awardings', {
        tenderId: selectedTenderId,
        winnerSubmissionId,
        awardedAmount,
        authorityApprovalDate,
        reservationConfirmDate,
        budgetSource,
        finalGuaranteePaymentMethod,
        numOfPages
      });

      alert(`تم إسناد العملية بنجاح!
رقم أمر التوريد: ${res.data.purchaseOrderNo}
رقم إذن التوجيه الحسابي: ${res.data.journalDirectiveNo}`);

      setLastIssuedPO(res.data);
      fetchTenders();
    } catch (err) {
      alert('خطأ أثناء عملية الإسناد: ' + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <FileCheck className="w-6 h-6 text-sky-600" />
            <span>رابعاً: شاشة الإسناد وحساب التأمين النهائي والدمغات وإذن التوجيه</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            إصدار أمر التوريد المسلسل، تحويل التأمين الابتدائي لنهائي (إذن توجيه)، وحساب كافة الاستقطاعات والدمغات الرسمية.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Form Column */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleIssueAwarding} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
            
            <h3 className="font-bold text-slate-800 border-b pb-3 text-base flex items-center justify-between">
              <span>بيانات إسناد العملية والشركة المرسا عليها</span>
              <span className="text-xs bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-md font-mono">
                نسبة التأمين النهائي: 5%
              </span>
            </h3>

            {/* Select Tender */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">اختيار العملية المبتوت فيها *</label>
              <select
                value={selectedTenderId}
                onChange={(e) => setSelectedTenderId(e.target.value)}
                className="w-full px-3.5 py-2.5 border rounded-xl text-sm font-semibold focus:ring-2 focus:ring-sky-500 outline-none bg-slate-50"
              >
                {tenders.map((t) => (
                  <option key={t.TenderId} value={t.TenderId}>
                    [{t.TenderNumber}] {t.OperationName} ({t.TenderMethod})
                  </option>
                ))}
              </select>
            </div>

            {/* Select Winner Submission */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">الشركة/المورد المرسا عليه الترسية *</label>
              <select
                value={winnerSubmissionId}
                onChange={(e) => {
                  setWinnerSubmissionId(e.target.value);
                  const sub = submissions.find(s => s.SubmissionId == e.target.value);
                  if (sub) setAwardedAmount(sub.FinancialTotalAmount);
                }}
                className="w-full px-3.5 py-2.5 border rounded-xl text-sm font-semibold focus:ring-2 focus:ring-sky-500 outline-none"
              >
                {submissions.map((s) => (
                  <option key={s.SubmissionId} value={s.SubmissionId}>
                    {s.CompanyName} - إجمالي العطاء: {s.FinancialTotalAmount?.toLocaleString()} ج.م ({s.TechnicalStatus})
                  </option>
                ))}
              </select>
            </div>

            {/* Awarded Amount & Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">مبلغ الترسية الإجمالي ج.م *</label>
                <input
                  type="number"
                  required
                  value={awardedAmount}
                  onChange={(e) => setAwardedAmount(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 border rounded-xl text-sm font-mono font-bold focus:ring-2 focus:ring-sky-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">تاريخ اعتماد السلطة المختصة *</label>
                <input
                  type="date"
                  required
                  value={authorityApprovalDate}
                  onChange={(e) => setAuthorityApprovalDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 border rounded-xl text-sm font-semibold focus:ring-2 focus:ring-sky-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">مصدر التمويل</label>
                <select
                  value={budgetSource}
                  onChange={(e) => setBudgetSource(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs font-bold"
                >
                  <option value="موازنة الشركة">موازنة الشركة</option>
                  <option value="مخطط عام">مخطط عام</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">سداد التأمين النهائي</label>
                <select
                  value={finalGuaranteePaymentMethod}
                  onChange={(e) => setFinalGuaranteePaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs font-bold"
                >
                  <option value="نقداً">نقداً / إذن توجيه تحويل</option>
                  <option value="خطاب ضمان">خطاب ضمان نهائي</option>
                  <option value="شيك">شيك</option>
                  <option value="خصم من مستحقاته">خصم من المستحقات</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">عدد أوراق تقديم العطاء</label>
                <input
                  type="number"
                  value={numOfPages}
                  onChange={(e) => setNumOfPages(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-xl text-xs font-mono font-bold"
                />
              </div>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
              >
                <span>إصدار أمر التوريد وإذن التوجيه الحسابي وتوثيق الإسناد 🚀</span>
              </button>
            </div>

          </form>
        </div>

        {/* Live Deductions & Directive Preview Column */}
        <div className="lg:col-span-5 space-y-6">
          
          <div className="bg-slate-900 text-slate-100 rounded-2xl p-6 shadow-xl border border-slate-800 space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-emerald-400 flex items-center gap-2 text-sm">
                <Calculator className="w-5 h-5" />
                <span>محرك حساب الدمغات والاستقطاعات القانونية</span>
              </h3>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                صفحة 27-28 بالكراسة
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">التأمين النهائي المستحق (5%):</span>
                <span className="font-mono font-bold text-emerald-400">{deductionsCalc.finalGuarantee?.toLocaleString()} ج.م</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">دمغة هندسية (0.001):</span>
                <span className="font-mono font-bold text-sky-300">+{deductionsCalc.engineeringStamp} ج.م</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">دمغة تطبيقية (شرائح):</span>
                <span className="font-mono font-bold text-sky-300">+{deductionsCalc.appliedStamp} ج.م</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">دمغة تنمية (معادلة الأوراق):</span>
                <span className="font-mono font-bold text-sky-300">+{deductionsCalc.devStamp} ج.م</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">دمغة اتساع (90% من التنمية):</span>
                <span className="font-mono font-bold text-sky-300">+{deductionsCalc.extensionStamp} ج.م</span>
              </div>
              {selectedTender?.OperationType === 'تعاقدات' && (
                <>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">اتحاد التشييد والبناء (0.0005):</span>
                    <span className="font-mono font-bold text-amber-300">+{deductionsCalc.federationFee} ج.م</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">صندوق تحيا مصر (1%):</span>
                    <span className="font-mono font-bold text-amber-300">+{deductionsCalc.tahyaMisrFund} ج.م</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">رسوم الحوالة البريدية:</span>
                    <span className="font-mono font-bold text-amber-300">+{deductionsCalc.postalTransferFee} ج.م</span>
                  </div>
                </>
              )}
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">طابع شهيد (ثابت):</span>
                <span className="font-mono font-bold text-slate-300">+{deductionsCalc.shaheedStamp} ج.م</span>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl space-y-2 border border-slate-800 text-center">
              <div className="text-xs text-slate-400">إجمالي الدمغات والاستقطاعات الخصم</div>
              <div className="text-2xl font-extrabold font-mono text-rose-400">
                {deductionsCalc.totalDeductions?.toLocaleString()} ج.م
              </div>
              <div className="text-xs text-slate-400 pt-1 border-t border-slate-800">
                صافي قيمة العملية المستحقة للمورد: <span className="font-mono font-bold text-emerald-400">{deductionsCalc.netAwardAmount?.toLocaleString()} ج.م</span>
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
