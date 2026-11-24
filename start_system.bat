@echo off
chcp 65001 >nul
echo ======================================================================
echo    نظام إدارة العقود والمشتريات - تشغيل النظام بالكامل
echo ======================================================================
echo.

start "Procurement Backend Server" cmd /k "cd /d %~dp0\server && npm start"
timeout /t 2 >nul
start "Procurement Frontend Client" cmd /k "cd /d %~dp0\client && npm run dev"

echo ✅ تم إطلاق السيرفر والواجهة الأمامية في نافذتين منفصلتين.
echo افتح المتصفح على: http://localhost:3000
echo.
pause
