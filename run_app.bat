@echo off
echo =========================================================================
echo  VyaparVaani AI - Multilingual Voice Assistant for Bharat
echo  Starting both Backend (8000) and Frontend (3000)...
echo =========================================================================

start "VyaparVaani Backend (Port 8000)" cmd /k "start_backend.bat"
timeout /t 3 /nobreak >nul
start "VyaparVaani Frontend (Port 3000)" cmd /k "start_frontend.bat"

echo.
echo Launching your browser at http://localhost:3000 in 4 seconds...
timeout /t 4 /nobreak >nul
start http://localhost:3000
echo.
echo =========================================================================
echo  Application is running!
echo  Frontend: http://localhost:3000
echo  Backend:  http://127.0.0.1:8000/docs (Interactive Swagger Docs)
echo =========================================================================
