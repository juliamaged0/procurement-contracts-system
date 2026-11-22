import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FileSpreadsheet, 
  FolderOpen, 
  CheckCircle2, 
  FileCheck, 
  Users, 
  TrendingUp, 
  AlertTriangle,
  ArrowRightLeft,
  Plus,
  Trash2,
  XCircle,
  Clock,
  Eye,
  Info,
  X
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    tendersCount: 0,
    activeSubmissionsCount: 0,
    evaluatedCount: 0,
    awardedCount: 0,
    blacklistedCount: 0,
    rejectedRequestsCount: 0
  });

  const [tenders, setTenders] = useState([]);
  const [needsRequests, setNeedsRequests] = useState([]);
  const [filterMode, setFilterMode] = useState('ALL'); // 'ALL' | 'APPROVED' | 'PENDING' | 'TENDERED' | 'REJECTED'
  const [selectedRejectedReq, setSelectedRejectedReq] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [tendersRes, needsRes, vendorsRes] = await Promise.all([
        axios.get('/api/tenders'),
        axios.get('/api/needs-requests'),
        axios.get('/api/vendors')
      ]);

      const tList = tendersRes.data || [];
      const nList = needsRes.data || [];
      const vList = vendorsRes.data || [];

      setTenders(tList);
      setNeedsRequests(nList);

      const rejectedCount = nList.filter(r => r.WorkflowStatus === 'مرفوض' || r.AuthorityApprovalStatus === 'مرفوض').length;

      setStats({
        tendersCount: tList.length,
        activeSubmissionsCount: tList.filter(t => t.Status === 'مطروح' || t.Status === 'نشط').length,
        evaluatedCount: tList.filter(t => t.Status === 'مبتوت').length,
        awardedCount: tList.filter(t => t.Status === 'مسند').length,
        blacklistedCount: vList.filter(v => v.IsBlacklisted).length,
        rejectedRequestsCount: rejectedCount
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Filter requests based on tab
  const filteredRequests = needsRequests.filter(req => {
    const isRejected = req.WorkflowStatus === 'مرفوض' || req.AuthorityApprovalStatus === 'مرفوض';
    const isApproved = (req.WorkflowStatus === 'معتمد' || req.AuthorityApprovalStatus === 'معتمد') && !isRejected;

    if (filterMode === 'REJECTED') return isRejected;
    if (filterMode === 'APPROVED') return isApproved && req.Status !== 'مطروح';
    if (filterMode === 'TENDERED') return req.Status === 'مطروح';
    if (filterMode === 'PENDING') return !isRejected && !isApproved;
    return true;
  });

  return (
    <div className="space-y-6" dir="rtl">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-sky-800 via-sky-700 to-indigo-800 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black mb-1">
              مرحباً بك في نظام الدورة المستندية للعقود والمشتريات
            </h2>
            <p className="text-sky-100 text-xs max-w-2xl leading-relaxed">
              إدارة متكاملة ومؤمنة لكافة شاشات طلبات الاحتياج والاعتماد، الطرح وكراسة الشروط، فض المظاريف، والبت الفني والمالي بدقة متناهية.
            </p>
          </div>
          <button
            onClick={() => navigate('/needs-request')}
            className="bg-white text-sky-900 hover:bg-sky-50 px-5 py-2.5 rounded-2xl font-black text-xs shadow-md flex items-center gap-2 shrink-0 transition-transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>تسجيل طلب احتياج جديد</span>
          </button>
        </div>
      </div>

      {/* Quick Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 font-bold">العمليات المطروحة</div>
            <div className="text-xl font-black text-slate-800">{stats.tendersCount}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <FolderOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 font-bold">تفريغ المظاريف</div>
            <div className="text-xl font-black text-slate-800">{stats.activeSubmissionsCount}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 font-bold">العمليات المبتوتة</div>
            <div className="text-xl font-black text-slate-800">{stats.evaluatedCount}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 font-bold">العمليات المسندة</div>
            <div className="text-xl font-black text-slate-800">{stats.awardedCount}</div>
          </div>
        </div>

        {/* Dedicated Rejected Requests Card */}
        <div 
          onClick={() => setFilterMode('REJECTED')}
          className={`p-4 rounded-2xl border shadow-sm flex items-center gap-3 cursor-pointer transition-all ${
            filterMode === 'REJECTED'
              ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-400'
              : 'bg-white border-rose-100 hover:border-rose-200'
          }`}
          title="اضغط لتصفية وعرض الطلبات المرفوضة"
        >
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-rose-700 font-bold">الطلبات المرفوضة</div>
            <div className="text-xl font-black text-rose-700">{stats.rejectedRequestsCount}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 font-bold">سجل الشطب</div>
            <div className="text-xl font-black text-slate-800">{stats.blacklistedCount}</div>
          </div>
        </div>

      </div>

      {/* Needs Requests Section with Quick Status Filters */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-5">
        <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-sky-600" />
            <h3 className="font-black text-slate-800 text-base">
              طلبات الاحتياج وموقف الطرح والاعتماد
            </h3>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setFilterMode('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterMode === 'ALL'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              الكل ({needsRequests.length})
            </button>

            <button
              onClick={() => setFilterMode('APPROVED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterMode === 'APPROVED'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              جاهزة للطرح ({needsRequests.filter(r => (r.WorkflowStatus === 'معتمد' || r.AuthorityApprovalStatus === 'معتمد') && r.Status !== 'مطروح' && r.WorkflowStatus !== 'مرفوض').length})
            </button>

            <button
              onClick={() => setFilterMode('PENDING')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterMode === 'PENDING'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              قيد المراجعة ({needsRequests.filter(r => r.WorkflowStatus !== 'معتمد' && r.WorkflowStatus !== 'مرفوض' && r.AuthorityApprovalStatus !== 'مرفوض').length})
            </button>

            <button
              onClick={() => setFilterMode('TENDERED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterMode === 'TENDERED'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-sky-50 text-sky-700 hover:bg-sky-100'
              }`}
            >
              تم طرحها ({needsRequests.filter(r => r.Status === 'مطروح').length})
            </button>

            <button
              onClick={() => setFilterMode('REJECTED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterMode === 'REJECTED'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              }`}
            >
              الطلبات المرفوضة ❌ ({stats.rejectedRequestsCount})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase border-b border-slate-200">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">اسم العملية</th>
                <th className="p-3">النوع</th>
                <th className="p-3">القيمة التقديرية</th>
                <th className="p-3">الجهة الطالبة</th>
                <th className="p-3">العام المالي</th>
                <th className="p-3">حالة الاعتماد</th>
                <th className="p-3 text-center">الإجراء / الطرح</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    لا توجد طلبات في هذا التصنيف حالياً.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => {
                  const isRejected = req.WorkflowStatus === 'مرفوض' || req.AuthorityApprovalStatus === 'مرفوض';
                  const isApproved = (req.WorkflowStatus === 'معتمد' || req.AuthorityApprovalStatus === 'معتمد') && !isRejected;
                  const isTendered = req.Status === 'مطروح';

                  return (
                    <tr key={req.RequestId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-mono font-bold text-slate-400">#{req.RequestId}</td>
                      <td className="p-3">
                        <div className="font-bold text-slate-800 text-sm">{req.OperationName}</div>
                        {req.FinancialOperationNumber && (
                          <div className="text-[10px] font-mono text-indigo-600 font-bold">
                            رقم: {req.FinancialOperationNumber}
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-bold">
                          {req.OperationType}
                        </span>
                      </td>
                      <td className="p-3 font-mono font-bold text-emerald-700">
                        {req.EstimatedValue ? `${Number(req.EstimatedValue).toLocaleString()} ج.م` : '---'}
                      </td>
                      <td className="p-3 text-slate-600 font-medium">{req.RequestingDepartment}</td>
                      <td className="p-3 font-mono text-slate-500">{req.FiscalYear}</td>
                      <td className="p-3">
                        {isRejected ? (
                          <div className="space-y-0.5">
                            <span className="bg-rose-100 text-rose-800 border border-rose-300 px-2.5 py-0.5 rounded-full text-[11px] font-bold inline-flex items-center gap-1">
                              <X className="w-3 h-3 text-rose-600" />
                              <span>مرفوض</span>
                            </span>
                            {req.AuthorityRejectionReason && (
                              <div className="text-[10px] text-rose-700 truncate max-w-[180px]" title={req.AuthorityRejectionReason}>
                                السبب: {req.AuthorityRejectionReason}
                              </div>
                            )}
                          </div>
                        ) : isApproved ? (
                          <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 rounded-full text-[11px] font-bold inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>معتمد</span>
                          </span>
                        ) : (
                          <span className="bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-0.5 rounded-full text-[11px] font-bold inline-flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>قيد الاعتماد</span>
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* CRITICAL: Never show Tender button if rejected! */}
                          {isRejected ? (
                            <button
                              type="button"
                              onClick={() => setSelectedRejectedReq(req)}
                              className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs px-2.5 py-1 rounded-lg font-bold inline-flex items-center gap-1 transition-colors"
                              title="عرض تفاصيل وسبب الرفض"
                            >
                              <Info className="w-3.5 h-3.5" />
                              <span>مرفوض (تفاصيل)</span>
                            </button>
                          ) : isTendered ? (
                            <span className="text-xs text-sky-700 bg-sky-50 border border-sky-200 px-2 py-1 rounded-lg font-bold">
                              تم الطرح ✓
                            </span>
                          ) : isApproved ? (
                            <Link
                              to={`/tenders?requestId=${req.RequestId}`}
                              className="bg-sky-600 hover:bg-sky-700 text-white text-xs px-3 py-1 rounded-lg font-bold inline-flex items-center gap-1 shadow-sm transition-all"
                            >
                              <span>طرح ⚡</span>
                            </Link>
                          ) : (
                            <span className="text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded-lg font-medium">
                              في انتظار الاعتماد
                            </span>
                          )}

                          <button
                            onClick={async () => {
                              const reason = prompt('يرجى كتابة سبب حذف طلب الاحتياج ونقله للأرشيف:');
                              if (reason !== null) {
                                try {
                                  await axios.delete(`/api/needs-requests/${req.RequestId}`, { data: { reason } });
                                  alert('تم نقل طلب الاحتياج إلى الأرشيف بنجاح 🗄️');
                                  fetchDashboardData();
                                } catch (err) {
                                  alert('خطأ: ' + (err.response?.data?.error || err.message));
                                }
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="حذف ونقل للأرشيف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: View Rejection Details */}
      {selectedRejectedReq && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-rose-200 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b">
              <div className="flex items-center gap-2 text-rose-700 font-black text-base">
                <XCircle className="w-5 h-5" />
                <span>تفاصيل رفض طلب الاحتياج #{selectedRejectedReq.RequestId}</span>
              </div>
              <button
                onClick={() => setSelectedRejectedReq(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <div className="text-slate-500 font-bold">اسم العملية:</div>
                <div className="text-sm font-black text-slate-800">{selectedRejectedReq.OperationName}</div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-slate-50 rounded-xl">
                  <div className="text-slate-500 font-bold">الجهة الطالبة:</div>
                  <div className="font-bold text-slate-700">{selectedRejectedReq.RequestingDepartment}</div>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl">
                  <div className="text-slate-500 font-bold">تاريخ الرفض:</div>
                  <div className="font-bold text-slate-700 font-mono">{selectedRejectedReq.AuthorityApprovalDate || selectedRejectedReq.AuthorityReviewedAt || '---'}</div>
                </div>
              </div>

              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-1.5">
                <div className="text-rose-800 font-black flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>سبب الرفض المسجل من السلطة المختصة:</span>
                </div>
                <p className="text-rose-900 leading-relaxed font-bold bg-white p-3 rounded-lg border border-rose-200">
                  {selectedRejectedReq.AuthorityRejectionReason || 'لم يتم تسجيل سبب تفصيلي'}
                </p>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 leading-relaxed font-medium">
                💡 <span className="font-bold">الإجراء المتبع:</span> هذا الطلب مرفوض نهائياً ولا يتاح للطرح. يتوجب على الإدارة الطالبة إعداد طلب احتياج جديد تماماً وتقديمه من البداية.
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedRejectedReq(null)}
                className="px-5 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-700 transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
