/**
 * سجل الموردين والمقاولين - API
 * مكانه: server/config/registryRoutes.js (جنب db.js)
 *
 * التركيب في server/index.js (بعد app.use(express.json...) وقبل connectDb().then):
 *     app.use('/api/registry', require('./config/registryRoutes'));
 * ومحتاج:  npm i multer    (جوه فولدر server)
 */
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { query } = require('./db'); // query(sqlText, { name: value }) -> rows

const router = express.Router();

/* ---------- رفع الملفات ---------- */
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'contractor-docs');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED = ['application/pdf', 'image/jpeg', 'image/png'];
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) =>
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 10 * 1024 * 1024, files: 10 },
  fileFilter: (_req, file, cb) =>
    ALLOWED.includes(file.mimetype) ? cb(null, true) : cb(new Error('مسموح فقط بملفات PDF أو صور JPG/PNG')),
});

const wrap = (fn) => (req, res) =>
  fn(req, res).catch((e) => {
    console.error('[registry]', e);
    res.status(500).json({ error: e.message });
  });

const STATUSES = ['GREEN', 'YELLOW', 'RED'];
const cleanupFiles = (files = []) => files.forEach((f) => fs.unlink(f.path, () => {}));
const fixName = (n) => Buffer.from(n, 'latin1').toString('utf8'); // multer بيقرا الأسماء العربي latin1
const rows = (r) => (Array.isArray(r) ? r : r?.recordset || []);

/* =====================================================================
   التوريدات
   ===================================================================== */
router.get('/supply', wrap(async (_req, res) => {
  const groups = rows(await query(
    'SELECT GroupId, GroupNo, GroupName FROM Reg_SupplyGroups ORDER BY ISNULL(GroupNo, 9999), GroupId'));
  const vendors = rows(await query(
    `SELECT VendorId, GroupId, CompanyName, Address, Phone, Status, BlacklistReason
     FROM Reg_SupplyVendors ORDER BY CompanyName`));

  const byGroup = {};
  vendors.forEach((v) => (byGroup[v.GroupId] ||= []).push(v));
  res.json(groups.map((g) => ({ ...g, vendors: byGroup[g.GroupId] || [] })));
}));

router.post('/supply/groups', wrap(async (req, res) => {
  const name = (req.body.groupName || '').trim();
  if (!name) return res.status(400).json({ error: 'اسم المجموعة مطلوب' });
  const dup = rows(await query('SELECT 1 AS x FROM Reg_SupplyGroups WHERE GroupName = @n', { n: name }));
  if (dup.length) return res.status(409).json({ error: 'المجموعة موجودة بالفعل' });
  await query(
    `INSERT INTO Reg_SupplyGroups (GroupNo, GroupName)
     VALUES ((SELECT ISNULL(MAX(GroupNo),0)+1 FROM Reg_SupplyGroups), @n)`, { n: name });
  res.json({ ok: true });
}));

router.post('/supply/groups/:id/vendors', wrap(async (req, res) => {
  const { companyName, address, phone, status, blacklistReason } = req.body;
  if (!companyName?.trim()) return res.status(400).json({ error: 'اسم الشركة مطلوب' });
  if (!STATUSES.includes(status)) return res.status(400).json({ error: 'الحالة غير صحيحة' });
  if (status === 'RED' && !blacklistReason?.trim()) return res.status(400).json({ error: 'سبب الشطب مطلوب' });

  await query(
    `INSERT INTO Reg_SupplyVendors (GroupId, CompanyName, Address, Phone, Status, BlacklistReason)
     VALUES (@g, @n, @a, @p, @s, @r)`,
    {
      g: parseInt(req.params.id), n: companyName.trim(), a: address || null, p: phone || null,
      s: status, r: status === 'RED' ? blacklistReason.trim() : null,
    });
  res.json({ ok: true });
}));

router.patch('/supply/vendors/:id/status', wrap(async (req, res) => {
  const { status, blacklistReason } = req.body;
  if (!STATUSES.includes(status)) return res.status(400).json({ error: 'الحالة غير صحيحة' });
  if (status === 'RED' && !blacklistReason?.trim()) return res.status(400).json({ error: 'سبب الشطب مطلوب' });
  await query('UPDATE Reg_SupplyVendors SET Status=@s, BlacklistReason=@r WHERE VendorId=@id', {
    id: parseInt(req.params.id), s: status, r: status === 'RED' ? blacklistReason.trim() : null,
  });
  res.json({ ok: true });
}));

/* =====================================================================
   التعاقدات
   ===================================================================== */
router.get('/contracts', wrap(async (_req, res) => {
  const groups = rows(await query(
    'SELECT GroupId, GroupNo, GroupName, RequirementType FROM Reg_ContractGroups ORDER BY ISNULL(GroupNo, 999), GroupId'));
  const subs = rows(await query(
    'SELECT SubGroupId, GroupId, SubGroupName FROM Reg_ContractSubGroups ORDER BY SubGroupId'));
  const contractors = rows(await query(
    `SELECT ContractorId, SubGroupId, CompanyName, Address, Phone, Status, BlacklistReason,
            FederationRegistered, FederationBranch, FederationGrade, QualifiedAndLicensed
     FROM Reg_Contractors ORDER BY CompanyName`));
  const docs = rows(await query('SELECT DocId, ContractorId, FileName FROM Reg_ContractorDocuments'));

  const docsBy = {};
  docs.forEach((d) => (docsBy[d.ContractorId] ||= []).push(d));
  const consBy = {};
  contractors.forEach((c) => (consBy[c.SubGroupId] ||= []).push({ ...c, documents: docsBy[c.ContractorId] || [] }));
  const subsBy = {};
  subs.forEach((s) => (subsBy[s.GroupId] ||= []).push({ ...s, contractors: consBy[s.SubGroupId] || [] }));

  res.json(groups.map((g) => ({ ...g, subGroups: subsBy[g.GroupId] || [] })));
}));

router.post('/contracts/groups', wrap(async (req, res) => {
  const name = (req.body.groupName || '').trim();
  const reqType = req.body.requirementType || 'NONE';
  if (!name) return res.status(400).json({ error: 'اسم المجموعة مطلوب' });
  if (!['FEDERATION', 'LICENSES', 'NONE'].includes(reqType))
    return res.status(400).json({ error: 'نوع الاشتراط غير صحيح' });
  const dup = rows(await query('SELECT 1 AS x FROM Reg_ContractGroups WHERE GroupName=@n', { n: name }));
  if (dup.length) return res.status(409).json({ error: 'المجموعة موجودة بالفعل' });
  await query(
    `INSERT INTO Reg_ContractGroups (GroupNo, GroupName, RequirementType)
     VALUES ((SELECT ISNULL(MAX(GroupNo),0)+1 FROM Reg_ContractGroups), @n, @r)`, { n: name, r: reqType });
  res.json({ ok: true });
}));

router.post('/contracts/groups/:id/subgroups', wrap(async (req, res) => {
  const name = (req.body.subGroupName || '').trim();
  if (!name) return res.status(400).json({ error: 'اسم المجموعة الفرعية مطلوب' });
  const gid = parseInt(req.params.id);
  const dup = rows(await query(
    'SELECT 1 AS x FROM Reg_ContractSubGroups WHERE GroupId=@g AND SubGroupName=@n', { g: gid, n: name }));
  if (dup.length) return res.status(409).json({ error: 'المجموعة الفرعية موجودة بالفعل' });
  await query('INSERT INTO Reg_ContractSubGroups (GroupId, SubGroupName) VALUES (@g, @n)', { g: gid, n: name });
  res.json({ ok: true });
}));

/* إضافة مقاول (multipart) - الاشتراطات بتتفحص هنا على السيرفر مش بس في الشاشة */
router.post('/contracts/subgroups/:id/contractors', (req, res) => {
  upload.array('documents', 10)(req, res, async (uploadErr) => {
    const files = req.files || [];
    const fail = (code, msg) => { cleanupFiles(files); return res.status(code).json({ error: msg }); };
    if (uploadErr) return fail(400, uploadErr.message);

    let contractorId = null;
    try {
      const b = req.body;
      const subId = parseInt(req.params.id);
      const name = (b.companyName || '').trim();
      if (!name) return fail(400, 'اسم الشركة مطلوب');
      if (!STATUSES.includes(b.status)) return fail(400, 'الحالة غير صحيحة');
      if (b.status === 'RED' && !(b.blacklistReason || '').trim()) return fail(400, 'سبب الشطب مطلوب');

      const g = rows(await query(
        `SELECT g.RequirementType FROM Reg_ContractSubGroups s
         JOIN Reg_ContractGroups g ON g.GroupId = s.GroupId WHERE s.SubGroupId=@id`, { id: subId }));
      if (!g.length) return fail(404, 'المجموعة الفرعية غير موجودة');
      const reqType = g[0].RequirementType;

      let fedRegistered = null, fedBranch = null, fedGrade = null, licensed = null;

      if (reqType === 'FEDERATION') {
        fedRegistered = b.federationRegistered === 'true';
        fedBranch = (b.federationBranch || '').trim();
        fedGrade = (b.federationGrade || '').trim();
        if (!fedRegistered) return fail(400, 'المقاول لازم يكون مسجل بالاتحاد المصري للتشييد والبناء');
        if (!fedBranch || !fedGrade) return fail(400, 'الشعبة والفئة مطلوبين');
        if (!files.length) return fail(400, 'لازم رفع ملف إثبات القيد بالاتحاد المصري');
      }
      if (reqType === 'LICENSES') {
        licensed = b.qualifiedAndLicensed === 'true';
        if (!licensed) return fail(400, 'المقاول لازم يكون مؤهل وحاصل على التصاريح والتراخيص اللازمة');
        if (!files.length) return fail(400, 'لازم رفع مستندات التراخيص والتصاريح');
      }

      await query(
        `INSERT INTO Reg_Contractors
           (SubGroupId, CompanyName, Address, Phone, Status, BlacklistReason,
            FederationRegistered, FederationBranch, FederationGrade, QualifiedAndLicensed)
         VALUES (@sg, @n, @a, @p, @s, @r, @fr, @fb, @fg, @ql)`,
        {
          sg: subId, n: name, a: b.address || null, p: b.phone || null, s: b.status,
          r: b.status === 'RED' ? b.blacklistReason.trim() : null,
          fr: fedRegistered === null ? null : (fedRegistered ? 1 : 0),
          fb: fedBranch, fg: fedGrade,
          ql: licensed === null ? null : (licensed ? 1 : 0),
        });

      // نجيب رقم المقاول اللي لسه متضاف
      const idRow = rows(await query(
        'SELECT MAX(ContractorId) AS id FROM Reg_Contractors WHERE SubGroupId=@sg AND CompanyName=@n',
        { sg: subId, n: name }));
      contractorId = idRow[0]?.id;

      for (const f of files) {
        await query(
          `INSERT INTO Reg_ContractorDocuments (ContractorId, DocType, FileName, FilePath, MimeType)
           VALUES (@c, @t, @fn, @fp, @m)`,
          { c: contractorId, t: reqType, fn: fixName(f.originalname), fp: f.path, m: f.mimetype });
      }
      res.json({ ok: true, contractorId });
    } catch (e) {
      console.error('[registry]', e);
      // لو حصل خطأ في النص، نمسح المقاول والملفات علشان ميتسجلش ناقص
      if (contractorId) {
        try { await query('DELETE FROM Reg_ContractorDocuments WHERE ContractorId=@c', { c: contractorId });
              await query('DELETE FROM Reg_Contractors WHERE ContractorId=@c', { c: contractorId }); } catch (_) {}
      }
      fail(500, e.message);
    }
  });
});

router.patch('/contracts/contractors/:id/status', wrap(async (req, res) => {
  const { status, blacklistReason } = req.body;
  if (!STATUSES.includes(status)) return res.status(400).json({ error: 'الحالة غير صحيحة' });
  if (status === 'RED' && !blacklistReason?.trim()) return res.status(400).json({ error: 'سبب الشطب مطلوب' });
  await query('UPDATE Reg_Contractors SET Status=@s, BlacklistReason=@r WHERE ContractorId=@id', {
    id: parseInt(req.params.id), s: status, r: status === 'RED' ? blacklistReason.trim() : null,
  });
  res.json({ ok: true });
}));

/* تحميل / عرض مستند */
router.get('/documents/:docId', wrap(async (req, res) => {
  const r = rows(await query(
    'SELECT FileName, FilePath FROM Reg_ContractorDocuments WHERE DocId=@id', { id: parseInt(req.params.docId) }));
  if (!r.length) return res.status(404).json({ error: 'المستند غير موجود' });
  res.download(r[0].FilePath, r[0].FileName);
}));

module.exports = router;