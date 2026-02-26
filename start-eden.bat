@echo off
echo Starting Eden server...
cd /d "C:\dev\projects\claude projects\eden claude"
start /B cmd /c "npm run dev > C:\dev\projects\eden-server.log 2>&1"
echo.
echo Eden is starting up!
echo Frontend: http://localhost:5174
echo Backend:  http://localhost:3002
echo Log file: C:\dev\projects\eden-server.log
echo.
timeout /t 3 >nul
