import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard,
  ClipboardList,
  DollarSign,
  ShieldCheck as ShieldApproval,
  FileSpreadsheet, 
  FolderOpen, 
  CheckCircle2, 
  FileCheck, 
  Users, 
  Printer, 
  Archive, 
  ShieldCheck, 
  UserCog, 
  AlertOctagon,
  FolderArchive
} from 'lucide-react';

export default function Sidebar() {
  const { user } = useAuth();

  const workflowItems = [
    { to: '/needs-request', label: 'طلب الاحتياج والاعتماد الشامل', icon: ClipboardList, roles: ['Admin', 'TenderOfficer', 'CommitteeMember', 'FinancialAuditor', 'VendorManager', 'Auditor'] },
  ];

  const mainNavItems = [
    { to: '/', label: 'لوحة التحكم والمتابعة', icon: LayoutDashboard, roles: ['Admin', 'TenderOfficer', 'CommitteeMember', 'FinancialAuditor', 'VendorManager', 'Auditor'] },
    { to: '/tenders', label: '1. شاشة الطرح وكراسة الشروط', icon: FileSpreadsheet, roles: ['Admin', 'TenderOfficer'] },
    { to: '/envelope-opening', label: '2. فض المظاريف والتفريغ', icon: FolderOpen, roles: ['Admin', 'CommitteeMember'] },
    { to: '/evaluation', label: '3. شاشة البت والتقييم', icon: CheckCircle2, roles: ['Admin', 'CommitteeMember'] },
    { to: '/awarding', label: '4. شاشة الإسناد وإذن التوجيه', icon: FileCheck, roles: ['Admin', 'FinancialAuditor'] },
    { to: '/vendors', label: '5. قيد الموردين وسجل الشطب', icon: Users, roles: ['Admin', 'VendorManager'] },
    { to: '/sub-files', label: '6. أرشفة وتوزيع الملفات الفرعية', icon: FolderArchive, roles: ['Admin', 'TenderOfficer', 'FinancialAuditor'] },
    { to: '/reports', label: '7. النماذج والتقارير الرسمية', icon: Printer, roles: ['Admin', 'TenderOfficer', 'CommitteeMember', 'FinancialAuditor', 'VendorManager', 'Auditor'] },
    { to: '/archive', label: '8. الأرشيف وسلة المحذوفات', icon: Archive, roles: ['Admin', 'Auditor'] },
    { to: '/audit-trail', label: '9. سجل الرقابة والنشاط الأمني', icon: ShieldCheck, roles: ['Admin', 'Auditor'] },
    { to: '/users', label: '10. إدارة المستخدمين والصلاحيات', icon: UserCog, roles: ['Admin'] },
  ];

  const filterByRole = (items) => {
    if (user?.role === 'Admin') return items;
    return items.filter(item => item.roles.includes(user?.role));
  };

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs transition-all duration-150 ${
      isActive
        ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30 font-semibold'
        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
    }`;

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 min-h-[calc(100vh-61px)] no-print shadow-xl">
      
      {/* Fiscal Year & Role Indicator */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/50">
        <div className="text-[11px] text-slate-400 font-semibold mb-1">العام المالي المعتمد:</div>
        <div className="text-sm font-bold text-sky-400 flex items-center justify-between mb-2">
          <span>2025 / 2026</span>
          <span className="text-[10px] bg-sky-950 text-sky-300 border border-sky-800 px-2 py-0.5 rounded-full font-mono">
            ينتهي في 6/30
          </span>
        </div>
        <div className="text-[10px] bg-slate-800/80 text-slate-300 p-1.5 rounded-lg border border-slate-700/60 truncate">
          الصلاحية: <span className="font-bold text-sky-300">{user?.role || 'زائر'}</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
        
        {/* Dashboard */}
        <NavLink to="/" end className={navLinkClass}>
          <LayoutDashboard className="w-4 h-4 shrink-0" />
          <span>لوحة التحكم والمتابعة</span>
        </NavLink>

        {/* Workflow Section */}
        {filterByRole(workflowItems).length > 0 && (
          <>
            <div className="pt-3 pb-1 px-1">
              <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></div>
                دورة الطلب والاعتماد
              </div>
            </div>
            {filterByRole(workflowItems).map((item) => {
              const Icon = item.icon;
              return (
                <NavLink key={item.to} to={item.to} className={navLinkClass}>
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </>
        )}

        {/* Main Procurement Cycle */}
        <div className="pt-3 pb-1 px-1">
          <div className="text-[10px] font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-sky-400"></div>
            الدورة المستندية
          </div>
        </div>
        {filterByRole(mainNavItems.filter(i => i.to !== '/')).map((item) => {
          const Icon = item.icon;
          return (
            <NavLink key={item.to} to={item.to} className={navLinkClass}>
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Legend Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40 text-xs space-y-2">
        <div className="font-bold text-slate-300 mb-1 flex items-center gap-1.5 text-[11px]">
          <AlertOctagon className="w-3.5 h-3.5 text-sky-400" />
          <span>حالة قيد الشركات المتقدمة:</span>
        </div>
        <div className="flex items-center gap-2 text-emerald-400 text-[11px]">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>أخضر: شركة مسجلة وقائمة</span>
        </div>
        <div className="flex items-center gap-2 text-amber-400 text-[11px]">
          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          <span>أصفر: سابقة أعمال (غير مسجلة)</span>
        </div>
        <div className="flex items-center gap-2 text-rose-400 text-[11px] font-semibold">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
          <span>أحمر: مشطوبة وممنوعة</span>
        </div>
      </div>

    </aside>
  );
}
