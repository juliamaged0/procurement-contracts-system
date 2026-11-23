import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ClipboardList, DollarSign, ShieldCheck, CheckCircle2, XCircle,
  AlertCircle, ChevronRight, Warehouse, Eye, Search, Plus, Trash2,
  RotateCcw, FileText, ArrowRight, Stamp, Clock, Calendar, Check,
  X, AlertTriangle, Layers, Send, Award, Sliders, ChevronDown, ChevronUp,
  FileCheck2, CheckSquare, Sparkles, Upload, Download, Paperclip, Calculator, FileUp
} from 'lucide-react';

const DEPARTMENTS = [
  'الإدارة العامة للعقود والمشتريات',
  'الإدارة العامة لشبكات الصرف الصحي',
  'الإدارة العامة لمحطات المعالجة',
  'إدارة المشروعات',
  'إدارة التشغيل والصيانة',
  'إدارة الشبكات',
  'الإدارة الفنية',
  'قطاع التخطيط والمشروعات',
  'قطاع الصرف الصحي',
  'قطاع المياه',
  'الشئون المالية',
  'إدارة المخازن',
  'إدارة الموارد البشرية',
  'إدارة تقنية المعلومات',
  'إدارة الجودة والسلامة',
  'الإدارة العامة'
];

const OPERATION_TYPES = [
  { value: 'تعاقدات', label: 'تعاقدات ومقاولات', color: 'border-blue-300 text-blue-700 bg-blue-50', active: 'bg-blue-600 border-blue-600 text-white' },
  { value: 'توريدات', label: 'توريدات سلع ومهمات', color: 'border-emerald-300 text-emerald-700 bg-emerald-50', active: 'bg-emerald-600 border-emerald-600 text-white' },
  { value: 'مزادات', label: 'مزادات وبيع خردة', color: 'border-purple-300 text-purple-700 bg-purple-50', active: 'bg-purple-600 border-purple-600 text-white' },
];

const TENDER_METHODS_MAP = {
  'تعاقدات': ['مناقصة عامة', 'مناقصة محدودة', 'ممارسة عامة', 'ممارسة محدودة', 'ممارسة محلية', 'أمر مباشر'],
  'توريدات': ['مناقصة عامة', 'مناقصة محدودة', 'ممارسة عامة', 'ممارسة محدودة', 'الأمر المباشر'],
  'مزادات': ['مزايدة عامة', 'مزايدة محدودة', 'أمر مباشر'],
};

const METHOD_SYMBOLS = {
  'تعاقدات': { 'مناقصة عامة': 'هـ', 'مناقصة محدودة': 'هـ م', 'ممارسة عامة': 'م ع', 'ممارسة محدودة': 'م ح', 'ممارسة محلية': 'م م', 'أمر مباشر': 'ا م' },
  'توريدات': { 'مناقصة عامة': 'ت', 'مناقصة محدودة': 'ت م', 'ممارسة عامة': 'م ت', 'ممارسة محدودة': 'م', 'الأمر المباشر': 'أ', 'أمر مباشر': 'أ' },
  'مزادات': { 'مزايدة عامة': 'ز', 'مزايدة محدودة': 'ز م', 'أمر مباشر': 'ز أ' },
};

function getApprovalAuthority(method, amount) {
  const val = parseFloat(amount) || 0;
  if (method === 'مناقصة عامة' || method === 'ممارسة عامة') {
    if (val <= 1500000) return 'نائب رئيس مجلس الإدارة';
    if (val <= 30000000) return 'رئيس مجلس الإدارة';
    return 'مجلس الإدارة';
  }
  if (method === 'مناقصة محدودة' || method === 'ممارسة محدودة') {
    if (val <= 1000000) return 'نائب رئيس مجلس الإدارة';
    if (val <= 15000000) return 'رئيس مجلس الإدارة';
    return 'مجلس الإدارة';
  }
  if (method === 'ممارسة محلية') {
    if (val <= 500000) return 'نائب رئيس مجلس الإدارة';
    if (val <= 5000000) return 'رئيس مجلس الإدارة';
    return 'مجلس الإدارة';
  }
  if (method === 'أمر مباشر' || method === 'الأمر المباشر') {
    if (val <= 100000) return 'نائب رئيس مجلس الإدارة';
    if (val <= 2000000) return 'رئيس مجلس الإدارة';
    return 'مجلس الإدارة';
  }
  return 'رئيس مجلس الإدارة';
}

export default function NeedsRequest() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('form'); // 'form' | 'list'
  const [editingRequestId, setEditingRequestId] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    // Section 1: Basic & Technical Specs
    operationName: '',
    operationType: 'تعاقدات',
    requestingDepartment: '',
    executionDuration: '',
    executionDurationValue: '',
    executionDurationUnit: 'أشهر',
    fiscalYear: '2025/2026',
    specsAndConditions: '',
    specsFileName: '',
    specsFilePath: '',
    specsFileData: null,
    specsFileSize: 0,
    requiresSample: false,
    sampleDetails: '',
    warehouseBalance: 'لا يوجد رصيد بالمخازن',
    hasWarehouseBalance: false,
    warehouseBalanceDetails: '',

    // Technical Evaluation Method (مطابق/غير مطابق أو نظام نقاط)
    technicalEvaluationMethod: 'مطابق أو غير مطابق', // 'مطابق أو غير مطابق' | 'نظام نقاط'
    minPassingScore: 70, // الحد الأدنى لدرجات القبول الفني للعملية
    allowSplitAwarding: false, // لا تقبل التجزئة في التعاقدات ومتروكة لصفحة الطرح
    technicalCriteriaNotes: 'المواصفات الفنية والكفاءة (40 نقطة)، سابقة الأعمال والخبرة (30 نقطة)، الضمان والصيانة (20 نقطة)، سرعة التوريد والتنفيذ (10 نقاط)',

    // Section 2: Financial Details & Items
    tenderMethodSelected: 'مناقصة عامة',
    estimatedValue: '',
    preliminaryReservation: '',
    reservationTypeNew: 'جاري',
    budgetHoldReference: '',
    initialGuaranteePercent: 2,
    initialGuaranteeAmount: '',
    guaranteeInputMode: 'percent', // 'percent' | 'amount'
    submittalType: 'مظروفيين',
    bookletPrice: '',
    constructionDivision: '',
    constructionCategory: '',
    operationTerms: '',
    financialNotes: '',

    // Section 3: Financial Position & Paper Approvals
    financialStatus: 'APPROVED', // 'APPROVED' | 'PENDING' | 'REJECTED'
    financialApprovalObtained: true, // هل أخذ موافقة مالية؟
    financialApprovalDate: new Date().toISOString().split('T')[0],
    financialApprovalNotes: '',
    financialOfficerName: '',
    approvalAuthority: '',
    authorityApprovalStatus: 'معتمد', // 'معتمد' | 'مرفوض' | 'في انتظار الموافقة'
    authorityApprovalDate: new Date().toISOString().split('T')[0],
    reviewedBy: user?.fullName || 'رئيس مجلس الإدارة',
    authorityRejectionReason: '',
  });

  // Operation Items Table with Technical Details per item
  const [operationItems, setOperationItems] = useState([
    {
      description: '',
      unit: 'عدد',
      quantity: 1,
      unitPrice: 0,
      specs: '',
      itemMaxScore: 100,
      itemMinPassingScore: 70,
      itemCriteria: 'بلد المنشأ والجودة (30 درجة)، الكفاءة التشغيلية (30 درجة)، فترة الضمان والصيانة (25 درجة)، سرعة التوريد (15 درجة)',
      allowSplit: true,
      isExpanded: false
    }
  ]);

  // Warehouse Search Modal
  const [inventory, setInventory] = useState([]);
  const [inventorySearch, setInventorySearch] = useState('');
  const [showInventoryBox, setShowInventoryBox] = useState(false);

  // Requests Registry
  const [requestsList, setRequestsList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // UI state
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    fetchRequests();
  }, []);

  useEffect(() => {
    // When operation type changes, default tender method & default split awarding
    const availableMethods = TENDER_METHODS_MAP[formData.operationType] || [];
    const isSupply = formData.operationType === 'توريدات';

    setFormData(prev => ({
      ...prev,
      tenderMethodSelected: availableMethods.includes(prev.tenderMethodSelected) ? prev.tenderMethodSelected : availableMethods[0],
      allowSplitAwarding: isSupply ? true : false,
      technicalEvaluationMethod: prev.technicalEvaluationMethod || (isSupply ? 'نظام نقاط' : 'مطابق أو غير مطابق')
    }));
  }, [formData.operationType]);

  // Recalculate authority whenever method or estimatedValue changes
  const computedAuthority = formData.tenderMethodSelected && formData.estimatedValue
    ? getApprovalAuthority(formData.tenderMethodSelected, formData.estimatedValue)
    : 'رئيس مجلس الإدارة';

  const computedSymbol = formData.operationType && formData.tenderMethodSelected
    ? (METHOD_SYMBOLS[formData.operationType]?.[formData.tenderMethodSelected] || '-')
    : '-';

  const isPointsSystem = formData.technicalEvaluationMethod === 'نظام نقاط';

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/needs-requests');
      setRequestsList(res.data || []);
    } catch (err) {
      console.error('Error fetching needs requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInventory = async (search = '') => {
    try {
      const res = await axios.get('/api/warehouse/inventory', { params: search ? { search } : {} });
      setInventory(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => {
      const updated = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      };
      // When estimatedValue changes, sync initial guarantee amount
      if (name === 'estimatedValue') {
        const est = parseFloat(value) || 0;
        const pct = parseFloat(prev.initialGuaranteePercent) || 2;
        if (est > 0) {
          updated.initialGuaranteeAmount = Math.round((est * pct) / 100);
        }
      }
      return updated;
    });
  };

  // Execution Duration Dual Handler (Number + Unit Dropdown)
  const handleDurationChange = (val, unit) => {
    const v = val !== undefined ? val : formData.executionDurationValue;
    const u = unit !== undefined ? unit : formData.executionDurationUnit;
    const combined = v ? `${v} ${u}` : '';
    setFormData(prev => ({
      ...prev,
      executionDurationValue: v,
      executionDurationUnit: u,
      executionDuration: combined
    }));
  };

  // Warehouse Balance Checkbox Handler
  const handleWarehouseCheckbox = (checked) => {
    setFormData(prev => ({
      ...prev,
      hasWarehouseBalance: checked,
      warehouseBalance: checked ? (prev.warehouseBalanceDetails.trim() || 'يوجد رصيد بالمخازن') : 'لا يوجد رصيد بالمخازن'
    }));
  };

  const handleWarehouseDetailsChange = (details) => {
    setFormData(prev => ({
      ...prev,
      warehouseBalanceDetails: details,
      warehouseBalance: details.trim() ? details : 'يوجد رصيد بالمخازن'
    }));
  };

  // Specs Documentation Upload & Remove Handlers
  const handleSpecsFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      alert('حجم الملف كبير جداً، الحد الأقصى المسموح به هو 20 ميجابايت');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setFormData(prev => ({
        ...prev,
        specsFileName: file.name,
        specsFileData: reader.result,
        specsFileSize: file.size,
        specsFilePath: '' // populated on backend save
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveSpecsFile = () => {
    setFormData(prev => ({
      ...prev,
      specsFileName: '',
      specsFilePath: '',
      specsFileData: null,
      specsFileSize: 0
    }));
  };

  // Booklet Price Calculator (Law 182 Guidelines)
  const handleCalculateStandardBookletPrice = () => {
    const val = parseFloat(formData.estimatedValue) || 0;
    let price = 500;
    if (val <= 100000) price = 250;
    else if (val <= 500000) price = 500;
    else if (val <= 1000000) price = 1000;
    else if (val <= 5000000) price = 2000;
    else price = 5000;

    setFormData(prev => ({ ...prev, bookletPrice: price }));
  };

  // Initial Guarantee Sync Handlers (Percent vs Cash Amount)
  const handleGuaranteePercentChange = (valOrEvent) => {
    const raw = (valOrEvent && typeof valOrEvent === 'object' && valOrEvent.target) ? valOrEvent.target.value : valOrEvent;
    const pct = parseFloat(raw) || 0;
    const est = parseFloat(formData.estimatedValue) || 0;
    const amt = est > 0 ? Math.round((est * pct) / 100) : '';
    setFormData(prev => ({
      ...prev,
      initialGuaranteePercent: raw,
      initialGuaranteeAmount: amt > 0 ? amt : ''
    }));
  };

  const handleGuaranteeAmountChange = (valOrEvent) => {
    const raw = (valOrEvent && typeof valOrEvent === 'object' && valOrEvent.target) ? valOrEvent.target.value : valOrEvent;
    const amt = parseFloat(raw) || 0;
    const est = parseFloat(formData.estimatedValue) || 0;
    setFormData(prev => {
      const pct = est > 0 ? parseFloat(((amt / est) * 100).toFixed(2)) : prev.initialGuaranteePercent;
      return {
        ...prev,
        initialGuaranteeAmount: raw,
        initialGuaranteePercent: est > 0 ? pct : prev.initialGuaranteePercent
      };
    });
  };

  // Financial Position Status Selector
  const handleFinancialStatusSelect = (status) => {
    setFormData(prev => ({
      ...prev,
      financialStatus: status,
      financialApprovalObtained: status === 'APPROVED',
      financialApprovalNotes: status === 'REJECTED' ? (prev.financialApprovalNotes || 'اعتذار لعدم توفر اعتماد مالي بالموازنة') : prev.financialApprovalNotes
    }));
  };

  // Items Management
  const handleAddItem = () => {
    setOperationItems(prev => [
      ...prev,
      {
        description: '',
        unit: 'عدد',
        quantity: 1,
        unitPrice: 0,
        specs: '',
        itemMaxScore: 100,
        itemMinPassingScore: 70,
        itemCriteria: 'بلد المنشأ والجودة (30 درجة)، الكفاءة التشغيلية (30 درجة)، فترة الضمان والصيانة (25 درجة)، سرعة التوريد (15 درجة)',
        allowSplit: true,
        isExpanded: true
      }
    ]);
  };

  const handleRemoveItem = (index) => {
    setOperationItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index, field, val) => {
    setOperationItems(prev => prev.map((item, idx) => {
      if (idx !== index) return item;
      return { ...item, [field]: val };
    }));
  };

  const handleToggleExpandItem = (index) => {
    setOperationItems(prev => prev.map((item, idx) => {
      if (idx !== index) return item;
      return { ...item, isExpanded: !item.isExpanded };
    }));
  };

  const handleApplyCriteriaToAll = (sourceIndex) => {
    const src = operationItems[sourceIndex];
    if (!src) return;
    setOperationItems(prev => prev.map(item => ({
      ...item,
      itemMaxScore: src.itemMaxScore,
      itemMinPassingScore: src.itemMinPassingScore,
      itemCriteria: src.itemCriteria,
      allowSplit: src.allowSplit
    })));
    alert('تم تطبيق معايير وشروط البند رقم ' + (sourceIndex + 1) + ' على جميع بنود العملية بنجاح ✓');
  };

  const handleSumItemsToEstimatedValue = () => {
    const total = operationItems.reduce((acc, curr) => {
      const q = parseFloat(curr.quantity) || 0;
      const p = parseFloat(curr.unitPrice) || 0;
      return acc + (q * p);
    }, 0);
    if (total > 0) {
      setFormData(prev => ({
        ...prev,
        estimatedValue: total,
        preliminaryReservation: prev.preliminaryReservation || total
      }));
    }
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.operationName || !formData.operationName.trim()) {
      const msg = 'يرجى إدخال اسم وموضوع العملية في القسم الأول';
      setErrorMessage(msg);
      alert(msg);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!formData.requestingDepartment) {
      const msg = 'يرجى اختيار الجهة الطالبة في القسم الأول';
      setErrorMessage(msg);
      alert(msg);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (formData.authorityApprovalStatus === 'مرفوض' && (!formData.authorityRejectionReason || !formData.authorityRejectionReason.trim())) {
      const msg = 'في حال رفض الطلب، يجب كتابة سبب الرفض في القسم الثالث إلزامياً';
      setErrorMessage(msg);
      alert(msg);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    const payload = {
      ...formData,
      approvalAuthority: formData.approvalAuthority || computedAuthority,
      operationItems,
    };

    try {
      if (editingRequestId) {
        await axios.put(`/api/needs-requests/${editingRequestId}/comprehensive`, payload);
        alert('تم حفظ وتحديث طلب الاحتياج بنجاح! ✓');
        setSuccessMessage('تم تحديث طلب الاحتياج بنجاح!');
      } else {
        const res = await axios.post('/api/needs-requests/submit', payload);
        alert(`تم تسجيل طلب الاحتياج بنجاح برقم: #${res.data.requestId}${res.data.operationNumber ? ` (رقم العملية: ${res.data.operationNumber})` : ''}`);
        setSuccessMessage(`تم تسجيل طلب الاحتياج بنجاح برقم: #${res.data.requestId}${res.data.operationNumber ? ` (رقم العملية: ${res.data.operationNumber})` : ''}`);
      }
      await fetchRequests();
      resetForm();
      setActiveTab('list');
    } catch (err) {
      console.error('Error submitting needs request:', err);
      const msg = err.response?.data?.error || err.message || 'حدث خطأ في حفظ الطلب';
      setErrorMessage(msg);
      alert('خطأ أثناء الحفظ: ' + msg);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditRequest = (req) => {
    setEditingRequestId(req.RequestId);
    let items = [{
      description: '',
      unit: 'عدد',
      quantity: 1,
      unitPrice: 0,
      specs: '',
      itemMaxScore: 100,
      itemMinPassingScore: 70,
      itemCriteria: '',
      allowSplit: true,
      isExpanded: false
    }];

    if (req.OperationItems) {
      try {
        const parsed = JSON.parse(req.OperationItems);
        if (Array.isArray(parsed) && parsed.length > 0) items = parsed;
      } catch (e) {}
    }

    // Parse duration into number + unit
    const rawDur = req.ExecutionDuration || '';
    const numMatch = rawDur.match(/\d+/);
    const durVal = numMatch ? numMatch[0] : '';
    let durUnit = 'أشهر';
    if (/يوم|ايام|أيام/.test(rawDur)) durUnit = 'أيام';
    else if (/اسبوع|أسبوع|اسابيع|أسابيع/.test(rawDur)) durUnit = 'أسابيع';
    else if (/شهر|اشهر|أشهر/.test(rawDur)) durUnit = 'أشهر';
    else if (/سنة|سنوات|عام|اعوام|أعوام/.test(rawDur)) durUnit = 'سنوات';

    // Parse warehouse balance
    const rawWh = req.WarehouseBalance || '';
    const hasWh = Boolean(rawWh && rawWh !== 'لا يوجد رصيد بالمخازن' && rawWh !== 'صفر' && rawWh.trim() !== '');

    // Parse initial guarantee amount
    const estVal = parseFloat(req.EstimatedValue) || 0;
    const gPct = parseFloat(req.InitialGuaranteePercent) || 2;
    const gAmt = estVal > 0 ? Math.round((estVal * gPct) / 100) : '';

    // Parse financial position
    let finStatus = 'APPROVED';
    if (req.FinancialApprovalObtained === 0) {
      finStatus = req.WorkflowStatus === 'مرفوض' ? 'REJECTED' : 'PENDING';
    }

    setFormData({
      operationName: req.OperationName || '',
      operationType: req.OperationType || 'تعاقدات',
      requestingDepartment: req.RequestingDepartment || '',
      executionDuration: req.ExecutionDuration || '',
      executionDurationValue: durVal,
      executionDurationUnit: durUnit,
      fiscalYear: req.FiscalYear || '2025/2026',
      specsAndConditions: req.SpecsAndConditions || '',
      specsFileName: req.SpecsFileName || req.BookletFileName || '',
      specsFilePath: req.SpecsFilePath || req.BookletFilePath || '',
      specsFileData: null,
      specsFileSize: 0,
      requiresSample: Boolean(req.RequiresSample),
      sampleDetails: req.SampleDetails || '',
      warehouseBalance: req.WarehouseBalance || 'لا يوجد رصيد بالمخازن',
      hasWarehouseBalance: hasWh,
      warehouseBalanceDetails: hasWh ? rawWh : '',

      technicalEvaluationMethod: req.TechnicalEvaluationMethod || 'مطابق أو غير مطابق',
      minPassingScore: req.MinPassingScore || 70,
      allowSplitAwarding: false,
      technicalCriteriaNotes: req.TechnicalCriteriaNotes || '',

      tenderMethodSelected: req.TenderMethodSelected || 'مناقصة عامة',
      estimatedValue: req.EstimatedValue || '',
      preliminaryReservation: req.PreliminaryReservation || req.InitialReservation || '',
      reservationTypeNew: req.ReservationTypeNew || 'جاري',
      budgetHoldReference: req.BudgetHoldReference || '',
      initialGuaranteePercent: req.InitialGuaranteePercent || 2,
      initialGuaranteeAmount: gAmt,
      guaranteeInputMode: 'percent',
      submittalType: req.SubmittalType || 'مظروفيين',
      bookletPrice: req.BookletPrice || '',
      constructionDivision: req.ConstructionDivision || '',
      constructionCategory: req.ConstructionCategory || '',
      operationTerms: req.OperationTerms || '',
      financialNotes: req.FinancialNotes || '',

      financialStatus: finStatus,
      financialApprovalObtained: req.FinancialApprovalObtained !== 0,
      financialApprovalDate: req.FinancialApprovalDate || new Date().toISOString().split('T')[0],
      financialApprovalNotes: req.FinancialApprovalNotes || '',
      financialOfficerName: req.FinancialReviewedBy || '',
      approvalAuthority: req.ApprovalAuthority || '',
      authorityApprovalStatus: req.AuthorityApprovalStatus || (req.WorkflowStatus === 'مرفوض' ? 'مرفوض' : 'معتمد'),
      authorityApprovalDate: req.AuthorityApprovalDate || new Date().toISOString().split('T')[0],
      reviewedBy: req.AuthorityReviewedBy || user?.fullName || 'رئيس مجلس الإدارة',
      authorityRejectionReason: req.AuthorityRejectionReason || '',
    });

    setOperationItems(items);
    setActiveTab('form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteRequest = async (id) => {
    const reason = prompt('يرجى ذكر سبب حذف وأرشفة طلب الاحتياج:');
    if (reason === null) return;
    try {
      await axios.delete(`/api/needs-requests/${id}`, { data: { reason } });
      alert('تم نقل طلب الاحتياج إلى الأرشيف بنجاح');
      fetchRequests();
    } catch (err) {
      alert('خطأ: ' + (err.response?.data?.error || err.message));
    }
  };

  const resetForm = () => {
    setEditingRequestId(null);
    setFormData({
      operationName: '',
      operationType: 'تعاقدات',
      requestingDepartment: '',
      executionDuration: '',
      executionDurationValue: '',
      executionDurationUnit: 'أشهر',
      fiscalYear: '2025/2026',
      specsAndConditions: '',
      specsFileName: '',
      specsFilePath: '',
      specsFileData: null,
      specsFileSize: 0,
      requiresSample: false,
      sampleDetails: '',
      warehouseBalance: 'لا يوجد رصيد بالمخازن',
      hasWarehouseBalance: false,
      warehouseBalanceDetails: '',
      technicalEvaluationMethod: 'مطابق أو غير مطابق',
      minPassingScore: 70,
      allowSplitAwarding: false,
      technicalCriteriaNotes: 'المواصفات الفنية والكفاءة (40 نقطة)، سابقة الأعمال والخبرة (30 نقطة)، الضمان والصيانة (20 نقطة)، سرعة التوريد والتنفيذ (10 نقاط)',
      tenderMethodSelected: 'مناقصة عامة',
      estimatedValue: '',
      preliminaryReservation: '',
      reservationTypeNew: 'جاري',
      budgetHoldReference: '',
      initialGuaranteePercent: 2,
      initialGuaranteeAmount: '',
      guaranteeInputMode: 'percent',
      submittalType: 'مظروفيين',
      bookletPrice: '',
      constructionDivision: '',
      constructionCategory: '',
      operationTerms: '',
      financialNotes: '',
      financialStatus: 'APPROVED',
      financialApprovalObtained: true,
      financialApprovalDate: new Date().toISOString().split('T')[0],
      financialApprovalNotes: '',
      financialOfficerName: '',
      approvalAuthority: '',
      authorityApprovalStatus: 'معتمد',
      authorityApprovalDate: new Date().toISOString().split('T')[0],
      reviewedBy: user?.fullName || 'رئيس مجلس الإدارة',
      authorityRejectionReason: '',
    });
    setOperationItems([
      {
        description: '',
        unit: 'عدد',
        quantity: 1,
        unitPrice: 0,
        specs: '',
        itemMaxScore: 100,
        itemMinPassingScore: 70,
        itemCriteria: 'بلد المنشأ والجودة (30 درجة)، الكفاءة التشغيلية (30 درجة)، فترة الضمان والصيانة (25 درجة)، سرعة التوريد (15 درجة)',
        allowSplit: true,
        isExpanded: false
      }
    ]);
    setErrorMessage('');
  };

  // Filtered requests list
  const filteredRequests = requestsList.filter(req => {
    const matchesSearch =
      (req.OperationName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (req.RequestingDepartment || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (req.FinancialOperationNumber || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'APPROVED') {
      return req.WorkflowStatus === 'معتمد' || req.AuthorityApprovalStatus === 'معتمد';
    }
    if (statusFilter === 'REJECTED') {
      return req.WorkflowStatus === 'مرفوض' || req.AuthorityApprovalStatus === 'مرفوض';
    }
    if (statusFilter === 'PENDING') {
      return (req.WorkflowStatus !== 'معتمد' && req.WorkflowStatus !== 'مرفوض') ||
             (req.AuthorityApprovalStatus !== 'معتمد' && req.AuthorityApprovalStatus !== 'مرفوض');
    }
    return true;
  });

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl shadow-xl border border-slate-800 flex items-center justify-between flex-wrap gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/40 border border-indigo-400/30 flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <ClipboardList className="w-6 h-6 text-indigo-300" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black">طلب الاحتياج والاعتماد الشامل</h1>
              <p className="text-xs text-indigo-200/80">
                تسجيل بيانات الاحتياج، نظام التقييم الفني (نقاط / مطابق)، المراجعة المالية، وتوثيق الموافقات الورقية واعتماد السلطة
              </p>
            </div>
          </div>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700">
          <button
            type="button"
            onClick={() => setActiveTab('form')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'form'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>{editingRequestId ? `تعديل طلب رقم #${editingRequestId}` : 'تسجيل طلب متكامل'}</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('list'); fetchRequests(); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'list'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>سجل ومتابعة الطلبات ({requestsList.length})</span>
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-emerald-800 text-sm font-bold shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage('')} className="text-emerald-600 hover:text-emerald-800"><X className="w-4 h-4" /></button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-rose-800 text-sm font-bold shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage('')} className="text-rose-600 hover:text-rose-800"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: COMPREHENSIVE 3-SECTION FORM                                        */}
      {/* ========================================================================= */}
      {activeTab === 'form' && (
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Stepper Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-white border-2 border-indigo-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shrink-0">1</div>
              <div>
                <div className="text-xs font-bold text-slate-800">القسم الأول: بيانات الاحتياج والتقييم الفني</div>
                <div className="text-[11px] text-slate-500">اسم العملية، نظام التقييم (نقاط/مطابق)، وقابلية التجزئة</div>
              </div>
            </div>

            <div className="bg-white border-2 border-emerald-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm shrink-0">2</div>
              <div>
                <div className="text-xs font-bold text-slate-800">القسم الثاني: البيانات والمراجعة المالية</div>
                <div className="text-[11px] text-slate-500">طريقة الطرح، القيمة، وجدول البنود مع شروط ومعايير كل بند</div>
              </div>
            </div>

            <div className="bg-white border-2 border-purple-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black text-sm shrink-0">3</div>
              <div>
                <div className="text-xs font-bold text-slate-800">القسم الثالث: الموافقات الورقية والاعتماد</div>
                <div className="text-[11px] text-slate-500">توثيق أخذ الموافقة المالية واعتماد السلطة المختصة</div>
              </div>
            </div>
          </div>

          {/* --------------------------------------------------------------------- */}
          {/* SECTION 1: NEEDS REQUEST, SPECS & TECHNICAL EVALUATION SYSTEM         */}
          {/* --------------------------------------------------------------------- */}
          <div className="bg-white rounded-3xl border border-indigo-100 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-50/80 via-white to-indigo-50/40 p-5 border-b border-indigo-100 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/30">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-indigo-100 text-indigo-800 text-[10px] font-black px-2 py-0.5 rounded-full">القسم الأول</span>
                    <h2 className="text-base font-black text-slate-800">بيانات طلب الاحتياج ونظام التقييم الفني</h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">البيانات الإدارية العامة، نظام التقييم الفني المطلوب (نقاط / مطابق)، وقابلية التجزئة</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Operation Type Selection */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-2">نوع العملية *</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {OPERATION_TYPES.map(op => {
                    const isSelected = formData.operationType === op.value;
                    return (
                      <button
                        key={op.value}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, operationType: op.value }))}
                        className={`p-3.5 rounded-2xl border-2 text-xs font-black transition-all flex items-center justify-between ${
                          isSelected ? op.active + ' shadow-md' : op.color + ' hover:border-slate-400'
                        }`}
                      >
                        <span>{op.label}</span>
                        {isSelected && <Check className="w-4 h-4 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Main Fields Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">اسم وموضوع العملية *</label>
                  <input
                    type="text"
                    required
                    name="operationName"
                    value={formData.operationName}
                    onChange={handleInputChange}
                    placeholder="مثال: توريد طلمبات غاطسة ومهمات كهروميكانيكية لمحطة مياه النزهة"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">الجهة / الإدارة الطالبة *</label>
                  <select
                    required
                    name="requestingDepartment"
                    value={formData.requestingDepartment}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-medium"
                  >
                    <option value="">-- اختر الإدارة الطالبة --</option>
                    {formData.requestingDepartment && !DEPARTMENTS.includes(formData.requestingDepartment) && (
                      <option value={formData.requestingDepartment}>{formData.requestingDepartment}</option>
                    )}
                    {DEPARTMENTS.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">العام المالي المعتمد</label>
                  <input
                    type="text"
                    name="fiscalYear"
                    value={formData.fiscalYear}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    مدة التنفيذ أو التوريد *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      min="1"
                      name="executionDurationValue"
                      value={formData.executionDurationValue || ''}
                      onChange={(e) => handleDurationChange(e.target.value, formData.executionDurationUnit)}
                      placeholder="العدد (مثال: 3)"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    <select
                      name="executionDurationUnit"
                      value={formData.executionDurationUnit || 'شهر'}
                      onChange={(e) => handleDurationChange(formData.executionDurationValue, e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-medium"
                    >
                      <option value="يوم">يوم / أيام</option>
                      <option value="أسبوع">أسبوع / أسابيع</option>
                      <option value="شهر">شهر / أشهر</option>
                      <option value="سنة">سنة / سنوات</option>
                    </select>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 font-mono">
                    المدة المسجلة: <span className="font-bold text-indigo-700">{formData.executionDuration || 'لم تحدد'}</span>
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    موقف رصيد المخزن (المادة 19) *
                  </label>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.hasWarehouseBalance}
                        onChange={(e) => handleWarehouseCheckbox(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-800">
                        {formData.hasWarehouseBalance ? 'يوجد رصيد متوفر بالمخازن' : 'لا يوجد رصيد بالمخازن (تم الفحص والتحقق)'}
                      </span>
                    </label>

                    {formData.hasWarehouseBalance ? (
                      <div>
                        <input
                          type="text"
                          value={formData.warehouseBalanceDetails || ''}
                          onChange={(e) => handleWarehouseDetailsChange(e.target.value)}
                          placeholder="حدد الكميات المتوفرة بالمخزن وسبب طلب كميات إضافية..."
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                        />
                      </div>
                    ) : (
                      <div className="text-[11px] text-emerald-700 font-medium flex items-center gap-1.5 pt-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>تم التأكد رسمياً من عدم وجود رصيد يكفي الحاجة بالمخازن</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* TECHNICAL EVALUATION SYSTEM (Pass/Fail vs Points) */}
              <div className="p-4 bg-indigo-50/60 border-2 border-indigo-200 rounded-2xl space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-indigo-700" />
                    <div>
                      <span className="text-xs font-black text-indigo-900">نظام التقييم الفني المعتمد للعملية</span>
                      <p className="text-[11px] text-indigo-700/80">حدد ما إذا كان البت الفني بنظام النقاط والدرجات أو تقرير فني (مطابق / غير مطابق)</p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-indigo-200 text-indigo-900 px-2.5 py-0.5 rounded-full font-bold">
                    قانون 182 ولائحته
                  </span>
                </div>

                {/* 2 Main Evaluation System Choices */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, technicalEvaluationMethod: 'مطابق أو غير مطابق' }))}
                    className={`p-3.5 rounded-2xl border-2 text-right transition-all flex items-start gap-3 ${
                      formData.technicalEvaluationMethod === 'مطابق أو غير مطابق'
                        ? 'bg-white border-indigo-600 shadow-md ring-2 ring-indigo-500/20'
                        : 'bg-white/60 border-slate-200 hover:border-indigo-300 text-slate-600'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                      formData.technicalEvaluationMethod === 'مطابق أو غير مطابق' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300'
                    }`}>
                      {formData.technicalEvaluationMethod === 'مطابق أو غير مطابق' && <Check className="w-3 h-3 font-bold" />}
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-900">1. تقرير فني (مطابق أو غير مطابق للمواصفات)</div>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        يتم فحص العطاءات وقبول المطابق للشروط والمواصفات الفنية واستبعاد غير المطابق، والترسية على الأقل سعراً من المقبولين.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, technicalEvaluationMethod: 'نظام نقاط' }))}
                    className={`p-3.5 rounded-2xl border-2 text-right transition-all flex items-start gap-3 ${
                      formData.technicalEvaluationMethod === 'نظام نقاط'
                        ? 'bg-white border-indigo-600 shadow-md ring-2 ring-indigo-500/20'
                        : 'bg-white/60 border-slate-200 hover:border-indigo-300 text-slate-600'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                      formData.technicalEvaluationMethod === 'نظام نقاط' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300'
                    }`}>
                      {formData.technicalEvaluationMethod === 'نظام نقاط' && <Check className="w-3 h-3 font-bold" />}
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-900">2. نظام النقاط الفنية (درجات ومعايير تقييم)</div>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        يتم وضع درجات ومعايير محددة لكل بند وللعملية ككل، ويشترط اجتياز الحد الأدنى لدرجات القبول الفني لفتح المظروف المالي.
                      </p>
                    </div>
                  </button>
                </div>

                {/* If POINTS SYSTEM: Show Minimum Passing Score & Overall Criteria */}
                {isPointsSystem && (
                  <div className="p-4 bg-white border border-indigo-200 rounded-2xl space-y-3 animate-fadeIn">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          الحد الأدنى لدرجات القبول الفني للعملية ككل (%) *
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="50"
                            max="100"
                            name="minPassingScore"
                            value={formData.minPassingScore}
                            onChange={handleInputChange}
                            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-mono font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                          <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">من 100</span>
                        </div>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          معايير التقييم الفني العامة وأوزانها النسبية للعملية
                        </label>
                        <input
                          type="text"
                          name="technicalCriteriaNotes"
                          value={formData.technicalCriteriaNotes}
                          onChange={handleInputChange}
                          placeholder="مثال: الكفاءة الفنية 40%، سابقة الأعمال 30%، الضمان 20%، سرعة التوريد 10%"
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                    </div>

                    <div className="text-[11px] text-indigo-800 bg-indigo-50 p-2.5 rounded-xl font-medium flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>
                        ملاحظة: في القسم الثاني بجدول البنود، يمكنك تحديد مواصفات واشتراطات كل بند، والدرجات ومعايير التقييم الخاصة بكل بند على حدة.
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Technical Specifications Documentation & Notes */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-black text-slate-800">
                      وثائق المواصفات الفنية والاشتراطات العامة (Documentation)
                    </span>
                  </div>
                  <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full font-bold">
                    مستند رسمي معتمد
                  </span>
                </div>

                {/* Upload or View Specs Document */}
                <div className="bg-white p-3.5 rounded-xl border border-dashed border-indigo-200 hover:border-indigo-400 transition-colors">
                  {formData.specsFileName ? (
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                          <Paperclip className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                            <span>{formData.specsFileName}</span>
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-mono">
                              مرفق ✓
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {formData.specsFileSize ? `${(formData.specsFileSize / 1024).toFixed(1)} KB • ` : ''}
                            وثيقة المواصفات الفنية المعتمدة
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {formData.specsFilePath && (
                          <a
                            href={formData.specsFilePath.startsWith('http') ? formData.specsFilePath : `http://localhost:5000${formData.specsFilePath}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>معاينة / تحميل</span>
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={handleRemoveSpecsFile}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors"
                          title="حذف الملف المرفق"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>إلغاء المرفق</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center py-4 cursor-pointer text-center">
                      <FileUp className="w-8 h-8 text-indigo-500 mb-2 stroke-[1.5]" />
                      <span className="text-xs font-bold text-slate-700">
                        انقر هنا أو اسحب ملف المواصفات الفنية الكاملة (PDF / Word / صور)
                      </span>
                      <p className="text-[11px] text-slate-400 mt-1">
                        إرفاق مقايسة الأعمال أو كراسة المواصفات القياسية المفصلة
                      </p>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                        onChange={handleSpecsFileUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    ملخص المواصفات الفنية أو الاشتراطات العامة المكتوبة
                  </label>
                  <textarea
                    rows={2}
                    name="specsAndConditions"
                    value={formData.specsAndConditions}
                    onChange={handleInputChange}
                    placeholder="ملخص الشروط الفنية العامة، الماركات المقبولة، أو معايير الجودة..."
                    className="w-full p-3 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                  />
                </div>
              </div>

              {/* Sample Requirements Checkbox */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="requiresSample"
                    checked={formData.requiresSample}
                    onChange={handleInputChange}
                    className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-black text-slate-800">هل تتطلب العملية تقديم عينات فنية للاختبار والمعاينة؟</span>
                    <p className="text-[11px] text-slate-500">تقديم نموذج عينة لاختباره بالمعامل كشرط للقبول الفني</p>
                  </div>
                </label>

                {formData.requiresSample && (
                  <input
                    type="text"
                    name="sampleDetails"
                    value={formData.sampleDetails}
                    onChange={handleInputChange}
                    placeholder="حدد مواصفات العينة المطلوبة وعددها وميعاد تسليمها..."
                    className="flex-1 w-full md:w-auto px-4 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                )}
              </div>

              {/* Optional Warehouse Quick Search if supply */}
              {formData.operationType === 'توريدات' && (
                <div className="p-3.5 bg-sky-50/70 border border-sky-200 rounded-2xl flex items-center justify-between flex-wrap gap-2 text-xs">
                  <div className="flex items-center gap-2 text-sky-800 font-bold">
                    <Warehouse className="w-4 h-4 text-sky-600" />
                    <span>عملية توريدات: يمكنك التحقق السريع من رصيد المستودع والمخازن</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setShowInventoryBox(!showInventoryBox); if (!inventory.length) fetchInventory(); }}
                    className="px-3 py-1.5 bg-sky-600 text-white rounded-xl text-xs font-bold hover:bg-sky-700 transition-colors shadow-sm"
                  >
                    {showInventoryBox ? 'إخفاء فحص المخزن' : 'فحص المخزن أو الاستفسار'}
                  </button>
                </div>
              )}

              {showInventoryBox && (
                <div className="p-4 bg-white border border-sky-300 rounded-2xl space-y-3 shadow-inner">
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="بحث في المخازن باسم الصنف أو الكود..."
                      value={inventorySearch}
                      onChange={(e) => { setInventorySearch(e.target.value); fetchInventory(e.target.value); }}
                      className="flex-1 p-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                  {inventory.length > 0 ? (
                    <div className="max-h-40 overflow-y-auto divide-y text-xs border rounded-xl">
                      {inventory.map(item => (
                        <div key={item.ProductId} className="p-2.5 flex justify-between items-center hover:bg-sky-50">
                          <div>
                            <span className="font-bold text-slate-800">{item.ProductName}</span>
                            <span className="text-[10px] text-slate-400 mr-2 font-mono">({item.ProductCode})</span>
                          </div>
                          <div className="font-mono font-bold text-emerald-700">
                            الرصيد: {item.CurrentStock} {item.Unit}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 text-center py-2">لا توجد أصناف متطابقة في المخزن</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* --------------------------------------------------------------------- */}
          {/* SECTION 2: FINANCIAL REVIEW, PRICING & ITEMS WITH SPECS PER ITEM      */}
          {/* --------------------------------------------------------------------- */}
          <div className="bg-white rounded-3xl border border-emerald-100 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-50/80 via-white to-emerald-50/40 p-5 border-b border-emerald-100 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/30">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full">القسم الثاني</span>
                    <h2 className="text-base font-black text-slate-800">البيانات والمراجعة المالية وبنود العملية</h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">طريقة الطرح، القيمة، وجدول البنود مع شروط ومعايير التقييم الفني لكل بند</p>
                </div>
              </div>

              {/* Live Calculation Pill */}
              <div className="flex items-center gap-3 bg-emerald-950 text-emerald-300 px-4 py-2 rounded-2xl font-mono text-xs shadow-sm">
                <div>
                  <span className="text-slate-400">رمز العملية: </span>
                  <span className="font-black text-white">{computedSymbol}</span>
                </div>
                <div className="h-3 w-px bg-emerald-800" />
                <div>
                  <span className="text-slate-400">السلطة المختصة: </span>
                  <span className="font-black text-amber-300">{computedAuthority}</span>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">طريقة الطرح المقترحة *</label>
                  <select
                    name="tenderMethodSelected"
                    value={formData.tenderMethodSelected}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                  >
                    {(TENDER_METHODS_MAP[formData.operationType] || []).map(method => (
                      <option key={method} value={method}>{method}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">القيمة التقديرية الإجمالية (ج.م) *</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    name="estimatedValue"
                    value={formData.estimatedValue}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-mono font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">قيمة الحجز المالي المبدئي (ج.م)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    name="preliminaryReservation"
                    value={formData.preliminaryReservation}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">نوع الحجز المالي</label>
                  <select
                    name="reservationTypeNew"
                    value={formData.reservationTypeNew}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white font-medium"
                  >
                    <option value="جاري">موازنة جارية</option>
                    <option value="استثماري">موازنة استثمارية</option>
                    <option value="موازنة الشركة">موازنة الشركة التقديرية</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">رقم مذكرة حجز الموازنة</label>
                  <input
                    type="text"
                    name="budgetHoldReference"
                    value={formData.budgetHoldReference}
                    onChange={handleInputChange}
                    placeholder="مثال: م.ح/2025/114"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                {/* Initial Guarantee Amount (خانة رقم نقدي بالجنيه) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700">قيمة التأمين الابتدائي (ج.م) *</label>
                    {parseFloat(formData.estimatedValue) > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const est = parseFloat(formData.estimatedValue) || 0;
                          const amt = Math.round(est * 0.015);
                          handleGuaranteeAmountChange(amt);
                        }}
                        className="text-[10px] text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded font-bold transition-colors"
                        title="احتساب نسبة 1.5% تلقائياً من القيمة التقديرية طبقاً للمادة 35 من قانون 182"
                      >
                        احتساب 1.5% ⚡
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      name="initialGuaranteeAmount"
                      value={formData.initialGuaranteeAmount ?? ''}
                      onChange={(e) => handleGuaranteeAmountChange(e.target.value)}
                      placeholder="مثال: 15000"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-mono font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                    <span className="absolute left-3.5 top-2.5 text-xs text-slate-400 font-bold">ج.م</span>
                  </div>
                  {parseFloat(formData.estimatedValue) > 0 && formData.initialGuaranteeAmount ? (
                    <p className="text-[10px] text-slate-500 mt-1 font-mono">
                      يمثل نسبة: <span className="font-bold text-emerald-700">{formData.initialGuaranteePercent || ((formData.initialGuaranteeAmount / formData.estimatedValue) * 100).toFixed(1)}%</span> (الحد الأقصى القانوني 2%)
                    </p>
                  ) : (
                    <p className="text-[10px] text-slate-400 mt-1">
                      مبلغ نقدي محدد بالجنيه (بحد أقصى 2% من القيمة التقديرية)
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">طريقة تقديم العطاءات</label>
                  <select
                    name="submittalType"
                    value={formData.submittalType}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white font-medium"
                  >
                    <option value="مظروفيين">مظروفين (فني ومالي منفصلين)</option>
                    <option value="مظروف واحد">مظروف واحد مدمج</option>
                  </select>
                </div>

                {/* Booklet Price with Auto Calculation Helper */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700">ثمن كراسة الشروط (ج.م) *</label>
                    <button
                      type="button"
                      onClick={handleCalculateStandardBookletPrice}
                      className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-100 hover:bg-emerald-200 px-2 py-0.5 rounded-md transition-colors flex items-center gap-1"
                      title="حساب سعر الكراسة آلياً طبقاً لفئات المادة 23 من قانون 182"
                    >
                      <Calculator className="w-3 h-3" />
                      <span>حساب تلقائي ⚡</span>
                    </button>
                  </div>
                  <input
                    type="number"
                    min="0"
                    name="bookletPrice"
                    value={formData.bookletPrice}
                    onChange={handleInputChange}
                    placeholder="مثال: 500 أو 1000"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                  />
                  <p className="text-[10px] text-slate-400">
                    يحدد ثمن الكراسة بما يغطي التكلفة الفعلية لطباعتها وإعدادها
                  </p>
                </div>

                {formData.operationType === 'تعاقدات' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">شعبة وفئة تصنيف الاتحاد</label>
                    <input
                      type="text"
                      name="constructionDivision"
                      value={formData.constructionDivision}
                      onChange={handleInputChange}
                      placeholder="مثال: شبكات المياه والصرف - فئة رابعة"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Operation Items / Bill of Quantities with Tech Specs per Item */}
              <div className="bg-slate-50 p-4 rounded-3xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-emerald-600" />
                    <div>
                      <span className="text-xs font-black text-slate-800">
                        جدول بنود وكميات العملية وشروط ومعايير تقييم كل بند
                      </span>
                      <p className="text-[11px] text-slate-500">
                        {isPointsSystem
                          ? 'نظام نقاط: حدد مواصفات البند الفنية والدرجات ومعايير التقييم الخاصة بكل بند'
                          : 'تقرير فني: حدد مواصفات واشتراطات كل بند للتحقق من المطابقة الفنية'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSumItemsToEstimatedValue}
                      className="text-xs bg-emerald-100 text-emerald-800 hover:bg-emerald-200 px-3 py-1.5 rounded-xl font-bold transition-colors"
                      title="تجميع إجمالي أسعار البنود وتحديث القيمة التقديرية للعملية"
                    >
                      حساب الإجمالي للقيمة التقديرية ⚡
                    </button>
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="flex items-center gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>إضافة بند</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {operationItems.map((item, idx) => {
                    const rowTotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0);
                    return (
                      <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-3 shadow-xs">
                        {/* Main Item Row */}
                        <div className="grid grid-cols-12 gap-2 items-center text-xs">
                          <div className="col-span-1 text-center font-black text-slate-500">
                            #{idx + 1}
                          </div>

                          <div className="col-span-4">
                            <label className="block text-[10px] text-slate-500 mb-0.5">بيان وتوصيف البند</label>
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                              placeholder="اسم ووصف البند..."
                              className="w-full p-2 border rounded-xl text-xs font-bold outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>

                          <div className="col-span-2">
                            <label className="block text-[10px] text-slate-500 mb-0.5">الوحدة</label>
                            <input
                              type="text"
                              value={item.unit}
                              onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                              className="w-full p-2 border rounded-xl text-xs text-center outline-none"
                            />
                          </div>

                          <div className="col-span-2">
                            <label className="block text-[10px] text-slate-500 mb-0.5">الكمية</label>
                            <input
                              type="number"
                              min="0"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                              className="w-full p-2 border rounded-xl text-xs font-mono text-center outline-none"
                            />
                          </div>

                          <div className="col-span-2">
                            <label className="block text-[10px] text-slate-500 mb-0.5">السعر التقديري</label>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={item.unitPrice}
                              onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                              className="w-full p-2 border rounded-xl text-xs font-mono text-center outline-none font-bold"
                            />
                          </div>

                          <div className="col-span-1 text-center">
                            {operationItems.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                                title="حذف البند"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Sub Row: Total & Expand Toggle */}
                        <div className="flex items-center justify-between pt-1 border-t text-xs">
                          <div className="flex items-center gap-4">
                            <div>
                              <span className="text-slate-500">إجمالي البند: </span>
                              <span className="font-mono font-black text-emerald-700">{rowTotal.toLocaleString()} ج.م</span>
                            </div>

                            {/* Status tag */}
                            {isPointsSystem ? (
                              <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-md font-bold">
                                تقييم بنظام النقاط: {item.itemMinPassingScore || 70} / {item.itemMaxScore || 100} درجة
                              </span>
                            ) : (
                              <span className="text-[10px] bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5 rounded-md font-bold">
                                فحص مطابق / غير مطابق
                              </span>
                            )}

                            {formData.allowSplitAwarding && (
                              <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md font-bold">
                                يقبل الترسية المستقلة لمورد منفصل ✓
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleToggleExpandItem(idx)}
                            className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-colors"
                          >
                            <span>{item.isExpanded ? 'إخفاء الشروط الفنية والمعايير' : 'تحديد شروط ومعايير تقييم البند'}</span>
                            {item.isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </div>

                        {/* Collapsible Detailed Tech Specs & Points per Item */}
                        {item.isExpanded && (
                          <div className="p-3.5 bg-slate-50 border border-indigo-200 rounded-xl space-y-3 text-xs animate-fadeIn">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                المواصفات والاشتراطات الفنية الخاصة بهذا البند:
                              </label>
                              <textarea
                                rows={2}
                                value={item.specs}
                                onChange={(e) => handleItemChange(idx, 'specs', e.target.value)}
                                placeholder="المواصفات الفنية المعتمدة للبند، الكفاءة، بلد المنشأ، أو الشهادات المطلوبة لهذا الصنف..."
                                className="w-full p-2 border rounded-xl text-xs bg-white focus:ring-1 focus:ring-indigo-500 outline-none"
                              />
                            </div>

                            {/* If Points System: Specific Scores & Criteria for this item */}
                            {isPointsSystem && (
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white p-3 rounded-xl border border-slate-200">
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                                    الدرجة القصوى للبند
                                  </label>
                                  <input
                                    type="number"
                                    min="10"
                                    max="100"
                                    value={item.itemMaxScore}
                                    onChange={(e) => handleItemChange(idx, 'itemMaxScore', e.target.value)}
                                    className="w-full p-1.5 border rounded-lg text-xs font-mono text-center outline-none"
                                  />
                                </div>

                                <div>
                                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                                    درجة النجاح والقبول للبند
                                  </label>
                                  <input
                                    type="number"
                                    min="10"
                                    max="100"
                                    value={item.itemMinPassingScore}
                                    onChange={(e) => handleItemChange(idx, 'itemMinPassingScore', e.target.value)}
                                    className="w-full p-1.5 border rounded-lg text-xs font-mono text-center font-bold text-purple-700 outline-none"
                                  />
                                </div>

                                <div className="md:col-span-2">
                                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                                    معايير وتوزيع درجات تقييم هذا البند
                                  </label>
                                  <input
                                    type="text"
                                    value={item.itemCriteria}
                                    onChange={(e) => handleItemChange(idx, 'itemCriteria', e.target.value)}
                                    placeholder="مثال: المنشأ والجودة (30)، الكفاءة (30)، الضمان (25)، التوريد (15)"
                                    className="w-full p-1.5 border rounded-lg text-xs outline-none"
                                  />
                                </div>
                              </div>
                            )}

                            {/* Item Actions */}
                            <div className="flex items-center justify-between pt-1">
                              {operationItems.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleApplyCriteriaToAll(idx)}
                                  className="text-[10px] font-bold text-indigo-700 hover:text-indigo-900 bg-white border border-indigo-200 px-2.5 py-1 rounded-lg transition-colors mr-auto"
                                >
                                  تطبيق معايير هذا البند على جميع البنود ⚡
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">ملاحظات وتوجيهات الشئون المالية</label>
                <textarea
                  rows={2}
                  name="financialNotes"
                  value={formData.financialNotes}
                  onChange={handleInputChange}
                  placeholder="أي ملاحظات مالية بخصوص الصرف أو بنود الخصم أو التأشيرات..."
                  className="w-full p-3 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* --------------------------------------------------------------------- */}
          {/* SECTION 3: PAPER APPROVALS & FINAL AUTHORITY DECISION                 */}
          {/* --------------------------------------------------------------------- */}
          <div className="bg-white rounded-3xl border border-purple-100 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-purple-50/80 via-white to-purple-50/40 p-5 border-b border-purple-100 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/30">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-purple-100 text-purple-800 text-[10px] font-black px-2 py-0.5 rounded-full">القسم الثالث</span>
                    <h2 className="text-base font-black text-slate-800">الموافقات الورقية واعتماد السلطة المختصة</h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">تسجيل حالة أخذ الموافقة المالية الورقية والقرار النهائي للسلطة المختصة</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">

              {/* Sub-part A: Financial Position (تسجيل موقف المالية) */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Stamp className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-black text-slate-800">أولاً: تسجيل موقف الإدارة المالية (تأشيرة الموازنة) *</span>
                  </div>
                  <span className="text-[11px] text-purple-800 bg-purple-100 font-bold px-2.5 py-1 rounded-lg">
                    {formData.financialStatus === 'APPROVED' ? 'الحالة: معتمد مالياً ✓' : formData.financialStatus === 'REJECTED' ? 'الحالة: غير معتمد ✕' : 'الحالة: قيد المراجعة ⏳'}
                  </span>
                </div>

                {/* 3 Status Cards for Financial Position */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Option 1: Approved */}
                  <button
                    type="button"
                    onClick={() => handleFinancialStatusSelect('APPROVED')}
                    className={`p-3.5 rounded-2xl border-2 text-right transition-all flex flex-col justify-between gap-2 ${
                      formData.financialStatus === 'APPROVED'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20 ring-2 ring-emerald-500/30'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-black text-xs">معتمد مالياً ✓</span>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${formData.financialStatus === 'APPROVED' ? 'bg-white text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                        <Check className="w-3 h-3 font-black" />
                      </div>
                    </div>
                    <p className={`text-[11px] leading-relaxed ${formData.financialStatus === 'APPROVED' ? 'text-emerald-100' : 'text-slate-500'}`}>
                      تمت الموافقة وتأشيرة الموازنة وحجز الاعتماد المالي للعملية.
                    </p>
                  </button>

                  {/* Option 2: Pending */}
                  <button
                    type="button"
                    onClick={() => handleFinancialStatusSelect('PENDING')}
                    className={`p-3.5 rounded-2xl border-2 text-right transition-all flex flex-col justify-between gap-2 ${
                      formData.financialStatus === 'PENDING'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-600/20 ring-2 ring-amber-500/30'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-amber-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-black text-xs">قيد المراجعة المالية</span>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${formData.financialStatus === 'PENDING' ? 'bg-white text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
                        <Clock className="w-3 h-3" />
                      </div>
                    </div>
                    <p className={`text-[11px] leading-relaxed ${formData.financialStatus === 'PENDING' ? 'text-amber-100' : 'text-slate-500'}`}>
                      الطلب معلق قيد التدقيق المالي لحين التحقق من توفر الاعتماد.
                    </p>
                  </button>

                  {/* Option 3: Rejected */}
                  <button
                    type="button"
                    onClick={() => handleFinancialStatusSelect('REJECTED')}
                    className={`p-3.5 rounded-2xl border-2 text-right transition-all flex flex-col justify-between gap-2 ${
                      formData.financialStatus === 'REJECTED'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-600/20 ring-2 ring-rose-500/30'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-rose-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-black text-xs">غير معتمد / اعتذار</span>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${formData.financialStatus === 'REJECTED' ? 'bg-white text-rose-600' : 'bg-slate-100 text-slate-400'}`}>
                        <X className="w-3 h-3 font-black" />
                      </div>
                    </div>
                    <p className={`text-[11px] leading-relaxed ${formData.financialStatus === 'REJECTED' ? 'text-rose-100' : 'text-slate-500'}`}>
                      اعتذار لعدم توفر اعتماد مالي بالموازنة المخصصة لهذا العام.
                    </p>
                  </button>
                </div>

                {/* Financial Position Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 bg-white p-3.5 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      رقم التأشيرة / مذكرة حجز الموازنة
                    </label>
                    <input
                      type="text"
                      name="budgetHoldReference"
                      value={formData.budgetHoldReference}
                      onChange={handleInputChange}
                      placeholder="مثال: م.ح/2025/114 أو تأشيرة 45"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      تاريخ التأشيرة أو الموافقة المالية
                    </label>
                    <input
                      type="date"
                      name="financialApprovalDate"
                      value={formData.financialApprovalDate}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500 outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      المراقب أو المسئول المالي القائم بالتأشيرة
                    </label>
                    <input
                      type="text"
                      name="financialOfficerName"
                      value={formData.financialOfficerName || ''}
                      onChange={handleInputChange}
                      placeholder="اسم المراقب أو المدير المالي..."
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Sub-part B: Authority Decision */}
              <div className="p-4 bg-purple-50/50 rounded-2xl border border-purple-200 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-purple-700" />
                    <span className="text-xs font-black text-purple-900">ثانياً: اعتماد وقرار السلطة المختصة</span>
                  </div>
                  <div className="text-xs font-black bg-purple-100 text-purple-800 px-3 py-1 rounded-xl">
                    السلطة المقررة: {formData.approvalAuthority || computedAuthority}
                  </div>
                </div>

                {/* Decision Radio/Buttons */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">قرار الاعتماد النهائي *</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, authorityApprovalStatus: 'معتمد' }))}
                      className={`p-3.5 rounded-2xl border-2 text-xs font-black transition-all flex items-center justify-between ${
                        formData.authorityApprovalStatus === 'معتمد'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>معتمد وموافق عليه (جاهز للطرح)</span>
                      </div>
                      {formData.authorityApprovalStatus === 'معتمد' && <Check className="w-4 h-4" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, authorityApprovalStatus: 'مرفوض' }))}
                      className={`p-3.5 rounded-2xl border-2 text-xs font-black transition-all flex items-center justify-between ${
                        formData.authorityApprovalStatus === 'مرفوض'
                          ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-600/20'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-rose-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-rose-300" />
                        <span>مرفوض (إعادة تقديم من الأول)</span>
                      </div>
                      {formData.authorityApprovalStatus === 'مرفوض' && <X className="w-4 h-4" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, authorityApprovalStatus: 'في انتظار الموافقة' }))}
                      className={`p-3.5 rounded-2xl border-2 text-xs font-black transition-all flex items-center justify-between ${
                        formData.authorityApprovalStatus === 'في انتظار الموافقة'
                          ? 'bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-600/20'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-amber-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-300" />
                        <span>قيد الانتظار والمراجعة الورقية</span>
                      </div>
                      {formData.authorityApprovalStatus === 'في انتظار الموافقة' && <Check className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* When REJECTED: Show Mandatory Rejection Reason */}
                {formData.authorityApprovalStatus === 'مرفوض' && (
                  <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl space-y-2 animate-fadeIn">
                    <div className="flex items-center gap-2 text-rose-800 font-black text-xs">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>تنبيه هام: الطلب المرفوض لن يظهر نهائياً في شاشة الطرح وستقوم الإدارة الطالبة بتقديم طلب جديد</span>
                    </div>
                    <label className="block text-xs font-bold text-rose-900">سبب الرفض بالتفصيل * (إلزامي)</label>
                    <textarea
                      rows={3}
                      required
                      name="authorityRejectionReason"
                      value={formData.authorityRejectionReason}
                      onChange={handleInputChange}
                      placeholder="اكتب أسباب رفض الطلب هنا ليتم تسجيلها..."
                      className="w-full p-3 rounded-xl border border-rose-300 text-sm focus:ring-2 focus:ring-rose-500 outline-none bg-white"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">تاريخ قرار السلطة المختصة</label>
                    <input
                      type="date"
                      name="authorityApprovalDate"
                      value={formData.authorityApprovalDate}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500 outline-none bg-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">القائم بالاعتماد / ممثل السلطة المختصة</label>
                    <input
                      type="text"
                      name="reviewedBy"
                      value={formData.reviewedBy}
                      onChange={handleInputChange}
                      placeholder="مثال: السيد المهندس / رئيس مجلس الإدارة"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500 outline-none bg-white font-medium"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          {errorMessage && (
            <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl flex items-center justify-between text-rose-800 text-xs font-bold shadow-sm animate-fadeIn">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>تعذر الحفظ: {errorMessage}</span>
              </div>
              <button type="button" onClick={() => setErrorMessage('')} className="text-rose-600 hover:text-rose-800"><X className="w-4 h-4" /></button>
            </div>
          )}

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <CheckCircle2 className="w-5 h-5" />
                )}
                <span>{editingRequestId ? 'حفظ التعديلات على الطلب' : 'حفظ واعتماد طلب الاحتياج'}</span>
              </button>

              {editingRequestId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-sm transition-colors"
                >
                  إلغاء التعديل
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 text-slate-400 hover:text-slate-600 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>تفريغ الحقول</span>
            </button>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: REQUESTS REGISTRY & DETAILED FOLLOW-UP                             */}
      {/* ========================================================================= */}
      {activeTab === 'list' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
          <div className="flex items-center justify-between flex-wrap gap-4 border-b pb-4">
            <div>
              <h2 className="text-lg font-black text-slate-800">سجل ومتابعة طلبات الاحتياج</h2>
              <p className="text-xs text-slate-500">استعراض كافة الطلبات المقدمة ومتابعة التقييم الفني، الموافقات المالية واعتماد السلطة</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => { resetForm(); setActiveTab('form'); }}
                className="flex items-center gap-1.5 bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>طلب جديد</span>
              </button>
              <button
                onClick={fetchRequests}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                title="تحديث البيانات"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search & Status Filters */}
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث باسم العملية، الجهة الطالبة، أو رقم العملية..."
                className="w-full pr-10 pl-4 py-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${statusFilter === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                الكل ({requestsList.length})
              </button>
              <button
                onClick={() => setStatusFilter('APPROVED')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${statusFilter === 'APPROVED' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
              >
                معتمدة جاهزة للطرح ({requestsList.filter(r => r.WorkflowStatus === 'معتمد' || r.AuthorityApprovalStatus === 'معتمد').length})
              </button>
              <button
                onClick={() => setStatusFilter('PENDING')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${statusFilter === 'PENDING' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'}`}
              >
                قيد المراجعة ({requestsList.filter(r => r.WorkflowStatus !== 'معتمد' && r.WorkflowStatus !== 'مرفوض').length})
              </button>
              <button
                onClick={() => setStatusFilter('REJECTED')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${statusFilter === 'REJECTED' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'}`}
              >
                مرفوضة ❌ ({requestsList.filter(r => r.WorkflowStatus === 'مرفوض' || r.AuthorityApprovalStatus === 'مرفوض').length})
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="border border-slate-200 rounded-2xl overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b">
                <tr>
                  <th className="p-3 font-bold">#</th>
                  <th className="p-3 font-bold">اسم وموضوع العملية</th>
                  <th className="p-3 font-bold">النوع والجهة</th>
                  <th className="p-3 font-bold">نظام التقييم الفني</th>
                  <th className="p-3 font-bold">القيمة التقديرية</th>
                  <th className="p-3 font-bold">الموافقة المالية</th>
                  <th className="p-3 font-bold">اعتماد السلطة</th>
                  <th className="p-3 font-bold">موقف الطرح</th>
                  <th className="p-3 font-bold text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400">
                      <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      جاري تحميل الطلبات...
                    </td>
                  </tr>
                ) : filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400">
                      لا توجد طلبات احتياج مطابقة لمعايير البحث
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map(req => {
                    const isRejected = req.WorkflowStatus === 'مرفوض' || req.AuthorityApprovalStatus === 'مرفوض';
                    const isApproved = req.WorkflowStatus === 'معتمد' || req.AuthorityApprovalStatus === 'معتمد';
                    const isTendered = req.Status === 'مطروح';
                    const isPoints = req.TechnicalEvaluationMethod === 'نظام نقاط';

                    return (
                      <tr key={req.RequestId} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3 font-mono font-bold text-slate-400">#{req.RequestId}</td>
                        <td className="p-3">
                          <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                            <span>{req.OperationName}</span>
                            {req.SpecsFileName && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded font-medium" title={req.SpecsFileName}>
                                <Paperclip className="w-2.5 h-2.5" />
                                <span>وثيقة</span>
                              </span>
                            )}
                          </div>
                          {req.FinancialOperationNumber && (
                            <div className="text-[11px] font-mono text-indigo-600 font-bold">
                              رقم: {req.FinancialOperationNumber}
                            </div>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-slate-700">{req.RequestingDepartment}</div>
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold">
                            {req.OperationType}
                          </span>
                        </td>
                        <td className="p-3">
                          {isPoints ? (
                            <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded font-bold text-[10px]">
                              <Award className="w-3 h-3 text-purple-600" />
                              <span>نظام نقاط ({req.MinPassingScore || 70}%)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5 rounded font-bold text-[10px]">
                              <span>مطابق / غير مطابق</span>
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-mono font-bold text-emerald-700">
                          {req.EstimatedValue ? `${Number(req.EstimatedValue).toLocaleString()} ج.م` : '---'}
                        </td>
                        <td className="p-3">
                          {req.FinancialApprovalObtained !== 0 ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-bold text-[11px]">
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>تمت ور قياً</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded font-bold text-[11px]">
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span>قيد المراجعة</span>
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          {isRejected ? (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 border border-rose-300 px-2.5 py-0.5 rounded-full font-bold text-[11px]">
                                <X className="w-3 h-3" />
                                <span>مرفوض</span>
                              </span>
                              {req.AuthorityRejectionReason && (
                                <p className="text-[10px] text-rose-700 line-clamp-1 max-w-xs" title={req.AuthorityRejectionReason}>
                                  السبب: {req.AuthorityRejectionReason}
                                </p>
                              )}
                            </div>
                          ) : isApproved ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 rounded-full font-bold text-[11px]">
                              <Check className="w-3 h-3" />
                              <span>معتمد</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-0.5 rounded-full font-bold text-[11px]">
                              <Clock className="w-3 h-3" />
                              <span>في انتظار الاعتماد</span>
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          {isTendered ? (
                            <span className="text-xs text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded font-bold">
                              تم الطرح ✓
                            </span>
                          ) : isRejected ? (
                            <span className="text-[10px] text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                              غير قابل للطرح 🚫
                            </span>
                          ) : isApproved ? (
                            <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              جاهز للطرح ⚡
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">معلق</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => handleEditRequest(req)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 rounded-lg font-bold text-xs transition-colors"
                              title="تعديل أو استكمال بيانات الطلب"
                            >
                              تعديل
                            </button>

                            {/* Tender action: ONLY for approved and NOT tendered and NOT rejected */}
                            {isApproved && !isTendered && !isRejected && (
                              <button
                                type="button"
                                onClick={() => navigate(`/tenders?requestId=${req.RequestId}`)}
                                className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-bold text-xs shadow-sm transition-all"
                                title="الانتقال لشاشة الطرح وتوليد العملية"
                              >
                                طرح ⚡
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleDeleteRequest(req.RequestId)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="أرشفة الطلب"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
