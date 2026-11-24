import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  CheckCircle2, 
  Award, 
  FileText, 
  TrendingDown, 
  Printer, 
  HelpCircle,
  AlertTriangle,
  FolderOpen,
  Layers,
  ChevronDown,
  ChevronUp,
  X,
  Building2,
  Lock,
  Unlock,
  Check,
  Percent,
  Calculator,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';

export default function Evaluation() {
  const [tenders, setTenders] = useState([]);
  const [selectedTenderId, setSelectedTenderId] = useState('');
  const [submissions, setSubmissions] = useState([]);
  const [tenderItems, setTenderItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // Phase Tab for Evaluation: 'technical' | 'financial_awarding'
  const [evalPhase, setEvalPhase] = useState('technical');

  // Currently inspected bid for detailed item evaluation (واحد واحد)
  const [activeBidId, setActiveBidId] = useState(null);

  // Committee final decision state
  const [committeeRecommendation, setCommitteeRecommendation] = useState('');
  const [winnerSubmissionId, setWinnerSubmissionId] = useState('');
  const [showMemoModal, setShowMemoModal] = useState(false);

  useEffect(() => {
    fetchTenders();
  }, []);

  useEffect(() => {
    if (selectedTenderId) {
      loadTenderDetails(selectedTenderId);
    }
  }, [selectedTenderId]);

  const fetchTenders = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/tenders');
      const list = res.data || [];
      setTenders(list);
      if (list.length > 0) setSelectedTenderId(list[0].TenderId);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadTenderDetails = async (tenderId) => {
    try {
      setLoading(true);
      const [sRes, iRes] = await Promise.all([
        axios.get(`/api/tenders/${tenderId}/submissions`),
        axios.get(`/api/tenders/${tenderId}/items`)
      ]);
      const subs = sRes.data || [];
      setTenderItems(iRes.data || []);

      // Auto sort by financial amount
      subs.sort((a, b) => parseFloat(a.FinancialTotalAmount || 0) - parseFloat(b.FinancialTotalAmount || 0));
      setSubmissions(subs);

      // Set default winner to first technically accepted bid
      const accepted = subs.filter(s => s.TechnicalStatus?.startsWith('مقبول'));
      if (accepted.length > 0) {
        setWinnerSubmissionId(accepted[0].SubmissionId);
        setCommitteeRecommendation(
          `توصي لجنة البت بالترسية على شركة (${accepted[0].CompanyName}) بصفتها صاحب العطاء الأقل سعراً والمقبول فنياً بنسبة استيفاء مطابقة للشروط والمواصفات بإجمالي قدره (${accepted[0].FinancialTotalAmount?.toLocaleString()} ج.م).`
        );
      } else if (subs.length > 0) {
        setWinnerSubmissionId(subs[0].SubmissionId);
      }

      if (subs.length > 0 && !activeBidId) {
        setActiveBidId(subs[0].SubmissionId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const selectedTender = tenders.find(t => t.TenderId == selectedTenderId);
  const isTwoEnvelopes = selectedTender?.SubmittalType === 'مظروفيين' || selectedTender?.SubmittalType === 'مظروفين';
  const isPointSystem = selectedTender?.TechnicalEvaluationMethod === 'نظام نقاط';
  const minPassingScore = parseFloat(selectedTender?.MinPassingScore) || 70;

  // Active inspected submission
  const activeBid = submissions.find(s => s.SubmissionId === activeBidId);

  // Change technical status of submission
  const handleStatusChange = (submissionId, newStatus) => {
    const updated = submissions.map(s => {
      if (s.SubmissionId === submissionId) {
        return { ...s, TechnicalStatus: newStatus };
      }
      return s;
    });
    setSubmissions(updated);
  };

  // Change Item-level technical compliance
  const handleItemComplianceChange = (submissionId, itemId, status) => {
    const updated = submissions.map(s => {
      if (s.SubmissionId === submissionId) {
        const updatedItems = (s.items || []).map(it => {
          if (it.BidItemId === itemId || it.TenderItemId === itemId) {
            return { ...it, TechnicalStatus: status, technicalStatus: status };
          }
          return it;
        });

        // Re-evaluate submission status if Pass/Fail
        let overallStatus = s.TechnicalStatus;
        if (!isPointSystem) {
          const hasFail = updatedItems.some(it => (it.TechnicalStatus || it.technicalStatus) === 'غير مطابق');
          overallStatus = hasFail ? 'مرفوض فنياً لعدم مطابقة المواصفات' : 'مقبول أساسي';
        }

        return { ...s, items: updatedItems, TechnicalStatus: overallStatus };
      }
      return s;
    });
    setSubmissions(updated);
  };

  // Change Item-level Criteria Score in Point System
  const handleItemCriteriaScore = (submissionId, itemId, critIdx, scoreVal) => {
    const updated = submissions.map(s => {
      if (s.SubmissionId === submissionId) {
        const updatedItems = (s.items || []).map(it => {
          if (it.BidItemId === itemId || it.TenderItemId === itemId) {
            const critScores = [...(it.criteriaScores || [])];
            if (critScores[critIdx]) {
              const max = parseFloat(critScores[critIdx].maxScore) || 25;
              critScores[critIdx].score = Math.min(Math.max(parseFloat(scoreVal) || 0, 0), max);
            }
            const newItemScore = critScores.reduce((sum, c) => sum + (parseFloat(c.score) || 0), 0);
            return { ...it, criteriaScores: critScores, ItemScore: newItemScore, itemScore: newItemScore };
          }
          return it;
        });

        // Re-calculate overall submission score
        let totalScore = 0;
        if (updatedItems.length > 0) {
          totalScore = updatedItems.reduce((acc, it) => acc + (parseFloat(it.itemScore || it.ItemScore) || 0), 0) / updatedItems.length;
        }
        totalScore = Math.round(totalScore * 10) / 10;
        const overallStatus = totalScore >= minPassingScore ? 'مقبول أساسي' : 'مرفوض فنياً لعدم اجتياز نقاط التقييم';

        return {
          ...s,
          items: updatedItems,
          TechnicalScore: totalScore,
          TechnicalStatus: overallStatus
        };
      }
      return s;
    });
    setSubmissions(updated);
  };

  // Save all evaluation decisions to backend
  const handleSaveEvaluation = async () => {
    if (!selectedTenderId) return;

    try {
      const evaluations = submissions.map(s => ({
        submissionId: s.SubmissionId,
        technicalStatus: s.TechnicalStatus,
        technicalScore: s.TechnicalScore || 100,
        rejectionReason: s.TechnicalStatus?.includes('مرفوض') ? s.TechnicalStatus : null,
        items: s.items || []
      }));

      await axios.post(`/api/tenders/${selectedTenderId}/evaluate`, {
        evaluations,
        committeeRecommendation,
        winnerSubmissionId
      });

      alert('تم اعتماد قرار وتوصية لجنة البت الفني والمالي بنجاح 🎯');
      loadTenderDetails(selectedTenderId);
    } catch (err) {
      alert('خطأ أثناء حفظ البت: ' + (err.response?.data?.error || err.message));
    }
  };

  // Accepted bids vs Rejected
  const acceptedSubmissions = submissions.filter(s => s.TechnicalStatus?.startsWith('مقبول'));
  const rejectedSubmissions = submissions.filter(s => s.TechnicalStatus?.includes('مرفوض'));
  const winnerBid = submissions.find(s => s.SubmissionId == winnerSubmissionId);

  return (
    <div className="space-y-6" dir="rtl">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-sky-600" />
            <span>ثالثاً: شاشة البت الفني والمالي واعتماد لجنة التقييم</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            فحص وتقييم العطاءات بنداً بنداً، احتساب درجات النقاط آلياً، المفاضلة المالية للمقبولين فنياً، وإصدار المذكرة الرسمية.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMemoModal(true)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            <span>عرض وطباعة مذكرة البت والترسية</span>
          </button>
        </div>
      </div>

      {/* Tender Selection & Meta Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        {/* Row 1: Dropdown selector */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-1">
            <span className="p-2.5 rounded-xl bg-sky-100 text-sky-700 shrink-0">
              <FolderOpen className="w-4 h-4" />
            </span>
            <div className="flex-1">
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                استعلام واختيار العملية المطروحة:
              </label>
              <select
                value={selectedTenderId}
                onChange={(e) => setSelectedTenderId(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-bold text-slate-800 bg-slate-50 hover:bg-white focus:bg-white focus:ring-2 focus:ring-sky-500 outline-none transition-all cursor-pointer shadow-sm"
              >
                {tenders.map((t) => (
                  <option key={t.TenderId} value={t.TenderId}>
                    [{t.TenderNumber}] {t.OperationName || t.TenderName} — ({t.TenderMethod})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Row 2: Structured Parameter Cards */}
        {selectedTender && (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <span className="text-slate-500 font-semibold">نظام الطرح:</span>
              <span className={`px-2.5 py-0.5 rounded-lg font-bold text-[11px] ${
                isTwoEnvelopes ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
              }`}>
                {isTwoEnvelopes ? 'مظروفين (فني + مالي)' : 'مظروف واحد'}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <span className="text-slate-500 font-semibold">أسلوب التقييم:</span>
              <span className={`px-2.5 py-0.5 rounded-lg font-bold text-[11px] ${
                isPointSystem ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {isPointSystem ? `نقاط (حد أدنى ${minPassingScore}%)` : 'مطابق أو غير مطابق'}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <span className="text-slate-500 font-semibold">المقايسة التقديرية:</span>
              <span className="font-mono font-bold text-emerald-800 text-xs">
                {selectedTender.EstimatedValue?.toLocaleString()} ج.م
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <span className="text-slate-500 font-semibold">العطاءات المقدمة:</span>
              <span className="font-mono font-bold text-sky-800 text-xs">
                {submissions.length} عطاءات
              </span>
            </div>
          </div>
        )}

        {/* Phase Toggle: Technical vs Financial Awarding */}
        <div className="flex items-center gap-2 border-t pt-3">
          <button
            onClick={() => setEvalPhase('technical')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              evalPhase === 'technical'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20 ring-2 ring-sky-300'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>1. مرحلة البت الفني التفصيلي (بنداً بنداً)</span>
            <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px]">{submissions.length} عطاء</span>
          </button>

          <button
            onClick={() => setEvalPhase('financial_awarding')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              evalPhase === 'financial_awarding'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 ring-2 ring-emerald-300'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>2. المفاضلة المالية والترسية ({acceptedSubmissions.length} مقبول فنياً)</span>
          </button>
        </div>
      </div>

      {/* PHASE 1: TECHNICAL EVALUATION (بنداً بنداً للعطاءات) */}
      {evalPhase === 'technical' && (
        <div className="space-y-6">
          
          {/* Submissions Row (نختار واحد واحد) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-xs font-bold text-slate-700">
                اختر العطاء لفحص بنوده الفنية واحداً تلو الآخر:
              </span>
              <span className="text-[11px] text-slate-500">
                انقر على اسم الشركة لعرض بنودها وتقييمها أدناه 👇
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {submissions.map((sub, idx) => {
                const isSelected = activeBidId === sub.SubmissionId;
                const isAccepted = sub.TechnicalStatus?.startsWith('مقبول');
                const isRejected = sub.TechnicalStatus?.includes('مرفوض');

                return (
                  <button
                    key={sub.SubmissionId}
                    type="button"
                    onClick={() => setActiveBidId(sub.SubmissionId)}
                    className={`text-right p-3.5 rounded-2xl border-2 transition-all relative ${
                      isSelected
                        ? 'border-sky-500 bg-sky-50 shadow-md ring-4 ring-sky-100'
                        : isRejected
                        ? 'border-rose-200 bg-rose-50/40 hover:border-rose-300'
                        : isAccepted
                        ? 'border-emerald-200 bg-emerald-50/30 hover:border-emerald-300'
                        : 'border-slate-200 bg-white hover:border-sky-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono text-xs font-bold text-slate-500">
                        عطاء: {sub.BidFractionSerial || `#${idx + 1}`}
                      </span>

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isAccepted ? 'bg-emerald-100 text-emerald-800' : isRejected ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {isAccepted ? 'مقبول فنياً ✓' : isRejected ? 'مرفوض ✗' : 'قيد الفحص'}
                      </span>
                    </div>

                    <div className="font-bold text-xs text-slate-800 line-clamp-1 mb-2">
                      {sub.CompanyName}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 border-t pt-1.5">
                      <span>الدرجة الفنية:</span>
                      <span className="font-mono font-bold text-slate-700">
                        {sub.TechnicalScore ? `${sub.TechnicalScore}%` : '---'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detailed Item-by-Item Workspace for Selected Bid */}
          {activeBid && (
            <div className="bg-white rounded-2xl border-2 border-sky-400 p-6 shadow-sm space-y-5">
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b pb-4 bg-sky-50/50 -mx-6 -mt-6 p-6 rounded-t-2xl">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-sky-600 text-white rounded-xl text-xs font-bold">
                      عطاء: {activeBid.BidFractionSerial}
                    </span>
                    <h3 className="font-extrabold text-base text-slate-800">
                      تقييم مطابقة بنود شركة: {activeBid.CompanyName}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {isPointSystem 
                      ? 'نظام النقاط: أدخل درجات المعايير لكل بند، ويتم جمع النقاط واحتساب النسبة المئوية آلياً.'
                      : 'نظام المطابقة: اختر (مطابق / غير مطابق) لكل بند فني من بنود كراسة الشروط.'}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-left">
                    <div className="text-[11px] text-slate-500 font-bold">النتيجة الفنية للعطاء:</div>
                    <div className="flex items-center gap-2">
                      {isPointSystem && (
                        <span className="font-mono font-extrabold text-base text-sky-800">
                          {activeBid.TechnicalScore || 0}%
                        </span>
                      )}
                      <span className={`px-3 py-1 rounded-xl text-xs font-bold border ${
                        activeBid.TechnicalStatus?.startsWith('مقبول')
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-rose-100 text-rose-800 border-rose-300'
                      }`}>
                        {activeBid.TechnicalStatus || 'تحت التقييم'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items Evaluation Table */}
              <div className="overflow-x-auto border rounded-2xl shadow-sm">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b">
                    <tr>
                      <th className="p-3 w-12 text-center">#</th>
                      <th className="p-3">اسم البند والمواصفات الفنية بالكراسة</th>
                      <th className="p-3 w-20">الوحدة</th>
                      <th className="p-3 w-20">الكمية</th>
                      <th className="p-3 min-w-[280px]">
                        {isPointSystem ? 'معايير التقييم والدرجات الممنوحة' : 'قرار المطابقة الفنية للبند'}
                      </th>
                      <th className="p-3 w-60">ملاحظات اللجنة الفنية على البند</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(activeBid.items || []).map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70">
                        <td className="p-3 text-center font-bold font-mono text-slate-400">
                          {idx + 1}
                        </td>

                        <td className="p-3">
                          <div className="font-bold text-slate-800 text-sm">{item.ItemName}</div>
                          {item.Notes && (
                            <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                              {item.Notes}
                            </div>
                          )}
                        </td>

                        <td className="p-3 text-slate-600 font-semibold">{item.UnitType}</td>
                        <td className="p-3 font-mono font-bold text-slate-800">{item.Quantity}</td>

                        {/* Evaluation Input per Item */}
                        <td className="p-3">
                          {isPointSystem ? (
                            <div className="space-y-2 bg-slate-50 p-3 rounded-xl border">
                              <div className="flex items-center justify-between text-xs font-bold text-sky-900 border-b pb-1.5">
                                <span>مجموع درجات البند:</span>
                                <span className="font-mono text-sm text-sky-800">
                                  {item.ItemScore ?? item.itemScore ?? 100} / 100
                                </span>
                              </div>

                              {(item.criteriaScores || []).map((c, cIdx) => (
                                <div key={cIdx} className="flex items-center justify-between gap-2 text-[11px]">
                                  <span className="text-slate-600 truncate max-w-[170px]" title={c.name}>{c.name}:</span>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <input
                                      type="number"
                                      min="0"
                                      max={c.maxScore}
                                      step="0.5"
                                      value={c.score}
                                      onChange={(e) => handleItemCriteriaScore(activeBid.SubmissionId, item.BidItemId, cIdx, e.target.value)}
                                      className="w-16 px-2 py-1 border rounded-lg text-center font-mono font-bold bg-white focus:ring-2 focus:ring-sky-500"
                                    />
                                    <span className="text-slate-400 font-mono">/{c.maxScore}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <select
                                value={item.TechnicalStatus || item.technicalStatus || 'مطابق'}
                                onChange={(e) => handleItemComplianceChange(activeBid.SubmissionId, item.BidItemId, e.target.value)}
                                className={`w-full px-3 py-2 border rounded-xl font-bold text-xs outline-none ${
                                  (item.TechnicalStatus || item.technicalStatus) === 'مطابق'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                    : 'bg-rose-50 text-rose-800 border-rose-300'
                                }`}
                              >
                                <option value="مطابق">✓ مطابق تماماً للمواصفات الفنية</option>
                                <option value="غير مطابق">✗ غير مطابق للمواصفات الفنية (استبعاد)</option>
                                <option value="مطابق مع تحفظات">⚠️ مطابق مع تحفظات فنية غير جوهرية</option>
                              </select>
                            </div>
                          )}
                        </td>

                        <td className="p-3">
                          <textarea
                            rows="2"
                            value={item.Notes || ''}
                            onChange={(e) => {
                              const newSubs = [...submissions];
                              const sub = newSubs.find(s => s.SubmissionId === activeBid.SubmissionId);
                              const itm = sub.items.find(i => i.BidItemId === item.BidItemId);
                              if (itm) itm.Notes = e.target.value;
                              setSubmissions(newSubs);
                            }}
                            placeholder="تدوين ملاحظات أو أسباب عدم المطابقة..."
                            className="w-full px-2.5 py-1.5 border rounded-xl text-xs outline-none focus:ring-1 focus:ring-sky-500"
                          ></textarea>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Overall Decision Selector for This Bid */}
              <div className="p-4 bg-slate-50 border rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <label className="text-xs font-bold text-slate-700">قرار اللجنة الفنية النهائي لهذا العطاء:</label>
                  <select
                    value={activeBid.TechnicalStatus || 'مقبول أساسي'}
                    onChange={(e) => handleStatusChange(activeBid.SubmissionId, e.target.value)}
                    className="px-3 py-2 border rounded-xl text-xs font-bold bg-white focus:ring-2 focus:ring-sky-500 outline-none"
                  >
                    <optgroup label="خيارات القبول الفني">
                      <option value="مقبول أساسي">مقبول أساسي (مطابق لكافة الشروط)</option>
                      <option value="مقبول مرادف 1">مقبول مرادف 1</option>
                      <option value="مقبول مرادف 2">مقبول مرادف 2</option>
                    </optgroup>
                    <optgroup label="خيارات الاستبعاد والرفض الفني">
                      <option value="مرفوض فنياً لعدم مطابقة المواصفات">مرفوض فنياً (عدم مطابقة المواصفات)</option>
                      <option value="مرفوض فنياً لعدم اجتياز نقاط التقييم">مرفوض فنياً (دون نسبة النجاح)</option>
                      <option value="مرفوض لمخالفة كراسة الشروط">مرفوض (مخالف لكراسة الشروط)</option>
                    </optgroup>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleSaveEvaluation}
                  className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs shadow-md shadow-sky-600/20"
                >
                  حفظ التقييم الفني لهذا العطاء 💾
                </button>
              </div>

            </div>
          )}

        </div>
      )}

      {/* PHASE 2: FINANCIAL EVALUATION & AWARDING (المفاضلة المالية والترسية) */}
      {evalPhase === 'financial_awarding' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" />
                <span>جدول ترتيب العطاءات المقبولة فنياً ومقارنة الأسعار</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                طبقاً للمادة 38 من القانون 182، تتم الترسية على العطاء الأفضل شروطاً والأقل سعراً بين العطاءات المقبولة فنياً.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-3 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
                {acceptedSubmissions.length} عطاءات مقبولة فنياً
              </span>
              <span className="text-xs font-bold px-3 py-1 rounded-xl bg-rose-50 text-rose-800 border border-rose-200">
                {rejectedSubmissions.length} عطاءات مستبعدة
              </span>
            </div>
          </div>

          {/* Comparative Table */}
          <div className="overflow-x-auto border rounded-2xl shadow-sm">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b">
                <tr>
                  <th className="p-3 w-16 text-center">الترتيب</th>
                  <th className="p-3 w-28">رقم العطاء</th>
                  <th className="p-3">اسم الشركة / المورد</th>
                  <th className="p-3">الوضع الفني ودرجة التقييم</th>
                  <th className="p-3">إجمالي العطاء المالي</th>
                  <th className="p-3">نسبة الانحراف عن المقايسة</th>
                  <th className="p-3 text-center w-28">اختيار الفائز</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {submissions.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-slate-400">
                      لا توجد عطاءات مقدمة لهذه العملية.
                    </td>
                  </tr>
                ) : (
                  submissions.map((sub, idx) => {
                    const isAccepted = sub.TechnicalStatus?.startsWith('مقبول');
                    const isWinner = winnerSubmissionId == sub.SubmissionId;
                    const estVal = parseFloat(selectedTender?.EstimatedValue || 0);
                    const diffPercent = estVal > 0 
                      ? Math.round(((parseFloat(sub.FinancialTotalAmount || 0) - estVal) / estVal) * 100 * 10) / 10
                      : 0;

                    return (
                      <tr 
                        key={sub.SubmissionId} 
                        className={`transition-colors ${
                          !isAccepted 
                            ? 'bg-rose-50/20 opacity-60' 
                            : isWinner 
                            ? 'bg-amber-50/80 font-bold' 
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="p-3 text-center">
                          {isAccepted ? (
                            <span className={`w-7 h-7 rounded-full flex items-center justify-center font-bold font-mono text-xs mx-auto ${
                              idx === 0 
                                ? 'bg-amber-400 text-amber-950 shadow' 
                                : 'bg-slate-200 text-slate-700'
                            }`}>
                              {idx + 1}
                            </span>
                          ) : (
                            <span className="text-rose-500 font-bold">مستبعد</span>
                          )}
                        </td>

                        <td className="p-3 font-mono font-bold text-sky-700">{sub.BidFractionSerial}</td>
                        <td className="p-3 font-bold text-slate-800">{sub.CompanyName}</td>

                        <td className="p-3">
                          <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                            isAccepted ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {sub.TechnicalStatus} {sub.TechnicalScore ? `(${sub.TechnicalScore}%)` : ''}
                          </span>
                        </td>

                        <td className="p-3 font-mono font-bold text-emerald-800 text-sm">
                          {sub.FinancialTotalAmount?.toLocaleString()} ج.م
                        </td>

                        <td className="p-3 font-mono text-xs font-semibold">
                          {diffPercent > 0 ? (
                            <span className="text-rose-600">+{diffPercent}% (أعلى من المقايسة)</span>
                          ) : diffPercent < 0 ? (
                            <span className="text-emerald-600">{diffPercent}% (وفـر مالي)</span>
                          ) : (
                            <span className="text-slate-500">مطابق للمقايسة</span>
                          )}
                        </td>

                        <td className="p-3 text-center">
                          <input
                            type="radio"
                            name="winnerRadio"
                            disabled={!isAccepted}
                            checked={winnerSubmissionId == sub.SubmissionId}
                            onChange={() => {
                              setWinnerSubmissionId(sub.SubmissionId);
                              setCommitteeRecommendation(
                                `توصي لجنة البت بالترسية على شركة (${sub.CompanyName}) بصفتها صاحب العطاء الأقل سعراً والمقبول فنياً بإجمالي قدره (${sub.FinancialTotalAmount?.toLocaleString()} ج.م).`
                              );
                            }}
                            className="w-4 h-4 text-emerald-600 cursor-pointer disabled:cursor-not-allowed"
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Committee Official Recommendation Box */}
          <div className="space-y-2 border-t pt-4">
            <label className="block text-xs font-bold text-slate-700">
              توصية وقرار لجنة البت المالي والفني النهائي (المذكرة المسببة):
            </label>
            <textarea
              rows="3"
              value={committeeRecommendation}
              onChange={(e) => setCommitteeRecommendation(e.target.value)}
              placeholder="مثال: توصي اللجنة بالترسية على شركة (...) بصفتها صاحبة العرض الأقل سعراً والمقبول فنياً..."
              className="w-full px-3.5 py-2.5 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
            ></textarea>
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <button
              onClick={handleSaveEvaluation}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" />
              <span>اعتماد قرار البت والتوصية والانتقال لشاشة الإسناد 📑</span>
            </button>
          </div>

        </div>
      )}

      {/* Official Committee Memorandum Modal (مذكرة البت والترسية الرسمية) */}
      {showMemoModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto" dir="rtl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Printer className="w-5 h-5 text-emerald-600" />
                <span>مذكرة لجنة البت الفني والمالي وتوصية الترسية (قانون 182 لسنة 2018)</span>
              </h3>
              <button onClick={() => setShowMemoModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Document Sheet */}
            <div className="border border-slate-300 rounded-xl p-8 bg-white space-y-6 text-slate-800 text-xs leading-relaxed font-sans shadow-sm print:border-none print:shadow-none">
              
              {/* Official Letterhead */}
              <div className="flex items-center justify-between border-b-2 border-slate-800 pb-4">
                <div className="space-y-1">
                  <div className="font-extrabold text-sm">وزارة الإسكان والمرافق والمجتمعات العمرانية</div>
                  <div className="font-bold text-xs">الشركة القابضة لمياه الشرب والصرف الصحي</div>
                  <div className="font-bold text-xs text-sky-900">شركة الصرف الصحي بالإسكندرية (ش.م.ت.م)</div>
                  <div className="text-[11px] text-slate-600">الإدارة العامة للعقود والمشتريات - لجنة البت</div>
                </div>
                <div className="text-left space-y-1">
                  <div className="font-bold">رقم العملية: <span className="font-mono">{selectedTender?.TenderNumber}</span></div>
                  <div>السنة المالية: <span className="font-mono">{selectedTender?.FiscalYear || '2025/2026'}</span></div>
                  <div>المقايسة التقديرية: <span className="font-mono font-bold">{selectedTender?.EstimatedValue?.toLocaleString()} ج.م</span></div>
                </div>
              </div>

              {/* Title */}
              <div className="text-center space-y-1 my-4">
                <h2 className="text-base font-extrabold underline decoration-2 underline-offset-4">
                  مذكرة لجنة البت الفني والمالي وقرار الترسية
                </h2>
                <p className="text-xs text-slate-600">
                  بشأن العملية: <span className="font-bold">{selectedTender?.OperationName || selectedTender?.TenderName}</span>
                </p>
              </div>

              {/* Legal Narrative */}
              <p>
                بناءً على أحكام القانون رقم 182 لسنة 2018 بشأن تنظيم التعاقدات التي تبرمها الجهات العامة ولائحته التنفيذية، اجتمعت لجنة البت الفني والمالي المشكلة بالقرار رقم (...)، للنظر في نتائج التفريغ الفني والمالي للعطاءات المقدمة لعملية ({selectedTender?.OperationName}) بطريقة ({selectedTender?.TenderMethod}).
              </p>

              {/* Comparison Matrix */}
              <table className="w-full text-right border-collapse border border-slate-300 text-[11px]">
                <thead className="bg-slate-100 font-bold">
                  <tr>
                    <th className="border border-slate-300 p-2 text-center">الترتيب</th>
                    <th className="border border-slate-300 p-2">اسم الشركة المتقدمة</th>
                    <th className="border border-slate-300 p-2">التقييم الفني والمطابقة</th>
                    <th className="border border-slate-300 p-2">القيمة المالية الإجمالية</th>
                    <th className="border border-slate-300 p-2">موقف اللجنة</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((sub, i) => {
                    const isAccepted = sub.TechnicalStatus?.startsWith('مقبول');
                    const isWin = winnerSubmissionId == sub.SubmissionId;
                    return (
                      <tr key={i} className={isWin ? 'bg-emerald-50 font-bold' : ''}>
                        <td className="border border-slate-300 p-2 text-center font-mono">{i + 1}</td>
                        <td className="border border-slate-300 p-2 font-bold">{sub.CompanyName}</td>
                        <td className="border border-slate-300 p-2">{sub.TechnicalStatus} {sub.TechnicalScore ? `(${sub.TechnicalScore}%)` : ''}</td>
                        <td className="border border-slate-300 p-2 font-mono font-bold text-emerald-900">
                          {sub.FinancialTotalAmount?.toLocaleString()} ج.م
                        </td>
                        <td className="border border-slate-300 p-2">
                          {isWin ? 'العطاء الفائز المرشح للترسية' : isAccepted ? 'مقبول فنياً' : 'مستبعد فنياً'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Recommendation */}
              <div className="bg-slate-50 border p-4 rounded-xl space-y-2">
                <div className="font-extrabold text-xs text-slate-800">قرار وتوصية اللجنة:</div>
                <p className="text-xs text-slate-700 leading-relaxed font-semibold">
                  {committeeRecommendation || 'توصي اللجنة بالترسية على العطاء الأفضل شروطاً والأقل سعراً والمقبول فنياً.'}
                </p>
              </div>

              {/* Signatures of Committee */}
              <div className="pt-8 grid grid-cols-4 gap-4 text-center text-xs font-bold border-t mt-8">
                <div>
                  <div>عضو اللجنة الفني</div>
                  <div className="text-[10px] text-slate-400 mt-1">مهندس استشاري / مختص</div>
                  <div className="mt-8">........................</div>
                </div>
                <div>
                  <div>عضو اللجنة المالي</div>
                  <div className="text-[10px] text-slate-400 mt-1">مدير الإدارة المالية</div>
                  <div className="mt-8">........................</div>
                </div>
                <div>
                  <div>عضو اللجنة القانوني</div>
                  <div className="text-[10px] text-slate-400 mt-1">ممثل الإدارة القانونية</div>
                  <div className="mt-8">........................</div>
                </div>
                <div>
                  <div>رئيس لجنة البت</div>
                  <div className="text-[10px] text-slate-400 mt-1">رئيس قطاع المشروعات</div>
                  <div className="mt-8">........................</div>
                </div>
              </div>

            </div>

            <div className="flex justify-end gap-3 pt-3 border-t">
              <button
                onClick={() => window.print()}
                className="px-6 py-2.5 bg-slate-900 text-white font-bold rounded-xl text-xs flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة المذكرة الرسمية</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
