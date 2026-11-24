import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, UserCheck, LogOut, FileText, Bell } from 'lucide-react';
import { fixMojibake } from '../utils/fixMojibake';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'Admin': return 'المشرف العام (Admin)';
      case 'TenderOfficer': return 'مسؤول الطرح';
      case 'CommitteeMember': return 'لجنة البت والتفريغ';
      case 'FinancialAuditor': return 'المراجع المالي والإسناد';
      case 'VendorManager': return 'مسؤول الموردين';
      case 'Auditor': return 'المراجع الرقابي والأرشيف';
      default: return role || 'مستخدم النظام';
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm no-print">
      <div className="px-6 py-3 flex items-center justify-between">
        
        {/* Left Side: System Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-sky-500/20">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-slate-800 text-lg leading-tight">
              الإدارة العامة للعقود والمشتريات
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              شركة الصرف الصحي بمحافظة الإسكندرية — نظام الدورة المستندية المؤمن
            </p>
          </div>
        </div>

        {/* Right Side: User Profile & Security Badge */}
        <div className="flex items-center gap-4">
          
          <div className="hidden md:flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg border border-emerald-200 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>جلسة مؤمنة ومراقبة (RBAC & Audit)</span>
          </div>

          <div className="h-6 w-px bg-slate-200"></div>

          {/* User Info */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-700 font-bold">
              <UserCheck className="w-5 h-5 text-sky-600" />
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-slate-800">
                {user?.username === 'sa' ? 'المشرف العام (Super Admin)' : (fixMojibake(user?.fullName) || 'المشرف العام')}
              </div>
              <div className="text-[11px] font-semibold text-sky-600">
                {getRoleLabel(user?.role)}
              </div>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            title="تسجيل الخروج من النظام"
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl border border-transparent hover:border-rose-200 transition-all flex items-center gap-1 text-xs font-bold"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">خروج</span>
          </button>

        </div>

      </div>
    </header>
  );
}
