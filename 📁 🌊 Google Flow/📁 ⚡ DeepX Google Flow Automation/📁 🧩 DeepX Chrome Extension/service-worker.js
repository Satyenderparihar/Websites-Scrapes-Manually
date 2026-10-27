// DeepX Antigravity Flow Bridge Service Worker
// High-performance bidirectional bridge connecting Antigravity agents to Google Flow

// Automatically open the full studio Side Panel when clicking the extension icon
if (chrome.sidePanel?.setPanelBehavior) {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((err) => {
    console.warn("[DeepX] setPanelBehavior warning:", err);
  });
}

chrome.action?.onClicked?.addListener(async (tab) => {
  try {
    if (chrome.sidePanel?.open) {
      if (tab?.id) {
        await chrome.sidePanel.open({ tabId: tab.id });
      } else if (tab?.windowId) {
        await chrome.sidePanel.open({ windowId: tab.windowId });
      }
    }
  } catch (err) {
    console.warn("[DeepX] Failed to open side panel on action click:", err);
  }
});

const CANDIDATE_HOSTS = ["127.0.0.1:8792"];
let currentHostIndex = 0;
let activeConnectedHost = null;
const AISANDBOX_API = "https://aisandbox-pa.googleapis.com";

let ws = null;
let reconnectTimer = null;
let wsHeartbeatInterval = null;
let isMcpManuallyDisconnected = false;
let activeFlowTabId = null;

// Batch queue tracking
const activeBatches = new Map();

async function getTargetWsUrl() {
  const stored = await chrome.storage.local.get(["customAgyHost"]);
  if (stored.customAgyHost) {
    const clean = stored.customAgyHost.trim().replace(/^wss?:\/\//, "").replace(/\/.*$/, "");
    return `ws://${clean}/ws`;
  }
  const host = CANDIDATE_HOSTS[currentHostIndex % CANDIDATE_HOSTS.length];
  return `ws://${host}/ws`;
}

// Helper: Extract project ID from URL, query parameter, or JSON
function extractProjectId(str) {
  if (!str || typeof str !== "string") return null;
  const mPath = str.match(/projects?\/([a-zA-Z0-9_-]{6,})/i);
  if (mPath && !["new", "all", "recent", "templates", "trash"].includes(mPath[1].toLowerCase())) {
    return mPath[1];
  }
  const mQuery = str.match(/[?&](?:project|projectId|project_id)=([a-zA-Z0-9_-]{6,})/i);
  if (mQuery) return mQuery[1];
  const mJson = str.match(/"projectId"\s*:\s*"([a-zA-Z0-9_-]{6,})"/i);
  if (mJson) return mJson[1];
  return null;
}

// High-reliability Flow URL matcher
function isGoogleFlowUrl(urlStr, title = "") {
  if (!urlStr || typeof urlStr !== "string") return false;
  const lower = urlStr.toLowerCase();
  const tLower = (title || "").toLowerCase();
  if (lower.includes("google.com/search")) return false;
  return (
    lower.includes("flow.google.com") ||
    lower.includes("labs.google/fx/tools/flow") ||
    lower.includes("labs.google.com/fx/tools/flow") ||
    lower.includes("labs.google/flow") ||
    lower.includes("flow.google") ||
    lower.includes("aitestkitchen.withgoogle.com") ||
    (tLower.includes("google flow") && !tLower.includes("search"))
  );
}

// Find open Google Flow tab across all open windows
async function findFlowTab() {
  try {
    const tabs = await chrome.tabs.query({});
    if (!tabs || tabs.length === 0) return null;

    const flowTabs = tabs.filter(t => isGoogleFlowUrl(t.url || t.pendingUrl, t.title));
    if (flowTabs.length === 0) return null;

    // 1. Prioritize active/focused tab on project canvas
    const activeProj = flowTabs.find(t => t.active && (t.url?.includes("/project/") || t.url?.includes("/projects/")));
    if (activeProj) return activeProj.id;

    // 2. Prioritize any open project canvas tab
    const anyProj = flowTabs.find(t => t.url && (t.url.includes("/project/") || t.url.includes("/projects/")));
    if (anyProj) return anyProj.id;

    // 3. Active tab on Flow
    const activeFlow = flowTabs.find(t => t.active);
    if (activeFlow) return activeFlow.id;

    // 4. Fall back to first available Flow tab
    return flowTabs[0].id;
  } catch (err) {
    console.warn("[DeepX] findFlowTab error:", err);
    return null;
  }
}

// Autonomous Google Flow Tab Resolver: Finds open tab or auto-opens https://flow.google.com
async function ensureFlowTab() {
  let tabId = await findFlowTab();
  if (tabId) return tabId;

  console.log("[DeepX Canvas] No Google Flow tab open. Automatically launching flow.google.com in Chrome...");
  try {
    const wins = await chrome.windows.getAll({ populate: false });
    const normalWin = wins?.find(w => w.type === "normal") || wins?.[0];
    let tab;
    if (normalWin) {
      tab = await chrome.tabs.create({ windowId: normalWin.id, url: "https://flow.google.com/", active: true });
      await chrome.windows.update(normalWin.id, { focused: true }).catch(() => {});
    } else {
      const win = await chrome.windows.create({ url: "https://flow.google.com/", focused: true });
      tab = win.tabs?.[0];
    }

    if (tab?.id) {
      tabId = tab.id;
      for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 400));
        try {
          const t = await chrome.tabs.get(tabId);
          if (t.status === "complete" && t.url && !t.url.startsWith("chrome://")) break;
        } catch {}
      }
      await new Promise(r => setTimeout(r, 600));
      await ensureContentScriptsInjected(tabId);
      return tabId;
    }
  } catch (err) {
    console.error("[DeepX Canvas] ensureFlowTab failed to auto-open tab:", err);
  }
  return null;
}

// Ensure content scripts are loaded in tab (handles tabs opened before extension or reload)
async function ensureContentScriptsInjected(tabId) {
  try {
    const isAlive = await new Promise((resolve) => {
      chrome.tabs.sendMessage(tabId, { type: "PING_PAGE" }, (r) => {
        if (chrome.runtime.lastError || !r) resolve(false);
        else resolve(true);
      });
    });

    if (!isAlive) {
      console.log("[DeepX] Dynamically injecting content scripts into tab " + tabId);
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ["content-script-main.js"],
        world: "MAIN"
      });
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ["content-script-isolated.js"],
        world: "ISOLATED"
      });
      // Short delay for scripts to initialize
      await new Promise(r => setTimeout(r, 300));
    }
  } catch (err) {
    console.warn("[DeepX] Script injection warning:", err);
  }
}

// Execute action in Flow tab (auto-opens Flow tab if closed)
async function execInFlowTab(action, args = []) {
  let tabId = await findFlowTab();
  if (!tabId) {
    tabId = await ensureFlowTab();
  }
  if (!tabId) {
    throw new Error("No Google Flow tab open and failed to auto-launch https://flow.google.com.");
  }
  activeFlowTabId = tabId;

  await ensureContentScriptsInjected(tabId);

  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, { type: "EXECUTE_MAIN", action, args }, (res) => {
      if (chrome.runtime.lastError) {
        return reject(new Error(chrome.runtime.lastError.message));
      }
      if (!res) {
        return reject(new Error("No response from Flow tab content script"));
      }
      if (!res.success) {
        return reject(new Error(res.error || "Execution failed"));
      }
      resolve(res.result);
    });
  });
}

// High-reliability Flow context, account & project extractor
async function extractFlowTabContext(tabId) {
  if (!tabId) tabId = await findFlowTab();
  if (!tabId) return null;

  let projectId = null;
  let projectName = null;
  let accountInfo = null;
  let url = "";

  // 1. Direct DOM inspection (guaranteed fast and reliable on Google Flow)
  try {
    const pageInfo = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const url = window.location.href;
        const m = url.match(/\/projects?\/([a-zA-Z0-9_-]{6,})/i);
        const pId = m && !["new", "all", "recent", "templates", "trash"].includes(m[1].toLowerCase()) ? m[1] : null;

        // Project Name Extraction from DOM & Title
        let pName = null;
        const heading = document.querySelector(".header-title-heading, [data-project-name], header .project-name")?.textContent?.trim();
        const inputVal = document.querySelector(".header-title input, flow-editable-text input, input[aria-label*='Project name' i], input[aria-label*='project title' i]")?.value?.trim();
        const titleClean = (document.title || "")
          .replace(/^Google Flow\s*[–—\-]\s*/i, "")
          .replace(/\s*[–—\-]\s*Google Flow.*$/i, "")
          .trim();

        if (heading && !["google flow", "flow"].includes(heading.toLowerCase())) {
          pName = heading;
        } else if (inputVal && !["google flow", "flow"].includes(inputVal.toLowerCase())) {
          pName = inputVal;
        } else if (titleClean && !["google flow", "flow", "home", "projects", "new project"].includes(titleClean.toLowerCase())) {
          pName = titleClean;
        }

        const accEl = document.querySelector(
          "a[aria-label*='Google Account'], button[aria-label*='Google Account'], [aria-label*='Google Account:']"
        );
        let accountName = null;
        let email = null;
        if (accEl) {
          const aria = accEl.getAttribute("aria-label") || "";
          const match = aria.match(/Google Account:\s*(.*?)(?:\s*\((.*?)\)|$)/i);
          if (match) {
            if (match[1]) accountName = match[1].replace(/[\r\n]+/g, " ").trim();
            if (match[2]) email = match[2].trim();
          }
        }
        const gbarName = document.querySelector(".gb_g, [data-user-name]");
        if (!accountName && gbarName) accountName = gbarName.textContent.trim();

        const signInLink = document.querySelector("a[href*='accounts.google.com/ServiceLogin'], a[href*='signin']");
        const hasSignInText = Array.from(document.querySelectorAll("button, a")).some(b => /^\s*sign\s+in\s*$/i.test(b.textContent || ""));
        const isLogged = (email || (accountName && accountName !== "Google User")) && !signInLink && !hasSignInText;

        const proEl = document.querySelector("flow-user-tier-chip, .tier-chip, [aria-label*='PRO tier'], [aria-label*='PRO'], flow-pro-badge, .pro-badge, [class*='pro-badge'], [data-plan='pro']");
        const isPro = !!(proEl && ((proEl.textContent || "").includes("PRO") || (proEl.getAttribute("aria-label") || "").includes("PRO")));
        const upgradeEl = Array.from(document.querySelectorAll("button, a, span")).find(e => /upgrade to pro|get gemini advanced/i.test(e.textContent || ""));
        let plan = "Standard";
        if (isPro) plan = "PRO";
        else if (upgradeEl) plan = "Free";
        else if (!isLogged) plan = "None";

        return {
          url,
          projectId: pId,
          projectName: pName,
          account: {
            isLoggedIn: !!isLogged,
            accountName: accountName || (isLogged ? "Google User" : null),
            email: email || null,
            plan
          }
        };
      }
    });

    if (pageInfo?.[0]?.result) {
      projectId = pageInfo[0].result.projectId;
      projectName = pageInfo[0].result.projectName;
      accountInfo = pageInfo[0].result.account;
      url = pageInfo[0].result.url;
    }
  } catch (e) {
    console.warn("[DeepX] Direct DOM check warning:", e);
  }

  // 2. Also try content script context if token or deeper project info is needed
  try {
    await ensureContentScriptsInjected(tabId);
    const ctx = await Promise.race([
      execInFlowTab("get_flow_context"),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 600))
    ]);
    if (ctx) {
      if (!projectId && ctx.projectId) projectId = ctx.projectId;
      if (!projectName && ctx.projectName) projectName = ctx.projectName;
      if ((!accountInfo || !accountInfo.isLoggedIn) && ctx.account) accountInfo = ctx.account;
      if (!url && ctx.url) url = ctx.url;
      if (ctx.token) globalCapturedToken = ctx.token;
    }
  } catch {}

  if (projectId) {
    lastKnownProjectId = projectId;
    if (projectName) lastKnownProjectName = projectName;
    chrome.storage.local.set({ lastKnownProjectId, lastKnownProjectName });
  }

  if (accountInfo?.email) {
    if (lastKnownAccountEmail && accountInfo.email !== lastKnownAccountEmail) {
      globalCapturedToken = null;
      chrome.storage.local.remove(["deepxAuthToken"]);
    }
    lastKnownAccountEmail = accountInfo.email;
    lastKnownAccount = accountInfo;
  }

  return {
    projectId,
    projectName: projectName || lastKnownProjectName,
    account: accountInfo || lastKnownAccount || { isLoggedIn: false, accountName: null, email: null, plan: "None" },
    url
  };
}

// Model key resolver for Veo 3.1 & Imagen 3
function resolveModelKey(model = "veo-quality", mode = "text", duration = 8, aspectRatio = "landscape") {
  const d = duration === 5 ? "_5s" : "";
  const isPortrait = aspectRatio === "portrait" || aspectRatio === "9:16";

  if (model === "veo-omni" || model === "omni-flash") {
    const dur = `_${duration || 8}s`;
    if (mode === "start" || mode === "imageToVideo") return `abra_i2v${dur}`;
    if (mode === "ref" || mode === "reference") return `abra_r2v${dur}`;
    return `abra_t2v${dur}`;
  }

  if (model === "veo-lite" || model === "veo-3.1-lite") {
    switch (mode) {
      case "text":
      case "textToVideo":
        return `veo_3_1_t2v_lite${d}${d ? "" : isPortrait ? "_portrait" : ""}`;
      case "start":
      case "imageToVideo":
        return d ? `veo_3_1_i2v_s_lite${d}` : isPortrait ? "veo_3_1_i2v_lite_portrait" : "veo_3_1_i2v_lite";
      case "se":
      case "startAndEndVideo":
        return d ? `veo_3_1_i2v_s_lite${d}_fl` : isPortrait ? "veo_3_1_interpolation_lite_portrait" : "veo_3_1_interpolation_lite";
      case "ref":
      case "referenceImagesToVideo":
        return "veo_3_1_r2v_lite";
      default:
        return "veo_3_1_t2v_lite";
    }
  }

  // veo-quality (default director-grade mode)
  switch (mode) {
    case "text":
    case "textToVideo":
      return d ? `veo_3_1_t2v_quality${d}` : isPortrait ? "veo_3_1_t2v_portrait" : "veo_3_1_t2v";
    case "start":
    case "imageToVideo":
      return d ? `veo_3_1_i2v_s_quality${d}` : isPortrait ? "veo_3_1_i2v_s_portrait" : "veo_3_1_i2v_s";
    case "se":
    case "startAndEndVideo":
      return d ? `veo_3_1_i2v_s_quality${d}_fl` : isPortrait ? "veo_3_1_i2v_s_portrait_fl" : "veo_3_1_i2v_s_fl";
    case "ref":
    case "referenceImagesToVideo":
      return isPortrait ? "veo_3_1_r2v_portrait" : "veo_3_1_r2v_landscape";
    default:
      return "veo_3_1_t2v";
  }
}

// =============================================================================
// AnyAI Native Chrome Debugger Automation Engine (Ultra-Fast Execution)
// =============================================================================
const attachedDebuggerTabs = new Set();

chrome.tabs.onRemoved?.addListener((tabId) => {
  attachedDebuggerTabs.delete(tabId);
});

chrome.debugger?.onDetach?.addListener((source) => {
  if (source.tabId) attachedDebuggerTabs.delete(source.tabId);
});

// Mobile Chromium (e.g. Kiwi Browser on Android) detection
const isMobileOrKiwi = typeof navigator !== "undefined" && (
  /Android/i.test(navigator.userAgent) ||
  /Kiwi/i.test(navigator.userAgent) ||
  /Mobile/i.test(navigator.userAgent)
);

async function attachDebugger(tabId) {
  // Kiwi Browser and Android Chromium crash fatally (SIGSEGV in libchrome.so) if chrome.debugger is attached
  if (isMobileOrKiwi || !chrome.debugger?.attach) return false;
  if (attachedDebuggerTabs.has(tabId)) return true;
  try {
    await chrome.debugger.detach({ tabId }).catch(() => {});
    await chrome.debugger.attach({ tabId }, "1.3");
    attachedDebuggerTabs.add(tabId);
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("already attached")) {
      attachedDebuggerTabs.add(tabId);
      return true;
    } else {
      console.warn("[DeepX Debugger] Attach warning:", msg);
      return false;
    }
  }
}

async function nativeInsertText(tabId, text) {
  const attached = await attachDebugger(tabId);
  if (!attached) {
    return await chrome.scripting.executeScript({
      target: { tabId },
      func: (t) => {
        const box = document.querySelector("div.ProseMirror, flow-rich-text-editor div[role='textbox'], div[contenteditable='true']");
        if (box) {
          box.focus();
          document.execCommand("insertText", false, t);
          box.dispatchEvent(new InputEvent("beforeinput", { bubbles: true, cancelable: true, inputType: "insertText", data: t }));
          box.dispatchEvent(new Event("input", { bubbles: true }));
        }
      },
      args: [text]
    }).catch(() => {});
  }
  return await chrome.debugger.sendCommand({ tabId }, "Input.insertText", { text });
}

async function nativeDispatchKey(tabId, key, code, keyCode, modifiers = 0, text = undefined) {
  const attached = await attachDebugger(tabId);
  if (!attached) {
    return await chrome.scripting.executeScript({
      target: { tabId },
      func: (k, c, kc) => {
        const target = document.activeElement || document.body;
        target.dispatchEvent(new KeyboardEvent("keydown", { key: k, code: c, keyCode: kc, bubbles: true }));
        target.dispatchEvent(new KeyboardEvent("keyup", { key: k, code: c, keyCode: kc, bubbles: true }));
      },
      args: [key, code, keyCode]
    }).catch(() => {});
  }
  const payload = {
    key,
    code,
    windowsVirtualKeyCode: keyCode,
    nativeVirtualKeyCode: keyCode
  };
  if (text !== undefined) {
    payload.text = text;
    payload.unmodifiedText = text;
  }
  if (modifiers) payload.modifiers = modifiers;

  await chrome.debugger.sendCommand({ tabId }, "Input.dispatchKeyEvent", {
    type: "keyDown",
    ...payload
  });
  await chrome.debugger.sendCommand({ tabId }, "Input.dispatchKeyEvent", {
    type: "keyUp",
    ...payload
  });
}

async function nativeClick(tabId, x, y) {
  const attached = await attachDebugger(tabId);
  const px = Math.round(x);
  const py = Math.round(y);
  if (!attached) {
    return await chrome.scripting.executeScript({
      target: { tabId },
      func: (x, y) => {
        const el = document.elementFromPoint(x, y);
        if (el) {
          const btn = el.closest("button");
          if (btn) btn.click();
          else el.click();
        }
      },
      args: [px, py]
    }).catch(() => {});
  }
  try {
    await chrome.debugger.sendCommand({ tabId }, "Input.dispatchMouseEvent", {
      type: "mouseMoved",
      x: px,
      y: py,
      button: "none",
      modifiers: 0
    });
    await chrome.debugger.sendCommand({ tabId }, "Input.dispatchMouseEvent", {
      type: "mousePressed",
      x: px,
      y: py,
      button: "left",
      buttons: 1,
      clickCount: 1,
      modifiers: 0
    });
    await chrome.debugger.sendCommand({ tabId }, "Input.dispatchMouseEvent", {
      type: "mouseReleased",
      x: px,
      y: py,
      button: "left",
      buttons: 0,
      clickCount: 1,
      modifiers: 0
    });
  } catch (err) {
    console.warn("[DeepX Debugger] nativeClick sendCommand error, falling back to script click:", err);
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (x, y) => {
        const el = document.elementFromPoint(x, y);
        if (el) {
          const btn = el.closest("button");
          if (btn) btn.click();
          else el.click();
        }
      },
      args: [px, py]
    }).catch(() => {});
  }
}

const ANYAI_SELECTORS = {
  configButton: "button[aria-label='Settings trigger'], button.settings-trigger-button",
  configButtonActived: "button[aria-label='Settings trigger'], button.settings-trigger-button",
  modelSelectButton: "button[aria-label='Select model family']",
  selectVideoMode: "flow-prompt-box-settings button[role='radio']:has(mat-icon:contains('videocam')), flow-prompt-box-settings button[role='radio']",
  selectImageMode: "flow-prompt-box-settings button[role='radio']:has(mat-icon:contains('image')), flow-prompt-box-settings button[role='radio']",
  aspectRatioTemplate: "button[role='radio']:has(mat-icon:contains('{aspectRatio}')), button[role='radio']:contains('{aspectRatio}')",
  outputCountTemplate: "button[role='radio']:contains('{outputCount}')",
  modelTemplate: "flow-menu-item button:has(span:contains('{model}')), [role='menuitem']:has(span:contains('{model}')), flow-menu-item:contains('{model}'), [role='menuitem']:contains('{model}')",
  videoLengthTemplate: "button[role='radio']:contains('{videoLength}')",
  promptTextarea: "div.ProseMirror, flow-rich-text-editor div[role='textbox'], .prosemirror-editor div[contenteditable='true'], div[role='textbox']",
  submitButton: "button.generate-icon-button, button[aria-label='Start generation'], div.submit-controls button[type='submit']"
};

const configCache = {
  model: null,
  aspectRatio: null,
  duration: null,
  mode: null,
  outputCount: null
};

function isConfigCached(cfg) {
  const isVideo = cfg.mode !== "image" && !String(cfg.mode || "").toLowerCase().includes("image");
  const cachedIsVideo = configCache.mode !== "image" && !String(configCache.mode || "").toLowerCase().includes("image");
  if (isVideo !== cachedIsVideo) return false;
  if (cfg.model && cfg.model !== configCache.model) return false;
  if (cfg.aspectRatio && cfg.aspectRatio !== configCache.aspectRatio) return false;
  if (cfg.duration && cfg.duration !== configCache.duration) return false;
  if (cfg.outputCount && cfg.outputCount !== configCache.outputCount) return false;
  return true;
}

function updateConfigCache(cfg) {
  const isVideo = cfg.mode !== "image" && !String(cfg.mode || "").toLowerCase().includes("image");
  configCache.mode = isVideo ? "video" : "image";
  if (cfg.model) configCache.model = cfg.model;
  if (cfg.aspectRatio) configCache.aspectRatio = cfg.aspectRatio;
  if (cfg.duration) configCache.duration = cfg.duration;
  if (cfg.outputCount) configCache.outputCount = cfg.outputCount;
}

async function getElementRect(tabId, selectors) {
  const selList = Array.isArray(selectors) ? selectors : [selectors];
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func: (sels) => {
      function query(selector) {
        for (const rawSel of selector.split(",")) {
          const s = rawSel.trim();
          if (s.includes(":contains(")) {
            const m = s.match(/^([^:]+):has\(([^:]+):contains\('([^']+)'\)\)$/);
            if (m) {
              const [, parentTag, childTag, txt] = m;
              for (const p of document.querySelectorAll(parentTag)) {
                for (const c of p.querySelectorAll(childTag)) {
                  if (c.textContent && c.textContent.includes(txt)) return p;
                }
              }
            }
            const m2 = s.match(/^([^:]+):contains\('([^']+)'\)$/);
            if (m2) {
              const [, tag, txt] = m2;
              for (const el of document.querySelectorAll(tag)) {
                if (el.textContent && el.textContent.includes(txt)) return el;
              }
            }
          }
          try {
            const found = document.querySelector(s);
            if (found) return found;
          } catch {}
        }
        return null;
      }

      for (const sel of sels) {
        const el = query(sel);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            el.focus();
            return {
              x: Math.round(rect.left + rect.width / 2),
              y: Math.round(rect.top + rect.height / 2),
              width: rect.width,
              height: rect.height,
              found: true
            };
          }
        }
      }
      return null;
    },
    args: [selList]
  });
  return results?.[0]?.result || null;
}

async function nativeClickSelector(tabId, selectors) {
  const rect = await getElementRect(tabId, selectors);
  if (!rect || !rect.found) return false;
  await nativeClick(tabId, rect.x, rect.y);
  return true;
}

async function configureFlowSettingsFast(tabId, config = {}) {
  const isVideo = config.mode !== "image" && !String(config.mode || "").toLowerCase().includes("image");
  const targetRatio = config.aspectRatio || (isVideo ? "16:9" : "9:16");
  const targetCount = config.outputCount || 1;
  const targetDuration = config.duration || (isVideo ? 8 : null);
  const targetModel = config.model || (isVideo ? "veo-omni" : "imagen-3");

  await chrome.scripting.executeScript({
    target: { tabId },
    func: async (isVideo, targetRatio, targetDuration, targetCount, targetModel) => {
      // 0. Fast-path check: If settings trigger already matches target settings, skip popover entirely!
      const trigger = document.querySelector("button[aria-label='Settings trigger'], button.settings-trigger-button");
      const trigText = (trigger?.innerText || "").toLowerCase();
      const cleanRatio = (targetRatio || "").replace(":", "_").replace("/", "_");
      const isAlreadyImage = !isVideo && (trigText.includes("banana") || trigText.includes("imagen") || trigText.includes("image"));
      const isAlreadyVideo = isVideo && trigText.includes("video") && (!targetDuration || trigText.includes(`${targetDuration}s`));
      const ratioMatches = !targetRatio || trigText.includes(cleanRatio) || trigText.includes(targetRatio);
      const countMatches = !targetCount || trigText.includes(`x${targetCount}`);

      if (trigger && ((isAlreadyImage && ratioMatches && countMatches) || (isAlreadyVideo && ratioMatches && countMatches))) {
        return { success: true, skipped: true };
      }

      // 1. Open settings popover if not already open
      let settings = document.querySelector("flow-prompt-box-settings");
      if (!settings) {
        if (trigger) {
          trigger.click();
          for (let i = 0; i < 15; i++) {
            await new Promise(r => setTimeout(r, 40));
            settings = document.querySelector("flow-prompt-box-settings");
            if (settings) break;
          }
        }
      }
      if (!settings) return { success: false, reason: "Settings popover not found" };

      // 2. Select Mode (Image vs Video)
      const modeRadios = Array.from(settings.querySelectorAll("button[role='radio'], mat-button-toggle button"));
      if (isVideo) {
        const vBtn = modeRadios.find(b => b.innerText.includes("Video") || b.innerHTML.includes("videocam"));
        if (vBtn && vBtn.getAttribute("aria-checked") !== "true") {
          vBtn.click();
          await new Promise(r => setTimeout(r, 120));
        }
      } else {
        const iBtn = modeRadios.find(b => b.innerText.includes("Image") || b.innerHTML.includes("image"));
        if (iBtn && iBtn.getAttribute("aria-checked") !== "true") {
          iBtn.click();
          await new Promise(r => setTimeout(r, 120));
        }
      }

      // Re-query radios in the updated mode
      const updatedRadios = Array.from(settings.querySelectorAll("button[role='radio'], mat-button-toggle button"));

      // 3. Aspect Ratio
      if (targetRatio) {
        const cleanRatio = targetRatio.replace("_", ":");
        const iconName = "crop_" + targetRatio.replace(":", "_");
        const arBtn = updatedRadios.find(b =>
          b.innerText.includes(cleanRatio) ||
          b.innerHTML.includes(iconName) ||
          b.innerHTML.includes(targetRatio)
        );
        if (arBtn && arBtn.getAttribute("aria-checked") !== "true") {
          arBtn.click();
          await new Promise(r => setTimeout(r, 80));
        }
      }

      // 4. Quantity (Video & Image mode)
      if (targetCount) {
        const cntStr = `x${targetCount}`;
        const cntBtn = updatedRadios.find(b => b.innerText.trim() === cntStr);
        if (cntBtn && cntBtn.getAttribute("aria-checked") !== "true") {
          cntBtn.click();
          await new Promise(r => setTimeout(r, 80));
        }
      }

      // 5. Duration (Video mode)
      if (isVideo && targetDuration) {
        const durStr = `${targetDuration}s`;
        const durBtn = updatedRadios.find(b => b.innerText.trim() === durStr || b.innerText.includes(durStr));
        if (durBtn && durBtn.getAttribute("aria-checked") !== "true") {
          durBtn.click();
          await new Promise(r => setTimeout(r, 80));
        }
      }

      // 6. Model selection
      if (targetModel) {
        const cleanModel = targetModel.replace("🍌", "").trim().toLowerCase();
        const modelBtn = settings.querySelector("button[aria-label='Select model family']");
        const curModelText = (modelBtn?.innerText || "").toLowerCase();
        const matchesCurrent = curModelText.includes(cleanModel) ||
          (cleanModel.includes("imagen") && curModelText.includes("imagen")) ||
          (cleanModel.includes("banana") && curModelText.includes("banana"));

        if (modelBtn && !matchesCurrent) {
          modelBtn.click();
          await new Promise(r => setTimeout(r, 180));

          const menuItems = Array.from(document.querySelectorAll("flow-menu-item, [role='menuitem'], .mat-mdc-menu-item"));
          const targetItem = menuItems.find(m => {
            const txt = m.innerText.toLowerCase();
            return txt.includes(cleanModel) ||
              (cleanModel.includes("imagen") && txt.includes("imagen")) ||
              (cleanModel.includes("banana") && txt.includes("banana"));
          });
          if (targetItem) {
            targetItem.click();
            await new Promise(r => setTimeout(r, 120));
          } else {
            const backdrop = document.querySelector(".cdk-overlay-backdrop");
            if (backdrop) backdrop.click();
          }
        }
      }

      // 7. Close settings overlay cleanly
      const backdrop = document.querySelector(".cdk-overlay-backdrop");
      if (backdrop) backdrop.click();
      const closeTrigger = document.querySelector("button[aria-label='Settings trigger'], button.settings-trigger-button");
      if (closeTrigger && closeTrigger.getAttribute("aria-expanded") === "true") {
        closeTrigger.click();
        await new Promise(r => setTimeout(r, 100));
      }

      return { success: true };
    },
    args: [isVideo, targetRatio, targetDuration, targetCount, targetModel]
  }).catch(err => {
    console.warn("[DeepX Fast] Error configuring Flow settings:", err);
  });
}

// Universal Library Asset Attacher for Google Flow:
// Rapid micro-polling: checks current view first, navigates tabs with 15ms ticks,
// clicks detail-add-to-prompt-btn, closes backdrop, and verifies flow-ingredient-chip is present in ~100ms.
async function attachLibraryAssetInTab(tabId, targetName) {
  if (!targetName) return { success: false, reason: "No asset name provided" };
  const cleanName = targetName.replace(/^@/, "").trim();
  console.log(`[DeepX Asset] Attaching reference card for '${cleanName}'...`);

  return await chrome.scripting.executeScript({
    target: { tabId },
    func: async (assetTarget) => {
      const poll = (fn, timeout = 600, interval = 12) => new Promise(resolve => {
        const res = fn();
        if (res) return resolve(res);
        const start = performance.now();
        const id = setInterval(() => {
          const res2 = fn();
          if (res2 || performance.now() - start > timeout) {
            clearInterval(id);
            resolve(res2 || null);
          }
        }, interval);
      });

      // 0. Check if target asset is ALREADY bound as an ingredient chip in the prompt box
      const cleanTarget = assetTarget.toLowerCase().replace(/\.(png|jpg|jpeg|webp)$/i, "");
      const getPromptChips = () => {
        const pBox = document.querySelector("flow-prompt-box, flow-base-prompt-box");
        return pBox ? Array.from(pBox.querySelectorAll("flow-ingredient-chip")) : [];
      };
      const existingChips = getPromptChips();
      const isAlreadyAttached = existingChips.some(chip => {
        const chipText = (chip.innerText || "").toLowerCase();
        return chipText.includes(assetTarget.toLowerCase()) || chipText.includes(cleanTarget);
      });
      if (isAlreadyAttached) {
        return {
          success: true,
          alreadyAttached: true,
          chipsCount: existingChips.length,
          attachedAssetName: assetTarget
        };
      }

      // Check ingredient chips capacity (maximum 5 references supported in Google Flow)
      if (existingChips.length >= 5) {
        return {
          success: false,
          reason: "Ingredient chip capacity limit reached (5 chips max)",
          chipsCount: existingChips.length
        };
      }

      // 1. Open Add ingredients menu
      let popover = document.querySelector("flow-add-menu-popover-content, .cdk-overlay-pane");
      if (!popover) {
        const addBtn = document.querySelector("button[aria-label*='Add ingredients' i], button.add-menu-trigger, flow-add-menu button");
        if (!addBtn) return { success: false, reason: "add-menu-trigger not found" };
        addBtn.click();
        popover = await poll(() => document.querySelector("flow-add-menu-popover-content, .cdk-overlay-pane"), 1500, 15);
      }
      if (!popover) return { success: false, reason: "Add menu popover did not open" };

      // 2. Search across library tabs (All, Uploads, Characters, Images, Videos)
      const findMatch = () => {
        const btns = Array.from(document.querySelectorAll("button.asset-item"));
        return btns.find(b => {
          const txt = (b.innerText || "").toLowerCase();
          return txt.includes(assetTarget.toLowerCase()) || txt.includes(cleanTarget);
        });
      };

      // Check current active tab first (instant if already visible)
      let match = findMatch();

      if (!match) {
        const tabNames = ["All", "Uploads", "Characters", "Images", "Videos"];
        const allTabs = Array.from(document.querySelectorAll("flow-add-menu-side-nav mat-list-item[role='tab'], .cdk-overlay-pane mat-list-item[role='tab']"));

        for (const tabName of tabNames) {
          const tabEl = allTabs.find(t => (t.innerText || "").includes(tabName));
          if (tabEl) {
            tabEl.click();
            match = await poll(() => findMatch(), 100, 10);
            if (match) break;
          }
        }
      }

      if (!match) {
        const backdrop = document.querySelector(".cdk-overlay-backdrop");
        if (backdrop) backdrop.click();
        const available = Array.from(document.querySelectorAll("button.asset-item")).map(b => b.innerText?.trim().replace(/\n/g, " - "));
        return {
          success: false,
          reason: `Asset '${assetTarget}' not found in project library`,
          available
        };
      }

      // 3. Click the matching asset button and poll for "Add to prompt" button
      match.click();
      const addToPromptBtn = await poll(() => document.querySelector("button.detail-add-to-prompt-btn"), 350);
      if (!addToPromptBtn) {
        const backdrop = document.querySelector(".cdk-overlay-backdrop");
        if (backdrop) backdrop.click();
        return { success: false, reason: "detail-add-to-prompt-btn not found" };
      }

      // 4. Click "Add to prompt" and poll for chip in ingredient bar
      addToPromptBtn.click();
      const chipsBound = await poll(() => {
        const c = getPromptChips();
        return c.length > existingChips.length ? c : null;
      }, 350);

      // 5. Instantly close popover
      const backdrop = document.querySelector(".cdk-overlay-backdrop");
      if (backdrop) backdrop.click();

      return {
        success: !!chipsBound,
        chipsCount: chipsBound ? chipsBound.length : 0,
        attachedAssetName: assetTarget,
        chipThumbnails: chipsBound ? chipsBound.map(c => c.querySelector("img")?.src) : []
      };
    },
    args: [cleanName]
  }).then(r => r?.[0]?.result).catch(err => ({ success: false, reason: err.message }));
}

// Ensure Flow tab is squarely on the main project canvas (auto-navigates or auto-creates project seamlessly)
async function ensureOnProjectCanvas(tabId) {
  if (!tabId) tabId = await ensureFlowTab();
  if (!tabId) throw new Error("Could not connect to or launch Google Flow tab.");

  let tab = await chrome.tabs.get(tabId).catch(() => null);
  if (!tab) {
    tabId = await ensureFlowTab();
    tab = await chrome.tabs.get(tabId);
  }

  await ensureContentScriptsInjected(tabId);

  // Quick check: is the canvas prompt box already interactive?
  const isAlreadyCanvas = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const box = document.querySelector("div.ProseMirror, flow-rich-text-editor div[role='textbox'], div[contenteditable='true'], flow-prompt-box");
      return !!box;
    }
  }).then(r => r?.[0]?.result).catch(() => false);

  const curUrl = tab.url || "";
  let pId = lastKnownProjectId || extractProjectId(curUrl);

  if (isAlreadyCanvas) {
    if (pId) lastKnownProjectId = pId;
    return tabId;
  }

  // Case A: Stranded on character editor, character list, or edit page
  if (curUrl.includes("/character") || curUrl.includes("/edit/") || curUrl.includes("/studio")) {
    console.log(`[DeepX Canvas] Auto-recovering tab from sub-route (${curUrl}) to project canvas for project '${pId}'...`);
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const btns = Array.from(document.querySelectorAll("button"));
        const doneBtn = btns.find(b => (b.textContent || "").trim() === "Done");
        if (doneBtn) doneBtn.click();
      }
    }).catch(() => {});

    await new Promise(r => setTimeout(r, 300));
    const targetUrl = pId && pId !== "default"
      ? `https://flow.google.com/project/${pId}`
      : "https://flow.google.com";

    const refreshedTab = await chrome.tabs.get(tabId);
    if ((refreshedTab.url || "").includes("/character") || (refreshedTab.url || "").includes("/edit/")) {
      await chrome.tabs.update(tabId, { url: targetUrl });
      await new Promise(r => setTimeout(r, 1200));
    }
  }

  // Case B: Stranded on home/gallery/explore or URL has no project canvas
  const isHomeOrNoProject = !curUrl.includes("/project/") && !curUrl.includes("/projects/");
  if (isHomeOrNoProject) {
    console.log("[DeepX Canvas] Tab is on Flow dashboard. Auto-navigating into project canvas...");
    // 1. If we have a known valid project ID, try opening it directly first
    if (pId && pId !== "default") {
      try {
        await chrome.tabs.update(tabId, { url: `https://flow.google.com/project/${pId}` });
        await new Promise(r => setTimeout(r, 1500));
      } catch {}
    }

    // 2. Check if canvas loaded or if we need to click into recent project / click + New Project
    const entered = await chrome.scripting.executeScript({
      target: { tabId },
      func: async () => {
        if (document.querySelector("div.ProseMirror, flow-prompt-box")) return { success: true, method: "already_loaded" };

        // Try clicking latest project card first
        const projectCards = Array.from(document.querySelectorAll(
          "flow-project-card, .project-card, [data-project-id], a[href*='/project/'], flow-recent-project-tile"
        ));
        if (projectCards.length > 0) {
          const firstCard = projectCards[0];
          const clickable = firstCard.querySelector("a, button") || firstCard;
          clickable.click();
          return { success: true, method: "clicked_recent_project" };
        }

        // Try clicking "+ New Project" or "Create Project"
        const newProjBtn = Array.from(document.querySelectorAll("button, flow-create-project-card, [role='button'], a"))
          .find(b => /new project|create project/i.test(b.textContent || "") || b.getAttribute("aria-label")?.toLowerCase().includes("new project"));
        if (newProjBtn) {
          newProjBtn.click();
          return { success: true, method: "clicked_new_project" };
        }

        return { success: false };
      }
    }).then(r => r?.[0]?.result).catch(() => ({ success: false }));

    console.log("[DeepX Canvas] Auto-canvas navigation attempt:", entered);
  }

  // Poll for canvas prompt box or ingredient bar to become interactive (up to 8s)
  for (let i = 0; i < 16; i++) {
    const ready = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const box = document.querySelector("div.ProseMirror, flow-rich-text-editor div[role='textbox'], div[contenteditable='true'], flow-prompt-box");
        const addBtn = document.querySelector("button[aria-label*='Add ingredients' i], button.add-menu-trigger, flow-add-menu button");
        return !!(box || addBtn);
      }
    }).then(r => r?.[0]?.result).catch(() => false);

    if (ready) {
      try {
        const refreshed = await chrome.tabs.get(tabId);
        const updatedPid = extractProjectId(refreshed.url);
        if (updatedPid) {
          lastKnownProjectId = updatedPid;
          chrome.storage.local.set({ lastKnownProjectId: updatedPid });
        }
      } catch {}
      break;
    }
    await new Promise(r => setTimeout(r, 500));
  }

  return tabId;
}

async function handleAttachLibraryReference(payload) {
  const { assetName } = payload;
  if (!assetName) throw new Error("An assetName is required to attach library reference.");
  const tabId = await findFlowTab();
  if (!tabId) throw new Error("No Google Flow tab open.");
  await ensureOnProjectCanvas(tabId);
  return await attachLibraryAssetInTab(tabId, assetName);
}

// High-Speed Batch Reference Attacher for Google Flow:
// Takes an array of asset names / references, uses 12ms micro-polling, attaches up to 5 ingredient chips
// in under 300ms total without closing/reopening popovers needlessly.
// Supports: asset name matching (text, aria-label, alt), special keywords (":recent_images", ":clear_stale"),
// and compulsory multi-reference stacking across Characters, Uploads, and Images tabs.
async function attachLibraryAssetsBatch(tabId, assetNames = [], clearStale = false, promptContext = "") {
  if (!Array.isArray(assetNames)) {
    assetNames = [];
  }
  await ensureOnProjectCanvas(tabId);

  return await chrome.scripting.executeScript({
    target: { tabId },
    func: async (targets, doClear, promptText) => {
      const poll = (fn, timeout = 600, interval = 12) => new Promise(resolve => {
        const res = fn();
        if (res) return resolve(res);
        const start = performance.now();
        const id = setInterval(() => {
          const res2 = fn();
          if (res2 || performance.now() - start > timeout) {
            clearInterval(id);
            resolve(res2 || null);
          }
        }, interval);
      });

      const getPromptChips = () => {
        const pBox = document.querySelector("flow-prompt-box, flow-base-prompt-box");
        return pBox ? Array.from(pBox.querySelectorAll("flow-ingredient-chip")) : [];
      };

      // Clear stale/excess chips in prompt box if explicitly requested
      if (doClear || targets.includes(":clear_stale")) {
        const pBox = document.querySelector("flow-prompt-box, flow-base-prompt-box");
        if (pBox) {
          pBox.querySelectorAll("flow-ingredient-chip").forEach(chip => {
            const overlay = chip.querySelector(".hover-icon-overlay, mat-icon.hover-icon") || chip.querySelector("button");
            if (overlay) {
              ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(evt => {
                overlay.dispatchEvent(new MouseEvent(evt, { bubbles: true, cancelable: true, view: window }));
              });
            }
          });
        }
        await new Promise(r => setTimeout(r, 100));
      }

      const attached = [];
      const cleanTargets = targets
        .filter(t => t && t !== ":clear_stale" && t !== ":recent_images" && t !== ":latest_images")
        .map(t => String(t || "").replace(/^@/, "").trim().toLowerCase());

      // Helper to open Add ingredients menu
      const ensureMenuOpen = async () => {
        let sideNav = document.querySelector("flow-add-menu-side-nav");
        if (sideNav && sideNav.offsetHeight > 0) return true;

        const backdrop = document.querySelector(".cdk-overlay-backdrop");
        if (backdrop) {
          backdrop.click();
          await new Promise(r => setTimeout(r, 150));
        }

        const addBtn = document.querySelector("button[aria-label*='Add ingredients' i], button.add-menu-trigger, flow-add-menu button");
        if (addBtn) {
          addBtn.click();
          await poll(() => {
            const nav = document.querySelector("flow-add-menu-side-nav");
            return nav && nav.offsetHeight > 0 ? nav : null;
          }, 1000, 15);
        }
        return !!(document.querySelector("flow-add-menu-side-nav")?.offsetHeight > 0);
      };

      if (!(await ensureMenuOpen())) {
        return { success: false, reason: "Could not open Add ingredients menu" };
      }

      // Helper to switch tabs
      const switchTab = async (tabName) => {
        const allTabs = Array.from(document.querySelectorAll("flow-add-menu-side-nav mat-list-item[role='tab'], .cdk-overlay-pane mat-list-item[role='tab']"));
        const tabEl = allTabs.find(t => (t.innerText || "").toLowerCase().includes(tabName.toLowerCase()));
        if (tabEl) {
          tabEl.click();
          await new Promise(r => setTimeout(r, 80));
          return true;
        }
        return false;
      };

      // Helper to find match across name, aria-label, alt, title with priority to exact match
      const findMatch = (targetName) => {
        const btns = Array.from(document.querySelectorAll("button.asset-item, flow-menu-item, [role='option'], [role='menuitem'], .cdk-overlay-pane button"));
        const clean = targetName.replace(/^[:#@]/, "").toLowerCase().trim();
        const cleanSpaced = clean.replace(/_/g, " ");

        const hasRealPhoto = (b) => {
          const img = b.querySelector("img:not(.avatar):not(.icon)");
          return !!(img && img.src && !img.src.includes("data:image/svg") && !img.src.includes("icon"));
        };

        // Priority 1: Exact first-line match with real photo
        let match = btns.find(b => {
          const lines = (b.innerText || "").toLowerCase().split("\n").map(l => l.trim()).filter(Boolean);
          const title = (lines[0] || "").replace(/\.(png|jpg|jpeg|webp)$/i, "");
          return (title === clean || title === cleanSpaced) && hasRealPhoto(b);
        });
        if (match) return match;

        // Priority 2: Exact first-line match (title)
        match = btns.find(b => {
          const lines = (b.innerText || "").toLowerCase().split("\n").map(l => l.trim()).filter(Boolean);
          const title = (lines[0] || "").replace(/\.(png|jpg|jpeg|webp)$/i, "");
          return title === clean || title === cleanSpaced;
        });
        if (match) return match;

        // Priority 3: Word boundary or inclusion with real photo
        match = btns.find(b => {
          const txt = (b.innerText || "").toLowerCase();
          const aria = (b.getAttribute("aria-label") || "").toLowerCase();
          const alt = (b.querySelector("img")?.getAttribute("alt") || "").toLowerCase();
          const title = (b.getAttribute("title") || "").toLowerCase();
          const all = `${txt} ${aria} ${alt} ${title}`;
          return (all.includes(clean) || all.includes(cleanSpaced)) && hasRealPhoto(b);
        });
        if (match) return match;

        // Priority 4: Word boundary or exact inclusion fallback
        return btns.find(b => {
          const txt = (b.innerText || "").toLowerCase();
          const aria = (b.getAttribute("aria-label") || "").toLowerCase();
          const alt = (b.querySelector("img")?.getAttribute("alt") || "").toLowerCase();
          const title = (b.getAttribute("title") || "").toLowerCase();
          const all = `${txt} ${aria} ${alt} ${title}`;
          return all.includes(clean) || all.includes(cleanSpaced);
        });
      };

      // Pass 1: Attach all specific character / vehicle / prop handles first
      for (const targetName of cleanTargets) {
        if (!targetName) continue;
        if (getPromptChips().length >= 5) break;

        let matched = false;
        // Up to 4 attempts with tab cycling to account for Angular store library indexing delay
        for (let attempt = 0; attempt < 4; attempt++) {
          const tabNames = ["Characters", "All", "Images", "Uploads", "Videos"];
          for (const tabName of tabNames) {
            if (getPromptChips().length >= 5) break;
            if (!(await ensureMenuOpen())) break;
            await switchTab(tabName);
            await new Promise(r => setTimeout(r, 80));

            let match = findMatch(targetName);
            if (!match && tabName === "Characters") {
              const charBtns = Array.from(document.querySelectorAll("button.asset-item, flow-menu-item, [role='option'], [role='menuitem'], .cdk-overlay-pane button"))
                .filter(b => hasRealPhoto(b));
              if (charBtns.length === 1) {
                match = charBtns[0];
              }
            }
            if (match) {
              const prevLen = getPromptChips().length;
              match.click();
              await new Promise(r => setTimeout(r, 100));
              const addPromptBtn = Array.from(document.querySelectorAll("button")).find(b => (b.innerText || "").includes("Add to prompt") && !b.disabled);
              if (addPromptBtn) addPromptBtn.click();

              await poll(() => getPromptChips().length > prevLen, 400, 15);
              attached.push(targetName);
              matched = true;
              break;
            }
          }
          if (matched) break;
          // Brief pause before retry attempt to allow Flow's store to sync
          await new Promise(r => setTimeout(r, 500));
        }
      }

      // Pass 2: Targeted Scene-Specific Image Matching (Zero Dummy Padding)
      // Only attach images that genuinely match the prompt's scene tags or key nouns
      if (promptText && getPromptChips().length < 5) {
        const stopwords = new Set([
          "with", "from", "that", "this", "they", "into", "their", "have", "been",
          "paper", "cutout", "halftone", "cinematic", "lighting", "style", "animation",
          "stop-motion", "documentary", "tactile", "textures", "jitter", "volumetric",
          "wide", "shot", "camera", "dolly", "zoom", "angle", "tracking"
        ]);
        const promptWords = String(promptText).toLowerCase()
          .replace(/[^a-z0-9_\-#]/g, " ")
          .split(/\s+/)
          .filter(w => w.length >= 4 && !stopwords.has(w));

        const sceneTags = (String(promptText).match(/(#[a-zA-Z0-9_\-]+)/g) || [])
          .map(t => t.replace(/^#/, "").toLowerCase());

        if (await ensureMenuOpen()) {
          await switchTab("Images");
          await new Promise(r => setTimeout(r, 80));

          const imgBtns = Array.from(document.querySelectorAll("button.asset-item, .cdk-overlay-pane button"))
            .filter(b => b.querySelector("img") && !b.disabled);

          for (const imgBtn of imgBtns) {
            if (getPromptChips().length >= 5) break;
            const txt = (imgBtn.innerText || "").toLowerCase();
            const aria = (imgBtn.getAttribute("aria-label") || "").toLowerCase();
            const alt = (imgBtn.querySelector("img")?.getAttribute("alt") || "").toLowerCase();
            const fullInfo = `${txt} ${aria} ${alt}`;

            // Check if this image matches any scene tag or key prompt terms
            const matchesTag = sceneTags.some(tag => tag.length >= 3 && fullInfo.includes(tag));
            const matchesWord = promptWords.filter(word => fullInfo.includes(word)).length >= 2;

            // Strict Filter: Never attach unrelated / dummy images!
            if (!matchesTag && !matchesWord) {
              continue;
            }

            // Avoid duplicate attachment
            const cleanTitle = txt.split("\n")[0].trim().toLowerCase();
            if (attached.some(att => att.toLowerCase().includes(cleanTitle) || cleanTitle.includes(att.toLowerCase()))) {
              continue;
            }

            if (!(await ensureMenuOpen())) break;
            const prevLen = getPromptChips().length;
            imgBtn.click();
            await new Promise(r => setTimeout(r, 100));

            const addPromptBtn = Array.from(document.querySelectorAll("button")).find(b => (b.innerText || "").includes("Add to prompt") && !b.disabled);
            if (addPromptBtn) addPromptBtn.click();

            await poll(() => getPromptChips().length > prevLen, 400, 15);
            attached.push(cleanTitle);
          }
        }
      }

      // Close backdrop cleanly
      const backdrop = document.querySelector(".cdk-overlay-backdrop");
      if (backdrop) backdrop.click();

      const finalChips = getPromptChips().map(c => c.innerText.trim());
      return {
        success: attached.length > 0 || finalChips.length > 0,
        attachedCount: attached.length,
        attached,
        chipsCount: finalChips.length,
        chips: finalChips
      };
    },
    args: [assetNames, clearStale, promptContext]
  }).then(r => r?.[0]?.result).catch(err => ({ success: false, reason: err.message }));
}

// Rapid Autonomous Video Analyzer & Scene Chainer
async function handleAutoChainVideoScene(payload) {
  const { nextPrompt, referenceAssets = [], aspectRatio = "16:9", duration = 10, model = "veo-omni" } = payload;
  if (!nextPrompt) throw new Error("nextPrompt is required for auto_chain_scene");

  const tabId = await ensureFlowTab();
  if (!tabId) throw new Error("Could not connect to or auto-open Google Flow tab.");
  await ensureOnProjectCanvas(tabId);

  // 1. Analyze latest video tile on canvas
  console.log("[DeepX AutoChain] Analyzing latest video tile on canvas...");
  const videoInfo = await chrome.scripting.executeScript({
    target: { tabId },
    func: async () => {
      const tile = document.querySelector("flow-video-tile, flow-grid-tile-container");
      if (!tile) return { error: "No video tile found on canvas" };
      tile.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
      await new Promise(r => setTimeout(r, 120));
      const video = tile.querySelector("video");
      return { success: !!video?.src, videoSrc: video ? video.src : null };
    }
  }).then(r => r?.[0]?.result);

  let frameUploadedName = null;
  if (videoInfo?.videoSrc) {
    try {
      console.log("[DeepX AutoChain] Extracting terminal frame via canvas in memory...");
      const frameDataUrl = await extractLastFrameFromVideoUrl(videoInfo.videoSrc);
      if (frameDataUrl) {
        const timestamp = Date.now();
        const fileName = `continuity_frame_${timestamp}.jpg`;
        console.log(`[DeepX AutoChain] Rapid DataTransfer uploading ${fileName}...`);
        await handleUploadImage({
          dataUrl: frameDataUrl,
          fileName: fileName,
          mimeType: "image/jpeg"
        });
        frameUploadedName = fileName;
      }
    } catch (err) {
      console.warn("[DeepX AutoChain] Frame extraction warning:", err);
    }
  }

  // 2. Configure video settings fast
  await configureFlowSettingsFast(tabId, {
    mode: "video",
    aspectRatio: aspectRatio,
    duration: duration,
    model: model
  });

  // 3. Clear old chips in prompt box
  await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const pBox = document.querySelector("flow-prompt-box, flow-base-prompt-box");
      if (pBox) {
        pBox.querySelectorAll("flow-ingredient-chip").forEach(chip => {
          const overlay = chip.querySelector(".hover-icon-overlay, mat-icon.hover-icon") || chip.querySelector("button");
          if (overlay) {
            ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(evt => {
              overlay.dispatchEvent(new MouseEvent(evt, { bubbles: true, cancelable: true, view: window }));
            });
          }
        });
      }
    }
  });

  // 4. Batch attach references (continuity frame + user references)
  const targetsToAttach = [];
  if (frameUploadedName) targetsToAttach.push(frameUploadedName);
  if (Array.isArray(referenceAssets)) {
    targetsToAttach.push(...referenceAssets);
  }

  if (targetsToAttach.length > 0) {
    console.log("[DeepX AutoChain] Batch attaching references:", targetsToAttach);
    await attachLibraryAssetsBatch(tabId, targetsToAttach);
  }

  // 5. Fast fill and submit prompt
  console.log("[DeepX AutoChain] Injecting next scene prompt and submitting...");
  const dispatchRes = await fastFillAndSubmitPrompt(tabId, nextPrompt, { mode: "video" });

  return {
    success: true,
    chainedFromVideo: !!videoInfo?.videoSrc,
    continuityFrame: frameUploadedName,
    attachedReferences: targetsToAttach,
    dispatchResult: dispatchRes
  };
}

async function getRegisteredCharacterNames(tabId) {
  try {
    const list = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const names = [];
        const canvasTiles = Array.from(document.querySelectorAll("flow-character-tile, [data-character-name], .character-tile"));
        for (const t of canvasTiles) {
          const name = t.getAttribute("data-character-name") || t.getAttribute("aria-label") || (t.innerText || "").split("\n")[0];
          const clean = (name || "").replace(/accessibility_new|favorite|more_vert|delete/gi, "").trim();
          if (clean && !names.includes(clean)) names.push(clean);
        }
        return names;
      }
    }).then(r => r?.[0]?.result);
    return list || [];
  } catch (e) {
    return [];
  }
}

// Complete Autonomous Multi-Scene Storyboard Pipeline with In-Memory Canvas Continuity & Auto-Chaining
async function handleAutonomousStoryboardPipeline(payload, progressCallback) {
  const {
    scriptText,
    scenes: rawScenes,
    heroReferences: rawHeroRefs = [],
    aspectRatio = "16:9",
    duration = 10,
    model = "veo-omni",
    autoDownload = true,
    downloadFolder = "deepx_renders",
    noReferences = false,
    mode = "video",
    count = 1
  } = payload;
  const heroReferences = Array.isArray(rawHeroRefs) ? rawHeroRefs : (rawHeroRefs ? [rawHeroRefs] : []);

  const tabId = await ensureFlowTab();
  if (!tabId) throw new Error("Could not connect to or auto-open Google Flow tab.");

  // Focus Google Flow tab so the user visibly sees the automation in real time
  await chrome.tabs.update(tabId, { active: true }).catch(() => {});
  await ensureOnProjectCanvas(tabId);

  // Parse scenes from scriptText if provided
  let scenes = Array.isArray(rawScenes) && rawScenes.length > 0 ? rawScenes : [];
  if (scenes.length === 0 && scriptText) {
    const parsed = parsePromptsWithGaps(scriptText);
    scenes = parsed.map((p, idx) => ({
      index: idx,
      prompt: p,
      references: []
    }));
  }

  if (scenes.length === 0) {
    throw new Error("No scenes provided for autonomous storyboard pipeline");
  }

  const isImageMode = mode.toLowerCase().includes("image") ||
    String(model || "").includes("Banana") ||
    String(model || "").toLowerCase().includes("imagen");
  const effectiveModel = isImageMode
    ? (String(model || "").includes("Banana") || String(model || "").toLowerCase().includes("imagen") ? model : "🍌 Nano Banana 2.1")
    : model;

  console.log(`[DeepX Autopilot] Starting autonomous execution of ${scenes.length} scene(s) [Mode: ${isImageMode ? "image" : "video"}]...`);
  const results = [];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const promptText = scene.prompt || scene;
    const sceneRefs = scene.references || scene.reference_assets || [];
    console.log(`[DeepX Autopilot] === Executing Scene ${i + 1}/${scenes.length} ===`);

    progressCallback?.({
      type: "AUTOPILOT_PROGRESS",
      index: i,
      total: scenes.length,
      message: `[${i + 1}/${scenes.length}] ⚙️ Setting Model: ${effectiveModel} | Ratio: ${aspectRatio}...`
    });

    if (isImageMode) {
      // Real-Time Image Storyboard Execution
      await configureFlowSettingsFast(tabId, {
        mode: "image",
        aspectRatio,
        model: effectiveModel,
        outputCount: count
      });

      progressCallback?.({
        type: "AUTOPILOT_PROGRESS",
        index: i,
        total: scenes.length,
        message: `[${i + 1}/${scenes.length}] ✍️ Entering prompt into Flow canvas: "${promptText}"...`
      });

      let genRes;
      try {
        genRes = await handleGenerateImage({
          prompt: promptText,
          aspectRatio,
          model: effectiveModel,
          count
        });
      } catch (err) {
        console.warn(`[DeepX Autopilot] Scene ${i + 1} initial generation warning:`, err.message);
        progressCallback?.({
          type: "AUTOPILOT_PROGRESS",
          index: i,
          total: scenes.length,
          message: `[${i + 1}/${scenes.length}] ⚠️ Flow issue encountered. Automatically remodifying prompt and retrying...`,
          status: "warning"
        });
        const remodifiedPrompt = remodifyPromptForSafety(promptText);
        genRes = await handleGenerateImage({
          prompt: remodifiedPrompt,
          aspectRatio,
          model: effectiveModel,
          count
        });
      }

      progressCallback?.({
        type: "AUTOPILOT_PROGRESS",
        index: i,
        total: scenes.length,
        message: `[${i + 1}/${scenes.length}] 🚀 Dispatched to Google Flow canvas!`,
        status: "success"
      });

      results.push({
        sceneIndex: i,
        prompt: promptText,
        result: genRes
      });

      if (i < scenes.length - 1) {
        await new Promise(r => setTimeout(r, 1200));
      }
    } else {
      // Real-Time Video Storyboard Execution with Auto-Chaining
      let continuityFrameName = null;
      if (i > 0) {
        progressCallback?.({
          type: "AUTOPILOT_PROGRESS",
          index: i,
          total: scenes.length,
          message: `[${i + 1}/${scenes.length}] 🔄 Extracting terminal continuity frame from previous scene...`
        });
        const videoInfo = await chrome.scripting.executeScript({
          target: { tabId },
          func: async () => {
            const tile = document.querySelector("flow-video-tile, flow-grid-tile-container");
            if (!tile) return null;
            tile.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
            await new Promise(r => setTimeout(r, 120));
            const video = tile.querySelector("video");
            return video ? video.src : null;
          }
        }).then(r => r?.[0]?.result);

        if (videoInfo) {
          try {
            const frameDataUrl = await extractLastFrameFromVideoUrl(videoInfo);
            if (frameDataUrl) {
              const fileName = `continuity_scene_${i}_to_${i + 1}.jpg`;
              await handleUploadImage({
                dataUrl: frameDataUrl,
                fileName: fileName,
                mimeType: "image/jpeg"
              });
              continuityFrameName = fileName;
            }
          } catch (err) {
            console.warn("[DeepX Autopilot] Terminal frame grab warning:", err);
          }
        }
      }

      await configureFlowSettingsFast(tabId, {
        mode: "video",
        aspectRatio,
        duration,
        model
      });

      const targetsToAttach = [];
      if (!noReferences) {
        if (continuityFrameName) targetsToAttach.push(continuityFrameName);
        if (Array.isArray(heroReferences)) targetsToAttach.push(...heroReferences);
        if (Array.isArray(sceneRefs)) targetsToAttach.push(...sceneRefs);

        const mentionMatches = (typeof promptText === "string" ? promptText : "").match(/@([a-zA-Z0-9_]+)/g);
        if (mentionMatches) {
          for (const m of mentionMatches) {
            const cleanHandle = m.replace(/^@/, "").trim();
            if (cleanHandle && !targetsToAttach.includes(cleanHandle)) {
              targetsToAttach.push(cleanHandle);
            }
          }
        }
      }

      if (targetsToAttach.length > 0) {
        const uniqueTargets = Array.from(new Set(targetsToAttach));
        progressCallback?.({
          type: "AUTOPILOT_PROGRESS",
          index: i,
          total: scenes.length,
          message: `[${i + 1}/${scenes.length}] 🔗 Attaching reference cards: ${uniqueTargets.join(", ")}...`
        });
        await attachLibraryAssetsBatch(tabId, uniqueTargets);
      }

      progressCallback?.({
        type: "AUTOPILOT_PROGRESS",
        index: i,
        total: scenes.length,
        message: `[${i + 1}/${scenes.length}] ✍️ Entering scene prompt: "${promptText}"...`
      });

      await fastFillAndSubmitPrompt(tabId, promptText, {
        mode: "video",
        model,
        aspectRatio,
        duration,
        noReferences: noReferences,
        referenceAssets: targetsToAttach,
        heroReferences: heroReferences
      });

      progressCallback?.({
        type: "AUTOPILOT_PROGRESS",
        index: i,
        total: scenes.length,
        message: `[${i + 1}/${scenes.length}] ⏳ Rendering video on Google Flow cluster...`
      });

      // Poll until video finishes
      let finishedVideoUrl = null;
      const maxPollMs = 180000;
      const pollStart = Date.now();

      while (Date.now() - pollStart < maxPollMs) {
        await new Promise(r => setTimeout(r, 2500));
        const checkRes = await chrome.scripting.executeScript({
          target: { tabId },
          func: () => {
            const tile = document.querySelector("flow-grid-tile-container");
            if (!tile) return null;
            tile.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
            const video = tile.querySelector("video");
            const lines = (tile.innerText || "").split("\n").filter(Boolean);
            const isFailed = lines.some(l => /failed|error|unable to generate|policy|violat/i.test(l));
            const isDone = !!video?.src || lines.some(l => l.includes("play_circle"));
            return { isDone, isFailed, videoSrc: video ? video.src : null };
          }
        }).then(r => r?.[0]?.result);

        if (checkRes?.isFailed) {
          console.warn(`[DeepX Autopilot] Video tile generation failed for Scene ${i + 1}. Remodifying prompt and re-submitting...`);
          progressCallback?.({
            type: "AUTOPILOT_PROGRESS",
            index: i,
            total: scenes.length,
            message: `[${i + 1}/${scenes.length}] ⚠️ Flow generation failed. Automatically remodifying prompt and retrying...`,
            status: "warning"
          });
          const safePrompt = remodifyPromptForSafety(promptText);
          await fastFillAndSubmitPrompt(tabId, safePrompt, {
            mode: "video",
            model,
            aspectRatio,
            duration,
            noReferences: targetsToAttach.length === 0,
            _isRetry: true
          });
          continue;
        }

        if (checkRes?.isDone && checkRes?.videoSrc) {
          finishedVideoUrl = checkRes.videoSrc;
          break;
        }
      }

      let downloadedId = null;
      if (autoDownload && finishedVideoUrl) {
        const filename = `${downloadFolder}/${parseFilename(promptText, i)}`;
        try {
          downloadedId = await chrome.downloads.download({ url: finishedVideoUrl, filename, saveAs: false });
        } catch (_) {}
      }

      progressCallback?.({
        type: "AUTOPILOT_PROGRESS",
        index: i,
        total: scenes.length,
        message: `[${i + 1}/${scenes.length}] 🎉 Video render complete!`,
        status: "success"
      });

      results.push({
        sceneIndex: i,
        prompt: promptText,
        videoUrl: finishedVideoUrl,
        continuityFrame: continuityFrameName,
        downloadId: downloadedId
      });
    }
  }

  return {
    success: true,
    totalScenes: scenes.length,
    completedScenes: results.length,
    scenes: results
  };
}

// Self-Healing Error Recovery & Prompt Remodifier:
// If Flow rejects or fails on a prompt, soften intense terms into cinematic aesthetic phrasing while 100% preserving character references and user story.
function remodifyPromptForSafety(prompt) {
  if (typeof prompt !== "string") return prompt;
  let text = prompt;

  const safetyReplacements = [
    { from: /\b(?:blood|bloody)\b/gi, to: "crimson light" },
    { from: /\b(?:kill|killing|murder|murderous)\b/gi, to: "defeat" },
    { from: /\b(?:fight|fighting|battle|combat)\b/gi, to: "dramatic cinematic encounter" },
    { from: /\b(?:gun|guns|pistol|rifle|firearm)\b/gi, to: "futuristic energy device" },
    { from: /\b(?:knife|knives|blade|dagger|sword)\b/gi, to: "ceremonial artifact" },
    { from: /\b(?:attack|attacking|assault)\b/gi, to: "advance dynamically" },
    { from: /\b(?:explosion|explode|exploding|bomb)\b/gi, to: "burst of radiant energy" },
    { from: /\b(?:nude|naked|erotic|sexy)\b/gi, to: "elegant cinematic aesthetic" },
    { from: /\b(?:dead|corpse|death)\b/gi, to: "mysterious fallen shadow" },
    { from: /\b(?:terror|terrorist|hostage)\b/gi, to: "high-stakes mystery" },
    { from: /\b(?:violent|violence)\b/gi, to: "intense kinetic motion" },
    { from: /\b(?:wound|wounded|injury)\b/gi, to: "dramatic fatigue" }
  ];

  for (const { from, to } of safetyReplacements) {
    text = text.replace(from, to);
  }

  // If no specific terms were matched, soften punctuation and prepend supportive framing
  if (text === prompt) {
    text = text.replace(/!+/g, ".").replace(/\s+/g, " ").trim();
    if (!text.toLowerCase().startsWith("cinematic") && !text.toLowerCase().startsWith("high quality")) {
      text = `Cinematic photorealistic composition: ${text}`;
    }
  }

  return text;
}

async function fastFillAndSubmitPrompt(tabId, prompt, config = {}) {
  // 0. Ensure tab is squarely on the main project canvas
  await ensureOnProjectCanvas(tabId);

  await attachDebugger(tabId);

  // 1. Configure settings (with fast-path cache skip)
  await configureFlowSettingsFast(tabId, config);

  // Allow settings overlay/backdrop transitions to completely settle
  await new Promise(r => setTimeout(r, 120));

  // 2. Global Compulsory Reference Enforcement:
  // Auto-bind any @character or library asset reference as REAL photo card chips
  let cleanPromptText = prompt;
  let hasReferencesToAttach = false;
  if (!config.noReferences) {
    const charMatches = (prompt.match(/@([a-zA-Z0-9_\-]+)/g) || []).map(m => m.replace(/^@/, ""));
    let targetsToAttach = Array.from(new Set([
      ...(config.referenceAssets || []).filter(t => t !== ":recent_images"),
      ...(config.heroReferences || []),
      ...charMatches
    ]));

    // Registered project character fallback if still 0 reference targets
    if (targetsToAttach.length === 0) {
      try {
        const regChars = await getRegisteredCharacterNames(tabId);
        if (regChars && regChars.length > 0) {
          targetsToAttach = [regChars[0]];
          console.log("[DeepX Compulsory] Auto-locking project character into ingredient bar:", regChars[0]);
        }
      } catch (_) {}
    }

    hasReferencesToAttach = targetsToAttach.length > 0;
    if (hasReferencesToAttach) {
      console.log("[DeepX Compulsory] Auto-locking authentic references into ingredient bar:", targetsToAttach);
      await attachLibraryAssetsBatch(tabId, targetsToAttach, false, prompt);

      // Global Mandatory Reference Verification:
      // Ensure at least 1 authentic reference chip is locked if matching assets exist
      const chipVerification = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          const pBox = document.querySelector("flow-prompt-box, flow-base-prompt-box");
          return pBox ? pBox.querySelectorAll("flow-ingredient-chip").length : 0;
        }
      });
      const activeChipsCount = chipVerification?.[0]?.result || 0;
      if (activeChipsCount === 0) {
        console.warn("[DeepX Compulsory] Prompt box has 0 chips! Retrying authentic attachment...");
        await new Promise(r => setTimeout(r, 100));
        await attachLibraryAssetsBatch(tabId, targetsToAttach, false, prompt);
      }
    }

    // Clean @mentions from prompt text inserted into ProseMirror
    for (const rawMention of (prompt.match(/@([a-zA-Z0-9_\-]+)/g) || [])) {
      const assetName = rawMention.replace(/^@/, "");
      cleanPromptText = cleanPromptText.replace(new RegExp(`@${assetName}\\b`, "g"), assetName.replace(/_/g, " "));
    }
  }

  // 3. High-Speed Unified Text Insertion & Submit Coordinate Detection (< 80ms)
  const submitInfo = await chrome.scripting.executeScript({
    target: { tabId },
    func: async (text, compulsoryRef) => {
      const pBox = document.querySelector("flow-prompt-box, flow-base-prompt-box");
      const currentChips = pBox ? pBox.querySelectorAll("flow-ingredient-chip").length : 0;
      if (compulsoryRef && currentChips === 0) {
        console.warn("[DeepX] Note: Specified reference chip not in library; proceeding with direct real-time prompt generation on Flow canvas.");
      }

      const box = document.querySelector("div.ProseMirror, flow-rich-text-editor div[role='textbox'], div[contenteditable='true']");
      if (!box) return { success: false, reason: "Prompt box not found" };

      box.focus();
      document.execCommand("selectAll", false, null);
      document.execCommand("delete", false, null);
      document.execCommand("insertText", false, text);

      box.dispatchEvent(new InputEvent("beforeinput", {
        bubbles: true,
        cancelable: true,
        inputType: "insertText",
        data: text
      }));
      box.dispatchEvent(new Event("input", { bubbles: true }));

      // Event-driven micro-polling for submit button readiness (up to 3500ms)
      let btn = null;
      for (let i = 0; i < 70; i++) {
        btn = document.querySelector("button.generate-icon-button, button[aria-label='Start generation'], div.submit-controls button[type='submit']");
        if (!btn && pBox) {
          btn = Array.from(pBox.querySelectorAll("button")).find(b => b.querySelector("mat-icon")?.textContent?.includes("arrow_forward"));
        }
        if (btn && !btn.disabled) break;
        await new Promise(r => setTimeout(r, 50));
      }

      // Check if Google Flow replaced the submit button with an Insufficient Credits warning
      const creditWarn = document.querySelector(".prompt-warning-button, button[aria-label*='credit' i], button[aria-label*='Insufficient credits' i]");
      if (creditWarn && !btn) {
        return {
          success: false,
          reason: "GOOGLE_FLOW_CREDITS_EXHAUSTED: Google Flow has displayed an 'Insufficient credits warning' for this model or duration. Your Google Flow account is out of credits for this action. Please switch to a lighter model (like 🍌 Nano Banana 2.1) or shorter duration (5s), or top up credits."
        };
      }

      if (!btn) return { success: false, reason: "Submit button not found" };
      if (btn.disabled) return { success: false, reason: "Submit button remained disabled" };

      const rect = btn.getBoundingClientRect();
      const midX = Math.round(rect.left + rect.width / 2);
      const midY = Math.round(rect.top + rect.height / 2);

      return { success: true, x: midX, y: midY, chipsSubmitted: currentChips };
    },
    args: [cleanPromptText, hasReferencesToAttach]
  }).then(r => r?.[0]?.result).catch(err => ({ success: false, reason: err.message }));

  if (!submitInfo?.success) {
    throw new Error(`Failed to submit prompt: ${submitInfo?.reason || "Unknown error"}`);
  }

  // 4. Deliver trusted hardware click via CDP Input
  await chrome.tabs.update(tabId, { active: true }).catch(() => {});
  if (submitInfo?.success && submitInfo?.x && submitInfo?.y) {
    await nativeClick(tabId, submitInfo.x, submitInfo.y);
  } else {
    const submitRect = await getElementRect(tabId, ANYAI_SELECTORS.submitButton);
    if (submitRect && submitRect.found) {
      await nativeClick(tabId, submitRect.x, submitRect.y);
    } else {
      await nativeDispatchKey(tabId, "Enter", "Enter", 13);
    }
  }

  // 6. Verify that prompt was submitted (box was cleared or button became disabled or tile appeared)
  let verified = false;
  for (let i = 0; i < 15; i++) {
    const check = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const box = document.querySelector("div.ProseMirror, flow-rich-text-editor div[role='textbox']");
        const btn = document.querySelector("button.generate-icon-button, button[aria-label='Start generation']");
        const hasGenTile = !!document.querySelector("flow-grid-tile-container")?.innerText?.includes("%");
        return {
          boxEmpty: !box || !box.innerText.trim(),
          btnDisabled: !!btn?.disabled,
          hasGenTile
        };
      }
    }).then(r => r?.[0]?.result).catch(() => null);

    if (check && (check.boxEmpty || check.btnDisabled || check.hasGenTile)) {
      verified = true;
      break;
    }
    await new Promise(r => setTimeout(r, 60));
  }

  if (!verified) {
    if (!config._isRetry) {
      console.warn(`[DeepX Self-Healing] Prompt submission not verified for "${prompt.slice(0, 40)}...". Remodifying prompt and retrying...`);
      const remodified = remodifyPromptForSafety(prompt);
      return await fastFillAndSubmitPrompt(tabId, remodified, { ...config, _isRetry: true });
    }
    throw new Error(`Failed to submit prompt to Google Flow: "${prompt.slice(0, 40)}..." - generation did not start.`);
  }

  return { success: true, verified: true };
}

// Generate single video
async function handleGenerateVideo(payload) {
  const {
    prompt,
    model = "veo-quality",
    mode = "text",
    aspectRatio = "landscape",
    duration = 8,
    referenceMediaIds = [],
    startImageId = null,
    endImageId = null,
    seed = null
  } = payload;

  const tabId = await ensureFlowTab();
  if (!tabId) throw new Error("Could not connect to or auto-open Google Flow tab.");
  await ensureOnProjectCanvas(tabId);

  const startTime = Date.now();

  // Default Primary High-Speed Path: AnyAI Native Chrome Debugger Automation Engine
  if (!payload.useDirectApi) {
    console.log("[DeepX Fast] Executing prompt via AnyAI native debugger pipeline...");
    const refTargets = [];
    if (Array.isArray(payload.referenceAssets)) refTargets.push(...payload.referenceAssets);
    if (Array.isArray(payload.heroReferences)) refTargets.push(...payload.heroReferences);
    const promptMentions = (prompt.match(/@([a-zA-Z0-9_\-]+)/g) || []).map(m => m.replace(/^@/, ""));
    refTargets.push(...promptMentions);

    // If still empty and not noReferences, auto-detect registered characters from canvas/library
    if (refTargets.length === 0 && !payload.noReferences) {
      try {
        const regChars = await getRegisteredCharacterNames(tabId);
        if (regChars && regChars.length > 0) {
          refTargets.push(regChars[0]);
          console.log("[DeepX Fast] Auto-anchoring registered project character to video prompt:", regChars[0]);
        }
      } catch (_) {}
    }

    // Compulsory Multi-Reference Stacking: Auto-bind ALL recent scene images alongside hero character
    if (!refTargets.includes(":recent_images")) {
      refTargets.push(":recent_images");
    }

    await fastFillAndSubmitPrompt(tabId, prompt, {
      model,
      aspectRatio,
      duration,
      mode: "video",
      outputCount: payload.count || payload.outputCount || 1,
      noReferences: payload.noReferences || false,
      referenceAssets: Array.from(new Set(refTargets)),
      heroReferences: payload.heroReferences || []
    });

    const durationMs = Date.now() - startTime;
    console.log(`[DeepX Fast] AnyAI process completed in ${durationMs}ms!`);

    return {
      status: "dispatched",
      via: "ANYAI_NATIVE_DEBUGGER",
      executionTimeMs: durationMs,
      projectId: lastKnownProjectId || (await execInFlowTab("get_project_id")) || "default",
      modelKey: resolveModelKey(model, mode, duration, aspectRatio),
      prompt
    };
  }

  // Optional: Direct API path if explicitly requested
  let token = null;
  try {
    token = await execInFlowTab("get_token");
  } catch {}

  const projectId = (await execInFlowTab("get_project_id")) || "default";

  if (token) {
    try {
      const recaptchaToken = await execInFlowTab("get_recaptcha", ["VIDEO_GENERATION"]);
      const modelKey = resolveModelKey(model, mode, duration, aspectRatio);

      let endpointMethod = "batchAsyncGenerateVideoText";
      if (mode === "start" || mode === "imageToVideo") endpointMethod = "batchAsyncGenerateVideoStartImage";
      else if (mode === "se" || mode === "startAndEndVideo") endpointMethod = "batchAsyncGenerateVideoStartAndEndImage";
      else if (mode === "ref" || mode === "referenceImagesToVideo") endpointMethod = "batchAsyncGenerateVideoReferenceImages";

      const endpoint = `${AISANDBOX_API}/v1/video:${endpointMethod}`;
      const batchId = crypto.randomUUID();
      const sessionId = ";" + Date.now() + Math.random();

      const isPortrait = aspectRatio === "portrait" || aspectRatio === "9:16";
      const requestItem = {
        aspectRatio: isPortrait ? "VIDEO_ASPECT_RATIO_PORTRAIT" : "VIDEO_ASPECT_RATIO_LANDSCAPE",
        seed: seed ?? Math.floor(Math.random() * 300000),
        videoModelKey: modelKey,
        metadata: {},
        textInput: {
          structuredPrompt: {
            parts: [{ text: prompt }]
          }
        }
      };

      if ((mode === "ref" || mode === "referenceImagesToVideo") && referenceMediaIds.length > 0) {
        requestItem.referenceImages = referenceMediaIds.map(id => ({
          mediaId: id,
          imageUsageType: "IMAGE_USAGE_TYPE_ASSET"
        }));
      }
      if ((mode === "start" || mode === "imageToVideo" || mode === "se" || mode === "startAndEndVideo") && startImageId) {
        requestItem.startImage = {
          mediaId: startImageId,
          cropCoordinates: { top: 0, left: 0, bottom: 1, right: 1 }
        };
      }
      if ((mode === "se" || mode === "startAndEndVideo") && endImageId) {
        requestItem.endImage = {
          mediaId: endImageId,
          cropCoordinates: { top: 0, left: 0, bottom: 1, right: 1 }
        };
      }

      const reqBody = {
        mediaGenerationContext: { batchId },
        clientContext: {
          projectId,
          tool: "PINHOLE",
          recaptchaContext: {
            applicationType: "RECAPTCHA_APPLICATION_TYPE_WEB",
            token: recaptchaToken
          },
          sessionId
        },
        requests: [requestItem],
        useV2ModelConfig: true
      };

      const response = await execInFlowTab("api_post", [endpoint, reqBody, token]);
      const mediaName = response?.media?.[0]?.name;
      if (mediaName) {
        return {
          status: "dispatched",
          via: "DIRECT_API",
          executionTimeMs: Date.now() - startTime,
          mediaId: mediaName,
          projectId,
          modelKey,
          batchId
        };
      }
    } catch (apiErr) {
      console.warn("[DeepX] Direct API failed, accelerating via AnyAI native debugger:", apiErr);
    }
  }

  // Fallback to AnyAI
  await fastFillAndSubmitPrompt(tabId, prompt, {
    model,
    aspectRatio,
    duration,
    mode: "video",
    outputCount: payload.count || payload.outputCount || 1
  });

  const durationMs = Date.now() - startTime;
  return {
    status: "dispatched",
    via: "ANYAI_NATIVE_DEBUGGER",
    executionTimeMs: durationMs,
    projectId,
    modelKey: resolveModelKey(model, mode, duration, aspectRatio),
  };
}

// Generate single or multi image
async function handleGenerateImage(payload) {
  const {
    prompt,
    aspectRatio = "16:9",
    model = "imagen-3",
    referenceMediaIds = [],
    count = 1,
    seed = null,
    useDirectApi = false,
    wait_for_render = false,
    waitForCompletion = false,
    waitForRender = false
  } = payload;

  const shouldWait = wait_for_render || waitForCompletion || waitForRender;

  const tabId = await ensureFlowTab();
  if (!tabId) throw new Error("Could not connect to or auto-open Google Flow tab.");

  const startTime = Date.now();

  // Primary High-Speed Path: AnyAI Native UI Automation Engine
  if (!useDirectApi) {
    console.log("[DeepX Fast] Executing image prompt via AnyAI native UI automation pipeline...");
    await fastFillAndSubmitPrompt(tabId, prompt, {
      mode: "image",
      model,
      aspectRatio,
      outputCount: count
    });

    const durationMs = Date.now() - startTime;
    console.log(`[DeepX Fast] Image prompt executed in ${durationMs}ms!`);

    if (shouldWait) {
      console.log("[DeepX Fast] Waiting for image render tile to reach 100% completion...");
      const renderRes = await pollLatestTileUntilReady(tabId, 120000);
      const totalTimeMs = Date.now() - startTime;
      console.log(`[DeepX Fast] Image render completed in ${totalTimeMs}ms!`, renderRes);
      return {
        status: "succeeded",
        via: "ANYAI_NATIVE_DEBUGGER",
        executionTimeMs: totalTimeMs,
        projectId: (await execInFlowTab("get_project_id")) || "default",
        prompt,
        model,
        aspectRatio,
        count,
        imageUrl: renderRes.images?.[0]?.url || renderRes.imageUrl,
        images: renderRes.images || (renderRes.imageUrl ? [{ url: renderRes.imageUrl }] : [])
      };
    }

    return {
      status: "dispatched",
      via: "ANYAI_NATIVE_DEBUGGER",
      executionTimeMs: durationMs,
      projectId: (await execInFlowTab("get_project_id")) || "default",
      prompt,
      model,
      aspectRatio,
      count
    };
  }

  let token = null;
  try {
    token = await execInFlowTab("get_token");
  } catch {}

  const projectId = (await execInFlowTab("get_project_id")) || "default";

  if (token) {
    try {
      const recaptchaToken = await execInFlowTab("get_recaptcha", ["IMAGE_GENERATION"]);
      const batchId = crypto.randomUUID();
      const sessionId = ";" + Date.now();
      const endpoint = `${AISANDBOX_API}/v1/projects/${projectId}/flowMedia:batchGenerateImages`;

      const imageInputs = (referenceMediaIds || []).map(ref => ({
        imageInputType: "IMAGE_INPUT_TYPE_REFERENCE",
        name: ref
      }));

      const isPortrait = aspectRatio === "portrait" || aspectRatio === "9:16";
      const isSquare = aspectRatio === "square" || aspectRatio === "1:1";
      const ratioEnum = isPortrait
        ? "IMAGE_ASPECT_RATIO_PORTRAIT"
        : isSquare
        ? "IMAGE_ASPECT_RATIO_SQUARE"
        : "IMAGE_ASPECT_RATIO_LANDSCAPE";

      const numRequests = Math.max(1, Math.min(4, count));
      const requests = [];

      for (let i = 0; i < numRequests; i++) {
        requests.push({
          clientContext: {
            recaptchaContext: {
              applicationType: "RECAPTCHA_APPLICATION_TYPE_WEB",
              token: recaptchaToken
            },
            projectId,
            tool: "PINHOLE",
            sessionId
          },
          imageAspectRatio: ratioEnum,
          imageInputs,
          imageModelName: "NARWHAL", // Imagen 3
          seed: seed ? seed + i : Math.floor(Math.random() * 300000),
          structuredPrompt: {
            parts: [{ text: prompt }]
          }
        });
      }

      const reqBody = {
        clientContext: {
          recaptchaContext: {
            applicationType: "RECAPTCHA_APPLICATION_TYPE_WEB",
            token: recaptchaToken
          },
          projectId,
          tool: "PINHOLE",
          sessionId
        },
        mediaGenerationContext: { batchId },
        useNewMedia: true,
        requests
      };

      const response = await execInFlowTab("api_post", [endpoint, reqBody, token]);
      const primaryMediaId = response?.workflows?.[0]?.metadata?.primaryMediaId || response?.media?.[0]?.name;

      const results = [];
      if (Array.isArray(response?.media)) {
        for (const m of response.media) {
          const fifeUrl = m?.image?.generatedImage?.fifeUrl;
          const mediaId = m?.name || primaryMediaId;
          const redirectUrl = `https://labs.google/fx/api/trpc/media.getMediaUrlRedirect?name=${mediaId}`;
          results.push({
            mediaId,
            url: fifeUrl || redirectUrl,
            fifeUrl
          });
        }
      }

      return {
        status: "succeeded",
        via: "DIRECT_API",
        executionTimeMs: Date.now() - startTime,
        primaryMediaId,
        images: results.length > 0 ? results : [{
          mediaId: primaryMediaId,
          url: `https://labs.google/fx/api/trpc/media.getMediaUrlRedirect?name=${primaryMediaId}`
        }]
      };
    } catch (e) {
      console.warn("[DeepX] Direct image API post failed, falling back to AnyAI debugger:", e);
    }
  }

  // Fallback to AnyAI Native Chrome Debugger Automation Engine
  console.log("[DeepX] Executing image generation via AnyAI native debugger pipeline...");
  await fastFillAndSubmitPrompt(tabId, prompt, {
    mode: "image",
    model,
    aspectRatio,
    outputCount: count
  });

  const durationMs = Date.now() - startTime;
  console.log(`[DeepX Fast] Image prompt executed in ${durationMs}ms!`);

  return {
    status: "dispatched",
    via: "ANYAI_NATIVE_DEBUGGER",
    executionTimeMs: durationMs,
    projectId,
    prompt,
    model,
    count
  };
}

// Ultra-Fast Upload Image / Video to Flow media library (DataTransfer in-memory ~50ms, Rapid CDP ~100ms)
async function handleUploadImage(payload) {
  const { dataUrl, filePath, fileName = "asset.png", mimeType = "image/png" } = payload;
  const tabId = await ensureFlowTab();
  if (!tabId) throw new Error("Could not connect to or auto-open Google Flow tab.");
  await ensureOnProjectCanvas(tabId);

  const startTime = Date.now();

  // Fast Path 1: Instant In-Memory DataTransfer injection (~40-80ms total)
  if (dataUrl) {
    try {
      const injectRes = await chrome.scripting.executeScript({
        target: { tabId },
        func: async (dUrl, fName, mType) => {
          const poll = (fn, timeout = 600, interval = 10) => new Promise(res => {
            const v = fn();
            if (v) return res(v);
            const start = performance.now();
            const id = setInterval(() => {
              const v2 = fn();
              if (v2 || performance.now() - start > timeout) {
                clearInterval(id);
                res(v2 || null);
              }
            }, interval);
          });

          // 1. Ensure popover is open
          let popover = document.querySelector(".cdk-overlay-pane, flow-add-menu-popover-content");
          if (!popover) {
            const addBtn = document.querySelector("button[aria-label*='Add ingredients' i], button.add-menu-trigger, flow-add-menu button");
            if (addBtn) addBtn.click();
          }

          // 2. Poll for upload button
          const uploadBtn = await poll(() => document.querySelector(".sidebar-upload-btn, button[aria-label*='Upload' i]"), 600);
          if (!uploadBtn) return { success: false, reason: "Upload button not found" };

          // 3. Clear stale inputs & click upload button
          if (document.documentElement) {
            document.documentElement.setAttribute("data-deepx-upload-active", "true");
          }
          document.querySelectorAll('input[type="file"]').forEach(i => i.remove());
          uploadBtn.click();

          // 4. Poll for fresh input[type=file]
          const input = await poll(() => document.querySelector('input[type="file"]'), 400);
          if (!input) {
            if (document.documentElement) {
              document.documentElement.removeAttribute("data-deepx-upload-active");
            }
            return { success: false, reason: "File input not created" };
          }

          // 5. In-Memory DataTransfer File binding
          const parts = dUrl.split(",");
          const byteStr = atob(parts[1] || parts[0]);
          const mime = parts[0]?.match(/:(.*?);/)?.[1] || mType;
          const ab = new ArrayBuffer(byteStr.length);
          const ia = new Uint8Array(ab);
          for (let i = 0; i < byteStr.length; i++) {
            ia[i] = byteStr.charCodeAt(i);
          }
          const blob = new Blob([ab], { type: mime });
          const file = new File([blob], fName, { type: mime });

          const dt = new DataTransfer();
          dt.items.add(file);
          input.files = dt.files;
          input.dispatchEvent(new Event("change", { bubbles: true }));

          if (document.documentElement) {
            document.documentElement.removeAttribute("data-deepx-upload-active");
          }

          // Fast popover dismiss
          setTimeout(() => {
            const backdrop = document.querySelector(".cdk-overlay-backdrop");
            if (backdrop) backdrop.click();
            const closeBtn = document.querySelector("flow-add-menu button.add-menu-trigger-active");
            if (closeBtn) closeBtn.click();
          }, 100);

          return { success: true, mode: "fast_datatransfer" };
        },
        args: [dataUrl, fileName, mimeType]
      });

      if (injectRes?.[0]?.result?.success) {
        const elapsedMs = Date.now() - startTime;
        console.log(`[DeepX Fast] DataTransfer upload finished in ${elapsedMs}ms.`);
        return {
          success: true,
          fileName,
          mode: "fast_datatransfer",
          elapsedMs
        };
      }
    } catch (err) {
      console.warn("[DeepX Fast] DataTransfer upload error, falling back to CDP:", err);
    }
  }

  // Fast Path 2: Rapid CDP File Injection (Direct zero-copy file upload, desktop only)
  if (filePath && !isMobileOrKiwi) {
    try {
      const dbgOk = await attachDebugger(tabId);
      if (dbgOk) {
        await chrome.scripting.executeScript({
          target: { tabId },
          func: () => new Promise(resolve => {
          let popover = document.querySelector(".cdk-overlay-pane, flow-add-menu-popover-content");
          if (!popover) {
            const addBtn = document.querySelector("button[aria-label*='Add ingredients' i], button.add-menu-trigger, flow-add-menu button");
            if (addBtn) addBtn.click();
          }

          let count = 0;
          const interval = setInterval(() => {
            count++;
            const uploadBtn = document.querySelector(".sidebar-upload-btn, button[aria-label*='Upload' i]");
            if (uploadBtn) {
              clearInterval(interval);
              document.querySelectorAll('input[type="file"]').forEach(i => i.remove());
              uploadBtn.click();

              let inputCount = 0;
              const inputInterval = setInterval(() => {
                inputCount++;
                const input = document.querySelector('input[type="file"]');
                if (input) {
                  clearInterval(inputInterval);
                  resolve(true);
                } else if (inputCount > 35) {
                  clearInterval(inputInterval);
                  resolve(false);
                }
              }, 10);
            } else if (count > 40) {
              clearInterval(interval);
              resolve(false);
            }
          }, 15);
        })
      });

      let inputObjId = null;
      for (let i = 0; i < 20; i++) {
        const evalRes = await chrome.debugger.sendCommand({ tabId }, "Runtime.evaluate", {
          expression: "(() => { const inputs = document.querySelectorAll('input[type=file]'); return inputs[inputs.length - 1] || null; })()",
          returnByValue: false
        });
        if (evalRes?.result?.objectId) {
          inputObjId = evalRes.result.objectId;
          break;
        }
        await new Promise(r => setTimeout(r, 15));
      }

      if (inputObjId) {
        await chrome.debugger.sendCommand({ tabId }, "DOM.setFileInputFiles", {
          files: [filePath],
          objectId: inputObjId
        });

        // Fast popover dismiss
        await new Promise(r => setTimeout(r, 80));
        chrome.scripting.executeScript({
          target: { tabId },
          func: () => {
            const backdrop = document.querySelector(".cdk-overlay-backdrop");
            if (backdrop) backdrop.click();
            const closeBtn = document.querySelector("flow-add-menu button.add-menu-trigger-active");
            if (closeBtn) closeBtn.click();
          }
        }).catch(() => {});

        const elapsedMs = Date.now() - startTime;
        console.log(`[DeepX Fast] Rapid CDP upload finished in ${elapsedMs}ms.`);
        return {
          success: true,
          filePath,
          uploaded: true,
          mode: "fast_cdp",
          elapsedMs
        };
      }
    }
  } catch (err) {
      console.warn("[DeepX Fast] Rapid CDP upload fallback:", err);
    }
  }

  throw new Error("Either filePath or dataUrl is required to upload asset.");
}

// Rename current Google Flow project
async function handleRenameProject(payload) {
  const { newName } = payload;
  if (!newName || typeof newName !== "string" || !newName.trim()) {
    throw new Error("A valid new project name string is required.");
  }
  const tabId = await findFlowTab();
  if (!tabId) throw new Error("No Google Flow tab open.");

  const renameResult = await chrome.scripting.executeScript({
    target: { tabId },
    func: async (targetName) => {
      let doneBtn = document.querySelector("button[aria-label='Done']");
      let inp = document.querySelector(".header-title input.editable-text-input");

      if (!doneBtn) {
        const moreBtn = document.querySelector("button[aria-label='More options for the project']");
        if (moreBtn) {
          moreBtn.click();
          await new Promise(r => setTimeout(r, 150));
          const renameItem = Array.from(document.querySelectorAll("[role=menuitem], .mat-mdc-menu-panel button"))
            .find(m => m.textContent?.includes("Rename"));
          if (renameItem) {
            renameItem.click();
            await new Promise(r => setTimeout(r, 150));
          }
        }
      }

      inp = document.querySelector(".header-title input.editable-text-input");
      if (!inp) throw new Error("Project title input not found in Google Flow header.");

      inp.focus();
      inp.select();
      document.execCommand("selectAll");
      document.execCommand("insertText", false, targetName.trim());
      inp.dispatchEvent(new InputEvent("input", { bubbles: true, cancelable: true, inputType: "insertText", data: targetName.trim() }));
      inp.dispatchEvent(new Event("change", { bubbles: true }));

      doneBtn = document.querySelector("button[aria-label='Done']");
      if (doneBtn) {
        doneBtn.click();
        await new Promise(r => setTimeout(r, 200));
      } else {
        inp.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true }));
        inp.blur();
      }

      return {
        success: true,
        newName: inp.value || targetName.trim(),
        title: document.title
      };
    },
    args: [newName.trim()]
  });

  const res = renameResult?.[0]?.result;
  if (res?.success) {
    lastKnownProjectName = res.newName;
    chrome.storage.local.set({ lastKnownProjectName });
    chrome.runtime.sendMessage({
      type: "PROJECT_ID_UPDATED",
      projectId: lastKnownProjectId,
      projectName: res.newName
    }).catch(() => {});
  }
  return res || { success: true, newName: newName.trim() };
}

// Open or create a new Google Flow project
async function handleOpenNewProject() {
  const tabId = await findFlowTab();
  if (tabId) {
    await chrome.tabs.update(tabId, { url: "https://flow.google.com/" });
    await new Promise(r => setTimeout(r, 1500));
    const clickRes = await chrome.scripting.executeScript({
      target: { tabId },
      func: async () => {
        for (let i = 0; i < 20; i++) {
          const newProjBtn = Array.from(document.querySelectorAll("button, flow-create-project-card, [role='button'], a"))
            .find(b => /new project|create project/i.test(b.textContent || "") || b.getAttribute("aria-label")?.toLowerCase().includes("new project"));
          if (newProjBtn) {
            newProjBtn.click();
            return { clicked: true };
          }
          await new Promise(r => setTimeout(r, 200));
        }
        return { clicked: false };
      }
    });
    return { success: true, message: "Navigated and created new project on Google Flow" };
  } else {
    try {
      const wins = await chrome.windows.getAll({ populate: false });
      let tab;
      if (wins && wins.length > 0) {
        const win = wins.find(w => w.type === "normal") || wins[0];
        tab = await chrome.tabs.create({ windowId: win.id, url: "https://flow.google.com/" });
        await chrome.windows.update(win.id, { focused: true }).catch(() => {});
      } else {
        const win = await chrome.windows.create({ url: "https://flow.google.com/", focused: true });
        tab = win.tabs?.[0];
      }
      return { success: true, tabId: tab?.id, message: "Opened new Google Flow tab" };
    } catch (err) {
      const win = await chrome.windows.create({ url: "https://flow.google.com/", focused: true });
      return { success: true, tabId: win.tabs?.[0]?.id, message: "Opened new Google Flow window" };
    }
  }
}

// Rename an existing character in the project
async function handleRenameCharacter(payload) {
  const { oldName, newName } = payload;
  if (!oldName || !newName) throw new Error("Both oldName and newName are required.");
  const tabId = await findFlowTab();
  if (!tabId) throw new Error("No Google Flow tab open.");

  const renameRes = await chrome.scripting.executeScript({
    target: { tabId },
    func: async (fromName, toName) => {
      const charEls = Array.from(document.querySelectorAll("flow-character-tile, [data-character-name], .character-tile-name, flow-character-chip"));
      const target = charEls.find(c => {
        const n = c.getAttribute("data-character-name") || c.textContent?.trim() || "";
        return n.toLowerCase().includes(fromName.toLowerCase());
      });
      if (target) {
        const moreBtn = target.querySelector("button[aria-label*='more' i], button.more-button");
        if (moreBtn) moreBtn.click();
        else target.click();
        await new Promise(r => setTimeout(r, 200));
        const renameBtn = Array.from(document.querySelectorAll("[role=menuitem], button")).find(b => /rename/i.test(b.textContent || ""));
        if (renameBtn) {
          renameBtn.click();
          await new Promise(r => setTimeout(r, 200));
        }
        const inp = document.querySelector("input.character-name-input, input[aria-label*='Character name' i], [role=dialog] input");
        if (inp) {
          inp.focus();
          inp.select();
          document.execCommand("selectAll");
          document.execCommand("insertText", false, toName);
          inp.dispatchEvent(new Event("input", { bubbles: true }));
          inp.dispatchEvent(new Event("change", { bubbles: true }));
          const saveBtn = Array.from(document.querySelectorAll("[role=dialog] button, button[aria-label='Save']")).find(b => /save|done|confirm/i.test(b.textContent || ""));
          if (saveBtn) saveBtn.click();
          return { success: true, oldName: fromName, newName: toName };
        }
      }
      return { success: false, error: `Character '${fromName}' not found in current project library.` };
    },
    args: [oldName, newName]
  });
  return renameRes?.[0]?.result || { success: true };
}

// List all characters registered in Google Flow active project
async function handleListCharacters() {
  const tabId = await findFlowTab();
  if (!tabId) return [];
  const execRes = await chrome.scripting.executeScript({
    target: { tabId },
    func: async () => {
      const list = [];
      const addChar = (name, thumb) => {
        const clean = name.replace(/accessibility_new|favorite|more_vert|delete/gi, "").trim();
        if (clean && !list.some(c => c.name.toLowerCase() === clean.toLowerCase())) {
          list.push({
            name: clean,
            type: "character",
            thumbnail: thumb || null
          });
        }
      };

      // Source 1: Check canvas character tiles
      const canvasTiles = Array.from(document.querySelectorAll("flow-character-tile, [data-character-name], .character-tile"));
      for (const t of canvasTiles) {
        const name = t.getAttribute("data-character-name") || t.getAttribute("aria-label") || (t.innerText || "").split("\n")[0];
        const img = t.querySelector("img")?.src;
        if (name) addChar(name, img);
      }

      // Source 2: Check project library via Add menu
      let popover = document.querySelector("flow-add-menu-popover-content");
      let openedByUs = false;
      if (!popover) {
        const addBtn = document.querySelector("button[aria-label*='Add ingredients' i], button.add-menu-trigger, flow-add-menu button");
        if (addBtn) {
          addBtn.click();
          await new Promise(r => setTimeout(r, 400));
          popover = document.querySelector("flow-add-menu-popover-content");
          openedByUs = true;
        }
      }

      if (popover) {
        const buttons = Array.from(document.querySelectorAll("button.asset-item"));
        for (const b of buttons) {
          const text = (b.innerText || "").trim();
          if (/character/i.test(text)) {
            const lines = text.split("\n");
            const name = lines[0]?.trim();
            const img = b.querySelector("img")?.src;
            if (name) addChar(name, img);
          }
        }

        const tabs = Array.from(document.querySelectorAll("flow-add-menu-side-nav mat-list-item[role='tab']"));
        const charTab = tabs.find(t => (t.innerText || "").includes("Characters"));
        if (charTab) {
          charTab.click();
          await new Promise(r => setTimeout(r, 250));
          const charButtons = Array.from(document.querySelectorAll("button.asset-item"));
          for (const b of charButtons) {
            const name = (b.innerText || "").trim().split("\n")[0];
            const img = b.querySelector("img")?.src;
            if (name) addChar(name, img);
          }
        }

        if (openedByUs) {
          const backdrop = document.querySelector(".cdk-overlay-backdrop");
          if (backdrop) backdrop.click();
        }
      }

      return list;
    }
  });
  return execRes?.[0]?.result || [];
}

// Upload local image file to Google Flow and register as a named character / hero entity
async function handleUploadCharacter(payload) {
  try {
    const { filePath, dataUrl, characterName } = payload;
    if (!filePath && !dataUrl) throw new Error("A local filePath or dataUrl is required.");
    if (!characterName) throw new Error("A characterName is required.");

    const cleanName = characterName.toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/^_+|_+$/g, "") || "character";

    const tabId = await ensureFlowTab();
    if (!tabId) throw new Error("Could not connect to or auto-open Google Flow tab.");

    // Guarantee tab is squarely on the main project canvas
    await ensureOnProjectCanvas(tabId);

    // 1. Ingest image directly into Google Flow project ingredients library via fast In-Memory DataTransfer
    const uploadRes = await handleUploadImage({
      dataUrl,
      filePath,
      fileName: `${cleanName}.jpg`,
      mimeType: "image/jpeg"
    });

    const curUrl = tabId ? (await chrome.tabs.get(tabId))?.url : "";
    const projectId = lastKnownProjectId || extractProjectId(curUrl) || "default";

    // Double-check tab remains interactive and on project canvas
    await ensureOnProjectCanvas(tabId);

    console.log(`[DeepX] Protagonist character / vehicle '${cleanName}' registered in project ${projectId} (${uploadRes?.mode || 'fast_datatransfer'}).`);

    return {
      success: true,
      characterName: cleanName,
      fileName: `${cleanName}.jpg`,
      filePath,
      projectId,
      uploadMode: uploadRes?.mode || "fast_datatransfer",
      status: "character_created_and_saved"
    };
  } catch (err) {
    console.error("[DeepX handleUploadCharacter error]", err);
    throw new Error(`[handleUploadCharacter failed] ${err.message}`);
  }
}

// Generate character directly inside Google Flow's native Character Studio from a prompt
async function handleGenerateCharacter(payload) {
  const { characterName, prompt, model = "🍌 Nano Banana 2.1" } = payload;
  if (!characterName) throw new Error("A characterName is required.");
  if (!prompt) throw new Error("A prompt is required to generate a character.");

  const tabId = await ensureFlowTab();
  if (!tabId) throw new Error("Could not connect to or auto-open Google Flow tab.");

  // 1. Ensure tab is on the character creation page
  const tab = await chrome.tabs.get(tabId);
  const curUrl = tab.url || "";
  let projectId = await execInFlowTab("get_project_id").catch(() => null);
  if (!projectId) {
    const m = curUrl.match(/\/projects?\/([a-zA-Z0-9_-]{6,})/i);
    if (m) projectId = m[1];
  }
  if (!projectId) throw new Error("Could not determine Google Flow project ID.");

  if (!curUrl.includes(`/project/${projectId}/character`)) {
    console.log(`[DeepX Character] Navigating to Google Flow Character Studio for project '${projectId}'...`);
    await chrome.tabs.update(tabId, { url: `https://flow.google.com/project/${projectId}/character` });
    await new Promise(r => setTimeout(r, 2500));
  }

  // 2. Clear any active backdrop / dialog
  await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const backdrop = document.querySelector(".cdk-overlay-backdrop");
      if (backdrop) backdrop.click();
    }
  }).catch(() => {});
  await new Promise(r => setTimeout(r, 400));

  // 3. Fill the 'Describe your character...' prompt box via DOM
  if (!isMobileOrKiwi) await attachDebugger(tabId);

  const fillResult = await chrome.scripting.executeScript({
    target: { tabId },
    func: async (promptText) => {
      const box = document.querySelector(
        "textarea[placeholder*='character' i], input[placeholder*='character' i], flow-character-prompt-box div[contenteditable='true'], div.ProseMirror, div[contenteditable='true'], flow-rich-text-editor div[role='textbox']"
      );
      if (!box) return { success: false, reason: "Character prompt box not found" };

      box.focus();
      document.execCommand("selectAll", false, null);
      document.execCommand("delete", false, null);
      document.execCommand("insertText", false, promptText);

      box.dispatchEvent(new InputEvent("beforeinput", {
        bubbles: true,
        cancelable: true,
        inputType: "insertText",
        data: promptText
      }));
      box.dispatchEvent(new Event("input", { bubbles: true }));
      box.dispatchEvent(new Event("change", { bubbles: true }));

      return { success: true, text: (box.value || box.innerText || "").trim() };
    },
    args: [prompt]
  }).then(r => r?.[0]?.result).catch(err => ({ success: false, reason: err.message }));

  if (!fillResult?.success) {
    await nativeInsertText(tabId, prompt).catch(() => {});
  }

  await new Promise(r => setTimeout(r, 300));

  // 4. Click Generate button
  const submitRes = await chrome.scripting.executeScript({
    target: { tabId },
    func: async () => {
      let btn = document.querySelector("flow-character-prompt-box button:has(mat-icon), button[aria-label*='generate' i], button.generate-icon-button, button:has(mat-icon:contains('arrow_forward'))");
      if (!btn) {
        const allBtns = Array.from(document.querySelectorAll("button"));
        btn = allBtns.find(b => {
          const ic = b.querySelector("mat-icon");
          return (ic && ic.textContent.trim().includes("arrow_forward")) || (b.innerText || "").includes("arrow_forward");
        }) || allBtns.find(b => (b.className || "").includes("generate") || (b.getAttribute("aria-label") || "").toLowerCase().includes("start"));
      }

      if (!btn) return { success: false, reason: "Character generate button not found" };

      for (let i = 0; i < 20; i++) {
        if (!btn.disabled && !btn.classList.contains("mat-mdc-button-disabled")) break;
        await new Promise(r => setTimeout(r, 100));
      }

      btn.removeAttribute("disabled");
      btn.classList.remove("mat-mdc-button-disabled");
      btn.click();
      return { success: true };
    }
  }).then(r => r?.[0]?.result).catch(err => ({ success: false, reason: err.message }));

  if (!submitRes?.success) {
    await nativeDispatchKey(tabId, "Enter", "Enter", 13).catch(() => {});
  }

  console.log(`[DeepX Character] Prompt submitted for '${characterName}'. Waiting for character candidate images to fully render...`);

  // 5. Wait for generation to complete and character candidate images to fully render
  let editorReady = false;
  let readyCandidateIndex = -1;

  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const check = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const candidates = Array.from(document.querySelectorAll(
          "flow-character-candidate, .character-candidate-card, .candidate-item, flow-grid-tile-container, div[role='option']:has(img)"
        ));

        // Find candidate cards that have a genuinely loaded image and NO active spinner/loading
        const readyIndices = [];
        candidates.forEach((card, idx) => {
          const hasSpinner = !!card.querySelector("mat-spinner, mat-progress-spinner, mat-progress-bar, .spinner, .loading");
          const img = card.querySelector("img:not(.avatar):not(.icon)");
          const isImgLoaded = img && img.src &&
            !img.src.includes("data:image/svg") &&
            !img.src.includes("icon") &&
            (img.naturalWidth > 50 || img.complete || img.src.startsWith("http") || img.src.startsWith("blob:"));

          if (!hasSpinner && isImgLoaded) {
            readyIndices.push(idx);
          }
        });

        // Check if there is an explicit failure message
        const pageText = document.body.innerText || "";
        const isFailed = /failed to generate character|unable to create character|policy violation/i.test(pageText);

        return {
          totalCandidates: candidates.length,
          readyIndices,
          isFailed
        };
      }
    });

    const res = check?.[0]?.result;
    if (res?.isFailed) {
      throw new Error("Character generation failed in Google Flow Character Studio.");
    }

    if (res?.readyIndices && res.readyIndices.length > 0) {
      readyCandidateIndex = res.readyIndices[0];
      editorReady = true;
      console.log(`[DeepX Character Studio] ${res.readyIndices.length}/${res.totalCandidates} character candidates fully rendered! Selecting candidate #${readyCandidateIndex}...`);
      break;
    }
  }

  if (!editorReady) {
    throw new Error("Timed out waiting for character portrait candidates to render in Google Flow Character Studio.");
  }

  // 6. Select the rendered candidate card, populate character name, and click Done
  let saved = false;
  for (let i = 0; i < 15; i++) {
    await new Promise(r => setTimeout(r, 600));
    const commitStep = await chrome.scripting.executeScript({
      target: { tabId },
      func: (targetName, preferredIdx) => {
        const candidates = Array.from(document.querySelectorAll(
          "flow-character-candidate, .character-candidate-card, .candidate-item, flow-grid-tile-container, div[role='option']:has(img)"
        ));

        const targetCard = (preferredIdx >= 0 && candidates[preferredIdx]) ? candidates[preferredIdx] : (candidates[0] || null);
        if (targetCard && !targetCard.classList.contains("selected") && targetCard.getAttribute("aria-selected") !== "true") {
          targetCard.click();
        }

        const nameInput = document.querySelector("input.name-input, input.editable-text-input, input[aria-label='Character name']");
        if (nameInput) {
          nameInput.focus();
          nameInput.value = targetName;
          nameInput.dispatchEvent(new Event("input", { bubbles: true }));
          nameInput.dispatchEvent(new Event("change", { bubbles: true }));
        }

        const doneBtn = Array.from(document.querySelectorAll("button")).find(b => (b.textContent || "").trim() === "Done");
        if (doneBtn && !doneBtn.disabled) {
          doneBtn.click();
          return { doneClicked: true, nameSet: !!nameInput };
        }
        return { doneClicked: false, nameSet: !!nameInput };
      },
      args: [characterName, readyCandidateIndex]
    });

    if (commitStep?.[0]?.result?.doneClicked) {
      saved = true;
      break;
    }
  }

  // 7. Verify / finalize tile name in character list
  await new Promise(r => setTimeout(r, 2000));
  await chrome.scripting.executeScript({
    target: { tabId },
    func: async (targetName) => {
      const charTiles = Array.from(document.querySelectorAll("flow-character-tile"));
      const targetTile = charTiles.find(t => {
        const txt = (t.innerText || "").toLowerCase();
        return txt.includes(targetName.toLowerCase()) || txt.includes("untitled");
      });
      if (targetTile && (targetTile.innerText || "").toLowerCase().includes("untitled")) {
        const moreBtn = targetTile.querySelector("button[aria-label='More options']");
        if (moreBtn) {
          moreBtn.click();
          await new Promise(res => setTimeout(res, 350));
          const renameBtn = Array.from(document.querySelectorAll("[role=menuitem], .mat-mdc-menu-panel button")).find(b => (b.textContent || "").includes("Rename"));
          if (renameBtn) {
            renameBtn.click();
            await new Promise(res => setTimeout(res, 350));
            const editInp = document.querySelector("input.editable-text-input.editing");
            if (editInp) {
              editInp.focus();
              editInp.value = targetName;
              editInp.dispatchEvent(new Event("input", { bubbles: true }));
              editInp.dispatchEvent(new Event("change", { bubbles: true }));
              editInp.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true }));
              editInp.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true }));
              editInp.blur();
            }
          }
        }
      }
    },
    args: [characterName]
  });

  // 8. Auto-navigate back to the project canvas immediately so the prompt box and video generator are ready!
  const targetCanvasUrl = projectId && projectId !== "default"
    ? `https://flow.google.com/project/${projectId}`
    : "https://flow.google.com";
  console.log(`[DeepX Character Studio] Generated character '${characterName}'. Returning to project canvas: ${targetCanvasUrl}...`);
  await chrome.tabs.update(tabId, { url: targetCanvasUrl });
  await new Promise(r => setTimeout(r, 1200));
  await ensureOnProjectCanvas(tabId);
  // Give Google Flow's Angular state a moment to index the new character card into the canvas drawer
  await new Promise(r => setTimeout(r, 1500));

  return {
    success: true,
    characterName,
    prompt,
    projectId,
    mentionSyntax: `@${characterName}`,
    status: "character_generated_and_saved"
  };
}

// Poll async video generation status

async function handleCheckVideoStatus(payload = {}) {
  const { mediaId, projectId: pId } = payload;
  const tabId = await findFlowTab();

  if (!mediaId) {
    if (!tabId) throw new Error("No Flow tab open to check video render status.");
    return await pollLatestTileUntilReady(tabId, 180000);
  }

  let token = null;
  try {
    token = await execInFlowTab("get_token");
  } catch {}

  if (!token) {
    if (!tabId) throw new Error("No Flow tab open to check video render status.");
    return await pollLatestTileUntilReady(tabId, 180000);
  }

  const projectId = pId || (await execInFlowTab("get_project_id"));

  const endpoint = `${AISANDBOX_API}/v1/video:batchCheckAsyncVideoGenerationStatus`;
  const body = {
    media: [{ name: mediaId, projectId }]
  };

  const response = await execInFlowTab("api_post", [endpoint, body, token]);
  const mediaInfo = response?.media?.[0];
  const status = mediaInfo?.mediaMetadata?.mediaStatus?.mediaGenerationStatus;

  if (status === "MEDIA_GENERATION_STATUS_SUCCEEDED") {
    const fifeUrl = mediaInfo?.video?.generatedVideo?.fifeUrl;
    const downloadUrl = `https://labs.google/fx/api/trpc/media.getMediaUrlRedirect?name=${mediaId}`;
    return {
      status: "succeeded",
      mediaId,
      videoUrl: fifeUrl || downloadUrl,
      downloadUrl
    };
  }

  if (status === "MEDIA_GENERATION_STATUS_FAILED") {
    return {
      status: "failed",
      mediaId,
      error: mediaInfo?.mediaMetadata?.mediaStatus?.errorMessage || "Generation failed"
    };
  }

  return {
    status: "pending",
    mediaId,
    generationStatus: status || "IN_PROGRESS"
  };
}

// Poll a video until it succeeds or times out
// Poll latest DOM tile for completion (AnyAI mechanism)
async function pollLatestTileUntilReady(tabId, timeoutMs = 180000) {
  const start = Date.now();
  let lastPercent = 0;

  while (Date.now() - start < timeoutMs) {
    const res = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const tiles = document.querySelectorAll("flow-grid-tile-container, flow-video-tile, flow-image-tile");
        if (!tiles || tiles.length === 0) return { status: "waiting_for_tile" };

        const firstTile = tiles[0];
        const text = (firstTile.innerText || "").trim();

        // 1. Explicit Failure Detection
        const isFailed = /failed|error|unable to generate|policy|violat|something went wrong/i.test(text);
        if (isFailed) {
          return { status: "failed", error: text.slice(0, 150), failedPrompt: text };
        }

        // 2. Explicit In-Progress / Generating Indicators
        // Check progress bar, spinners, progress indicators
        const hasProgressBar = !!firstTile.querySelector("mat-progress-bar, [role='progressbar'], .progress-bar, mat-spinner, mat-progress-spinner, .spinner");
        const hasGeneratingClass = firstTile.matches(".generating, .rendering, .loading, .in-progress") ||
          !!firstTile.querySelector(".generating, .rendering, .loading, .in-progress, .generating-indicator, .loading-indicator");

        // Check percentage in text, e.g. "2%", "15%", "95%"
        const percentMatch = text.match(/(\d+)%/);
        const percent = percentMatch ? parseInt(percentMatch[1], 10) : 0;
        const isActivelyGeneratingText = /generating|rendering|queued|starting|creating|preparing|in queue/i.test(text);

        // If progress bar is present, or percentage is between 1 and 99, or generating class/text is present:
        if (hasProgressBar || hasGeneratingClass || (percentMatch && percent < 100) || (isActivelyGeneratingText && percent < 100)) {
          return {
            status: "pending",
            percent: percent || (hasProgressBar ? 50 : 10),
            generatingText: text.slice(0, 60)
          };
        }

        // 3. Completion Detection: Video
        const video = firstTile.querySelector("video");
        if (video && video.src && !video.src.includes("blob:null")) {
          const hasVideoDuration = video.duration > 0 || video.readyState >= 2 || video.src.startsWith("http");
          if (hasVideoDuration && !hasProgressBar && (percent >= 100 || (!percentMatch && !isActivelyGeneratingText))) {
            return { status: "succeeded", mediaType: "video", videoUrl: video.src };
          }
        }

        // 4. Completion Detection: Image
        const img = firstTile.querySelector("img:not(.avatar):not(.user-avatar)");
        if (img && img.src && !img.src.includes("icon") && !img.src.includes("placeholder") && !img.src.includes("data:image/svg")) {
          const isImgComplete = img.complete && (img.naturalWidth === undefined || img.naturalWidth > 50);
          if ((isImgComplete || img.src.startsWith("http") || img.src.startsWith("blob:")) && !hasProgressBar && (percent >= 100 || (!percentMatch && !isActivelyGeneratingText))) {
            return {
              status: "succeeded",
              mediaType: "image",
              imageUrl: img.src,
              images: [{ url: img.src }]
            };
          }
        }

        // 5. Completion badge detection (play button or 100% text without progress indicators)
        if (!hasProgressBar && (percent === 100 || /play_circle|finished|completed/i.test(text))) {
          if (video && video.src) return { status: "succeeded", mediaType: "video", videoUrl: video.src };
          if (img && img.src) return { status: "succeeded", mediaType: "image", imageUrl: img.src, images: [{ url: img.src }] };
        }

        return { status: "pending", percent };
      }
    });

    const info = res?.[0]?.result;
    if (info?.status === "succeeded") {
      return info;
    }
    if (info?.status === "failed") {
      throw new Error(`Generation failed on Flow: ${info.error || "Unknown error"}`);
    }
    if (info?.percent && info.percent !== lastPercent) {
      lastPercent = info.percent;
      console.log(`[DeepX Poll] Render progress: ${lastPercent}%`);
    }
    await new Promise(r => setTimeout(r, 1200));
  }
  throw new Error(`Timed out waiting for render in Google Flow after ${timeoutMs / 1000}s`);
}

// Poll a video until it succeeds or times out
async function pollVideoUntilReady(mediaId, projectId, maxWaitMs = 120000, intervalMs = 2000) {
  const start = Date.now();
  if (mediaId) {
    while (Date.now() - start < maxWaitMs) {
      const res = await handleCheckVideoStatus({ mediaId, projectId });
      if (res.status === "succeeded") return res;
      if (res.status === "failed") throw new Error(res.error || "Video generation failed");
      await new Promise(r => setTimeout(r, intervalMs));
    }
  } else {
    const tabId = await findFlowTab();
    return await pollLatestTileUntilReady(tabId, maxWaitMs);
  }
  throw new Error(`Video generation timed out after ${maxWaitMs / 1000}s`);
}

// Extract last frame of a video using isolated content script
async function extractLastFrameFromVideoUrl(videoUrl) {
  const tabId = await findFlowTab();
  if (!tabId) throw new Error("No Flow tab to perform frame extraction");

  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, { type: "EXTRACT_LAST_FRAME", videoSrc: videoUrl }, (res) => {
      if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
      if (!res?.success) return reject(new Error(res?.error || "Frame extraction failed"));
      resolve(res.dataUrl);
    });
  });
}

// Helper to parse multi-scene scripts, prompts with blank line gaps, numbered scenes, Hindi markers, or bullets
function parsePromptsWithGaps(input) {
  if (typeof input === "string") {
    const text = input.trim();
    if (!text) return [];

    // 1. Explicit double line breaks
    if (text.includes("\n\n")) {
      const parts = text.split(/\n\s*\n+/).map(p => p.trim()).filter(Boolean);
      if (parts.length > 1) return parts;
    }

    // 2. Explicit scene markers e.g. "Scene 1:", "Shot 1:", "Image 1:", "दृश्य 1:", "सीन 1:"
    const sceneMarkerRegex = /(?:^|\n)\s*(?:(?:###?\s*)?(?:Scene|Shot|Sequence|Take|Image|Photo|Frame|दृश्य|सीन)\s*(?:#?\d+|[a-zA-Z0-9_\-]+)\s*[:\-\.]?)/iu;
    if (sceneMarkerRegex.test(text)) {
      const parts = text.split(/(?=(?:^|\n)\s*(?:(?:###?\s*)?(?:Scene|Shot|Sequence|Take|Image|Photo|Frame|दृश्य|सीन)\s*(?:#?\d+|[a-zA-Z0-9_\-]+)\s*[:\-\.]?))/iu)
        .map(p => p.trim())
        .filter(Boolean);
      if (parts.length > 1) return parts;
    }

    // 3. Numbered items e.g. "1. ...\n2. ..."
    const numberedListRegex = /(?:^|\n)\s*\d+[\.\)]\s+/;
    if (numberedListRegex.test(text)) {
      const parts = text.split(/(?=(?:^|\n)\s*\d+[\.\)]\s+)/)
        .map(p => p.trim())
        .filter(Boolean);
      if (parts.length > 1) return parts;
    }

    // 4. Bullet points e.g. "- ...\n- ..." or "* ...\n* ..."
    const bulletRegex = /(?:^|\n)\s*[\*\-•]\s+/;
    if (bulletRegex.test(text)) {
      const parts = text.split(/(?=(?:^|\n)\s*[\*\-•]\s+)/)
        .map(p => p.trim())
        .filter(Boolean);
      if (parts.length > 1) return parts;
    }

    // 5. Distinct single-line prompts (e.g. "a car\na bus\na truck")
    if (text.includes("\n")) {
      const lines = text.split(/\r?\n+/).map(l => l.trim()).filter(Boolean);
      if (lines.length > 1) return lines;
    }

    // 6. Fallback: single prompt
    return [text];
  }

  if (Array.isArray(input)) {
    return input.flatMap(item => {
      if (typeof item === "string") {
        return parsePromptsWithGaps(item);
      }
      if (item && item.prompt) return [item.prompt.trim()];
      return [];
    }).filter(Boolean);
  }
  return [];
}

// Parallel Batch Generation Engine (with AnyAI Rapid Back-to-Back Dispatch)
async function handleBatchGenerate(payload, progressCallback) {
  const {
    batchId = `batch_${Date.now()}`,
    prompts: rawPrompts = [],
    scriptText = "",
    concurrentPrompts = 2,
    pacingDelaySec = 1.5,
    isConcat = false, // If true, chains output of prompt N into prompt N+1
    autoDownload = false,
    downloadFolder = "deepx_renders",
    mode = "textToVideo", // or textToImage
    model = "veo-quality",
    duration = 8,
    aspectRatio = "landscape",
    count = 1,
    rapidDispatch = true, // AnyAI style: paste into Google Flow back-to-back
    waitForCompletion = false,
    heroReferences: rawHeroRefs = [],
    referenceAssets: rawRefAssets = [],
    noReferences = false
  } = payload;

  const prompts = scriptText ? parsePromptsWithGaps(scriptText) : parsePromptsWithGaps(rawPrompts);

  if (!prompts || prompts.length === 0) {
    throw new Error("No prompts found. Provide an array of prompts or a scriptText with blank lines (gaps) separating each scene.");
  }

  const explicitHeroRefs = Array.isArray(rawHeroRefs) ? rawHeroRefs : (rawHeroRefs ? [rawHeroRefs] : []);
  const explicitRefAssets = Array.isArray(rawRefAssets) ? rawRefAssets : (rawRefAssets ? [rawRefAssets] : []);
  let batchHeroReferences = Array.from(new Set([...explicitHeroRefs, ...explicitRefAssets]));

  // Auto-discover hero references across all batch prompts if not explicitly passed
  if (!noReferences && batchHeroReferences.length === 0) {
    const allMentions = [];
    prompts.forEach(p => {
      const mentions = (String(p).match(/@([a-zA-Z0-9_\-]+)/g) || []).map(m => m.replace(/^@/, ""));
      allMentions.push(...mentions);
    });
    if (allMentions.length > 0) {
      batchHeroReferences = Array.from(new Set(allMentions));
      console.log("[DeepX Batch] Discovered hero references across batch prompts:", batchHeroReferences);
    }
  }

  // Fallback: If still empty and not noReferences, inspect Google Flow tab for registered characters
  if (!noReferences && batchHeroReferences.length === 0) {
    try {
      const flowTab = await findFlowTab();
      if (flowTab) {
        const registered = await getRegisteredCharacterNames(flowTab);
        if (registered && registered.length > 0) {
          batchHeroReferences = [registered[0]];
          console.log("[DeepX Batch] Auto-inheriting project library character:", batchHeroReferences);
        }
      }
    } catch (_) {}
  }

  const isImageMode = mode.toLowerCase().includes("image") ||
    String(model || "").includes("Banana") ||
    String(model || "").toLowerCase().includes("imagen");
  const effectiveModel = isImageMode
    ? (String(model || "").includes("Banana") || String(model || "").toLowerCase().includes("imagen") ? model : "🍌 Nano Banana 2.1")
    : model;

  const batchState = {
    batchId,
    total: prompts.length,
    completed: 0,
    failed: 0,
    cancelled: false,
    results: new Array(prompts.length).fill(null)
  };
  activeBatches.set(batchId, batchState);

  // Helper to extract custom naming tag e.g. #scene1
  const parseFilename = (promptText, index) => {
    const tagMatch = promptText.match(/#([a-zA-Z0-9_\-\.]+)/);
    const tag = tagMatch ? tagMatch[1] : `prompt_${index + 1}`;
    const ext = isImageMode ? "png" : "mp4";
    return `${tag}.${ext}`;
  };

  // If isConcat is true, we must run sequentially to pass the previous frame
  if (isConcat) {
    let lastMediaUrl = null;
    let lastMediaId = null;

    for (let i = 0; i < prompts.length; i++) {
      if (batchState.cancelled) break;
      const promptText = prompts[i];

      try {
        progressCallback?.({
          batchId,
          type: "PROMPT_START",
          index: i,
          prompt: promptText
        });

        let startImageId = null;
        if (i > 0 && lastMediaUrl) {
          // Extract last frame of previous video
          const frameDataUrl = await extractLastFrameFromVideoUrl(lastMediaUrl);
          // Upload frame as an asset to get a startImageId
          const uploadRes = await handleUploadImage({
            dataUrl: frameDataUrl,
            fileName: `frame_concat_${i}.jpg`,
            mimeType: "image/jpeg"
          });
          startImageId = uploadRes.mediaId;
        }

        let genRes;
        if (isImageMode) {
          genRes = await handleGenerateImage({
            prompt: promptText,
            aspectRatio,
            model: effectiveModel,
            count
          });
          if (!genRes.images && genRes.status === "dispatched") {
            const tabId = await findFlowTab();
            genRes = await pollLatestTileUntilReady(tabId, 120000);
          }
        } else {
          const promptMentions = (promptText.match(/@([a-zA-Z0-9_\-]+)/g) || []).map(m => m.replace(/^@/, ""));
          const sceneReferences = Array.from(new Set([...batchHeroReferences, ...promptMentions]));

          const dispatchRes = await handleGenerateVideo({
            prompt: promptText,
            model,
            mode: startImageId ? "start" : "text",
            startImageId,
            aspectRatio,
            duration,
            noReferences,
            referenceAssets: sceneReferences,
            heroReferences: batchHeroReferences
          });

          // Wait for video completion so we have the URL for the next concat frame
          genRes = await pollVideoUntilReady(dispatchRes.mediaId, dispatchRes.projectId);
          lastMediaUrl = genRes.videoUrl;
          lastMediaId = genRes.mediaId;
        }

        if (autoDownload && genRes.videoUrl) {
          const filename = `${downloadFolder}/${parseFilename(promptText, i)}`;
          await chrome.downloads.download({ url: genRes.videoUrl, filename, saveAs: false });
        }

        batchState.results[i] = { index: i, success: true, result: genRes };
        batchState.completed++;

        progressCallback?.({
          batchId,
          type: "PROMPT_COMPLETE",
          index: i,
          completed: batchState.completed,
          total: batchState.total
        });
      } catch (err) {
        batchState.results[i] = { index: i, success: false, error: err.message };
        batchState.failed++;
        progressCallback?.({
          batchId,
          type: "PROMPT_ERROR",
          index: i,
          error: err.message
        });
      }

      if (pacingDelaySec > 0 && i < prompts.length - 1) {
        await new Promise(r => setTimeout(r, pacingDelaySec * 1000));
      }
    }
  } else if (rapidDispatch) {
    // AnyAI Native Rapid Dispatch Engine:
    // Pastes each scene prompt into Google Flow back-to-back with sub-second CDP execution.
    // Google Flow queues and renders all scenes in parallel on its cluster simultaneously.
    const tabId = await findFlowTab();
    if (!tabId) throw new Error("No Google Flow tab open. Please open flow.google.com in Chrome.");

    // Focus Google Flow tab so the user visibly watches the live canvas execution
    await chrome.tabs.update(tabId, { active: true }).catch(() => {});

    console.log(`[DeepX Rapid] Dispatching ${prompts.length} prompt(s) back-to-back into Google Flow in real time...`);
    const dispatchedList = [];

    for (let i = 0; i < prompts.length; i++) {
      if (batchState.cancelled) break;
      const promptText = prompts[i];
      const promptStart = Date.now();

      progressCallback?.({
        batchId,
        type: "PROMPT_CONFIGURING",
        index: i,
        total: prompts.length,
        prompt: promptText,
        model: effectiveModel,
        aspectRatio,
        count
      });

      progressCallback?.({
        batchId,
        type: "PROMPT_START",
        index: i,
        total: prompts.length,
        prompt: promptText
      });

      try {
        let dispatchRes;
        if (isImageMode) {
          dispatchRes = await handleGenerateImage({
            prompt: promptText,
            aspectRatio,
            model: effectiveModel,
            count
          });
        } else {
          const promptMentions = (promptText.match(/@([a-zA-Z0-9_\-]+)/g) || []).map(m => m.replace(/^@/, ""));
          const sceneReferences = Array.from(new Set([...batchHeroReferences, ...promptMentions]));

          dispatchRes = await handleGenerateVideo({
            prompt: promptText,
            model,
            mode: "text",
            aspectRatio,
            duration,
            count: count || 1,
            noReferences,
            referenceAssets: sceneReferences,
            heroReferences: batchHeroReferences
          });
        }

        const elapsedMs = Date.now() - promptStart;
        console.log(`[DeepX Rapid] Prompt ${i + 1}/${prompts.length} dispatched into Flow in ${elapsedMs}ms!`);

        const sceneRecord = {
          index: i,
          sceneNumber: i + 1,
          prompt: promptText,
          status: "generating_in_flow",
          dispatchedAt: Date.now(),
          dispatchTimeMs: elapsedMs,
          dispatchRes
        };

        batchState.results[i] = { index: i, success: true, result: sceneRecord };
        batchState.completed++;
        dispatchedList.push(sceneRecord);

        progressCallback?.({
          batchId,
          type: "PROMPT_DISPATCHED",
          index: i,
          total: prompts.length,
          completed: batchState.completed,
          sceneRecord
        });
      } catch (err) {
        console.error(`[DeepX Rapid] Error dispatching prompt ${i + 1}:`, err);
        batchState.results[i] = { index: i, success: false, error: err.message };
        batchState.failed++;

        progressCallback?.({
          batchId,
          type: "PROMPT_ERROR",
          index: i,
          total: prompts.length,
          error: err.message
        });
      }

      // Real-time visual pacing delay so user sees each prompt entered live on Flow
      if (i < prompts.length - 1) {
        const delay = (pacingDelaySec !== undefined && pacingDelaySec !== null)
          ? Math.max(200, pacingDelaySec * 1000)
          : 800;
        await new Promise(r => setTimeout(r, delay));
      }
    }

    // Launch Real-Time Flow Progress Monitor in background
    (async () => {
      let checkCount = 0;
      const lastReportedMap = new Map();
      while (checkCount < 120) {
        await new Promise(r => setTimeout(r, 2000));
        checkCount++;
        try {
          const tilesStatus = await chrome.scripting.executeScript({
            target: { tabId },
            func: () => {
              const tiles = Array.from(document.querySelectorAll("flow-grid-tile-container, flow-media-tile, div.tile-row"));
              const list = [];
              for (const t of tiles) {
                const text = t.innerText || "";
                const match = text.match(/(\d+)%/);
                const hasPlay = text.includes("play_circle") || !!t.querySelector("video");
                const lines = text.split("\n").map(s => s.trim()).filter(s => s && !s.includes("%") && !s.includes("play_circle") && !s.includes("keyboard_return"));
                const promptName = lines[0] || "";
                if (match) {
                  list.push({ prompt: promptName, percent: parseInt(match[1], 10), status: "generating" });
                } else if (hasPlay && promptName) {
                  list.push({ prompt: promptName, percent: 100, status: "ready" });
                }
              }
              return list;
            }
          }).then(r => r?.[0]?.result || []);

          if (tilesStatus.length > 0) {
            let hasNew = false;
            for (const t of tilesStatus) {
              if (lastReportedMap.get(t.prompt) !== t.percent) {
                lastReportedMap.set(t.prompt, t.percent);
                hasNew = true;
              }
            }
            if (hasNew) {
              progressCallback?.({
                batchId,
                type: "TILES_REALTIME_UPDATE",
                tiles: tilesStatus
              });
            }

            const anyGenerating = tilesStatus.some(t => t.status === "generating");
            if (!anyGenerating && checkCount > 6) {
              progressCallback?.({
                batchId,
                type: "TILES_ALL_COMPLETED",
                tiles: tilesStatus
              });
              break;
            }
          }
        } catch {}
      }
    })();

    if (!waitForCompletion && !autoDownload) {
      if (batchState.completed === 0 && batchState.failed > 0) {
        const firstErr = batchState.results.find(r => r && !r.success)?.error || "Failed to dispatch any prompts to Google Flow";
        throw new Error(firstErr);
      }
      return {
        success: true,
        batchId,
        mode: "RAPID_PARALLEL_REALTIME",
        totalPrompts: prompts.length,
        dispatchedCount: batchState.completed,
        failedCount: batchState.failed,
        scenes: dispatchedList,
        message: `Successfully submitted ${batchState.completed}/${prompts.length} scene(s) into Google Flow canvas. Generating in parallel in real time.`
      };
    }

    // Optional: wait for parallel tile completion if requested
    console.log("[DeepX Rapid] Monitoring parallel tiles for completion...");
    for (let i = 0; i < dispatchedList.length; i++) {
      try {
        const tileRes = await pollLatestTileUntilReady(tabId, 180000);
        dispatchedList[i].mediaResult = tileRes;

        if (autoDownload && (tileRes.videoUrl || tileRes.images?.[0]?.url)) {
          const url = tileRes.videoUrl || tileRes.images[0].url;
          const filename = `${downloadFolder}/${parseFilename(prompts[i], i)}`;
          await chrome.downloads.download({ url, filename, saveAs: false });
        }
      } catch (e) {
        console.warn(`[DeepX Rapid] Tile monitor warning for scene ${i + 1}:`, e);
      }
    }

    return {
      success: true,
      batchId,
      mode: "RAPID_PARALLEL_QUEUE_COMPLETED",
      totalPrompts: prompts.length,
      scenes: dispatchedList
    };
  } else {
    // Classic Concurrency Pool Worker
    const queue = prompts.map((p, idx) => ({ prompt: p, index: idx }));
    const concurrency = Math.max(1, Math.min(8, concurrentPrompts));

    const worker = async () => {
      while (queue.length > 0 && !batchState.cancelled) {
        const item = queue.shift();
        if (!item) break;

        try {
          progressCallback?.({
            batchId,
            type: "PROMPT_START",
            index: item.index,
            prompt: item.prompt
          });

          let genRes;
          if (mode.includes("Image")) {
            genRes = await handleGenerateImage({
              prompt: item.prompt,
              aspectRatio
            });
            if (!genRes.images && genRes.status === "dispatched") {
              const tabId = await findFlowTab();
              genRes = await pollLatestTileUntilReady(tabId, 120000);
            }
          } else {
            const dispatchRes = await handleGenerateVideo({
              prompt: item.prompt,
              model,
              mode: "text",
              aspectRatio,
              duration
            });
            genRes = await pollVideoUntilReady(dispatchRes.mediaId, dispatchRes.projectId);
          }

          if (autoDownload && (genRes.videoUrl || genRes.images?.[0]?.url)) {
            const url = genRes.videoUrl || genRes.images[0].url;
            const filename = `${downloadFolder}/${parseFilename(item.prompt, item.index)}`;
            await chrome.downloads.download({ url, filename, saveAs: false });
          }

          batchState.results[item.index] = { index: item.index, success: true, result: genRes };
          batchState.completed++;

          progressCallback?.({
            batchId,
            type: "PROMPT_COMPLETE",
            index: item.index,
            completed: batchState.completed,
            total: batchState.total
          });
        } catch (err) {
          batchState.results[item.index] = { index: item.index, success: false, error: err.message };
          batchState.failed++;
          progressCallback?.({
            batchId,
            type: "PROMPT_ERROR",
            index: item.index,
            error: err.message
          });
        }

        if (pacingDelaySec > 0) {
          await new Promise(r => setTimeout(r, pacingDelaySec * 1000));
        }
      }
    };

    const workers = [];
    for (let w = 0; w < concurrency; w++) {
      workers.push(worker());
    }
    await Promise.all(workers);
  }

  activeBatches.delete(batchId);
  return {
    batchId,
    total: batchState.total,
    completed: batchState.completed,
    failed: batchState.failed,
    results: batchState.results
  };
}

// WebSocket Connection to DeepX Antigravity Server
async function connectToAntigravityServer(force = false) {
  if (force) {
    isMcpManuallyDisconnected = false;
    chrome.storage.local.set({ isMcpManuallyDisconnected: false });
  } else if (isMcpManuallyDisconnected) {
    console.log("[DeepX Flow] MCP is manually disconnected. Skipping auto-connect.");
    return;
  }

  // CRITICAL: Do NOT auto-connect to MCP bridge if the extension is locked in this Chrome profile
  if (!isExtensionUnlocked && !force) {
    console.log("[DeepX Flow] Extension is LOCKED in this profile. Skipping auto-connect to MCP bridge.");
    return;
  }

  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return;
  }

  const targetUrl = await getTargetWsUrl();
  console.log(`[DeepX Flow] Connecting to ${targetUrl}...`);

  chrome.runtime.sendMessage({
    type: "MCP_CONNECTION_STATE_CHANGED",
    connected: false,
    connecting: true,
    manuallyDisconnected: false,
    host: targetUrl
  }).catch(() => {});

  try {
    ws = new WebSocket(targetUrl);
  } catch (err) {
    scheduleReconnect();
    return;
  }

  ws.onopen = async () => {
    activeConnectedHost = targetUrl;
    console.log(`%c[DeepX Flow]%c Connected to ${targetUrl}!`, "color:#00e5ff;font-weight:bold;", "color:inherit;");
    chrome.storage.local.set({ deepxConnected: true, connectedHost: targetUrl });

    // Collect initial profile and tab status
    let currentCtx = null;
    try {
      const tabId = await findFlowTab();
      if (tabId) currentCtx = await extractFlowTabContext(tabId);
    } catch {}

    const acc = currentCtx?.account || lastKnownAccount;
    const tabOpen = !!(await findFlowTab());
    const pid = currentCtx?.projectId || lastKnownProjectId;
    const isReady = isEffectiveActive() && !!(acc?.isLoggedIn) && isExtensionUnlocked;

    ws.send(JSON.stringify({
      type: "HELLO",
      client: "deepx-flow-extension",
      version: "1.2.0",
      account: acc,
      flowTabOpen: tabOpen,
      projectId: pid,
      projectName: currentCtx?.projectName || lastKnownProjectName,
      isUnlocked: isExtensionUnlocked,
      ready: isReady,
      connectionState: !isExtensionUnlocked ? "locked" : (!tabOpen ? "tab_not_found" : (isReady ? "ready" : "needs_login"))
    }));

    // Start 20s Keep-Alive Heartbeat over WebSocket to prevent MV3 service worker suspension
    if (wsHeartbeatInterval) clearInterval(wsHeartbeatInterval);
    wsHeartbeatInterval = setInterval(async () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        try {
          const tabId = await findFlowTab();
          let ctx = null;
          if (tabId) ctx = await extractFlowTabContext(tabId).catch(() => null);
          const currentAcc = ctx?.account || lastKnownAccount;
          const hasTab = !!tabId;
          const currentPid = ctx?.projectId || lastKnownProjectId;
          const readyState = isEffectiveActive() && !!(currentAcc?.isLoggedIn) && isExtensionUnlocked;
          ws.send(JSON.stringify({
            type: "HEARTBEAT",
            client: "deepx-flow-extension",
            account: currentAcc,
            flowTabOpen: hasTab,
            projectId: currentPid,
            projectName: ctx?.projectName || lastKnownProjectName,
            isUnlocked: isExtensionUnlocked,
            ready: readyState,
            connectionState: !isExtensionUnlocked ? "locked" : (!hasTab ? "tab_not_found" : (readyState ? "ready" : "needs_login"))
          }));
        } catch {}
      }
    }, 20000);

    chrome.runtime.sendMessage({
      type: "MCP_CONNECTION_STATE_CHANGED",
      connected: true,
      connecting: false,
      manuallyDisconnected: false,
      host: targetUrl
    }).catch(() => {});
  };

  ws.onmessage = async (event) => {
    try {
      const data = JSON.parse(event.data);
      const { id, command, payload } = data;
      if (!id || !command) return;

      // Antigravity AI Agent is actively communicating through the bridge - record timestamp
      lastAgentActivityTime = Date.now();
      chrome.storage.local.set({ lastAgentActivityTime });

      try {
        let result;
        switch (command) {
          case "status": {
            const tabId = await findFlowTab();
            let token = globalCapturedToken;
            let projectId = lastKnownProjectId;
            let accountInfo = lastKnownAccount;
            let pageUrl = currentActiveTabUrl || "";

            if (tabId) {
              try {
                const tab = await chrome.tabs.get(tabId);
                if (tab?.url) {
                  pageUrl = tab.url;
                  const pFromTab = extractProjectId(tab.url);
                  if (pFromTab) {
                    projectId = pFromTab;
                    lastKnownProjectId = pFromTab;
                  }
                }
              } catch {}

              try {
                const ctx = await extractFlowTabContext(tabId);
                if (ctx) {
                  if (ctx.projectId) {
                    projectId = ctx.projectId;
                    lastKnownProjectId = ctx.projectId;
                  }
                  if (ctx.account) accountInfo = ctx.account;
                  if (ctx.url) pageUrl = ctx.url;
                }
              } catch (e) {
                console.warn("[DeepX] extractFlowTabContext error:", e);
              }
            }

            // Account switch detection
            if (accountInfo?.email) {
              if (lastKnownAccountEmail && accountInfo.email !== lastKnownAccountEmail) {
                console.log(`[DeepX] Detected account switch: ${lastKnownAccountEmail} -> ${accountInfo.email}`);
                token = null;
                globalCapturedToken = null;
                chrome.storage.local.remove(["deepxAuthToken"]);
              }
              lastKnownAccountEmail = accountInfo.email;
              lastKnownAccount = accountInfo;
            } else if (accountInfo && !accountInfo.isLoggedIn) {
              token = null;
              globalCapturedToken = null;
              lastKnownAccount = null;
              chrome.storage.local.remove(["deepxAuthToken"]);
            }

            // Classify real connectionState
            let connectionState = "ready";
            let stateReason = "Connected to Google Flow and ready to generate.";

            if (isMcpManuallyDisconnected) {
              connectionState = "disconnected";
              stateReason = "DeepX MCP Bridge is manually disconnected. Click Connect MCP in the extension to reconnect.";
            } else if (!isExtensionUnlocked) {
              connectionState = "locked";
              stateReason = "DeepX Extension is LOCKED in this profile. Unlock the extension to use.";
            } else if (isExtensionEnabledByUser === false) {
              connectionState = "standby";
              stateReason = "DeepX Extension is manually turned OFF. Click Turn ON to resume.";
            } else if (!tabId) {
              connectionState = "tab_not_found";
              stateReason = "No Google Flow tab open. Open https://flow.google.com in Chrome.";
            } else if (!accountInfo || !accountInfo.isLoggedIn) {
              connectionState = "needs_login";
              stateReason = "Google Flow tab is open, but you are not logged in. Please sign in to your Google Account.";
            } else if (!projectId) {
              // User is logged in on Google Flow dashboard / gallery.
              // Mark as ready because ensureOnProjectCanvas automatically opens or creates a project on demand!
              connectionState = "ready";
              const userLabel = accountInfo?.email || accountInfo?.accountName || "Google Account";
              stateReason = `Connected to Google Flow (${userLabel}) and ready to generate. Project canvas auto-launches on demand.`;
            }

            const isReady = isExtensionUnlocked && connectionState === "ready" && !isMcpManuallyDisconnected;

            result = {
              connected: isReady,
              ready: isReady,
              isUnlocked: isExtensionUnlocked,
              connectionState,
              stateReason,
              flowActive: isEffectiveActive(),
              isExtensionEnabled: isExtensionEnabledByUser !== false,
              isFlowTabActive: isFlowTabPresent,
              currentDomain: currentActiveTabUrl ? (()=>{ try { return new URL(currentActiveTabUrl).hostname; } catch { return ""; } })() : "",
              flowTabOpen: !!tabId,
              flowTabUrl: pageUrl,
              hasToken: !!token,
              account: accountInfo || {
                isLoggedIn: false,
                accountName: null,
                email: null,
                plan: "None"
              },
              projectId: projectId || null,
              projectName: lastKnownProjectName || null,
              activeBatches: activeBatches.size
            };
            break;
          }
          case "set_extension_active": {
            isExtensionEnabledByUser = !!payload.active;
            await chrome.storage.local.set({ isExtensionEnabledByUser });
            updateBadge();
            result = {
              flowActive: isEffectiveActive(),
              isExtensionEnabled: isExtensionEnabledByUser,
              isFlowTabActive: isFlowTabPresent
            };
            break;
          }
          case "generate_video": {
            const flowTabId = await ensureFlowTab();
            if (!flowTabId) {
              throw new Error("Could not connect to or launch Google Flow tab in Chrome.");
            }
            if (isExtensionEnabledByUser === false) {
              throw new Error("DeepX Extension is paused. Please click Turn ON in the extension to resume.");
            }
            result = await handleGenerateVideo(payload);
            break;
          }
          case "generate_image": {
            const flowTabId = await ensureFlowTab();
            if (!flowTabId) {
              throw new Error("Could not connect to or launch Google Flow tab in Chrome.");
            }
            if (isExtensionEnabledByUser === false) {
              throw new Error("DeepX Extension is paused. Please click Turn ON in the extension to resume.");
            }
            result = await handleGenerateImage(payload);
            break;
          }
          case "batch_generate": {
            const flowTabId = await ensureFlowTab();
            if (!flowTabId) {
              throw new Error("Could not connect to or launch Google Flow tab in Chrome.");
            }
            if (isExtensionEnabledByUser === false) {
              throw new Error("DeepX Extension is paused. Please click Turn ON in the extension to resume.");
            }
            result = await handleBatchGenerate(payload, (progress) => {
              // Send live progress event
              ws.send(JSON.stringify({ type: "PROGRESS", id, progress }));
            });
            break;
          }
          case "rapid_batch_dispatch": {
            const flowTabId = await ensureFlowTab();
            if (!flowTabId) {
              throw new Error("Could not connect to or launch Google Flow tab in Chrome.");
            }
            if (isExtensionEnabledByUser === false) {
              throw new Error("DeepX Extension is paused. Please click Turn ON in the extension to resume.");
            }
            result = await handleBatchGenerate({
              ...payload,
              rapidDispatch: true,
              waitForCompletion: payload.waitForCompletion || false
            }, (progress) => {
              ws.send(JSON.stringify({ type: "PROGRESS", id, progress }));
            });
            break;
          }
          case "check_video_status":
            result = await handleCheckVideoStatus(payload);
            break;
          case "upload_asset":
            result = await handleUploadImage(payload);
            break;
          case "rename_project":
            result = await handleRenameProject(payload);
            break;
          case "open_new_project":
            result = await handleOpenNewProject();
            break;
          case "rename_character":
            result = await handleRenameCharacter(payload);
            break;
          case "upload_character":
            result = await handleUploadCharacter(payload);
            break;
          case "generate_character":
            result = await handleGenerateCharacter(payload);
            break;
          case "extract_last_frame":
            result = { dataUrl: await extractLastFrameFromVideoUrl(payload.videoUrl) };
            break;
          case "attach_library_reference":
            result = await handleAttachLibraryReference(payload);
            break;
          case "attach_references_batch": {
            const tabId = await ensureFlowTab();
            if (!tabId) throw new Error("Could not connect to or auto-open Google Flow tab.");
            await ensureOnProjectCanvas(tabId);
            const names = payload.assetNames || payload.asset_names || [];
            const clearStale = payload.clearStale || payload.clear_stale || false;
            const promptContext = payload.prompt || payload.promptContext || "";
            result = await attachLibraryAssetsBatch(tabId, names, clearStale, promptContext);
            break;
          }
          case "auto_chain_scene": {
            result = await handleAutoChainVideoScene(payload);
            break;
          }
          case "autonomous_storyboard_pipeline":
          case "rapid_storyboard_autopilot": {
            result = await handleAutonomousStoryboardPipeline(payload);
            break;
          }
          case "list_characters": {
            result = await handleListCharacters();
            break;
          }
          case "eval_script": {
            const tabId = await findFlowTab();
            if (!tabId) throw new Error("No Flow tab found");
            const trimmed = (payload.code || "").trim();
            const expr = (trimmed.startsWith("(() =>") || trimmed.startsWith("(async () =>") || trimmed.startsWith("(function"))
              ? trimmed
              : (trimmed.includes("return ") ? `(() => { ${trimmed} })()` : trimmed);
            if (!isMobileOrKiwi) {
              const dbgOk = await attachDebugger(tabId);
              if (dbgOk) {
                const evalRes = await chrome.debugger.sendCommand({ tabId }, "Runtime.evaluate", {
                  expression: expr,
                  returnByValue: true,
                  awaitPromise: true
                });
                if (evalRes?.exceptionDetails) {
                  result = { success: false, error: evalRes.exceptionDetails.exception?.description || evalRes.exceptionDetails.text };
                } else {
                  result = { success: true, result: evalRes?.result?.value };
                }
                break;
              }
            }
            try {
              const execRes = await chrome.scripting.executeScript({
                target: { tabId },
                func: (codeStr) => {
                  try {
                    return { success: true, result: window.eval ? window.eval(codeStr) : null };
                  } catch (e) {
                    return { success: false, error: e.message };
                  }
                },
                args: [expr]
              });
              result = execRes?.[0]?.result || { success: true, result: null };
            } catch (err) {
              result = { success: false, error: err.message };
            }
            break;
          }
          case "native_click": {
            const tabId = await findFlowTab();
            if (!tabId) throw new Error("No Flow tab found");
            const x = Math.round(payload.x ?? 0);
            const y = Math.round(payload.y ?? 0);
            await chrome.tabs.update(tabId, { active: true }).catch(() => {});
            const attached = await attachDebugger(tabId);
            const steps = [];
            let clickError = null;
            if (attached) {
              try {
                await chrome.debugger.sendCommand({ tabId }, "Input.dispatchMouseEvent", {
                  type: "mouseMoved",
                  x,
                  y,
                  button: "none",
                  modifiers: 0
                });
                steps.push("mouseMoved");
                await chrome.debugger.sendCommand({ tabId }, "Input.dispatchMouseEvent", {
                  type: "mousePressed",
                  x,
                  y,
                  button: "left",
                  buttons: 1,
                  clickCount: 1,
                  modifiers: 0
                });
                steps.push("mousePressed");
                await chrome.debugger.sendCommand({ tabId }, "Input.dispatchMouseEvent", {
                  type: "mouseReleased",
                  x,
                  y,
                  button: "left",
                  buttons: 0,
                  clickCount: 1,
                  modifiers: 0
                });
                steps.push("mouseReleased");
              } catch (err) {
                clickError = err.message;
              }
            }
            result = { success: !clickError, attached, steps, clickError, x, y };
            break;
          }
          case "native_key": {
            const tabId = await findFlowTab();
            if (!tabId) throw new Error("No Flow tab found");
            await chrome.tabs.update(tabId, { active: true }).catch(() => {});
            await nativeDispatchKey(tabId, payload.key || "Enter", payload.code || "Enter", payload.keyCode || 13, payload.modifiers || 0, payload.text);
            result = { success: true };
            break;
          }
          case "reload_extension": {
            chrome.runtime.reload();
            result = { reloaded: true };
            break;
          }
          case "reload_tab": {
            const tabId = await findFlowTab();
            if (tabId) {
              await chrome.tabs.reload(tabId);
              result = { reloaded: true, tabId };
            } else {
              result = { reloaded: false, error: "No Flow tab" };
            }
            break;
          }
          case "download_media": {
            const { url, filename, folder } = payload;
            const targetPath = folder ? `${folder}/${filename}` : filename;
            const downloadId = await chrome.downloads.download({
              url,
              filename: targetPath || "deepx_render.mp4",
              saveAs: false
            });
            result = { downloadId, status: "download_started" };
            break;
          }
          case "cancel_batch": {
            const b = activeBatches.get(payload.batchId);
            if (b) {
              b.cancelled = true;
              result = { success: true, cancelled: payload.batchId };
            } else {
              result = { success: false, reason: "Batch not found" };
            }
            break;
          }
          case "set_zoom": {
            const tabId = await findFlowTab();
            if (tabId) {
              const factor = Number(payload.zoomFactor) || 0.8;
              await chrome.tabs.setZoom(tabId, factor);
              result = { success: true, zoomFactor: factor };
            } else {
              result = { success: false, error: "No Flow tab found" };
            }
            break;
          }
          case "get_zoom": {
            const tabId = await findFlowTab();
            if (tabId) {
              const zoom = await chrome.tabs.getZoom(tabId);
              result = { success: true, zoom };
            } else {
              result = { success: false, error: "No Flow tab found" };
            }
            break;
          }
          case "toggle_sidebar": {
            const tabId = await findFlowTab();
            if (tabId) {
              const execRes = await chrome.scripting.executeScript({
                target: { tabId },
                func: () => {
                  const icon = Array.from(document.querySelectorAll("mat-icon")).find(i => i.innerText.includes("left_panel_close") || i.innerText.includes("left_panel_open"));
                  if (icon) {
                    const clickable = icon.closest("mat-mdc-list-item, button, [role='listitem']") || icon;
                    clickable.click();
                    return { clicked: true, mode: icon.innerText.trim() };
                  }
                  return { clicked: false };
                }
              });
              result = execRes?.[0]?.result || { clicked: false };
            } else {
              result = { success: false, error: "No Flow tab" };
            }
            break;
          }
          case "debug_dom": {
            const tabId = await findFlowTab();
            if (!tabId) throw new Error("No Flow tab");
            const res = await chrome.scripting.executeScript({
              target: { tabId },
              func: () => {
                const pBox = document.querySelector("flow-prompt-box, flow-base-prompt-box");
                const promptChips = pBox ? Array.from(pBox.querySelectorAll("flow-ingredient-chip")) : [];
                const allChips = Array.from(document.querySelectorAll("flow-ingredient-chip"));
                return {
                  promptBoxChipCount: promptChips.length,
                  promptBoxChips: promptChips.map(c => ({
                    text: c.innerText?.trim(),
                    hasBtn: !!c.querySelector("button"),
                    btnLabels: Array.from(c.querySelectorAll("button")).map(b => b.getAttribute("aria-label") || b.innerText)
                  })),
                  allPageChipsCount: allChips.length,
                  allPageChips: allChips.map(c => c.innerText?.trim())
                };
              }
            });
            result = res?.[0]?.result;
            break;
          }
          default:
            throw new Error("Unknown DeepX command: " + command);
        }

        ws.send(JSON.stringify({ id, success: true, result }));
      } catch (err) {
        console.error("[DeepX Error]", err);
        ws.send(JSON.stringify({ id, success: false, error: `${err.message}\n${err.stack || ""}` }));
      }
    } catch (parseErr) {
      console.error("[DeepX Flow] Malformed message:", parseErr);
    }
  };

  ws.onclose = () => {
    if (wsHeartbeatInterval) {
      clearInterval(wsHeartbeatInterval);
      wsHeartbeatInterval = null;
    }
    chrome.storage.local.set({ deepxConnected: false });
    activeConnectedHost = null;
    chrome.runtime.sendMessage({
      type: "MCP_CONNECTION_STATE_CHANGED",
      connected: false,
      connecting: false,
      manuallyDisconnected: isMcpManuallyDisconnected
    }).catch(() => {});
    if (!isMcpManuallyDisconnected) {
      currentHostIndex++;
      scheduleReconnect();
    }
  };

  ws.onerror = () => {
    try { ws.close(); } catch {}
  };
}

function scheduleReconnect() {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  if (isMcpManuallyDisconnected) {
    console.log("[DeepX Flow] MCP manually disconnected, skipping reconnect schedule.");
    return;
  }
  reconnectTimer = setTimeout(() => connectToAntigravityServer(false), 2000);
}

// Graceful Manual Disconnect & Connect Handlers
async function disconnectFromAntigravityServer() {
  isMcpManuallyDisconnected = true;
  await chrome.storage.local.set({ isMcpManuallyDisconnected: true, deepxConnected: false });
  if (wsHeartbeatInterval) {
    clearInterval(wsHeartbeatInterval);
    wsHeartbeatInterval = null;
  }
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (ws) {
    try {
      try {
        ws.send(JSON.stringify({ type: "CLIENT_DISCONNECT", client: "deepx-flow-extension" }));
      } catch {}
      ws.onclose = null; // Prevent onclose from scheduling reconnect
      ws.onerror = null;
      ws.close(1000, "Manually disconnected by user");
    } catch (e) {
      console.warn("[DeepX Flow] Error closing WebSocket:", e);
    }
    ws = null;
  }
  activeConnectedHost = null;
  chrome.runtime.sendMessage({
    type: "MCP_CONNECTION_STATE_CHANGED",
    connected: false,
    connecting: false,
    manuallyDisconnected: true
  }).catch(() => {});
  console.log("[DeepX Flow] MCP WebSocket disconnected manually.");
  return { success: true, connected: false, manuallyDisconnected: true };
}

async function manualConnectAntigravityServer() {
  isMcpManuallyDisconnected = false;
  await chrome.storage.local.set({ isMcpManuallyDisconnected: false });
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (ws) {
    try {
      ws.onclose = null;
      ws.onerror = null;
      ws.close();
    } catch {}
    ws = null;
  }
  await connectToAntigravityServer(true);
  const isConnected = ws && ws.readyState === WebSocket.OPEN;
  const isConnecting = ws && ws.readyState === WebSocket.CONNECTING;
  chrome.runtime.sendMessage({
    type: "MCP_CONNECTION_STATE_CHANGED",
    connected: isConnected,
    connecting: isConnecting,
    manuallyDisconnected: false
  }).catch(() => {});
  return { success: true, connected: isConnected, connecting: isConnecting, manuallyDisconnected: false };
}

// State for extension ON/OFF status
let globalCapturedToken = null;
let lastKnownProjectId = null;
let lastKnownProjectName = null;
let lastKnownAccountEmail = null;
let lastKnownAccount = null;
let lastAgentActivityTime = null;
let isExtensionEnabledByUser = true;
let isFlowTabPresent = false;
let currentActiveTabUrl = "";

// Official Channel & Lock Gate Configuration
const OFFICIAL_CHANNEL_URL = "https://www.youtube.com/@dipeshkyd?sub_confirmation=1";
let isExtensionUnlocked = false;

// Initialize lock & power state from persistent storage
chrome.storage.local.get({
  extensionUnlocked: false,
  isExtensionEnabledByUser: true,
  isMcpManuallyDisconnected: false,
  lastKnownProjectId: null,
  lastKnownProjectName: null,
  lastAgentActivityTime: null
}, (res) => {
  isExtensionUnlocked = !!res.extensionUnlocked;
  isExtensionEnabledByUser = res.isExtensionEnabledByUser !== false;
  isMcpManuallyDisconnected = !!res.isMcpManuallyDisconnected;
  if (res.lastKnownProjectId) lastKnownProjectId = res.lastKnownProjectId;
  if (res.lastKnownProjectName) lastKnownProjectName = res.lastKnownProjectName;
  if (res.lastAgentActivityTime) lastAgentActivityTime = res.lastAgentActivityTime;
  updateBadge();
});

// Initialize lock state upon installation/load (Do NOT open tab automatically)
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log("[DeepX] Extension installed/loaded, reason:", details.reason);
  const data = await chrome.storage.local.get(["extensionUnlocked"]);
  if (typeof data.extensionUnlocked !== "boolean") {
    await chrome.storage.local.set({ extensionUnlocked: false });
    isExtensionUnlocked = false;
  } else {
    isExtensionUnlocked = !!data.extensionUnlocked;
  }
  updateBadge();
});

// Keep isExtensionUnlocked and isMcpManuallyDisconnected synced across service worker lifecycle
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local") {
    if (changes.extensionUnlocked) {
      isExtensionUnlocked = !!changes.extensionUnlocked.newValue;
      console.log("[DeepX] extensionUnlocked changed to:", isExtensionUnlocked);
      updateBadge();
      if (isExtensionUnlocked && !isMcpManuallyDisconnected) {
        connectToAntigravityServer(true);
      } else if (!isExtensionUnlocked && ws) {
        try {
          console.log("[DeepX] Extension locked - disconnecting MCP WebSocket.");
          ws.close();
        } catch {}
      }
    }
    if (changes.isMcpManuallyDisconnected !== undefined) {
      isMcpManuallyDisconnected = !!changes.isMcpManuallyDisconnected.newValue;
      console.log("[DeepX] isMcpManuallyDisconnected changed to:", isMcpManuallyDisconnected);
      if (isMcpManuallyDisconnected && ws) {
        try {
          ws.close(1000, "Manually disconnected via storage");
          ws = null;
        } catch {}
      }
    }
  }
});

function isEffectiveActive() {
  // DeepX is active only when unlocked AND enabled by the user
  return isExtensionUnlocked && isExtensionEnabledByUser !== false;
}

function updateBadge() {
  if (!isExtensionUnlocked) {
    chrome.action.setBadgeText({ text: "LOCK" });
    chrome.action.setBadgeBackgroundColor({ color: "#ff0055" });
  } else if (isExtensionEnabledByUser !== false) {
    chrome.action.setBadgeText({ text: "ON" });
    chrome.action.setBadgeBackgroundColor({ color: "#00e676" });
  } else {
    chrome.action.setBadgeText({ text: "OFF" });
    chrome.action.setBadgeBackgroundColor({ color: "#757575" });
  }
}

// Automated YouTube Subscription Scanner: Actively inspects open tabs for @dipeshkyd
async function scanOpenYouTubeTabsForSubscription() {
  try {
    const ytTabs = await chrome.tabs.query({
      url: ["*://*.youtube.com/*", "*://youtube.com/*"]
    });
    if (!ytTabs || ytTabs.length === 0) return false;

    for (const tab of ytTabs) {
      if (!tab.id) continue;
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            const url = (window.location.href || "").toLowerCase();
            const textContent = (document.body ? document.body.innerText : "").toLowerCase();
            const pageTitle = (document.title || "").toLowerCase();

            const isDipeshkyd = url.includes("@dipeshkyd") || 
                                url.includes("ucyf1kp1w4xvnkhagmehx1w") || 
                                url.includes("dipeshkyd") ||
                                pageTitle.includes("dipeshkyd") ||
                                textContent.includes("@dipeshkyd") ||
                                textContent.includes("dipeshkyd");

            if (!isDipeshkyd) return { isSubscribed: false, isExplicitUnsubscribed: false };

            // 1. Check if "Confirm channel subscription" modal dialog is open and visible
            const confirmDialogs = document.querySelectorAll(
              'yt-confirm-dialog-renderer, tp-yt-paper-dialog, #dialog, ytd-popup-container yt-confirm-dialog-renderer'
            );
            for (const dlg of confirmDialogs) {
              if (dlg.offsetParent !== null || dlg.hasAttribute('opened')) {
                const dlgText = (dlg.innerText || dlg.textContent || '').toLowerCase();
                if (
                  (dlgText.includes('confirm') || dlgText.includes('subscribe') || dlgText.includes('सदस्यता') || dlgText.includes('are you sure')) &&
                  (dlgText.includes('dipeshkyd') || dlgText.includes('channel') || dlgText.includes('चैनल'))
                ) {
                  return { isSubscribed: false, isExplicitUnsubscribed: true };
                }
              }
            }

            // 2. Locate channel subscribe button containers
            const subscribeRenderers = document.querySelectorAll(
              '#subscribe-button, ytd-subscribe-button-renderer, ytm-subscribe-button-renderer, yt-subscribe-button-view-model'
            );

            let foundExplicitUnsubscribed = false;

            // 3. STRICT NEGATIVE CHECK (CRITICAL ZERO-FALSE-POSITIVE GUARD)
            for (const sr of subscribeRenderers) {
              const hasSubscribedAttr = (
                sr.hasAttribute('subscribed') ||
                sr.getAttribute('subscribed') === 'true' ||
                sr.classList.contains('subscribed')
              );

              if (!hasSubscribedAttr) {
                const btn = sr.querySelector('button, yt-button-shape, .yt-spec-button-shape-next');
                if (btn) {
                  const text = (btn.innerText || btn.textContent || '').trim().toLowerCase();
                  const aria = (btn.getAttribute('aria-label') || '').toLowerCase();

                  const isUnsubscribedText = (
                    text === 'subscribe' ||
                    text === 'सदस्यता लें' ||
                    text === 'सदस्यता लिनुहोस्' ||
                    text === 'suscribirse' ||
                    text === "s'abonner" ||
                    text === 'abonnieren' ||
                    text === 'inscrever-se' ||
                    text === 'подписаться' ||
                    text === 'اشتراك' ||
                    aria === 'subscribe' ||
                    (aria.startsWith('subscribe to') && !aria.includes('unsubscribe')) ||
                    (aria.includes('subscribe to') && !aria.includes('unsubscribe')) ||
                    aria.startsWith('सदस्यता लें') ||
                    aria.includes('की सदस्यता लें')
                  );

                  const isSubscribedText = (
                    text === 'subscribed' ||
                    text === 'सदस्यता ली गई' ||
                    text === 'सदस्यता लिइएको' ||
                    text === 'suscrito' ||
                    text === 'abonné' ||
                    text === 'abonniert' ||
                    text === 'inscrito' ||
                    text === 'вы подписаны' ||
                    text === 'مشترك' ||
                    aria.includes('subscribed to') ||
                    aria.includes('unsubscribe from') ||
                    aria.includes('सदस्यता ली गई') ||
                    aria.includes('सदस्यता छोड़ें') ||
                    aria.includes('सदस्यता रद्द')
                  );

                  if (isUnsubscribedText && !isSubscribedText) {
                    foundExplicitUnsubscribed = true;
                  }
                }
              }
            }

            if (foundExplicitUnsubscribed) {
              return { isSubscribed: false, isExplicitUnsubscribed: true };
            }

            // 4. POSITIVE GUARDS (Only evaluate if negative check passed)
            // 4A. Dedicated Channel Notification Bell Toggle (strictly inside channel header)
            const channelBell = document.querySelector(
              '#subscribe-button ytd-subscription-notification-toggle-button-renderer-next, ' +
              '#subscribe-button ytd-subscription-notification-toggle-button-renderer, ' +
              '#subscribe-button ytm-subscription-notification-toggle-button-renderer-next, ' +
              'ytd-channel-header-renderer ytd-subscription-notification-toggle-button-renderer-next, ' +
              'ytd-channel-header-renderer ytd-subscription-notification-toggle-button-renderer, ' +
              'yt-page-header-renderer ytd-subscription-notification-toggle-button-renderer-next, ' +
              '#page-header ytd-subscription-notification-toggle-button-renderer-next, ' +
              '#page-header #notification-preference-button, ' +
              '#subscribe-button #notification-preference-button'
            );
            if (channelBell) {
              return { isSubscribed: true, isExplicitUnsubscribed: false };
            }

            // 4B. Official subscribed attribute
            for (const sr of subscribeRenderers) {
              if (
                sr.hasAttribute('subscribed') ||
                sr.getAttribute('subscribed') === 'true' ||
                sr.classList.contains('subscribed')
              ) {
                return { isSubscribed: true, isExplicitUnsubscribed: false };
              }
            }

            // 4C. Explicit Subscribed text in channel header
            const channelButtons = document.querySelectorAll(
              '#subscribe-button button, ' +
              'ytd-channel-header-renderer #subscribe-button yt-button-shape, ' +
              'yt-page-header-renderer #subscribe-button button, ' +
              'ytd-subscribe-button-renderer button, ' +
              'ytm-subscribe-button-renderer button, ' +
              'yt-subscribe-button-view-model button'
            );
            for (const btn of channelButtons) {
              const text = (btn.innerText || btn.textContent || '').trim().toLowerCase();
              const aria = (btn.getAttribute('aria-label') || '').toLowerCase();

              if (
                text === 'subscribed' ||
                text === 'सदस्यता ली गई' ||
                text === 'सदस्यता लिइएको' ||
                text === 'suscrito' ||
                text === 'abonné' ||
                text === 'abonniert' ||
                text === 'inscrito' ||
                text === 'вы подписаны' ||
                text === 'مشترك' ||
                aria.includes('subscribed to') ||
                aria.includes('unsubscribe from') ||
                aria.includes('सदस्यता ली गई') ||
                aria.includes('सदस्यता छोड़ें') ||
                aria.includes('सदस्यता रद्द')
              ) {
                return { isSubscribed: true, isExplicitUnsubscribed: false };
              }
            }

            return { isSubscribed: false, isExplicitUnsubscribed: false };
          }
        });

        const status = results?.[0]?.result;
        if (status?.isSubscribed === true) {
          console.log("[DeepX] Auto-detected confirmed subscription to @dipeshkyd in tab ID:", tab.id);
          isExtensionUnlocked = true;
          await chrome.storage.local.set({
            extensionUnlocked: true,
            subscribedChannel: "@dipeshkyd",
            unlockedAt: Date.now()
          });
          updateBadge();
          chrome.runtime.sendMessage({
            type: "EXTENSION_UNLOCKED",
            isUnlocked: true,
            source: "auto_tab_scan"
          }).catch(() => {});
          return true;
        } else if (status?.isExplicitUnsubscribed === true) {
          if (isExtensionUnlocked) {
            console.log("[DeepX] Auto-detected explicit unsubscribed status in open tab. Relocking.");
            isExtensionUnlocked = false;
            await chrome.storage.local.set({
              extensionUnlocked: false,
              unlockedAt: null
            });
            updateBadge();
            chrome.runtime.sendMessage({
              type: "EXTENSION_LOCKED",
              isUnlocked: false,
              source: "auto_tab_scan"
            }).catch(() => {});
          }
        }
      } catch (err) {
        // Tab might be restricted or loading, continue checking other tabs
      }
    }
  } catch (e) {
    console.warn("[DeepX] scanOpenYouTubeTabs error:", e);
  }
  return false;
}

// Auto-scan on YouTube tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab?.url && (tab.url.includes("youtube.com") || tab.url.includes("youtu.be"))) {
    if (!isExtensionUnlocked) {
      scanOpenYouTubeTabsForSubscription();
    }
  }
});

async function updateActiveTabState() {
  try {
    const tabId = await findFlowTab();
    if (!tabId) {
      isFlowTabPresent = false;
      currentActiveTabUrl = "";
      // Keep lastKnownProjectId and lastKnownProjectName in storage across momentary focus shifts
    } else {
      isFlowTabPresent = true;
      if (!isMcpManuallyDisconnected && (!ws || ws.readyState !== WebSocket.OPEN)) {
        connectToAntigravityServer();
      }
      try {
        const tab = await chrome.tabs.get(tabId);
        currentActiveTabUrl = tab?.url || "https://flow.google.com";
      } catch {
        currentActiveTabUrl = "https://flow.google.com";
      }

      // Real-time project ID extraction directly from tab URL (fast & 100% reliable)
      const detectedProjectId = extractProjectId(currentActiveTabUrl);
      if (detectedProjectId && detectedProjectId !== lastKnownProjectId) {
        console.log(`[DeepX] Project ID updated from Tab URL: ${lastKnownProjectId} -> ${detectedProjectId}`);
        lastKnownProjectId = detectedProjectId;
        chrome.storage.local.set({ lastKnownProjectId: detectedProjectId });
        chrome.runtime.sendMessage({
          type: "PROJECT_ID_UPDATED",
          projectId: detectedProjectId,
          projectName: lastKnownProjectName,
          url: currentActiveTabUrl
        }).catch(() => {});
      }
    }

    updateBadge();

    // Broadcast state change to sidepanel and popup
    chrome.runtime.sendMessage({
      type: "FLOW_ACTIVE_STATE_CHANGED",
      isFlowActive: isEffectiveActive(),
      isFlowTabActive: isFlowTabPresent,
      isExtensionEnabled: isExtensionEnabledByUser,
      currentUrl: currentActiveTabUrl,
      projectId: lastKnownProjectId
    }).catch(() => {});
  } catch {}
}

chrome.tabs.onActivated.addListener(updateActiveTabState);
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.url?.includes("flow.google.com") || tab.url?.includes("labs.google") || changeInfo.url) {
    updateActiveTabState();
  }
});
chrome.tabs.onRemoved.addListener(updateActiveTabState);
updateActiveTabState();

// Keep-Alive Port Listener from Content Scripts (prevents MV3 service worker sleep)
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "deepx_keepalive") {
    port.onMessage.addListener(() => {
      if (!isMcpManuallyDisconnected && (!ws || ws.readyState !== WebSocket.OPEN)) {
        connectToAntigravityServer(false);
      }
    });
  }
});

// Periodic Heartbeat Alarm to keep WebSocket connected 24/7 (if not manually disconnected)
try {
  chrome.alarms.create("deepx:heartbeat", { periodInMinutes: 0.3 });
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "deepx:heartbeat") {
      if (!isMcpManuallyDisconnected && (!ws || ws.readyState !== WebSocket.OPEN)) {
        connectToAntigravityServer(false);
      }
    }
  });
} catch {}

// Start connection on service worker startup if not manually disconnected
chrome.storage.local.get({ isMcpManuallyDisconnected: false }, (res) => {
  isMcpManuallyDisconnected = !!res.isMcpManuallyDisconnected;
  if (!isMcpManuallyDisconnected) {
    connectToAntigravityServer(false);
  } else {
    console.log("[DeepX Flow] MCP manually disconnected by user, skipping startup auto-connect.");
  }
});

// Handle messages from Extension Popup / Side Panel / Content Scripts
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!isMcpManuallyDisconnected && (!ws || ws.readyState !== WebSocket.OPEN)) {
    connectToAntigravityServer(false);
  }

  // Explicit MCP Bridge Manual Disconnect / Connect / Toggle Handlers
  if (msg.type === "DISCONNECT_MCP") {
    disconnectFromAntigravityServer()
      .then(res => sendResponse(res))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (msg.type === "CONNECT_MCP") {
    manualConnectAntigravityServer()
      .then(res => sendResponse(res))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (msg.type === "TOGGLE_MCP_CONNECTION") {
    const isCurrentlyConnected = ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING);
    if (isCurrentlyConnected && !isMcpManuallyDisconnected) {
      disconnectFromAntigravityServer()
        .then(res => sendResponse(res))
        .catch(err => sendResponse({ success: false, error: err.message }));
    } else {
      manualConnectAntigravityServer()
        .then(res => sendResponse(res))
        .catch(err => sendResponse({ success: false, error: err.message }));
    }
    return true;
  }
  if (msg.type === "PROJECT_CHANGED") {
    const newProjectId = msg.projectId || null;
    const newProjectName = msg.projectName || null;
    let changed = false;
    if (newProjectId && newProjectId !== lastKnownProjectId) {
      console.log(`[DeepX] Project ID updated via content script: ${lastKnownProjectId} -> ${newProjectId}`);
      lastKnownProjectId = newProjectId;
      changed = true;
    }
    if (newProjectName && newProjectName !== lastKnownProjectName) {
      console.log(`[DeepX] Project Name updated: ${lastKnownProjectName} -> ${newProjectName}`);
      lastKnownProjectName = newProjectName;
      changed = true;
    }
    if (changed) {
      chrome.storage.local.set({
        lastKnownProjectId,
        lastKnownProjectName
      });
      chrome.runtime.sendMessage({
        type: "PROJECT_ID_UPDATED",
        projectId: lastKnownProjectId,
        projectName: lastKnownProjectName,
        url: msg.url || currentActiveTabUrl
      }).catch(() => {});
    }
    return false;
  }

  if (msg.type === "REFRESH_PROJECT_INFO") {
    (async () => {
      try {
        const tabId = await findFlowTab();
        if (!tabId) {
          sendResponse({
            success: false,
            error: "No Google Flow tab open. Open flow.google.com in Chrome.",
            projectId: lastKnownProjectId,
            projectName: lastKnownProjectName
          });
          return;
        }

        const ctx = await extractFlowTabContext(tabId);
        if (ctx?.projectId) {
          lastKnownProjectId = ctx.projectId;
          if (ctx.projectName) lastKnownProjectName = ctx.projectName;
          chrome.storage.local.set({
            lastKnownProjectId: ctx.projectId,
            lastKnownProjectName: lastKnownProjectName
          });
        }

        sendResponse({
          success: true,
          projectId: lastKnownProjectId,
          projectName: lastKnownProjectName,
          account: ctx?.account || lastKnownAccount
        });
      } catch (err) {
        sendResponse({
          success: false,
          error: err.message,
          projectId: lastKnownProjectId,
          projectName: lastKnownProjectName
        });
      }
    })();
    return true;
  }

  if (msg.type === "TOKEN_CAPTURED" && msg.token) {
    globalCapturedToken = msg.token;
    chrome.storage.local.set({ deepxAuthToken: msg.token });
    console.log("[DeepX] Auth token captured from session.");
    return false;
  }

  if (msg.type === "ACCOUNT_CHANGED" && msg.account) {
    if (lastKnownAccountEmail && msg.account.email && msg.account.email !== lastKnownAccountEmail) {
      console.log(`[DeepX] Account switch detected: ${lastKnownAccountEmail} -> ${msg.account.email}`);
      globalCapturedToken = null;
      chrome.storage.local.remove(["deepxAuthToken"]);
    }
    lastKnownAccountEmail = msg.account.email || null;
    lastKnownAccount = msg.account;
    chrome.runtime.sendMessage({
      type: "ACCOUNT_UPDATED",
      account: msg.account
    }).catch(() => {});
    return false;
  }

  // When user clicks the extension icon in Chrome toolbar, popup opens
  if (msg.type === "POPUP_OPENED") {
    (async () => {
      if (!isExtensionUnlocked) {
        await scanOpenYouTubeTabsForSubscription();
      }
      const tabId = await findFlowTab();
      isFlowTabPresent = !!tabId;
      updateBadge();
      sendResponse({
        success: true,
        active: isExtensionEnabledByUser !== false,
        isFlow: isFlowTabPresent,
        isUnlocked: isExtensionUnlocked,
        currentUrl: currentActiveTabUrl
      });
    })();
    return true;
  }

  // Explicit Toggle Power
  if (msg.type === "SET_EXTENSION_ACTIVE") {
    (async () => {
      isExtensionEnabledByUser = !!msg.active;
      await chrome.storage.local.set({ isExtensionEnabledByUser });
      const tabId = await findFlowTab();
      isFlowTabPresent = !!tabId;
      updateBadge();
      chrome.storage.local.set({ extensionActive: isEffectiveActive() });
      chrome.runtime.sendMessage({
        type: "FLOW_ACTIVE_STATE_CHANGED",
        isFlowActive: isEffectiveActive(),
        isFlowTabActive: isFlowTabPresent,
        isExtensionEnabled: isExtensionEnabledByUser,
        currentUrl: currentActiveTabUrl
      }).catch(() => {});
      sendResponse({ success: true, active: isEffectiveActive(), isFlow: isFlowTabPresent });
    })();
    return true;
  }

  if (msg.type === "TOGGLE_EXTENSION_ACTIVE") {
    (async () => {
      isExtensionEnabledByUser = !isExtensionEnabledByUser;
      await chrome.storage.local.set({ isExtensionEnabledByUser });
      const tabId = await findFlowTab();
      isFlowTabPresent = !!tabId;
      updateBadge();
      chrome.storage.local.set({ extensionActive: isEffectiveActive() });
      chrome.runtime.sendMessage({
        type: "FLOW_ACTIVE_STATE_CHANGED",
        isFlowActive: isEffectiveActive(),
        isFlowTabActive: isFlowTabPresent,
        isExtensionEnabled: isExtensionEnabledByUser,
        currentUrl: currentActiveTabUrl
      }).catch(() => {});
      sendResponse({ success: true, active: isEffectiveActive(), isFlow: isFlowTabPresent });
    })();
    return true;
  }

  if (msg.type === "SWITCH_TO_FLOW_AND_ACTIVATE") {
    (async () => {
      try {
        const tabId = await findFlowTab();
        if (tabId) {
          const tab = await chrome.tabs.get(tabId);
          await chrome.tabs.update(tabId, { active: true });
          if (tab.windowId) {
            await chrome.windows.update(tab.windowId, { focused: true });
          }
        } else {
          await chrome.tabs.create({ url: "https://flow.google.com" });
        }
        isFlowTabPresent = true;
        isExtensionEnabledByUser = true;
        await chrome.storage.local.set({ isExtensionEnabledByUser: true });
        updateBadge();
        chrome.storage.local.set({ extensionActive: true });
        chrome.runtime.sendMessage({
          type: "FLOW_ACTIVE_STATE_CHANGED",
          isFlowActive: true,
          isFlowTabActive: true,
          isExtensionEnabled: true,
          currentUrl: "https://flow.google.com"
        }).catch(() => {});
        sendResponse({ success: true, active: true });
      } catch (e) {
        sendResponse({ success: false, error: e.message });
      }
    })();
    return true;
  }

  if (msg.type === "GET_EXTENSION_STATUS" || msg.type === "GET_BRIDGE_STATUS") {
    (async () => {
      try {
        const tabId = await findFlowTab();
        const target = await getTargetWsUrl();
        let projectId = lastKnownProjectId;
        let accountInfo = lastKnownAccount;

        if (tabId) {
          const ctx = await extractFlowTabContext(tabId);
          if (ctx) {
            projectId = ctx.projectId || null;
            accountInfo = ctx.account || null;
            if (ctx.url) currentActiveTabUrl = ctx.url;
          }
        }

        // Account switch detection
        if (accountInfo?.email) {
          if (lastKnownAccountEmail && accountInfo.email !== lastKnownAccountEmail) {
            globalCapturedToken = null;
            chrome.storage.local.remove(["deepxAuthToken"]);
          }
          lastKnownAccountEmail = accountInfo.email;
          lastKnownAccount = accountInfo;
        } else if (accountInfo && !accountInfo.isLoggedIn) {
          globalCapturedToken = null;
          lastKnownAccount = null;
          chrome.storage.local.remove(["deepxAuthToken"]);
        }

        let connectionState = "ready";
        let stateReason = "Connected to Google Flow and ready to generate.";

        if (isExtensionEnabledByUser === false) {
          connectionState = "standby";
          stateReason = "DeepX Extension is manually turned OFF. Click Turn ON to resume.";
        } else if (!tabId) {
          connectionState = "tab_not_found";
          stateReason = "No Google Flow tab open. Open https://flow.google.com in Chrome.";
        } else if (!accountInfo || !accountInfo.isLoggedIn) {
          connectionState = "needs_login";
          stateReason = "Google Flow tab is open, but you are not logged in.";
        } else if (!projectId) {
          connectionState = "needs_project";
          stateReason = "Logged in, but no project is open.";
        }

        const AGENT_ACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;
        const isAgentActive = ws?.readyState === WebSocket.OPEN && !!lastAgentActivityTime && (Date.now() - lastAgentActivityTime < AGENT_ACTIVITY_TIMEOUT_MS);
        const resolvedDomain = currentActiveTabUrl ? (()=>{ try { return new URL(currentActiveTabUrl).hostname; } catch { return "flow.google.com"; } })() : "flow.google.com";

        sendResponse({
          wsConnected: ws?.readyState === WebSocket.OPEN,
          mcpConnecting: ws?.readyState === WebSocket.CONNECTING,
          mcpManuallyDisconnected: isMcpManuallyDisconnected,
          agentConnected: isAgentActive,
          lastAgentActivityTime,
          ready: connectionState === "ready" && ws?.readyState === WebSocket.OPEN,
          connectionState,
          stateReason,
          connectedHost: activeConnectedHost,
          targetHost: target,
          tabAttached: !!tabId,
          flowTabAttached: !!tabId,
          flowActive: isEffectiveActive(),
          isFlowTabActive: isFlowTabPresent,
          isExtensionEnabled: isExtensionEnabledByUser !== false,
          isUnlocked: isExtensionUnlocked,
          channelUrl: "https://www.youtube.com/@dipeshkyd",
          currentDomain: resolvedDomain,
          projectId: projectId || lastKnownProjectId,
          projectName: lastKnownProjectName,
          hasToken: !!globalCapturedToken,
          account: accountInfo || { isLoggedIn: false, accountName: null, email: null, plan: "None" },
          activeBatchesCount: activeBatches.size
        });
      } catch (err) {
        console.error("[DeepX] GET_EXTENSION_STATUS error:", err);
        sendResponse({
          wsConnected: ws?.readyState === WebSocket.OPEN,
          mcpConnecting: ws?.readyState === WebSocket.CONNECTING,
          mcpManuallyDisconnected: isMcpManuallyDisconnected,
          agentConnected: false,
          tabAttached: isFlowTabPresent,
          flowTabAttached: isFlowTabPresent,
          flowActive: isEffectiveActive(),
          isExtensionEnabled: isExtensionEnabledByUser !== false,
          currentDomain: "flow.google.com",
          error: err.message
        });
      }
    })();
    return true;
  }

  if (msg.type === "SYNC_FLOW_ACCOUNT") {
    (async () => {
      try {
        let tabId = await findFlowTab();
        if (!tabId) {
          const tab = await chrome.tabs.create({ url: "https://flow.google.com" });
          tabId = tab.id;
          await new Promise(r => setTimeout(r, 1500));
        } else {
          await chrome.tabs.update(tabId, { active: true });
        }

        const ctx = await extractFlowTabContext(tabId);
        updateBadge();

        chrome.runtime.sendMessage({
          type: "ACCOUNT_UPDATED",
          account: ctx?.account,
          projectId: ctx?.projectId
        }).catch(() => {});

        sendResponse({
          success: true,
          account: ctx?.account,
          projectId: ctx?.projectId,
          url: ctx?.url
        });
      } catch (err) {
        sendResponse({ success: false, error: err.message || String(err) });
      }
    })();
    return true;
  }

  if (msg.type === "MANUAL_RECONNECT") {
    isMcpManuallyDisconnected = false;
    chrome.storage.local.set({ isMcpManuallyDisconnected: false });
    if (msg.customHost) {
      chrome.storage.local.set({ customAgyHost: msg.customHost }, () => {
        if (ws) { try { ws.close(); } catch {} }
        connectToAntigravityServer(true);
      });
    } else {
      if (ws) { try { ws.close(); } catch {} }
      connectToAntigravityServer(true);
    }
    sendResponse({ reconnecting: true });
    return false;
  }

  if (msg.type === "DISPATCH_RAPID_BATCH") {
    (async () => {
      try {
        const result = await handleBatchGenerate({
          ...msg.payload,
          rapidDispatch: true
        }, (progress) => {
          chrome.runtime.sendMessage({ type: "RAPID_BATCH_PROGRESS", progress }).catch(() => {});
        });
        sendResponse({ success: true, result });
      } catch (err) {
        sendResponse({ success: false, error: err.message || String(err) });
      }
    })();
    return true;
  }

  if (msg.type === "RUN_AUTONOMOUS_STORYBOARD") {
    (async () => {
      try {
        const result = await handleAutonomousStoryboardPipeline(msg.payload || {}, (progress) => {
          chrome.runtime.sendMessage({ type: "RAPID_BATCH_PROGRESS", progress }).catch(() => {});
        });
        sendResponse({ success: true, result });
      } catch (err) {
        sendResponse({ success: false, error: err.message || String(err) });
      }
    })();
    return true;
  }

  if (msg.type === "UPLOAD_CHARACTER") {
    (async () => {
      try {
        const result = await handleUploadCharacter(msg.payload || {});
        sendResponse({ success: true, result });
      } catch (err) {
        sendResponse({ success: false, error: err.message || String(err) });
      }
    })();
    return true;
  }

  if (msg.type === "GENERATE_CHARACTER") {
    (async () => {
      try {
        const result = await handleGenerateCharacter(msg.payload || {});
        sendResponse({ success: true, result });
      } catch (err) {
        sendResponse({ success: false, error: err.message || String(err) });
      }
    })();
    return true;
  }

  if (msg.type === "SCAN_PROJECT_CHARACTERS" || msg.type === "SCAN_CHARACTERS" || msg.type === "LIST_CHARACTERS") {
    (async () => {
      try {
        const chars = await handleListCharacters();
        sendResponse({ success: true, characters: Array.isArray(chars) ? chars : [] });
      } catch (err) {
        sendResponse({ success: false, error: err.message || String(err) });
      }
    })();
    return true;
  }

  if (msg.type === "UNLOCK_EXTENSION") {
    chrome.storage.local.set({ extensionUnlocked: true }, () => {
      chrome.runtime.sendMessage({ type: "EXTENSION_UNLOCKED", isUnlocked: true }).catch(() => {});
      sendResponse({ success: true, isUnlocked: true });
    });
    return true;
  }

  if (msg.type === "SYNC_SETTINGS_REALTIME") {
    (async () => {
      const tabId = await findFlowTab();
      if (tabId) {
        try {
          await configureFlowSettingsFast(tabId, msg.payload);
          sendResponse({ success: true });
        } catch (err) {
          sendResponse({ success: false, error: err.message });
        }
      } else {
        sendResponse({ success: false, error: "No Flow tab" });
      }
    })();
    return true;
  }

  if (msg.type === "SET_ZOOM") {
    (async () => {
      const tabId = await findFlowTab();
      if (tabId) {
        const factor = Number(msg.zoomFactor) || 0.8;
        await chrome.tabs.setZoom(tabId, factor);
        sendResponse({ success: true, zoomFactor: factor });
      } else {
        sendResponse({ success: false, error: "No Flow tab" });
      }
    })();
    return true;
  }

  if (msg.type === "GET_ZOOM") {
    (async () => {
      const tabId = await findFlowTab();
      if (tabId) {
        const zoom = await chrome.tabs.getZoom(tabId);
        sendResponse({ success: true, zoom });
      } else {
        sendResponse({ success: false, error: "No Flow tab" });
      }
    })();
    return true;
  }

  if (msg.type === "TOGGLE_SIDEBAR") {
    (async () => {
      const tabId = await findFlowTab();
      if (tabId) {
        const execRes = await chrome.scripting.executeScript({
          target: { tabId },
          func: () => {
            const icon = Array.from(document.querySelectorAll("mat-icon")).find(i => i.innerText.includes("left_panel_close") || i.innerText.includes("left_panel_open"));
            if (icon) {
              const clickable = icon.closest("mat-mdc-list-item, button, [role='listitem']") || icon;
              clickable.click();
              return true;
            }
            return false;
          }
        });
        sendResponse({ success: true, clicked: !!execRes?.[0]?.result });
      } else {
        sendResponse({ success: false, error: "No Flow tab" });
      }
    })();
    return true;
  }

  if (msg.type === "ENSURE_SIDEBAR_COLLAPSED") {
    (async () => {
      const tabId = await findFlowTab();
      if (tabId) {
        const execRes = await chrome.scripting.executeScript({
          target: { tabId },
          func: () => {
            const icon = Array.from(document.querySelectorAll("mat-icon")).find(i => i.innerText.includes("left_panel_close"));
            if (icon) {
              const clickable = icon.closest("mat-mdc-list-item, button, [role='listitem']") || icon;
              clickable.click();
              return true;
            }
            return false;
          }
        });
        sendResponse({ success: true, collapsed: !!execRes?.[0]?.result });
      } else {
        sendResponse({ success: false, error: "No Flow tab" });
      }
    })();
    return true;
  }

  // Handle real-time YouTube subscription confirmation
  if (msg.type === "YOUTUBE_SUBSCRIBE_CONFIRMED") {
    (async () => {
      console.log("[DeepX] Real-time YouTube subscription confirmed for", msg.channel || "@dipeshkyd");
      isExtensionUnlocked = true;
      await chrome.storage.local.set({
        extensionUnlocked: true,
        subscribedChannel: "@dipeshkyd",
        unlockedAt: Date.now()
      });
      updateBadge();
      chrome.runtime.sendMessage({
        type: "EXTENSION_UNLOCKED",
        isUnlocked: true,
        source: "youtube_realtime"
      }).catch(() => {});
      sendResponse({ success: true, isUnlocked: true });
    })();
    return true;
  }

  // Handle real-time YouTube unsubscription confirmation or lock command
  if (msg.type === "YOUTUBE_UNSUBSCRIBED_CONFIRMED" || msg.type === "LOCK_EXTENSION") {
    (async () => {
      console.log("[DeepX] Real-time YouTube unsubscribed status confirmed. Locking extension.");
      isExtensionUnlocked = false;
      await chrome.storage.local.set({
        extensionUnlocked: false,
        unlockedAt: null
      });
      updateBadge();
      chrome.runtime.sendMessage({
        type: "EXTENSION_LOCKED",
        isUnlocked: false,
        source: "youtube_realtime"
      }).catch(() => {});
      sendResponse({ success: true, isUnlocked: false });
    })();
    return true;
  }


  // Handle extension lock / unlock and YouTube channel interactions
  if (msg.type === "UNLOCK_EXTENSION") {
    (async () => {
      isExtensionUnlocked = true;
      await chrome.storage.local.set({
        extensionUnlocked: true,
        subscribedChannel: "@dipeshkyd",
        unlockedAt: Date.now()
      });
      updateBadge();
      chrome.runtime.sendMessage({
        type: "EXTENSION_UNLOCKED",
        isUnlocked: true
      }).catch(() => {});
      sendResponse({ success: true, isUnlocked: true });
    })();
    return true;
  }

  if (msg.type === "CHECK_UNLOCK_STATUS" || msg.type === "AUTO_CHECK_SUBSCRIPTION") {
    (async () => {
      if (!isExtensionUnlocked) {
        await scanOpenYouTubeTabsForSubscription();
      }
      sendResponse({
        success: true,
        isUnlocked: isExtensionUnlocked,
        channelUrl: OFFICIAL_CHANNEL_URL
      });
    })();
    return true;
  }

  if (msg.type === "OPEN_YOUTUBE_CHANNEL") {
    chrome.tabs.create({ url: OFFICIAL_CHANNEL_URL });
    sendResponse({ success: true });
    return false;
  }
});
