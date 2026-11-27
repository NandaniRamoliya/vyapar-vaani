@echo off
echo =========================================================================
echo  VyaparVaani - Phone mode (https on your Wi-Fi so the mic works on phones)
echo =========================================================================
start "VyaparVaani Backend (Port 8000)" cmd /k "start_backend.bat"
timeout /t 3 /nobreak >nul
cd frontend
if not exist "node_modules" call npm install
echo.
echo  On your phone (same Wi-Fi), open the "Network: https://..." address shown below.
echo  Accept the certificate warning once (Advanced ^> Proceed). Then Add to Home Screen.
echo.
call npm run phone
pause
