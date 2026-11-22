import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FolderOpen, 
  Search, 
  ShieldAlert, 
  CheckSquare, 
  Plus, 
  Trash2, 
  Layers, 
  AlertCircle,
  FileCheck2
} from 'lucide-react';

export default function EnvelopeOpening() {
  const [tenders, setTenders] = useState([]);
  const [vendors, setVendors] = useState([]);

  const [selectedTenderId, setSelectedTenderId] = useState('');
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [submissions, setSubmissions] = useState([]);

  // Form State
  const [paymentMethod, setPaymentMethod] = useState('نقداً');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [receiptDate, setReceiptDate] = useState('');
  const [checkNumber, setCheckNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [checkDate, setCheckDate] = useState('');
  const [guaranteeLetterNo, setGuaranteeLetterNo] = useState('');
  const [guaranteeLetterExpiryDate, setGuaranteeLetterExpiryDate] = useState('');

  // Technical Envelope Checklist
  const [checklist, setChecklist] = useState({
    hasCommercialRegister: true,
    hasTaxCard: true,
    hasFederationCert: false,
    hasEInvoiceModel: true,
    hasAdvancePaymentCert: false,
    hasPreviousWorks: true,
    hasVATCert: true,
    hasCatalog: false,
    hasCert14S: false,
    hasCert4S: false,
    sampleSubmitted: false,
    sampleNumber: '',
    sampleNotes: ''
  });

  // Financial Envelope Items
  const [items, setItems] = useState([
    { itemName: 'محابس مياه زهر قطر 200 مم', unitType: 'عدد', quantity: 10, unitPrice: 1500, notes: '' }
  ]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedTenderId) {
      fetchSubmissions(selectedTenderId);
    }
  }, [selectedTenderId]);

  const fetchInitialData = async () => {
    try {
      const [tRes, vRes] = await Promise.all([
        axios.get('/api/tenders'),
        axios.get('/api/vendors')
      ]);
      setTenders(tRes.data || []);
      setVendors(vRes.data || []);
      if (tRes.data && tRes.data.length > 0) {
        setSelectedTenderId(tRes.data[0].TenderId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSubmissions = async (tenderId) => {
    try {
      const res = await axios.get(`/api/tenders/${tenderId}/submissions`);
      setSubmissions(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const selectedTender = tenders.find(t => t.TenderId == selectedTenderId);
  const selectedVendor = vendors.find(v => v.VendorId == selectedVendorId);

  const addItemRow = () => {
    setItems([...items, { itemName: '', unitType: 'عدد', quantity: 1, unitPrice: 0, notes: '' }]);
  };

  const removeItemRow = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const handleSubmitBid = async (e) => {
    e.preventDefault();
    if (!selectedTenderId) {
      alert('يرجى اختيار العملية المطروحة');
      return;
    }
    if (!selectedVendorId) {
      alert('يرجى اختيار صاحب العطاء (الشركة / المورد)');
      return;
    }

    if (selectedVendor && selectedVendor.IsBlacklisted) {
      alert(`عفواً! لا يمكن تسجيل العطاء لأن الشركة (${selectedVendor.CompanyName}) مسجلة بسجل الشطب والممنوعين من التعامل. السبب: ${selectedVendor.BlacklistReason}`);
      return;
    }

    try {
      const res = await axios.post('/api/submissions', {
        tenderId: selectedTenderId,
        vendorId: selectedVendorId,
        guaranteePaymentMethod: paymentMethod,
        receiptNumber,
        receiptDate,
        checkNumber,
        bankName,
        checkDate,
        guaranteeLetterNo,
        guaranteeLetterExpiryDate,
        ...checklist,
        items
      });

      alert(`تم إدخال عطاء الشركة بنجاح برقم كسر: ${res.data.bidFractionSerial}`);
      setSelectedVendorId('');
      fetchSubmissions(selectedTenderId);
    } catch (err) {
      alert('خطأ أثناء حفظ تفريغ العطاء: ' + (err.response?.data?.error || err.message));
    }
  };

  const financialTotalSum = items.reduce((sum, item) => sum + (parseFloat(item.quantity || 0) * parseFloat(item.unitPrice || 0)), 0);

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <FolderOpen className="w-6 h-6 text-sky-600" />
            <span>ثانياً: شاشة فض المظاريف والتفريغ الفني والمالي</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            إدخال بيانات العطاءات، التأمين الابتدائي، تفحّص المظروف الفني وتفريغ أسعار البنود المالية.
          </p>
        </div>
      </div>

      {/* Select Tender Banner */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <label className="text-sm font-bold text-slate-700 shrink-0">استعلام برقم العملية المطروحة:</label>
          <select
            value={selectedTenderId}
            onChange={(e) => setSelectedTenderId(e.target.value)}
            className="px-3.5 py-2 border rounded-xl text-sm font-bold text-sky-800 bg-sky-50 focus:ring-2 focus:ring-sky-500 outline-none w-full md:w-96"
          >
            {tenders.map((t) => (
              <option key={t.TenderId} value={t.TenderId}>
                [{t.TenderNumber}] {t.OperationName} (تاريخ الجلسة: {new Date(t.EnvelopeOpeningDate).toLocaleDateString('ar-EG')})
              </option>
            ))}
          </select>
        </div>

        {selectedTender && (
          <div className="flex items-center gap-4 text-xs font-semibold bg-slate-50 px-4 py-2 rounded-xl border">
            <div><span className="text-slate-500">التأمين الابتدائي المطلوب:</span> <span className="font-bold text-emerald-700 font-mono">{selectedTender.InitialGuaranteeAmount?.toLocaleString()} ج.م</span></div>
            <div className="h-4 w-px bg-slate-300"></div>
            <div><span className="text-slate-500">عدد العطاءات المقدمة:</span> <span className="font-bold text-sky-700 font-mono">{submissions.length}</span></div>
          </div>
        )}
      </div>

      {/* Submission Entry Form */}
      <form onSubmit={handleSubmitBid} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
        
        {/* Vendor Selection & Status Indicator */}
        <div className="space-y-3">
          <h3 className="font-bold text-slate-800 text-base border-b pb-2 flex items-center justify-between">
            <span>1. اختيار صاحب العطاء والحالة القانونية لقيد الشركة</span>
            {selectedVendor && (
              <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                selectedVendor.IsBlacklisted
                  ? 'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse'
                  : selectedVendor.IsRegistered
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  selectedVendor.IsBlacklisted ? 'bg-rose-600' : selectedVendor.IsRegistered ? 'bg-emerald-600' : 'bg-amber-600'
                }`}></span>
                {selectedVendor.IsBlacklisted
                  ? 'شركة مشطوبة وممنوعة من التعامل! ⛔'
                  : selectedVendor.IsRegistered
                  ? 'شركة مسجلة بقيد الموردين (أخضر)'
                  : 'شركة سابقة أعمال - غير مسجلة (أصفر)'}
              </span>
            )}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">اسم صاحب العطاء (المورد / المقاول) *</label>
              <select
                required
                value={selectedVendorId}
                onChange={(e) => setSelectedVendorId(e.target.value)}
                className="w-full px-3.5 py-2.5 border rounded-xl text-sm font-semibold focus:ring-2 focus:ring-sky-500 outline-none"
              >
                <option value="">-- اختر الشركة المتقدمة بالعطاء --</option>
                {vendors.map((v) => (
                  <option key={v.VendorId} value={v.VendorId}>
                    {v.CompanyName} (بطاقة ضريبية: {v.TaxCardNo}) {v.IsBlacklisted ? '⛔ [مشطوبة]' : v.IsRegistered ? '🟢 [مسجلة]' : '🟡 [سابقة أعمال]'}
                  </option>
                ))}
              </select>
            </div>

            {selectedVendor?.IsBlacklisted && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  <span>تنبيه هام جداً: الشركة محظورة!</span>
                </div>
                <div>سبب الشطب: {selectedVendor.BlacklistReason}</div>
                <div>جهة الشطب: {selectedVendor.BlacklistAuthority} (بتاريخ {selectedVendor.BlacklistDate})</div>
              </div>
            )}
          </div>
        </div>

        {/* Initial Guarantee Payment Details */}
        <div className="space-y-3 border-t pt-4">
          <h3 className="font-bold text-slate-800 text-sm">2. طريقة سداد التأمين الابتدائي</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">طريقة السداد</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-xs font-bold"
              >
                <option value="نقداً">نقداً بموجب إيصال</option>
                <option value="خطاب ضمان">خطاب ضمان بنكي</option>
                <option value="شيك">شيك مقبول الدفع</option>
                <option value="خصم من مستحقاته">خصم من مستحقات سابقة</option>
              </select>
            </div>

            {paymentMethod === 'نقداً' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">رقم الإيصال</label>
                  <input
                    type="text"
                    value={receiptNumber}
                    onChange={(e) => setReceiptNumber(e.target.value)}
                    placeholder="مثال: REC-9921"
                    className="w-full px-3 py-2 border rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">تاريخ الإيصال</label>
                  <input
                    type="date"
                    value={receiptDate}
                    onChange={(e) => setReceiptDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-xs"
                  />
                </div>
              </>
            )}

            {paymentMethod === 'خطاب ضمان' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">رقم خطاب الضمان</label>
                  <input
                    type="text"
                    value={guaranteeLetterNo}
                    onChange={(e) => setGuaranteeLetterNo(e.target.value)}
                    placeholder="مثال: BG-8812"
                    className="w-full px-3 py-2 border rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">تاريخ انتهاء السريان</label>
                  <input
                    type="date"
                    value={guaranteeLetterExpiryDate}
                    onChange={(e) => setGuaranteeLetterExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-xs"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Technical Envelope Checklist */}
        <div className="space-y-3 border-t pt-4">
          <h3 className="font-bold text-slate-800 text-sm">3. استيفاء المظروف الفني والأوراق القانونية</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl text-xs border">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={checklist.hasCommercialRegister}
                onChange={(e) => setChecklist({ ...checklist, hasCommercialRegister: e.target.checked })}
                className="w-4 h-4 text-sky-600 rounded"
              />
              <span>السجل التجاري ساري</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={checklist.hasTaxCard}
                onChange={(e) => setChecklist({ ...checklist, hasTaxCard: e.target.checked })}
                className="w-4 h-4 text-sky-600 rounded"
              />
              <span>البطاقة الضريبية سارية</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={checklist.hasFederationCert}
                onChange={(e) => setChecklist({ ...checklist, hasFederationCert: e.target.checked })}
                className="w-4 h-4 text-sky-600 rounded"
              />
              <span>شهادة اتحاد التشييد والبناء</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={checklist.hasEInvoiceModel}
                onChange={(e) => setChecklist({ ...checklist, hasEInvoiceModel: e.target.checked })}
                className="w-4 h-4 text-sky-600 rounded"
              />
              <span>نموذج الفاتورة الإلكترونية</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={checklist.hasVATCert}
                onChange={(e) => setChecklist({ ...checklist, hasVATCert: e.target.checked })}
                className="w-4 h-4 text-sky-600 rounded"
              />
              <span>شهادة القيمة المضافة</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={checklist.sampleSubmitted}
                onChange={(e) => setChecklist({ ...checklist, sampleSubmitted: e.target.checked })}
                className="w-4 h-4 text-sky-600 rounded"
              />
              <span>مقدم عينة للمعاينة</span>
            </label>
          </div>
        </div>

        {/* Financial Envelope Items Pricing */}
        <div className="space-y-3 border-t pt-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm">4. تفريغ بنود المظروف المالي (الأسعار والكميات)</h3>
            <button
              type="button"
              onClick={addItemRow}
              className="text-xs bg-sky-50 text-sky-700 hover:bg-sky-100 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 border border-sky-200"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة بند جديد</span>
            </button>
          </div>

          <div className="overflow-x-auto border rounded-xl">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b">
                <tr>
                  <th className="p-2.5">اسم البند / الأصناف</th>
                  <th className="p-2.5">الوحدة</th>
                  <th className="p-2.5">الكمية</th>
                  <th className="p-2.5">سعر الوحدة (ج.م)</th>
                  <th className="p-2.5">إجمالي البند</th>
                  <th className="p-2.5 text-center">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="p-2">
                      <input
                        type="text"
                        required
                        value={item.itemName}
                        onChange={(e) => handleItemChange(idx, 'itemName', e.target.value)}
                        placeholder="اسم الصنف أو البند"
                        className="w-full px-2 py-1 border rounded text-xs"
                      />
                    </td>
                    <td className="p-2">
                      <select
                        value={item.unitType}
                        onChange={(e) => handleItemChange(idx, 'unitType', e.target.value)}
                        className="w-full px-2 py-1 border rounded text-xs font-bold"
                      >
                        <option value="طقم">طقم</option>
                        <option value="عدد">عدد</option>
                        <option value="متر">متر</option>
                        <option value="علبة">علبة</option>
                        <option value="كيلو">كيلو</option>
                        <option value="طن">طن</option>
                        <option value="مقطوعية">مقطوعية</option>
                        <option value="لتر">لتر</option>
                        <option value="باكت">باكت</option>
                      </select>
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        required
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        className="w-20 px-2 py-1 border rounded text-xs font-mono font-bold"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                        className="w-28 px-2 py-1 border rounded text-xs font-mono font-bold"
                      />
                    </td>
                    <td className="p-2 font-mono font-bold text-emerald-700">
                      {((parseFloat(item.quantity || 0) * parseFloat(item.unitPrice || 0))).toLocaleString()} ج.م
                    </td>
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeItemRow(idx)}
                        className="text-rose-600 hover:bg-rose-50 p-1 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-bold text-emerald-900">
            إجمالي قيمة المظروف المالي للعطاء: {financialTotalSum.toLocaleString()} جنيهاً
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={selectedVendor?.IsBlacklisted}
          className="w-full py-3 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 text-white font-bold rounded-xl shadow-md transition-colors"
        >
          حفظ وتوثيق تفريغ العطاء الفني والمالي 💾
        </button>

      </form>

      {/* Submitted Bids Matrix */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <h3 className="font-bold text-slate-800 text-base border-b pb-2">
          كشف تفريغ العطاءات المقدمة لـ {selectedTender?.OperationName || 'العملية'}
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b">
              <tr>
                <th className="p-3">رقم العطاء (الباسط/المقام)</th>
                <th className="p-3">اسم الشركة</th>
                <th className="p-3">طريقة سداد التأمين الابتدائي</th>
                <th className="p-3">استيفاء الفني</th>
                <th className="p-3">إجمالي العطاء المالي</th>
                <th className="p-3">حالة التقييم</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {submissions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-6 text-center text-slate-400">
                    لم يتم تفريغ أي عطاءات لهذه العملية بعد.
                  </td>
                </tr>
              ) : (
                submissions.map((sub) => (
                  <tr key={sub.SubmissionId} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-sky-700">{sub.BidFractionSerial}</td>
                    <td className="p-3 font-bold text-slate-800">{sub.CompanyName}</td>
                    <td className="p-3">{sub.GuaranteePaymentMethod} ({sub.ReceiptNumber || sub.GuaranteeLetterNo || 'مسدد'})</td>
                    <td className="p-3">
                      <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-semibold border border-emerald-200">
                        مستوفى الأوراق
                      </span>
                    </td>
                    <td className="p-3 font-mono font-bold text-emerald-800">
                      {sub.FinancialTotalAmount?.toLocaleString()} ج.م
                    </td>
                    <td className="p-3 font-bold text-slate-600">{sub.TechnicalStatus}</td>
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
