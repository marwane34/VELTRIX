@echo off
REM ============================================================
REM  Build PredictiveMaintenanceDashboard.exe
REM  Requires: pip install -r requirements.txt
REM ============================================================

echo.
echo ==========================================
echo  Predictive Maintenance Dashboard Builder
echo ==========================================
echo.

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found. Install Python 3.10+ and add to PATH.
    pause & exit /b 1
)

REM Install / verify requirements
echo [1/4] Installing requirements...
pip install -r requirements.txt --quiet
if errorlevel 1 (
    echo ERROR: Failed to install requirements.
    pause & exit /b 1
)

REM Create assets dirs if missing
if not exist "assets\icons" mkdir "assets\icons"
if not exist "data"         mkdir "data"
if not exist "exports"      mkdir "exports"
if not exist "logs"         mkdir "logs"

REM Run PyInstaller
echo [2/4] Running PyInstaller...
pyinstaller app.spec --noconfirm --clean
if errorlevel 1 (
    echo ERROR: PyInstaller build failed.
    pause & exit /b 1
)

echo [3/4] Copying config and assets...
if not exist "dist\PredictiveMaintenance\data" mkdir "dist\PredictiveMaintenance\data"
if not exist "dist\PredictiveMaintenance\exports" mkdir "dist\PredictiveMaintenance\exports"
if not exist "dist\PredictiveMaintenance\logs" mkdir "dist\PredictiveMaintenance\logs"
copy config.ini "dist\PredictiveMaintenance\" /Y >nul
xcopy /E /I /Y assets "dist\PredictiveMaintenance\assets" >nul

echo [4/4] Build complete!
echo.
echo Output: dist\PredictiveMaintenance\PredictiveMaintenance.exe
echo.
echo To run: dist\PredictiveMaintenance\PredictiveMaintenance.exe
echo Default login: admin / admin123
echo.
pause
