@echo off
REM ============================================================
REM  VELTRIX — Predictive Maintenance Dashboard Builder
REM  Builds: PredictiveMaintenance.exe
REM  Requires: pip install -r requirements.txt
REM ============================================================

echo.
echo =====================================================
echo  VELTRIX Predictive Maintenance Dashboard Builder
echo =====================================================
echo.

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found. Install Python 3.10+ and add to PATH.
    pause & exit /b 1
)

REM Install / verify requirements
echo [1/5] Installing requirements...
pip install -r requirements.txt --quiet
if errorlevel 1 (
    echo ERROR: Failed to install requirements.
    pause & exit /b 1
)

REM Create required directories
if not exist "assets\icons" mkdir "assets\icons"
if not exist "data"         mkdir "data"
if not exist "exports"      mkdir "exports"
if not exist "logs"         mkdir "logs"

REM Generate icons from source logo
echo [2/5] Generating VELTRIX icons...
python create_icons.py
if errorlevel 1 (
    echo WARNING: Icon generation failed, using existing icons if available.
)

REM Verify app.ico exists
if not exist "assets\icons\app.ico" (
    echo ERROR: app.ico not found in assets\icons\. Run create_icons.py manually.
    pause & exit /b 1
)

REM Run PyInstaller with icon
echo [3/5] Running PyInstaller...
pyinstaller app.spec --noconfirm --clean
if errorlevel 1 (
    echo ERROR: PyInstaller build failed.
    pause & exit /b 1
)

echo [4/5] Copying config and assets...
if not exist "dist\VELTRIX\data"    mkdir "dist\VELTRIX\data"
if not exist "dist\VELTRIX\exports" mkdir "dist\VELTRIX\exports"
if not exist "dist\VELTRIX\logs"    mkdir "dist\VELTRIX\logs"
copy config.ini "dist\VELTRIX\" /Y >nul
xcopy /E /I /Y assets "dist\VELTRIX\assets" >nul

echo [5/5] Build complete!
echo.
echo =====================================================
echo  Output: dist\VELTRIX\VELTRIX.exe
echo  Default login: admin / admin123
echo =====================================================
echo.
pause
