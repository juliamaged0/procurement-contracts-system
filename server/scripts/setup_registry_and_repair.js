const { connectDb, query } = require('../config/db');
const iconv = require('iconv-lite');

function fixMojibake(str) {
  if (!str || typeof str !== 'string') return str;
  if (!/[\u00C0-\u00FF]/.test(str)) return str;
  try {
    const candidate = iconv.decode(iconv.encode(str, 'win1252'), 'utf8');
    if (/[\u0600-\u06FF]/.test(candidate) && !candidate.includes('\uFFFD')) {
      return candidate;
    }
  } catch (e) {}
  return str;
}

async function setup() {
  console.log('🔌 Connecting to database...');
  await connectDb();
  console.log('🚀 Connected to database!');

  // 1. Create Reg_SupplyGroups
  await query(`
    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Reg_SupplyGroups')
    BEGIN
      CREATE TABLE Reg_SupplyGroups (
        GroupId INT IDENTITY(1,1) PRIMARY KEY,
        GroupNo INT,
        GroupName NVARCHAR(300) NOT NULL UNIQUE
      );
      PRINT 'Created Reg_SupplyGroups';
    END
  `);

  // 2. Create Reg_SupplyVendors
  await query(`
    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Reg_SupplyVendors')
    BEGIN
      CREATE TABLE Reg_SupplyVendors (
        VendorId INT IDENTITY(1,1) PRIMARY KEY,
        GroupId INT NOT NULL FOREIGN KEY REFERENCES Reg_SupplyGroups(GroupId) ON DELETE CASCADE,
        CompanyName NVARCHAR(300) NOT NULL,
        Address NVARCHAR(500) NULL,
        Phone NVARCHAR(100) NULL,
        Status NVARCHAR(20) NOT NULL DEFAULT 'GREEN',
        BlacklistReason NVARCHAR(MAX) NULL,
        CreatedAt DATETIME DEFAULT GETDATE()
      );
      PRINT 'Created Reg_SupplyVendors';
    END
  `);

  // 3. Create Reg_ContractGroups
  await query(`
    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Reg_ContractGroups')
    BEGIN
      CREATE TABLE Reg_ContractGroups (
        GroupId INT IDENTITY(1,1) PRIMARY KEY,
        GroupNo INT,
        GroupName NVARCHAR(300) NOT NULL UNIQUE,
        RequirementType NVARCHAR(50) NOT NULL DEFAULT 'NONE'
      );
      PRINT 'Created Reg_ContractGroups';
    END
  `);

  // 4. Create Reg_ContractSubGroups
  await query(`
    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Reg_ContractSubGroups')
    BEGIN
      CREATE TABLE Reg_ContractSubGroups (
        SubGroupId INT IDENTITY(1,1) PRIMARY KEY,
        GroupId INT NOT NULL FOREIGN KEY REFERENCES Reg_ContractGroups(GroupId) ON DELETE CASCADE,
        SubGroupName NVARCHAR(300) NOT NULL
      );
      PRINT 'Created Reg_ContractSubGroups';
    END
  `);

  // 5. Create Reg_Contractors
  await query(`
    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Reg_Contractors')
    BEGIN
      CREATE TABLE Reg_Contractors (
        ContractorId INT IDENTITY(1,1) PRIMARY KEY,
        SubGroupId INT NOT NULL FOREIGN KEY REFERENCES Reg_ContractSubGroups(SubGroupId) ON DELETE CASCADE,
        CompanyName NVARCHAR(300) NOT NULL,
        Address NVARCHAR(500) NULL,
        Phone NVARCHAR(100) NULL,
        Status NVARCHAR(20) NOT NULL DEFAULT 'GREEN',
        BlacklistReason NVARCHAR(MAX) NULL,
        FederationRegistered BIT NULL,
        FederationBranch NVARCHAR(200) NULL,
        FederationGrade NVARCHAR(100) NULL,
        QualifiedAndLicensed BIT NULL,
        CreatedAt DATETIME DEFAULT GETDATE()
      );
      PRINT 'Created Reg_Contractors';
    END
  `);

  // 6. Create Reg_ContractorDocuments
  await query(`
    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Reg_ContractorDocuments')
    BEGIN
      CREATE TABLE Reg_ContractorDocuments (
        DocId INT IDENTITY(1,1) PRIMARY KEY,
        ContractorId INT NOT NULL FOREIGN KEY REFERENCES Reg_Contractors(ContractorId) ON DELETE CASCADE,
        DocType NVARCHAR(50) NULL,
        FileName NVARCHAR(300) NOT NULL,
        FilePath NVARCHAR(500) NOT NULL,
        MimeType NVARCHAR(100) NULL,
        UploadedAt DATETIME DEFAULT GETDATE()
      );
      PRINT 'Created Reg_ContractorDocuments';
    END
  `);

  // Seed Supply Groups from SupplyCategories or defaults if empty
  const supplyGroupCount = await query('SELECT COUNT(*) AS c FROM Reg_SupplyGroups');
  if (supplyGroupCount[0].c === 0) {
    console.log('Seeding Reg_SupplyGroups...');
    const cats = await query('SELECT CategoryId, CategoryName FROM SupplyCategories ORDER BY CategoryId');
    if (cats.length > 0) {
      for (const cat of cats) {
        const cleanName = fixMojibake(cat.CategoryName);
        try {
          await query(
            'INSERT INTO Reg_SupplyGroups (GroupNo, GroupName) VALUES (@no, @name)',
            { no: cat.CategoryId, name: cleanName }
          );
        } catch (e) {}
      }
    } else {
      // Default standard company categories
      const defaults = [
        'المواسير بأنوعها و البلوف و المحابس و القطع المخصوص',
        'الأغطية الخرسانية والبرابخ',
        'السيارات وقطع غيار السيارات النقل والركايب',
        'قطع غيار الأوناش والمعدات الثقيلة',
        'المهمات والأدوات الكهربائية والكابلات',
        'المهمات الكهروميكانيكية والمضخات الغاطسة',
        'أدوات ومهمات السلامة والصحة المهنية',
        'الزيوت والشحومات والكيماويات ومواد المعالجة'
      ];
      for (let i = 0; i < defaults.length; i++) {
        await query(
          'INSERT INTO Reg_SupplyGroups (GroupNo, GroupName) VALUES (@no, @name)',
          { no: i + 1, name: defaults[i] }
        );
      }
    }

    // Seed sample vendors into first groups
    const firstGroup = await query('SELECT TOP 1 GroupId FROM Reg_SupplyGroups ORDER BY GroupId');
    if (firstGroup.length > 0) {
      const gId = firstGroup[0].GroupId;
      await query(`
        INSERT INTO Reg_SupplyVendors (GroupId, CompanyName, Address, Phone, Status)
        VALUES 
        (@g, N'شركة الحمد للتجارة والتوريدات الفنية', N'11 ش الكهرمان الحضرة القبلية الاسكندرية', N'01012345678', 'GREEN'),
        (@g, N'شركة النيل لتوريدات المحابس والمواسير', N'شارع النصر - المنشية - الإسكندرية', N'01222334455', 'YELLOW')
      `, { g: gId });
    }
  }

  // Seed Contract Groups & SubGroups if empty
  const contractGroupCount = await query('SELECT COUNT(*) AS c FROM Reg_ContractGroups');
  if (contractGroupCount[0].c === 0) {
    console.log('Seeding Reg_ContractGroups...');
    const groupsDef = [
      {
        no: 1,
        name: 'شبكات مياه الشرب والصرف الصحي ومحطات المعالجة والرفع',
        req: 'FEDERATION',
        subs: [
          'مد وإحلال وتجديد خطوط وشبكات الصرف الصحي',
          'محطات الرفع والمعالجة والبيارات',
          'التعديات والعدايات النفقية والميكانيكية'
        ],
        contractors: [
          {
            name: 'شركة الإسكندرية لمقاولات شبكات الصرف',
            addr: 'أبراج لاند مارك سموحة الإسكندرية',
            phone: '01234567890',
            status: 'GREEN',
            branch: 'شبكات المياه والصرف الصحي',
            grade: 'الأولى'
          }
        ]
      },
      {
        no: 2,
        name: 'الأعمال المدنية والإنشائية والمعمارية العامة',
        req: 'FEDERATION',
        subs: [
          'إنشاء وتطوير المباني الإدارية والخدمية',
          'أعمال الترميمات والتشطيبات المعمارية المتكاملة',
          'الأسوار والمظلات والمنشآت الخرسانية'
        ],
        contractors: [
          {
            name: 'شركة الصفا للمقاولات والإنشاءات الهندسية',
            addr: 'طريق الحرية - زيزينيا - الإسكندرية',
            phone: '01055566677',
            status: 'GREEN',
            branch: 'أعمال المباني المتكاملة',
            grade: 'الثانية'
          }
        ]
      },
      {
        no: 3,
        name: 'الأعمال الكهروميكانيكية وخطوط الطرد',
        req: 'FEDERATION',
        subs: [
          'تركيب وصيانة الطلمبات والمحركات والمحولات',
          'لوحات التحكم والقدرة وأنظمة SCADA',
          'المولدات الكهربائية ووحدات التوليد الاحتياطية'
        ],
        contractors: []
      },
      {
        no: 4,
        name: 'أعمال الطرق والرصف والبنية التحتية',
        req: 'FEDERATION',
        subs: [
          'إعادة الشيء لأصله وأعمال الرصف الأسفلتي',
          'تجهيز المسارات وقطع وتمهيد الطرق'
        ],
        contractors: []
      },
      {
        no: 5,
        name: 'خدمات الحراسة والأمن والسلامة المهنية',
        req: 'LICENSES',
        subs: [
          'حراسة وتأمين المقار والمحطات والمخازن',
          'أنظمة مكافحة الحريق والإنذار المبكر'
        ],
        contractors: [
          {
            name: 'الشركة الدولية للأمن والحراسات المتخصصة',
            addr: 'سموحة - أمام نادي سموحة',
            phone: '01199887766',
            status: 'GREEN',
            licensed: true
          }
        ]
      },
      {
        no: 6,
        name: 'خدمات التطهير البيئي ونقل الرواسب والمخلفات',
        req: 'LICENSES',
        subs: [
          'سحب ونقل الرواسب والحمأة والتخلص الآمن',
          'تطهير المطابق والشنايش والمجمعات'
        ],
        contractors: []
      },
      {
        no: 7,
        name: 'أعمال الصيانة العامة والخدمات المعاونة',
        req: 'NONE',
        subs: [
          'صيانة المرافق والسباكة والنجارة',
          'خدمات النظافة الشاملة للمواقع'
        ],
        contractors: []
      }
    ];

    for (const g of groupsDef) {
      await query(
        'INSERT INTO Reg_ContractGroups (GroupNo, GroupName, RequirementType) VALUES (@no, @name, @req)',
        { no: g.no, name: g.name, req: g.req }
      );
      const gRow = await query('SELECT GroupId FROM Reg_ContractGroups WHERE GroupName = @name', { name: g.name });
      const groupId = gRow[0].GroupId;

      for (let sIdx = 0; sIdx < g.subs.length; sIdx++) {
        const subName = g.subs[sIdx];
        await query(
          'INSERT INTO Reg_ContractSubGroups (GroupId, SubGroupName) VALUES (@g, @n)',
          { g: groupId, n: subName }
        );
        const subRow = await query(
          'SELECT SubGroupId FROM Reg_ContractSubGroups WHERE GroupId = @g AND SubGroupName = @n',
          { g: groupId, n: subName }
        );
        const subGroupId = subRow[0].SubGroupId;

        // If contractors in this group and it is first subgroup
        if (sIdx === 0 && g.contractors && g.contractors.length > 0) {
          for (const c of g.contractors) {
            await query(`
              INSERT INTO Reg_Contractors 
              (SubGroupId, CompanyName, Address, Phone, Status, FederationRegistered, FederationBranch, FederationGrade, QualifiedAndLicensed)
              VALUES 
              (@sg, @name, @addr, @phone, @status, @fed, @branch, @grade, @lic)
            `, {
              sg: subGroupId,
              name: c.name,
              addr: c.addr,
              phone: c.phone,
              status: c.status,
              fed: c.branch ? 1 : 0,
              branch: c.branch || null,
              grade: c.grade || null,
              lic: c.licensed ? 1 : 0
            });
          }
        }
      }
    }
  }

  // 7. Full Mojibake Auto-Fix on all tables
  console.log('🔄 Cleaning up text encoding across all tables in ProcurementDB...');
  const textCols = await query(`
    SELECT c.TABLE_NAME, c.COLUMN_NAME, c.DATA_TYPE
    FROM INFORMATION_SCHEMA.COLUMNS c
    JOIN INFORMATION_SCHEMA.TABLES t ON c.TABLE_NAME = t.TABLE_NAME
    WHERE t.TABLE_TYPE = 'BASE TABLE'
      AND c.DATA_TYPE IN ('nvarchar', 'varchar', 'text', 'ntext')
      AND c.TABLE_NAME NOT IN ('sysdiagrams')
    ORDER BY c.TABLE_NAME, c.ORDINAL_POSITION
  `);

  // Group by table
  const byTable = {};
  for (const col of textCols) {
    if (!byTable[col.TABLE_NAME]) byTable[col.TABLE_NAME] = [];
    byTable[col.TABLE_NAME].push(col.COLUMN_NAME);
  }

  let totalRepaired = 0;
  for (const [tableName, cols] of Object.entries(byTable)) {
    try {
      // Find PK column
      const pkQuery = await query(`
        SELECT kcu.COLUMN_NAME
        FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
        JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu 
          ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
        WHERE tc.TABLE_NAME = @t AND tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
      `, { t: tableName });

      if (pkQuery.length === 0) continue;
      const pk = pkQuery[0].COLUMN_NAME;

      // Select PK + cols
      const selSql = `SELECT [${pk}], ${cols.map(c => `[${c}]`).join(', ')} FROM [${tableName}]`;
      const rows = await query(selSql);

      for (const row of rows) {
        const pkVal = row[pk];
        const updates = [];
        const params = { pkVal };

        for (const col of cols) {
          const val = row[col];
          if (typeof val === 'string' && /[\u00C0-\u00FF]/.test(val)) {
            const fixed = fixMojibake(val);
            if (fixed !== val) {
              updates.push(`[${col}] = @val_${col}`);
              params[`val_${col}`] = fixed;
            }
          }
        }

        if (updates.length > 0) {
          const upSql = `UPDATE [${tableName}] SET ${updates.join(', ')} WHERE [${pk}] = @pkVal`;
          await query(upSql, params);
          totalRepaired++;
        }
      }
    } catch (e) {
      console.warn(`Could not repair table ${tableName}:`, e.message);
    }
  }

  console.log(`✅ Finished! Total corrupted text fields repaired: ${totalRepaired}`);
  console.log('🎉 Registry tables and official company data successfully initialized!');
  process.exit(0);
}

setup().catch((e) => {
  console.error('❌ Setup error:', e);
  process.exit(1);
});
