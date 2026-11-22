import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import { 
  FileSpreadsheet, 
  Calculator, 
  Newspaper, 
  Building2, 
  CheckCircle2, 
  Printer, 
  HelpCircle,
  FileText,
  Bell
} from 'lucide-react';

export default function Tenders() {
  const [searchParams] = useSearchParams();
  const requestIdParam = searchParams.get('requestId');

  const [tenders, setTenders] = useState([]);
  const [needsRequests, setNeedsRequests] = useState([]);

  // Form State
  const [selectedRequestId, setSelectedRequestId] = useState(requestIdParam || '');
  const [tenderMethod, setTenderMethod] = useState('مناقصة عامة');
  const [baseBookletPrice, setBaseBookletPrice] = useState(100);
  const [initialGuaranteeAmount, setInitialGuaranteeAmount] = useState(5000);
  const [envelopeOpeningDate, setEnvelopeOpeningDate] = useState('');
  const [adNewspaper1, setAdNewspaper1] = useState('الأهرام');
  const [adNewspaper2, setAdNewspaper2] = useState('الأخبار');
  const [adPublishDate, setAdPublishDate] = useState('');
  const [adDetails, setAdDetails] = useState('');
  const [evaluationMethod, setEvaluationMethod] = useState('تقرير فني');
  const [requiresSample, setRequiresSample] = useState(false);
  const [sampleDetails, setSampleDetails] = useState('');

  // Live Booklet Calculation
  const [bookletCalc, setBookletCalc] = useState({
    basePrice: 100,
    adminFees: 20,
    postalStamp: 5,
    mapsFees: 0,
    subtotal: 125,
    vat: 17.5,
    takafulStamp: 10,
    shaheedStamp: 5,
    rawSum: 157.5,
    finalPrice: 160,
    miscIncome: 2.5
  });

  const [selectedTenderForPrint, setSelectedTenderForPrint] = useState(null);
  const [pendingApprovedRequests, setPendingApprovedRequests] = useState([]);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);

  useEffect(() => {
    fetchData();
    fetchApprovedRequests();
  }, []);

  useEffect(() => {
    if (requestIdParam) {
      setSelectedRequestId(requestIdParam);
    }
  }, [requestIdParam]);

  // Recalculate Booklet Price on Base Price Change
  useEffect(() => {
    const selectedReq = needsRequests.find(r => r.RequestId == selectedRequestId);
    const isSupply = selectedReq?.OperationType === 'توريدات';
    calculateBooklet(baseBookletPrice, isSupply);
  }, [baseBookletPrice, selectedRequestId, needsRequests]);

  const fetchData = async () => {
    try {
      const [tRes, nRes] = await Promise.all([
        axios.get('/api/tenders'),
        axios.get('/api/needs-requests')
      ]);
      setTenders(tRes.data || []);
      setNeedsRequests(nRes.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchApprovedRequests = async () => {
    try {
      const res = await axios.get('/api/needs-requests/workflow', { params: { pendingFor: 'tenders' } });
      setPendingApprovedRequests(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const calculateBooklet = async (price, isSupply) => {
    try {
      const res = await axios.post('/api/tenders/calculate-booklet', {
        basePrice: price,
        isSupply
      });
      setBookletCalc(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const selectedRequest = needsRequests.find(r => r.RequestId == selectedRequestId);

  const handleSubmitTender = async (e) => {
    e.preventDefault();
    if (!selectedRequestId) {
      alert('يرجى اختيار طلب الاحتياج المراد طرحه');
      return;
    }
    if (!envelopeOpeningDate) {
      alert('يرجى تحديد تاريخ جلسة فض المظاريف');
      return;
    }

    try {
      const res = await axios.post('/api/tenders', {
        requestId: selectedRequestId,
        tenderMethod,
        baseBookletPrice,
        initialGuaranteeAmount,
        envelopeOpeningDate,
        adNewspaper1,
        adNewspaper2,
        adPublishDate,
        adDetails,
        evaluationMethod,
        requiresSample,
        sampleDetails
      });

      alert(res.data.message);
      setSelectedRequestId('');
      fetchData();
    } catch (err) {
      alert('خطأ أثناء الطرح: ' + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-sky-600" />
            <span>أولاً: شاشة الطرح وكراسة الشروط والمواصفات</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            طرح العمليات المستدعاة من طلبات الاحتياج وتوليد الرقم المسلسل والتشميل الآلي لكراسة الشروط.
          </p>
        </div>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotificationPanel(!showNotificationPanel)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md ${
              pendingApprovedRequests.length > 0
                ? 'bg-amber-500 hover:bg-amber-600 text-white animate-pulse'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-500'
            }`}
          >
            <Bell className="w-4 h-4" />
            {pendingApprovedRequests.length > 0
              ? `${pendingApprovedRequests.length} عملية معتمدة جاهزة للطرح`
              : 'لا توجد عمليات معتمدة'}
          </button>

          {showNotificationPanel && pendingApprovedRequests.length > 0 && (
            <div className="absolute top-12 left-0 z-30 bg-white rounded-2xl border border-slate-200 shadow-2xl w-96 overflow-hidden">
              <div className="p-4 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
                <h3 className="font-bold text-amber-800 text-sm flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  العمليات المعتمدة الجاهزة للطرح
                </h3>
                <button
                  onClick={() => setShowNotificationPanel(false)}
                  className="text-amber-600 hover:text-amber-900 text-xs font-bold"
                >
                  ✕ إغلاق
                </button>
              </div>
              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {pendingApprovedRequests.map(req => (
                  <button
                    key={req.RequestId}
                    onClick={() => {
                      setSelectedRequestId(String(req.RequestId));
                      setShowNotificationPanel(false);
                    }}
                    className="w-full text-right p-3.5 hover:bg-amber-50 transition-colors"
                  >
                    <div className="font-bold text-slate-800 text-xs">{req.OperationName}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                      {req.FinancialOperationNumber || '---'} — {req.RequestingDepartment}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-[10px] bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full font-bold">
                        {req.OperationType}
                      </span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                        معتمد ✓
                      </span>
                      {req.EstimatedValue && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          {Number(req.EstimatedValue).toLocaleString('ar-EG')} ج.م
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
              <div className="p-3 bg-slate-50 border-t text-center text-[11px] text-slate-400">
                انقر على العملية لاختيارها في نموذج الطرح
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Form Column (Left/Main) */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleSubmitTender} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
            
            <h3 className="font-bold text-slate-800 border-b pb-3 text-base flex items-center justify-between">
              <span>بيانات عملية الطرح</span>
              <span className="text-xs bg-sky-100 text-sky-800 px-2.5 py-1 rounded-md font-mono">
                العام المالي 2025/2026
              </span>
            </h3>

            {/* 1. Select Needs Request */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                اختيار عملية مستدعاة من شاشة طلب الاحتياج *
              </label>
              <select
                required
                value={selectedRequestId}
                onChange={(e) => setSelectedRequestId(e.target.value)}
                className="w-full px-3.5 py-2.5 border rounded-xl text-sm font-semibold focus:ring-2 focus:ring-sky-500 outline-none bg-slate-50"
              >
                <option value="">-- اختر طلب الاحتياج المراد طرحه --</option>
                {needsRequests.map((req) => (
                  <option key={req.RequestId} value={req.RequestId}>
                    [{req.OperationType}] {req.OperationName} (تقديري: {req.EstimatedValue?.toLocaleString()} ج.م - {req.RequestingDepartment})
                  </option>
                ))}
              </select>
            </div>

            {/* Show details of selected request */}
            {selectedRequest && (
              <div className="bg-sky-50/70 border border-sky-200 rounded-xl p-4 text-xs space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="font-bold">اسم العملية:</span> {selectedRequest.OperationName}</div>
                  <div><span className="font-bold">نوع العملية:</span> {selectedRequest.OperationType}</div>
                  <div><span className="font-bold">القيمة التقديرية:</span> {selectedRequest.EstimatedValue?.toLocaleString()} ج.م</div>
                  <div><span className="font-bold">الجهة الطالبة:</span> {selectedRequest.RequestingDepartment}</div>
                </div>
              </div>
            )}

            {/* 2. Tender Method */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">طريقة الطرح والنواحي القانونية *</label>
                <select
                  value={tenderMethod}
                  onChange={(e) => setTenderMethod(e.target.value)}
                  className="w-full px-3.5 py-2.5 border rounded-xl text-sm font-semibold focus:ring-2 focus:ring-sky-500 outline-none"
                >
                  <optgroup label="تعاقدات (أعمال)">
                    <option value="مناقصة عامة">مناقصة عامة (رمز هـ)</option>
                    <option value="مناقصة محدودة">مناقصة محدودة (رمز هـ م)</option>
                    <option value="ممارسة عامة">ممارسة عامة (رمز م ع)</option>
                    <option value="ممارسة محدودة">ممارسة محدودة (رمز م ح)</option>
                    <option value="ممارسة محلية">ممارسة محلية (رمز م م)</option>
                    <option value="أمر مباشر">أمر مباشر (رمز ا م)</option>
                  </optgroup>
                  <optgroup label="توريدات (مهمات ومواد)">
                    <option value="مناقصة عامة">مناقصة عامة توريدات (رمز ت)</option>
                    <option value="مناقصة محدودة">مناقصة محدودة توريدات (رمز ت م)</option>
                    <option value="ممارسة عامة">ممارسة عامة توريدات (رمز م ت)</option>
                    <option value="ممارسة محلية">ممارسة محلية توريدات (رمز م)</option>
                    <option value="أمر مباشر">أمر مباشر توريدات (رمز أ)</option>
                  </optgroup>
                  <optgroup label="مزادات">
                    <option value="مزايدة عامة">مزايدة عامة (رمز ز)</option>
                    <option value="مزايدة محدودة">مزايدة محدودة (رمز ز م)</option>
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">تاريخ ميعاد جلسة فض المظاريف *</label>
                <input
                  type="datetime-local"
                  required
                  value={envelopeOpeningDate}
                  onChange={(e) => setEnvelopeOpeningDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 border rounded-xl text-sm font-semibold focus:ring-2 focus:ring-sky-500 outline-none"
                />
              </div>
            </div>

            {/* 3. Base Booklet Price & Initial Guarantee */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  ثمن كراسة الشروط (غير شامل الرسوم) ج.م
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={baseBookletPrice}
                  onChange={(e) => setBaseBookletPrice(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 border rounded-xl text-sm font-mono font-bold focus:ring-2 focus:ring-sky-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">قيمة التأمين الابتدائي ج.م *</label>
                <input
                  type="number"
                  required
                  value={initialGuaranteeAmount}
                  onChange={(e) => setInitialGuaranteeAmount(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 border rounded-xl text-sm font-mono font-bold focus:ring-2 focus:ring-sky-500 outline-none"
                />
              </div>
            </div>

            {/* 4. Advertising & Evaluation */}
            <div className="border-t pt-4 space-y-3">
              <h4 className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
                <Newspaper className="w-4 h-4 text-sky-600" />
                <span>بيانات النشر في الجرائد / الدعوات الرسمية</span>
              </h4>
              
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">الجريدة الأولى</label>
                  <select
                    value={adNewspaper1}
                    onChange={(e) => setAdNewspaper1(e.target.value)}
                    className="w-full px-2.5 py-1.5 border rounded-lg text-xs"
                  >
                    <option value="الأهرام">الأهرام</option>
                    <option value="الأخبار">الأخبار</option>
                    <option value="الجمهورية">الجمهورية</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">الجريدة الثانية</label>
                  <select
                    value={adNewspaper2}
                    onChange={(e) => setAdNewspaper2(e.target.value)}
                    className="w-full px-2.5 py-1.5 border rounded-lg text-xs"
                  >
                    <option value="الأخبار">الأخبار</option>
                    <option value="الأهرام">الأهرام</option>
                    <option value="الجمهورية">الجمهورية</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">تاريخ النشر</label>
                  <input
                    type="date"
                    value={adPublishDate}
                    onChange={(e) => setAdPublishDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 border rounded-lg text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-700 hover:to-cyan-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-sky-600/20 active:scale-[0.99] transition-all"
              >
                تأكيد وطرح العملية وإصدار الرقم المسلسل ⚡
              </button>
            </div>

          </form>
        </div>

        {/* Live Calculation Breakdown Column (Right) */}
        <div className="lg:col-span-5 space-y-6">
          
          <div className="bg-slate-900 text-slate-100 rounded-2xl p-6 shadow-xl border border-slate-800 space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sky-400 flex items-center gap-2 text-sm">
                <Calculator className="w-5 h-5" />
                <span>محرك تشميل وتسعير كراسة الشروط التلقائي</span>
              </h3>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                صفحة 5-6 بالكراسة
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">ثمن النسخة غير شامل:</span>
                <span className="font-mono font-bold text-slate-200">{bookletCalc.basePrice} ج.م</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">مصاريف إدارية (20%):</span>
                <span className="font-mono font-bold text-sky-300">+{bookletCalc.adminFees} ج.م</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">طوابع مراسلات (ثابت):</span>
                <span className="font-mono font-bold text-slate-300">+{bookletCalc.postalStamp} ج.م</span>
              </div>
              {selectedRequest?.OperationType === 'توريدات' && (
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">خرائط (توريدات):</span>
                  <span className="font-mono font-bold text-slate-300">+{bookletCalc.mapsFees} ج.م</span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">قيمة مضافة (14%):</span>
                <span className="font-mono font-bold text-amber-300">+{bookletCalc.vat} ج.م</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">طابع تكافل (حسب الشريحة):</span>
                <span className="font-mono font-bold text-emerald-300">+{bookletCalc.takafulStamp} ج.م</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">طابع شهيد (ثابت):</span>
                <span className="font-mono font-bold text-slate-300">+{bookletCalc.shaheedStamp} ج.م</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800 bg-slate-950/60 p-2 rounded-lg">
                <span className="text-slate-300 font-semibold">المجموع قبل التكملة:</span>
                <span className="font-mono font-bold text-slate-100">{bookletCalc.rawSum} ج.م</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">إيرادات متنوعة (تكملة لأقرب 5 ج):</span>
                <span className="font-mono font-bold text-purple-300">+{bookletCalc.miscIncome} ج.م</span>
              </div>
            </div>

            {/* Total Highlight */}
            <div className="bg-gradient-to-r from-sky-600 to-cyan-600 p-4 rounded-xl text-center space-y-1 shadow-lg">
              <div className="text-xs text-sky-100 font-semibold">ثمن النسخة الإجمالي الشامل لجميع الرسوم</div>
              <div className="text-3xl font-extrabold font-mono text-white">
                {bookletCalc.finalPrice} جنيهاً
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Existing Tenders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-base">سجل العمليات المطروحة بالشاشة</h3>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            {tenders.length} عملية مطروحة
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs font-bold uppercase border-b border-slate-200">
              <tr>
                <th className="p-3.5">رقم العملية المسلسل</th>
                <th className="p-3.5">اسم العملية</th>
                <th className="p-3.5">طريقة الطرح</th>
                <th className="p-3.5">ثمن الكراسة الشامل</th>
                <th className="p-3.5">التأمين الابتدائي</th>
                <th className="p-3.5">تاريخ فض المظاريف</th>
                <th className="p-3.5">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tenders.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-6 text-center text-slate-400">
                    لا توجد عمليات مطروحة حالياً.
                  </td>
                </tr>
              ) : (
                tenders.map((t) => (
                  <tr key={t.TenderId} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3.5 font-bold font-mono text-sky-700">{t.TenderNumber}</td>
                    <td className="p-3.5 font-bold text-slate-800">{t.OperationName}</td>
                    <td className="p-3.5">
                      <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded text-xs font-semibold">
                        {t.TenderMethod}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono font-bold text-slate-800">
                      {t.CalculatedBookletPrice} ج.م
                    </td>
                    <td className="p-3.5 font-mono font-bold text-emerald-700">
                      {t.InitialGuaranteeAmount?.toLocaleString()} ج.م
                    </td>
                    <td className="p-3.5 text-xs text-slate-600">
                      {new Date(t.EnvelopeOpeningDate).toLocaleString('ar-EG')}
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        t.Status === 'نشط' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {t.Status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
