@echo off
echo ========================================================
echo  Starting VyaparVaani AI Frontend (Vite on Port 3000)
echo ========================================================
cd frontend
if not exist "node_modules" (
    echo [ERROR] node_modules not found. Running npm install...
    call npm install
)
call npm run dev -- --port 3000
pause
