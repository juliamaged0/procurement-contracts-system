import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Users, Search, PlusCircle, ChevronDown, ChevronUp, Package, HardHat,
  Layers, UploadCloud, FileText, X, ShieldAlert, Building2
} from 'lucide-react';

const API = '/api/registry';

/* ألوان الحالات: أخضر = قديمة ومعروفة | أصفر = جديدة | أحمر = مشطوبة */
const STATUS = {
  GREEN:  { label: 'قديمة ومعروفة', row: 'bg-emerald-50 border-emerald-200', badge: 'bg-emerald-100 text-emerald-800 border-emerald-300', dot: 'bg-emerald-500' },
  YELLOW: { label: 'جديدة',          row: 'bg-amber-50 border-amber-200',     badge: 'bg-amber-100 text-amber-800 border-amber-300',     dot: 'bg-amber-400' },
  RED:    { label: 'مشطوبة',         row: 'bg-rose-50 border-rose-200',       badge: 'bg-rose-100 text-rose-800 border-rose-300',         dot: 'bg-rose-500' },
};

const REQUIREMENT = {
  FEDERATION: 'يشترط القيد بالاتحاد المصري للتشييد والبناء',
  LICENSES: 'يشترط التأهيل والتراخيص والتصاريح',
  NONE: null,
};

const GRADES = ['الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة', 'السادسة'];
const errMsg = (e) => e.response?.data?.error || e.message;

/* ------------------------------------------------------------------ */
/* مكونات صغيرة                                                         */
/* ------------------------------------------------------------------ */
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto" dir="rtl">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-base font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

const Field = ({ label, children }) => (
  <div>
    <label className="block text-xs font-bold text-slate-700 mb-1">{label}</label>
    {children}
  </div>
);
const inputCls = 'w-full px-3 py-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-sky-400';

function FormButtons({ onClose, busy, label = 'حفظ' }) {
  return (
    <div className="flex justify-end gap-2 pt-3 border-t">
      <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold">إلغاء</button>
      <button type="submit" disabled={busy} className="px-5 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow">{busy ? 'جاري الحفظ...' : label}</button>
    </div>
  );
}

/* اختيار الحالة (أخضر/أصفر/أحمر) + سبب الشطب لو أحمر */
function StatusPicker({ value, reason, onChange }) {
  return (
    <div className="space-y-2">
      <Field label="حالة الشركة *">
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(STATUS).map(([key, s]) => (
            <button
              type="button" key={key}
              onClick={() => onChange({ status: key, blacklistReason: reason })}
              className={`py-2 rounded-xl border-2 text-xs font-bold flex items-center justify-center gap-1.5 ${value === key ? s.badge + ' ring-2 ring-offset-1 ring-slate-300' : 'bg-white text-slate-500 border-slate-200'}`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />{s.label}
            </button>
          ))}
        </div>
      </Field>
      {value === 'RED' && (
        <Field label="سبب الشطب *">
          <textarea rows="2" required value={reason} onChange={(e) => onChange({ status: value, blacklistReason: e.target.value })} className={inputCls} />
        </Field>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone }) {
  return (
    <div className={`rounded-xl p-3 border ${tone}`}>
      <div className="flex items-center gap-1.5 text-[11px] font-bold opacity-80"><Icon className="w-3.5 h-3.5" />{label}</div>
      <div className="text-2xl font-extrabold mt-1">{value}</div>
    </div>
  );
}

function StatusBadge({ status }) {
  const s = STATUS[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${s.badge}`}>
      <span className={`w-2 h-2 rounded-full ${s.dot}`} />{s.label}
    </span>
  );
}

function StatusSelect({ value, onPick }) {
  return (
    <select value={value} onChange={(e) => onPick(e.target.value)} className="text-[11px] border rounded-lg px-1.5 py-1 bg-white">
      {Object.entries(STATUS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
    </select>
  );
}

/* ------------------------------------------------------------------ */
/* الفورمات                                                            */
/* ------------------------------------------------------------------ */
function GroupForm({ onClose, onDone, url, withRequirement }) {
  const [name, setName] = useState('');
  const [requirementType, setRequirementType] = useState('NONE');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try { await axios.post(url, { groupName: name, requirementType }); onDone(); }
    catch (err) { alert('خطأ: ' + errMsg(err)); setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="space-y-3 text-right">
      <Field label="اسم المجموعة *"><input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} /></Field>
      {withRequirement && (
        <Field label="اشتراطات التسجيل في المجموعة">
          <select value={requirementType} onChange={(e) => setRequirementType(e.target.value)} className={inputCls}>
            <option value="NONE">بدون اشتراطات</option>
            <option value="FEDERATION">القيد بالاتحاد المصري للتشييد والبناء</option>
            <option value="LICENSES">التأهيل والتراخيص والتصاريح</option>
          </select>
        </Field>
      )}
      <FormButtons onClose={onClose} busy={busy} label="إضافة" />
    </form>
  );
}

function SubGroupForm({ groupId, onClose, onDone }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try { await axios.post(`${API}/contracts/groups/${groupId}/subgroups`, { subGroupName: name }); onDone(); }
    catch (err) { alert('خطأ: ' + errMsg(err)); setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="space-y-3 text-right">
      <Field label="اسم المجموعة الفرعية *"><input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} /></Field>
      <FormButtons onClose={onClose} busy={busy} label="إضافة" />
    </form>
  );
}

function VendorForm({ groupId, onClose, onDone }) {
  const [f, setF] = useState({ companyName: '', address: '', phone: '', status: 'YELLOW', blacklistReason: '' });
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try { await axios.post(`${API}/supply/groups/${groupId}/vendors`, f); onDone(); }
    catch (err) { alert('خطأ: ' + errMsg(err)); setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="space-y-3 text-right">
      <Field label="اسم الشركة *"><input required value={f.companyName} onChange={(e) => setF({ ...f, companyName: e.target.value })} className={inputCls} /></Field>
      <Field label="العنوان"><input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} className={inputCls} /></Field>
      <Field label="الهاتف"><input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} className={inputCls} /></Field>
      <StatusPicker value={f.status} reason={f.blacklistReason} onChange={(p) => setF({ ...f, ...p })} />
      <FormButtons onClose={onClose} busy={busy} label="إضافة المورد" />
    </form>
  );
}

function ContractorForm({ group, subGroup, onClose, onDone }) {
  const req = group.RequirementType;
  const [f, setF] = useState({
    companyName: '', address: '', phone: '', status: 'YELLOW', blacklistReason: '',
    federationRegistered: false, federationBranch: '', federationGrade: GRADES[0],
    qualifiedAndLicensed: false,
  });
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    // نفس تحققات السيرفر - علشان المستخدم يعرف قبل الإرسال
    if (req === 'FEDERATION') {
      if (!f.federationRegistered) return alert('لازم تأكدي إن المقاول مسجل بالاتحاد المصري للتشييد والبناء');
      if (!files.length) return alert('لازم رفع ملف إثبات القيد بالاتحاد المصري');
    }
    if (req === 'LICENSES') {
      if (!f.qualifiedAndLicensed) return alert('لازم تأكدي إن المقاول مؤهل وحاصل على التصاريح والتراخيص');
      if (!files.length) return alert('لازم رفع مستندات التراخيص والتصاريح');
    }
    const fd = new FormData();
    Object.entries(f).forEach(([k, v]) => fd.append(k, v));
    files.forEach((file) => fd.append('documents', file));
    setBusy(true);
    try {
      await axios.post(`${API}/contracts/subgroups/${subGroup.SubGroupId}/contractors`, fd);
      onDone();
    } catch (err) { alert('خطأ: ' + errMsg(err)); setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-3 text-right">
      <div className="text-[11px] text-slate-500 bg-slate-50 rounded-lg p-2">
        {group.GroupName} ← {subGroup.SubGroupName}
        {REQUIREMENT[req] && <div className="text-rose-600 font-bold mt-1 flex items-center gap-1"><ShieldAlert className="w-3.5 h-3.5" />{REQUIREMENT[req]}</div>}
      </div>

      <Field label="اسم الشركة *"><input required value={f.companyName} onChange={(e) => setF({ ...f, companyName: e.target.value })} className={inputCls} /></Field>
      <Field label="العنوان"><input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} className={inputCls} /></Field>
      <Field label="الهاتف"><input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} className={inputCls} /></Field>

      {req === 'FEDERATION' && (
        <div className="space-y-3 border border-sky-200 bg-sky-50/50 rounded-xl p-3">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <input type="checkbox" checked={f.federationRegistered} onChange={(e) => setF({ ...f, federationRegistered: e.target.checked })} className="w-4 h-4 accent-sky-600" />
            مسجل بالاتحاد المصري للتشييد والبناء *
          </label>
          <div className="grid grid-cols-2 gap-2">
            <Field label="الشعبة *"><input required value={f.federationBranch} onChange={(e) => setF({ ...f, federationBranch: e.target.value })} placeholder="الشعبة المخصصة للمجموعة" className={inputCls} /></Field>
            <Field label="الفئة *">
              <select value={f.federationGrade} onChange={(e) => setF({ ...f, federationGrade: e.target.value })} className={inputCls}>
                {GRADES.map((g) => <option key={g}>{g}</option>)}
              </select>
            </Field>
          </div>
        </div>
      )}

      {req === 'LICENSES' && (
        <div className="border border-sky-200 bg-sky-50/50 rounded-xl p-3">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <input type="checkbox" checked={f.qualifiedAndLicensed} onChange={(e) => setF({ ...f, qualifiedAndLicensed: e.target.checked })} className="w-4 h-4 accent-sky-600" />
            المتقدم مؤهل وحاصل على التصاريح والتراخيص الرسمية والقانونية اللازمة *
          </label>
        </div>
      )}

      {req !== 'NONE' && (
        <Field label={req === 'FEDERATION' ? 'ملف إثبات القيد بالاتحاد * (PDF / صور)' : 'مستندات التراخيص والتصاريح * (PDF / صور)'}>
          <label className="flex flex-col items-center gap-1 border-2 border-dashed rounded-xl p-4 cursor-pointer text-slate-500 hover:border-sky-400 text-xs">
            <UploadCloud className="w-6 h-6" />
            <span>اضغطي لاختيار الملفات</span>
            <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" className="hidden"
              onChange={(e) => setFiles((prev) => [...prev, ...Array.from(e.target.files)])} />
          </label>
          {files.length > 0 && (
            <ul className="mt-2 space-y-1">
              {files.map((file, i) => (
                <li key={i} className="flex items-center justify-between bg-slate-50 rounded-lg px-2 py-1 text-[11px]">
                  <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" />{file.name}</span>
                  <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} className="text-rose-500"><X className="w-3.5 h-3.5" /></button>
                </li>
              ))}
            </ul>
          )}
        </Field>
      )}

      <StatusPicker value={f.status} reason={f.blacklistReason} onChange={(p) => setF({ ...f, ...p })} />
      <FormButtons onClose={onClose} busy={busy} label="تسجيل المقاول" />
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* الصفحة                                                              */
/* ------------------------------------------------------------------ */
export default function VendorRegistry() {
  const [mode, setMode] = useState('supply'); // 'supply' | 'contracts'
  const [supply, setSupply] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState({});      // { 's-1': true, 'c-3': true, 'sg-7': true }
  const [modal, setModal] = useState(null);

  const toggle = (k) => setOpen((o) => ({ ...o, [k]: !o[k] }));

  const load = async () => {
    try {
      const [s, c] = await Promise.all([axios.get(`${API}/supply`), axios.get(`${API}/contracts`)]);
      setSupply(s.data || []);
      setContracts(c.data || []);
    } catch (e) { console.error(e); }
  };
  useEffect(() => { load(); }, []);
  const done = () => { setModal(null); load(); };

  /* ---- إحصائيات الداشبورد ---- */
  const supplyVendors = supply.flatMap((g) => g.vendors);
  const allContractors = contracts.flatMap((g) => g.subGroups.flatMap((s) => s.contractors));
  const stats = {
    supply: { groups: supply.length, vendors: supplyVendors.length, red: supplyVendors.filter((v) => v.Status === 'RED').length },
    contracts: {
      groups: contracts.length,
      subs: contracts.reduce((n, g) => n + g.subGroups.length, 0),
      contractors: allContractors.length,
      red: allContractors.filter((c) => c.Status === 'RED').length,
    },
  };

  /* ---- تغيير الحالة ---- */
  const changeStatus = async (url, status) => {
    let blacklistReason = '';
    if (status === 'RED') {
      blacklistReason = window.prompt('سبب الشطب؟') || '';
      if (!blacklistReason.trim()) return;
    }
    try { await axios.patch(url, { status, blacklistReason }); load(); }
    catch (e) { alert('خطأ: ' + errMsg(e)); }
  };

  const q = search.trim().toLowerCase();
  const has = (t) => (t || '').toLowerCase().includes(q);

  /* ---- مجموعات التوريدات ---- */
  const renderSupply = () => {
    const groups = supply.filter((g) => !q || has(g.GroupName) || g.vendors.some((v) => has(v.CompanyName)));
    if (!groups.length) return <div className="p-10 text-center text-slate-400 text-sm">لا توجد مجموعات.</div>;
    return groups.map((g) => {
      const isOpen = open['s-' + g.GroupId] || !!q;
      const red = g.vendors.filter((v) => v.Status === 'RED').length;
      return (
        <div key={g.GroupId} className="border-b border-slate-100">
          <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50" onClick={() => toggle('s-' + g.GroupId)}>
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-sky-100 text-sky-700 text-xs font-extrabold flex items-center justify-center">{g.GroupNo ?? g.GroupId}</span>
              <span className="font-bold text-sm text-slate-800">{g.GroupName}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] bg-slate-100 px-2 py-0.5 rounded-full font-semibold">{g.vendors.length} مورد</span>
              {red > 0 && <span className="text-[11px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-semibold">{red} مشطوب</span>}
              <button onClick={(e) => { e.stopPropagation(); setModal({ type: 'vendor', groupId: g.GroupId }); }}
                className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-lg text-[11px] font-bold flex items-center gap-1">
                <PlusCircle className="w-3.5 h-3.5" />إضافة مورد
              </button>
              {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </div>
          </div>
          {isOpen && (
            <div className="px-4 pb-3 space-y-2">
              {g.vendors.length === 0 && <div className="text-center text-slate-400 text-xs py-3">لا يوجد موردون في هذه المجموعة بعد.</div>}
              {g.vendors.filter((v) => !q || has(v.CompanyName) || has(g.GroupName)).map((v) => (
                <div key={v.VendorId} className={`flex items-center justify-between gap-3 border rounded-xl p-3 ${STATUS[v.Status].row}`}>
                  <div>
                    <div className="font-bold text-sm text-slate-800">{v.CompanyName}</div>
                    <div className="text-[11px] text-slate-600">{v.Address || 'بدون عنوان'}{v.Phone ? ` — ${v.Phone}` : ''}</div>
                    {v.Status === 'RED' && v.BlacklistReason && <div className="text-[11px] text-rose-700 mt-1">سبب الشطب: {v.BlacklistReason}</div>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={v.Status} />
                    <StatusSelect value={v.Status} onPick={(s) => changeStatus(`${API}/supply/vendors/${v.VendorId}/status`, s)} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    });
  };

  /* ---- مجموعات التعاقدات ---- */
  const renderContracts = () => {
    const matchGroup = (g) => has(g.GroupName) || g.subGroups.some((s) => has(s.SubGroupName) || s.contractors.some((c) => has(c.CompanyName)));
    const groups = contracts.filter((g) => !q || matchGroup(g));
    if (!groups.length) return <div className="p-10 text-center text-slate-400 text-sm">لا توجد مجموعات.</div>;
    return groups.map((g) => {
      const gOpen = open['c-' + g.GroupId] || !!q;
      const cons = g.subGroups.flatMap((s) => s.contractors);
      return (
        <div key={g.GroupId} className="border-b border-slate-100">
          <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50" onClick={() => toggle('c-' + g.GroupId)}>
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 text-xs font-extrabold flex items-center justify-center">{g.GroupNo ?? '•'}</span>
              <div>
                <div className="font-bold text-sm text-slate-800">{g.GroupName}</div>
                {REQUIREMENT[g.RequirementType] && <div className="text-[10px] text-rose-600 font-bold">{REQUIREMENT[g.RequirementType]}</div>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] bg-slate-100 px-2 py-0.5 rounded-full font-semibold">{g.subGroups.length} فرعية</span>
              <span className="text-[11px] bg-slate-100 px-2 py-0.5 rounded-full font-semibold">{cons.length} مقاول</span>
              <button onClick={(e) => { e.stopPropagation(); setModal({ type: 'subgroup', groupId: g.GroupId }); }}
                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[11px] font-bold flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" />إضافة مجموعة فرعية
              </button>
              {gOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </div>
          </div>

          {gOpen && (
            <div className="px-4 pb-3 space-y-2">
              {g.subGroups.length === 0 && <div className="text-center text-slate-400 text-xs py-3">لا توجد مجموعات فرعية بعد.</div>}
              {g.subGroups.map((s) => {
                const sOpen = open['sg-' + s.SubGroupId] || !!q;
                return (
                  <div key={s.SubGroupId} className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between p-2.5 bg-slate-50 cursor-pointer" onClick={() => toggle('sg-' + s.SubGroupId)}>
                      <span className="font-bold text-xs text-slate-700">{s.SubGroupName}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] bg-white px-2 py-0.5 rounded-full border">{s.contractors.length} مقاول</span>
                        <button onClick={(e) => { e.stopPropagation(); setModal({ type: 'contractor', group: g, subGroup: s }); }}
                          className="px-2.5 py-1 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-[11px] font-bold flex items-center gap-1">
                          <PlusCircle className="w-3.5 h-3.5" />إضافة مقاول
                        </button>
                        {sOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </div>
                    </div>
                    {sOpen && (
                      <div className="p-2.5 space-y-2">
                        {s.contractors.length === 0 && <div className="text-center text-slate-400 text-xs py-2">لا يوجد مقاولون بعد.</div>}
                        {s.contractors.map((c) => (
                          <div key={c.ContractorId} className={`border rounded-xl p-3 ${STATUS[c.Status].row}`}>
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <div className="font-bold text-sm text-slate-800">{c.CompanyName}</div>
                                <div className="text-[11px] text-slate-600">{c.Address || 'بدون عنوان'}{c.Phone ? ` — ${c.Phone}` : ''}</div>
                                {c.FederationBranch && <div className="text-[11px] text-slate-600">الاتحاد المصري: شعبة {c.FederationBranch} — الفئة {c.FederationGrade}</div>}
                                {c.QualifiedAndLicensed && <div className="text-[11px] text-slate-600">مؤهل وحاصل على التراخيص والتصاريح ✓</div>}
                                {c.Status === 'RED' && c.BlacklistReason && <div className="text-[11px] text-rose-700 mt-1">سبب الشطب: {c.BlacklistReason}</div>}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <StatusBadge status={c.Status} />
                                <StatusSelect value={c.Status} onPick={(st) => changeStatus(`${API}/contracts/contractors/${c.ContractorId}/status`, st)} />
                              </div>
                            </div>
                            {c.documents.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {c.documents.map((d) => (
                                  <a key={d.DocId} href={`${API}/documents/${d.DocId}`} target="_blank" rel="noreferrer"
                                    className="text-[11px] bg-white border rounded-lg px-2 py-0.5 text-sky-700 flex items-center gap-1 hover:bg-sky-50">
                                    <FileText className="w-3 h-3" />{d.FileName}
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    });
  };


  return (
    <div className="space-y-6" dir="rtl">
      {/* العنوان */}
      <div className="border-b pb-4">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Users className="w-6 h-6 text-sky-600" />
          <span>سجل الموردين والمقاولين</span>
        </h2>
        <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-600">
          {Object.entries(STATUS).map(([k, s]) => (
            <span key={k} className="flex items-center gap-1"><span className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />{s.label}</span>
          ))}
        </div>
      </div>

      {/* الداشبورد: مستطيلين - الضغط على أي واحد بيختار القسم */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <button onClick={() => setMode('supply')}
          className={`text-right rounded-2xl border-2 p-4 transition-all ${mode === 'supply' ? 'border-sky-500 bg-sky-50 ring-4 ring-sky-100' : 'border-slate-200 bg-white hover:border-sky-300'}`}>
          <div className="flex items-center gap-2 font-bold text-slate-800 mb-3"><Package className="w-5 h-5 text-sky-600" />التوريدات</div>
          <div className="grid grid-cols-3 gap-2">
            <StatCard icon={Layers} label="المجموعات" value={stats.supply.groups} tone="bg-white border-sky-200 text-sky-800" />
            <StatCard icon={Building2} label="الموردين" value={stats.supply.vendors} tone="bg-white border-slate-200 text-slate-800" />
            <StatCard icon={ShieldAlert} label="المشطوبين" value={stats.supply.red} tone="bg-white border-rose-200 text-rose-700" />
          </div>
        </button>

        <button onClick={() => setMode('contracts')}
          className={`text-right rounded-2xl border-2 p-4 transition-all ${mode === 'contracts' ? 'border-indigo-500 bg-indigo-50 ring-4 ring-indigo-100' : 'border-slate-200 bg-white hover:border-indigo-300'}`}>
          <div className="flex items-center gap-2 font-bold text-slate-800 mb-3"><HardHat className="w-5 h-5 text-indigo-600" />التعاقدات</div>
          <div className="grid grid-cols-4 gap-2">
            <StatCard icon={Layers} label="المجموعات" value={stats.contracts.groups} tone="bg-white border-indigo-200 text-indigo-800" />
            <StatCard icon={Layers} label="الفرعية" value={stats.contracts.subs} tone="bg-white border-indigo-200 text-indigo-800" />
            <StatCard icon={Building2} label="المقاولين" value={stats.contracts.contractors} tone="bg-white border-slate-200 text-slate-800" />
            <StatCard icon={ShieldAlert} label="المشطوبين" value={stats.contracts.red} tone="bg-white border-rose-200 text-rose-700" />
          </div>
        </button>
      </div>

      {/* شريط الأدوات */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث باسم المجموعة أو الشركة..."
            className="w-full pr-9 pl-3 py-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-sky-500" />
        </div>
        {mode === 'supply' ? (
          <button onClick={() => setModal({ type: 'supplyGroup' })}
            className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5">
            <PlusCircle className="w-4 h-4" />إضافة مجموعة توريدات
          </button>
        ) : (
          <button onClick={() => setModal({ type: 'contractGroup' })}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5">
            <PlusCircle className="w-4 h-4" />إضافة مجموعة رئيسية
          </button>
        )}
      </div>

      {/* القائمة */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {mode === 'supply' ? renderSupply() : renderContracts()}
      </div>

      {/* المودالات */}
      {modal?.type === 'supplyGroup' && (
        <Modal title="إضافة مجموعة توريدات" onClose={() => setModal(null)}>
          <GroupForm url={`${API}/supply/groups`} onClose={() => setModal(null)} onDone={done} />
        </Modal>
      )}
      {modal?.type === 'contractGroup' && (
        <Modal title="إضافة مجموعة رئيسية (تعاقدات)" onClose={() => setModal(null)}>
          <GroupForm url={`${API}/contracts/groups`} withRequirement onClose={() => setModal(null)} onDone={done} />
        </Modal>
      )}
      {modal?.type === 'subgroup' && (
        <Modal title="إضافة مجموعة فرعية" onClose={() => setModal(null)}>
          <SubGroupForm groupId={modal.groupId} onClose={() => setModal(null)} onDone={done} />
        </Modal>
      )}
      {modal?.type === 'vendor' && (
        <Modal title="إضافة مورد" onClose={() => setModal(null)}>
          <VendorForm groupId={modal.groupId} onClose={() => setModal(null)} onDone={done} />
        </Modal>
      )}
      {modal?.type === 'contractor' && (
        <Modal title="تسجيل مقاول" onClose={() => setModal(null)}>
          <ContractorForm group={modal.group} subGroup={modal.subGroup} onClose={() => setModal(null)} onDone={done} />
        </Modal>
      )}
    </div>
  );
}