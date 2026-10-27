#!/usr/bin/env bash
# ==============================================================================
# DeepX Flow Bridge: 1-Click Universal Installer & AI Skill/Plugin Activator
# Works on Linux, macOS, WSL, and Android (Termux)
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MCP_SERVER_DIR="$SCRIPT_DIR/mcp-server"
SKILLS_DIR="$SCRIPT_DIR/skills"
CONFIG_DIR="$HOME/.gemini/config"
MCP_CONFIG="$CONFIG_DIR/mcp_config.json"
TARGET_SKILLS_DIR="$CONFIG_DIR/skills/deepx-rapid-flow"
PLUGIN_DIR="$CONFIG_DIR/plugins/deepx-flow"

echo "=================================================================="
echo "  🚀 DeepX Flow Bridge & Antigravity Global Plugin Installer v1.2.0"
echo "=================================================================="

# 1. Check Node.js
if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js is not installed. Please install Node.js (v20+ recommended)."
  exit 1
fi

NODE_VER=$(node -v)
echo "✅ Node.js detected: $NODE_VER"

# 2. Install MCP Server Dependencies if needed
if [ -d "$MCP_SERVER_DIR" ]; then
  echo "📦 Checking MCP server dependencies in $MCP_SERVER_DIR..."
  cd "$MCP_SERVER_DIR"
  if [ ! -d "node_modules" ]; then
    echo "Installing dependencies via npm..."
    npm install --silent 2>/dev/null || npm install
  fi
  cd "$SCRIPT_DIR"
  echo "✅ MCP server ready."
fi

# 3. Install Antigravity Custom Skills (including 8-Bit Retro, MatAnyone Matting, Gemini Director, 2D Spy Documentary)
echo "🧠 Installing custom skills into Antigravity ($CONFIG_DIR)..."
mkdir -p "$CONFIG_DIR/skills"
if [ -d "$SKILLS_DIR" ]; then
  cp -r "$SKILLS_DIR"/* "$CONFIG_DIR/skills/" 2>/dev/null || true
  echo "✅ Custom skills installed in: $CONFIG_DIR/skills/"
fi

# 4. Install Global Antigravity Plugin (rules + skills + manifest)
echo "🔌 Installing Global Antigravity Plugin into $PLUGIN_DIR..."
mkdir -p "$PLUGIN_DIR/rules"
mkdir -p "$PLUGIN_DIR/skills"

cat << 'PLUGIN_EOF' > "$PLUGIN_DIR/plugin.json"
{
  "name": "deepx-flow",
  "displayName": "DeepX Google Flow Bridge",
  "version": "1.2.1",
  "description": "Ultra-fast zero-latency production engine connecting Antigravity AI agents directly to Google Flow (Veo 3.1 & Imagen 3) for autonomous multi-scene video ads, batch image generation, and character continuity.",
  "keywords": [
    "deepx",
    "google flow",
    "veo",
    "imagen",
    "video generation",
    "storyboard",
    "flow bridge"
  ]
}
PLUGIN_EOF

if [ -f "$SKILLS_DIR/GEMINI.md" ]; then
  cp "$SKILLS_DIR/GEMINI.md" "$PLUGIN_DIR/rules/AGENTS.md"
  cp "$SKILLS_DIR/GEMINI.md" "$PLUGIN_DIR/rules/GEMINI.md"
fi
if [ -d "$SKILLS_DIR" ]; then
  cp -r "$SKILLS_DIR"/* "$PLUGIN_DIR/skills/" 2>/dev/null || true
fi
echo "✅ Global Plugin installed with active rules and skills across all workspaces."

# 5. Install MCP Instructions for zero-latency AI recognition
MCP_INST_DIRS=(
  "$HOME/.gemini/antigravity/mcp/deepx-flow"
  "$HOME/.gemini/antigravity-ide/mcp/deepx-flow"
)
for idir in "${MCP_INST_DIRS[@]}"; do
  mkdir -p "$idir"
  if [ -f "$MCP_SERVER_DIR/instructions.md" ]; then
    cp "$MCP_SERVER_DIR/instructions.md" "$idir/instructions.md"
  fi
  if [ -d "$MCP_SERVER_DIR/schemas" ]; then
    cp "$MCP_SERVER_DIR/schemas"/*.json "$idir/" 2>/dev/null || true
  fi
done
echo "✅ MCP instructions & 23 tool schemas installed for instant zero-latency discovery."

# 6. Register MCP Server in ~/.gemini/config/mcp_config.json
mkdir -p "$CONFIG_DIR"
ENTRY_CMD="node"
ENTRY_ARG="$MCP_SERVER_DIR/bin/deepx-mcp.mjs"

if [ ! -f "$MCP_CONFIG" ]; then
  echo "Creating new $MCP_CONFIG..."
  cat << JSON_EOF > "$MCP_CONFIG"
{
  "mcpServers": {
    "deepx-flow": {
      "command": "$ENTRY_CMD",
      "args": ["$ENTRY_ARG"]
    }
  }
}
JSON_EOF
  echo "✅ Created $MCP_CONFIG with deepx-flow registered."
else
  # Check if deepx-flow is already registered
  if grep -q "deepx-flow" "$MCP_CONFIG" 2>/dev/null; then
    echo "ℹ️ deepx-flow is already registered in $MCP_CONFIG."
  else
    echo "Updating $MCP_CONFIG to add deepx-flow..."
    node -e '
      const fs = require("fs");
      const path = process.argv[1];
      const entryArg = process.argv[2];
      try {
        const cfg = JSON.parse(fs.readFileSync(path, "utf-8"));
        if (!cfg.mcpServers) cfg.mcpServers = {};
        cfg.mcpServers["deepx-flow"] = {
          command: "node",
          args: [entryArg]
        };
        fs.writeFileSync(path, JSON.stringify(cfg, null, 2), "utf-8");
        console.log("✅ Successfully updated mcp_config.json.");
      } catch (err) {
        console.error("Warning: could not parse mcp_config.json:", err.message);
      }
    ' "$MCP_CONFIG" "$ENTRY_ARG"
  fi
fi

# 7. Register Antigravity URL scheme (antigravity://) for 1-click launch from Chrome extension
if [ "$(uname)" = "Linux" ]; then
  echo "🔗 Configuring Antigravity system URL handler (antigravity://)..."
  ANTIGRAVITY_BIN=""
  POSSIBLE_PATHS=(
    "$(command -v antigravity 2>/dev/null || true)"
    "$HOME/Downloads/Antigravity/Antigravity-x64/antigravity"
    "$HOME/Downloads/Antigravity/antigravity"
    "/opt/Antigravity/antigravity"
    "/usr/bin/antigravity"
    "/usr/local/bin/antigravity"
  )
  for p in "${POSSIBLE_PATHS[@]}"; do
    if [ -n "$p" ] && [ -x "$p" ]; then
      ANTIGRAVITY_BIN="$p"
      break
    fi
  done

  if [ -n "$ANTIGRAVITY_BIN" ]; then
    DESKTOP_DIR="$HOME/.local/share/applications"
    mkdir -p "$DESKTOP_DIR"
    cat << EOF > "$DESKTOP_DIR/antigravity.desktop"
[Desktop Entry]
Name=Antigravity
Exec="$ANTIGRAVITY_BIN" %u
Type=Application
Terminal=false
MimeType=x-scheme-handler/antigravity;
EOF
    update-desktop-database "$DESKTOP_DIR" 2>/dev/null || true
    if command -v xdg-mime >/dev/null 2>&1; then
      xdg-mime default antigravity.desktop x-scheme-handler/antigravity
    fi
    echo "✅ Antigravity URL handler registered ($ANTIGRAVITY_BIN)."
  else
    echo "ℹ️ Antigravity binary not found in standard paths; skipping protocol handler registration."
  fi
fi

# 8. Make scripts executable
chmod +x "$SCRIPT_DIR/setup.sh" "$MCP_SERVER_DIR/bin/"* 2>/dev/null || true

echo ""
echo "=================================================================="
echo "  🎉 Installation Complete! DeepX is Fully Functional."
echo "=================================================================="
echo "  1. In Chrome or Kiwi Browser:"
echo "     - Go to chrome://extensions"
echo "     - Enable 'Developer mode' (top right toggle)"
echo "     - Click 'Load unpacked' and select this folder:"
echo "       $SCRIPT_DIR"
echo "  2. Open https://flow.google.com in Chrome and log in."
echo "  3. In Antigravity AI, say: 'Check DeepX status and start video generation!'"
echo "=================================================================="
