import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { 
  Archive as ArchiveIcon, 
  RotateCcw, 
  Search, 
  Filter, 
  Calendar, 
  User, 
  FileText, 
  AlertCircle,
  Building,
  CheckCircle2,
  Trash2
} from 'lucide-react';

export default function Archive() {
  const { hasPermission } = useAuth();
  const [archivedList, setArchivedList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchArchive();
  }, []);

  const fetchArchive = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/archive');
      setArchivedList(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (archiveId, entityName) => {
    if (!window.confirm(`هل أنت متأكد من رغبتك في استرجاع (${entityName}) من الأرشيف وإعادته للنظام؟`)) {
      return;
    }

    try {
      const res = await axios.post('/api/archive/restore', { archiveId });
      alert(res.data.message);
      fetchArchive();
    } catch (err) {
      alert('خطأ أثناء الاسترجاع: ' + (err.response?.data?.error || err.message));
    }
  };

  const filteredItems = archivedList.filter(item => {
    const matchesSearch = item.EntityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.DeletedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (item.DeletionReason && item.DeletionReason.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (selectedType !== 'ALL' && item.EntityType !== selectedType) {
      return false;
    }
    return matchesSearch;
  });

  const getEntityBadge = (type) => {
    switch (type) {
      case 'NeedsRequest':
        return <span className="bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5 rounded text-[11px] font-bold">طلب احتياج</span>;
      case 'Tender':
        return <span className="bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded text-[11px] font-bold">عملية مطروحة</span>;
      case 'Vendor':
        return <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded text-[11px] font-bold">مورد / مقاول</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-bold">{type}</span>;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ArchiveIcon className="w-6 h-6 text-sky-600" />
            <span>سجل الأرشيف والمحذوفات (Soft Delete Repository)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            مستودع آمن لتوثيق كافة العناصر المحذوفة من النظام (من قام بالحذف، التوقيت، السبب) مع إمكانية الاسترجاع الفوري.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-sky-50 text-sky-800 border border-sky-200 px-3.5 py-1.5 rounded-xl text-xs font-bold">
          <span>إجمالي المؤرشف:</span>
          <span className="font-mono text-sm">{archivedList.length} عنصر</span>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Type Selector */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-700">نوع العنصر:</span>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-1.5 border rounded-xl text-xs font-semibold focus:ring-2 focus:ring-sky-500 outline-none"
          >
            <option value="ALL">جميع المحذوفات</option>
            <option value="NeedsRequest">طلبات الاحتياج</option>
            <option value="Tender">العمليات المطروحة</option>
            <option value="Vendor">الموردين والمقاولين</option>
          </select>
        </div>

        {/* Search Box */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث بالاسم، الحاذف، أو سبب الحذف..."
            className="w-full pr-9 pl-3 py-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

      </div>

      {/* Table Content */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">النوع</th>
                <th className="p-3">اسم وبيان العنصر المحذوف</th>
                <th className="p-3">القائم بالحذف</th>
                <th className="p-3">تاريخ ووقت الحذف</th>
                <th className="p-3">سبب الحذف</th>
                <th className="p-3">الحالة الحالية</th>
                <th className="p-3 text-center">الإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-slate-400">
                    جاري تحميل سجل الأرشيف...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <ArchiveIcon className="w-8 h-8 text-slate-300" />
                      <span>لا توجد عناصر مؤرشفة تطابق معايير البحث.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.ArchiveId} className={`hover:bg-slate-50/80 transition-colors ${item.IsRestored ? 'bg-slate-50/50 opacity-75' : ''}`}>
                    <td className="p-3 font-mono font-bold text-slate-400">#{item.ArchiveId}</td>
                    <td className="p-3">{getEntityBadge(item.EntityType)}</td>
                    <td className="p-3 font-bold text-slate-800 max-w-xs">{item.EntityName}</td>
                    <td className="p-3">
                      <span className="flex items-center gap-1 font-semibold text-slate-700">
                        <User className="w-3.5 h-3.5 text-sky-600" />
                        <span>{item.DeletedBy}</span>
                      </span>
                    </td>
                    <td className="p-3 font-mono text-slate-500">
                      {new Date(item.DeletedAt).toLocaleString('ar-EG')}
                    </td>
                    <td className="p-3 text-slate-600 max-w-xs">{item.DeletionReason || 'غير محدد'}</td>
                    <td className="p-3">
                      {item.IsRestored ? (
                        <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 w-fit">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>تم الاسترجاع بواسطة ({item.RestoredBy})</span>
                        </span>
                      ) : (
                        <span className="bg-rose-100 text-rose-800 border border-rose-200 px-2 py-0.5 rounded text-[11px] font-bold w-fit">
                          مؤرشف ومحذوف
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {!item.IsRestored ? (
                        <button
                          onClick={() => handleRestore(item.ArchiveId, item.EntityName)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm inline-flex items-center gap-1 transition-transform active:scale-95"
                          title="استرجاع العنصر للنظام"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>استرجاع ↺</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-semibold">مسترجع</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
