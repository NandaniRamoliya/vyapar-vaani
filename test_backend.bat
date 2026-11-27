@echo off
echo Running Backend Unit and Flow Test Suite...
cd backend
venv\Scripts\python -m pytest tests/ -v
pause
