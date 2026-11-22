import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck, Eye, CheckCircle2, XCircle, Bell,
  ChevronRight, FileText, DollarSign, AlertCircle,
  Calendar, Stamp, RotateCcw
} from 'lucide-react';

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
              s.step === currentStep ? 'bg-violet-600 text-white shadow-md shadow-violet-500/30' :
              'bg-slate-50 text-slate-400 border border-slate-200'
            }`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                s.step < currentStep ? 'bg-slate-300 text-slate-500' :
                s.step === currentStep ? 'bg-white text-violet-600' :
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

export default function AuthorityApproval() {
  const { user } = useAuth();
  const [pendingRequests, setPendingRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [decision, setDecision] = useState(null);
  const [approvalDate, setApprovalDate] = useState(new Date().toISOString().split('T')[0]);
  const [rejectionReason, setRejectionReason] = useState('');
  const [success, setSuccess] = useState('');
  const [successType, setSuccessType] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { fetchPendingRequests(); }, []);

  const fetchPendingRequests = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/needs-requests/workflow', { params: { pendingFor: 'authority' } });
      setPendingRequests(res.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleDecision = async () => {
    if (!selectedRequest || !decision) return;
    if (decision === 'reject' && !rejectionReason.trim()) {
      setError('برجاء إدخال سبب الرفض');
      return;
    }
    setSubmitting(true); setError('');
    try {
      await axios.put(`/api/needs-requests/${selectedRequest.RequestId}/authority-approval`, {
        approved: decision === 'approve',
        approvalDate,
        rejectionReason,
        reviewedBy: user?.fullName || 'السلطة المختصة',
      });
      setSuccessType(decision);
      setSuccess(decision === 'approve'
        ? 'تمت الموافقة على الطلب بنجاح! سيظهر في شاشة الطرح جاهزاً للطرح.'
        : 'تم رفض الطلب وإعادته للمراجعة مع سبب الرفض.');
      setSelectedRequest(null);
      setDecision(null);
      setRejectionReason('');
      fetchPendingRequests();
    } catch (err) {
      setError(err.response?.data?.error || 'حدث خطأ في معالجة القرار');
    } finally { setSubmitting(false); }
  };

  const authorityBg = (a) => {
    if (!a) return 'bg-slate-50 border-slate-200';
    if (a === 'مجلس الإدارة') return 'bg-rose-50 border-rose-300';
    if (a === 'رئيس مجلس الإدارة') return 'bg-amber-50 border-amber-300';
    return 'bg-sky-50 border-sky-300';
  };

  const authorityText = (a) => {
    if (!a) return 'text-slate-600';
    if (a === 'مجلس الإدارة') return 'text-rose-700';
    if (a === 'رئيس مجلس الإدارة') return 'text-amber-700';
    return 'text-sky-700';
  };

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-600 to-purple-500 flex items-center justify-center shadow-md">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">موافقة السلطة المختصة</h1>
            <p className="text-xs text-slate-500">اعتماد أو رفض طلبات الاحتياج الواردة من الإدارة المالية</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {pendingRequests.length > 0 && (
            <div className="flex items-center gap-2 bg-violet-50 border border-violet-200 px-4 py-2 rounded-xl">
              <Bell className="w-4 h-4 text-violet-600 animate-bounce" />
              <span className="text-xs font-bold text-violet-800">{pendingRequests.length} طلب في انتظار الاعتماد</span>
            </div>
          )}
          <button onClick={fetchPendingRequests} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"><RotateCcw className="w-4 h-4" /></button>
        </div>
      </div>

      <WorkflowBar currentStep={3} />

      {success && (
        <div className={`flex items-center gap-2 p-4 rounded-xl text-sm font-bold border ${successType === 'approve' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
          <CheckCircle2 className="w-5 h-5 shrink-0" />{success}
        </div>
      )}

      <div className="grid grid-cols-3 gap-5">
        {/* Left: Pending list */}
        <div className="col-span-1">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <h2 className="font-bold text-slate-700 text-sm flex items-center gap-2"><Bell className="w-4 h-4 text-violet-500" /> طلبات في انتظار الاعتماد</h2>
            </div>
            {loading ? (
              <div className="p-8 text-center"><div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto"></div></div>
            ) : pendingRequests.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">لا توجد طلبات في انتظار الاعتماد</div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto">
                {pendingRequests.map(req => (
                  <button key={req.RequestId} type="button"
                    onClick={() => { setSelectedRequest(req); setDecision(null); setSuccess(''); setError(''); setRejectionReason(''); }}
                    className={`w-full text-right p-4 hover:bg-slate-50 transition-colors ${selectedRequest?.RequestId === req.RequestId ? 'bg-violet-50 border-r-4 border-violet-500' : ''}`}>
                    <div className="font-bold text-slate-800 text-xs mb-1 truncate">{req.OperationName}</div>
                    <div className="text-[11px] text-slate-500 mb-1 truncate">{req.RequestingDepartment}</div>
                    {req.FinancialOperationNumber && (
                      <div className="text-[10px] font-mono text-sky-600 font-bold mb-1">{req.FinancialOperationNumber}</div>
                    )}
                    {req.ApprovalAuthority && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full inline-block font-bold ${
                        req.ApprovalAuthority === 'مجلس الإدارة' ? 'bg-rose-100 text-rose-700' :
                        req.ApprovalAuthority === 'رئيس مجلس الإدارة' ? 'bg-amber-100 text-amber-700' :
                        'bg-sky-100 text-sky-700'
                      }`}>{req.ApprovalAuthority}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Details + Decision */}
        <div className="col-span-2">
          {!selectedRequest ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
              <Stamp className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">اختر طلباً لاتخاذ قرار الموافقة أو الرفض</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Full details - read only */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
                <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Eye className="w-4 h-4 text-slate-500" /> تفاصيل الطلب والبيانات المالية (للاطلاع فقط)
                </h3>

                {/* Request info */}
                <div>
                  <div className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> بيانات طلب الاحتياج</div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      ['اسم العملية', selectedRequest.OperationName],
                      ['الجهة الطالبة', selectedRequest.RequestingDepartment],
                      ['نوع العملية', selectedRequest.OperationType],
                      ['مدة التنفيذ', selectedRequest.ExecutionDuration || '-'],
                      ['العام المالي', selectedRequest.FiscalYear],
                      ['يتطلب عينة', selectedRequest.RequiresSample ? 'نعم' : 'لا'],
                    ].map(([label, val]) => (
                      <div key={label} className="bg-slate-50 rounded-xl p-2.5 border border-slate-200">
                        <div className="text-[10px] text-slate-500 font-bold mb-0.5">{label}</div>
                        <div className="text-xs font-bold text-slate-800">{val}</div>
                      </div>
                    ))}
                  </div>
                  {selectedRequest.SpecsAndConditions && (
                    <div className="mt-2 bg-slate-50 rounded-xl p-3 border border-slate-200">
                      <div className="text-[10px] text-slate-500 font-bold mb-1">كراسة الشروط</div>
                      <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap max-h-20 overflow-y-auto">{selectedRequest.SpecsAndConditions}</div>
                    </div>
                  )}
                </div>

                {/* Financial info */}
                <div>
                  <div className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5" /> البيانات المالية</div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      ['رقم العملية', selectedRequest.FinancialOperationNumber || '-'],
                      ['رمز العملية', selectedRequest.FinancialOperationSymbol || '-'],
                      ['أسلوب الطرح', selectedRequest.TenderMethodSelected || '-'],
                      ['القيمة التقديرية', selectedRequest.EstimatedValue ? Number(selectedRequest.EstimatedValue).toLocaleString('ar-EG') + ' ج.م' : '-'],
                      ['الحجز المبدئي', selectedRequest.PreliminaryReservation ? Number(selectedRequest.PreliminaryReservation).toLocaleString('ar-EG') + ' ج.م' : '-'],
                      ['نوع الحجز', selectedRequest.ReservationTypeNew || '-'],
                      ['التأمين الابتدائي', selectedRequest.InitialGuaranteePercent ? selectedRequest.InitialGuaranteePercent + '%' : '-'],
                      ['ثمن الكراسة', selectedRequest.BookletPrice ? Number(selectedRequest.BookletPrice).toLocaleString('ar-EG') + ' ج.م' : '-'],
                      ['طريقة الطرح', selectedRequest.SubmittalType || '-'],
                    ].map(([label, val]) => (
                      <div key={label} className="bg-slate-50 rounded-xl p-2.5 border border-slate-200">
                        <div className="text-[10px] text-slate-500 font-bold mb-0.5">{label}</div>
                        <div className="text-xs font-bold text-slate-800">{val}</div>
                      </div>
                    ))}
                  </div>
                  {selectedRequest.OperationTerms && (
                    <div className="mt-2 bg-slate-50 rounded-xl p-3 border border-slate-200">
                      <div className="text-[10px] text-slate-500 font-bold mb-1">شروط العملية</div>
                      <div className="text-xs text-slate-700 leading-relaxed max-h-20 overflow-y-auto">{selectedRequest.OperationTerms}</div>
                    </div>
                  )}
                  {selectedRequest.OperationType === 'تعاقدات' && (selectedRequest.ConstructionDivision || selectedRequest.ConstructionCategory) && (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200">
                        <div className="text-[10px] text-slate-500 font-bold mb-0.5">الشعبة</div>
                        <div className="text-xs font-bold text-slate-800">{selectedRequest.ConstructionDivision || '-'}</div>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200">
                        <div className="text-[10px] text-slate-500 font-bold mb-0.5">الفئة</div>
                        <div className="text-xs font-bold text-slate-800">{selectedRequest.ConstructionCategory ? 'فئة ' + selectedRequest.ConstructionCategory : '-'}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Authority banner */}
                <div className={`p-4 rounded-xl border-2 ${authorityBg(selectedRequest.ApprovalAuthority)}`}>
                  <div className="text-xs font-bold text-slate-600 mb-1">السلطة المختصة بالاعتماد</div>
                  <div className={`text-lg font-black ${authorityText(selectedRequest.ApprovalAuthority)}`}>
                    {selectedRequest.ApprovalAuthority || 'غير محدد'}
                  </div>
                </div>
              </div>

              {/* Decision */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
                <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Stamp className="w-4 h-4 text-violet-500" /> قرار السلطة المختصة
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setDecision('approve')}
                    className={`flex items-center justify-center gap-2 py-4 rounded-xl border-2 font-bold text-sm transition-all ${
                      decision === 'approve' ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-[1.02]' :
                      'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100'
                    }`}>
                    <CheckCircle2 className="w-5 h-5" /> موافق
                  </button>
                  <button type="button" onClick={() => setDecision('reject')}
                    className={`flex items-center justify-center gap-2 py-4 rounded-xl border-2 font-bold text-sm transition-all ${
                      decision === 'reject' ? 'bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-500/30 scale-[1.02]' :
                      'bg-rose-50 border-rose-300 text-rose-700 hover:bg-rose-100'
                    }`}>
                    <XCircle className="w-5 h-5" /> غير موافق
                  </button>
                </div>

                {decision === 'approve' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" /> تاريخ الموافقة
                    </label>
                    <input type="date" value={approvalDate} onChange={e => setApprovalDate(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                    <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> بعد الموافقة، سيظهر الطلب في شاشة الطرح كعملية جديدة جاهزة
                    </p>
                  </div>
                )}

                {decision === 'reject' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-500" /> سبب الرفض <span className="text-rose-500">*</span>
                    </label>
                    <textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} rows={3}
                      className="w-full px-4 py-2.5 rounded-xl border border-rose-300 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 resize-none"
                      placeholder="اكتب سبب الرفض بوضوح لإعادته للمراجعة..." />
                    <p className="text-xs text-rose-600 mt-2 flex items-center gap-1.5">
                      <XCircle className="w-3.5 h-3.5" /> سيتم إعادة الطلب لصفحة طلب الاحتياج والإدارة المالية مع سبب الرفض
                    </p>
                  </div>
                )}

                {error && (
                  <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" />{error}
                  </div>
                )}

                {decision && (
                  <button type="button" onClick={handleDecision} disabled={submitting}
                    className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm disabled:opacity-60 transition-all shadow-md ${
                      decision === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20' :
                      'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/20'
                    }`}>
                    {submitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : (
                      decision === 'approve'
                        ? <><CheckCircle2 className="w-4 h-4" /> تأكيد الموافقة واعتماد الطلب</>
                        : <><XCircle className="w-4 h-4" /> تأكيد الرفض وإعادة الطلب للمراجعة</>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
