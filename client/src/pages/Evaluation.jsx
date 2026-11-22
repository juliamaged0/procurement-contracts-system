import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  CheckCircle2, 
  Award, 
  FileText, 
  TrendingDown, 
  Printer, 
  HelpCircle,
  AlertTriangle
} from 'lucide-react';

export default function Evaluation() {
  const [tenders, setTenders] = useState([]);
  const [selectedTenderId, setSelectedTenderId] = useState('');
  const [submissions, setSubmissions] = useState([]);
  const [committeeRecommendation, setCommitteeRecommendation] = useState('');
  const [winnerSubmissionId, setWinnerSubmissionId] = useState('');

  useEffect(() => {
    fetchTenders();
  }, []);

  useEffect(() => {
    if (selectedTenderId) {
      fetchSubmissions(selectedTenderId);
    }
  }, [selectedTenderId]);

  const fetchTenders = async () => {
    try {
      const res = await axios.get('/api/tenders');
      const list = res.data || [];
      setTenders(list);
      if (list.length > 0) setSelectedTenderId(list[0].TenderId);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSubmissions = async (tenderId) => {
    try {
      const res = await axios.get(`/api/tenders/${tenderId}/submissions`);
      const subs = res.data || [];
      
      // Auto-sort submissions by financial amount ascending
      subs.sort((a, b) => a.FinancialTotalAmount - b.FinancialTotalAmount);
      setSubmissions(subs);
      
      if (subs.length > 0) {
        setWinnerSubmissionId(subs[0].SubmissionId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const selectedTender = tenders.find(t => t.TenderId == selectedTenderId);

  const handleStatusChange = (submissionId, newStatus) => {
    const updated = submissions.map(s => {
      if (s.SubmissionId === submissionId) {
        return { ...s, TechnicalStatus: newStatus };
      }
      return s;
    });
    setSubmissions(updated);
  };

  const handleSaveEvaluation = async () => {
    if (!selectedTenderId) return;

    try {
      const evaluations = submissions.map(s => ({
        submissionId: s.SubmissionId,
        technicalStatus: s.TechnicalStatus,
        technicalScore: s.TechnicalScore || 100
      }));

      await axios.post(`/api/tenders/${selectedTenderId}/evaluate`, {
        evaluations,
        winnerSubmissionId
      });

      alert('تم اعتماد قرار لجنة البت وحفظ التقييم الفني والمالي بنجاح 🎯');
      fetchTenders();
    } catch (err) {
      alert('خطأ أثناء حفظ البت: ' + (err.response?.data?.error || err.message));
    }
  };

  const acceptedSubmissions = submissions.filter(s => s.TechnicalStatus?.startsWith('مقبول'));

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-sky-600" />
            <span>ثالثاً: شاشة البت الفني والمالي واعتماد لجنة التقييم</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            تقييم العطاءات المقدمة فنياً ومالياً، ترتيب العروض، وكتابة توصية اللجنة النهائية.
          </p>
        </div>
      </div>

      {/* Select Tender Selector */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <label className="text-sm font-bold text-slate-700 shrink-0">استعلام برقم العملية المنتهية من التفريغ:</label>
          <select
            value={selectedTenderId}
            onChange={(e) => setSelectedTenderId(e.target.value)}
            className="px-3.5 py-2 border rounded-xl text-sm font-bold text-sky-800 bg-sky-50 focus:ring-2 focus:ring-sky-500 outline-none w-full md:w-96"
          >
            {tenders.map((t) => (
              <option key={t.TenderId} value={t.TenderId}>
                [{t.TenderNumber}] {t.OperationName} ({t.TenderMethod})
              </option>
            ))}
          </select>
        </div>

        {selectedTender && (
          <div className="text-xs font-semibold bg-emerald-50 text-emerald-800 px-4 py-2 rounded-xl border border-emerald-200">
            القيمة التقديرية (المقايسة التثمينية): <span className="font-bold font-mono">{selectedTender.EstimatedValue?.toLocaleString()} ج.م</span>
          </div>
        )}
      </div>

      {/* Evaluation Matrix */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            <span>جدول تقييم وترتيب العطاءات المتقدمة (تصاعدياً حسب السعر)</span>
          </h3>
          <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
            {submissions.length} عروض مقدمة
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b">
              <tr>
                <th className="p-3">الترتيب</th>
                <th className="p-3">رقم العطاء</th>
                <th className="p-3">اسم الشركة / المورد</th>
                <th className="p-3">إجمالي القيمة المالية</th>
                <th className="p-3">التقييم الفني وشروط القبول</th>
                <th className="p-3 text-center">اختيار الفائز المرشح</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {submissions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-6 text-center text-slate-400">
                    لا توجد عطاءات متقدمة لهذه العملية.
                  </td>
                </tr>
              ) : (
                submissions.map((sub, idx) => (
                  <tr key={sub.SubmissionId} className={`hover:bg-slate-50 transition-colors ${
                    winnerSubmissionId == sub.SubmissionId ? 'bg-amber-50/60 font-bold' : ''
                  }`}>
                    <td className="p-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold font-mono text-xs ${
                        idx === 0 ? 'bg-amber-400 text-amber-950 shadow-sm' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {idx + 1}
                      </span>
                    </td>
                    <td className="p-3 font-mono font-bold text-sky-700">{sub.BidFractionSerial}</td>
                    <td className="p-3 font-bold text-slate-800">{sub.CompanyName}</td>
                    <td className="p-3 font-mono font-bold text-emerald-800 text-sm">
                      {sub.FinancialTotalAmount?.toLocaleString()} ج.م
                    </td>
                    <td className="p-3">
                      <select
                        value={sub.TechnicalStatus || 'مقبول أساسي'}
                        onChange={(e) => handleStatusChange(sub.SubmissionId, e.target.value)}
                        className="px-3 py-1.5 border rounded-lg text-xs font-semibold focus:ring-2 focus:ring-sky-500 outline-none bg-white"
                      >
                        <optgroup label="خيارات القبول">
                          <option value="مقبول أساسي">مقبول أساسي</option>
                          <option value="مقبول مرادف 1">مقبول مرادف 1</option>
                          <option value="مقبول مرادف 2">مقبول مرادف 2</option>
                          <option value="مقبول مرادف 3">مقبول مرادف 3</option>
                        </optgroup>
                        <optgroup label="خيارات الرفض الفني">
                          <option value="مرفوض بلد منشأ">مرفوض (بلد منشأ غير مطابقة)</option>
                          <option value="مرفوض فنياً لعدم التوافق">مرفوض فنياً (عدم توافق مع الصرف)</option>
                          <option value="مرفوض فنياً لعدم إثبات الكفاءة">مرفوض فنياً (عدم إثبات كفاءة)</option>
                          <option value="مرفوض مخالف لكراسة الشروط">مرفوض (مخالف لشروط الكراسة)</option>
                        </optgroup>
                      </select>
                    </td>
                    <td className="p-3 text-center">
                      <input
                        type="radio"
                        name="winnerChoice"
                        checked={winnerSubmissionId == sub.SubmissionId}
                        onChange={() => setWinnerSubmissionId(sub.SubmissionId)}
                        className="w-4 h-4 text-sky-600 cursor-pointer"
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Committee Recommendation Text Area */}
        <div className="space-y-2 border-t pt-4">
          <label className="block text-xs font-bold text-slate-700">
            توصية لجنة البت والتوصيات الفنية والمالية الرسمية:
          </label>
          <textarea
            rows="3"
            value={committeeRecommendation}
            onChange={(e) => setCommitteeRecommendation(e.target.value)}
            placeholder="مثال: توصي اللجنة بالموافقة على الترسية على شركة (...) بصفتها صاحب العرض الأقل سعراً والمقبول فنياً وبما لا يتجاوز المقايسة التثمينية..."
            className="w-full px-3.5 py-2.5 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-sky-500"
          ></textarea>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            onClick={handleSaveEvaluation}
            className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 active:scale-[0.99] transition-all"
          >
            اعتماد محضر البت والتوصية والانتقال لشاشة الإسناد 📑
          </button>
        </div>

      </div>

    </div>
  );
}
