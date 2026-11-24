-- ======================================================================
--  أمر إصلاح وربط SQL Server بنظام المشتريات والتعاقدات
--  قم بفتح هذا الملف داخل SSMS واضغط Execute (أو F5)
-- ======================================================================

-- 1. تفعيل وضع المصادقة المختلط (SQL Server and Windows Authentication mode)
EXEC xp_instance_regwrite 
    N'HKEY_LOCAL_MACHINE', 
    N'Software\Microsoft\MSSQLServer\MSSQLServer', 
    N'LoginMode', 
    REG_DWORD, 
    2;

-- 2. ضبط وتفعيل مستخدم sa بكلمة مرور 1 وإلغاء شروط التعقيد لتسهيل الربط
ALTER LOGIN sa WITH PASSWORD = N'1', CHECK_POLICY = OFF, CHECK_EXPIRATION = OFF;
ALTER LOGIN sa ENABLE;

-- 3. التأكد من وجود قاعدة بيانات ProcurementDB وجعل sa مالكاً لها
IF DB_ID('ProcurementDB') IS NULL
BEGIN
    CREATE DATABASE ProcurementDB;
    PRINT N'Created database ProcurementDB successfully.';
END
GO

ALTER AUTHORIZATION ON DATABASE::ProcurementDB TO sa;
GO

USE ProcurementDB;
GO

PRINT N'======================================================================';
PRINT N'✅ تم إعداد المستخدم sa وتفعيل Mixed Mode بنجاح!';
PRINT N'⚠️ الخطوة الهامة الأخيرة: انقر بالزر الأيمن على اسم السيرفر في أعلى SSMS واضغط Restart';
PRINT N'======================================================================';

SELECT @@SERVERNAME AS ConnectedServer, DB_NAME() AS CurrentDatabase, N'تم الربط والتفعيل بنجاح' AS Status;
