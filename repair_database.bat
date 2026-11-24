@echo off
chcp 65001 >nul
echo ======================================================================
echo    Procurement System - SQL Server Mojibake Auto-Fix Tool
echo    اداة تصحيح الحروف والترميز العربي في قاعدة بيانات النظام
echo ======================================================================
echo.

cd /d "%~dp0\server"
node scripts\fix_mojibake.js

echo.
echo ======================================================================
pause
