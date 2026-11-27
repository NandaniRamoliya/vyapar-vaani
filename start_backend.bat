@echo off
echo ========================================================
echo  Starting VyaparVaani AI Backend (FastAPI on Port 8000)
echo  Zero-Key Mode: Active (Offline Deterministic NLP Engine)
echo ========================================================
cd backend
if not exist "venv\Scripts\python.exe" (
    echo [ERROR] Virtual environment not found. Creating venv and installing packages...
    python -m venv venv
    venv\Scripts\pip install -r requirements.txt
)
venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
pause
