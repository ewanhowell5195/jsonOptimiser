@echo off
setlocal

where node > nul 2>&1
if %errorlevel% neq 0 (
    echo Node.js is not installed. Installing...
    runas /user:Administrator "winget install -e --id OpenJS.Nodejs"
) else (
    echo Node.js is already installed.
    echo Installing Node.js modules...
    npm install
)

echo Install completed.