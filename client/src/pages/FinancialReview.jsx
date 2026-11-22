import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  DollarSign, Eye, ChevronRight, CheckCircle2, AlertCircle,
  Bell, ClipboardCheck, X, RotateCcw
} from 'lucide-react';

const WORKFLOW_STEPS = [
  { label: 'طلب الاحتياج', step: 1 },
  { label: 'المراجعة المالية', step: 2 },
  { label: 'موافقة السلطة', step: 3 },
];

const CONTRACTS_METHODS = ['مناقصة عامة', 'مناقصة محدودة', 'ممارسة عامة', 'ممارسة محدودة', 'ممارسة محلية', 'أمر مباشر'];
const SUPPLY_METHODS = ['مناقصة عامة', 'مناقصة محدودة', 'ممارسة عامة', 'ممارسة محدودة', 'الأمر المباشر'];
const AUCTION_METHODS = ['مزايدة عامة', 'مزايدة محدودة', 'أمر مباشر'];

const METHOD_SYMBOLS = {
  'تعاقدات': { 'مناقصة عامة': 'هـ', 'مناقصة محدودة': 'هـ م', 'ممارسة عامة': 'م ع', 'ممارسة محدودة': 'م ح', 'ممارسة محلية': 'م م', 'أمر مباشر': 'ا م' },
  'توريدات': { 'مناقصة عامة': 'ت', 'مناقصة محدودة': 'ت م', 'ممارسة عامة': 'م ت', 'ممارسة محدودة': 'م', 'الأمر المباشر': 'أ' },
  'مزادات': { 'مزايدة عامة': 'ز', 'مزايدة محدودة': 'ز م', 'أمر مباشر': 'ز أ' },
};

function getApprovalAuthority(method, amount) {
  const val = parseFloat(amount) || 0;
  if (method === 'مناقصة عامة' || method === 'ممارسة عامة') {
    if (val <= 1500000) return 'نائب رئيس مجلس الإدارة';
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
  if (method === 'أمر مباشر' || method === 'الأمر المباشر') {
    if (val <= 100000) return 'نائب رئيس مجلس الإدارة';
    if (val <= 2000000) return 'رئيس مجلس الإدارة';
    return 'مجلس الإدارة';
  }
  return 'رئيس مجلس الإدارة';
}

function WorkflowBar({ currentStep }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center gap-2">
        {WORKFLOW_STEPS.map((s, idx) => (
          <React.Fragment key={s.step}>
            <div className={`flex items-center gap-2 flex-1 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              s.step < currentStep ? 'bg-slate-100 text-slate-500 border border-slate-200' :
              s.step === currentStep ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/30' :
              'bg-slate-50 text-slate-400 border border-slate-200'
            }`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                s.step < currentStep ? 'bg-slate-300 text-slate-500' :
                s.step === currentStep ? 'bg-white text-emerald-600' :
                'bg-slate-200 text-slate-400'
              }`}>
                {s.step < currentStep ? '✓' : s.step}
              </div>
              <span>{s.label}</span>
              {s.step === currentStep && <div className="w-2 h-2 rounded-full bg-white/70 animate-pulse mr-auto" />}
            </div>
            {idx < WORKFLOW_STEPS.length - 1 && <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

export default function FinancialReview() {
  const { user } = useAuth();
  const [pendingRequests, setPendingRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    tenderMethodSelected: '',
    estimatedValue: '',
    preliminaryReservation: '',
    reservationTypeNew: 'جاري',
    initialGuaranteePercent: 2,
    submittalType: 'مظروفيين',
    bookletPrice: '',
    operationTerms: '',
    constructionDivision: '',
    constructionCategory: '',
    financialNotes: '',
    fiscalYear: '2025/2026',
  });

  const [operationItems, setOperationItems] = useState([
    { description: '', unit: 'عدد', quantity: 1, unitPrice: 0 }
  ]);

  useEffect(() => { fetchPendingRequests(); }, []);

  const fetchPendingRequests = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/needs-requests/workflow', { params: { pendingFor: 'financial' } });
      setPendingRequests(res.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSelectRequest = (req) => {
    setSelectedRequest(req);
    setForm(prev => ({ ...prev, estimatedValue: req.EstimatedValue || '', fiscalYear: req.FiscalYear || '2025/2026' }));
    setSuccess(''); setError('');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const addItem = () => setOperationItems(prev => [...prev, { description: '', unit: 'عدد', quantity: 1, unitPrice: 0 }]);
  const removeItem = (idx) => setOperationItems(prev => prev.filter((_, i) => i !== idx));
  const updateItem = (idx, field, value) => setOperationItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));

  const computedSymbol = selectedRequest
    ? (METHOD_SYMBOLS[selectedRequest.OperationType]?.[form.tenderMethodSelected] || '-')
    : '-';

  const computedAuthority = form.tenderMethodSelected && form.estimatedValue
    ? getApprovalAuthority(form.tenderMethodSelected, form.estimatedValue) : '-';

  const getTenderMethods = () => {
    if (!selectedRequest) return CONTRACTS_METHODS;
    if (selectedRequest.OperationType === 'توريدات') return SUPPLY_METHODS;
    if (selectedRequest.OperationType === 'مزادات') return AUCTION_METHODS;
    return CONTRACTS_METHODS;
  };

  const authorityColor = (a) => {
    if (a === 'مجلس الإدارة') return 'bg-rose-100 text-rose-700';
    if (a === 'رئيس مجلس الإدارة') return 'bg-amber-100 text-amber-700';
    return 'bg-sky-100 text-sky-700';
  };

  const handleSubmitFinancialReview = async (e) => {
    e.preventDefault();
    if (!selectedRequest) return;
    if (!form.tenderMethodSelected || !form.estimatedValue) {
      setError('برجاء تعبئة نوع العملية والقيمة التقديرية');
      return;
    }
    setSubmitting(true); setError('');
    try {
      const res = await axios.put(`/api/needs-requests/${selectedRequest.RequestId}/financial-review`, {
        ...form, operationItems,
      });
      setSuccess(`تمت المراجعة بنجاح! رقم العملية: ${res.data.operationNumber} — السلطة: ${res.data.authority}`);
      setSelectedRequest(null);
      fetchPendingRequests();
    } catch (err) {
      setError(err.response?.data?.error || 'حدث خطأ في حفظ البيانات');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-500 flex items-center justify-center shadow-md">
            <DollarSign className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">المراجعة المالية</h1>
            <p className="text-xs text-slate-500">مراجعة واعتماد طلبات الاحتياج الواردة</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {pendingRequests.length > 0 && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl">
              <Bell className="w-4 h-4 text-amber-600 animate-bounce" />
              <span className="text-xs font-bold text-amber-800">{pendingRequests.length} طلب في انتظار المراجعة</span>
            </div>
          )}
          <button onClick={fetchPendingRequests} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"><RotateCcw className="w-4 h-4" /></button>
        </div>
      </div>

      <WorkflowBar currentStep={2} />

      {success && (
        <div className="flex items-center gap-2 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm font-bold">
          <CheckCircle2 className="w-5 h-5 shrink-0" />{success}
        </div>
      )}

      <div className="grid grid-cols-3 gap-5">
        {/* Left: Pending list */}
        <div className="col-span-1">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <h2 className="font-bold text-slate-700 text-sm flex items-center gap-2"><Bell className="w-4 h-4 text-amber-500" /> الطلبات الواردة</h2>
            </div>
            {loading ? (
              <div className="p-8 text-center"><div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div></div>
            ) : pendingRequests.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">لا توجد طلبات في انتظار المراجعة</div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto">
                {pendingRequests.map(req => (
                  <button key={req.RequestId} type="button"
                    onClick={() => handleSelectRequest(req)}
                    className={`w-full text-right p-4 hover:bg-slate-50 transition-colors ${selectedRequest?.RequestId === req.RequestId ? 'bg-emerald-50 border-r-4 border-emerald-500' : ''}`}>
                    <div className="font-bold text-slate-800 text-xs mb-1 truncate">{req.OperationName}</div>
                    <div className="text-[11px] text-slate-500 truncate">{req.RequestingDepartment}</div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${req.OperationType === 'توريدات' ? 'bg-emerald-100 text-emerald-700' : req.OperationType === 'مزادات' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{req.OperationType}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Form */}
        <div className="col-span-2">
          {!selectedRequest ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
              <Eye className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">اختر طلباً من القائمة لبدء المراجعة المالية</p>
            </div>
          ) : (
            <form onSubmit={handleSubmitFinancialReview} className="space-y-5">
              {/* Request info read-only */}
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-3">
                <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2 mb-3"><Eye className="w-4 h-4 text-slate-500" /> بيانات الطلب (للاطلاع فقط)</h3>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    ['اسم العملية', selectedRequest.OperationName],
                    ['الجهة الطالبة', selectedRequest.RequestingDepartment],
                    ['نوع العملية', selectedRequest.OperationType],
                    ['مدة التنفيذ', selectedRequest.ExecutionDuration || '-'],
                    ['العام المالي', selectedRequest.FiscalYear],
                    ['تاريخ الطلب', selectedRequest.CreatedAt ? new Date(selectedRequest.CreatedAt).toLocaleDateString('ar-EG') : '-'],
                  ].map(([label, val]) => (
                    <div key={label} className="bg-white rounded-xl p-3 border border-slate-200">
                      <div className="text-[10px] text-slate-500 font-bold mb-0.5">{label}</div>
                      <div className="text-xs font-bold text-slate-800">{val}</div>
                    </div>
                  ))}
                </div>
                {selectedRequest.SpecsAndConditions && (
                  <div className="bg-white rounded-xl p-3 border border-slate-200">
                    <div className="text-[10px] text-slate-500 font-bold mb-1">كراسة الشروط</div>
                    <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap max-h-20 overflow-y-auto">{selectedRequest.SpecsAndConditions}</div>
                  </div>
                )}
                {selectedRequest.RequiresSample ? (
                  <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-xl border border-amber-200">
                    <AlertCircle className="w-3.5 h-3.5" /> يتطلب عينة: {selectedRequest.SampleDetails || 'غير محدد'}
                  </div>
                ) : null}
              </div>

              {/* Financial data */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
                <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2"><DollarSign className="w-4 h-4 text-emerald-500" /> البيانات المالية</h3>

                {/* Preview band */}
                <div className="flex items-center gap-4 p-4 bg-gradient-to-l from-emerald-50 to-teal-50 rounded-xl border border-emerald-200">
                  <div className="text-center">
                    <div className="text-[10px] text-slate-500 font-bold mb-1">رمز العملية</div>
                    <div className="text-2xl font-black text-emerald-700 font-mono leading-none">{computedSymbol}</div>
                  </div>
                  <div className="flex-1 text-center">
                    <div className="text-[10px] text-slate-500 font-bold mb-1">رقم العملية (يتولد تلقائياً)</div>
                    <div className="text-sm font-black text-slate-700">س / {form.fiscalYear} / {computedSymbol}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] text-slate-500 font-bold mb-1">السلطة المختصة</div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${authorityColor(computedAuthority)}`}>{computedAuthority}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">أسلوب الطرح <span className="text-rose-500">*</span></label>
                    <select name="tenderMethodSelected" value={form.tenderMethodSelected} onChange={handleChange} required
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white">
                      <option value="">اختر أسلوب الطرح...</option>
                      {getTenderMethods().map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">العام المالي</label>
                    <input type="text" name="fiscalYear" value={form.fiscalYear} onChange={handleChange}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">القيمة التقديرية (ج.م) <span className="text-rose-500">*</span></label>
                    <input type="number" name="estimatedValue" value={form.estimatedValue} onChange={handleChange} required min="0"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" placeholder="0.00" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">الحجز المبدئي (ج.م)</label>
                    <input type="number" name="preliminaryReservation" value={form.preliminaryReservation} onChange={handleChange} min="0"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" placeholder="0.00" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">التأمين الابتدائي (%)</label>
                    <input type="number" name="initialGuaranteePercent" value={form.initialGuaranteePercent} onChange={handleChange} min="0" max="100" step="0.5"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">ثمن كراسة الشروط (ج.م)</label>
                    <input type="number" name="bookletPrice" value={form.bookletPrice} onChange={handleChange} min="0"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" placeholder="0.00" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">طريقة الطرح</label>
                    <select name="submittalType" value={form.submittalType} onChange={handleChange}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white">
                      <option value="مظروفيين">مظروفين</option>
                      <option value="مظروف واحد">مظروف واحد</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">نوع الحجز</label>
                    <select name="reservationTypeNew" value={form.reservationTypeNew} onChange={handleChange}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white">
                      <option value="جاري">جاري</option>
                      <option value="استثماري">استثماري</option>
                    </select>
                  </div>
                  {selectedRequest?.OperationType === 'تعاقدات' && (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1.5">الشعبة</label>
                        <select name="constructionDivision" value={form.constructionDivision} onChange={handleChange}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white">
                          <option value="">اختر الشعبة...</option>
                          {['الأولى','الثانية','الثالثة','الرابعة','الخامسة','السادسة'].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1.5">الفئة</label>
                        <select name="constructionCategory" value={form.constructionCategory} onChange={handleChange}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white">
                          <option value="">اختر الفئة...</option>
                          {['1','2','3','4','5','6','7','8','9'].map(c => <option key={c} value={c}>فئة {c}</option>)}
                        </select>
                      </div>
                    </>
                  )}
                </div>

                {/* Operation items */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-600">بنود العملية</label>
                    <button type="button" onClick={addItem} className="text-xs text-emerald-600 font-bold hover:text-emerald-700 flex items-center gap-1">+ إضافة بند</button>
                  </div>
                  <div className="space-y-2">
                    {operationItems.map((item, idx) => (
                      <div key={idx} className="flex gap-2 items-center bg-slate-50 p-2 rounded-xl border border-slate-200">
                        <input type="text" value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)}
                          className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400" placeholder="وصف البند" />
                        <select value={item.unit} onChange={e => updateItem(idx, 'unit', e.target.value)}
                          className="px-2 py-2 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none">
                          {['عدد','متر','طقم','كيلو','طن','لتر','مقطوعية','متر مكعب'].map(u => <option key={u}>{u}</option>)}
                        </select>
                        <input type="number" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)}
                          className="w-16 px-2 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none" placeholder="كمية" min="0" />
                        <input type="number" value={item.unitPrice} onChange={e => updateItem(idx, 'unitPrice', e.target.value)}
                          className="w-24 px-2 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none" placeholder="سعر الوحدة" min="0" />
                        <button type="button" onClick={() => removeItem(idx)} className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">شروط العملية</label>
                  <textarea name="operationTerms" value={form.operationTerms} onChange={handleChange} rows={3}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
                    placeholder="اكتب شروط العملية هنا..." />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">ملاحظات الإدارة المالية</label>
                  <textarea name="financialNotes" value={form.financialNotes} onChange={handleChange} rows={2}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
                    placeholder="أي ملاحظات مالية إضافية..." />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />{error}
                </div>
              )}

              <button type="submit" disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 disabled:opacity-60 transition-all shadow-md shadow-emerald-500/20">
                {submitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : (
                  <><ClipboardCheck className="w-4 h-4" /> اعتماد المراجعة المالية وإرسال للسلطة المختصة</>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
