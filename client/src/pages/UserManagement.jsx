import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  UserCog, 
  UserPlus, 
  Shield, 
  KeyRound, 
  Building, 
  CheckCircle, 
  AlertCircle 
} from 'lucide-react';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const [newUser, setNewUser] = useState({
    username: '',
    password: '1',
    fullName: '',
    role: 'TenderOfficer',
    department: 'الإدارة العامة للعقود والمشتريات'
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/users');
      setUsers(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/users', newUser);
      alert('تم إضافة المستخدم بنجاح وتعيين صلاحياته ✅');
      setShowAddModal(false);
      setNewUser({
        username: '',
        password: '1',
        fullName: '',
        role: 'TenderOfficer',
        department: 'الإدارة العامة للعقود والمشتريات'
      });
      fetchUsers();
    } catch (err) {
      alert('خطأ أثناء إضافة المستخدم: ' + (err.response?.data?.error || err.message));
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'Admin':
        return <span className="bg-sky-100 text-sky-800 border border-sky-300 px-2.5 py-0.5 rounded-full text-xs font-bold">المشرف العام (Admin)</span>;
      case 'TenderOfficer':
        return <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 rounded-full text-xs font-bold">مسؤول الطرح</span>;
      case 'CommitteeMember':
        return <span className="bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-0.5 rounded-full text-xs font-bold">لجنة البت والتفريغ</span>;
      case 'FinancialAuditor':
        return <span className="bg-indigo-100 text-indigo-800 border border-indigo-300 px-2.5 py-0.5 rounded-full text-xs font-bold">المراجع المالي والإسناد</span>;
      case 'VendorManager':
        return <span className="bg-purple-100 text-purple-800 border border-purple-300 px-2.5 py-0.5 rounded-full text-xs font-bold">مسؤول قيد الموردين</span>;
      case 'Auditor':
        return <span className="bg-rose-100 text-rose-800 border border-rose-300 px-2.5 py-0.5 rounded-full text-xs font-bold">المراجع الأمني والرقابي</span>;
      default:
        return <span className="bg-slate-100 text-slate-800 px-2.5 py-0.5 rounded-full text-xs font-bold">{role}</span>;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <UserCog className="w-6 h-6 text-sky-600" />
            <span>إدارة مستخدمي النظام والصلاحيات (User & Role Management)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            إضافة مستخدمين جدد وتعيين الأدوار الوظيفية والصلاحيات المخصصة لكل موظف.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition-transform active:scale-95"
        >
          <UserPlus className="w-4 h-4" />
          <span>إضافة مستخدم جديد</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">اسم المستخدم (Username)</th>
                <th className="p-3">الاسم الكامل</th>
                <th className="p-3">الدور الوظيفي والصلاحيات</th>
                <th className="p-3">الإدارة / القسم</th>
                <th className="p-3">تاريخ الإنشاء</th>
                <th className="p-3">حالة الحساب</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-400">
                    جاري تحميل قائمة المستخدمين...
                  </td>
                </tr>
              ) : users.map((u) => (
                <tr key={u.UserId} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 font-mono font-bold text-slate-400">#{u.UserId}</td>
                  <td className="p-3 font-bold font-mono text-sky-700">{u.Username}</td>
                  <td className="p-3 font-bold text-slate-800">{u.FullName}</td>
                  <td className="p-3">{getRoleBadge(u.Role)}</td>
                  <td className="p-3 text-slate-600">{u.Department}</td>
                  <td className="p-3 font-mono text-slate-500">
                    {u.CreatedAt ? new Date(u.CreatedAt).toLocaleDateString('ar-EG') : '---'}
                  </td>
                  <td className="p-3">
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[11px] font-bold">
                      نشط ومفعل
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add User */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border">
            <h3 className="text-base font-bold text-slate-800 border-b pb-3 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-sky-600" />
              <span>إضافة مستخدم جديد للنظام</span>
            </h3>

            <form onSubmit={handleCreateUser} className="space-y-3 text-right">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم المستخدم بالإنجليزية (Username) *</label>
                <input
                  type="text"
                  required
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  placeholder="مثال: ahmed_tenders"
                  className="w-full px-3 py-2 border rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الاسم الكامل بالعربية *</label>
                <input
                  type="text"
                  required
                  value={newUser.fullName}
                  onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                  placeholder="مثال: أحمد مصطفى السعيد"
                  className="w-full px-3 py-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الدور الوظيفي والصلاحيات *</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="TenderOfficer">مسؤول الطرح والمواصفات (TenderOfficer)</option>
                  <option value="CommitteeMember">لجنة البت والتفريغ (CommitteeMember)</option>
                  <option value="FinancialAuditor">المراجع المالي والإسناد (FinancialAuditor)</option>
                  <option value="VendorManager">مسؤول قيد الموردين والشطب (VendorManager)</option>
                  <option value="Auditor">المراجع الأمني والرقابي والأرشيف (Auditor)</option>
                  <option value="Admin">المشرف العام (Super Admin)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الإدارة / القسم التابع له</label>
                <input
                  type="text"
                  value={newUser.department}
                  onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">كلمة المرور المبدئية</label>
                <input
                  type="password"
                  required
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-slate-600 rounded-xl text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow"
                >
                  حفظ المستخدم
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
