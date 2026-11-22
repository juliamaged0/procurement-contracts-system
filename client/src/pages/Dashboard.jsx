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
  Trash2
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const [stats, setStats] = useState({
    tendersCount: 0,
    activeSubmissionsCount: 0,
    evaluatedCount: 0,
    awardedCount: 0,
    blacklistedCount: 0
  });

  const [tenders, setTenders] = useState([]);
  const [needsRequests, setNeedsRequests] = useState([]);
  const [showNeedsModal, setShowNeedsModal] = useState(false);

  const [newRequest, setNewRequest] = useState({
    operationName: '',
    operationType: 'تعاقدات',
    estimatedValue: '',
    requestingDepartment: 'إدارة شبكات الصرف الصحي',
    executionDuration: '6 أشهر',
    fiscalYear: '2025/2026',
    reservationType: 'موازنة الشركة',
    initialReservation: '',
    submittalType: 'مظروفيين'
  });

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

      setStats({
        tendersCount: tList.length,
        activeSubmissionsCount: tList.filter(t => t.Status === 'مطروح' || t.Status === 'نشط').length,
        evaluatedCount: tList.filter(t => t.Status === 'مبتوت').length,
        awardedCount: tList.filter(t => t.Status === 'مسند').length,
        blacklistedCount: vList.filter(v => v.IsBlacklisted).length
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateNeedsRequest = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/needs-requests', newRequest);
      setShowNeedsModal(false);
      fetchDashboardData();
    } catch (err) {
      alert('خطأ أثناء حفظ طلب الاحتياج: ' + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-sky-800 via-sky-700 to-cyan-700 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold mb-1">
              مرحباً بك في نظام الدورة المستندية للعقود والمشتريات
            </h2>
            <p className="text-sky-100 text-sm max-w-2xl">
              إدارة متكاملة ومؤمنة لكافة شاشات الطرح، فض المظاريف، البت الفني والمالي، الإسناد، وحساب التأمينات والدمغات الرسمية بدقة متناهية.
            </p>
          </div>
          <button
            onClick={() => setShowNeedsModal(true)}
            className="bg-white text-sky-800 hover:bg-sky-50 px-4 py-2.5 rounded-xl font-bold text-sm shadow-md flex items-center gap-2 shrink-0 transition-transform active:scale-95"
          >
            <Plus className="w-5 h-5" />
            <span>إضافة طلب احتياج جديد</span>
          </button>
        </div>
      </div>

      {/* Quick Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-semibold">إجمالي العمليات المطروحة</div>
            <div className="text-2xl font-bold text-slate-800">{stats.tendersCount}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <FolderOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-semibold">مرحلة تفريغ المظاريف</div>
            <div className="text-2xl font-bold text-slate-800">{stats.activeSubmissionsCount}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-semibold">العمليات المبتوت فيها</div>
            <div className="text-2xl font-bold text-slate-800">{stats.evaluatedCount}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <FileCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-semibold">العمليات المسندة (أمر توريد)</div>
            <div className="text-2xl font-bold text-slate-800">{stats.awardedCount}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-semibold">شركات بسجل الشطب</div>
            <div className="text-2xl font-bold text-rose-600 font-mono">{stats.blacklistedCount}</div>
          </div>
        </div>

      </div>

      {/* Needs Requests Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 text-base">
            <ArrowRightLeft className="w-5 h-5 text-sky-600" />
            <span>طلبات الاحتياج الواردة المستدعادة للطرح</span>
          </h3>
          <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full font-semibold">
            {needsRequests.length} طلبات
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs font-bold uppercase border-b border-slate-200">
              <tr>
                <th className="p-3.5">#</th>
                <th className="p-3.5">اسم العملية</th>
                <th className="p-3.5">النوع</th>
                <th className="p-3.5">القيمة التقديرية</th>
                <th className="p-3.5">الجهة الطالبة</th>
                <th className="p-3.5">العام المالي</th>
                <th className="p-3.5">الحالة</th>
                <th className="p-3.5 text-center">الإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {needsRequests.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-6 text-center text-slate-400">
                    لا توجد طلبات احتياج حالية. قم بإضافة طلب جديد للبدء.
                  </td>
                </tr>
              ) : (
                needsRequests.map((req) => (
                  <tr key={req.RequestId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 font-bold text-slate-500">#{req.RequestId}</td>
                    <td className="p-3.5 font-bold text-slate-800">{req.OperationName}</td>
                    <td className="p-3.5">
                      <span className="bg-sky-50 text-sky-700 px-2.5 py-0.5 rounded-md text-xs font-bold border border-sky-200">
                        {req.OperationType}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono font-bold text-emerald-700">
                      {req.EstimatedValue?.toLocaleString()} ج.م
                    </td>
                    <td className="p-3.5 text-slate-600">{req.RequestingDepartment}</td>
                    <td className="p-3.5 font-mono">{req.FiscalYear}</td>
                    <td className="p-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        req.Status === 'مطروح' ? 'bg-emerald-100 text-emerald-800' :
                        req.Status === 'مسند' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {req.Status}
                      </span>
                    </td>
                    <td className="p-3.5 text-center flex items-center justify-center gap-1.5">
                      {req.Status === 'معلق' ? (
                        <Link
                          to={`/tenders?requestId=${req.RequestId}`}
                          className="bg-sky-600 hover:bg-sky-700 text-white text-xs px-2.5 py-1.5 rounded-lg font-bold inline-flex items-center gap-1 shadow-sm"
                        >
                          <span>طرح ⚡</span>
                        </Link>
                      ) : (
                        <span className="text-xs text-slate-400 font-semibold px-2 py-1">تم الطرح</span>
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
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: New Needs Request */}
      {showNeedsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 border-b pb-3">
              إضافة طلب احتياج جديد (استدعاء للطرح)
            </h3>
            
            <form onSubmit={handleCreateNeedsRequest} className="space-y-4 text-right">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم العملية المطلوبة</label>
                <input
                  type="text"
                  required
                  value={newRequest.operationName}
                  onChange={(e) => setNewRequest({ ...newRequest, operationName: e.target.value })}
                  placeholder="مثال: توريد مواسير زهر محطات الصرف الصحي"
                  className="w-full px-3.5 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نوع العملية</label>
                  <select
                    value={newRequest.operationType}
                    onChange={(e) => setNewRequest({ ...newRequest, operationType: e.target.value })}
                    className="w-full px-3.5 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                  >
                    <option value="تعاقدات">تعاقدات (أعمال)</option>
                    <option value="توريدات">توريدات (مهمات)</option>
                    <option value="مزادات">مزادات</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">القيمة التقديرية (ج.م)</label>
                  <input
                    type="number"
                    required
                    value={newRequest.estimatedValue}
                    onChange={(e) => setNewRequest({ ...newRequest, estimatedValue: e.target.value })}
                    placeholder="مثال: 500000"
                    className="w-full px-3.5 py-2 border rounded-xl text-sm font-mono focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الجهة الطالبة</label>
                  <input
                    type="text"
                    required
                    value={newRequest.requestingDepartment}
                    onChange={(e) => setNewRequest({ ...newRequest, requestingDepartment: e.target.value })}
                    className="w-full px-3.5 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">مدة العملية</label>
                  <input
                    type="text"
                    value={newRequest.executionDuration}
                    onChange={(e) => setNewRequest({ ...newRequest, executionDuration: e.target.value })}
                    className="w-full px-3.5 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowNeedsModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-sm font-bold shadow-md"
                >
                  حفظ الاستدعاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
