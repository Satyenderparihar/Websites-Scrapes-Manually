# 🚀 DeepX Flow Bridge for Google Flow & Antigravity (v1.2.0)

> **Autonomous AI Generation Bridge connecting Antigravity Coding Agents directly to Google Flow (Veo 3.1 & Imagen 3) without API costs.**

---

## ⚡ 1-Minute Quickstart (Battery-Included)

### Step 1: Install & Activate (1-Click)
Open your terminal in this unzipped folder and run:
```bash
bash ./setup.sh
```
This single script will automatically:
- ✅ Check Node.js (v20+ supported).
- ✅ Pre-configure `~/.gemini/config/mcp_config.json` with the standalone `deepx-flow` MCP server.
- ✅ Install the fully trained `deepx-rapid-flow` skill into `~/.gemini/config/skills/deepx-rapid-flow/`.

---

### Step 2: Load Extension in Chrome / Kiwi Browser
1. In Chrome, Brave, Edge, or Kiwi Browser (Android):
   - Go to `chrome://extensions`
   - Enable **Developer mode** (toggle in the top-right corner)
   - Click **Load unpacked**
   - Select this unzipped folder (`deepx-flow-bridge-v1.2.0/`)
2. Open [Google Flow](https://flow.google.com) or [Google FX Labs Flow](https://labs.google/fx/tools/flow) in Chrome and ensure you are logged in.
3. Keep the Google Flow browser tab open.

---

### Step 3: Tell Antigravity AI
In your Antigravity AI chat, say:
> *"Check DeepX status and start video generation!"*

Antigravity will instantly detect the bridge and report:
> *"Connected! I can generate images and videos on Google Flow now — just ask."*

---

## 🧠 What's Inside This Package

| Component | Path | Description |
| :--- | :--- | :--- |
| **Chrome Extension** | `manifest.json`, `service-worker.js`, `popup.html`, `sidepanel.html` | High-speed browser bridge with WebSocket RPC & zero-copy frame pipeline. |
| **Standalone MCP Server** | `mcp-server/` (`bin/deepx-mcp.mjs`) | Standard Model Context Protocol server for Antigravity AI agents. |
| **Fully Trained AI Skill** | `skills/deepx-rapid-flow/SKILL.md` | Directorial intelligence: 5-card instant reference stacking, in-memory HTMLCanvas terminal continuity, and fast-path execution. |
| **Directorial Rules** | `skills/GEMINI.md` | Brain vs. Hands architecture, mobile Kiwi Browser zero-crash protocols, and bulk generation rules. |
| **Universal Installer** | `setup.sh` | 1-click cross-platform installer (Linux, macOS, WSL, Android Termux). |

---

## 🏎️ Key Features

- **⚡ Fast-Path Autopilot**: Zero loading pauses. When a script or storyboard is provided, Antigravity generates back-to-back scenes without repetitive interviews.
- **📸 5-Card Instant Stacking**: Automates Google Flow's native `<flow-ingredient-bar>` to bind up to 5 reference photo cards in a single <300ms pass.
- **🎞️ Universal Interconnected Continuity**: Automatically grabs the terminal end frame of scene $N$ via in-memory HTML5 Canvas and chains it as the reference for scene $N+1$ in <1.5s with zero visual drift.
- **📱 Mobile Kiwi Browser Support**: Specialized protections against Android Low Memory Killer (`lmkd`) and debugger crashes for seamless mobile workflow.
- **💰 100% Free / Zero API Cost**: Uses your active logged-in Google Flow session.
