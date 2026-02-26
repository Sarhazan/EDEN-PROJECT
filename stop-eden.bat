@echo off
echo Stopping Eden server...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3002 " ^| findstr LISTENING') do (
    taskkill /PID %%a /F >nul 2>&1
    echo Killed process %%a on port 3002
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5174 " ^| findstr LISTENING') do (
    taskkill /PID %%a /F >nul 2>&1
    echo Killed process %%a on port 5174
)
echo Eden stopped!
timeout /t 2 >nul
