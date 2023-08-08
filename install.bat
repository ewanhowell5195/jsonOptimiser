@echo off
setlocal enabledelayedexpansion

where winget > nul 2>&1
if !errorlevel! neq 0 (
  echo winget is not available. Please install Node.js manually.
  pause
) else (
  where node > nul 2>&1
  if !errorlevel! neq 0 (
    echo Node.js is not installed. Installing...
    winget install -e --id OpenJS.NodeJS
    start "Installing Node.js modules" "cmd /c %~dpnx0"
    exit
  ) else (
    echo Node.js is already installed.
  )
  echo Installing Node.js modules...
  npm install
  echo Script completed.
  pause
)