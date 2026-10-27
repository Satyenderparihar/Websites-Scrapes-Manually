(() => {
  "use strict";

  window.__deepxIsolatedLoaded = true;

  console.log("%c[DeepX Flow]%c Isolated-world UI controller & knowledge engine loaded.", "color:#00e5ff;font-weight:bold;", "color:inherit;");

  // Persistent Keep-Alive Port to keep Service Worker active 24/7 in Manifest V3
  let keepAlivePort = null;
  function connectKeepAlivePort() {
    try {
      keepAlivePort = chrome.runtime.connect({ name: "deepx_keepalive" });
      keepAlivePort.onDisconnect.addListener(() => {
        keepAlivePort = null;
        setTimeout(connectKeepAlivePort, 1500);
      });
      keepAlivePort.onMessage.addListener(() => {});
    } catch {
      setTimeout(connectKeepAlivePort, 2000);
    }
  }
  connectKeepAlivePort();
  setInterval(() => {
    if (keepAlivePort) {
      try { keepAlivePort.postMessage({ type: "PING" }); }
      catch { connectKeepAlivePort(); }
    } else {
      connectKeepAlivePort();
    }
  }, 10000);


  const pendingRequests = new Map();

  // Listen to responses returned from MAIN world
  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    const data = event.data;
    if (data?.type === "DEEPX_MAIN_RESPONSE" && data.id) {
      const cb = pendingRequests.get(data.id);
      if (cb) {
        pendingRequests.delete(data.id);
        cb(data.result, data.error, data.status);
      }
    }
    if (data?.type === "DEEPX_AUTH_TOKEN_CAPTURED" && data.token) {
      chrome.runtime.sendMessage({
        type: "TOKEN_CAPTURED",
        token: data.token
      }).catch(() => {});
    }
    if (data?.type === "DEEPX_PROJECT_CHANGED" && data.projectId) {
      chrome.runtime.sendMessage({
        type: "PROJECT_CHANGED",
        projectId: data.projectId,
        projectName: data.projectName || null,
        url: data.url || window.location.href
      }).catch(() => {});
    }
    if (data?.type === "DEEPX_ACCOUNT_CHANGED" && data.account) {
      chrome.runtime.sendMessage({
        type: "ACCOUNT_CHANGED",
        account: data.account
      }).catch(() => {});
    }
  });

  // Call into MAIN world with safety timeout
  function callMain(action, args = []) {
    return new Promise((resolve, reject) => {
      const id = "deepx_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now();
      const timeoutMs = action === "api_post" ? 60000 : 15000;
      const timer = setTimeout(() => {
        if (pendingRequests.has(id)) {
          pendingRequests.delete(id);
          reject(new Error(`Call to main world action '${action}' timed out after ${timeoutMs}ms`));
        }
      }, timeoutMs);
      pendingRequests.set(id, (result, error) => {
        clearTimeout(timer);
        if (error) reject(new Error(error));
        else resolve(result);
      });
      window.postMessage({ type: "DEEPX_MAIN_REQUEST", id, action, args }, "*");
    });
  }

  // Autonomous Project ID Observer in ISOLATED world (direct URL inspection)
  let lastIsolatedProjectId = null;
  function checkUrlForProject() {
    try {
      const url = window.location.href;
      const m = url.match(/projects?\/([a-zA-Z0-9_-]{6,})/i);
      const pId = m && !["new", "all", "recent", "templates", "trash"].includes(m[1].toLowerCase()) ? m[1] : null;
      if (pId !== lastIsolatedProjectId) {
        lastIsolatedProjectId = pId;
        const titleClean = (document.title || "")
          .replace(/^Google Flow\s*[–—\-]\s*/i, "")
          .replace(/\s*[–—\-]\s*Google Flow.*$/i, "")
          .trim();
        const pName = titleClean && !["google flow", "flow", "home", "projects", "new project"].includes(titleClean.toLowerCase()) ? titleClean : null;
        console.log("%c[DeepX Isolated]%c Project ID detected:", "color:#00e5ff;font-weight:bold;", "color:#00e676;", pId || "None", pName ? `(${pName})` : "");
        chrome.runtime.sendMessage({
          type: "PROJECT_CHANGED",
          projectId: pId,
          projectName: pName,
          url: url
        }).catch(() => {});
      }
    } catch {}
  }
  setInterval(checkUrlForProject, 500);
  checkUrlForProject();

  // --- DEEP KNOWLEDGE SELECTOR DICTIONARY (AnyAI & Flow Bridge unified) ---
  const SELECTORS = {
    // 1. Add Media / Image Upload
    addImageButton: [
      "flow-base-prompt-box button:has(mat-icon:contains('add'))",
      "flow-ingredient-bar button.empty-chip:eq(0)",
      "button[aria-label='Add media menu']",
      "button[aria-label*='Add media']",
      "div.prompt-box button:has(mat-icon:contains('add'))",
      "button:has(mat-icon:contains('add'))"
    ],
    // 2. Prompt Editor Textbox
    promptTextarea: [
      "div[role='textbox']",
      "flow-rich-text-editor",
      "div[contenteditable='true']",
      "textarea[placeholder*='What do you want to create']",
      "textarea"
    ],
    // 3. Submit / Generate Arrow Button
    submitButton: [
      "div.submit-controls button:has(mat-icon:contains('arrow_forward'))",
      "flow-generate-icon-button button",
      "button:has(mat-icon:contains('arrow_forward'))",
      "button[aria-label*='Generate']",
      "button[aria-label*='Submit']"
    ],
    // 4. Configuration Pill & Modal
    configPill: [
      "button:has(span:contains('Video'))",
      "button:has(span:contains('Image'))",
      "button:has(span:contains('720p'))",
      "div.submit-controls button:has(mat-icon:contains('tune'))",
      "div.submit-controls button:has(mat-icon:contains('crop'))"
    ],
    // 5. Model Dropdown & Menu
    modelDropdown: [
      "flow-prompt-box-settings button:has(mat-icon:contains('arrow_drop_down'))",
      "button[aria-label*='Select model']",
      "mat-select"
    ],
    // 6. Characters Studio
    charactersTab: [
      "mat-list-item:has(mat-icon:contains('accessibility_new'))",
      "a[href*='/characters']",
      "button:has(mat-icon:contains('accessibility_new'))"
    ],
    characterTiles: [
      "flow-character-tile",
      "[data-character-name]",
      ".character-tile-name"
    ],
    // 7. Output Tiles & Menus
    outputTiles: [
      "flow-grid-tile-container",
      "cdk-virtual-scroll-viewport flow-grid-tile-container",
      "[data-tile-id]"
    ],
    moreOptionsButton: [
      "button:has(mat-icon:contains('more_vert'))",
      "button[aria-label*='More options']",
      "button[aria-label*='more']"
    ],
    downloadMenuItem: [
      "flow-menu-item mat-icon:contains('download')",
      "button:has(mat-icon:contains('download'))",
      "[role='menuitem']:has(mat-icon:contains('download'))"
    ],
    qualityOptions: {
      "1080p": "button:has(span:contains('1080p')), [role='menuitem']:contains('1080p')",
      "2k": "button:has(span:contains('2K')), [role='menuitem']:contains('2K')",
      "4k": "button:has(span:contains('4K')), [role='menuitem']:contains('4K')"
    }
  };

  // Helper to find visible element from candidates
  function findElement(candidateList) {
    if (typeof candidateList === "string") candidateList = [candidateList];
    for (const sel of candidateList) {
      try {
        let el = null;
        if (sel.includes(":contains(") || sel.includes(":has(")) {
          // Manual DOM matching for non-standard jQuery pseudo-selectors
          const parts = sel.split(/\s+/);
          const baseTag = parts[0].replace(/:.*$/, "") || "*";
          const all = Array.from(document.querySelectorAll(baseTag));
          el = all.find(e => {
            if (sel.includes("add") && !e.textContent.includes("add") && !e.innerHTML.includes("add")) return false;
            if (sel.includes("arrow_forward") && !e.innerHTML.includes("arrow_forward")) return false;
            return true;
          });
        } else {
          el = document.querySelector(sel);
        }
        if (el && (el.offsetWidth > 0 || el.offsetHeight > 0)) return el;
      } catch {}
    }
    return null;
  }

  // Extract last video frame via HTML5 Canvas (for seamless isConcat video continuation)
  async function extractLastVideoFrame(videoSrc) {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.crossOrigin = "anonymous";
      video.preload = "auto";

      const cleanup = () => {
        video.src = "";
        video.remove();
      };

      const timer = setTimeout(() => {
        cleanup();
        reject(new Error("Timeout extracting last video frame"));
      }, 25000);

      video.addEventListener("loadedmetadata", () => {
        video.currentTime = Math.max(0, video.duration - 0.05);
      });

      video.addEventListener("seeked", () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth || 1280;
          canvas.height = video.videoHeight || 720;
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("Could not obtain canvas 2D context");

          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
          clearTimeout(timer);
          cleanup();
          resolve(dataUrl);
        } catch (err) {
          clearTimeout(timer);
          cleanup();
          reject(err);
        }
      });

      video.addEventListener("error", (e) => {
        clearTimeout(timer);
        cleanup();
        reject(new Error("Failed to load video element for frame extraction: " + (e?.message || "error")));
      });

      video.src = videoSrc;
      video.load();
    });
  }

  // Scan project characters from Google Flow DOM with multi-selector precision
  function scanProjectCharacters() {
    const characters = [];
    const seen = new Set();
    const selectors = [
      "flow-character-tile",
      "[data-character-name]",
      ".character-tile-name",
      ".character-name",
      ".character-tile",
      "flow-character-chip",
      "flow-ingredient-chip[data-type='character']",
      "button.asset-item"
    ].join(", ");

    const elements = document.querySelectorAll(selectors);
    for (const el of elements) {
      let rawName = el.getAttribute("data-character-name") || 
                    el.getAttribute("data-name") || 
                    el.querySelector(".character-tile-name, .character-name, .name")?.textContent?.trim() || 
                    el.textContent?.trim() || "";
      let cleanName = rawName.replace(/(accessibility_new|favorite|more_vert|tune|person|edit|delete)+/gi, "").trim();
      cleanName = cleanName.replace(/^Character\s*:\s*/i, "").replace(/^@/, "").split("\n")[0].trim();
      if (cleanName && cleanName.length > 1 && cleanName.length < 50 && !seen.has(cleanName.toLowerCase())) {
        seen.add(cleanName.toLowerCase());
        characters.push(cleanName);
      }
    }
    return characters;
  }

  // Trigger high-resolution upscale download via UI hover menus
  async function triggerUpscaleDownload(quality = "1080p") {
    const qualityTarget = quality.toLowerCase();
    const tiles = document.querySelectorAll("flow-grid-tile-container, cdk-virtual-scroll-viewport flow-grid-tile-container");
    if (!tiles.length) throw new Error("No output media tiles found in current Flow project.");

    const firstTile = tiles[0];
    firstTile.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 400));

    const moreBtn = firstTile.querySelector("button:has(mat-icon:contains('more_vert')), button[aria-label*='more'], button[aria-label*='More']");
    if (moreBtn) {
      moreBtn.click();
      await new Promise((r) => setTimeout(r, 400));
    }

    const menuItems = Array.from(document.querySelectorAll("flow-menu-item, mat-menu-item, [role='menuitem']"));
    const option = menuItems.find(el => {
      const txt = el.textContent?.toLowerCase() || "";
      if (qualityTarget.includes("4k") && txt.includes("4k")) return true;
      if (qualityTarget.includes("2k") && txt.includes("2k")) return true;
      if (qualityTarget.includes("1080") && txt.includes("1080")) return true;
      return false;
    });

    if (option) {
      option.click();
      return { triggered: true, quality };
    }

    return { triggered: false, reason: "Quality menu option not visible" };
  }

  // Fill Prompt in Google Flow textbox & submit
  async function fillPromptInFlow(promptText) {
    const box = findElement(SELECTORS.promptTextarea);
    if (!box) throw new Error("Could not locate Google Flow prompt input box.");

    box.focus();
    box.click();
    await new Promise(r => setTimeout(r, 200));

    if (box.tagName === "TEXTAREA" || box.tagName === "INPUT") {
      box.value = promptText;
      box.dispatchEvent(new Event("input", { bubbles: true }));
      box.dispatchEvent(new Event("change", { bubbles: true }));
    } else {
      // ContentEditable div
      box.innerText = promptText;
      box.dispatchEvent(new Event("input", { bubbles: true }));
    }

    await new Promise(r => setTimeout(r, 400));

    const submit = findElement(SELECTORS.submitButton);
    if (submit) {
      submit.click();
      return { submitted: true };
    } else {
      // Try Enter key
      box.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", keyCode: 13, bubbles: true }));
      return { submitted: true, via: "EnterKey" };
    }
  }

  // Handle messages from Extension Background Service Worker
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "PING_PAGE") {
      sendResponse({ status: "alive", url: window.location.href, title: document.title });
      return false;
    }

    if (msg.type === "EXECUTE_MAIN") {
      callMain(msg.action, msg.args)
        .then((result) => sendResponse({ success: true, result }))
        .catch((err) => sendResponse({ success: false, error: err.message }));
      return true;
    }

    if (msg.type === "GET_FLOW_KNOWLEDGE") {
      sendResponse({
        success: true,
        knowledge: {
          selectors: SELECTORS,
          url: window.location.href,
          hasAddImage: !!findElement(SELECTORS.addImageButton),
          hasPromptInput: !!findElement(SELECTORS.promptTextarea),
          hasSubmitButton: !!findElement(SELECTORS.submitButton),
          hasConfigPill: !!findElement(SELECTORS.configPill)
        }
      });
      return false;
    }

    if (msg.type === "UI_FILL_AND_SUBMIT") {
      fillPromptInFlow(msg.prompt)
        .then(res => sendResponse({ success: true, res }))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;
    }

    if (msg.type === "EXTRACT_LAST_FRAME") {
      extractLastVideoFrame(msg.videoSrc)
        .then((dataUrl) => sendResponse({ success: true, dataUrl }))
        .catch((err) => sendResponse({ success: false, error: err.message }));
      return true;
    }

    if (msg.type === "SCAN_CHARACTERS") {
      try {
        const characters = scanProjectCharacters();
        sendResponse({ success: true, characters });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
      return false;
    }

    if (msg.type === "TRIGGER_UPSCALE") {
      triggerUpscaleDownload(msg.quality)
        .then((res) => sendResponse({ success: true, res }))
        .catch((err) => sendResponse({ success: false, error: err.message }));
      return true;
    }

    return false;
  });

  // Notify service worker that page is ready
  try {
    chrome.runtime.sendMessage({
      type: "PAGE_ATTACHED",
      url: window.location.href
    }).catch(() => {});
  } catch {}
})();
