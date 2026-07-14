@echo off
title MOTION PULSE
cd /d "%~dp0"
start "" http://localhost:8088
powershell -NoProfile -ExecutionPolicy Bypass -Command "Write-Host 'MOTION PULSE is running at http://localhost:8088' -ForegroundColor Cyan; python -m http.server 8088"
