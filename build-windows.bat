@echo off
echo ==========================================
echo  FuelPro Windows Build Script
echo ==========================================
echo.

:: Check for Python
echo [1/5] Checking Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found!
    echo Please install Python from https://python.org/downloads
    echo Make sure to check "Add Python to PATH" during installation
    pause
    exit /b 1
)
echo     Python found
echo.

:: Install PyInstaller
echo [2/5] Installing PyInstaller...
pip install pyinstaller -q
if errorlevel 1 (
    echo ERROR: Failed to install PyInstaller
    pause
    exit /b 1
)
echo     PyInstaller installed
echo.

:: Build EXE
echo [3/5] Building FuelPro.exe...
pyinstaller --onefile --windowed --name FuelPro --add-data "dist;dist" --clean --noconfirm python-server.py
if errorlevel 1 (
    echo ERROR: Build failed
    pause
    exit /b 1
)
echo     Build complete
echo.

:: Move to output
echo [4/5] Copying files...
if not exist "FuelPro-Windows" mkdir "FuelPro-Windows"
copy "dist-exe\FuelPro.exe" "FuelPro-Windows\" >nul
copy "dist\index.html" "FuelPro-Windows\" >nul
copy "dist\*.js" "FuelPro-Windows\" >nul 2>nul
copy "dist\*.css" "FuelPro-Windows\" >nul 2>nul
echo     Files copied
echo.

:: Package as ZIP
echo [5/5] Creating FuelPro-Windows.zip...
powershell -Command "Compress-Archive -Path 'FuelPro-Windows' -DestinationPath 'FuelPro-Windows.zip' -Force"
echo     Package created
echo.

echo ==========================================
echo  BUILD COMPLETE!
echo ==========================================
echo.
echo Output: FuelPro-Windows\FuelPro.exe
echo Package: FuelPro-Windows.zip
echo.
echo To run: Double-click FuelPro-Windows\FuelPro.exe
echo.
pause
