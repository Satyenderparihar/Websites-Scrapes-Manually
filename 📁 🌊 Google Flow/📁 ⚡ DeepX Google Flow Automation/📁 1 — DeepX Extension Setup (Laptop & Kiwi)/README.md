# 🎬 DeepX Part 1: Extension Installation & Setup (Laptop & Kiwi Browser)

[![Watch Part 1: DeepX Extension Installation & Laptop Setup](https://img.youtube.com/vi/iHoS37EtfHI/maxresdefault.jpg)](https://youtu.be/iHoS37EtfHI)

> 📺 **Video Tutorial**: [DeepX Extension Installation & Laptop Setup](https://youtu.be/iHoS37EtfHI) (6:00)  
> 👤 **Creator**: [@dipeshkyd](https://youtube.com/@dipeshkyd)  
> 🧭 **Series Navigation**: [Part 0: Mobile Setup ➔](../📁%200%20—%20Install%20Antigravity%20on%20Android%20(Antigem%20Setup)/README.md) | **Part 1 (Current)** | [Part 2: Video Studio ➔](../📁%202%20—%20DeepX%20Video%20Generator%20Studio%20(1-Click%20Automation)/README.md) | [Part 3: Mobile Studio ➔](../📁%203%20—%20DeepX%20Mobile%20Studio%20(Android%20Phone%20Automation)/README.md) | [Master Guide 🏠](../📝%20DeepX_Google_Flow_Automation_Master_Guide.md)

---

## 🔗 Part 1 Resources & Downloads

Everything required specifically for Part 1 is available in the official Google Drive package:

| Resource Type | Resource Details | Link |
| :--- | :--- | :--- |
| 🧩 **DeepX Extension Bundle (Drive v1)** | **DeepX Chrome Extension V1 Full Bundle (Official Google Drive)** | [🔗 Open Drive v1](https://drive.google.com/drive/folders/1Ac1NrxrX5N0YrkyikuQXVhwHVfmPjy-4) |
| 💬 **Community Channel** | Official Updates & Support on WhatsApp | [💬 Join WhatsApp Channel](https://whatsapp.com/channel/0029VbDfNJMBFLgTu35hw72h) |

---

## ⏱️ Video Chapters & Timestamps

| Timestamp | Chapter | What's Covered |
| :--- | :--- | :--- |
| **0:00** | **Hook: Prompting Ka Daur Khatam** | Why manual copy-pasting prompts is completely obsolete in modern AI workflows |
| **0:20** | **Live Result: "Sachchai ki Jeet" Story** | 100% automated 2D animated story demonstration generated through Antigravity + Flow |
| **1:15** | **Architecture: Antigravity + DeepX + Flow** | Technical breakdown of how the local MCP bridge connects the coding agent to browser DOM |
| **2:00** | **DeepX Extension Installation** | Step-by-step download of ZIP, folder extraction, and developer configuration |
| **2:45** | **Chrome Developer Mode & Pinning** | Enabling Developer mode toggle at `chrome://extensions` and pinning the DeepX icon |
| **3:15** | **Subscribe to Unlock Feature** | 1-time channel unlock flow to activate bridge permissions |
| **3:45** | **Antigravity Settings Configuration** | Activating Turbo Mode + Always Proceed auto-approval settings for zero manual prompts |
| **4:15** | **LIVE DEMO: Batch Image Generation** | Parallel queueing of visual prompts inside Google Flow without manual typing |
| **5:00** | **Batch Video Generation & Rapid Handoff** | Auto-animating still images sequentially with Veo 3.1 video engine |
| **5:45** | **Character Reference Lock LIVE** | Locking facial features, lighting, and wardrobe continuity across scene shots |
| **6:00** | **Final Story Output & Conclusion** | Zero-intervention autonomous output showcase and next steps |

---

## 🛠️ Step-by-Step Installation Guide (Laptop & Desktop)

### 1. Download & Extract the Extension
1. Download the extension bundle from [Google Drive v1](https://drive.google.com/drive/folders/1Ac1NrxrX5N0YrkyikuQXVhwHVfmPjy-4) or clone/download from this repository.
2. Extract the ZIP file onto your computer into a permanent folder (e.g., `D:\AI-Tools\DeepX-Extension`).

### 2. Load into Chrome / Brave / Edge / Kiwi Browser
1. Open your Chromium-based browser and navigate to:
   ```text
   chrome://extensions
   ```
2. Turn ON the **Developer mode** switch at the top-right corner.
3. Click the **Load unpacked** button at the top-left.
4. Select the extracted `DeepX Chrome Extension` directory from your downloaded Drive ZIP.
5. DeepX Flow Bridge will now appear in your active extensions list.
6. Pin the extension to your toolbar for quick access.

### 3. One-Time Channel Unlock
1. Click the DeepX icon in your browser toolbar.
2. Complete the 1-time channel subscription unlock for [@dipeshkyd](https://youtube.com/@dipeshkyd).
3. The extension status will turn to **ACTIVE (Ready for Antigravity)**.

### 4. Connect to Google Flow
1. Open [Google Flow](https://flow.google.com) or [Google FX Labs Flow](https://labs.google/fx/tools/flow).
2. Log into your Google Account.
3. Keep this Google Flow tab open. The DeepX extension runs silently in the background and bridges commands from Antigravity.

### 5. Antigravity MCP Server Setup
Run the included Windows batch file or register the MCP server manually in `mcp_config.json`:

```json
{
  "mcpServers": {
    "deepx-flow": {
      "command": "node",
      "args": [
        "path/to/DeepX MCP Server/bin/deepx-mcp.mjs"
      ]
    }
  }
}
```

### 6. Antigravity Settings: Turbo Mode & Auto-Approve
In Antigravity settings:
- Set Mode to **Turbo Mode** (or High-Speed Autonomous Mode).
- Enable **Always Proceed** / Auto-Accept for tools to allow hands-free multi-prompt generation.

---

## 🚀 Next Step: Move to Part 2!

Once your extension and MCP bridge are active, proceed to **Part 2** to turn your setup into a 1-Click Complete AI Video Studio:

👉 **[Go to Part 2: 1 Click = Complete AI Video Studio (deepx-video-studio.zip) ➔](../📁%202%20—%20DeepX%20Video%20Generator%20Studio%20(1-Click%20Automation)/README.md)**
