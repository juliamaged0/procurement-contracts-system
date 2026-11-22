import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  ClipboardList, FileText, Package, Clock, Send,
  Search, MessageSquare, AlertCircle, CheckCircle2,
  ChevronRight, Warehouse, Eye, X, Bell, RotateCcw
} from 'lucide-react';

const DEPARTMENTS = [
  'إدارة المشروعات',
  'إدارة التشغيل والصيانة',
  'إدارة الشبكات',
  'إدارة الموارد البشرية',
  'الشئون المالية',
  'إدارة المخازن',
  'إدارة تقنية المعلومات',
  'قطاع المياه',
  'قطاع الصرف الصحي',
  'الإدارة العامة',
  'إدارة الجودة والسلامة',
];

const OPERATION_TYPES = [
  { value: 'تعاقدات', label: 'تعاقدات', color: 'bg-blue-50 border-blue-400 text-blue-700', active: 'bg-blue-600 border-blue-600 text-white' },
  { value: 'توريدات', label: 'توريدات', color: 'bg-emerald-50 border-emerald-400 text-emerald-700', active: 'bg-emerald-600 border-emerald-600 text-white' },
  { value: 'مزادات', label: 'مزادات', color: 'bg-purple-50 border-purple-400 text-purple-700', active: 'bg-purple-600 border-purple-600 text-white' },
];

const WORKFLOW_STEPS = [
  { label: 'طلب الاحتياج', step: 1 },
  { label: 'المراجعة المالية', step: 2 },
  { label: 'موافقة السلطة', step: 3 },
];

function WorkflowBar({ currentStep }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center gap-2">
        {WORKFLOW_STEPS.map((s, idx) => (
          <React.Fragment key={s.step}>
            <div className={`flex items-center gap-2 flex-1 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              s.step < currentStep ? 'bg-slate-100 text-slate-500 border border-slate-200' :
              s.step === currentStep ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30' :
              'bg-slate-50 text-slate-400 border border-slate-200'
            }`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                s.step < currentStep ? 'bg-slate-300 text-slate-500' :
                s.step === currentStep ? 'bg-white text-indigo-600' :
                'bg-slate-200 text-slate-400'
              }`}>
                {s.step < currentStep ? '✓' : s.step}
              </div>
              <span>{s.label}</span>
              {s.step === currentStep && <div className="w-2 h-2 rounded-full bg-white/70 animate-pulse mr-auto" />}
            </div>
            {idx < WORKFLOW_STEPS.length - 1 && (
              <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

export default function NeedsRequest() {
  const { user } = useAuth();

  const [form, setForm] = useState({
    operationName: '',
    operationType: 'تعاقدات',
    requestingDepartment: '',
    executionDuration: '',
    specsAndConditions: '',
    requiresSample: false,
    sampleDetails: '',
    fiscalYear: '2025/2026',
  });

  const [inventory, setInventory] = useState([]);
  const [inventorySearch, setInventorySearch] = useState('');
  const [showInquiryModal, setShowInquiryModal] = useState(false);
  const [inquiryText, setInquiryText] = useState('');
  const [inquirySent, setInquirySent] = useState(false);

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedId, setSubmittedId] = useState(null);
  const [error, setError] = useState('');

  const [myRequests, setMyRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('new');

  const isSupply = form.operationType === 'توريدات';

  useEffect(() => {
    if (isSupply) fetchInventory();
  }, [isSupply]);

  useEffect(() => {
    fetchMyRequests();
  }, []);

  const fetchInventory = async (search = '') => {
    try {
      const res = await axios.get('/api/warehouse/inventory', { params: search ? { search } : {} });
      setInventory(res.data || []);
    } catch (err) { console.error(err); }
  };

  const fetchMyRequests = async () => {
    try {
      const res = await axios.get('/api/needs-requests');
      setMyRequests(res.data || []);
    } catch (err) { console.error(err); }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleInventorySearch = (e) => {
    setInventorySearch(e.target.value);
    fetchInventory(e.target.value);
  };

  const handleSendInquiry = async () => {
    if (!inquiryText.trim()) return;
    try {
      await axios.post('/api/warehouse/inquiry', { requestId: 0, inquiryText });
      setInquirySent(true);
      setShowInquiryModal(false);
      setInquiryText('');
    } catch (err) {
      alert('حدث خطأ في إرسال الاستفسار');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.operationName || !form.requestingDepartment) {
      setError('برجاء تعبئة اسم العملية والجهة الطالبة');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await axios.post('/api/needs-requests/submit', form);
      setSubmittedId(res.data.requestId);
      setSubmitted(true);
      fetchMyRequests();
    } catch (err) {
      setError(err.response?.data?.error || 'حدث خطأ في إرسال الطلب');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSubmitted(false);
    setSubmittedId(null);
    setInquirySent(false);
    setForm({ operationName: '', operationType: 'تعاقدات', requestingDepartment: '', executionDuration: '', specsAndConditions: '', requiresSample: false, sampleDetails: '', fiscalYear: '2025/2026' });
  };

  const statusColor = (s) => ({
    'طلب جديد': 'bg-slate-100 text-slate-600',
    'في انتظار المالية': 'bg-amber-100 text-amber-700',
    'في انتظار السلطة': 'bg-blue-100 text-blue-700',
    'معتمد': 'bg-emerald-100 text-emerald-700',
    'مرفوض': 'bg-rose-100 text-rose-700',
  }[s] || 'bg-slate-100 text-slate-600');

  /* ---- Success Screen ---- */
  if (submitted) {
    return (
      <div className="max-w-xl mx-auto text-center space-y-6 py-16" dir="rtl">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-10 h-10 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">تم الإرسال بنجاح!</h2>
        <p className="text-slate-500">طلب رقم <span className="font-black text-sky-600">#{submittedId}</span> أُرسل للإدارة المالية.</p>
        <WorkflowBar currentStep={2} />
        <div className="flex gap-3 justify-center">
          <button onClick={resetForm} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors">
            طلب جديد
          </button>
          <button onClick={() => { resetForm(); setActiveTab('my-requests'); }} className="px-6 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors">
            متابعة طلباتي
          </button>
        </div>
      </div>
    );
  }

  /* ---- Main ---- */
  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-600 to-sky-500 flex items-center justify-center shadow-md">
            <ClipboardList className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">طلب الاحتياج</h1>
            <p className="text-xs text-slate-500">تقديم طلب جديد وإرساله للمراجعة المالية</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setActiveTab('new')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'new' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            طلب جديد
          </button>
          <button onClick={() => { setActiveTab('my-requests'); fetchMyRequests(); }} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'my-requests' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            الطلبات ({myRequests.length})
          </button>
        </div>
      </div>

      <WorkflowBar currentStep={1} />

      {/* My Requests Tab */}
      {activeTab === 'my-requests' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-800 text-sm flex items-center gap-2"><Eye className="w-4 h-4 text-slate-500" /> متابعة الطلبات المقدمة</h2>
            <button onClick={fetchMyRequests} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"><RotateCcw className="w-3.5 h-3.5" /></button>
          </div>
          <div className="divide-y divide-slate-100">
            {myRequests.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-sm">لا توجد طلبات مقدمة حتى الآن</div>
            ) : myRequests.map(req => (
              <div key={req.RequestId} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="font-bold text-slate-800 text-sm truncate">{req.OperationName}</div>
                    <div className="text-xs text-slate-500">{req.RequestingDepartment} ← {req.OperationType}</div>
                    {req.FinancialOperationNumber && (
                      <div className="text-xs text-sky-600 font-mono font-bold">رقم العملية: {req.FinancialOperationNumber}</div>
                    )}
                    {req.ApprovalAuthority && (
                      <div className="text-xs text-slate-500">السلطة: {req.ApprovalAuthority}</div>
                    )}
                    {req.AuthorityRejectionReason && (
                      <div className="text-xs text-rose-600 bg-rose-50 px-2 py-1 rounded-lg border border-rose-200">سبب الرفض: {req.AuthorityRejectionReason}</div>
                    )}
                  </div>
                  <div className="text-left space-y-1 shrink-0">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-bold block text-center ${statusColor(req.WorkflowStatus || 'طلب جديد')}`}>
                      {req.WorkflowStatus || 'طلب جديد'}
                    </span>
                    <div className="text-[10px] text-slate-400 text-center">{req.CreatedAt ? new Date(req.CreatedAt).toLocaleDateString('ar-EG') : ''}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* New Request Form */
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Operation Type */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h2 className="font-bold text-slate-700 text-sm mb-3 flex items-center gap-2"><Package className="w-4 h-4 text-indigo-500" /> نوع العملية</h2>
            <div className="grid grid-cols-3 gap-3">
              {OPERATION_TYPES.map(type => (
                <button key={type.value} type="button"
                  onClick={() => setForm(prev => ({ ...prev, operationType: type.value }))}
                  className={`p-4 rounded-xl border-2 font-bold text-sm transition-all ${form.operationType === type.value ? type.active + ' shadow-md scale-[1.02]' : type.color}`}>
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Basic Info */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <h2 className="font-bold text-slate-700 text-sm flex items-center gap-2"><FileText className="w-4 h-4 text-indigo-500" /> بيانات الطلب</h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-600 mb-1.5">اسم العملية <span className="text-rose-500">*</span></label>
                <input type="text" name="operationName" value={form.operationName} onChange={handleChange} required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400"
                  placeholder="أدخل اسم العملية بالكامل..." />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">الجهة الطالبة <span className="text-rose-500">*</span></label>
                <select name="requestingDepartment" value={form.requestingDepartment} onChange={handleChange} required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
                  <option value="">اختر الإدارة...</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">مدة العملية</label>
                <input type="text" name="executionDuration" value={form.executionDuration} onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  placeholder="مثال: 3 أشهر، 60 يوم..." />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">العام المالي</label>
                <input type="text" name="fiscalYear" value={form.fiscalYear} onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  placeholder="2025/2026" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">كراسة الشروط والمواصفات</label>
              <textarea name="specsAndConditions" value={form.specsAndConditions} onChange={handleChange} rows={4}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                placeholder="اكتب هنا تفاصيل المتطلبات والمواصفات الفنية المطلوبة..." />
            </div>

            <label className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-amber-200 cursor-pointer">
              <input type="checkbox" name="requiresSample" checked={form.requiresSample} onChange={handleChange}
                className="w-4 h-4 accent-amber-600" />
              <span className="text-sm font-bold text-amber-800">يتطلب تقديم عينة</span>
            </label>
            {form.requiresSample && (
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">تفاصيل العينة المطلوبة</label>
                <textarea name="sampleDetails" value={form.sampleDetails} onChange={handleChange} rows={2}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                  placeholder="اكتب مواصفات العينة المطلوبة..." />
              </div>
            )}
          </div>

          {/* Warehouse Section */}
          {isSupply && (
            <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-emerald-800 text-sm flex items-center gap-2"><Warehouse className="w-4 h-4 text-emerald-600" /> التحقق من الرصيد المخزني</h2>
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full font-bold">للتوريدات فقط</span>
              </div>
              <p className="text-xs text-slate-500">ابحث أولاً عما تحتاجه في المخزن. إذا لم يكن متاحاً أرسل استفساراً لإدارة المخازن.</p>

              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" value={inventorySearch} onChange={handleInventorySearch}
                  className="w-full pr-9 pl-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  placeholder="ابحث عن منتج في المخزن..." />
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="max-h-52 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-right font-bold text-slate-600">المنتج</th>
                        <th className="px-3 py-2 text-center font-bold text-slate-600">الوحدة</th>
                        <th className="px-3 py-2 text-center font-bold text-slate-600">الرصيد</th>
                        <th className="px-3 py-2 text-center font-bold text-slate-600">الموقع</th>
                        <th className="px-3 py-2 text-center font-bold text-slate-600">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {inventory.length === 0 ? (
                        <tr><td colSpan={5} className="p-6 text-center text-slate-400">لا توجد منتجات مطابقة</td></tr>
                      ) : inventory.map(p => (
                        <tr key={p.ProductId} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-medium text-slate-800">{p.ProductName}</td>
                          <td className="px-3 py-2 text-center text-slate-600">{p.Unit}</td>
                          <td className="px-3 py-2 text-center font-bold text-slate-800">{p.CurrentStock}</td>
                          <td className="px-3 py-2 text-center text-slate-500 text-[11px]">{p.Location}</td>
                          <td className="px-3 py-2 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              p.CurrentStock > p.MinimumStock ? 'bg-emerald-100 text-emerald-700' :
                              p.CurrentStock > 0 ? 'bg-amber-100 text-amber-700' :
                              'bg-rose-100 text-rose-700'
                            }`}>
                              {p.CurrentStock > p.MinimumStock ? 'متوفر' : p.CurrentStock > 0 ? 'منخفض' : 'نفذ'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {inquirySent ? (
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-200">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-blue-800">تم إرسال الاستفسار لإدارة المخازن</p>
                    <p className="text-xs text-blue-500 mt-0.5">في انتظار الرد من إدارة المخازن...</p>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => setShowInquiryModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-white rounded-xl text-xs font-bold hover:bg-amber-600 transition-colors">
                  <MessageSquare className="w-4 h-4" /> إرسال استفسار للمخازن
                </button>
              )}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-md shadow-indigo-500/20">
            {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : (
              <><Send className="w-4 h-4" /> إرسال الطلب للإدارة المالية</>
            )}
          </button>
        </form>
      )}

      {/* Inquiry Modal */}
      {showInquiryModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4" dir="rtl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center gap-2"><MessageSquare className="w-4 h-4 text-amber-500" /> استفسار للمخازن</h3>
              <button onClick={() => setShowInquiryModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"><X className="w-4 h-4 text-slate-500" /></button>
            </div>
            <p className="text-xs text-slate-500">اكتب سؤالك بوضوح لإدارة المخازن عن توفر الصنف المطلوب</p>
            <textarea value={inquiryText} onChange={e => setInquiryText(e.target.value)} rows={4}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
              placeholder="مثال: هل يوجد في المخازن مواسير PVC قطر 200مم بكمية 500 متر؟" />
            <div className="flex gap-3">
              <button onClick={handleSendInquiry} className="flex-1 py-2.5 bg-amber-500 text-white rounded-xl font-bold text-sm hover:bg-amber-600 transition-colors">إرسال</button>
              <button onClick={() => setShowInquiryModal(false)} className="px-6 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
