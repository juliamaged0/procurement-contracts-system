import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  User, 
  Activity, 
  Globe, 
  Clock, 
  FileCode, 
  Eye,
  RefreshCw
} from 'lucide-react';

export default function AuditTrail() {
  const [logs, setLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedLogForDetails, setSelectedLogForDetails] = useState(null);

  useEffect(() => {
    fetchLogs();
  }, [selectedUser, selectedAction]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      let url = '/api/audit-logs?';
      if (selectedUser) url += `user=${encodeURIComponent(selectedUser)}&`;
      if (selectedAction) url += `action=${encodeURIComponent(selectedAction)}&`;
      
      const res = await axios.get(url);
      setLogs(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (log.Details && log.Details.toLowerCase().includes(term)) ||
           (log.Username && log.Username.toLowerCase().includes(term)) ||
           (log.Action && log.Action.toLowerCase().includes(term)) ||
           (log.EntityName && log.EntityName.toLowerCase().includes(term));
  });

  const getActionBadge = (action) => {
    if (action.includes('حذف')) {
      return <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded font-bold text-[11px]">{action}</span>;
    }
    if (action.includes('شطب') || action.includes('محظور')) {
      return <span className="bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 rounded font-bold text-[11px]">{action}</span>;
    }
    if (action.includes('استرجاع') || action.includes('إلغاء الشطب')) {
      return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-bold text-[11px]">{action}</span>;
    }
    if (action.includes('دخول')) {
      return <span className="bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5 rounded font-bold text-[11px]">{action}</span>;
    }
    if (action.includes('إسناد') || action.includes('أمر')) {
      return <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded font-bold text-[11px]">{action}</span>;
    }
    return <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-bold text-[11px]">{action}</span>;
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-sky-600" />
            <span>سجل الرقابة والنشاط الأمني (Audit Trail & Activity Log)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            توثيق كامل لكل عملية تمت داخل النظام مع بيان المستخدم، التوقيت، عنوان الـ IP، والتفاصيل.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-transform active:scale-95"
        >
          <RefreshCw className="w-3.5 h-3.5 text-sky-600" />
          <span>تحديث السجل</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* User and Action Filter */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <User className="w-4 h-4 text-slate-400" />
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="px-3 py-1.5 border rounded-xl text-xs font-semibold focus:ring-2 focus:ring-sky-500 outline-none"
            >
              <option value="">جميع المستخدمين</option>
              <option value="sa">المشرف العام (sa)</option>
              <option value="tenders_user">أحمد سعيد (tenders_user)</option>
              <option value="committee_user">م. محمود رضوان (committee_user)</option>
              <option value="finance_user">أشرف جلال (finance_user)</option>
              <option value="vendor_user">منى خليل (vendor_user)</option>
              <option value="security_user">كمال فاروق (security_user)</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-slate-400" />
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="px-3 py-1.5 border rounded-xl text-xs font-semibold focus:ring-2 focus:ring-sky-500 outline-none"
            >
              <option value="">جميع العمليات</option>
              <option value="دخول">تسجيل الدخول</option>
              <option value="طرح">شاشة الطرح</option>
              <option value="عطاء">فض المظاريف والتفريغ</option>
              <option value="البت">لجنة البت</option>
              <option value="إسناد">شاشة الإسناد</option>
              <option value="شطب">سجل الشطب</option>
              <option value="حذف">عمليات الحذف</option>
              <option value="استرجاع">عمليات الاسترجاع</option>
            </select>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث بالتفاصيل أو اسم الوحدة أو IP..."
            className="w-full pr-9 pl-3 py-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">المستخدم والدور</th>
                <th className="p-3">نوع الإجراء</th>
                <th className="p-3">الوحدة المستهدفة</th>
                <th className="p-3">تفاصيل الإجراء والعملية</th>
                <th className="p-3">عنوان IP</th>
                <th className="p-3">التوقيت والتاريخ</th>
                <th className="p-3 text-center">عرض</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-slate-400">
                    جاري تحميل سجل النشاط الأمني...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-slate-400">
                    لا توجد سجلات مطابقة لمعايير البحث.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.LogId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-mono font-bold text-slate-400">#{log.LogId}</td>
                    <td className="p-3">
                      <div>
                        <span className="font-bold text-slate-800 font-mono">{log.Username}</span>
                        <div className="text-[10px] text-slate-500 font-sans">{log.UserRole || 'مستخدم'}</div>
                      </div>
                    </td>
                    <td className="p-3">{getActionBadge(log.Action)}</td>
                    <td className="p-3 font-bold text-slate-700">{log.EntityName}</td>
                    <td className="p-3 max-w-sm text-slate-600 truncate font-sans">
                      {log.Details}
                    </td>
                    <td className="p-3 font-mono text-slate-400 text-[11px]">{log.IpAddress || '127.0.0.1'}</td>
                    <td className="p-3 font-mono text-slate-500 text-[11px]">
                      {new Date(log.Timestamp).toLocaleString('ar-EG')}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => setSelectedLogForDetails(log)}
                        className="p-1 hover:bg-slate-100 rounded text-slate-600"
                        title="عرض كامل التفاصيل"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Modal: View Full Log Details */}
      {selectedLogForDetails && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border">
            <h3 className="text-base font-bold text-slate-800 border-b pb-3 flex items-center justify-between">
              <span>تفاصيل السجل الرقابي #{selectedLogForDetails.LogId}</span>
              {getActionBadge(selectedLogForDetails.Action)}
            </h3>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border">
                <div><strong>المستخدم:</strong> {selectedLogForDetails.Username} ({selectedLogForDetails.UserRole})</div>
                <div><strong>الوحدة:</strong> {selectedLogForDetails.EntityName}</div>
                <div><strong>عنوان IP:</strong> <span className="font-mono">{selectedLogForDetails.IpAddress}</span></div>
                <div><strong>التوقيت:</strong> <span className="font-mono">{new Date(selectedLogForDetails.Timestamp).toLocaleString('ar-EG')}</span></div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">البيان الكامل والتفاصيل المسجلة:</label>
                <div className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-[11px] leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
                  {selectedLogForDetails.Details}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t">
              <button
                type="button"
                onClick={() => setSelectedLogForDetails(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow"
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
