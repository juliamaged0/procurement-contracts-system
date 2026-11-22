import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Landmark,
  ArrowRightLeft,
  ShieldCheck,
  Users,
  CheckCircle2,
  XCircle,
  Trophy,
  RefreshCw,
  Search,
  Eye,
  FileText,
  Calculator,
  Banknote,
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Printer,
  Hash,
  Calendar,
  User
} from 'lucide-react';

// Number → Arabic Tafqeet (simple)
function formatMoney(n) {
  if (!n && n !== 0) return '—';
  return Number(n).toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ج.م';
}

export default function AccountingGuarantees() {
  // Top-level state
  const [awardedTenders, setAwardedTenders] = useState([]);
  const [selectedTenderId, setSelectedTenderId] = useState('');
  const [tenderBidData, setTenderBidData] = useState(null); // { bids, winnerVendorId, guaranteeTransactions }
  const [allTransactions, setAllTransactions] = useState([]);
  const [accountingEntries, setAccountingEntries] = useState([]);

  // Action mode
  const [mode, setMode] = useState('overview'); // 'overview' | 'refund-losers' | 'convert-winner' | 'journal'

  // Refund losers form
  const [selectedLosers, setSelectedLosers] = useState([]);
  const [stampPercent, setStampPercent] = useState(0.5);
  const [adminPercent, setAdminPercent] = useState(0);

  // Processing
  const [processing, setProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSection, setExpandedSection] = useState('bids'); // 'bids' | 'journal' | 'history'

  useEffect(() => {
    fetchAwardedTenders();
  }, []);

  useEffect(() => {
    if (selectedTenderId) {
      fetchBidData(selectedTenderId);
      fetchTransactions(selectedTenderId);
      fetchAccounting(selectedTenderId);
    }
  }, [selectedTenderId]);

  const fetchAwardedTenders = async () => {
    try {
      const res = await axios.get('/api/guarantees/awarded-tenders');
      setAwardedTenders(res.data || []);
    } catch (err) { console.error(err); }
  };

  const fetchBidData = async (tid) => {
    try {
      const res = await axios.get(`/api/guarantees/tender/${tid}/bids`);
      setTenderBidData(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchTransactions = async (tid) => {
    try {
      const res = await axios.get('/api/guarantees/transactions', { params: { tenderId: tid } });
      setAllTransactions(res.data || []);
    } catch (err) { console.error(err); }
  };

  const fetchAccounting = async (tid) => {
    try {
      const res = await axios.get(`/api/guarantees/accounting/${tid}`);
      setAccountingEntries(res.data || []);
    } catch (err) { console.error(err); }
  };

  // ── Refund Losers Handler ──
  const handleRefundLosers = async () => {
    if (!selectedLosers.length) return alert('يرجى تحديد الموردين المرفوضين أولاً');
    setProcessing(true);
    try {
      const res = await axios.post('/api/guarantees/refund-losers', {
        tenderId: selectedTenderId,
        loserVendorIds: selectedLosers,
        processedBy: 'مسؤول التأمينات',
        stampDeductionPercent: stampPercent,
        adminFeePercent: adminPercent
      });
      alert(res.data.message);
      setSelectedLosers([]);
      setMode('overview');
      fetchBidData(selectedTenderId);
      fetchTransactions(selectedTenderId);
      fetchAccounting(selectedTenderId);
    } catch (err) {
      alert('خطأ: ' + (err.response?.data?.error || err.message));
    } finally { setProcessing(false); }
  };

  // ── Convert Winner Handler ──
  const handleConvertWinner = async () => {
    if (!tenderBidData?.winnerVendorId) return alert('لا يوجد فائز محدد لهذه العملية');
    const tender = awardedTenders.find(t => t.TenderId == selectedTenderId);
    setProcessing(true);
    try {
      const res = await axios.post('/api/guarantees/convert-winner', {
        tenderId: selectedTenderId,
        winnerVendorId: tenderBidData.winnerVendorId,
        processedBy: 'مسؤول التأمينات',
        awardedAmount: tender?.AwardedAmount || 0
      });
      alert(res.data.message +
        (res.data.difference > 0 ? `\n⚠️ فرق تأمين واجب السداد: ${formatMoney(res.data.difference)}` : ''));
      setMode('overview');
      fetchBidData(selectedTenderId);
      fetchTransactions(selectedTenderId);
      fetchAccounting(selectedTenderId);
    } catch (err) {
      alert('خطأ: ' + (err.response?.data?.error || err.message));
    } finally { setProcessing(false); }
  };

  // ── Derived Data ──
  const selectedTender = awardedTenders.find(t => t.TenderId == selectedTenderId);
  const bids = tenderBidData?.bids || [];
  const winnerVendorId = tenderBidData?.winnerVendorId;
  const existingGuarantees = tenderBidData?.guaranteeTransactions || [];

  const losersAvailable = bids.filter(b =>
    b.VendorId !== winnerVendorId &&
    b.InitialInsuranceAmount > 0 &&
    !['تم رد التأمين', 'محوَّل لتأمين نهائي'].includes(b.InitialInsuranceStatus)
  );

  const winnerBid = bids.find(b => b.VendorId === winnerVendorId);
  const winnerAlreadyConverted = existingGuarantees.some(g =>
    g.VendorId === winnerVendorId && g.TransactionType === 'تحويل تأمين ابتدائي لنهائي'
  );

  const totalRefunded = allTransactions
    .filter(t => t.TransactionType?.includes('رد تأمين'))
    .reduce((s, t) => s + (t.NetRefundAmount || t.OriginalAmount || 0), 0);

  const toggleLoser = (vid) => {
    setSelectedLosers(prev =>
      prev.includes(vid) ? prev.filter(v => v !== vid) : [...prev, vid]
    );
  };

  return (
    <div className="space-y-6" dir="rtl">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Landmark className="w-6 h-6 text-sky-600" />
            <span>القيود المحاسبية والتأمينات</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            إدارة التأمينات الابتدائية والنهائية — رد التأمين للمرفوضين — تحويل التأمين للفائز — القيود المحاسبية التلقائية.
          </p>
        </div>
      </div>

      {/* ── Tender Selector ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <label className="block text-xs font-bold text-slate-700 mb-1">اختيار العملية التي تم ترسيتها</label>
        <select
          value={selectedTenderId}
          onChange={(e) => { setSelectedTenderId(e.target.value); setMode('overview'); setSelectedLosers([]); }}
          className="w-full px-4 py-3 border rounded-xl text-sm font-semibold focus:ring-2 focus:ring-sky-500 outline-none bg-slate-50"
        >
          <option value="">-- اختر العملية --</option>
          {awardedTenders.map(t => (
            <option key={t.TenderId} value={t.TenderId}>
              [{t.TenderNumber}] {t.TenderName} — الفائز: {t.WinnerCompanyName || '—'} — مبلغ الترسية: {formatMoney(t.AwardedAmount)}
            </option>
          ))}
        </select>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TENDER SELECTED — OVERVIEW
      ══════════════════════════════════════════════════════════════════════ */}
      {selectedTenderId && selectedTender && tenderBidData && (
        <>
          {/* ── Summary Cards ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Winner */}
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl border border-emerald-200 p-4">
              <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold mb-2">
                <Trophy className="w-4 h-4" /> الفائز
              </div>
              <div className="font-bold text-slate-800 text-sm truncate">{selectedTender.WinnerCompanyName || '—'}</div>
              <div className="text-xs text-emerald-600 font-mono mt-1">{formatMoney(selectedTender.AwardedAmount)}</div>
            </div>
            {/* Bids Count */}
            <div className="bg-gradient-to-br from-sky-50 to-sky-100 rounded-2xl border border-sky-200 p-4">
              <div className="flex items-center gap-2 text-sky-700 text-xs font-bold mb-2">
                <Users className="w-4 h-4" /> عدد العطاءات
              </div>
              <div className="font-extrabold text-slate-800 text-2xl">{bids.length}</div>
              <div className="text-xs text-sky-600 mt-1">{losersAvailable.length} في انتظار رد التأمين</div>
            </div>
            {/* Total Refunded */}
            <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl border border-amber-200 p-4">
              <div className="flex items-center gap-2 text-amber-700 text-xs font-bold mb-2">
                <Banknote className="w-4 h-4" /> إجمالي المردود
              </div>
              <div className="font-bold text-slate-800 text-sm font-mono">{formatMoney(totalRefunded)}</div>
              <div className="text-xs text-amber-600 mt-1">{allTransactions.filter(t => t.TransactionType?.includes('رد')).length} عملية</div>
            </div>
            {/* Final Guarantee */}
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-2xl border border-indigo-200 p-4">
              <div className="flex items-center gap-2 text-indigo-700 text-xs font-bold mb-2">
                <ShieldCheck className="w-4 h-4" /> التأمين النهائي
              </div>
              <div className="font-bold text-slate-800 text-sm font-mono">{formatMoney(selectedTender.FinalGuaranteeAmount)}</div>
              <div className="text-xs text-indigo-600 mt-1">
                {winnerAlreadyConverted ? '✓ تم التحويل' : selectedTender.FinalGuaranteeStatus || 'معلق'}
              </div>
            </div>
          </div>

          {/* ── Action Buttons ── */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setMode(mode === 'refund-losers' ? 'overview' : 'refund-losers')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm ${
                mode === 'refund-losers'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
              }`}
            >
              <ArrowDownRight className="w-4 h-4" />
              رد التأمين الابتدائي للمرفوضين
            </button>
            <button
              onClick={() => setMode(mode === 'convert-winner' ? 'overview' : 'convert-winner')}
              disabled={winnerAlreadyConverted}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm ${
                mode === 'convert-winner'
                  ? 'bg-emerald-600 text-white'
                  : winnerAlreadyConverted
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <ArrowRightLeft className="w-4 h-4" />
              {winnerAlreadyConverted ? 'تم تحويل تأمين الفائز ✓' : 'تحويل تأمين الفائز لنهائي'}
            </button>
            <button
              onClick={() => setMode(mode === 'journal' ? 'overview' : 'journal')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm ${
                mode === 'journal'
                  ? 'bg-sky-600 text-white'
                  : 'bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100'
              }`}
            >
              <FileText className="w-4 h-4" />
              القيود المحاسبية
            </button>
          </div>

          {/* ═══════════════════════════════════
              MODE: REFUND LOSERS
          ═══════════════════════════════════ */}
          {mode === 'refund-losers' && (
            <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-6 space-y-5">
              <h3 className="font-bold text-amber-800 text-base flex items-center gap-2 border-b border-amber-100 pb-3">
                <ArrowDownRight className="w-5 h-5" />
                رد التأمين الابتدائي للموردين المرفوضين
              </h3>

              {losersAvailable.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                  <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-emerald-300" />
                  تم رد جميع التأمينات — لا يوجد موردون في الانتظار.
                </div>
              ) : (
                <>
                  {/* Deduction Settings */}
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-amber-800 mb-1">نسبة خصم دمغات الإسناد (%)</label>
                      <input
                        type="number" min="0" max="10" step="0.1"
                        value={stampPercent}
                        onChange={(e) => setStampPercent(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-amber-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-amber-400 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-amber-800 mb-1">نسبة المصروفات الإدارية (%)</label>
                      <input
                        type="number" min="0" max="10" step="0.1"
                        value={adminPercent}
                        onChange={(e) => setAdminPercent(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-amber-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-amber-400 outline-none"
                      />
                    </div>
                  </div>

                  {/* Vendor Selection Table */}
                  <div className="border rounded-xl overflow-hidden">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-amber-50 text-amber-800 font-bold border-b border-amber-200">
                        <tr>
                          <th className="p-3 text-center w-10">
                            <input
                              type="checkbox"
                              checked={selectedLosers.length === losersAvailable.length}
                              onChange={() => setSelectedLosers(
                                selectedLosers.length === losersAvailable.length ? [] : losersAvailable.map(b => b.VendorId)
                              )}
                              className="w-4 h-4 accent-amber-600"
                            />
                          </th>
                          <th className="p-3">المورد / المقاول</th>
                          <th className="p-3">قيمة التأمين الابتدائي</th>
                          <th className="p-3">خصم الدمغات</th>
                          <th className="p-3">مصاريف إدارية</th>
                          <th className="p-3">صافي المبلغ المردود</th>
                          <th className="p-3">الحالة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {losersAvailable.map(bid => {
                          const stampD = Math.round(((bid.InitialInsuranceAmount || 0) * stampPercent) / 100 * 100) / 100;
                          const adminD = Math.round(((bid.InitialInsuranceAmount || 0) * adminPercent) / 100 * 100) / 100;
                          const net = Math.round(((bid.InitialInsuranceAmount || 0) - stampD - adminD) * 100) / 100;
                          return (
                            <tr key={bid.VendorId} className={`hover:bg-amber-50/50 transition-colors ${selectedLosers.includes(bid.VendorId) ? 'bg-amber-50' : ''}`}>
                              <td className="p-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={selectedLosers.includes(bid.VendorId)}
                                  onChange={() => toggleLoser(bid.VendorId)}
                                  className="w-4 h-4 accent-amber-600"
                                />
                              </td>
                              <td className="p-3 font-bold text-slate-800">{bid.CompanyName}</td>
                              <td className="p-3 font-mono font-bold text-slate-700">{formatMoney(bid.InitialInsuranceAmount)}</td>
                              <td className="p-3 font-mono text-rose-600">-{formatMoney(stampD)}</td>
                              <td className="p-3 font-mono text-rose-600">-{formatMoney(adminD)}</td>
                              <td className="p-3 font-mono font-bold text-emerald-700">{formatMoney(net)}</td>
                              <td className="p-3">
                                <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-[10px] font-bold">معلق</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary + Action */}
                  {selectedLosers.length > 0 && (
                    <div className="bg-slate-900 text-slate-100 rounded-xl p-4 flex items-center justify-between">
                      <div className="text-xs space-y-1">
                        <div>عدد الموردين المحددين: <span className="font-bold text-amber-400">{selectedLosers.length}</span></div>
                        <div>إجمالي صافي الرد: <span className="font-bold text-emerald-400 font-mono">
                          {formatMoney(losersAvailable
                            .filter(b => selectedLosers.includes(b.VendorId))
                            .reduce((s, b) => {
                              const stampD = (b.InitialInsuranceAmount || 0) * stampPercent / 100;
                              const adminD = (b.InitialInsuranceAmount || 0) * adminPercent / 100;
                              return s + (b.InitialInsuranceAmount || 0) - stampD - adminD;
                            }, 0))}
                        </span></div>
                        <div className="text-[11px] text-slate-400">
                          القيد: من حـ/ حسابات دائنة أخرى - تأمين ابتدائي → إلى حـ/ حسابات جارية بالبنوك
                        </div>
                      </div>
                      <button
                        onClick={handleRefundLosers}
                        disabled={processing}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl font-bold text-sm shadow-lg disabled:opacity-50 transition-all active:scale-95"
                      >
                        {processing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Banknote className="w-4 h-4" />}
                        {processing ? 'جاري المعالجة...' : 'تنفيذ رد التأمين وإنشاء القيود ⚡'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════
              MODE: CONVERT WINNER
          ═══════════════════════════════════ */}
          {mode === 'convert-winner' && winnerBid && (
            <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-6 space-y-5">
              <h3 className="font-bold text-emerald-800 text-base flex items-center gap-2 border-b border-emerald-100 pb-3">
                <ArrowRightLeft className="w-5 h-5" />
                تحويل التأمين الابتدائي للفائز إلى تأمين نهائي
              </h3>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-xs font-bold text-emerald-700 mb-1">الفائز</div>
                  <div className="font-bold text-slate-800">{winnerBid.CompanyName}</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-emerald-700 mb-1">التأمين الابتدائي المدفوع</div>
                  <div className="font-bold text-slate-800 font-mono">{formatMoney(winnerBid.InitialInsuranceAmount)}</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-emerald-700 mb-1">مبلغ الترسية</div>
                  <div className="font-bold text-slate-800 font-mono">{formatMoney(selectedTender?.AwardedAmount)}</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-emerald-700 mb-1">التأمين النهائي المطلوب (5%)</div>
                  <div className="font-bold text-indigo-700 font-mono">
                    {formatMoney(selectedTender?.AwardedAmount ? selectedTender.AwardedAmount * 0.05 : winnerBid.InitialInsuranceAmount)}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold text-emerald-700 mb-1">الفرق الواجب سداده</div>
                  {(() => {
                    const finalReq = selectedTender?.AwardedAmount ? selectedTender.AwardedAmount * 0.05 : winnerBid.InitialInsuranceAmount;
                    const diff = finalReq - (winnerBid.InitialInsuranceAmount || 0);
                    return (
                      <div className={`font-bold font-mono ${diff > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                        {diff > 0 ? formatMoney(diff) : '✓ لا يوجد فرق'}
                      </div>
                    );
                  })()}
                </div>
                <div>
                  <div className="text-xs font-bold text-emerald-700 mb-1">طريقة الدفع</div>
                  <div className="text-slate-700">{winnerBid.GuaranteePaymentMethod || '—'}</div>
                </div>
              </div>

              {/* Auto-refund notice */}
              {losersAvailable.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">تنبيه:</span> عند تأكيد التحويل سيتم <span className="font-bold">تلقائياً</span> رد
                    التأمين الابتدائي لـ <span className="font-bold text-amber-900">{losersAvailable.length}</span> مورد/مقاول خاسر
                    وإنشاء القيود المحاسبية لهم.
                  </div>
                </div>
              )}

              {/* Accounting entry preview */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2">
                <div className="font-bold text-slate-700 flex items-center gap-1.5 mb-2">
                  <FileText className="w-3.5 h-3.5" />
                  القيد المحاسبي الذي سيُنشأ:
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-rose-50 border border-rose-200 rounded-lg p-3">
                    <div className="text-rose-600 font-bold mb-1">مدين (مِن حـ/)</div>
                    <div className="text-slate-800">3301 — حسابات دائنة أخرى - تأمين ابتدائي</div>
                    <div className="font-mono font-bold text-rose-700 mt-1">{formatMoney(winnerBid.InitialInsuranceAmount)}</div>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                    <div className="text-emerald-600 font-bold mb-1">دائن (إلى حـ/)</div>
                    <div className="text-slate-800">3302 — حسابات دائنة أخرى - تأمين نهائي</div>
                    <div className="font-mono font-bold text-emerald-700 mt-1">{formatMoney(winnerBid.InitialInsuranceAmount)}</div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t">
                <button onClick={() => setMode('overview')} className="px-5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-bold">
                  إلغاء
                </button>
                <button
                  onClick={handleConvertWinner}
                  disabled={processing}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-bold text-sm shadow-lg disabled:opacity-50 transition-all active:scale-95"
                >
                  {processing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  {processing ? 'جاري المعالجة...' : 'تأكيد التحويل لتأمين نهائي + رد التأمين للخاسرين ⚡'}
                </button>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════
              MODE: JOURNAL ENTRIES
          ═══════════════════════════════════ */}
          {mode === 'journal' && (
            <div className="bg-white rounded-2xl border border-sky-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-sky-100 flex items-center justify-between">
                <h3 className="font-bold text-sky-800 text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  القيود المحاسبية للعملية — {selectedTender?.TenderNumber}
                </h3>
                <span className="text-xs bg-sky-100 text-sky-700 px-3 py-1 rounded-full font-bold">
                  {accountingEntries.length} قيد
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-sky-50 text-sky-800 font-bold border-b border-sky-200 text-[11px]">
                    <tr>
                      <th className="p-3">رقم القسيمة</th>
                      <th className="p-3">النوع</th>
                      <th className="p-3">المورد</th>
                      <th className="p-3">مدين (من حـ/)</th>
                      <th className="p-3">دائن (إلى حـ/)</th>
                      <th className="p-3">المبلغ</th>
                      <th className="p-3">التاريخ</th>
                      <th className="p-3">ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {accountingEntries.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="p-10 text-center text-slate-400">
                          <Landmark className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                          لا توجد قيود محاسبية بعد لهذه العملية.
                        </td>
                      </tr>
                    ) : (
                      accountingEntries.map(e => (
                        <tr key={e.TransactionId} className="hover:bg-sky-50/50">
                          <td className="p-3 font-mono font-bold text-sky-700">{e.VoucherNumber}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              e.TransactionType === 'رد تأمين ابتدائي'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}>{e.TransactionType}</span>
                          </td>
                          <td className="p-3 font-bold text-slate-800">{e.CompanyName}</td>
                          <td className="p-3 text-slate-600">
                            <div className="text-[10px] text-slate-400 font-mono">{e.DebitAccountCode}</div>
                            <div>{e.DebitAccountName}</div>
                          </td>
                          <td className="p-3 text-slate-600">
                            <div className="text-[10px] text-slate-400 font-mono">{e.CreditAccountCode}</div>
                            <div>{e.CreditAccountName}</div>
                          </td>
                          <td className="p-3 font-mono font-bold text-slate-800">{formatMoney(e.Amount)}</td>
                          <td className="p-3 text-slate-500">{e.TransactionDate}</td>
                          <td className="p-3 text-slate-500 max-w-[200px] truncate text-[11px]">{e.Notes}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════
              ALWAYS: Bids Overview
          ═══════════════════════════════════ */}
          {mode === 'overview' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-sky-600" />
                  جدول العطاءات وحالة التأمينات
                </h3>
                <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-semibold">
                  {bids.length} عطاء
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b text-[11px]">
                    <tr>
                      <th className="p-3">الترتيب</th>
                      <th className="p-3">المورد / المقاول</th>
                      <th className="p-3">قيمة العطاء</th>
                      <th className="p-3">قيمة التأمين الابتدائي</th>
                      <th className="p-3">طريقة الدفع</th>
                      <th className="p-3">حالة التأمين</th>
                      <th className="p-3">النتيجة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bids.map(bid => {
                      const isWinner = bid.VendorId === winnerVendorId;
                      const gt = existingGuarantees.find(g => g.VendorId === bid.VendorId);
                      return (
                        <tr key={bid.SubmissionId} className={`transition-colors ${isWinner ? 'bg-emerald-50/50' : 'hover:bg-slate-50'}`}>
                          <td className="p-3">
                            {bid.FinalRank ? (
                              <span className={`w-7 h-7 inline-flex items-center justify-center rounded-full text-[11px] font-extrabold ${
                                isWinner ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                              }`}>{bid.FinalRank}</span>
                            ) : '—'}
                          </td>
                          <td className="p-3 font-bold text-slate-800">
                            {bid.CompanyName}
                            {isWinner && <span className="mr-1.5 text-emerald-600 text-[10px]">🏆 الفائز</span>}
                          </td>
                          <td className="p-3 font-mono text-slate-700">{formatMoney(bid.FinancialTotalAmount)}</td>
                          <td className="p-3 font-mono font-bold text-slate-800">{formatMoney(bid.InitialInsuranceAmount)}</td>
                          <td className="p-3 text-slate-600">{bid.GuaranteePaymentMethod || '—'}</td>
                          <td className="p-3">
                            {bid.InitialInsuranceStatus === 'تم رد التأمين' ? (
                              <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-bold">✓ تم الرد</span>
                            ) : bid.InitialInsuranceStatus === 'محوَّل لتأمين نهائي' ? (
                              <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-[10px] font-bold">↻ تأمين نهائي</span>
                            ) : (
                              <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-[10px] font-bold">⏳ قائم</span>
                            )}
                          </td>
                          <td className="p-3">
                            {isWinner ? (
                              <span className="bg-emerald-600 text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold">فائز ✓</span>
                            ) : (
                              <span className="bg-slate-200 text-slate-600 px-2.5 py-0.5 rounded-full text-[10px] font-bold">مرفوض</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════
              Transaction History
          ═══════════════════════════════════ */}
          {allTransactions.length > 0 && mode === 'overview' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-amber-600" />
                  سجل عمليات التأمينات
                </h3>
                <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-semibold">
                  {allTransactions.length} عملية
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b text-[11px]">
                    <tr>
                      <th className="p-3">رقم القسيمة</th>
                      <th className="p-3">النوع</th>
                      <th className="p-3">المورد</th>
                      <th className="p-3">المبلغ الأصلي</th>
                      <th className="p-3">الدمغات</th>
                      <th className="p-3">م. إدارية</th>
                      <th className="p-3">صافي الرد</th>
                      <th className="p-3">الحالة</th>
                      <th className="p-3">التاريخ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {allTransactions.map(t => (
                      <tr key={t.GuaranteeTransactionId} className="hover:bg-slate-50/50">
                        <td className="p-3 font-mono font-bold text-sky-700">{t.VoucherNumber}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            t.TransactionType?.includes('تحويل') ? 'bg-indigo-100 text-indigo-700'
                            : t.TransactionType?.includes('تلقائي') ? 'bg-sky-100 text-sky-700'
                            : 'bg-amber-100 text-amber-700'
                          }`}>{t.TransactionType}</span>
                        </td>
                        <td className="p-3 font-bold text-slate-800">{t.CompanyName}</td>
                        <td className="p-3 font-mono text-slate-700">{formatMoney(t.OriginalAmount)}</td>
                        <td className="p-3 font-mono text-rose-600">{t.DeductedStamps ? `-${formatMoney(t.DeductedStamps)}` : '—'}</td>
                        <td className="p-3 font-mono text-rose-600">{t.DeductedAdminFees ? `-${formatMoney(t.DeductedAdminFees)}` : '—'}</td>
                        <td className="p-3 font-mono font-bold text-emerald-700">
                          {t.ConvertedToFinal ? formatMoney(t.FinalGuaranteeAmount) : formatMoney(t.NetRefundAmount)}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            t.Status === 'تم الصرف' ? 'bg-emerald-100 text-emerald-700' :
                            t.Status === 'تم التحويل' ? 'bg-indigo-100 text-indigo-700' :
                            'bg-slate-100 text-slate-500'
                          }`}>{t.Status}</span>
                        </td>
                        <td className="p-3 text-slate-500 text-[11px]">{t.ProcessedAt ? new Date(t.ProcessedAt).toLocaleDateString('ar-EG') : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
