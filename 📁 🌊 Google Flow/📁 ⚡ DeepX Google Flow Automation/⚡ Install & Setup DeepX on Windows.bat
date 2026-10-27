@echo off
chcp 65001 >nul
title DeepX Flow Bridge Windows Setup
echo ==================================================================
echo   🚀 DeepX Flow Bridge & Antigravity MCP Setup (Windows) v1.2.1
echo ==================================================================
echo.

set "SCRIPT_DIR=%~dp0"
set "MCP_DIR=%SCRIPT_DIR%📁 🔌 DeepX MCP Server"
set "SKILLS_DIR=%SCRIPT_DIR%📁 🧠 DeepX AI Skills"
set "CONFIG_DIR=%USERPROFILE%\.gemini\config"
set "MCP_CONFIG=%CONFIG_DIR%\mcp_config.json"

:: 1. Check Node.js
where node >nul 2>nul
if errorlevel 1 (
    echo ❌ Node.js is not found in PATH!
    echo Please install Node.js (v20+ recommended) from https://nodejs.org
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set "NODE_VER=%%i"
echo ✅ Node.js detected: %NODE_VER%

:: 2. Check and Install MCP Server Dependencies
if exist "%MCP_DIR%" (
    echo 📦 Checking MCP server dependencies in "%MCP_DIR%"...
    cd /d "%MCP_DIR%"
    if not exist "node_modules" (
        echo Installing dependencies via npm...
        call npm install
    )
    echo ✅ MCP server ready.
)

:: 3. Install Skills into Antigravity
echo 🧠 Installing custom skills into Antigravity (%CONFIG_DIR%\skills)...
if not exist "%CONFIG_DIR%\skills" mkdir "%CONFIG_DIR%\skills"
if exist "%SKILLS_DIR%" (
    xcopy /E /I /Y "%SKILLS_DIR%\*" "%CONFIG_DIR%\skills\" >nul 2>nul
    echo ✅ Custom skills installed in "%CONFIG_DIR%\skills\".
)

:: 4. Register MCP Server in mcp_config.json
echo 🔌 Registering deepx-flow in Antigravity config...
if not exist "%CONFIG_DIR%" mkdir "%CONFIG_DIR%"

node -e "
const fs = require('fs');
const path = '%MCP_CONFIG%'.replace(/\\/g, '/');
const entryArg = ('%MCP_DIR%\\bin\\deepx-mcp.mjs').replace(/\\/g, '/');
let cfg = {};
if (fs.existsSync(path)) {
  try { cfg = JSON.parse(fs.readFileSync(path, 'utf-8')); } catch (e) { cfg = {}; }
}
if (!cfg.mcpServers) cfg.mcpServers = {};
cfg.mcpServers['deepx-flow'] = {
  command: 'node',
  args: [entryArg]
};
fs.writeFileSync(path, JSON.stringify(cfg, null, 2), 'utf-8');
console.log('✅ Successfully registered deepx-flow in mcp_config.json!');
"

echo.
echo ==================================================================
echo   🎉 Installation Complete! Next Steps:
echo ==================================================================
echo   1. In Chrome, Brave, Edge, or Kiwi Browser (Android):
echo      - Open chrome://extensions
echo      - Enable 'Developer mode' (toggle top right)
echo      - Click 'Load unpacked'
echo      - Select folder:
echo        "%SCRIPT_DIR%📁 🧩 DeepX Chrome Extension"
echo.
echo   2. Open https://flow.google.com and make sure you are logged in.
echo.
echo   3. In Antigravity AI chat, say:
echo      'Check DeepX status and start video generation!'
echo ==================================================================
pause
