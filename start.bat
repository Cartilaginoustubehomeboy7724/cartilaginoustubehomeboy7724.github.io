@echo off
chcp 65001 >nul
cd /d "%~dp0"
set "NODE_EXE=C:\Users\LIU\.workbuddy\binaries\node\versions\22.22.2-3\node.exe"
if not exist "%NODE_EXE%" set "NODE_EXE=node"
"%NODE_EXE%" serve.js
pause
