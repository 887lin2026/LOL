@echo off
setlocal
cd /d "%~dp0"

echo ============================================
echo Nidalee LevelRotation - Windows x64 build
echo ============================================
where node >nul 2>nul || (echo ERROR: Node.js is missing. & exit /b 1)
where npm >nul 2>nul || (echo ERROR: npm is missing. & exit /b 1)
where rustc >nul 2>nul || (echo ERROR: Rust is missing. & exit /b 1)
where cargo >nul 2>nul || (echo ERROR: Cargo is missing. & exit /b 1)

echo [1/3] Installing npm dependencies...
call npm ci
if errorlevel 1 exit /b 1

echo [2/3] Building Windows EXE...
cd /d "%~dp0apps\desktop"
call npx --no-install tauri build --ci --bundles none --config src-tauri/tauri.local-build.conf.json
if errorlevel 1 exit /b 1

echo [3/3] Checking output...
if not exist "src-tauri\target\release\nidalee.exe" (
 echo ERROR: nidalee.exe not found.
 exit /b 1
)

echo SUCCESS: %~dp0apps\desktop\src-tauri\target\release\nidalee.exe
if /I "%~1"=="--msi" (
 echo Optional: Building MSI installer...
 call npx --no-install tauri build --ci --bundles msi --config src-tauri/tauri.local-build.conf.json
 if errorlevel 1 exit /b 1
 echo MSI output: %~dp0apps\desktop\src-tauri\target\release\bundle\msi
)
exit /b 0
