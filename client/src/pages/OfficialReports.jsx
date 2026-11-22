import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Printer, 
  FileText, 
  Send, 
  Building2, 
  ShieldCheck, 
  Download, 
  CheckCircle,
  FileCheck
} from 'lucide-react';

export default function OfficialReports() {
  const [activeReport, setActiveReport] = useState('directive'); 
  // 'directive' (إذن توجيه), 'po' (أمر توريد), 'insurance' (التأمينات), 'tax' (الضرائب), 'manpower' (القوى العاملة), 'warehouse' (تسليم المخازن)

  const [tenders, setTenders] = useState([]);
  const [selectedTenderId, setSelectedTenderId] = useState('');
  const [tenderDetails, setTenderDetails] = useState(null);

  useEffect(() => {
    fetchTenders();
  }, []);

  const fetchTenders = async () => {
    try {
      const res = await axios.get('/api/tenders');
      const list = res.data || [];
      setTenders(list);
      if (list.length > 0) {
        setSelectedTenderId(list[0].TenderId);
        setTenderDetails(list[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTenderChange = (id) => {
    setSelectedTenderId(id);
    const t = tenders.find(item => item.TenderId == id);
    setTenderDetails(t);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* Top Controls (Hidden during print) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 no-print">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Printer className="w-6 h-6 text-sky-600" />
            <span>سادساً: النماذج والمخاطبات الرسمية والتقارير القابلة للطباعة</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            توليد النماذج الرسمية المعتمدة (إذن توجيه، أمر توريد، التأمينات، الضرائب، القوى العاملة، والمخازن) طبقاً لدفتر الدورة المستندية.
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-lg flex items-center gap-2 shrink-0"
        >
          <Printer className="w-4 h-4 text-sky-400" />
          <span>طباعة النموذج الرسمي (Ctrl+P)</span>
        </button>
      </div>

      {/* Select Tender & Report Type (Hidden during print) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4 no-print">
        
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <label className="text-xs font-bold text-slate-700 shrink-0">اختيار العملية لتوليد مخرجاتها:</label>
          <select
            value={selectedTenderId}
            onChange={(e) => handleTenderChange(e.target.value)}
            className="px-3.5 py-2 border rounded-xl text-xs font-bold text-sky-800 bg-sky-50 outline-none w-full md:w-96"
          >
            {tenders.map((t) => (
              <option key={t.TenderId} value={t.TenderId}>
                [{t.TenderNumber}] {t.OperationName}
              </option>
            ))}
          </select>
        </div>

        {/* Tab Buttons */}
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          {[
            { id: 'directive', label: '1. إذن توجيه حسابي (تحويل تأمين)' },
            { id: 'po', label: '2. إخطار إسناد وأمر توريد' },
            { id: 'insurance', label: '3. مذكرة التأمينات الاجتماعية' },
            { id: 'tax', label: '4. نموذج مصلحة الضرائب' },
            { id: 'manpower', label: '5. نموذج مديرية القوى العاملة' },
            { id: 'warehouse', label: '6. تسليم ملف المخازن والتسويات' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveReport(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeReport === tab.id
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

      </div>

      {/* Official Document Canvas (Paper View for Printing) */}
      <div className="bg-white rounded-2xl border border-slate-300 shadow-xl p-8 max-w-4xl mx-auto min-h-[800px] text-slate-900 print:shadow-none print:border-none print:p-0">
        
        {/* Official Header */}
        <div className="border-b-2 border-slate-900 pb-4 mb-6 flex justify-between items-start">
          <div className="text-right space-y-1 text-xs font-bold">
            <div>شركة الصرف الصحي بالإسكندرية</div>
            <div>شركة تابعة مساهمة مصرية (ش.ت.م.م)</div>
            <div>تابعة للشركة القابضة لمياه الشرب والصرف الصحي</div>
            <div>سجل تجاري: 46315</div>
            <div>الإدارة العامة للعقود والمشتريات</div>
          </div>

          <div className="text-center">
            <div className="w-14 h-14 mx-auto rounded-full border-2 border-slate-900 flex items-center justify-center font-bold text-lg mb-1">
              ASDCO
            </div>
            <div className="text-[10px] text-slate-600 font-semibold">جمهورية مصر العربية</div>
          </div>

          <div className="text-left space-y-1 text-xs font-mono">
            <div>التاريخ: {new Date().toLocaleDateString('ar-EG')}</div>
            <div>العام المالي: {tenderDetails?.FiscalYear || '2025/2026'}</div>
            <div>رقم العملية: {tenderDetails?.TenderNumber || '1/2025/2026-هـ'}</div>
          </div>
        </div>

        {/* 1. إذن توجيه حسابي (صفحة 26) */}
        {activeReport === 'directive' && (
          <div className="space-y-6 text-sm">
            <div className="text-center font-extrabold text-base border-b pb-2">
              إذن تـوجـيـه حـسـابـي رقـم (JD-01/{tenderDetails?.FiscalYear || '2025/2026'})
            </div>

            <div className="text-right text-xs leading-relaxed space-y-3">
              <p>
                <strong>السيد المحاسب /</strong> مدير عام الشئون المالية — إدارة الحسابات
              </p>
              <p>
                يرجى التكرم بإجراء القيد المحاسبي اللازم لتحويل التأمين الابتدائي إلى تأمين نهائي طرفنا على النحو التالي:
              </p>
            </div>

            <div className="border border-slate-800 rounded-lg overflow-hidden">
              <table className="w-full text-right text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-800 text-center font-bold">
                    <th className="border-l border-slate-800 p-2 w-28" colSpan="2">مـنــه</th>
                    <th className="border-l border-slate-800 p-2 w-28" colSpan="2">لـــه</th>
                    <th className="border-l border-slate-800 p-2">الـبـيــــــــان</th>
                    <th className="p-2 w-32">الدليل المحاسبي</th>
                  </tr>
                  <tr className="bg-slate-50 border-b border-slate-800 text-center text-[10px] font-mono">
                    <th className="border-l border-slate-800 p-1">جنيه</th>
                    <th className="border-l border-slate-800 p-1">قرش</th>
                    <th className="border-l border-slate-800 p-1">جنيه</th>
                    <th className="border-l border-slate-800 p-1">قرش</th>
                    <th className="border-l border-slate-800 p-1"></th>
                    <th className="p-1"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-400 font-mono text-center">
                  <tr>
                    <td className="border-l border-slate-800 p-2 font-bold">{tenderDetails?.InitialGuaranteeAmount?.toLocaleString()}</td>
                    <td className="border-l border-slate-800 p-2">00</td>
                    <td className="border-l border-slate-800 p-2">---</td>
                    <td className="border-l border-slate-800 p-2">--</td>
                    <td className="border-l border-slate-800 p-2 text-right font-arabic">
                      من حـ / حسابات دائنة أخرى (تأمين ابتدائي)
                    </td>
                    <td className="p-2">218401</td>
                  </tr>
                  <tr>
                    <td className="border-l border-slate-800 p-2">---</td>
                    <td className="border-l border-slate-800 p-2">--</td>
                    <td className="border-l border-slate-800 p-2 font-bold">{tenderDetails?.InitialGuaranteeAmount?.toLocaleString()}</td>
                    <td className="border-l border-slate-800 p-2">00</td>
                    <td className="border-l border-slate-800 p-2 text-right font-arabic">
                      إلى حـ / حسابات دائنة أخرى (تأمين نهائي للعملية)
                    </td>
                    <td className="p-2">218402</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="text-xs text-right space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-300">
              <div>
                <strong>البيان التفصيلي:</strong> تحويل قيمة التأمين الابتدائي المسدد إلى تأمين نهائي لعملية ({tenderDetails?.OperationName}) رقم ({tenderDetails?.TenderNumber}) الراسية على الشركة الفائزة بموجب محضر لجنة البت.
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-12 text-center text-xs font-bold">
              <div>منظم الإذن<br/><span className="text-slate-400 font-normal">...................</span></div>
              <div>المراجع المالي<br/><span className="text-slate-400 font-normal">...................</span></div>
              <div>مدير عام العقود والمشتريات<br/><span className="text-slate-400 font-normal">...................</span></div>
            </div>
          </div>
        )}

        {/* 2. إخطار إسناد وأمر توريد (صفحة 29) */}
        {activeReport === 'po' && (
          <div className="space-y-6 text-sm">
            <div className="text-center font-extrabold text-base border-b pb-2">
              إخـطـار إسـنـاد وأمـر تـوريـد رقـم (PO-01/{tenderDetails?.FiscalYear || '2025/2026'})
            </div>

            <div className="text-xs space-y-2 text-right leading-relaxed">
              <p>
                <strong>السادة /</strong> الشركة الفائزة بالترسية المحترمون
              </p>
              <p>
                نحيطكم علماً بأنه قد تقرر إسناد عملية <strong>({tenderDetails?.OperationName})</strong> المطروحة برقم <strong>({tenderDetails?.TenderNumber})</strong> إلى شركتكم الموقرة طبقاً للعطاء المقدم منكم ومحضر جلسة البت المالي المعتمد.
              </p>
              <div className="bg-sky-50 border border-sky-200 p-3 rounded-xl">
                <p className="font-bold text-sky-950">
                  شروط والتزامات التوريد والإسناد:
                </p>
                <ul className="list-disc list-inside mt-1 space-y-1 text-slate-700">
                  <li>إيداع التأمين النهائي بنسبة (5%) من القيمة الإجمالية في موعد أقصاه 10 أيام من تاريخه.</li>
                  <li>مكان التسليم: مخازن الشركة المركزية بالإسكندرية.</li>
                  <li>تخضع هذه العملية للائحة العقود والمشتريات وأحكام القانون المنظم للتعاقدات العامة.</li>
                </ul>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-16 text-center text-xs font-bold">
              <div>إدارة المشتريات والتوريدات<br/><span className="text-slate-400 font-normal">...................</span></div>
              <div>يعتمد،، رئيس مجلس الإدارة والعضو المنتدب<br/><span className="text-slate-400 font-normal">...................</span></div>
            </div>
          </div>
        )}

        {/* 3. مذكرة التأمينات الاجتماعية (صفحة 35) */}
        {activeReport === 'insurance' && (
          <div className="space-y-6 text-sm">
            <div className="text-center font-extrabold text-base border-b pb-2">
              مـذكـرة إلـى الـهـيـئـة الـعـامـة لـلـتـأمـيـنـات الاجـتـمـاعـيـة
            </div>

            <div className="text-xs text-right space-y-3 leading-relaxed">
              <p>
                <strong>السيد /</strong> مدير عام الهيئة العامة للتأمينات الاجتماعية — قسم التوريدات
              </p>
              <p className="text-slate-500 font-semibold">
                (22 شارع السبع بنات – المنشية – الإسكندرية)
              </p>
              <p>
                تحية طيبة وبعد ،،،<br/>
                يرجى الإحاطة بأن شركة الصرف الصحي لمحافظة الإسكندرية قد أسندت العملية الآتي بيانها:
              </p>

              <div className="border p-4 rounded-xl space-y-2 bg-slate-50">
                <div><strong>اسم العملية:</strong> {tenderDetails?.OperationName}</div>
                <div><strong>رقم العملية المسلسل:</strong> {tenderDetails?.TenderNumber}</div>
                <div><strong>نوع الطرح:</strong> {tenderDetails?.TenderMethod}</div>
                <div><strong>العام المالي:</strong> {tenderDetails?.FiscalYear}</div>
                <div><strong>تاريخ الإسناد:</strong> {new Date().toLocaleDateString('ar-EG')}</div>
              </div>

              <p>
                برجاء التكرم بالإحاطة وتحديد النسب المطلوب خصمها لحساب الهيئة من مستحقات المورد/المقاول المسند إليه.
              </p>
            </div>

            <div className="pt-16 text-left text-xs font-bold pl-8">
              <div>مدير عام العقود والمشتريات</div>
              <div className="text-slate-400 font-normal mt-2">........................................</div>
            </div>
          </div>
        )}

        {/* 4. نموذج مصلحة الضرائب (صفحة 36) */}
        {activeReport === 'tax' && (
          <div className="space-y-6 text-sm">
            <div className="text-center font-extrabold text-base border-b pb-2">
              إخـطـار مـصـلـحـة الـضـرائـب الـمـصـريـة
            </div>

            <div className="text-xs text-right space-y-3 leading-relaxed">
              <p>
                <strong>السادة /</strong> مصلحة الضرائب المصرية — منطقة ضرائب الإسكندرية
              </p>
              <p>
                تحية طيبة وبعد ،،،<br/>
                يرجى التكرم بالإحاطة بأن شركة الصرف الصحي بمحافظة الإسكندرية قد قامت بإسناد العملية الموضحة بياناتها أدناه:
              </p>

              <div className="border p-4 rounded-xl space-y-2 bg-slate-50">
                <div><strong>اسم وموضوع العملية:</strong> {tenderDetails?.OperationName}</div>
                <div><strong>رقم الإسناد:</strong> {tenderDetails?.TenderNumber}</div>
                <div><strong>القيمة التقديرية:</strong> {tenderDetails?.EstimatedValue?.toLocaleString()} ج.م</div>
                <div><strong>طريقة التعاقد:</strong> {tenderDetails?.TenderMethod}</div>
              </div>

              <p>
                مرسل للعلم والإحاطة لاتخاذ الإجراءات الضريبية المقررة قانوناً.
              </p>
            </div>

            <div className="pt-16 text-left text-xs font-bold pl-8">
              <div>مدير إدارة العقود والمشتريات</div>
              <div className="text-slate-400 font-normal mt-2">........................................</div>
            </div>
          </div>
        )}

        {/* 5. نموذج القوى العاملة (صفحة 36) */}
        {activeReport === 'manpower' && (
          <div className="space-y-6 text-sm">
            <div className="text-center font-extrabold text-base border-b pb-2">
              إخـطـار مـديـريـة الـقـوى الـعـامـلـة والـهـجـرة (وحـدة الـعـمـالـة غـيـر الـمـنـتـظـمـة)
            </div>

            <div className="text-xs text-right space-y-3 leading-relaxed">
              <p>
                <strong>السادة /</strong> مديرية القوى العاملة بالإسكندرية — وحدة متابعة تشغيل العمالة غير المنتظمة
              </p>
              <p className="text-slate-500 font-semibold">
                (شارع مصطفى كامل – خلف نقابة الأطباء – كليوباترا – الإسكندرية)
              </p>
              <p>
                تحية طيبة وبعد ،،،<br/>
                يرجى الإحاطة بأن شركة الصرف الصحي بالإسكندرية (21 شارع محمد شفيق غربال - الشاطبي - رقم بريدي 21525) قد أسندت أعمال عملية ({tenderDetails?.OperationName}) رقم ({tenderDetails?.TenderNumber}).
              </p>
              <p>
                برجاء التكرم باتخاذ اللازم نحو تحصيل مستحقات صندوق رعاية وتشغيل العمالة غير المنتظمة المقررة قانوناً.
              </p>
            </div>

            <div className="pt-16 text-left text-xs font-bold pl-8">
              <div>تحريراً في: {new Date().toLocaleDateString('ar-EG')}</div>
              <div className="mt-2">مدير عام الشئون الإدارية والتعاقدات</div>
            </div>
          </div>
        )}

        {/* 6. تسليم ملف المخازن والتسويات (صفحة 31-33) */}
        {activeReport === 'warehouse' && (
          <div className="space-y-6 text-sm">
            <div className="text-center font-extrabold text-base border-b pb-2">
              نـمـوذج تـسـلـيـم الـمـلـف الـفـرعـي لـلإدارة الـعـامـة لـلـمـخـازن والـتـسـويـات
            </div>

            <div className="text-xs text-right space-y-3 leading-relaxed">
              <p>
                <strong>السيد المحاسب /</strong> مدير عام المخازن العامة والتسويات المالية
              </p>
              <p>
                تحية طيبة وبعد ،،،<br/>
                نرفق لسيادتكم الملف الفرعي الخاص بعملية <strong>({tenderDetails?.OperationName})</strong> رقم <strong>({tenderDetails?.TenderNumber})</strong> ومرفق به المستندات التالية:
              </p>

              <ol className="list-decimal list-inside space-y-1.5 p-4 bg-slate-50 rounded-xl border">
                <li>موافقة السلطة المختصة على الطرح.</li>
                <li>عروض الموردين/المقاولين المتقدمين.</li>
                <li>محضر جلسة فتح المظاريف الفنية والمالية.</li>
                <li>كشف تفريغ العطاءات وجدول مقارنة الأسعار.</li>
                <li>محضر اجتماع واعتماد لجنة البت.</li>
                <li>مذكرة حجز العملية المالي من الموازنة / المخطط العام.</li>
                <li>إخطارات قبول العطاءات وصورة أمر التوريد.</li>
                <li>قسيمة وإذن توجيه سداد التأمين النهائي.</li>
              </ol>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-16 text-center text-xs font-bold">
              <div>المستلم (المخازن العامة)<br/><span className="text-slate-400 font-normal">...................</span></div>
              <div>المسلّم (العقود والمشتريات)<br/><span className="text-slate-400 font-normal">...................</span></div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
