@echo off
echo Starting DoctorUndo Development Environment...

echo Checking/Creating virtual environment...
if not exist "backend\venv" (
    echo Creating venv...
    python -m venv backend\venv
)

echo Starting Backend...
start "DoctorUndo Backend" cmd /k "cd backend && call venv\Scripts\activate && pip install -r requirements.txt && python main.py"

echo Starting Frontend...
start "DoctorUndo Frontend" cmd /k "cd frontend && npm install && npm run dev"

echo Done! Both services are starting up in separate windows.
pause
