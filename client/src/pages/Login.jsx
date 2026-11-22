import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Lock, 
  User, 
  ShieldCheck, 
  Building2, 
  ArrowRight, 
  KeyRound, 
  Sparkles,
  CheckCircle2
} from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const [username, setUsername] = useState('sa');
  const [password, setPassword] = useState('1');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Predefined role accounts for quick switching
  const demoAccounts = [
    { username: 'sa', password: '1', role: 'المشرف العام (Super Admin)', desc: 'كافة الصلاحيات والإدارة والأرشيف والرقابة', color: 'border-sky-500 bg-sky-50/50' },
    { username: 'tenders_user', password: '1', role: 'مسؤول الطرح والمواصفات', desc: 'طلبات الاحتياج، الطرح، كراسة الشروط', color: 'border-emerald-500 bg-emerald-50/50' },
    { username: 'committee_user', password: '1', role: 'لجنة البت والتفريغ', desc: 'فض المظاريف، التقييم، محضر البت', color: 'border-amber-500 bg-amber-50/50' },
    { username: 'finance_user', password: '1', role: 'المراجع المالي والإسناد', desc: 'شاشة الإسناد، إذن التوجيه، الدمغات', color: 'border-indigo-500 bg-indigo-50/50' },
    { username: 'vendor_user', password: '1', role: 'مسؤول قيد الموردين', desc: 'سجل الموردين (66 مجموعة) وسجل الشطب', color: 'border-purple-500 bg-purple-50/50' },
    { username: 'security_user', password: '1', role: 'المراجع الأمني والرقابي', desc: 'سجل نشاط العمليات (Audit Trail) والأرشيف', color: 'border-rose-500 bg-rose-50/50' }
  ];

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(username, password);
    setLoading(false);

    if (result.success) {
      navigate(from, { replace: true });
    } else {
      setError(result.error);
    }
  };

  const handleSelectAccount = (acc) => {
    setUsername(acc.username);
    setPassword(acc.password);
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 relative overflow-hidden selection:bg-sky-500 selection:text-white">
      
      {/* Background Glows */}
      <div className="absolute top-1/4 -right-20 w-96 h-96 bg-sky-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-cyan-600/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-12 gap-6 relative z-10">
        
        {/* Left/Main Login Box */}
        <div className="md:col-span-6 bg-white rounded-3xl p-8 shadow-2xl border border-slate-100 flex flex-col justify-between">
          
          <div>
            {/* Logo & Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-sky-500/30">
                <Building2 className="w-7 h-7" />
              </div>
              <div>
                <h1 className="font-extrabold text-slate-900 text-lg leading-tight">
                  شركة الصرف الصحي بالإسكندرية
                </h1>
                <p className="text-xs text-sky-700 font-bold">
                  الإدارة العامة للعقود والمشتريات
                </p>
              </div>
            </div>

            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-800 mb-1">تسجيل الدخول للنظام</h2>
              <p className="text-xs text-slate-500">
                أدخل بيانات حسابك أو اختر من الحسابات التجريبية بالجانب
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-rose-600 animate-ping"></div>
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLoginSubmit} className="space-y-4 text-right">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">اسم المستخدم (Username)</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="مثال: sa"
                    className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-sky-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">كلمة المرور (Password)</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="كلمة المرور"
                    className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-sky-500 outline-none transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-700 hover:to-cyan-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-sky-600/25 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span>جاري التحقق...</span>
                ) : (
                  <>
                    <span>دخول النظام الآمن</span>
                    <ArrowRight className="w-4 h-4 rotate-180" />
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>نظام مشفر ومراقب أمنياً (RBAC + Audit)</span>
            </span>
            <span className="font-mono font-bold text-slate-400">v2.0</span>
          </div>

        </div>

        {/* Right Side: Quick Role Switcher Cards */}
        <div className="md:col-span-6 bg-slate-800/80 backdrop-blur-md rounded-3xl p-6 border border-slate-700/80 text-white flex flex-col justify-between">
          
          <div>
            <div className="flex items-center justify-between border-b border-slate-700 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-sky-400" />
                <h3 className="font-bold text-sm text-slate-200">حسابات الأدوار الجاهزة للاختبار السريع</h3>
              </div>
              <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded font-mono">
                الباسورد: 1 للجميع
              </span>
            </div>

            <p className="text-xs text-slate-400 mb-3">
              اضغط على أي حساب أدناه لتسجيل الدخول به وتجربة الصلاحيات الخاصة به:
            </p>

            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {demoAccounts.map((acc) => {
                const isSelected = username === acc.username;
                return (
                  <button
                    key={acc.username}
                    type="button"
                    onClick={() => handleSelectAccount(acc)}
                    className={`w-full text-right p-3 rounded-2xl border transition-all flex items-start justify-between ${
                      isSelected
                        ? 'bg-slate-700 border-sky-400 shadow-md'
                        : 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-700/40'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-white">{acc.role}</span>
                        <span className="text-[10px] font-mono bg-slate-900 text-sky-300 px-1.5 py-0.5 rounded border border-slate-700">
                          {acc.username}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 leading-snug">{acc.desc}</p>
                    </div>

                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="text-[11px] text-slate-400 text-center pt-3 border-t border-slate-700/60 mt-3">
            العام المالي: 2025/2026 — شركة الصرف الصحي بمحافظة الإسكندرية
          </div>

        </div>

      </div>

    </div>
  );
}
