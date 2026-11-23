@echo off
echo ====================================================
echo Restarting Microsoft SQL Server Service...
echo ====================================================
net stop MSSQLSERVER
net start MSSQLSERVER
echo ====================================================
echo Done! SQL Server is now restarted with Mixed Mode.
echo ====================================================
pause
