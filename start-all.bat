@echo off
echo 🚀 Starting Complete Divine Energy Hub System...
echo.
echo Starting Backend Server...
start "Backend Server" cmd /k "cd backend && python -m pip install -r requirements.txt && python app.py"
timeout /t 3 /nobreak >nul
echo.
echo Starting Frontend Server...
start "Frontend Server" cmd /k "npm start"
echo.
echo ✅ Both servers are starting up!
echo 📍 Backend: http://localhost:5000
echo 🎨 Frontend: http://localhost:3000
echo.
pause
