import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Users, 
  UserPlus, 
  ShieldAlert, 
  ShieldCheck, 
  Search, 
  Filter, 
  Building, 
  Briefcase, 
  RotateCcw,
  AlertTriangle,
  FileText,
  ChevronDown,
  ChevronUp,
  PlusCircle,
  HardHat
} from 'lucide-react';

export default function VendorRegistry() {
  const [activeTab, setActiveTab] = useState('vendors'); // 'vendors', 'contractors', 'blacklist', 'groups'
  const [vendorsList, setVendorsList] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Contractor Groups State
  const [contractorGroups, setContractorGroups] = useState([]);
  const [expandedGroupId, setExpandedGroupId] = useState(null);
  const [groupMembers, setGroupMembers] = useState({});
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(null); // groupId
  const [groupForm, setGroupForm] = useState({ groupName: '', groupDescription: '', workScope: '' });
  const [memberForm, setMemberForm] = useState({ vendorId: '', isFederationMember: false, certificates: '', notes: '' });

  // Modals
  const [showAddVendorModal, setShowAddVendorModal] = useState(false);
  const [showAddContractorModal, setShowAddContractorModal] = useState(false);
  const [showBlacklistModal, setShowBlacklistModal] = useState(false);
  const [showUnblacklistModal, setShowUnblacklistModal] = useState(false);
  const [selectedVendorForAction, setSelectedVendorForAction] = useState(null);

  // Form States
  const [vendorForm, setVendorForm] = useState({
    companyName: '',
    companyType: 'شركة مساهمة',
    address: '',
    phone: '',
    fax: '',
    email: '',
    taxCardNo: '',
    taxCardExpiry: '',
    commercialRegisterNo: '',
    commercialRegisterExpiry: '',
    selectedCategory: '1',
    isRegistered: true,
    hasPreviousWorks: true
  });

  const [contractorForm, setContractorForm] = useState({
    companyName: '',
    companyType: 'شركة مساهمة',
    address: '',
    phone: '',
    taxCardNo: '',
    commercialRegisterNo: '',
    constructionGrade: 'الأولى',
    constructionBranch: 'محطات وشبكات المياه والصرف الصحي',
    isRegistered: true,
    hasPreviousWorks: true
  });

  const [blacklistForm, setBlacklistForm] = useState({
    blacklistReason: '',
    blacklistAuthority: 'مجلس الإدارة',
    blacklistDate: new Date().toISOString().split('T')[0]
  });

  const [unblacklistForm, setUnblacklistForm] = useState({
    unblacklistedReason: '',
    unblacklistedAuthority: 'مجلس الإدارة',
    unblacklistedDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchVendors();
    fetchCategories();
    fetchContractorGroups();
  }, []);

  const fetchVendors = async () => {
    try {
      const res = await axios.get('/api/vendors');
      setVendorsList(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await axios.get('/api/supply-categories');
      setCategories(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchContractorGroups = async () => {
    try {
      const res = await axios.get('/api/contractor-groups');
      setContractorGroups(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchGroupMembers = async (groupId) => {
    if (groupMembers[groupId]) return; // already loaded
    try {
      const res = await axios.get(`/api/contractor-groups/${groupId}/members`);
      setGroupMembers(prev => ({ ...prev, [groupId]: res.data || [] }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleGroup = (groupId) => {
    if (expandedGroupId === groupId) {
      setExpandedGroupId(null);
    } else {
      setExpandedGroupId(groupId);
      fetchGroupMembers(groupId);
    }
  };

  const handleAddGroup = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/contractor-groups', groupForm);
      alert('تم إضافة المجموعة بنجاح ✅');
      setShowAddGroupModal(false);
      setGroupForm({ groupName: '', groupDescription: '', workScope: '' });
      setContractorGroups([]);
      fetchContractorGroups();
    } catch (err) {
      alert('خطأ: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleAddMember = async (e, groupId) => {
    e.preventDefault();
    try {
      await axios.post(`/api/contractor-groups/${groupId}/members`, memberForm);
      alert('تم إضافة المقاول للمجموعة ✅');
      setShowAddMemberModal(null);
      setMemberForm({ vendorId: '', isFederationMember: false, certificates: '', notes: '' });
      // Refresh members for this group
      setGroupMembers(prev => { const n = { ...prev }; delete n[groupId]; return n; });
      fetchGroupMembers(groupId);
    } catch (err) {
      alert('خطأ: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleAddVendor = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/vendors', {
        ...vendorForm,
        constructionBranch: null,
        constructionGrade: 'غير مجدول'
      });
      alert('تم تسجيل المورد بنجاح في سجل الموردين ✅');
      setShowAddVendorModal(false);
      fetchVendors();
    } catch (err) {
      alert('خطأ أثناء التسجيل: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleAddContractor = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/vendors', {
        ...contractorForm,
        fax: '',
        email: '',
        taxCardExpiry: null,
        commercialRegisterExpiry: null
      });
      alert('تم قيد المقاول بنجاح في سجل المقاولين ✅');
      setShowAddContractorModal(false);
      fetchVendors();
    } catch (err) {
      alert('خطأ أثناء التسجيل: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleBlacklist = async (e) => {
    e.preventDefault();
    if (!selectedVendorForAction) return;

    try {
      await axios.post(`/api/vendors/${selectedVendorForAction.VendorId}/blacklist`, blacklistForm);
      alert('تم إدراج الشركة في سجل الشطب والممنوعين من التعامل ⛔');
      setShowBlacklistModal(false);
      fetchVendors();
    } catch (err) {
      alert('خطأ: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleUnblacklist = async (e) => {
    e.preventDefault();
    if (!selectedVendorForAction) return;

    try {
      await axios.post(`/api/vendors/${selectedVendorForAction.VendorId}/unblacklist`, unblacklistForm);
      alert('تم إلغاء الشطب وإعادة قيد الشركة بنجاح 🟢');
      setShowUnblacklistModal(false);
      fetchVendors();
    } catch (err) {
      alert('خطأ: ' + (err.response?.data?.error || err.message));
    }
  };

  const filteredVendors = vendorsList.filter(v => {
    const matchesSearch = v.CompanyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          v.TaxCardNo.includes(searchTerm);
    if (!matchesSearch) return false;

    if (activeTab === 'blacklist') return v.IsBlacklisted === 1 || v.IsBlacklisted === true;
    if (activeTab === 'contractors') return (v.ConstructionGrade && v.ConstructionGrade !== 'غير مجدول') && !v.IsBlacklisted;
    if (activeTab === 'vendors') return (!v.ConstructionGrade || v.ConstructionGrade === 'غير مجدول') && !v.IsBlacklisted;
    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-6 h-6 text-sky-600" />
            <span>خامساً: سجل قيد الموردين والمقاولين وإدارة سجل الشطب</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            إدارة بيانات الموردين (66 مجموعة) والمقاولين (الفئات 1-7) وسجل الشركات المشطوبة والممنوعة من التعامل مع إمكانية إعادة القيد.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'vendors' && (
            <button
              onClick={() => setShowAddVendorModal(true)}
              className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition-transform active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              <span>تسجيل مورد جديد</span>
            </button>
          )}

          {activeTab === 'contractors' && (
            <button
              onClick={() => setShowAddContractorModal(true)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition-transform active:scale-95"
            >
              <Building className="w-4 h-4" />
              <span>تسجيل مقاول جديد</span>
            </button>
          )}
          {activeTab === 'groups' && (
            <button
              onClick={() => setShowAddGroupModal(true)}
              className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition-transform active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>إضافة مجموعة جديدة</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setActiveTab('vendors')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'vendors' ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📦 سجل الموردين (التوريدات)
          </button>
          <button
            onClick={() => setActiveTab('contractors')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'contractors' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🏗️ سجل المقاولين (التعاقدات)
          </button>
          <button
            onClick={() => setActiveTab('blacklist')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'blacklist' ? 'bg-rose-600 text-white shadow-sm' : 'text-rose-700 hover:bg-rose-50'
            }`}
          >
            ⛔ سجل الشطب والممنوعين
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'groups' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🏗️ مجاميع المقاولين (التعاقدات)
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث بالاسم أو البطاقة الضريبية..."
            className="w-full pr-9 pl-3 py-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

      </div>

      {/* Table Content */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-sm">
            {activeTab === 'vendors' && 'قائمة الموردين المسجلين بالمجموعات التوريدية'}
            {activeTab === 'contractors' && 'قائمة المقاولين المسجلين وشعب التشييد والبناء'}
            {activeTab === 'blacklist' && 'سجل الشركات المشطوبة والمحرومة من التعامل رسمياً'}
            {activeTab === 'groups' && 'مجاميع المقاولين لعمليات التعاقد (9 مجاميع رئيسية)'}
          </h3>
          <span className="text-xs text-slate-500 font-semibold bg-slate-100 px-3 py-1 rounded-full">
            {activeTab === 'groups' ? `${contractorGroups.length} مجموعة` : `${filteredVendors.length} شركة`}
          </span>
        </div>

        {/* Contractor Groups Tab Content */}
        {activeTab === 'groups' && (
          <div className="divide-y divide-slate-100">
            {contractorGroups.length === 0 ? (
              <div className="p-10 text-center text-slate-400">
                <HardHat className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                <p>لا توجد مجاميع مقاولين مسجلة.</p>
              </div>
            ) : (
              contractorGroups.map(group => (
                <div key={group.GroupId} className="bg-white">
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-amber-50/40 transition-colors"
                    onClick={() => handleToggleGroup(group.GroupId)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-extrabold text-sm flex items-center justify-center border border-amber-200">
                        {group.GroupId}
                      </span>
                      <div>
                        <div className="font-bold text-slate-800 text-sm">{group.GroupName}</div>
                        {group.WorkScope && (
                          <div className="text-[11px] text-slate-500 mt-0.5">{group.WorkScope}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-semibold">
                        {group.MemberCount || 0} مقاول
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); setShowAddMemberModal(group.GroupId); }}
                        className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-[11px] font-bold flex items-center gap-1"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        إضافة مقاول
                      </button>
                      {expandedGroupId === group.GroupId
                        ? <ChevronUp className="w-4 h-4 text-slate-400" />
                        : <ChevronDown className="w-4 h-4 text-slate-400" />
                      }
                    </div>
                  </div>

                  {expandedGroupId === group.GroupId && (
                    <div className="bg-amber-50/30 border-t border-amber-100 px-4 pb-4">
                      {!groupMembers[group.GroupId] ? (
                        <div className="py-4 text-center text-slate-400 text-xs">جاري التحميل...</div>
                      ) : groupMembers[group.GroupId].length === 0 ? (
                        <div className="py-5 text-center text-slate-400 text-xs">
                          لا يوجد مقاولون مسجلون في هذه المجموعة بعد.
                        </div>
                      ) : (
                        <table className="w-full text-right text-xs mt-3">
                          <thead>
                            <tr className="text-slate-500 font-bold border-b border-amber-200">
                              <th className="pb-2 pr-2">اسم الشركة / المقاول</th>
                              <th className="pb-2">الهاتف</th>
                              <th className="pb-2">البريد الإلكتروني</th>
                              <th className="pb-2 text-center">عضو الاتحاد</th>
                              <th className="pb-2">الشهادات والمستندات</th>
                              <th className="pb-2">ملاحظات</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-amber-100">
                            {groupMembers[group.GroupId].map(m => (
                              <tr key={m.MemberId} className="hover:bg-amber-100/30">
                                <td className="py-2 pr-2 font-bold text-slate-800">{m.CompanyName}</td>
                                <td className="py-2 font-mono text-slate-600">{m.Phone || '—'}</td>
                                <td className="py-2 text-sky-600 font-mono">{m.Email || '—'}</td>
                                <td className="py-2 text-center">
                                  {m.IsFederationMember ? (
                                    <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-bold">✓ نعم</span>
                                  ) : (
                                    <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full text-[10px]">لا</span>
                                  )}
                                </td>
                                <td className="py-2 text-slate-600 max-w-[140px] truncate">{m.Certificates || '—'}</td>
                                <td className="py-2 text-slate-500">{m.Notes || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Regular Vendors / Contractors / Blacklist Table */}
        {activeTab !== 'groups' && (
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b">
              <tr>
                <th className="p-3">اسم الشركة / المورد</th>
                <th className="p-3">الشكل القانوني</th>
                <th className="p-3">البطاقة الضريبية</th>
                <th className="p-3">العنوان والهاتف</th>
                {activeTab === 'contractors' && (
                  <>
                    <th className="p-3">فئة التشييد</th>
                    <th className="p-3">الشعبة والتخصص</th>
                  </>
                )}
                {activeTab === 'blacklist' && (
                  <>
                    <th className="p-3">سبب الشطب</th>
                    <th className="p-3">جهة الشطب والتاريخ</th>
                  </>
                )}
                <th className="p-3">حالة القيد</th>
                <th className="p-3 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredVendors.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-slate-400">
                    لا توجد شركات مسجلة مطابقة لمعايير البحث في هذا السجل.
                  </td>
                </tr>
              ) : (
                filteredVendors.map((v) => (
                  <tr key={v.VendorId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-bold text-slate-800">{v.CompanyName}</td>
                    <td className="p-3 text-slate-600">{v.CompanyType}</td>
                    <td className="p-3 font-mono font-bold text-slate-700">{v.TaxCardNo}</td>
                    <td className="p-3 text-slate-600">
                      <div>{v.Address || 'غير محدد'}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{v.Phone}</div>
                    </td>

                    {activeTab === 'contractors' && (
                      <>
                        <td className="p-3">
                          <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold border border-indigo-200">
                            الفئة {v.ConstructionGrade}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600">{v.ConstructionBranch}</td>
                      </>
                    )}

                    {activeTab === 'blacklist' && (
                      <>
                        <td className="p-3 font-bold text-rose-700 max-w-xs">{v.BlacklistReason}</td>
                        <td className="p-3 text-slate-600">
                          <div>{v.BlacklistAuthority}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{v.BlacklistDate}</div>
                        </td>
                      </>
                    )}

                    <td className="p-3">
                      {v.IsBlacklisted ? (
                        <span className="bg-rose-100 text-rose-800 px-2.5 py-1 rounded-full font-bold text-[11px] border border-rose-300 flex items-center gap-1 w-fit">
                          <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping"></span>
                          <span>مشطوبة وممنوعة</span>
                        </span>
                      ) : v.IsRegistered ? (
                        <span className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full font-bold text-[11px] border border-emerald-300 flex items-center gap-1 w-fit">
                          <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                          <span>مسجلة بالقيد</span>
                        </span>
                      ) : (
                        <span className="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full font-bold text-[11px] border border-amber-300 flex items-center gap-1 w-fit">
                          <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                          <span>سابقة أعمال</span>
                        </span>
                      )}
                    </td>

                    <td className="p-3 text-center">
                      {v.IsBlacklisted ? (
                        <button
                          onClick={() => {
                            setSelectedVendorForAction(v);
                            setShowUnblacklistModal(true);
                          }}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm flex items-center gap-1 mx-auto"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>إلغاء الشطب</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedVendorForAction(v);
                            setShowBlacklistModal(true);
                          }}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold border border-rose-200"
                        >
                          شطب الشركة ⛔
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        )}
      </div>

      {/* Modal: Add Vendor */}
      {showAddVendorModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 border">
            <h3 className="text-lg font-bold text-slate-800 border-b pb-3">تسجيل مورد جديد بقيد الموردين</h3>
            
            <form onSubmit={handleAddVendor} className="space-y-3 text-right">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم الشركة / المورد *</label>
                <input
                  type="text"
                  required
                  value={vendorForm.companyName}
                  onChange={(e) => setVendorForm({ ...vendorForm, companyName: e.target.value })}
                  placeholder="مثال: شركة الحمد لقطع غيار السيارات"
                  className="w-full px-3 py-2 border rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الشكل القانوني للشركة</label>
                  <select
                    value={vendorForm.companyType}
                    onChange={(e) => setVendorForm({ ...vendorForm, companyType: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-xs"
                  >
                    <option value="أفراد">أفراد</option>
                    <option value="شركة تضامن">شركة تضامن</option>
                    <option value="شركة مساهمة">شركة مساهمة</option>
                    <option value="شركة ذات مسؤولية محدودة">شركة ذات مسؤولية محدودة</option>
                    <option value="جهة أخرى">جهة أخرى</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم البطاقة الضريبية *</label>
                  <input
                    type="text"
                    required
                    value={vendorForm.taxCardNo}
                    onChange={(e) => setVendorForm({ ...vendorForm, taxCardNo: e.target.value })}
                    placeholder="مثال: 100-200-300"
                    className="w-full px-3 py-2 border rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">المجموعة التوريدية المسجل بها (من الـ 66 مجموعة)</label>
                <select
                  value={vendorForm.selectedCategory}
                  onChange={(e) => setVendorForm({ ...vendorForm, selectedCategory: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-xs"
                >
                  {categories.map((c) => (
                    <option key={c.CategoryId} value={c.CategoryId}>
                      مجموعة ({c.CategoryId}): {c.CategoryName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">العنوان</label>
                  <input
                    type="text"
                    value={vendorForm.address}
                    onChange={(e) => setVendorForm({ ...vendorForm, address: e.target.value })}
                    placeholder="الشارع - المنطقة - المحافظة"
                    className="w-full px-3 py-2 border rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف</label>
                  <input
                    type="text"
                    value={vendorForm.phone}
                    onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddVendorModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow"
                >
                  تسجيل المورد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Contractor */}
      {showAddContractorModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 border">
            <h3 className="text-lg font-bold text-slate-800 border-b pb-3">تسجيل مقاول جديد بسجل المقاولين</h3>
            
            <form onSubmit={handleAddContractor} className="space-y-3 text-right">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم شركة المقاولات *</label>
                <input
                  type="text"
                  required
                  value={contractorForm.companyName}
                  onChange={(e) => setContractorForm({ ...contractorForm, companyName: e.target.value })}
                  placeholder="مثال: شركة تبارك للمقاولات العامة"
                  className="w-full px-3 py-2 border rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">فئة التشييد والبناء (كتابة) *</label>
                  <select
                    value={contractorForm.constructionGrade}
                    onChange={(e) => setContractorForm({ ...contractorForm, constructionGrade: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-xs font-bold"
                  >
                    <option value="الأولى">الفئة الأولى</option>
                    <option value="الثانية">الفئة الثانية</option>
                    <option value="الثالثة">الفئة الثالثة</option>
                    <option value="الرابعة">الفئة الرابعة</option>
                    <option value="الخامسة">الفئة الخامسة</option>
                    <option value="السادسة">الفئة السادسة</option>
                    <option value="السابعة">الفئة السابعة</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الشعبة المسجل بها بالاتحاد</label>
                  <select
                    value={contractorForm.constructionBranch}
                    onChange={(e) => setContractorForm({ ...contractorForm, constructionBranch: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-xs"
                  >
                    <option value="محطات وشبكات المياه والصرف الصحي">أولاً: محطات وشبكات المياه والصرف الصحي</option>
                    <option value="الأعمال الكهروميكانيكية والالكترونية">ثانياً: الأعمال الكهروميكانيكية والالكترونية</option>
                    <option value="الأعمال البحرية والنهرية والتكريك">ثالثاً: الأعمال البحرية والنهرية والتكريك</option>
                    <option value="أعمال الصيانة">رابعاً: أعمال الصيانة والترميم</option>
                    <option value="أعمال المباني المتكامل">سابعاً: أعمال المباني (متكامل)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم البطاقة الضريبية *</label>
                  <input
                    type="text"
                    required
                    value={contractorForm.taxCardNo}
                    onChange={(e) => setContractorForm({ ...contractorForm, taxCardNo: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم السجل التجاري</label>
                  <input
                    type="text"
                    value={contractorForm.commercialRegisterNo}
                    onChange={(e) => setContractorForm({ ...contractorForm, commercialRegisterNo: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddContractorModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow"
                >
                  قيد المقاول
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Blacklist Action */}
      {showBlacklistModal && selectedVendorForAction && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-rose-200">
            <h3 className="text-base font-bold text-rose-700 flex items-center gap-2 border-b pb-3">
              <ShieldAlert className="w-5 h-5" />
              <span>إدراج الشركة بسجل الشطب والممنوعين</span>
            </h3>

            <p className="text-xs text-slate-600">
              سيتم حظر التعامل مع شركة: <span className="font-bold text-slate-900">({selectedVendorForAction.CompanyName})</span> ومنعها من سحب الكراسات أو تقديم العطاءات.
            </p>

            <form onSubmit={handleBlacklist} className="space-y-3 text-right">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">أسباب الشطب والحرمان *</label>
                <textarea
                  required
                  rows="3"
                  value={blacklistForm.blacklistReason}
                  onChange={(e) => setBlacklistForm({ ...blacklistForm, blacklistReason: e.target.value })}
                  placeholder="مثال: الإخلال بشروط التعاقد والتأخر في التوريد..."
                  className="w-full px-3 py-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-rose-500"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">جهة إصدار قرار الشطب</label>
                <input
                  type="text"
                  required
                  value={blacklistForm.blacklistAuthority}
                  onChange={(e) => setBlacklistForm({ ...blacklistForm, blacklistAuthority: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowBlacklistModal(false)}
                  className="px-4 py-2 text-slate-600 rounded-xl text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow"
                >
                  تأكيد الشطب ⛔
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Unblacklist Action */}
      {showUnblacklistModal && selectedVendorForAction && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-emerald-200">
            <h3 className="text-base font-bold text-emerald-700 flex items-center gap-2 border-b pb-3">
              <ShieldCheck className="w-5 h-5" />
              <span>إلغاء الشطب وإعادة قيد الشركة</span>
            </h3>

            <form onSubmit={handleUnblacklist} className="space-y-3 text-right">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">سبب إلغاء الشطب ومسوغات إعادة القيد *</label>
                <textarea
                  required
                  rows="3"
                  value={unblacklistForm.unblacklistedReason}
                  onChange={(e) => setUnblacklistForm({ ...unblacklistForm, unblacklistedReason: e.target.value })}
                  placeholder="مثال: انتهاء فترة الحرمان وتسوية كافة الالتزامات..."
                  className="w-full px-3 py-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">جهة اعتماد رفع الحظر</label>
                <input
                  type="text"
                  required
                  value={unblacklistForm.unblacklistedAuthority}
                  onChange={(e) => setUnblacklistForm({ ...unblacklistForm, unblacklistedAuthority: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowUnblacklistModal(false)}
                  className="px-4 py-2 text-slate-600 rounded-xl text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow"
                >
                  تأكيد إعادة القيد 🟢
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Contractor Group */}
      {showAddGroupModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-amber-200">
            <h3 className="text-base font-bold text-amber-800 border-b pb-3 flex items-center gap-2">
              <HardHat className="w-5 h-5" />
              إضافة مجموعة مقاولين جديدة
            </h3>
            <form onSubmit={handleAddGroup} className="space-y-3 text-right">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم المجموعة *</label>
                <input
                  type="text"
                  required
                  value={groupForm.groupName}
                  onChange={(e) => setGroupForm({ ...groupForm, groupName: e.target.value })}
                  placeholder="مثال: أعمال التشييد والمباني"
                  className="w-full px-3 py-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">وصف المجموعة</label>
                <textarea
                  rows="2"
                  value={groupForm.groupDescription}
                  onChange={(e) => setGroupForm({ ...groupForm, groupDescription: e.target.value })}
                  placeholder="وصف مختصر لنوع أعمال هذه المجموعة"
                  className="w-full px-3 py-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">نطاق العمل (WorkScope)</label>
                <input
                  type="text"
                  value={groupForm.workScope}
                  onChange={(e) => setGroupForm({ ...groupForm, workScope: e.target.value })}
                  placeholder="مثال: إنشاءات — كهربائيات — سباكة..."
                  className="w-full px-3 py-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddGroupModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow"
                >
                  إضافة المجموعة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Member to Group */}
      {showAddMemberModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-amber-200">
            <h3 className="text-base font-bold text-amber-800 border-b pb-3 flex items-center gap-2">
              <PlusCircle className="w-5 h-5" />
              إضافة مقاول للمجموعة #{showAddMemberModal}
            </h3>
            <form onSubmit={(e) => handleAddMember(e, showAddMemberModal)} className="space-y-3 text-right">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اختيار المقاول من السجل *</label>
                <select
                  required
                  value={memberForm.vendorId}
                  onChange={(e) => setMemberForm({ ...memberForm, vendorId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-400"
                >
                  <option value="">-- اختر مقاول مسجل --</option>
                  {vendorsList
                    .filter(v => v.ConstructionGrade && v.ConstructionGrade !== 'غير مجدول' && !v.IsBlacklisted)
                    .map(v => (
                      <option key={v.VendorId} value={v.VendorId}>
                        {v.CompanyName} — الفئة {v.ConstructionGrade}
                      </option>
                    ))
                  }
                </select>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isFedMember"
                  checked={memberForm.isFederationMember}
                  onChange={(e) => setMemberForm({ ...memberForm, isFederationMember: e.target.checked })}
                  className="w-4 h-4 accent-amber-600"
                />
                <label htmlFor="isFedMember" className="text-xs font-bold text-slate-700">
                  عضو في الاتحاد المصري للمقاولين
                </label>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الشهادات والمستندات</label>
                <input
                  type="text"
                  value={memberForm.certificates}
                  onChange={(e) => setMemberForm({ ...memberForm, certificates: e.target.value })}
                  placeholder="مثال: ISO 9001، شهادة التصنيف، كشف حساب..."
                  className="w-full px-3 py-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات</label>
                <textarea
                  rows="2"
                  value={memberForm.notes}
                  onChange={(e) => setMemberForm({ ...memberForm, notes: e.target.value })}
                  placeholder="أي ملاحظات إضافية..."
                  className="w-full px-3 py-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow"
                >
                  إضافة المقاول للمجموعة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
