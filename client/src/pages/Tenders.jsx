import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import { 
  FileSpreadsheet, 
  Calculator, 
  Newspaper, 
  Building2, 
  CheckCircle2, 
  Printer, 
  HelpCircle,
  FileText,
  Bell,
  Upload,
  Download,
  FileCheck2,
  Trash2,
  AlertTriangle,
  X,
  Eye,
  Check,
  ExternalLink,
  ShieldCheck,
  Paperclip,
  Users,
  UserPlus,
  Plus,
  ChevronDown,
  ChevronUp,
  Layers,
  Award,
  Sparkles,
  Search,
  Scale,
  ArrowRight,
  ArrowLeft,
  Settings2,
  ListPlus,
  CheckSquare,
  HelpCircle as QuestionIcon
} from 'lucide-react';

// Default Rubric Templates for Technical Evaluation
const CRITERIA_TEMPLATES = {
  origin: {
    name: 'بلد المنشأ وجودة التصنيع',
    maxScore: 30,
    options: [
      { id: 1, label: 'صنع في دول الاتحاد الأوروبي (أوروبي)', score: 30 },
      { id: 2, label: 'صنع في ألمانيا / اليابان', score: 20 },
      { id: 3, label: 'صنع في الولايات المتحدة الأمريكية', score: 10 },
      { id: 4, label: 'صنع محلي معتمد / منشأ آخر مطابق للمواصفات', score: 5 }
    ]
  },
  warranty: {
    name: 'فترة الضمان والصيانة المجانية',
    maxScore: 30,
    options: [
      { id: 1, label: 'ضمان 5 سنوات فما فوق شامل قطع الغيار والصيانة الدورية', score: 30 },
      { id: 2, label: 'ضمان 3 سنوات شامل قطع الغيار', score: 20 },
      { id: 3, label: 'ضمان سنتين (الحد الأدنى المطلوب)', score: 10 }
    ]
  },
  delivery: {
    name: 'مدة التوريد والتسليم للموقع',
    maxScore: 20,
    options: [
      { id: 1, label: 'توريد فوري خلال 15 يوماً من أمر التوريد', score: 20 },
      { id: 2, label: 'توريد خلال شهر واحد', score: 15 },
      { id: 3, label: 'توريد خلال شهرين فما فوق', score: 5 }
    ]
  },
  experience: {
    name: 'سابقة الخبرة والمشروعات المماثلة',
    maxScore: 20,
    options: [
      { id: 1, label: 'سابقة أعمال معتمدة لأكثر من 5 مشروعات كبرى بقطاع مياه الشرب والصرف', score: 20 },
      { id: 2, label: 'من 2 إلى 4 مشروعات مماثلة معتمدة', score: 12 },
      { id: 3, label: 'مشروع واحد مماثل معتمد', score: 5 }
    ]
  }
};

export default function Tenders() {
  const [searchParams] = useSearchParams();
  const requestIdParam = searchParams.get('requestId');

  const [tenders, setTenders] = useState([]);
  const [needsRequests, setNeedsRequests] = useState([]);
  const [registeredVendors, setRegisteredVendors] = useState([]);

  // Active Tab State to clean up UI clutter
  const [activeTab, setActiveTab] = useState('basic'); // 'basic' | 'procedure' | 'items' | 'invited'

  // Form State: Needs Request Link
  const [selectedRequestId, setSelectedRequestId] = useState(requestIdParam || '');

  // Synchronized & Editable Fields from NeedsRequest
  const [tenderName, setTenderName] = useState('');
  const [operationType, setOperationType] = useState('توريدات');
  const [requestingDepartment, setRequestingDepartment] = useState('');
  const [executionDuration, setExecutionDuration] = useState('');
  const [specsAndConditions, setSpecsAndConditions] = useState('');
  const [warehouseBalance, setWarehouseBalance] = useState('');
  const [fiscalYear, setFiscalYear] = useState('2025/2026');
  const [budgetHoldReference, setBudgetHoldReference] = useState('');
  const [reservationType, setReservationType] = useState('موازنة الشركة');
  const [estimatedValue, setEstimatedValue] = useState(0);

  // Technical Evaluation & Split Awarding
  const [evaluationMethod, setEvaluationMethod] = useState('مطابق أو غير مطابق');
  const [passingScoreDecimal, setPassingScoreDecimal] = useState(70);
  const [allowSplitAwarding, setAllowSplitAwarding] = useState(true);
  const [technicalCriteriaNotes, setTechnicalCriteriaNotes] = useState('');

  // Samples & Construction
  const [requiresSample, setRequiresSample] = useState(false);
  const [sampleDetails, setSampleDetails] = useState('');
  const [constructionDivision, setConstructionDivision] = useState('');
  const [constructionCategory, setConstructionCategory] = useState('');

  // Paper Financial Approval Sync
  const [financialApprovalObtained, setFinancialApprovalObtained] = useState(false);
  const [financialApprovalDate, setFinancialApprovalDate] = useState('');
  const [financialApprovalNotes, setFinancialApprovalNotes] = useState('');

  // Tender Procedure & Dates
  const [tenderMethod, setTenderMethod] = useState('مناقصة عامة');
  const [baseBookletPrice, setBaseBookletPrice] = useState(100);
  const [initialGuaranteeAmount, setInitialGuaranteeAmount] = useState(5000);
  const [envelopeOpeningDate, setEnvelopeOpeningDate] = useState('');
  const [adNewspaper1, setAdNewspaper1] = useState('الأهرام');
  const [adNewspaper2, setAdNewspaper2] = useState('الأخبار');
  const [adPublishDate, setAdPublishDate] = useState('');
  const [adDetails, setAdDetails] = useState('');

  // Editable Items Table with Detailed Criteria & Sub-Options Rubric
  const [items, setItems] = useState([
    {
      id: 1,
      itemDescription: '',
      unit: 'عدد',
      estimatedQuantity: 1,
      estimatedUnitPrice: 0,
      estimatedTotalPrice: 0,
      notes: '',
      itemSpecs: '',
      itemMaxScore: 100,
      itemMinPassingScore: 70,
      allowSplit: true,
      criteriaList: [
        JSON.parse(JSON.stringify(CRITERIA_TEMPLATES.origin)),
        JSON.parse(JSON.stringify(CRITERIA_TEMPLATES.warranty)),
        JSON.parse(JSON.stringify(CRITERIA_TEMPLATES.delivery)),
        JSON.parse(JSON.stringify(CRITERIA_TEMPLATES.experience))
      ]
    }
  ]);
  const [expandedItemId, setExpandedItemId] = useState(0);

  // Limited Tenders / Practices: Invited Vendors List
  const [invitedVendors, setInvitedVendors] = useState([]);
  const [selectedVendorForInvite, setSelectedVendorForInvite] = useState('');
  const [newInvitedForm, setNewInvitedForm] = useState({
    vendorName: '',
    vendorType: 'مورد',
    taxCardNo: '',
    commercialRegisterNo: '',
    phone: '',
    email: '',
    invitationMethod: 'بريد مسجل بعلم الوصول',
    invitationLetterNo: '',
    invitationDate: new Date().toISOString().split('T')[0],
    responseStatus: 'تم توجيه الدعوة',
    notes: ''
  });

  // Booklet Document File upload for new tender
  const [bookletFile, setBookletFile] = useState(null); // { fileName, fileData, fileSize }
  const fileInputRef = useRef(null);

  // Live Booklet Calculation
  const [bookletCalc, setBookletCalc] = useState({
    basePrice: 100,
    adminFees: 20,
    postalStamp: 5,
    mapsFees: 0,
    subtotal: 125,
    vat: 17.5,
    takafulStamp: 10,
    shaheedStamp: 5,
    rawSum: 157.5,
    finalPrice: 160,
    miscIncome: 2.5
  });

  const [pendingApprovedRequests, setPendingApprovedRequests] = useState([]);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [rejectedAlert, setRejectedAlert] = useState(null);

  // Official Booklet Modal State (Printable / Exportable document)
  const [selectedTenderForBooklet, setSelectedTenderForBooklet] = useState(null);
  const [tenderItemsForBooklet, setTenderItemsForBooklet] = useState([]);
  const [tenderInvitedForBooklet, setTenderInvitedForBooklet] = useState([]);

  // Upload modal for existing tender
  const [uploadModalTender, setUploadModalTender] = useState(null);
  const [modalFile, setModalFile] = useState(null);
  const [uploadingModal, setUploadingModal] = useState(false);

  // Check whether current tender method is a limited method
  const isLimitedMethod = ['ممارسة محدودة', 'مناقصة محدودة', 'ممارسة محلية', 'أمر مباشر', 'مزايدة محدودة'].includes(tenderMethod);

  useEffect(() => {
    fetchData();
    fetchApprovedRequests();
  }, []);

  useEffect(() => {
    if (requestIdParam && needsRequests.length > 0) {
      const targetReq = needsRequests.find(r => r.RequestId == requestIdParam);
      if (targetReq) {
        if (targetReq.WorkflowStatus === 'مرفوض' || targetReq.AuthorityApprovalStatus === 'مرفوض') {
          setRejectedAlert(`عفواً! طلب الاحتياج رقم #${requestIdParam} مرفوض من قِبل السلطة المختصة (السبب: ${targetReq.AuthorityRejectionReason || 'لم يحدد'}). لا يمكن طرح العمليات المرفوضة ويجب على الإدارة تقديم طلب جديد.`);
          setSelectedRequestId('');
        } else {
          setSelectedRequestId(requestIdParam);
          setRejectedAlert(null);
        }
      }
    }
  }, [requestIdParam, needsRequests]);

  // Synchronize and auto-fill ALL fields when a Needs Request is selected
  useEffect(() => {
    if (!selectedRequestId) return;
    const targetReq = needsRequests.find(r => String(r.RequestId) === String(selectedRequestId));
    if (targetReq) {
      setTenderName(targetReq.OperationName || '');
      setOperationType(targetReq.OperationType || 'توريدات');
      setRequestingDepartment(targetReq.RequestingDepartment || '');
      setExecutionDuration(targetReq.ExecutionDuration || '');
      setSpecsAndConditions(targetReq.SpecsAndConditions || '');
      setWarehouseBalance(targetReq.WarehouseBalance || '');
      setFiscalYear(targetReq.FiscalYear || '2025/2026');
      setBudgetHoldReference(targetReq.BudgetHoldReference || '');
      setReservationType(targetReq.ReservationTypeNew || targetReq.ReservationType || 'موازنة الشركة');
      setEstimatedValue(Number(targetReq.EstimatedValue || 0));

      if (targetReq.TenderMethodSelected) {
        setTenderMethod(targetReq.TenderMethodSelected);
      }

      setEvaluationMethod(targetReq.TechnicalEvaluationMethod || 'مطابق أو غير مطابق');
      setPassingScoreDecimal(targetReq.MinPassingScore || 70);
      setAllowSplitAwarding(
        targetReq.AllowSplitAwarding === 1 || 
        targetReq.AllowSplitAwarding === true || 
        targetReq.OperationType === 'توريدات'
      );
      setTechnicalCriteriaNotes(targetReq.TechnicalCriteriaNotes || '');

      setRequiresSample(targetReq.RequiresSample === 1 || targetReq.RequiresSample === true);
      setSampleDetails(targetReq.SampleDetails || '');

      setConstructionDivision(targetReq.ConstructionDivision || targetReq.ConstructionBranch || '');
      setConstructionCategory(targetReq.ConstructionCategory || targetReq.RequiredGrade || '');

      setFinancialApprovalObtained(targetReq.FinancialApprovalObtained === 1 || targetReq.FinancialApprovalObtained === true);
      setFinancialApprovalDate(targetReq.FinancialApprovalDate || '');
      setFinancialApprovalNotes(targetReq.FinancialApprovalNotes || '');

      if (targetReq.BookletPrice) {
        setBaseBookletPrice(Number(targetReq.BookletPrice));
      }
      const initialG = Number(targetReq.EstimatedValue || 0) * ((Number(targetReq.InitialGuaranteePercent) || 1.5) / 100);
      setInitialGuaranteeAmount(Math.round(initialG) || 5000);

      // Parse OperationItems from NeedsRequest
      let parsedItems = [];
      if (targetReq.OperationItems) {
        try {
          parsedItems = typeof targetReq.OperationItems === 'string' ? JSON.parse(targetReq.OperationItems) : targetReq.OperationItems;
        } catch (e) {
          parsedItems = [];
        }
      }

      if (Array.isArray(parsedItems) && parsedItems.length > 0) {
        setItems(parsedItems.map((it, idx) => {
          let cList = [];
          if (it.criteriaList && Array.isArray(it.criteriaList) && it.criteriaList.length > 0) {
            cList = it.criteriaList;
          } else if (it.itemCriteria && typeof it.itemCriteria === 'string' && (it.itemCriteria.startsWith('[') || it.itemCriteria.startsWith('{'))) {
            try {
              cList = JSON.parse(it.itemCriteria);
            } catch (e) {
              cList = [
                JSON.parse(JSON.stringify(CRITERIA_TEMPLATES.origin)),
                JSON.parse(JSON.stringify(CRITERIA_TEMPLATES.warranty)),
                JSON.parse(JSON.stringify(CRITERIA_TEMPLATES.delivery)),
                JSON.parse(JSON.stringify(CRITERIA_TEMPLATES.experience))
              ];
            }
          } else {
            cList = [
              JSON.parse(JSON.stringify(CRITERIA_TEMPLATES.origin)),
              JSON.parse(JSON.stringify(CRITERIA_TEMPLATES.warranty)),
              JSON.parse(JSON.stringify(CRITERIA_TEMPLATES.delivery)),
              JSON.parse(JSON.stringify(CRITERIA_TEMPLATES.experience))
            ];
          }

          return {
            id: idx + 1,
            itemDescription: it.itemDescription || it.description || it.name || '',
            unit: it.unit || 'عدد',
            estimatedQuantity: it.estimatedQuantity || it.quantity || 1,
            estimatedUnitPrice: it.estimatedUnitPrice || it.unitPrice || 0,
            estimatedTotalPrice: (it.estimatedQuantity || it.quantity || 1) * (it.estimatedUnitPrice || it.unitPrice || 0),
            notes: it.notes || '',
            itemSpecs: it.itemSpecs || it.specs || '',
            itemMaxScore: it.itemMaxScore || 100,
            itemMinPassingScore: it.itemMinPassingScore || 70,
            allowSplit: it.allowSplit !== undefined ? it.allowSplit : true,
            criteriaList: cList
          };
        }));
      } else {
        setItems([{
          id: 1,
          itemDescription: targetReq.OperationName || '',
          unit: 'مقطوعية',
          estimatedQuantity: 1,
          estimatedUnitPrice: Number(targetReq.EstimatedValue || 0),
          estimatedTotalPrice: Number(targetReq.EstimatedValue || 0),
          notes: '',
          itemSpecs: targetReq.SpecsAndConditions || '',
          itemMaxScore: 100,
          itemMinPassingScore: 70,
          allowSplit: true,
          criteriaList: [
            JSON.parse(JSON.stringify(CRITERIA_TEMPLATES.origin)),
            JSON.parse(JSON.stringify(CRITERIA_TEMPLATES.warranty)),
            JSON.parse(JSON.stringify(CRITERIA_TEMPLATES.delivery)),
            JSON.parse(JSON.stringify(CRITERIA_TEMPLATES.experience))
          ]
        }]);
      }
    }
  }, [selectedRequestId, needsRequests]);

  // Recalculate Booklet Price on Base Price Change or Supply Type Change
  useEffect(() => {
    const isSupply = operationType === 'توريدات';
    calculateBooklet(baseBookletPrice, isSupply);
  }, [baseBookletPrice, operationType]);

  const fetchData = async () => {
    try {
      const [tRes, nRes, vRes] = await Promise.all([
        axios.get('/api/tenders'),
        axios.get('/api/needs-requests'),
        axios.get('/api/vendors')
      ]);

      setTenders(tRes.data || []);
      setRegisteredVendors(vRes.data || []);

      // Filter out rejected requests completely from tendering options
      const allRequests = nRes.data || [];
      const nonRejected = allRequests.filter(r => 
        r.WorkflowStatus !== 'مرفوض' && 
        r.AuthorityApprovalStatus !== 'مرفوض'
      );
      setNeedsRequests(nonRejected);

      // Check if current param is rejected
      if (requestIdParam) {
        const found = allRequests.find(r => r.RequestId == requestIdParam);
        if (found && (found.WorkflowStatus === 'مرفوض' || found.AuthorityApprovalStatus === 'مرفوض')) {
          setRejectedAlert(`عفواً! طلب الاحتياج رقم #${requestIdParam} مرفوض من قِبل السلطة المختصة (السبب: ${found.AuthorityRejectionReason || 'لم يحدد'}). لا يمكن طرح العمليات المرفوضة ويجب على الإدارة تقديم طلب جديد.`);
          setSelectedRequestId('');
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchApprovedRequests = async () => {
    try {
      const res = await axios.get('/api/needs-requests/workflow', { params: { pendingFor: 'tenders' } });
      const approvedOnly = (res.data || []).filter(r => 
        r.WorkflowStatus !== 'مرفوض' && 
        r.AuthorityApprovalStatus !== 'مرفوض'
      );
      setPendingApprovedRequests(approvedOnly);
    } catch (err) {
      console.error(err);
    }
  };

  const calculateBooklet = async (price, isSupply) => {
    try {
      const res = await axios.post('/api/tenders/calculate-booklet', {
        basePrice: price,
        isSupply
      });
      setBookletCalc(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setBookletFile({
        fileName: file.name,
        fileData: reader.result,
        fileSize: file.size
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveBookletFile = () => {
    setBookletFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Line Items handlers
  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    if (field === 'estimatedQuantity' || field === 'estimatedUnitPrice') {
      const q = parseFloat(updated[index].estimatedQuantity) || 0;
      const p = parseFloat(updated[index].estimatedUnitPrice) || 0;
      updated[index].estimatedTotalPrice = q * p;
    }
    setItems(updated);

    const newTotal = updated.reduce((sum, item) => sum + (parseFloat(item.estimatedTotalPrice) || 0), 0);
    setEstimatedValue(newTotal);
    setInitialGuaranteeAmount(Math.round(newTotal * 0.015) || 5000);
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        id: items.length + 1,
        itemDescription: '',
        unit: 'عدد',
        estimatedQuantity: 1,
        estimatedUnitPrice: 0,
        estimatedTotalPrice: 0,
        notes: '',
        itemSpecs: '',
        itemMaxScore: 100,
        itemMinPassingScore: 70,
        allowSplit: true,
        criteriaList: [
          JSON.parse(JSON.stringify(CRITERIA_TEMPLATES.origin)),
          JSON.parse(JSON.stringify(CRITERIA_TEMPLATES.warranty)),
          JSON.parse(JSON.stringify(CRITERIA_TEMPLATES.delivery)),
          JSON.parse(JSON.stringify(CRITERIA_TEMPLATES.experience))
        ]
      }
    ]);
    setExpandedItemId(items.length);
  };

  const handleRemoveItem = (index) => {
    if (items.length === 1) {
      alert('يجب أن تحتوي العملية على بند واحد على الأقل');
      return;
    }
    const updated = items.filter((_, idx) => idx !== index);
    setItems(updated);
    const newTotal = updated.reduce((sum, item) => sum + (parseFloat(item.estimatedTotalPrice) || 0), 0);
    setEstimatedValue(newTotal);
    setInitialGuaranteeAmount(Math.round(newTotal * 0.015) || 5000);
    if (expandedItemId >= updated.length) setExpandedItemId(0);
  };

  // Criteria & Sub-Options Rubric Handlers per Item
  const handleAddCriterionToItem = (itemIndex) => {
    const updated = [...items];
    const it = updated[itemIndex];
    if (!it.criteriaList) it.criteriaList = [];

    it.criteriaList.push({
      id: Date.now(),
      name: 'معيار تقييم جديد (مثال: بلد المنشأ / الكفاءة)',
      maxScore: 25,
      options: [
        { id: 1, label: 'الخيار الممتاز (مطابق لأعلى مواصفة)', score: 25 },
        { id: 2, label: 'الخيار الجيد (مطابق للمواصفة القياسية)', score: 18 },
        { id: 3, label: 'الخيار المقبول (الحد الأدنى للقبول)', score: 10 }
      ]
    });
    setItems(updated);
  };

  const handleApplyPresetTemplate = (itemIndex, templateKey) => {
    const template = CRITERIA_TEMPLATES[templateKey];
    if (!template) return;
    const updated = [...items];
    const it = updated[itemIndex];
    if (!it.criteriaList) it.criteriaList = [];

    // Avoid duplicate template
    if (it.criteriaList.some(c => c.name === template.name)) {
      alert(`معيار "${template.name}" مضاف بالفعل لهذا البند`);
      return;
    }

    it.criteriaList.push(JSON.parse(JSON.stringify(template)));
    setItems(updated);
  };

  const handleRemoveCriterion = (itemIndex, criterionIndex) => {
    const updated = [...items];
    updated[itemIndex].criteriaList = updated[itemIndex].criteriaList.filter((_, idx) => idx !== criterionIndex);
    setItems(updated);
  };

  const handleCriterionChange = (itemIndex, criterionIndex, field, value) => {
    const updated = [...items];
    updated[itemIndex].criteriaList[criterionIndex][field] = value;
    setItems(updated);
  };

  const handleAddOptionToCriterion = (itemIndex, criterionIndex) => {
    const updated = [...items];
    const crit = updated[itemIndex].criteriaList[criterionIndex];
    crit.options.push({
      id: Date.now(),
      label: 'خيار تقييم جديد...',
      score: 10
    });
    setItems(updated);
  };

  const handleRemoveOptionFromCriterion = (itemIndex, criterionIndex, optionIndex) => {
    const updated = [...items];
    const crit = updated[itemIndex].criteriaList[criterionIndex];
    if (crit.options.length === 1) {
      alert('يجب أن يحتوي المعيار على خيار تقييم واحد على الأقل');
      return;
    }
    crit.options = crit.options.filter((_, idx) => idx !== optionIndex);
    setItems(updated);
  };

  const handleOptionChange = (itemIndex, criterionIndex, optionIndex, field, value) => {
    const updated = [...items];
    updated[itemIndex].criteriaList[criterionIndex].options[optionIndex][field] = value;
    setItems(updated);
  };

  const applyItemCriteriaToAll = (sourceIndex) => {
    const src = items[sourceIndex];
    if (!src) return;
    const updated = items.map(it => ({
      ...it,
      itemSpecs: it.itemSpecs || src.itemSpecs,
      itemMaxScore: src.itemMaxScore,
      itemMinPassingScore: src.itemMinPassingScore,
      allowSplit: src.allowSplit,
      criteriaList: JSON.parse(JSON.stringify(src.criteriaList || []))
    }));
    setItems(updated);
    alert('تم تطبيق معايير التقييم الفني وجدول النقاط للبند المحدد على كافة بنود العملية بنجاح ✓');
  };

  // Invited Vendors Handlers
  const handleSelectVendorFromRegistry = (vendorId) => {
    setSelectedVendorForInvite(vendorId);
    if (!vendorId) return;
    const v = registeredVendors.find(vend => String(vend.VendorId) === String(vendorId));
    if (v) {
      setNewInvitedForm(prev => ({
        ...prev,
        vendorId: v.VendorId,
        vendorName: v.CompanyName,
        vendorType: v.VendorType || (v.ConstructionGrade && v.ConstructionGrade !== 'غير مجدول' ? 'مقاول' : 'مورد'),
        taxCardNo: v.TaxCardNo || '',
        commercialRegisterNo: v.CommercialRegisterNo || '',
        phone: v.Phone || '',
        email: v.Email || '',
      }));
    }
  };

  const handleAddInvitedVendor = () => {
    if (!newInvitedForm.vendorName) {
      alert('يرجى تحديد أو كتابة اسم الشركة / المورد أو المقاول');
      return;
    }

    if (invitedVendors.some(iv => iv.vendorName.trim().toLowerCase() === newInvitedForm.vendorName.trim().toLowerCase())) {
      alert('هذه الشركة مضافة بالفعل في قائمة المدعوين');
      return;
    }

    setInvitedVendors([
      ...invitedVendors,
      {
        id: Date.now(),
        ...newInvitedForm
      }
    ]);

    setSelectedVendorForInvite('');
    setNewInvitedForm({
      vendorName: '',
      vendorType: 'مورد',
      taxCardNo: '',
      commercialRegisterNo: '',
      phone: '',
      email: '',
      invitationMethod: 'بريد مسجل بعلم الوصول',
      invitationLetterNo: '',
      invitationDate: new Date().toISOString().split('T')[0],
      responseStatus: 'تم توجيه الدعوة',
      notes: ''
    });
  };

  const handleRemoveInvitedVendor = (index) => {
    setInvitedVendors(invitedVendors.filter((_, idx) => idx !== index));
  };

  const handleAutoImportSpecializedVendors = () => {
    if (registeredVendors.length === 0) {
      alert('لا توجد شركات مسجلة في سجل الموردين');
      return;
    }
    const matching = registeredVendors.filter(v => 
      !v.IsBlacklisted &&
      (operationType === 'تعاقدات' ? v.VendorType === 'مقاول' : v.VendorType === 'مورد')
    ).slice(0, 5);

    if (matching.length === 0) {
      alert('لم يتم العثور على شركات مسجلة غير مشطوبة مطابقة لنوع العملية');
      return;
    }

    const newAdditions = [];
    matching.forEach(v => {
      if (!invitedVendors.some(iv => iv.taxCardNo === v.TaxCardNo || iv.vendorName === v.CompanyName)) {
        newAdditions.push({
          id: Date.now() + Math.random(),
          vendorId: v.VendorId,
          vendorName: v.CompanyName,
          vendorType: v.VendorType || 'مورد',
          taxCardNo: v.TaxCardNo || '',
          commercialRegisterNo: v.CommercialRegisterNo || '',
          phone: v.Phone || '',
          email: v.Email || '',
          invitationMethod: 'بريد مسجل بعلم الوصول',
          invitationLetterNo: '',
          invitationDate: new Date().toISOString().split('T')[0],
          responseStatus: 'تم توجيه الدعوة',
          notes: 'مستدعى آلياً من سجل الشركات المعتمدة'
        });
      }
    });

    if (newAdditions.length === 0) {
      alert('جميع الشركات المقترحة موجودة بالفعل في القائمة');
      return;
    }

    setInvitedVendors([...invitedVendors, ...newAdditions]);
    alert(`تم استدعاء ${newAdditions.length} شركات معتمدة مطابقة للتخصص وإضافتها للقائمة بنجاح ✓`);
  };

  const handleSubmitTender = async (e) => {
    e.preventDefault();
    if (!envelopeOpeningDate) {
      alert('يرجى تحديد تاريخ جلسة فض المظاريف (من تبويب إجراءات الطرح)');
      setActiveTab('procedure');
      return;
    }

    if (isLimitedMethod && invitedVendors.length < 3) {
      const confirmProceed = window.confirm(
        `تنبيه قانوني (المادتان 18 و 19 من القانون 182 لسنة 2018):\n` +
        `النصاب القانوني للعمليات المحدودة يتطلب توجيه الدعوة لـ 3 شركات على الأقل لضمان المنافسة الجدية (العدد الحالي: ${invitedVendors.length}).\n\n` +
        `هل ترغب بالاستمرار والاعتماد رغم ذلك؟`
      );
      if (!confirmProceed) {
        setActiveTab('invited');
        return;
      }
    }

    try {
      const res = await axios.post('/api/tenders', {
        requestId: selectedRequestId || null,
        tenderName,
        operationType,
        requestingDepartment,
        tenderMethod,
        fiscalYear,
        executionDuration,
        specsAndConditions,
        warehouseBalance,
        budgetHoldReference,
        reservationType,
        estimatedValue,
        baseBookletPrice,
        initialGuaranteeAmount,
        envelopeOpeningDate,
        adNewspaper1,
        adNewspaper2,
        adPublishDate,
        adDetails,
        evaluationMethod,
        passingScoreDecimal,
        allowSplitAwarding,
        technicalCriteriaNotes,
        requiresSample,
        sampleDetails,
        constructionDivision,
        constructionCategory,
        financialApprovalObtained,
        financialApprovalDate,
        financialApprovalNotes,
        bookletFile,
        items,
        invitedVendors
      });

      alert(res.data.message);
      setSelectedRequestId('');
      setBookletFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchData();
      fetchApprovedRequests();
    } catch (err) {
      alert('خطأ أثناء الطرح: ' + (err.response?.data?.error || err.message));
    }
  };

  // Open Official Booklet Document View
  const handleOpenOfficialBooklet = async (tender) => {
    setSelectedTenderForBooklet(tender);
    try {
      const [itemsRes, vendorsRes] = await Promise.all([
        axios.get(`/api/tenders/${tender.TenderId}/items`),
        axios.get(`/api/tenders/${tender.TenderId}/invited-vendors`)
      ]);
      setTenderItemsForBooklet(itemsRes.data || []);
      setTenderInvitedForBooklet(vendorsRes.data || []);
    } catch (e) {
      setTenderItemsForBooklet([]);
      setTenderInvitedForBooklet([]);
    }
  };

  // Upload booklet file to an existing tender
  const handleSaveModalUpload = async () => {
    if (!uploadModalTender || !modalFile) return;
    setUploadingModal(true);
    try {
      await axios.post(`/api/tenders/${uploadModalTender.TenderId}/booklet`, modalFile);
      alert('تم رفع مستند كراسة الشروط بنجاح');
      setUploadModalTender(null);
      setModalFile(null);
      fetchData();
    } catch (err) {
      alert('خطأ في الرفع: ' + (err.response?.data?.error || err.message));
    } finally {
      setUploadingModal(false);
    }
  };

  const handleDeleteBookletFile = async (tenderId) => {
    if (!window.confirm('هل أنت متأكد من رغبتك في حذف ملف كراسة الشروط المرفوع لهذه العملية؟')) return;
    try {
      await axios.delete(`/api/tenders/${tenderId}/booklet`);
      alert('تم حذف ملف كراسة الشروط بنجاح');
      fetchData();
    } catch (err) {
      alert('خطأ: ' + (err.response?.data?.error || err.message));
    }
  };

  const handlePrintDocument = () => {
    window.print();
  };

  const handleDownloadDocument = () => {
    if (!selectedTenderForBooklet) return;
    const docElement = document.getElementById('official-booklet-document');
    if (!docElement) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>كراسة الشروط والمواصفات - ${selectedTenderForBooklet.TenderNumber}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; direction: rtl; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          th, td { border: 1px solid #333; padding: 8px 12px; text-align: right; }
          th { background: #eee; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px; }
          .signatures { margin-top: 50px; display: flex; justify-content: space-between; }
        </style>
      </head>
      <body>
        ${docElement.innerHTML}
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `كراسة_شروط_${selectedTenderForBooklet.TenderNumber.replace(/[\/\\:]/g, '-')}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6" dir="rtl">
      
      {/* Rejected Alert Banner */}
      {rejectedAlert && (
        <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl flex items-start justify-between gap-3 text-rose-800 text-xs font-bold animate-fadeIn">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{rejectedAlert}</p>
          </div>
          <button onClick={() => setRejectedAlert(null)} className="text-rose-600 hover:text-rose-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-sky-600" />
            <span>شاشة الطرح وكراسة الشروط والمواصفات الشاملة (Tendering Master)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            إعداد وطرح العمليات، تحديد شروط ودرجات كل خيار في البنود (بلد المنشأ، الضمان...)، وإدارة النصاب القانوني للمدعوين
          </p>
        </div>

        {/* Notifications Panel Trigger */}
        <div className="relative">
          <button
            onClick={() => setShowNotificationPanel(!showNotificationPanel)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
              pendingApprovedRequests.length > 0
                ? 'bg-amber-500 hover:bg-amber-600 text-white animate-pulse'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-500'
            }`}
          >
            <Bell className="w-4 h-4" />
            {pendingApprovedRequests.length > 0
              ? `${pendingApprovedRequests.length} عملية معتمدة جاهزة للطرح`
              : 'لا توجد عمليات معتمدة معلقة'}
          </button>

          {showNotificationPanel && pendingApprovedRequests.length > 0 && (
            <div className="absolute top-12 left-0 z-30 bg-white rounded-2xl border border-slate-200 shadow-2xl w-96 overflow-hidden animate-fadeIn">
              <div className="p-4 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                  <Bell className="w-4 h-4 text-amber-600" />
                  <span>عمليات معتمدة من السلطة جاهزة للطرح:</span>
                </div>
                <button
                  onClick={() => setShowNotificationPanel(false)}
                  className="text-amber-700 hover:text-amber-900 text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {pendingApprovedRequests.map(req => (
                  <button
                    key={req.RequestId}
                    onClick={() => {
                      setSelectedRequestId(String(req.RequestId));
                      setShowNotificationPanel(false);
                      setRejectedAlert(null);
                    }}
                    className="w-full text-right p-3 hover:bg-amber-50/60 transition-colors block text-xs"
                  >
                    <div className="font-bold text-slate-800 line-clamp-1">{req.OperationName}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {req.FinancialOperationNumber || '---'} — {req.RequestingDepartment}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="bg-sky-100 text-sky-800 text-[10px] px-2 py-0.5 rounded font-bold">{req.OperationType}</span>
                      <span className="font-mono text-emerald-700 text-[10px] font-bold">
                        {req.EstimatedValue ? `${Number(req.EstimatedValue).toLocaleString()} ج.م` : ''}
                      </span>
                      <span className="text-emerald-700 text-[10px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold mr-auto">
                        معتمد من السلطة ✓
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Left Tabs Form & Right Sticky Calculator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column: Organized Tabbed Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmitTender} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-0">
            
            {/* Top Form Header with Request Selector */}
            <div className="p-5 border-b border-slate-100 bg-slate-50/70 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="font-black text-slate-800 text-base">إعداد وطرح العملية وكراسة الشروط</h3>
                  <p className="text-xs text-slate-500">تم تنظيم البيانات في تبويبات واضحة لتفادي التداخل وتسهيل العمل</p>
                </div>
                <span className="text-xs bg-sky-100 text-sky-800 px-3 py-1 rounded-xl font-mono font-bold">
                  العام المالي {fiscalYear}
                </span>
              </div>

              {/* Request Link Selector */}
              <div>
                <select
                  value={selectedRequestId}
                  onChange={(e) => {
                    setSelectedRequestId(e.target.value);
                    setRejectedAlert(null);
                  }}
                  className="w-full px-3.5 py-2 border rounded-xl text-xs font-semibold focus:ring-2 focus:ring-sky-500 outline-none bg-white shadow-sm"
                >
                  <option value="">-- اضغط هنا لاستدعاء طلب احتياج وتسميع بياناته وبنوده آلياً --</option>
                  {needsRequests.map((req) => (
                    <option key={req.RequestId} value={req.RequestId}>
                      [{req.OperationType}] {req.OperationName} ({Number(req.EstimatedValue || 0).toLocaleString()} ج.م - {req.RequestingDepartment}) {req.WorkflowStatus === 'معتمد' ? '✓ معتمد' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* TAB NAVIGATION BAR */}
            <div className="flex border-b border-slate-200 bg-white px-4 pt-2 gap-1 overflow-x-auto text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('basic')}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-all whitespace-nowrap ${
                  activeTab === 'basic'
                    ? 'border-sky-600 text-sky-700 bg-sky-50/50 rounded-t-xl'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-t-xl'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>1. بيانات العملية والمالية</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('procedure')}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-all whitespace-nowrap ${
                  activeTab === 'procedure'
                    ? 'border-sky-600 text-sky-700 bg-sky-50/50 rounded-t-xl'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-t-xl'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>2. إجراءات الطرح والكراسة</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('items')}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-all whitespace-nowrap ${
                  activeTab === 'items'
                    ? 'border-sky-600 text-sky-700 bg-sky-50/50 rounded-t-xl'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-t-xl'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>3. جدول البنود ومعايير النقاط</span>
                <span className="bg-sky-100 text-sky-800 text-[10px] px-2 py-0.5 rounded-full font-mono">
                  {items.length}
                </span>
              </button>

              {isLimitedMethod && (
                <button
                  type="button"
                  onClick={() => setActiveTab('invited')}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-all whitespace-nowrap ${
                    activeTab === 'invited'
                      ? 'border-amber-500 text-amber-900 bg-amber-50 rounded-t-xl'
                      : 'border-transparent text-amber-700 hover:bg-amber-50/50 rounded-t-xl'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>4. الشركات المدعوة والنصاب</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono text-white ${
                    invitedVendors.length >= 3 ? 'bg-emerald-600' : 'bg-amber-600'
                  }`}>
                    {invitedVendors.length}
                  </span>
                </button>
              )}
            </div>

            {/* TAB CONTENTS */}
            <div className="p-6 space-y-6">

              {/* ========================================================================= */}
              {/* TAB 1: BASIC OPERATION & FINANCIAL DETAILS                                */}
              {/* ========================================================================= */}
              {activeTab === 'basic' && (
                <div className="space-y-5 animate-fadeIn">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="md:col-span-2">
                      <label className="block font-bold text-slate-700 mb-1">اسم وموضوع العملية *</label>
                      <input
                        type="text"
                        required
                        value={tenderName}
                        onChange={(e) => setTenderName(e.target.value)}
                        placeholder="مثال: توريد قطع غيار طلمبات ومحابس لمحطة رافع سموحة"
                        className="w-full px-3.5 py-2.5 border rounded-xl font-bold focus:ring-2 focus:ring-sky-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">نوع العملية المقررة *</label>
                      <select
                        value={operationType}
                        onChange={(e) => setOperationType(e.target.value)}
                        className="w-full px-3 py-2 border rounded-xl font-bold bg-white focus:ring-2 focus:ring-sky-500 outline-none"
                      >
                        <option value="توريدات">توريدات (سلع ومهمات ومعدات)</option>
                        <option value="تعاقدات">تعاقدات (مقاولات وأعمال مدنية وتشييد)</option>
                        <option value="خدمات">خدمات واستشارات فنية</option>
                        <option value="مزادات">مزادات وبيع مهمات وكهنة</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">الجهة الطالبة / الإدارة المشرفة *</label>
                      <input
                        type="text"
                        required
                        value={requestingDepartment}
                        onChange={(e) => setRequestingDepartment(e.target.value)}
                        placeholder="مثال: الإدارة العامة لشبكات الصرف الصحي"
                        className="w-full px-3 py-2 border rounded-xl font-semibold focus:ring-2 focus:ring-sky-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">مدة التنفيذ أو التوريد</label>
                      <input
                        type="text"
                        value={executionDuration}
                        onChange={(e) => setExecutionDuration(e.target.value)}
                        placeholder="مثال: 3 أشهر من تاريخ أمر التوريد"
                        className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-sky-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">إفادة وفحص المخازن ورصيد الصنف</label>
                      <input
                        type="text"
                        value={warehouseBalance}
                        onChange={(e) => setWarehouseBalance(e.target.value)}
                        placeholder="مثال: لا يوجد رصيد بمخازن الشركة"
                        className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-sky-500 outline-none"
                      />
                    </div>

                    {operationType === 'تعاقدات' && (
                      <>
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">الشعبة التخصصية (للمقاولات)</label>
                          <input
                            type="text"
                            value={constructionDivision}
                            onChange={(e) => setConstructionDivision(e.target.value)}
                            placeholder="مثال: أعمال محطات الصرف الصحي"
                            className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-sky-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">الفئة المصرح لها بالتقدم</label>
                          <input
                            type="text"
                            value={constructionCategory}
                            onChange={(e) => setConstructionCategory(e.target.value)}
                            placeholder="مثال: الفئة الرابعة فما فوق"
                            className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-sky-500 outline-none"
                          />
                        </div>
                      </>
                    )}

                    <div className="md:col-span-2">
                      <label className="block font-bold text-slate-700 mb-1">المواصفات العامة والشروط التقديرية</label>
                      <textarea
                        rows={2}
                        value={specsAndConditions}
                        onChange={(e) => setSpecsAndConditions(e.target.value)}
                        placeholder="الشروط والمواصفات العامة المعتمدة للعملية..."
                        className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-sky-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* Financial & Budget Card */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 text-xs">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5 border-b pb-2">
                      <Scale className="w-4 h-4 text-emerald-600" />
                      <span>بيانات حجز الموازنة والاعتماد المالي:</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-bold text-slate-600 mb-1">رقم مذكرة حجز الموازنة</label>
                        <input
                          type="text"
                          value={budgetHoldReference}
                          onChange={(e) => setBudgetHoldReference(e.target.value)}
                          placeholder="مثال: حجز مالي رقم 142/2025"
                          className="w-full px-3 py-2 bg-white border rounded-xl font-mono focus:ring-2 focus:ring-sky-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-600 mb-1">نوع التمويل / الحجز</label>
                        <select
                          value={reservationType}
                          onChange={(e) => setReservationType(e.target.value)}
                          className="w-full px-3 py-2 bg-white border rounded-xl font-bold focus:ring-2 focus:ring-sky-500 outline-none"
                        >
                          <option value="موازنة الشركة">موازنة الشركة (حساب جاري)</option>
                          <option value="تمويل ذاتي">تمويل ذاتي</option>
                          <option value="خطة استثمارية">خطة استثمارية</option>
                          <option value="منحة / قرض مخصص">منحة / قرض مخصص</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-600 mb-1">القيمة التقديرية الإجمالية (ج.م)</label>
                        <input
                          type="number"
                          min="0"
                          value={estimatedValue}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setEstimatedValue(val);
                            setInitialGuaranteeAmount(Math.round(val * 0.015) || 5000);
                          }}
                          className="w-full px-3 py-2 bg-white border rounded-xl font-mono font-bold text-emerald-700 focus:ring-2 focus:ring-sky-500 outline-none"
                        />
                      </div>
                    </div>

                    {/* Paper Financial Approval Check */}
                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-bold text-emerald-950">الموافقة المالية الورقية:</span>
                        <label className="inline-flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={financialApprovalObtained}
                            onChange={(e) => setFinancialApprovalObtained(e.target.checked)}
                            className="rounded text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="font-bold text-slate-800">مستوفاة ومؤشر عليها بالمذكرة الورقية ✓</span>
                        </label>
                      </div>

                      {financialApprovalObtained && (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 text-[11px]">تاريخ المذكرة:</span>
                          <input
                            type="date"
                            value={financialApprovalDate}
                            onChange={(e) => setFinancialApprovalDate(e.target.value)}
                            className="px-2 py-1 bg-white border border-emerald-300 rounded font-mono text-[11px]"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Next Step Button */}
                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('procedure')}
                      className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
                    >
                      <span>الانتقال لإجراءات الطرح والكراسة</span>
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* TAB 2: TENDER PROCEDURE & BOOKLET PRICING & ATTACHMENT                    */}
              {/* ========================================================================= */}
              {activeTab === 'procedure' && (
                <div className="space-y-5 animate-fadeIn">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">طريقة الطرح المقررة *</label>
                      <select
                        value={tenderMethod}
                        onChange={(e) => setTenderMethod(e.target.value)}
                        className="w-full px-3.5 py-2.5 border rounded-xl font-bold bg-white focus:ring-2 focus:ring-sky-500 outline-none text-sky-950"
                      >
                        <option value="مناقصة عامة">مناقصة عامة (إعلان عام بالصحف)</option>
                        <option value="مناقصة محدودة">مناقصة محدودة (توجيه دعوات لموردين مسجلين)</option>
                        <option value="ممارسة عامة">ممارسة عامة (إعلان عام ومفاوضة)</option>
                        <option value="ممارسة محدودة">ممارسة محدودة (توجيه دعوات لشركات مسجلة)</option>
                        <option value="ممارسة محلية">ممارسة محلية (في حدود النطاق الجغرافي)</option>
                        <option value="أمر مباشر">أمر مباشر (للحالات العاجلة بموافقة السلطة)</option>
                        <option value="مزايدة عامة">مزايدة عامة</option>
                        <option value="مزايدة محدودة">مزايدة محدودة</option>
                      </select>
                      {isLimitedMethod && (
                        <p className="text-[11px] text-amber-700 font-bold mt-1">
                          ⚡ تم تفعيل تبويب "الشركات المدعوة والنصاب" بالأعلى لإدارة الموردين طبقاً للقانون 182.
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">تاريخ وساعة جلسة فض المظاريف *</label>
                      <input
                        type="datetime-local"
                        required
                        value={envelopeOpeningDate}
                        onChange={(e) => setEnvelopeOpeningDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 border rounded-xl font-mono focus:ring-2 focus:ring-sky-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">ثمن كراسة الشروط الأساسي (ج.م) *</label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={baseBookletPrice}
                        onChange={(e) => setBaseBookletPrice(Number(e.target.value))}
                        className="w-full px-3.5 py-2 border rounded-xl font-mono font-bold focus:ring-2 focus:ring-sky-500 outline-none"
                      />
                      <span className="text-[10px] text-slate-400">يحسب المحرك الجانبي السعر الشامل للمورد تلقائياً</span>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">مبلغ التأمين الابتدائي المقترح (ج.م) *</label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={initialGuaranteeAmount}
                        onChange={(e) => setInitialGuaranteeAmount(Number(e.target.value))}
                        className="w-full px-3.5 py-2 border rounded-xl font-mono font-bold text-emerald-700 focus:ring-2 focus:ring-sky-500 outline-none"
                      />
                      <span className="text-[10px] text-slate-400">مقترح تلقائياً بنسبة ~1.5% من القيمة التقديرية</span>
                    </div>
                  </div>

                  {/* Public Advertising (if public open tender) */}
                  {!isLimitedMethod && (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
                      <div className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Newspaper className="w-4 h-4 text-sky-600" />
                        <span>بيانات النشر والإعلان بالصحف اليومية (للمناقصات والممارسات العامة):</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[11px] text-slate-500 mb-0.5">جريدة النشر الأولى</label>
                          <input
                            type="text"
                            value={adNewspaper1}
                            onChange={(e) => setAdNewspaper1(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border rounded-lg text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-500 mb-0.5">جريدة النشر الثانية</label>
                          <input
                            type="text"
                            value={adNewspaper2}
                            onChange={(e) => setAdNewspaper2(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border rounded-lg text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-500 mb-0.5">تاريخ النشر</label>
                          <input
                            type="date"
                            value={adPublishDate}
                            onChange={(e) => setAdPublishDate(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border rounded-lg font-mono text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Booklet Document Upload (File) */}
                  <div className="p-4 bg-slate-50 border-2 border-dashed border-sky-300 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-sky-600" />
                        <div>
                          <span className="text-xs font-black text-slate-800">مستند كراسة الشروط والمواصفات (Document File)</span>
                          <p className="text-[11px] text-slate-500">ارفع ملف كراسة الشروط المعتمد (PDF أو Word) لتحميله وطباعته لاحقاً</p>
                        </div>
                      </div>
                      <span className="text-[10px] bg-sky-100 text-sky-800 font-mono px-2 py-0.5 rounded font-bold">
                        PDF / DOCX
                      </span>
                    </div>

                    {bookletFile ? (
                      <div className="flex items-center justify-between p-3 bg-white border border-sky-200 rounded-xl">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                          <FileCheck2 className="w-4 h-4 text-emerald-600" />
                          <span>{bookletFile.fileName}</span>
                          <span className="text-[10px] text-slate-400 font-mono">({Math.round(bookletFile.fileSize / 1024)} KB)</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveBookletFile}
                          className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                          title="حذف الملف"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept=".pdf,.doc,.docx"
                          onChange={handleFileUpload}
                          className="hidden"
                          id="booklet-upload-input"
                        />
                        <label
                          htmlFor="booklet-upload-input"
                          className="cursor-pointer px-4 py-2 bg-white border border-sky-300 hover:border-sky-500 text-sky-700 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm"
                        >
                          <Upload className="w-4 h-4 text-sky-600" />
                          <span>اختيار ملف كراسة الشروط</span>
                        </label>
                        <span className="text-[11px] text-slate-400">يمكنك رفع الكراسة الآن أو لاحقاً من جدول العمليات المطروحة</span>
                      </div>
                    )}
                  </div>

                  {/* Nav Buttons */}
                  <div className="flex justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('basic')}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-2"
                    >
                      <ArrowRight className="w-4 h-4" />
                      <span>السابق (بيانات العملية)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('items')}
                      className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
                    >
                      <span>الانتقال لجدول البنود ومعايير النقاط</span>
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* TAB 3: LINE ITEMS & DETAILED CRITERIA & OPTIONS RUBRIC (نظام النقاط)     */}
              {/* ========================================================================= */}
              {activeTab === 'items' && (
                <div className="space-y-6 animate-fadeIn">
                  
                  {/* Top Controls: Evaluation Method & Split Awarding */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">أسلوب التقييم والبت الفني *</label>
                        <select
                          value={evaluationMethod}
                          onChange={(e) => setEvaluationMethod(e.target.value)}
                          className="w-full px-3 py-2 border rounded-xl font-bold bg-white focus:ring-2 focus:ring-sky-500 outline-none text-purple-950"
                        >
                          <option value="مطابق أو غير مطابق">تقرير فني (مطابق أو غير مطابق للشروط)</option>
                          <option value="نظام نقاط">نظام النقاط الفنية (درجات ومعايير مفصلة لكل خيار)</option>
                        </select>
                      </div>

                      {evaluationMethod === 'نظام نقاط' ? (
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">الحد الأدنى لاجتياز التقييم الفني (من 100)</label>
                          <input
                            type="number"
                            min="50"
                            max="100"
                            value={passingScoreDecimal}
                            onChange={(e) => setPassingScoreDecimal(Number(e.target.value))}
                            className="w-full px-3 py-2 border rounded-xl font-mono font-bold text-purple-800 bg-white text-center focus:ring-2 focus:ring-sky-500 outline-none"
                          />
                        </div>
                      ) : (
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">اشتراط تقديم عينات</label>
                          <div className="flex items-center gap-2 pt-1.5">
                            <input
                              type="checkbox"
                              checked={requiresSample}
                              onChange={(e) => setRequiresSample(e.target.checked)}
                              className="rounded text-sky-600 focus:ring-sky-500"
                              id="req-sample-chk"
                            />
                            <label htmlFor="req-sample-chk" className="font-semibold text-slate-700 cursor-pointer">
                              يلزم تقديم عينة فنية للاختبار
                            </label>
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">تجزئة الترسية (بخاصة في التوريدات)</label>
                        <div className="flex items-center gap-2 pt-1.5">
                          <input
                            type="checkbox"
                            checked={allowSplitAwarding}
                            onChange={(e) => setAllowSplitAwarding(e.target.checked)}
                            className="rounded text-sky-600 focus:ring-sky-500"
                            id="allow-split-chk"
                          />
                          <label htmlFor="allow-split-chk" className="font-bold text-emerald-800 cursor-pointer">
                            السماح بترسية كل بند لمورد مختلف ✓
                          </label>
                        </div>
                      </div>
                    </div>

                    {evaluationMethod === 'نظام نقاط' && (
                      <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl text-purple-900 text-[11px] leading-relaxed">
                        <span className="font-bold">ملاحظة تنظيمية لنظام النقاط:</span> يمكنك تحديد شروط ودرجات كل خيار فرعي داخل كل بند (مثلاً: إذا كان بلد المنشأ أوروبي يأخذ 30 درجة، وإذا كان ألماني 20، وإذا كان أمريكي 10 درجات...) وستظهر تفصيلاً بكراسة الشروط الرسمية.
                      </div>
                    )}
                  </div>

                  {/* Items List Header */}
                  <div className="flex items-center justify-between border-b pb-2">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-sky-600" />
                      <span>بنود العملية والمقايسة ({items.length} بنود)</span>
                    </h4>
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>إضافة بند جديد للمقايسة</span>
                    </button>
                  </div>

                  {/* Items Accordion / Cards */}
                  <div className="space-y-4">
                    {items.map((it, idx) => {
                      const isExpanded = expandedItemId === idx;
                      const totalCriteriaWeight = (it.criteriaList || []).reduce((sum, c) => sum + (Number(c.maxScore) || 0), 0);

                      return (
                        <div 
                          key={it.id || idx} 
                          className={`rounded-2xl border transition-all ${
                            isExpanded ? 'border-sky-400 bg-white shadow-md' : 'border-slate-200 bg-slate-50/80 hover:bg-white'
                          }`}
                        >
                          {/* Item Card Header Bar */}
                          <div 
                            className="p-3.5 flex items-center justify-between cursor-pointer select-none"
                            onClick={() => setExpandedItemId(isExpanded ? null : idx)}
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-6 h-6 rounded-lg bg-sky-100 text-sky-800 font-bold font-mono text-xs flex items-center justify-center">
                                {idx + 1}
                              </span>
                              <div>
                                <span className="font-bold text-xs text-slate-900">
                                  {it.itemDescription || 'بند جديد بدون مسمى...'}
                                </span>
                                <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                                  {it.estimatedQuantity} {it.unit} × {Number(it.estimatedUnitPrice).toLocaleString()} ج.م = <span className="font-bold text-emerald-700">{Number(it.estimatedTotalPrice || 0).toLocaleString()} ج.م</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              {evaluationMethod === 'نظام نقاط' && (
                                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                                  totalCriteriaWeight === 100 
                                    ? 'bg-emerald-100 text-emerald-800' 
                                    : 'bg-purple-100 text-purple-800'
                                }`}>
                                  مجموع أوزان المعايير: {totalCriteriaWeight} / 100
                                </span>
                              )}

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveItem(idx);
                                }}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                title="حذف البند"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>

                              {isExpanded ? <ChevronUp className="w-4 h-4 text-sky-600" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                            </div>
                          </div>

                          {/* Expanded Content: Quantities, Specs & Detailed Criteria with Options */}
                          {isExpanded && (
                            <div className="p-4 border-t border-slate-100 space-y-4 animate-fadeIn text-xs">
                              
                              {/* Quantity & Unit Pricing Row */}
                              <div className="grid grid-cols-12 gap-2">
                                <div className="col-span-5">
                                  <label className="block text-[11px] font-bold text-slate-600 mb-1">اسم وتوصيف البند *</label>
                                  <input
                                    type="text"
                                    required
                                    value={it.itemDescription}
                                    onChange={(e) => handleItemChange(idx, 'itemDescription', e.target.value)}
                                    placeholder="مثال: مواسير بولي إيثيلين HDPE قطر 500 مم"
                                    className="w-full px-3 py-1.5 border rounded-lg font-bold"
                                  />
                                </div>

                                <div className="col-span-2">
                                  <label className="block text-[11px] font-bold text-slate-600 mb-1">الوحدة</label>
                                  <select
                                    value={it.unit}
                                    onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                                    className="w-full px-2 py-1.5 border rounded-lg font-semibold bg-white"
                                  >
                                    <option value="عدد">عدد</option>
                                    <option value="طقم">طقم</option>
                                    <option value="متر">متر</option>
                                    <option value="طن">طن</option>
                                    <option value="كيلو">كيلو</option>
                                    <option value="مقطوعية">مقطوعية</option>
                                    <option value="متر مكعب">متر مكعب</option>
                                    <option value="متر مسطح">متر مسطح</option>
                                    <option value="لتر">لتر</option>
                                  </select>
                                </div>

                                <div className="col-span-2">
                                  <label className="block text-[11px] font-bold text-slate-600 mb-1">الكمية التقديرية</label>
                                  <input
                                    type="number"
                                    min="0.01"
                                    step="any"
                                    value={it.estimatedQuantity}
                                    onChange={(e) => handleItemChange(idx, 'estimatedQuantity', e.target.value)}
                                    className="w-full px-2 py-1.5 border rounded-lg font-mono font-bold text-center"
                                  />
                                </div>

                                <div className="col-span-3">
                                  <label className="block text-[11px] font-bold text-slate-600 mb-1">السعر التقديري للوحدة (ج.م)</label>
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={it.estimatedUnitPrice}
                                    onChange={(e) => handleItemChange(idx, 'estimatedUnitPrice', e.target.value)}
                                    className="w-full px-2 py-1.5 border rounded-lg font-mono font-bold text-center text-emerald-700"
                                  />
                                </div>
                              </div>

                              {/* Specs & Notes */}
                              <div>
                                <label className="block text-[11px] font-bold text-slate-600 mb-1">المواصفات الفنية المعتمدة للبند:</label>
                                <textarea
                                  rows={2}
                                  value={it.itemSpecs}
                                  onChange={(e) => handleItemChange(idx, 'itemSpecs', e.target.value)}
                                  placeholder="مواصفات التصنيع، الضغوط، الاختبارات المعملية المطلوبة..."
                                  className="w-full px-3 py-1.5 border rounded-lg"
                                />
                              </div>

                              {/* DETAILED CRITERIA & SUB-OPTIONS RUBRIC (For Points System) */}
                              {evaluationMethod === 'نظام نقاط' && (
                                <div className="p-4 bg-purple-50/50 border border-purple-200 rounded-2xl space-y-4">
                                  <div className="flex items-center justify-between flex-wrap gap-2 border-b border-purple-200 pb-2">
                                    <div className="flex items-center gap-1.5 text-purple-950 font-bold">
                                      <Award className="w-4 h-4 text-purple-700" />
                                      <span>معايير التقييم وتوزيع النقاط والخيارات للبند #{idx + 1}</span>
                                    </div>

                                    {/* Quick Preset Buttons */}
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-[11px] text-purple-800 font-bold">قوالب سريعة:</span>
                                      <button
                                        type="button"
                                        onClick={() => handleApplyPresetTemplate(idx, 'origin')}
                                        className="px-2 py-1 bg-white hover:bg-purple-100 border border-purple-300 text-purple-800 rounded-lg text-[10px] font-bold transition-colors"
                                      >
                                        + بلد المنشأ (30 د)
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleApplyPresetTemplate(idx, 'warranty')}
                                        className="px-2 py-1 bg-white hover:bg-purple-100 border border-purple-300 text-purple-800 rounded-lg text-[10px] font-bold transition-colors"
                                      >
                                        + فترة الضمان (30 د)
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleApplyPresetTemplate(idx, 'delivery')}
                                        className="px-2 py-1 bg-white hover:bg-purple-100 border border-purple-300 text-purple-800 rounded-lg text-[10px] font-bold transition-colors"
                                      >
                                        + مدة التوريد (20 د)
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleApplyPresetTemplate(idx, 'experience')}
                                        className="px-2 py-1 bg-white hover:bg-purple-100 border border-purple-300 text-purple-800 rounded-lg text-[10px] font-bold transition-colors"
                                      >
                                        + سابقة الأعمال (20 د)
                                      </button>
                                    </div>
                                  </div>

                                  {/* Criteria List */}
                                  <div className="space-y-3">
                                    {(it.criteriaList || []).map((crit, cIdx) => (
                                      <div key={crit.id || cIdx} className="p-3 bg-white border border-purple-200 rounded-xl space-y-2.5">
                                        
                                        {/* Criterion Header */}
                                        <div className="flex items-center justify-between gap-2 flex-wrap">
                                          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                                            <span className="w-5 h-5 rounded-md bg-purple-100 text-purple-800 font-mono font-bold text-[10px] flex items-center justify-center">
                                              {cIdx + 1}
                                            </span>
                                            <input
                                              type="text"
                                              value={crit.name}
                                              onChange={(e) => handleCriterionChange(idx, cIdx, 'name', e.target.value)}
                                              placeholder="اسم المعيار (مثال: بلد المنشأ)..."
                                              className="w-full px-2 py-1 border rounded-lg font-bold text-xs"
                                            />
                                          </div>

                                          <div className="flex items-center gap-2">
                                            <div className="flex items-center gap-1">
                                              <span className="text-[11px] text-slate-500 font-bold">الدرجة القصوى:</span>
                                              <input
                                                type="number"
                                                min="1"
                                                max="100"
                                                value={crit.maxScore}
                                                onChange={(e) => handleCriterionChange(idx, cIdx, 'maxScore', Number(e.target.value))}
                                                className="w-14 px-1.5 py-1 border rounded-lg font-mono font-bold text-center text-xs text-purple-900"
                                              />
                                            </div>

                                            <button
                                              type="button"
                                              onClick={() => handleRemoveCriterion(idx, cIdx)}
                                              className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                              title="حذف هذا المعيار"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        </div>

                                        {/* Options / Conditions Table (The user's core request: أوروبي 30، ألماني 20، أمريكي 10...) */}
                                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1.5">
                                          <div className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                                            <span>خيارات وشروط المعيار وتوزيع درجات كل خيار:</span>
                                            <button
                                              type="button"
                                              onClick={() => handleAddOptionToCriterion(idx, cIdx)}
                                              className="text-[10px] text-sky-700 hover:text-sky-900 font-bold flex items-center gap-0.5"
                                            >
                                              <Plus className="w-3 h-3" />
                                              <span>إضافة خيار فرعي</span>
                                            </button>
                                          </div>

                                          <div className="space-y-1">
                                            {(crit.options || []).map((opt, oIdx) => (
                                              <div key={opt.id || oIdx} className="flex items-center gap-2">
                                                <input
                                                  type="text"
                                                  value={opt.label}
                                                  onChange={(e) => handleOptionChange(idx, cIdx, oIdx, 'label', e.target.value)}
                                                  placeholder="الخيار (مثال: أوروبي، ألماني، 5 سنوات...)"
                                                  className="flex-1 px-2.5 py-1 bg-white border rounded text-xs"
                                                />
                                                <div className="flex items-center gap-1 shrink-0">
                                                  <span className="text-[10px] text-slate-400">الدرجة:</span>
                                                  <input
                                                    type="number"
                                                    min="0"
                                                    max={crit.maxScore}
                                                    value={opt.score}
                                                    onChange={(e) => handleOptionChange(idx, cIdx, oIdx, 'score', Number(e.target.value))}
                                                    className="w-14 px-1.5 py-1 bg-white border rounded font-mono font-bold text-center text-xs text-purple-900"
                                                  />
                                                </div>
                                                <button
                                                  type="button"
                                                  onClick={() => handleRemoveOptionFromCriterion(idx, cIdx, oIdx)}
                                                  className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                                  title="حذف الخيار"
                                                >
                                                  <X className="w-3.5 h-3.5" />
                                                </button>
                                              </div>
                                            ))}
                                          </div>
                                        </div>

                                      </div>
                                    ))}
                                  </div>

                                  {/* Add Criterion Button */}
                                  <div className="flex justify-between items-center pt-1">
                                    <button
                                      type="button"
                                      onClick={() => handleAddCriterionToItem(idx)}
                                      className="px-3 py-1.5 bg-white hover:bg-purple-100 border border-purple-300 text-purple-900 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                                    >
                                      <Plus className="w-3.5 h-3.5 text-purple-700" />
                                      <span>إضافة معيار تقييم فني جديد للبند</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => applyItemCriteriaToAll(idx)}
                                      className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                                      title="نسخ هذه المعايير والدرجات لكافة بنود العملية الأخرى"
                                    >
                                      <Sparkles className="w-3.5 h-3.5" />
                                      <span>تطبيق معايير ودرجات هذا البند على جميع البنود</span>
                                    </button>
                                  </div>
                                </div>
                              )}

                              {/* Split awarding per item checkbox */}
                              <div className="pt-1 flex items-center justify-between border-t border-slate-100">
                                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={it.allowSplit}
                                    onChange={(e) => handleItemChange(idx, 'allowSplit', e.target.checked)}
                                    className="rounded text-emerald-600 focus:ring-emerald-500"
                                  />
                                  <span className="font-bold text-emerald-800">يقبل هذا البند التجزئة والترسية المنفصلة لمورد مختلف ✓</span>
                                </label>
                              </div>

                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Nav Buttons */}
                  <div className="flex justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('procedure')}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-2"
                    >
                      <ArrowRight className="w-4 h-4" />
                      <span>السابق (إجراءات الطرح)</span>
                    </button>

                    {isLimitedMethod ? (
                      <button
                        type="button"
                        onClick={() => setActiveTab('invited')}
                        className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
                      >
                        <span>الانتقال لقائمة الشركات المدعوة</span>
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="submit"
                        className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>اعتماد وطرح العملية وتوليد الكراسة</span>
                      </button>
                    )}
                  </div>

                </div>
              )}

              {/* ========================================================================= */}
              {/* TAB 4: INVITED VENDORS & LEGAL QUORUM (For Limited Tenders)              */}
              {/* ========================================================================= */}
              {activeTab === 'invited' && isLimitedMethod && (
                <div className="space-y-5 animate-fadeIn">
                  
                  {/* Quorum Status Box */}
                  {invitedVendors.length < 3 ? (
                    <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl text-rose-900 text-xs flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-black text-sm text-rose-950">النصاب القانوني غير مكتمل! (أقل من 3 شركات)</div>
                        <p className="text-[11px] text-rose-800 mt-1 leading-relaxed">
                          تنص المادتان (18) و (19) من القانون رقم 182 لسنة 2018 على أن الممارسات والمناقصات المحدودة تشترط توجيه الدعوة لـ <strong>3 شركات على الأقل</strong> من المقيدين بسجل الموردين أو المقاولين لضمان صحة المنافسة وتجنب بطلان الإجراءات.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl text-emerald-900 text-xs flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div>
                        <span className="font-black text-sm">النصاب القانوني مستوفٍ ومكتمل ({invitedVendors.length} شركات مدعوة):</span>
                        <p className="text-[11px] text-emerald-800 mt-0.5">
                          تم توجيه الدعوة لعدد قانوني كافٍ يحقق المنافسة المطلوبة طبقاً لأحكام القانون 182 ولائحته التنفيذية ✓
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Add Invited Vendor Card */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 text-xs">
                    <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-200 pb-2">
                      <div className="font-bold text-slate-800 flex items-center gap-1.5">
                        <UserPlus className="w-4 h-4 text-sky-600" />
                        <span>إضافة شركة / مورد أو مقاول لقائمة المدعوين:</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleAutoImportSpecializedVendors}
                        className="px-3 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm transition-all"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        <span>استدعاء آلي للمقيدين بالتخصص</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-0.5">اختيار من سجل الموردين والمقاولين</label>
                        <select
                          value={selectedVendorForInvite}
                          onChange={(e) => handleSelectVendorFromRegistry(e.target.value)}
                          className="w-full px-2.5 py-1.5 border rounded-lg bg-white font-bold"
                        >
                          <option value="">-- اختر من الشركات المسجلة --</option>
                          {registeredVendors.map(v => (
                            <option key={v.VendorId} value={v.VendorId}>
                              {v.CompanyName} ({v.VendorType}) - بطاقة: {v.TaxCardNo}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-0.5">أو اسم الشركة / المقاول يدوياً *</label>
                        <input
                          type="text"
                          value={newInvitedForm.vendorName}
                          onChange={(e) => setNewInvitedForm({ ...newInvitedForm, vendorName: e.target.value })}
                          placeholder="اسم الشركة الموجه إليها الدعوة..."
                          className="w-full px-2.5 py-1.5 border rounded-lg font-bold bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-0.5">وسيلة توجيه الدعوة</label>
                        <select
                          value={newInvitedForm.invitationMethod}
                          onChange={(e) => setNewInvitedForm({ ...newInvitedForm, invitationMethod: e.target.value })}
                          className="w-full px-2.5 py-1.5 border rounded-lg bg-white"
                        >
                          <option value="بريد مسجل بعلم الوصول">بريد مسجل بعلم الوصول</option>
                          <option value="بريد إلكتروني رسمي معتمد">بريد إلكتروني رسمي معتمد</option>
                          <option value="تسليم باليد بتوقيع وإيصال">تسليم باليد بتوقيع وإيصال</option>
                          <option value="فاكس رسمي معتمد">فاكس رسمي معتمد</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-0.5">رقم كتاب / خطاب الدعوة</label>
                        <input
                          type="text"
                          value={newInvitedForm.invitationLetterNo}
                          onChange={(e) => setNewInvitedForm({ ...newInvitedForm, invitationLetterNo: e.target.value })}
                          placeholder="مثال: د/105/2026"
                          className="w-full px-2.5 py-1.5 border rounded-lg font-mono bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-0.5">تاريخ توجيه الدعوة</label>
                        <input
                          type="date"
                          value={newInvitedForm.invitationDate}
                          onChange={(e) => setNewInvitedForm({ ...newInvitedForm, invitationDate: e.target.value })}
                          className="w-full px-2.5 py-1.5 border rounded-lg font-mono bg-white"
                        />
                      </div>

                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={handleAddInvitedVendor}
                          className="w-full py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1 shadow-sm transition-all"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>إضافة لقائمة المدعوين</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Invited Vendors Table */}
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-800">الشركات الموجه إليها الدعوة رسمياً ({invitedVendors.length}):</span>
                    </div>

                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-100/70 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-2.5 w-10 text-center">م</th>
                          <th className="p-2.5">اسم الشركة / المورد أو المقاول</th>
                          <th className="p-2.5">الصفة والبطاقة الضريبية</th>
                          <th className="p-2.5">وسيلة وتاريخ الدعوة</th>
                          <th className="p-2.5">رقم الخطاب</th>
                          <th className="p-2.5 text-center">حذف</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {invitedVendors.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-6 text-center text-slate-400">
                              لم يتم إضافة أي شركات مدعوة حتى الآن.
                            </td>
                          </tr>
                        ) : (
                          invitedVendors.map((iv, idx) => (
                            <tr key={iv.id || idx} className="hover:bg-slate-50/70">
                              <td className="p-2.5 text-center font-bold text-slate-500 font-mono">{idx + 1}</td>
                              <td className="p-2.5 font-bold text-slate-900">{iv.vendorName}</td>
                              <td className="p-2.5 text-[11px]">
                                <span className="bg-slate-100 px-2 py-0.5 rounded font-bold text-slate-700 ml-1.5">{iv.vendorType}</span>
                                <span className="font-mono text-slate-500">{iv.taxCardNo ? `بطاقة: ${iv.taxCardNo}` : ''}</span>
                              </td>
                              <td className="p-2.5 text-[11px] text-slate-600">
                                <span>{iv.invitationMethod}</span>
                                <span className="font-mono text-slate-400 mr-1.5">({iv.invitationDate})</span>
                              </td>
                              <td className="p-2.5 font-mono text-slate-700 text-[11px]">{iv.invitationLetterNo || 'بدون رقم'}</td>
                              <td className="p-2.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveInvitedVendor(idx)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                  title="حذف من القائمة"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Nav Buttons */}
                  <div className="flex justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('items')}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-2"
                    >
                      <ArrowRight className="w-4 h-4" />
                      <span>السابق (جدول البنود)</span>
                    </button>

                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>اعتماد وطرح العملية وتوليد الكراسة</span>
                    </button>
                  </div>
                </div>
              )}

            </div>

          </form>
        </div>

        {/* Right Column: Live Sticky Calculation Engine for Booklet */}
        <div className="space-y-4">
          <div className="bg-slate-900 text-white p-5 rounded-3xl shadow-xl border border-slate-800 space-y-4 sticky top-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-black text-sm text-sky-400 flex items-center gap-2">
                <Calculator className="w-4 h-4" />
                <span>محرك تشميل وتسعير كراسة الشروط</span>
              </h3>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg font-mono">
                صفحة 5-6 بالكراسة
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">ثمن الكراسة الأساسي:</span>
                <span className="font-mono font-bold text-slate-200">{bookletCalc.basePrice} ج.م</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">مصاريف إدارية (20%):</span>
                <span className="font-mono font-bold text-sky-300">+{bookletCalc.adminFees} ج.م</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">طابع بريد (نموذج 5):</span>
                <span className="font-mono font-bold text-slate-300">+{bookletCalc.postalStamp} ج.م</span>
              </div>
              {operationType === 'توريدات' && (
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">رسوم كارتة وخرائط توريدات:</span>
                  <span className="font-mono font-bold text-slate-300">+{bookletCalc.mapsFees} ج.م</span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">ضريبة القيمة المضافة (14%):</span>
                <span className="font-mono font-bold text-amber-300">+{bookletCalc.vat} ج.م</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">طابع صندوق تكافل:</span>
                <span className="font-mono font-bold text-emerald-300">+{bookletCalc.takafulStamp} ج.م</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">طابع الشهيد:</span>
                <span className="font-mono font-bold text-slate-300">+{bookletCalc.shaheedStamp} ج.م</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800 bg-slate-950/60 p-2 rounded-xl">
                <span className="text-slate-300 font-bold">المجموع قبل الجبر:</span>
                <span className="font-mono font-bold text-slate-100">{bookletCalc.rawSum} ج.م</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">جبر لأقرب 5 جنيهات (إيرادات متنوعة):</span>
                <span className="font-mono font-bold text-purple-300">+{bookletCalc.miscIncome} ج.م</span>
              </div>
            </div>

            <div className="bg-gradient-to-r from-sky-950 to-indigo-950 p-4 rounded-2xl border border-sky-800 text-center">
              <div className="text-[11px] text-sky-300 font-bold mb-1">
                ثمن الكراسة الشامل للمورد (النهائي):
              </div>
              <div className="text-2xl font-black font-mono text-white">
                {bookletCalc.finalPrice} جنيهاً
              </div>
            </div>

            {/* Quick Summary of Current Tender */}
            <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700 space-y-2 text-[11px]">
              <div className="font-bold text-slate-300 border-b border-slate-700 pb-1 flex items-center justify-between">
                <span>ملخص العملية المعدة:</span>
                <span className="text-emerald-400 font-mono">{items.length} بنود</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>القيمة التقديرية:</span>
                <span className="font-mono font-bold text-white">{Number(estimatedValue || 0).toLocaleString()} ج.م</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>التأمين الابتدائي:</span>
                <span className="font-mono font-bold text-emerald-400">{Number(initialGuaranteeAmount || 0).toLocaleString()} ج.م</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>أسلوب التقييم:</span>
                <span className="font-bold text-purple-300">{evaluationMethod}</span>
              </div>
              {isLimitedMethod && (
                <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-700">
                  <span>الشركات المدعوة:</span>
                  <span className={`font-mono font-bold ${invitedVendors.length >= 3 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {invitedVendors.length} شركات {invitedVendors.length >= 3 ? '✓' : '(أقل من 3)'}
                  </span>
                </div>
              )}
            </div>

            {/* Direct Submit Action */}
            <button
              type="button"
              onClick={handleSubmitTender}
              className="w-full py-3 bg-sky-600 hover:bg-sky-500 text-white rounded-2xl font-black text-xs shadow-lg shadow-sky-600/30 transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>اعتماد وطرح العملية فوراً</span>
            </button>
          </div>
        </div>

      </div>

      {/* Existing Tenders Table with Booklet Document Column & Invited Vendors Count */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="font-black text-slate-800 text-base">سجل العمليات المطروحة ومستندات كراسة الشروط</h3>
            <p className="text-xs text-slate-500">تحميل وطباعة كراسة الشروط الرسمية، فحص عدد العطاءات والمدعوين، أو رفع واستبدال المستندات المرفقة</p>
          </div>
          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
            {tenders.length} عملية مطروحة
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase border-b border-slate-200">
              <tr>
                <th className="p-3.5">رقم العملية المسلسل</th>
                <th className="p-3.5">اسم العملية</th>
                <th className="p-3.5">طريقة الطرح</th>
                <th className="p-3.5">عدد العطاءات / الشركات</th>
                <th className="p-3.5">ثمن الكراسة الشامل</th>
                <th className="p-3.5">التأمين الابتدائي</th>
                <th className="p-3.5">تاريخ فض المظاريف</th>
                <th className="p-3.5">مستند كراسة الشروط (الملف)</th>
                <th className="p-3.5 text-center">طباعة / تصدير الكراسة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tenders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    لا توجد عمليات مطروحة حالياً.
                  </td>
                </tr>
              ) : (
                tenders.map((t) => {
                  const isLimited = ['ممارسة محدودة', 'مناقصة محدودة', 'ممارسة محلية', 'أمر مباشر', 'مزايدة محدودة'].includes(t.TenderMethod);
                  return (
                    <tr key={t.TenderId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3.5 font-bold font-mono text-sky-700">{t.TenderNumber}</td>
                      <td className="p-3.5 font-bold text-slate-800">{t.OperationName || t.TenderName}</td>
                      <td className="p-3.5">
                        <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded font-bold">
                          {t.TenderMethod}
                        </span>
                      </td>

                      {/* Bids / Invited Count Column */}
                      <td className="p-3.5">
                        {isLimited ? (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                            (t.InvitedVendorsCount || 0) >= 3 
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' 
                              : 'bg-amber-50 text-amber-800 border border-amber-300'
                          }`}>
                            <Users className="w-3 h-3" />
                            <span>{t.InvitedVendorsCount || 0} شركات مدعوة</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[11px] bg-slate-100 text-slate-600">
                            <Newspaper className="w-3 h-3" />
                            <span>إعلان عام بالصحف</span>
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 font-mono font-bold text-slate-800">
                        {t.CalculatedBookletPrice} ج.م
                      </td>
                      <td className="p-3.5 font-mono font-bold text-emerald-700">
                        {t.InitialGuaranteeAmount?.toLocaleString()} ج.م
                      </td>
                      <td className="p-3.5 text-slate-600 font-mono">
                        {t.EnvelopeOpeningDate ? new Date(t.EnvelopeOpeningDate).toLocaleDateString('ar-EG') : '---'}
                      </td>
                      
                      {/* Document Upload / Download Column */}
                      <td className="p-3.5">
                        {t.BookletFilePath ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <a
                              href={t.BookletFilePath}
                              download={t.BookletFileName}
                              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-1 rounded-lg font-bold text-[11px] inline-flex items-center gap-1 transition-colors"
                              title="تحميل مستند كراسة الشروط"
                            >
                              <Download className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="truncate max-w-[120px]">{t.BookletFileName || 'كراسة_الشروط'}</span>
                            </a>

                            <a
                              href={t.BookletFilePath}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded"
                              title="معاينة الملف"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>

                            <button
                              type="button"
                              onClick={() => handleDeleteBookletFile(t.TenderId)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                              title="حذف الملف المرفوع"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setUploadModalTender(t)}
                            className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-lg font-bold text-[11px] inline-flex items-center gap-1 transition-colors"
                          >
                            <Paperclip className="w-3.5 h-3.5" />
                            <span>إرفاق مستند كراسة</span>
                          </button>
                        )}
                      </td>

                      {/* Official Document Print Button */}
                      <td className="p-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenOfficialBooklet(t)}
                          className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl font-bold text-xs inline-flex items-center gap-1.5 transition-colors shadow-sm"
                          title="عرض وطباعة كراسة الشروط الرسمية كـ Document"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>طباعة الكراسة 🖨️</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: OFFICIAL PRINTABLE / EXPORTABLE BOOKLET DOCUMENT                 */}
      {/* ========================================================================= */}
      {selectedTenderForBooklet && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto animate-fadeIn">
            
            {/* Modal Header with Action Buttons */}
            <div className="flex items-center justify-between border-b pb-4 no-print">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <h3 className="font-black text-slate-800 text-base">
                  مستند كراسة الشروط والمواصفات الرسمية — عملية: {selectedTenderForBooklet.TenderNumber}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintDocument}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة فورية (Print)</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadDocument}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>تنزيل Document (.doc)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedTenderForBooklet(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* The Actual Official Document Content */}
            <div id="official-booklet-document" className="p-8 border-2 border-slate-300 rounded-2xl bg-white text-slate-900 space-y-6 font-serif">
              {/* Official Header */}
              <div className="border-b-2 border-slate-900 pb-4 flex items-center justify-between text-xs font-bold text-center">
                <div className="text-right space-y-1">
                  <div>جمهورية مصر العربية</div>
                  <div>وزارة الإسكان والمرافق والمجتمعات العمرانية</div>
                  <div>الشركة القابضة لمياه الشرب والصرف الصحي</div>
                  <div>الإدارة العامة للعقود والمشتريات</div>
                </div>

                <div className="text-center space-y-1">
                  <div className="text-sm font-black">كراسة الشروط والمواصفات العامة والخاصة</div>
                  <div className="text-base font-black text-sky-900 font-mono">عملية رقم: {selectedTenderForBooklet.TenderNumber}</div>
                  <div className="text-[11px] text-slate-600">العام المالي: {selectedTenderForBooklet.FiscalYear}</div>
                </div>

                <div className="text-left space-y-1 font-mono text-[11px]">
                  <div>التاريخ: {new Date().toLocaleDateString('ar-EG')}</div>
                  <div>رمز العملية: {selectedTenderForBooklet.TenderSymbol}</div>
                  <div>جلسة الفض: {selectedTenderForBooklet.EnvelopeOpeningDate ? new Date(selectedTenderForBooklet.EnvelopeOpeningDate).toLocaleDateString('ar-EG') : '---'}</div>
                </div>
              </div>

              {/* General Operation Info Box */}
              <div className="p-4 bg-slate-50 border border-slate-300 rounded-xl space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div><span className="font-bold">موضوع واسم العملية:</span> {selectedTenderForBooklet.OperationName || selectedTenderForBooklet.TenderName}</div>
                  <div><span className="font-bold">طريقة وإجراءات الطرح:</span> {selectedTenderForBooklet.TenderMethod}</div>
                  <div><span className="font-bold">الجهة الطالبة والمشرفة:</span> {selectedTenderForBooklet.RequestingDepartment}</div>
                  <div><span className="font-bold">مذكرة حجز الموازنة:</span> {selectedTenderForBooklet.BudgetHoldReference || 'موازنة الشركة'}</div>
                  <div><span className="font-bold">مبلغ التأمين الابتدائي المطلوب:</span> {Number(selectedTenderForBooklet.InitialGuaranteeAmount || 0).toLocaleString()} جنيهاً مصرياً</div>
                  <div><span className="font-bold">ثمن الكراسة الشامل للمورد:</span> {selectedTenderForBooklet.CalculatedBookletPrice} جنيهاً مصرياً</div>
                </div>
              </div>

              {/* Technical Evaluation System & Split Awarding Official Clause */}
              <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 font-bold text-indigo-950">
                    <span className="font-black">نظام التقييم والبت الفني المعتمد:</span>
                    <span className="bg-white px-2.5 py-0.5 rounded-md border border-indigo-300 text-indigo-800 font-black">
                      {selectedTenderForBooklet.EvaluationMethod === 'نظام نقاط'
                        ? `نظام النقاط الفنية (درجات ومعايير) — الحد الأدنى لاجتياز التقييم الفني: ${selectedTenderForBooklet.PassingScoreDecimal || 70} درجة من 100`
                        : 'تقرير فني (مطابق أو غير مطابق للشروط والمواصفات)'}
                    </span>
                  </div>
                  <div className="text-slate-700">
                    <span className="font-bold">موقف التجزئة والترسية: </span>
                    <span className="font-black text-emerald-800">
                      {selectedTenderForBooklet.AllowSplitAwarding
                        ? 'تقبل التجزئة والترسية لكل بند لمورد مختلف ✓'
                        : 'صفقة واحدة لا تقبل التجزئة'}
                    </span>
                  </div>
                </div>
                {selectedTenderForBooklet.TechnicalCriteriaNotes && (
                  <div className="text-[11px] text-slate-700 pt-1.5 border-t border-indigo-200">
                    <span className="font-bold">معايير التقييم وأوزانها العامة: </span>
                    {selectedTenderForBooklet.TechnicalCriteriaNotes}
                  </div>
                )}
              </div>

              {/* Invited Vendors Section for Limited Tenders */}
              {tenderInvitedForBooklet.length > 0 && (
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b pb-1">
                    <h4 className="font-black text-sm">قائمة الموردين / المقاولين الموجه إليهم الدعوة (العمليات المحدودة)</h4>
                    <span className="font-bold text-sky-900 text-[11px]">
                      النصاب القانوني: {tenderInvitedForBooklet.length} شركات موجه إليها الدعوة طبقاً للمادتين 18 و 19 من القانون 182 لسنة 2018
                    </span>
                  </div>
                  <table className="w-full text-right border border-slate-300 text-xs">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="p-2 border w-10 text-center">م</th>
                        <th className="p-2 border">اسم الشركة / المشتغل بالنشاط</th>
                        <th className="p-2 border">البطاقة الضريبية / السجل التجاري</th>
                        <th className="p-2 border">وسيلة وتاريخ الدعوة</th>
                        <th className="p-2 border">حالة الاستجابة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tenderInvitedForBooklet.map((iv, idx) => (
                        <tr key={iv.InvitedId || idx}>
                          <td className="p-2 border text-center font-bold">{idx + 1}</td>
                          <td className="p-2 border font-bold">{iv.VendorName}</td>
                          <td className="p-2 border font-mono">بطاقة: {iv.TaxCardNo || '---'} | سجل: {iv.CommercialRegisterNo || '---'}</td>
                          <td className="p-2 border">{iv.InvitationMethod} {iv.InvitationLetterNo ? `(كتاب: ${iv.InvitationLetterNo})` : ''} - {iv.InvitationDate}</td>
                          <td className="p-2 border font-bold">{iv.ResponseStatus || 'تم توجيه الدعوة'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Bill of Quantities / Items Table with DETAILED RUBRIC */}
              {tenderItemsForBooklet.length > 0 && (
                <div className="space-y-3 text-xs">
                  <h4 className="font-black text-sm border-b pb-1">جدول المواصفات والبنود ومعايير ودرجات التقييم الفني</h4>
                  <table className="w-full text-right border border-slate-300">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="p-2 border w-10 text-center">م</th>
                        <th className="p-2 border">بيان وتوصيف البند والمواصفات الفنية</th>
                        <th className="p-2 border w-16 text-center">الوحدة</th>
                        <th className="p-2 border w-20 text-center">الكمية</th>
                        {selectedTenderForBooklet.EvaluationMethod === 'نظام نقاط' && (
                          <th className="p-2 border">معايير ودرجات كل خيار فني بالبند</th>
                        )}
                        <th className="p-2 border w-32">ملاحظات والتجزئة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tenderItemsForBooklet.map((it, idx) => {
                        let criteria = it.criteriaList || [];
                        return (
                          <tr key={it.ItemId || idx} className="align-top">
                            <td className="p-2 border text-center font-bold">{idx + 1}</td>
                            <td className="p-2 border">
                              <div className="font-bold text-slate-900">{it.ItemDescription}</div>
                              {it.ItemSpecs && (
                                <div className="text-[11px] text-slate-600 mt-1 bg-slate-50 p-1.5 rounded border border-slate-200">
                                  <span className="font-bold">المواصفات الفنية:</span> {it.ItemSpecs}
                                </div>
                              )}
                            </td>
                            <td className="p-2 border text-center font-bold">{it.Unit}</td>
                            <td className="p-2 border font-mono font-bold text-center">{it.EstimatedQuantity}</td>
                            
                            {/* Detailed Criteria & Options Rubric Column */}
                            {selectedTenderForBooklet.EvaluationMethod === 'نظام نقاط' && (
                              <td className="p-2 border text-[11px] space-y-1.5">
                                <div className="font-bold text-purple-900 font-mono border-b pb-1">
                                  الحد الأدنى للقبول: {it.ItemMinPassingScore || 70} من {it.ItemMaxScore || 100} درجة
                                </div>
                                {criteria.length > 0 ? (
                                  criteria.map((c, cI) => (
                                    <div key={cI} className="bg-purple-50/60 p-1.5 rounded border border-purple-200 space-y-0.5">
                                      <div className="font-bold text-purple-950 flex justify-between">
                                        <span>• {c.name}</span>
                                        <span className="font-mono">({c.maxScore} درجة)</span>
                                      </div>
                                      {c.options && c.options.length > 0 && (
                                        <div className="pr-3 text-[10px] text-slate-700 space-y-0.5">
                                          {c.options.map((opt, oI) => (
                                            <div key={oI} className="flex justify-between">
                                              <span>- {opt.label}:</span>
                                              <span className="font-mono font-bold text-purple-800">{opt.score} درجة</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ))
                                ) : (
                                  <div className="text-slate-500">{it.ItemCriteria || 'طبقاً لكراسة الشروط'}</div>
                                )}
                              </td>
                            )}

                            <td className="p-2 border text-[11px] text-slate-600">
                              <div>{it.Notes || 'طبقاً للمواصفات'}</div>
                              {it.AllowSplit !== 0 && selectedTenderForBooklet.AllowSplitAwarding ? (
                                <div className="text-emerald-700 font-bold mt-1">يقبل التجزئة ✓</div>
                              ) : (
                                <div className="text-slate-400 mt-1">صفقة واحدة</div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pricing Breakdown Schedule */}
              <div className="space-y-2 text-xs">
                <h4 className="font-black text-sm border-b pb-1">جدول تشميل وتسعير كراسة الشروط والرسوم القانونية</h4>
                <table className="w-full text-right border border-slate-300">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="p-2 border">البيان</th>
                      <th className="p-2 border">السعر الأساسي</th>
                      <th className="p-2 border">مصاريف إدارية (20%)</th>
                      <th className="p-2 border">القيمة المضافة (14%)</th>
                      <th className="p-2 border">طوابع ودمغات</th>
                      <th className="p-2 border font-bold">الإجمالي الشامل بالكراسة</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-2 border">ثمن شراء الكراسة المعتمد</td>
                      <td className="p-2 border font-mono">{selectedTenderForBooklet.BaseBookletPrice} ج.م</td>
                      <td className="p-2 border font-mono">{(selectedTenderForBooklet.BaseBookletPrice * 0.2).toFixed(2)} ج.م</td>
                      <td className="p-2 border font-mono">{(selectedTenderForBooklet.BaseBookletPrice * 0.14).toFixed(2)} ج.م</td>
                      <td className="p-2 border font-mono">20.00 ج.م</td>
                      <td className="p-2 border font-mono font-black text-emerald-800">{selectedTenderForBooklet.CalculatedBookletPrice} ج.م</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Legal & General Terms */}
              <div className="space-y-2 text-xs leading-relaxed text-justify">
                <h4 className="font-black text-sm border-b pb-1">الشروط والأحكام العامة والخاصة المنظمة للعملية</h4>
                <ol className="list-decimal list-inside space-y-1 text-slate-700">
                  <li>تخضع هذه العملية لأحكام القانون رقم 182 لسنة 2018 ولائحته التنفيذية وتعديلاتهما.</li>
                  <li>يتم تقديم العطاءات داخل مظروفين مغلقين (أحدهما فني والآخر مالي) أو طبقاً لما هو موضح بأصل الطرح.</li>
                  <li>يجب أن يرفق بالمظروف الفني أصل التأمين الابتدائي بقيمة {Number(selectedTenderForBooklet.InitialGuaranteeAmount || 0).toLocaleString()} ج.م بخطاب ضمان بنكي غير مشروط أو إيصال سداد نقدي بخزينة الشركة.</li>
                  <li>مدة سريان العطاءات ثلاثة أشهر من تاريخ جلسة فتح المظاريف الفنية.</li>
                  <li>يلتزم من يرسو عليه العطاء بسداد التأمين النهائي بواقع 5% من إجمالي قيمة التعاقد فور الإخطار بالإسناد.</li>
                </ol>
              </div>

              {/* Signatures Block */}
              <div className="pt-8 border-t border-slate-400 grid grid-cols-3 gap-6 text-center text-xs font-bold">
                <div>
                  <div className="text-slate-500 mb-8">إعداد ومراجعة العقود</div>
                  <div>توقيع: ............................</div>
                </div>
                <div>
                  <div className="text-slate-500 mb-8">مدير عام المشتريات والعقود</div>
                  <div>توقيع: ............................</div>
                </div>
                <div>
                  <div className="text-slate-500 mb-8">اعتماد السلطة المختصة (خاتم الشعار)</div>
                  <div>توقيع: ............................</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: UPLOAD BOOKLET FILE FOR EXISTING TENDER                          */}
      {/* ========================================================================= */}
      {uploadModalTender && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b">
              <div className="flex items-center gap-2 font-black text-slate-800 text-sm">
                <Upload className="w-4 h-4 text-sky-600" />
                <span>إرفاق مستند كراسة الشروط للعملية #{uploadModalTender.TenderNumber}</span>
              </div>
              <button onClick={() => setUploadModalTender(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 border-2 border-dashed border-sky-300 rounded-2xl text-center space-y-3">
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                id="modal-booklet-input"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    setModalFile({
                      fileName: f.name,
                      fileData: reader.result,
                      fileSize: f.size
                    });
                  };
                  reader.readAsDataURL(f);
                }}
              />
              <label
                htmlFor="modal-booklet-input"
                className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                <Upload className="w-4 h-4" />
                <span>اختر ملف من جهازك</span>
              </label>

              {modalFile ? (
                <div className="text-xs font-bold text-slate-800 bg-white p-2.5 rounded-xl border border-sky-200">
                  📄 {modalFile.fileName} ({Math.round(modalFile.fileSize / 1024)} KB)
                </div>
              ) : (
                <p className="text-[11px] text-slate-400">يدعم ملفات PDF و Word المستندات الرسمية</p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setUploadModalTender(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={!modalFile || uploadingModal}
                onClick={handleSaveModalUpload}
                className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold disabled:opacity-50 flex items-center gap-2 shadow-sm"
              >
                {uploadingModal ? 'جاري الرفع...' : 'حفظ المستند'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
