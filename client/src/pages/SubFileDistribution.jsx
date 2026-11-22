import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  FolderArchive,
  Send,
  CheckCircle2,
  Bell,
  FileText,
  PackageCheck,
  ShieldCheck,
  Warehouse,
  Building2,
  HandCoins,
  ClipboardCheck,
  Plus,
  Eye,
  Printer,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Search,
  Calendar,
  User,
  Hash
} from 'lucide-react';

// ── Delivery target config ──────────────────────────────────────────────────
const DELIVERY_TARGETS = [
  {
    key: 'المخازن العامة',
    label: 'المخازن العامة',
    icon: Warehouse,
    color: 'sky',
    desc: 'نموذج تسليم للمخازن العامة',
    always: true,
  },
  {
    key: 'قطاع المشروعات',
    label: 'قطاع المشروعات',
    icon: Building2,
    color: 'indigo',
    desc: 'نموذج تسليم لقطاع المشروعات',
    onlyFor: 'تعاقدات',
  },
  {
    key: 'التنسيق الخارجي والتسويات المالية',
    label: 'التنسيق الخارجي والتسويات المالية',
    icon: HandCoins,
    color: 'emerald',
    desc: 'نموذج تسليم للتنسيق الخارجي والتسويات المالية',
    always: true,
  },
  {
    key: 'إدارة الاحتياجات ومتابعة المخزون',
    label: 'إدارة الاحتياجات ومتابعة المخزون',
    icon: ClipboardCheck,
    color: 'amber',
    desc: 'نموذج تسليم لإدارة الاحتياجات ومتابعة المخزون',
    always: true,
  },
];

const colorMap = {
  sky:     { bg: 'bg-sky-50',     border: 'border-sky-200',     text: 'text-sky-700',     badge: 'bg-sky-100 text-sky-800'     },
  indigo:  { bg: 'bg-indigo-50',  border: 'border-indigo-200',  text: 'text-indigo-700',  badge: 'bg-indigo-100 text-indigo-800'  },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-800' },
  amber:   { bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   badge: 'bg-amber-100 text-amber-800'   },
};

// ── Progress Bar ─────────────────────────────────────────────────────────────
function ProgressBar({ status }) {
  const steps = ['مُصدر', 'موزَّع', 'مكتمل'];
  const idx = steps.indexOf(status);
  return (
    <div className="flex items-center gap-0 text-[11px] font-bold">
      {steps.map((s, i) => (
        <React.Fragment key={s}>
          <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${
            i <= idx ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-500'
          }`}>
            {i < idx ? <CheckCircle2 className="w-3 h-3" /> : <span className="w-3 h-3 rounded-full border-2 border-current flex items-center justify-center text-[8px]">{i+1}</span>}
            {s}
          </div>
          {i < steps.length - 1 && (
            <div className={`h-0.5 w-6 ${i < idx ? 'bg-sky-400' : 'bg-slate-200'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ── Print-ready Delivery Form ─────────────────────────────────────────────────
function DeliveryFormPrint({ dist, delivery, onClose }) {
  const today = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
  const docs = dist.DocumentsPackage ? JSON.parse(dist.DocumentsPackage) : {};
  const docList = Object.entries(docs).filter(([, v]) => v).map(([, v]) => v);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 no-print-overlay">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 border-b bg-slate-50 no-print">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <Printer className="w-4 h-4 text-sky-600" />
            {delivery.DeliveryForm}
          </h3>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="px-3 py-1.5 bg-sky-600 text-white rounded-lg text-xs font-bold hover:bg-sky-700 flex items-center gap-1">
              <Printer className="w-3.5 h-3.5" /> طباعة
            </button>
            <button onClick={onClose} className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-300">✕ إغلاق</button>
          </div>
        </div>

        {/* Form Content */}
        <div className="p-8 print-area font-cairo" dir="rtl">
          {/* Header */}
          <div className="text-center mb-6 border-b-2 border-slate-800 pb-4">
            <div className="text-xs text-slate-500 mb-1">الشركة المصرية / إدارة المشتريات والمخازن والمناقصات</div>
            <h2 className="text-lg font-extrabold text-slate-900 mb-1">{delivery.DeliveryForm}</h2>
            <div className="text-xs text-slate-600">تاريخ الإصدار: {today}</div>
          </div>

          {/* Operation Data */}
          <div className="bg-slate-50 rounded-xl p-4 mb-5 text-sm space-y-2 border">
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              <div><span className="font-bold text-slate-700">اسم العملية:</span> <span className="text-slate-800">{dist.OperationName}</span></div>
              <div><span className="font-bold text-slate-700">رقم العملية:</span> <span className="font-mono text-sky-700 font-bold">{dist.OperationNumber || dist.TenderNumber}</span></div>
              <div><span className="font-bold text-slate-700">نوع العملية:</span> <span>{dist.OperationType}</span></div>
              <div><span className="font-bold text-slate-700">الجهة الطالبة:</span> <span>{dist.RequestingDepartment || '—'}</span></div>
              <div><span className="font-bold text-slate-700">القيمة التقديرية:</span> <span className="font-mono">{dist.EstimatedValue ? Number(dist.EstimatedValue).toLocaleString('ar-EG') + ' ج.م' : '—'}</span></div>
              <div><span className="font-bold text-slate-700">سلطة الاعتماد:</span> <span>{dist.ApprovalAuthority || '—'}</span></div>
              <div><span className="font-bold text-slate-700">تاريخ الاعتماد:</span> <span>{dist.AuthorityApprovalDate || '—'}</span></div>
              <div><span className="font-bold text-slate-700">طريقة الطرح:</span> <span>{dist.TenderMethod || '—'}</span></div>
            </div>
          </div>

          {/* Documents Checklist */}
          <div className="mb-5">
            <h4 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-sky-600" /> المستندات المُرفقة بالملف الفرعي
            </h4>
            <div className="border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="p-2.5 text-right font-bold text-slate-700">المستند</th>
                    <th className="p-2.5 text-center font-bold text-slate-700">الحالة</th>
                    <th className="p-2.5 text-right font-bold text-slate-700">ملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {docList.map((doc, i) => (
                    <tr key={i}>
                      <td className="p-2.5 text-slate-800">{doc.replace(' ✓', '')}</td>
                      <td className="p-2.5 text-center"><span className="text-emerald-600 font-bold">✓ مُرفق</span></td>
                      <td className="p-2.5 text-slate-400 text-xs">—</td>
                    </tr>
                  ))}
                  {dist.HasWarehouseAddition ? (
                    <tr>
                      <td className="p-2.5 text-slate-800">الإضافة المخزنية</td>
                      <td className="p-2.5 text-center"><span className="text-emerald-600 font-bold">✓ مُضاف</span></td>
                      <td className="p-2.5 text-slate-600 text-xs">{dist.WarehouseAdditionNo} — {dist.WarehouseAdditionDate}</td>
                    </tr>
                  ) : null}
                  {dist.HasFinalGuaranteeReceipt ? (
                    <tr>
                      <td className="p-2.5 text-slate-800">إيصال التأمين النهائي</td>
                      <td className="p-2.5 text-center"><span className="text-emerald-600 font-bold">✓ مُستلَم</span></td>
                      <td className="p-2.5 text-slate-600 text-xs">{dist.FinalGuaranteeReceipt} — {dist.FinalGuaranteeReceivedAt}</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-3 gap-6 mt-8 pt-6 border-t-2 border-slate-200">
            {['مُعِد الملف', 'مراجع الملف', 'المستلم'].map(role => (
              <div key={role} className="text-center space-y-6">
                <div className="text-xs font-bold text-slate-700">{role}</div>
                <div className="border-b border-slate-400 mt-8"></div>
                <div className="text-[11px] text-slate-400">التوقيع والختم</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SubFileDistribution() {
  const [tenders, setTenders] = useState([]);
  const [distributions, setDistributions] = useState([]);
  const [selectedTenderId, setSelectedTenderId] = useState('');
  const [currentDist, setCurrentDist] = useState(null);
  const [view, setView] = useState('list'); // 'list' | 'issue' | 'detail'
  const [printForm, setPrintForm] = useState(null); // { dist, delivery }

  // Attachment modal
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [attachType, setAttachType] = useState('warehouse'); // 'warehouse' | 'guarantee'
  const [attachValue, setAttachValue] = useState('');
  const [attachDate, setAttachDate] = useState(new Date().toISOString().split('T')[0]);
  const [attachNotes, setAttachNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedNotif, setExpandedNotif] = useState(false);

  useEffect(() => {
    fetchTenders();
    fetchAllDistributions();
  }, []);

  const fetchTenders = async () => {
    try {
      const res = await axios.get('/api/tenders');
      setTenders(res.data || []);
    } catch (err) { console.error(err); }
  };

  const fetchAllDistributions = async () => {
    try {
      const res = await axios.get('/api/sub-files/list/all');
      setDistributions(res.data || []);
    } catch (err) { console.error(err); }
  };

  const fetchDistForTender = async (tenderId) => {
    setLoading(true);
    try {
      const res = await axios.get('/api/sub-files', { params: { tenderId } });
      return res.data || [];
    } catch (err) { console.error(err); return []; }
    finally { setLoading(false); }
  };

  const fetchDistDetail = async (distId) => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/sub-files/${distId}`);
      setCurrentDist(res.data);
      setView('detail');
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleIssue = async () => {
    if (!selectedTenderId) return alert('يرجى اختيار العملية أولاً');
    setIssuing(true);
    try {
      const tender = tenders.find(t => t.TenderId == selectedTenderId);
      const res = await axios.post('/api/sub-files/issue', {
        tenderId: selectedTenderId,
        requestId: tender?.RequestId || null,
        issuedBy: 'مسؤول الملفات',
        notes: ''
      });
      alert(res.data.message);
      await fetchAllDistributions();
      await fetchDistDetail(res.data.distributionId);
    } catch (err) {
      alert('خطأ: ' + (err.response?.data?.error || err.message));
    } finally { setIssuing(false); }
  };

  const handleAddAttachment = async (e) => {
    e.preventDefault();
    if (!currentDist) return;
    try {
      const res = await axios.put(`/api/sub-files/${currentDist.DistributionId}/attachment`, {
        attachmentType: attachType,
        value: attachValue,
        date: attachDate,
        notes: attachNotes
      });
      alert(res.data.message);
      setShowAttachModal(false);
      setAttachValue('');
      setAttachNotes('');
      await fetchDistDetail(currentDist.DistributionId);
      await fetchAllDistributions();
    } catch (err) {
      alert('خطأ: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleMarkRead = async (nid) => {
    try {
      await axios.put(`/api/sub-files/notifications/${nid}/read`);
      await fetchDistDetail(currentDist.DistributionId);
    } catch (err) { console.error(err); }
  };

  const filteredDists = distributions.filter(d =>
    d.OperationName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.OperationNumber?.includes(searchTerm) ||
    d.TenderNumber?.includes(searchTerm)
  );

  // Determine which delivery targets are active for current dist
  const activeTargets = currentDist
    ? DELIVERY_TARGETS.filter(t => t.always || t.onlyFor === currentDist.OperationType)
    : [];

  return (
    <div className="space-y-6" dir="rtl">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <FolderArchive className="w-6 h-6 text-sky-600" />
            <span>أرشفة وتوزيع الملفات الفرعية للعمليات</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            إصدار وتوزيع الملفات الفرعية الرقمية على الإدارات المختصة ومتابعة استكمال المرفقات وإشعارات الاستكمال التلقائية.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView('issue')}
            className="flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold text-sm shadow-md transition-all active:scale-95"
          >
            <Send className="w-4 h-4" />
            إصدار وتوزيع الملفات الفرعية للعملية
          </button>
          <button
            onClick={() => { setView('list'); fetchAllDistributions(); }}
            className="flex items-center gap-2 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          VIEW: ISSUE NEW DISTRIBUTION
      ══════════════════════════════════════════════════════════════════════ */}
      {view === 'issue' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <h3 className="font-bold text-slate-800 text-base flex items-center gap-2 border-b pb-3">
            <Send className="w-5 h-5 text-sky-600" />
            إصدار ملف فرعي جديد وتوزيعه على الإدارات
          </h3>

          {/* Select Tender */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              اختيار العملية المراد إصدار ملفها الفرعي *
            </label>
            <select
              value={selectedTenderId}
              onChange={(e) => setSelectedTenderId(e.target.value)}
              className="w-full px-4 py-3 border rounded-xl text-sm font-semibold focus:ring-2 focus:ring-sky-500 outline-none bg-slate-50"
            >
              <option value="">-- اختر العملية --</option>
              {tenders.map(t => (
                <option key={t.TenderId} value={t.TenderId}>
                  [{t.TenderNumber}] {t.OperationName} — {t.TenderMethod}
                </option>
              ))}
            </select>
          </div>

          {/* Preview of what will be generated */}
          {selectedTenderId && (
            <div className="bg-sky-50 border border-sky-200 rounded-xl p-5 space-y-4">
              <div className="font-bold text-sky-800 text-sm flex items-center gap-2 mb-3">
                <PackageCheck className="w-5 h-5" />
                المحتوى الرقمي الذي سيُجمَّع تلقائياً في الملف الفرعي
              </div>
              {/* Documents package */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                  'موافقة الطرح', 'عروض الموردين', 'محضر فض المظاريف',
                  'كشف التفريغ', 'محضر البت والإسناد', 'حجز الميزانية',
                  'إخطارات القبول', 'أمر التوريد / التعاقد'
                ].map(doc => (
                  <div key={doc} className="flex items-center gap-1.5 text-[11px] text-sky-700 bg-white border border-sky-200 rounded-lg px-2.5 py-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    {doc}
                  </div>
                ))}
              </div>

              {/* Auto distribution forms */}
              <div className="border-t border-sky-200 pt-4">
                <div className="font-bold text-sky-800 text-xs mb-3">النماذج التي ستُصدَر تلقائياً وتُوزَّع على:</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {DELIVERY_TARGETS.map(target => {
                    const c = colorMap[target.color];
                    const Icon = target.icon;
                    return (
                      <div key={target.key} className={`flex items-center gap-2.5 ${c.bg} border ${c.border} rounded-xl px-3 py-2.5`}>
                        <Icon className={`w-4 h-4 ${c.text} shrink-0`} />
                        <div>
                          <div className={`font-bold text-xs ${c.text}`}>{target.desc}</div>
                          {target.onlyFor && (
                            <div className="text-[10px] text-slate-500">للتعاقدات فقط</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t">
            <button onClick={() => setView('list')} className="px-5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-bold">
              إلغاء
            </button>
            <button
              onClick={handleIssue}
              disabled={!selectedTenderId || issuing}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-700 hover:to-cyan-700 text-white rounded-xl font-bold text-sm shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
            >
              {issuing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {issuing ? 'جاري الإصدار...' : 'إصدار وتوزيع الملفات الفرعية ⚡'}
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          VIEW: DISTRIBUTION DETAIL
      ══════════════════════════════════════════════════════════════════════ */}
      {view === 'detail' && currentDist && (
        <div className="space-y-5">

          {/* Back + Status Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <button onClick={() => setView('list')} className="text-xs text-sky-600 hover:text-sky-800 font-bold flex items-center gap-1">
                ← رجوع للقائمة
              </button>
              <span className="text-slate-300">|</span>
              <div>
                <div className="font-bold text-slate-800 text-sm">{currentDist.OperationName}</div>
                <div className="text-[11px] text-slate-500 font-mono">{currentDist.OperationNumber || currentDist.TenderNumber}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ProgressBar status={currentDist.Status} />
              <span className={`text-[11px] px-2.5 py-1 rounded-full font-bold ${
                currentDist.OperationType === 'تعاقدات' ? 'bg-indigo-100 text-indigo-700' :
                currentDist.OperationType === 'توريدات' ? 'bg-sky-100 text-sky-700' :
                'bg-amber-100 text-amber-700'
              }`}>{currentDist.OperationType}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* Left — Documents + Delivery Cards */}
            <div className="lg:col-span-2 space-y-5">

              {/* Documents Package Card */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2 mb-4 pb-3 border-b">
                  <PackageCheck className="w-4 h-4 text-sky-600" />
                  حزمة المستندات الرقمية المُجمَّعة
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {currentDist.DocumentsPackage && Object.entries(JSON.parse(currentDist.DocumentsPackage))
                    .filter(([, v]) => v)
                    .map(([k, v]) => (
                      <div key={k} className="flex items-start gap-1.5 text-[11px] text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{v.replace(' ✓', '')}</span>
                      </div>
                    ))
                  }
                </div>

                {/* Attachments Status */}
                <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-3">
                  <div className={`flex items-center gap-2 rounded-xl p-3 border ${
                    currentDist.HasWarehouseAddition
                      ? 'bg-emerald-50 border-emerald-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}>
                    <Warehouse className={`w-4 h-4 ${currentDist.HasWarehouseAddition ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <div>
                      <div className={`text-xs font-bold ${currentDist.HasWarehouseAddition ? 'text-emerald-700' : 'text-slate-500'}`}>
                        الإضافة المخزنية
                      </div>
                      {currentDist.HasWarehouseAddition ? (
                        <div className="text-[10px] text-emerald-600 font-mono">{currentDist.WarehouseAdditionNo} — {currentDist.WarehouseAdditionDate}</div>
                      ) : (
                        <div className="text-[10px] text-slate-400">لم تُضف بعد</div>
                      )}
                    </div>
                  </div>
                  <div className={`flex items-center gap-2 rounded-xl p-3 border ${
                    currentDist.HasFinalGuaranteeReceipt
                      ? 'bg-emerald-50 border-emerald-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}>
                    <ShieldCheck className={`w-4 h-4 ${currentDist.HasFinalGuaranteeReceipt ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <div>
                      <div className={`text-xs font-bold ${currentDist.HasFinalGuaranteeReceipt ? 'text-emerald-700' : 'text-slate-500'}`}>
                        إيصال التأمين النهائي
                      </div>
                      {currentDist.HasFinalGuaranteeReceipt ? (
                        <div className="text-[10px] text-emerald-600 font-mono">{currentDist.FinalGuaranteeReceipt} — {currentDist.FinalGuaranteeReceivedAt}</div>
                      ) : (
                        <div className="text-[10px] text-slate-400">لم يُستلَم بعد</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Add Attachment Button */}
                {(!currentDist.HasWarehouseAddition || !currentDist.HasFinalGuaranteeReceipt) && (
                  <button
                    onClick={() => setShowAttachModal(true)}
                    className="mt-3 w-full flex items-center justify-center gap-2 py-2 bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-700 rounded-xl text-xs font-bold transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    إضافة مرفق استكمال (إضافة مخزنية / إيصال تأمين نهائي)
                  </button>
                )}
              </div>

              {/* Delivery Forms Cards */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2 mb-4 pb-3 border-b">
                  <FileText className="w-4 h-4 text-sky-600" />
                  نماذج التسليم للإدارات المختصة
                </h4>
                <div className="space-y-3">
                  {activeTargets.map(target => {
                    const c = colorMap[target.color];
                    const Icon = target.icon;
                    const delivery = currentDist.deliveries?.find(d => d.DeliveryTarget === target.key);
                    return (
                      <div key={target.key} className={`flex items-center justify-between ${c.bg} border ${c.border} rounded-xl px-4 py-3`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl ${c.badge} flex items-center justify-center`}>
                            <Icon className={`w-4 h-4 ${c.text}`} />
                          </div>
                          <div>
                            <div className={`font-bold text-xs ${c.text}`}>{target.desc}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {delivery ? `مُسلَّم — ${new Date(delivery.DeliveredAt).toLocaleDateString('ar-EG')}` : 'في انتظار الإرسال'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {delivery && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${c.badge}`}>
                              ✓ مُسلَّم
                            </span>
                          )}
                          <button
                            onClick={() => setPrintForm({ dist: currentDist, delivery: delivery || { DeliveryTarget: target.key, DeliveryForm: target.desc, DeliveredAt: new Date().toISOString() } })}
                            className={`flex items-center gap-1.5 px-3 py-1.5 bg-white border ${c.border} ${c.text} rounded-lg text-[11px] font-bold hover:shadow-sm`}
                          >
                            <Printer className="w-3.5 h-3.5" />
                            طباعة النموذج
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right — Operation Data + Notifications */}
            <div className="space-y-5">

              {/* Operation Overview */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2 mb-4 pb-3 border-b">
                  <Hash className="w-4 h-4 text-sky-600" /> بيانات العملية
                </h4>
                <div className="space-y-2.5 text-xs">
                  {[
                    { label: 'الجهة الطالبة', val: currentDist.RequestingDepartment },
                    { label: 'القيمة التقديرية', val: currentDist.EstimatedValue ? Number(currentDist.EstimatedValue).toLocaleString('ar-EG') + ' ج.م' : null },
                    { label: 'طريقة الطرح', val: currentDist.TenderMethod },
                    { label: 'سلطة الاعتماد', val: currentDist.ApprovalAuthority },
                    { label: 'تاريخ الاعتماد', val: currentDist.AuthorityApprovalDate },
                    { label: 'تاريخ الإصدار', val: currentDist.IssuedAt ? new Date(currentDist.IssuedAt).toLocaleDateString('ar-EG') : null },
                    { label: 'أصدره', val: currentDist.IssuedBy },
                  ].filter(r => r.val).map(row => (
                    <div key={row.label} className="flex justify-between py-1.5 border-b border-slate-50">
                      <span className="text-slate-500 font-semibold">{row.label}</span>
                      <span className="text-slate-800 font-bold text-left max-w-[55%] text-right">{row.val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notifications */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <button
                  className="w-full flex items-center justify-between"
                  onClick={() => setExpandedNotif(!expandedNotif)}
                >
                  <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <Bell className="w-4 h-4 text-amber-500" />
                    إشعارات الاستكمال
                    {currentDist.notifications?.filter(n => !n.IsRead).length > 0 && (
                      <span className="bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold animate-pulse">
                        {currentDist.notifications.filter(n => !n.IsRead).length}
                      </span>
                    )}
                  </h4>
                  {expandedNotif ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>

                {expandedNotif && (
                  <div className="mt-3 pt-3 border-t space-y-2 max-h-64 overflow-y-auto">
                    {!currentDist.notifications?.length ? (
                      <div className="text-xs text-slate-400 text-center py-4">
                        <Bell className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                        لا توجد إشعارات بعد. ستظهر هنا عند إضافة الإضافات المخزنية أو إيصالات التأمين.
                      </div>
                    ) : (
                      currentDist.notifications.map(n => (
                        <div key={n.NotificationId} className={`text-xs rounded-xl p-3 border ${
                          n.IsRead ? 'bg-slate-50 border-slate-200 text-slate-500' : 'bg-amber-50 border-amber-200 text-amber-800'
                        }`}>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-bold mb-0.5">{n.NotificationType} — {n.TargetDepartment}</div>
                              <div className="text-[10px] opacity-80">{n.Message}</div>
                              <div className="text-[10px] opacity-60 mt-1">{new Date(n.SentAt).toLocaleString('ar-EG')}</div>
                            </div>
                            {!n.IsRead && (
                              <button
                                onClick={() => handleMarkRead(n.NotificationId)}
                                className="text-[10px] text-amber-700 hover:text-amber-900 font-bold shrink-0"
                              >
                                ✓ قراءة
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          VIEW: LIST
      ══════════════════════════════════════════════════════════════════════ */}
      {view === 'list' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Search */}
          <div className="p-4 border-b border-slate-100 flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="بحث بالعملية أو رقم الطرح..."
                className="w-full pr-9 pl-3 py-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <span className="text-xs text-slate-500 font-semibold bg-slate-100 px-3 py-1 rounded-full">
              {filteredDists.length} ملف فرعي مُصدَر
            </span>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b text-[11px] uppercase">
                <tr>
                  <th className="p-3.5">العملية</th>
                  <th className="p-3.5">رقم الطرح</th>
                  <th className="p-3.5">النوع</th>
                  <th className="p-3.5">تاريخ الإصدار</th>
                  <th className="p-3.5">الإضافة المخزنية</th>
                  <th className="p-3.5">التأمين النهائي</th>
                  <th className="p-3.5">الحالة</th>
                  <th className="p-3.5 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDists.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="p-10 text-center text-slate-400">
                      <FolderArchive className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                      <p className="font-semibold">لا توجد ملفات فرعية مُصدَرة بعد.</p>
                      <p className="text-[11px] mt-1 text-slate-300">اضغط "إصدار وتوزيع الملفات الفرعية" لإنشاء أول ملف.</p>
                    </td>
                  </tr>
                ) : (
                  filteredDists.map(d => (
                    <tr key={d.DistributionId} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3.5 font-bold text-slate-800 max-w-[180px] truncate">{d.OperationName}</td>
                      <td className="p-3.5 font-mono text-sky-700 font-bold">{d.OperationNumber || d.TenderNumber}</td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          d.OperationType === 'تعاقدات' ? 'bg-indigo-100 text-indigo-700' :
                          d.OperationType === 'توريدات' ? 'bg-sky-100 text-sky-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>{d.OperationType}</span>
                      </td>
                      <td className="p-3.5 text-slate-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {new Date(d.IssuedAt).toLocaleDateString('ar-EG')}
                        </div>
                      </td>
                      <td className="p-3.5">
                        {d.HasWarehouseAddition ? (
                          <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-bold">✓ مُضاف</span>
                        ) : (
                          <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full text-[10px]">معلَّق</span>
                        )}
                      </td>
                      <td className="p-3.5">
                        {d.HasFinalGuaranteeReceipt ? (
                          <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-bold">✓ مُستلَم</span>
                        ) : (
                          <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full text-[10px]">معلَّق</span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          d.Status === 'مكتمل' ? 'bg-emerald-100 text-emerald-700' :
                          'bg-sky-100 text-sky-700'
                        }`}>{d.Status}</span>
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => fetchDistDetail(d.DistributionId)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-lg text-[11px] font-bold mx-auto"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          عرض
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Attachment Modal ── */}
      {showAttachModal && currentDist && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border space-y-4">
            <h3 className="text-base font-bold text-slate-800 border-b pb-3 flex items-center gap-2">
              <Plus className="w-5 h-5 text-amber-600" />
              إضافة مرفق استكمال للملف الفرعي
            </h3>

            <form onSubmit={handleAddAttachment} className="space-y-4 text-right">
              {/* Type Toggle */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">نوع المرفق</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAttachType('warehouse')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                      attachType === 'warehouse'
                        ? 'bg-sky-600 text-white border-sky-600 shadow-md'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-sky-300'
                    }`}
                  >
                    <Warehouse className="w-4 h-4" />
                    إضافة مخزنية
                  </button>
                  <button
                    type="button"
                    onClick={() => setAttachType('guarantee')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                      attachType === 'guarantee'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-emerald-300'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    إيصال التأمين النهائي
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {attachType === 'warehouse' ? 'رقم الإضافة المخزنية *' : 'رقم إيصال التأمين *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={attachValue}
                    onChange={(e) => setAttachValue(e.target.value)}
                    placeholder="مثال: 1234/2026"
                    className="w-full px-3 py-2 border rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-sky-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">التاريخ *</label>
                  <input
                    type="date"
                    required
                    value={attachDate}
                    onChange={(e) => setAttachDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-sky-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات</label>
                <textarea
                  rows="2"
                  value={attachNotes}
                  onChange={(e) => setAttachNotes(e.target.value)}
                  placeholder="أي ملاحظات إضافية..."
                  className="w-full px-3 py-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-sky-400"
                />
              </div>

              {/* Notification Preview */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                <div className="font-bold mb-1 flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5" />
                  سيتم إرسال إشعار استكمال تلقائي لـ:
                </div>
                <div className="space-y-0.5 text-[11px]">
                  {['المخازن العامة', 'قطاع المشروعات', 'التنسيق الخارجي والتسويات المالية', 'إدارة الاحتياجات ومتابعة المخزون'].map(d => (
                    <div key={d} className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      {d}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowAttachModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow flex items-center gap-2"
                >
                  <Bell className="w-4 h-4" />
                  حفظ وإرسال الإشعارات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Print Modal ── */}
      {printForm && (
        <DeliveryFormPrint
          dist={printForm.dist}
          delivery={printForm.delivery}
          onClose={() => setPrintForm(null)}
        />
      )}
    </div>
  );
}
