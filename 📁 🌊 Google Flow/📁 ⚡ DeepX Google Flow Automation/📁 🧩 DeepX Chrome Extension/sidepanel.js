// DeepX Side Panel Controller
const ANTIGRAVITY_CONNECT_PROMPT = `Connect to DeepX Flow Bridge MCP server (deepx-flow). Verify connection status via deepx_status tool. When ready: true, declare that you are connected and standing by to generate images and videos with 100% fidelity to my scripts and data.`;

const ANTIGRAVITY_DISCONNECT_PROMPT = `Disconnect from DeepX Flow Bridge MCP. Pause all automated generation dispatching, halt any active jobs, and enter offline standby mode until I tell you to reconnect.`;

async function copyTextToClipboard(text, successMsg) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
  showToast(successMsg);
}

const MASTER_ANTIGRAVITY_PROMPT = `Set up DeepX Flow Bridge on my machine so you (Antigravity) can generate images and videos through my own logged-in Google Flow session (no API cost).

This is safe to run even if it's already set up — check each step first and skip anything already done. Never force or reinstall something that's already working.

1. Check Node.js: Run \`node --version\`. Ensure v20 or higher is installed.
2. Verify the DeepX MCP server is configured in my user-level Antigravity config (~/.gemini/config/mcp_config.json):
   Ensure the following entry exists in "mcpServers":
   {
     "deepx-flow": {
       "command": "node",
       "args": ["<PATH_TO_ANTIGRAVITY_FLOW_BRIDGE>/deepx-mcp/bin/deepx-mcp.mjs"] (use your local absolute path to deepx-mcp.mjs)
     }
   }
3. Check the connection:
   Verify the DeepX bridge is running on ws://127.0.0.1:8792/ws and Google Flow (https://flow.google.com or https://labs.google/fx/tools/flow) is open, logged in, and kept visible.
   When connected, say so out loud in this exact spirit:
   "Connected! I can generate images and videos on Google Flow now — just ask."

4. Core Architecture: Brain vs. Hands Principle (CRITICAL):
   - You (Antigravity) are the WHOLE BRAIN and Creative Director.
   - The DeepX Extension is ONLY the HANDS and execution bridge.
   - NEVER jump straight to generating or uploading videos without deeply analyzing my concept, reading our whole conversation history, and understanding the store/story narrative.
   - Give yourself time to think, analyze visual themes, and plan continuity before touching generation.

5. Mandatory 4-Step Production Protocol:
   - Step 1 (Story Analysis): Analyze our whole chat, story theme, visual anchors, and character consistency.
   - Step 2 (Mandatory Alignment Interview): ALWAYS ask me for:
     1. Aspect Ratio (16:9 Landscape / YouTube, 9:16 Portrait / TikTok/Reels, 1:1 Square, 4:3, 3:4)
     2. Timing & Duration (5s, 8s, or 10s for Omni)
     3. Quality & Resolution (Original, 720p, 1080p, 2K, 4K)
     4. Quantity (1x, 2x, 4x per prompt, or batch scene count)
     5. Model (Veo 3.1 Quality, Veo 3.1 Lite, Veo Omni, Imagen 3)
     6. Visual Style & Aesthetic (Camera motion, lighting, character tags @character)
   - Step 3 (Storyboard & Scene Review): Present the planned prompts (#001_name, #002_name, isConcat chaining) for my confirmation.
   - Step 4 (Final Step Execution): ONLY after I confirm, invoke the DeepX MCP tools to render on Google Flow in real time.`;

document.addEventListener("DOMContentLoaded", () => {
  const spBadge = document.getElementById("spBadge");
  const spStandbyBanner = document.getElementById("spStandbyBanner");
  const spWsStatus = document.getElementById("spWsStatus");
  const spTabStatus = document.getElementById("spTabStatus");
  const spProjectId = document.getElementById("spProjectId");
  const spAuthStatus = document.getElementById("spAuthStatus");
  const spBtnCopyPrompt = document.getElementById("spBtnCopyPrompt");
  const spBtnScanChars = document.getElementById("spBtnScanChars");
  const spCharList = document.getElementById("spCharList");
  const spLogBox = document.getElementById("spLogBox");
  const spToast = document.getElementById("spToast");
  const spBtnTogglePower = document.getElementById("spBtnTogglePower");
  const spPowerStatusText = document.getElementById("spPowerStatusText");
  const spPowerHintText = document.getElementById("spPowerHintText");
  const spWsCopyBadge = document.getElementById("spWsCopyBadge");
  const spLockOverlay = document.getElementById("spLockOverlay");
  const spBtnSubscribeUnlock = document.getElementById("spBtnSubscribeUnlock");
  const spLockFooterNote = document.getElementById("spLockFooterNote");
  const spSponsorBadge = document.getElementById("spSponsorBadge");

  const spSubStatusBox = document.getElementById("spSubStatusBox");
  const spSubStatusTick = document.getElementById("spSubStatusTick");
  const spSubStatusTitle = document.getElementById("spSubStatusTitle");
  const spSubStatusSub = document.getElementById("spSubStatusSub");
  const spBtnAutoCheck = document.getElementById("spBtnAutoCheck");
  const spMobileAppConfirmRow = document.getElementById("spMobileAppConfirmRow");
  const spBtnMobileAppUnlock = document.getElementById("spBtnMobileAppUnlock");

  let lastWsConnected = false;
  let currentPowerEnabled = true;
  let isUnlocked = false;
  let isCheckingRealtime = false;

  function setLockUI(unlocked) {
    isUnlocked = !!unlocked;
    try {
      localStorage.setItem("deepx_unlocked", isUnlocked ? "true" : "false");
    } catch (e) {}

    if (isUnlocked) {
      document.documentElement.classList.remove("locked");
      document.documentElement.classList.add("unlocked");
    } else {
      document.documentElement.classList.remove("unlocked");
      document.documentElement.classList.add("locked");
    }
    if (isUnlocked) {
      if (spMobileAppConfirmRow) spMobileAppConfirmRow.style.display = "none";
      if (spSubStatusBox) spSubStatusBox.className = "sub-status-box verified";
      if (spSubStatusTick) spSubStatusTick.innerHTML = "✔";
      if (spSubStatusTitle) spSubStatusTitle.textContent = "✔ Channel Subscribed!";
      if (spSubStatusSub) spSubStatusSub.textContent = "Verified in real-time via YouTube";
      if (spBtnAutoCheck) spBtnAutoCheck.innerHTML = "<span>✔ Verified</span>";

      if (spBtnSubscribeUnlock) {
        spBtnSubscribeUnlock.className = "btn-subscribe-action subscribed";
        spBtnSubscribeUnlock.innerHTML = '<span class="green-tick-pill-icon">✔</span> <span>Subscribed & Unlocked 🔓</span>';
      }
      if (spLockFooterNote) {
        spLockFooterNote.textContent = "✅ Real-time verified! Enjoy DeepX Flow Studio.";
      }
      if (spSponsorBadge) spSponsorBadge.classList.add("visible");
      setTimeout(() => {
        if (spLockOverlay) spLockOverlay.classList.remove("visible");
      }, 800);
    } else {
      if (spLockOverlay) spLockOverlay.classList.add("visible");
      if (spSponsorBadge) spSponsorBadge.classList.remove("visible");
      if (spSubStatusBox) spSubStatusBox.className = "sub-status-box";
      if (spSubStatusTick) spSubStatusTick.innerHTML = "🔒";
      if (spSubStatusTitle) spSubStatusTitle.textContent = "Subscription Required";
      if (spSubStatusSub) spSubStatusSub.textContent = "Subscribe to @dipeshkyd to unlock";
      if (spBtnAutoCheck && !isCheckingRealtime) spBtnAutoCheck.innerHTML = "<span>🔄 Auto-Check</span>";

      if (spBtnSubscribeUnlock && !isCheckingRealtime) {
        spBtnSubscribeUnlock.className = "btn-subscribe-action dim";
        spBtnSubscribeUnlock.innerHTML = `
          <svg viewBox="0 0 24 24" width="18" height="18" fill="#ffffff"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
          <span id="spBtnActionText">Subscribe to Unlock</span>
        `;
      }
    }
  }

  // Instant Auto-Check Function across all open YouTube tabs
  async function triggerAutoCheck() {
    if (isUnlocked) return true;
    if (spBtnAutoCheck) spBtnAutoCheck.innerHTML = '<span>⏳ Checking...</span>';
    
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "AUTO_CHECK_SUBSCRIPTION" }, (res) => {
        if (res?.isUnlocked) {
          setLockUI(true);
          showToast("🎉 Verified! DeepX Flow Studio Unlocked!");
          log("🎉 Verified subscription! DeepX Flow Studio Unlocked.", "success");
          resolve(true);
          return;
        }

        // Direct tab query for dual-engine redundancy
        chrome.tabs.query({ url: ["*://*.youtube.com/*", "*://youtube.com/*"] }, async (tabs) => {
          if (!tabs || tabs.length === 0) {
            if (spBtnAutoCheck && !isUnlocked) spBtnAutoCheck.innerHTML = '<span>🔄 Auto-Check</span>';
            resolve(false);
            return;
          }

          let found = false;
          for (const t of tabs) {
            if (!t.id) continue;
            try {
              const checkRes = await chrome.scripting.executeScript({
                target: { tabId: t.id },
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

              const status = checkRes?.[0]?.result;
              if (status?.isSubscribed === true) {
                found = true;
                chrome.storage.local.set({ extensionUnlocked: true, subscribedChannel: "@dipeshkyd", unlockedAt: Date.now() });
                chrome.runtime.sendMessage({ type: "YOUTUBE_SUBSCRIBE_CONFIRMED" });
                setLockUI(true);
                showToast("🎉 Verified! DeepX Flow Studio Unlocked!");
                log("🎉 Verified subscription in open tab! DeepX Flow Studio Unlocked.", "success");
                break;
              } else if (status?.isExplicitUnsubscribed === true) {
                chrome.storage.local.set({ extensionUnlocked: false, unlockedAt: null });
                setLockUI(false);
              }
            } catch (err) {}
          }

          if (!found) {
            if (spBtnAutoCheck && !isUnlocked) spBtnAutoCheck.innerHTML = '<span>🔄 Auto-Check</span>';
          }
          resolve(found);
        });
      });
    });
  }

  // Check initial lock state from storage immediately
  chrome.storage.local.get(["extensionUnlocked"], (res) => {
    setLockUI(!!res.extensionUnlocked);
    if (!res.extensionUnlocked) {
      triggerAutoCheck();
    }
  });

  // Handle Auto-Check button click
  if (spBtnAutoCheck) {
    spBtnAutoCheck.addEventListener("click", (e) => {
      e.stopPropagation();
      triggerAutoCheck().then((unlocked) => {
        if (!unlocked) {
          showToast("Not detected yet. Click Subscribe on YouTube tab!");
        }
      });
    });
  }

  // Mobile App One-Tap Unlock Handler
  if (spBtnMobileAppUnlock) {
    spBtnMobileAppUnlock.addEventListener("click", () => {
      chrome.storage.local.set({ extensionUnlocked: true, subscribedChannel: "@dipeshkyd", unlockedAt: Date.now() });
      chrome.runtime.sendMessage({ type: "YOUTUBE_SUBSCRIBE_CONFIRMED" });
      setLockUI(true);
      showToast("🎉 Verified! DeepX Flow Studio Unlocked!");
      log("🎉 Subscribed via YouTube mobile app! Studio unlocked.", "success");
    });
  }

  // Sponsor Badge click listener: 1-click re-lock for verification & testing
  if (spSponsorBadge) {
    spSponsorBadge.style.cursor = "pointer";
    spSponsorBadge.title = "Verified @dipeshkyd (Click to re-lock for testing)";
    spSponsorBadge.addEventListener("click", () => {
      chrome.storage.local.set({ extensionUnlocked: false, unlockedAt: null });
      setLockUI(false);
      chrome.runtime.sendMessage({ type: "LOCK_EXTENSION" });
      showToast("🔒 Re-locked for testing. Subscribe on YouTube to unlock!");
      log("Locked extension for testing via badge click.", "info");
    });
  }

  // Handle single unified Subscribe to Unlock button
  if (spBtnSubscribeUnlock) {
    spBtnSubscribeUnlock.addEventListener("click", async () => {
      if (isUnlocked) return;

      // FIRST: Check if already subscribed in any currently open YouTube tab
      spBtnSubscribeUnlock.className = "btn-subscribe-action checking";
      spBtnSubscribeUnlock.innerHTML = '<span style="font-size: 15px;">⏳</span> <span>Auto-Checking Open Tabs...</span>';
      
      const alreadySubscribed = await triggerAutoCheck();
      if (alreadySubscribed) {
        return;
      }

      // If not yet detected in open tabs, open the channel tab with subscription dialog
      chrome.tabs.create({ url: "https://www.youtube.com/@dipeshkyd?sub_confirmation=1" });
      
      isCheckingRealtime = true;
      if (spMobileAppConfirmRow) spMobileAppConfirmRow.style.display = "flex";
      spBtnSubscribeUnlock.innerHTML = '<span style="font-size: 15px;">⏳</span> <span>Checking Subscription in Real-Time...</span>';
      if (spLockFooterNote) {
        spLockFooterNote.innerHTML = '⚡ Waiting for subscription on YouTube tab... Click <strong>Subscribe</strong>!';
      }
      showToast("Opening @dipeshkyd... Click Subscribe on YouTube!");
      log("Opening YouTube channel @dipeshkyd to subscribe...", "info");

      // Start rapid local check loop for instant reaction
      let checks = 0;
      const checker = setInterval(() => {
        checks++;
        chrome.storage.local.get(["extensionUnlocked"], (st) => {
          if (st.extensionUnlocked) {
            clearInterval(checker);
            isCheckingRealtime = false;
            setLockUI(true);
            showToast("🎉 Subscribed & Unlocked! Welcome to DeepX Flow Studio!");
            log("🎉 DeepX Flow Studio unlocked in real-time via YouTube! Full generation active.", "success");
            updateStatus();
          } else if (checks % 3 === 0) {
            triggerAutoCheck();
          }
          
          if (checks > 120) {
            clearInterval(checker);
            isCheckingRealtime = false;
            if (!isUnlocked) {
              setLockUI(false);
            }
          }
        });
      }, 500);
    });
  }

  function log(msg, type = "info") {
    const el = document.createElement("div");
    el.className = `log-entry ${type}`;
    const time = new Date().toLocaleTimeString();
    el.textContent = `[${time}] ${msg}`;
    spLogBox.appendChild(el);
    spLogBox.scrollTop = spLogBox.scrollHeight;
  }

  function showToast(msg) {
    spToast.textContent = msg;
    spToast.classList.add("show");
    setTimeout(() => spToast.classList.remove("show"), 2500);
  }

  function setPowerUI(enabled) {
    currentPowerEnabled = enabled;
    if (enabled) {
      spBadge.textContent = "ON (Active) 🟢";
      spBadge.className = "badge active";
      spStandbyBanner.classList.remove("visible");
      if (spPowerStatusText) {
        spPowerStatusText.textContent = "ON (Active)";
        spPowerStatusText.style.color = "var(--success)";
      }
      if (spBtnTogglePower) {
        spBtnTogglePower.textContent = "Turn OFF";
        spBtnTogglePower.className = "btn-power btn-power-on";
      }
      if (spPowerHintText) {
        spPowerHintText.textContent = "Manual Power Control: DeepX stays ON until you manually turn it OFF.";
      }
    } else {
      spBadge.textContent = "OFF (Paused) ⚪";
      spBadge.className = "badge standby";
      spStandbyBanner.classList.add("visible");
      spStandbyBanner.innerHTML = `⚠️ <strong>DeepX is paused (OFF)</strong>. Click <strong>Turn ON</strong> above to activate.`;
      if (spPowerStatusText) {
        spPowerStatusText.textContent = "OFF (Paused)";
        spPowerStatusText.style.color = "#b0bec5";
      }
      if (spBtnTogglePower) {
        spBtnTogglePower.textContent = "Turn ON";
        spBtnTogglePower.className = "btn-power btn-power-off";
      }
      if (spPowerHintText) {
        spPowerHintText.textContent = "DeepX is OFF. Click Turn ON to activate.";
      }
    }
  }

  // Keep service worker alive 24/7 while side panel is open
  let keepAlivePort = null;
  function connectKeepAlivePort() {
    try {
      keepAlivePort = chrome.runtime.connect({ name: "deepx_keepalive" });
      keepAlivePort.onDisconnect.addListener(() => {
        keepAlivePort = null;
        setTimeout(connectKeepAlivePort, 1000);
      });
    } catch {
      setTimeout(connectKeepAlivePort, 2000);
    }
  }
  connectKeepAlivePort();
  setInterval(() => {
    if (keepAlivePort) {
      try { keepAlivePort.postMessage({ type: "PING" }); } catch { connectKeepAlivePort(); }
    } else {
      connectKeepAlivePort();
    }
  }, 5000);

  // Toggle Power Button (instant response)
  if (spBtnTogglePower) {
    spBtnTogglePower.addEventListener("click", () => {
      const targetState = !currentPowerEnabled;
      setPowerUI(targetState);
      showToast(targetState ? "DeepX Extension turned ON" : "DeepX Extension turned OFF");
      log(targetState ? "Extension activated (ON)" : "Extension manually paused (OFF)", targetState ? "success" : "warn");
      chrome.runtime.sendMessage({ type: "SET_EXTENSION_ACTIVE", active: targetState }, () => {
        updateStatus();
      });
    });
  }

  const spMcpHubBadge = document.getElementById("spMcpHubBadge");
  const spBtnOpenAntigravity = document.getElementById("spBtnOpenAntigravity");
  const spBtnCopyConnectPrompt = document.getElementById("spBtnCopyConnectPrompt");
  const spBtnCopyDisconnectPrompt = document.getElementById("spBtnCopyDisconnectPrompt");

  function updateMcpHubUI(isConnected) {
    if (isConnected) {
      if (spMcpHubBadge) {
        spMcpHubBadge.textContent = "CONNECTED 🟢";
        spMcpHubBadge.style.background = "rgba(0, 230, 118, 0.18)";
        spMcpHubBadge.style.color = "var(--success)";
      }
      if (spBtnOpenAntigravity) {
        spBtnOpenAntigravity.innerHTML = '<span>🟢</span> Antigravity MCP Connected';
        spBtnOpenAntigravity.style.background = "linear-gradient(135deg, #00e676 0%, #00b0ff 100%)";
        spBtnOpenAntigravity.title = "Antigravity MCP Bridge is connected & active. Click to focus Antigravity IDE.";
      }
      if (spBtnCopyDisconnectPrompt) {
        spBtnCopyDisconnectPrompt.innerHTML = '<span>🔌</span> Disconnect MCP';
        spBtnCopyDisconnectPrompt.style.background = "rgba(255, 82, 82, 0.16)";
        spBtnCopyDisconnectPrompt.style.color = "var(--danger)";
        spBtnCopyDisconnectPrompt.style.borderColor = "rgba(255, 82, 82, 0.55)";
        spBtnCopyDisconnectPrompt.style.opacity = "1";
        spBtnCopyDisconnectPrompt.title = "Directly disconnect and quit Antigravity MCP server connection (Turn OFF)";
      }
      if (spBtnCopyConnectPrompt) {
        spBtnCopyConnectPrompt.innerHTML = '<span>⚡</span> Copy Connect Prompt';
        spBtnCopyConnectPrompt.style.background = "rgba(0, 230, 118, 0.14)";
        spBtnCopyConnectPrompt.style.color = "var(--success)";
        spBtnCopyConnectPrompt.style.borderColor = "rgba(0, 230, 118, 0.45)";
        spBtnCopyConnectPrompt.title = "Copy 1-click connect prompt for Antigravity";
      }
    } else {
      if (spMcpHubBadge) {
        spMcpHubBadge.textContent = "DISCONNECTED 🔴";
        spMcpHubBadge.style.background = "rgba(255, 82, 82, 0.18)";
        spMcpHubBadge.style.color = "var(--danger)";
      }
      if (spBtnOpenAntigravity) {
        spBtnOpenAntigravity.innerHTML = '<span>🚀</span> Open Antigravity &amp; Paste Prompt';
        spBtnOpenAntigravity.style.background = "linear-gradient(135deg, #00e5ff 0%, #00b0ff 100%)";
        spBtnOpenAntigravity.title = "Launch Antigravity and copy connection prompt";
      }
      if (spBtnCopyDisconnectPrompt) {
        spBtnCopyDisconnectPrompt.innerHTML = '<span>🔌</span> Disconnect MCP';
        spBtnCopyDisconnectPrompt.style.background = "rgba(255, 82, 82, 0.10)";
        spBtnCopyDisconnectPrompt.style.color = "var(--text-muted)";
        spBtnCopyDisconnectPrompt.style.borderColor = "rgba(255, 82, 82, 0.30)";
        spBtnCopyDisconnectPrompt.style.opacity = "0.75";
        spBtnCopyDisconnectPrompt.title = "Antigravity MCP server is currently disconnected (OFF)";
      }
      if (spBtnCopyConnectPrompt) {
        spBtnCopyConnectPrompt.innerHTML = '<span>⚡</span> Connect MCP';
        spBtnCopyConnectPrompt.style.background = "rgba(0, 230, 118, 0.16)";
        spBtnCopyConnectPrompt.style.color = "var(--success)";
        spBtnCopyConnectPrompt.style.borderColor = "rgba(0, 230, 118, 0.55)";
        spBtnCopyConnectPrompt.title = "Connect to Antigravity MCP Server & copy connect prompt";
      }
    }
  }

  if (spBtnOpenAntigravity) {
    spBtnOpenAntigravity.addEventListener("click", () => {
      if (lastWsConnected) {
        showToast("🟢 Antigravity MCP is connected and active!");
        log("Antigravity MCP Bridge is active. Opening Antigravity workspace...", "success");
        window.location.href = "antigravity://open";
      } else {
        copyTextToClipboard(ANTIGRAVITY_CONNECT_PROMPT, "⚡ Connect Prompt Copied! Launching Antigravity...");
        log("Connect prompt copied to clipboard. Launching Antigravity...", "info");
        window.location.href = "antigravity://open";
        chrome.runtime.sendMessage({ type: "CONNECT_MCP" });
      }
    });
  }

  if (spBtnCopyConnectPrompt) {
    spBtnCopyConnectPrompt.addEventListener("click", () => {
      copyTextToClipboard(ANTIGRAVITY_CONNECT_PROMPT, "⚡ Connect Prompt Copied to Clipboard!");
      log("Connect prompt copied. Triggering MCP connection...", "info");
      fetch("http://127.0.0.1:8792/api/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: "connect" })
      }).catch(() => {});
      chrome.runtime.sendMessage({ type: "CONNECT_MCP" }, (res) => {
        showToast(res?.connected ? "🟢 Antigravity MCP Connected (Turned ON)!" : "⏳ Connecting to Antigravity MCP...");
        log(res?.connected ? "Antigravity MCP Connected successfully!" : "Connection attempt dispatched.", res?.connected ? "success" : "info");
        if (res?.connected) {
          lastWsConnected = true;
          updateMcpHubUI(true);
        }
        updateStatus();
      });
    });
  }

  if (spBtnCopyDisconnectPrompt) {
    spBtnCopyDisconnectPrompt.addEventListener("click", () => {
      copyTextToClipboard(ANTIGRAVITY_DISCONNECT_PROMPT, "🔌 MCP Disconnected! Disconnect Prompt Copied.");
      log("Disconnecting Antigravity MCP Bridge...", "warn");
      lastWsConnected = false;
      updateMcpHubUI(false);
      fetch("http://127.0.0.1:8792/api/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: "disconnect" })
      }).catch(() => {});
      chrome.runtime.sendMessage({ type: "DISCONNECT_MCP" }, () => {
        showToast("🔌 Antigravity MCP Disconnected (Turned OFF)!");
        log("Antigravity MCP Bridge manually disconnected (OFF).", "warn");
        updateStatus();
      });
    });
  }

  // Copy Master Prompt
  spBtnCopyPrompt.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(MASTER_ANTIGRAVITY_PROMPT);
      showToast("Master Prompt Copied for Antigravity!");
      log("Master prompt copied to clipboard for Antigravity AI Agent", "success");
    } catch {
      const ta = document.createElement("textarea");
      ta.value = MASTER_ANTIGRAVITY_PROMPT;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      showToast("Master Prompt Copied!");
      log("Master prompt copied via fallback", "success");
    }
  });

  // Scan characters in current project (Dual-Engine: Content Script + Service Worker Fallback)
  spBtnScanChars.addEventListener("click", async () => {
    log("Scanning project characters from Google Flow DOM...", "info");
    const tabs = await chrome.tabs.query({ url: ["*://flow.google.com/*", "*://labs.google/*"] });
    if (!tabs.length) {
      log("Cannot scan: No Google Flow tab found.", "error");
      showToast("Please open flow.google.com to scan characters.");
      return;
    }

    function renderCharacters(characters) {
      spCharList.innerHTML = "";
      if (!characters || characters.length === 0) {
        spCharList.innerHTML = `<span style="color: var(--text-muted); font-size: 11px;">No characters defined yet in this project.</span>`;
        log("Scan complete: 0 characters found.", "info");
      } else {
        characters.forEach((c) => {
          const charName = typeof c === "string" ? c : (c.name || "character");
          const tag = document.createElement("span");
          tag.className = "tag";
          tag.style.cursor = "pointer";
          tag.title = "Click to insert @" + charName + " into prompt";
          tag.textContent = `@${charName}`;
          tag.addEventListener("click", () => {
            if (spMultiPromptText) {
              const pos = spMultiPromptText.selectionStart || spMultiPromptText.value.length;
              const text = spMultiPromptText.value;
              spMultiPromptText.value = text.slice(0, pos) + ` @${charName} ` + text.slice(pos);
              spMultiPromptText.focus();
              const scenes = getParsedScenes();
              const unit = currentRapidMode === "video" ? "Scene" : "Image Prompt";
              spSceneCounter.textContent = `${scenes.length} ${unit}${scenes.length === 1 ? "" : "s"}`;
              showToast(`Inserted @${charName} into prompt!`);
            }
          });
          spCharList.appendChild(tag);
        });
        const charNames = characters.map(c => typeof c === "string" ? c : c.name);
        log(`Scan complete: Found ${characters.length} character(s): ${charNames.join(", ")}`, "success");
        showToast(`Found ${characters.length} character(s)!`);
      }
    }

    chrome.tabs.sendMessage(tabs[0].id, { type: "SCAN_CHARACTERS" }, (res) => {
      if (!chrome.runtime.lastError && res?.success && res.characters && res.characters.length > 0) {
        renderCharacters(res.characters);
      } else {
        // Fallback to service worker handleListCharacters
        chrome.runtime.sendMessage({ type: "SCAN_PROJECT_CHARACTERS" }, (swRes) => {
          if (swRes?.success && swRes.characters && swRes.characters.length > 0) {
            renderCharacters(swRes.characters);
          } else {
            renderCharacters(res?.characters || []);
          }
        });
      }
    });
  });

  // Refresh status
  function updateStatus() {
    chrome.runtime.sendMessage({ type: "GET_EXTENSION_STATUS" }, (res) => {
      if (!res) return;

      lastWsConnected = !!res.wsConnected;
      updateMcpHubUI(lastWsConnected);

      // Antigravity MCP Connection & Copy Option display
      if (!res.wsConnected) {
        // Disconnected: show copy badge & copy button
        spWsStatus.textContent = "Disconnected 🔴";
        spWsStatus.style.color = "var(--danger)";
        spWsStatus.title = "DeepX Bridge offline (Port 8792). Click to copy Master Prompt & connect.";
        if (spWsCopyBadge) spWsCopyBadge.style.display = "inline";
        if (spBtnCopyPrompt) spBtnCopyPrompt.style.display = "flex";
      } else {
        // Connected: DO NOT show copy option!
        spWsStatus.textContent = "Connected 🟢";
        spWsStatus.style.color = "var(--success)";
        spWsStatus.title = "Antigravity AI Agent is connected & ready";
        if (spWsCopyBadge) spWsCopyBadge.style.display = "none";
        if (spBtnCopyPrompt) spBtnCopyPrompt.style.display = "none";
      }

      // Flow Tab Attached
      if (res.flowTabAttached) {
        spTabStatus.textContent = "Attached";
        spTabStatus.style.color = "var(--success)";
      } else {
        spTabStatus.textContent = "Missing";
        spTabStatus.style.color = "var(--danger)";
      }

      // Power State (ON vs OFF)
      setPowerUI(res.isExtensionEnabled !== false);

      // Active Project Name & ID
      const currentPid = res.projectId;
      const currentPname = res.projectName;
      if (currentPname || currentPid) {
        const displayName = currentPname || (currentPid ? `${currentPid.slice(0, 14)}...` : "Active Project");
        spProjectId.textContent = displayName;
        spProjectId.title = `Project: ${currentPname || "Unnamed"}\nID: ${currentPid || "N/A"}`;
        spProjectId.style.color = "var(--accent)";
      } else if (res.flowTabAttached && res.account?.isLoggedIn) {
        spProjectId.textContent = "Open a Project ⚠️";
        spProjectId.title = "No active project open in Google Flow tab. Click to open.";
        spProjectId.style.color = "var(--warning)";
      } else {
        spProjectId.textContent = "None";
        spProjectId.title = "No Google Flow tab open";
        spProjectId.style.color = "var(--text-muted)";
      }

      // Logged-in Google Account info
      if (res.account?.isLoggedIn) {
        const name = res.account.accountName || "User";
        const email = res.account.email ? ` (${res.account.email})` : "";
        const plan = res.account.plan ? ` [${res.account.plan}]` : "";
        spAuthStatus.textContent = `${name}${email}${plan} ✅`;
        spAuthStatus.style.color = "var(--success)";
      } else if (res.flowTabAttached) {
        spAuthStatus.textContent = "Not Signed In ❌ (Click to connect)";
        spAuthStatus.style.color = "var(--danger)";
      } else {
        spAuthStatus.textContent = "No Flow Tab ⚠️";
        spAuthStatus.style.color = "var(--warning)";
      }

      if (typeof res.isUnlocked === "boolean") {
        setLockUI(res.isUnlocked);
      }
    });
  }

  // Interactive Live Session Matrix Click Handlers (Antigravity MCP, Account & Project Sync)
  const spCardWs = document.getElementById("spCardWs");
  const spCardAccount = document.getElementById("spCardAccount");
  const spCardProject = document.getElementById("spCardProject");
  const spCardTab = document.getElementById("spCardTab");
  const spBtnSyncAccount = document.getElementById("spBtnSyncAccount");

  // Click Antigravity MCP to copy Master Prompt (only when not connected)
  if (spCardWs) {
    spCardWs.addEventListener("click", async () => {
      if (lastWsConnected) {
        showToast("Antigravity MCP is already connected! 🟢");
        log("Antigravity MCP is already connected and ready.", "info");
        return;
      }
      try {
        await navigator.clipboard.writeText(MASTER_ANTIGRAVITY_PROMPT);
        showToast("📋 Master Prompt copied! Paste into Antigravity chat to connect.");
        log("Master prompt copied to clipboard! Paste into Antigravity chat.", "success");
      } catch {
        const ta = document.createElement("textarea");
        ta.value = MASTER_ANTIGRAVITY_PROMPT;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
        showToast("📋 Master Prompt copied! Paste into Antigravity chat.");
        log("Master prompt copied via fallback", "success");
      }
    });
  }

  // Click Project to refresh Real Project Name & ID from Flow tab
  function triggerProjectRefresh() {
    spProjectId.textContent = "Refreshing... 🔄";
    spProjectId.style.color = "var(--accent)";
    showToast("Refreshing active project from Google Flow...");
    log("Refreshing project name and ID from Google Flow tab...", "info");

    chrome.runtime.sendMessage({ type: "REFRESH_PROJECT_INFO" }, (res) => {
      if (res?.success && (res.projectName || res.projectId)) {
        const pName = res.projectName || "Active Project";
        const pId = res.projectId || "";
        spProjectId.textContent = pName;
        spProjectId.title = `Project: ${pName}\nID: ${pId}`;
        spProjectId.style.color = "var(--accent)";
        showToast(`Active Project: ${pName}`);
        log(`Refreshed Project: "${pName}" (${pId})`, "success");
        updateStatus();
      } else {
        chrome.runtime.sendMessage({ type: "SWITCH_TO_FLOW_AND_ACTIVATE" });
        showToast("Switched to Google Flow to select project");
        log("Switched to Google Flow tab to open/select project", "warn");
        updateStatus();
      }
    });
  }

  function triggerAccountSync() {
    spAuthStatus.textContent = "Syncing... 🔄";
    spAuthStatus.style.color = "var(--accent)";
    showToast("Syncing with Google Flow...");
    log("Syncing account & active project with Google Flow...", "info");

    chrome.runtime.sendMessage({ type: "SYNC_FLOW_ACCOUNT" }, (response) => {
      if (response?.success && response.account?.isLoggedIn) {
        const name = response.account.accountName || "User";
        const email = response.account.email ? ` (${response.account.email})` : "";
        const plan = response.account.plan ? ` [${response.account.plan}]` : "";
        spAuthStatus.textContent = `${name}${email}${plan} ✅`;
        spAuthStatus.style.color = "var(--success)";
        showToast(`Connected as ${name} (${response.account.plan || "Standard"})`);
        log(`Connected as ${name}${email} [${response.account.plan}]`, "success");
        updateStatus();
      } else {
        chrome.runtime.sendMessage({ type: "SWITCH_TO_FLOW_AND_ACTIVATE" });
        showToast("Switched to Google Flow to connect");
        log("Switched to Google Flow tab to connect account", "warn");
        updateStatus();
      }
    });
  }

  if (spCardAccount) spCardAccount.addEventListener("click", triggerAccountSync);
  if (spBtnSyncAccount) {
    spBtnSyncAccount.addEventListener("click", () => {
      triggerAccountSync();
      triggerProjectRefresh();
    });
  }
  if (spCardProject) spCardProject.addEventListener("click", triggerProjectRefresh);
  if (spCardTab) {
    spCardTab.addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: "SWITCH_TO_FLOW_AND_ACTIVATE" }, () => {
        showToast("Switched to Google Flow tab");
        updateStatus();
      });
    });
  }

  updateStatus();
  setInterval(updateStatus, 1500);

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "MCP_CONNECTION_STATE_CHANGED") {
      lastWsConnected = !!msg.connected;
      updateMcpHubUI(lastWsConnected);
      updateStatus();
    } else if (msg.type === "PROJECT_ID_UPDATED" || msg.type === "PROJECT_CHANGED" || msg.type === "FLOW_ACTIVE_STATE_CHANGED" || msg.type === "ACCOUNT_UPDATED") {
      updateStatus();
    }
  });

  // Mode Selector: Video vs Image (Realtime Toggle)
  const spModeVideoBtn = document.getElementById("spModeVideoBtn");
  const spModeImageBtn = document.getElementById("spModeImageBtn");
  const spVideoControlsRow = document.getElementById("spVideoControlsRow");
  const spImageControlsRow = document.getElementById("spImageControlsRow");
  const spSelectVideoModel = document.getElementById("spSelectVideoModel");
  const spSelectImageModel = document.getElementById("spSelectImageModel");
  const spSelectRatio = document.getElementById("spSelectRatio");
  const spSelectImageRatio = document.getElementById("spSelectImageRatio");
  const spSelectDuration = document.getElementById("spSelectDuration");
  const spSelectVideoCount = document.getElementById("spSelectVideoCount");
  const spSelectImageCount = document.getElementById("spSelectImageCount");
  const spMultiPromptText = document.getElementById("spMultiPromptText");
  const spSceneCounter = document.getElementById("spSceneCounter");
  const spBtnDispatchBatch = document.getElementById("spBtnDispatchBatch");

  let currentRapidMode = "video"; // "video" or "image"

  function updateModeUI(mode) {
    currentRapidMode = mode;
    if (mode === "video") {
      spModeVideoBtn.style.background = "linear-gradient(135deg, var(--accent), var(--purple))";
      spModeVideoBtn.style.color = "#090d16";
      spModeVideoBtn.style.border = "none";
      spModeImageBtn.style.background = "transparent";
      spModeImageBtn.style.color = "var(--text-muted)";
      spModeImageBtn.style.border = "1px solid transparent";

      spVideoControlsRow.style.display = "grid";
      spImageControlsRow.style.display = "none";

      spMultiPromptText.placeholder = "Scene 1: Cinematic wide shot of @boy wearing DeepX tech hat in neon alleyway #scene01\n\nScene 2: Close-up macro on the waterproof DeepX logo and stitching #scene02\n\nScene 3: Confident hero pose in the rain adjusting the hat #scene03";
      spBtnDispatchBatch.innerHTML = `<span>⚡</span> Dispatch All Video Scenes Back-to-Back (Parallel)`;
      if (spBtnAutoStoryboard) {
        spBtnAutoStoryboard.innerHTML = `<span>🚀</span> Launch Autonomous Storyboard Pipeline (Auto-Analyze & Auto-Chain)`;
      }
    } else {
      spModeImageBtn.style.background = "linear-gradient(135deg, var(--accent), var(--purple))";
      spModeImageBtn.style.color = "#090d16";
      spModeImageBtn.style.border = "none";
      spModeVideoBtn.style.background = "transparent";
      spModeVideoBtn.style.color = "var(--text-muted)";
      spModeVideoBtn.style.border = "1px solid transparent";

      spVideoControlsRow.style.display = "none";
      spImageControlsRow.style.display = "grid";

      spMultiPromptText.placeholder = "Image 1: Commercial studio product photography of DeepX performance hat on acrylic pedestal #hat_product_01\n\nImage 2: Lifestyle lookbook portrait of @boy wearing the matte-black DeepX hat #hat_lifestyle_02\n\nImage 3: Extreme macro texture shot of the glowing neon DeepX embroidery #hat_macro_03";
      spBtnDispatchBatch.innerHTML = `<span>⚡</span> Dispatch All Image Prompts Back-to-Back (Parallel)`;
      if (spBtnAutoStoryboard) {
        spBtnAutoStoryboard.innerHTML = `<span>🚀</span> Launch Autonomous Image Pipeline (Auto-Analyze & Render)`;
      }
    }

    const scenes = getParsedScenes();
    const unit = currentRapidMode === "video" ? "Scene" : "Image Prompt";
    spSceneCounter.textContent = `${scenes.length} ${unit}${scenes.length === 1 ? "" : "s"}`;
  }

  if (spModeVideoBtn && spModeImageBtn) {
    spModeVideoBtn.addEventListener("click", () => updateModeUI("video"));
    spModeImageBtn.addEventListener("click", () => updateModeUI("image"));
  }

  function getParsedScenes() {
    const raw = (spMultiPromptText?.value || "").trim();
    if (!raw) return [];

    // 1. Explicit double line breaks
    if (raw.includes("\n\n")) {
      const parts = raw.split(/\n\s*\n+/).map(p => p.trim()).filter(Boolean);
      if (parts.length > 1) return parts;
    }

    // 2. Explicit scene markers e.g. "Scene 1:", "Shot 1:", "Image 1:", "दृश्य 1:", "सीन 1:"
    const sceneMarkerRegex = /(?:^|\n)\s*(?:(?:###?\s*)?(?:Scene|Shot|Sequence|Take|Image|Photo|Frame|दृश्य|सीन)\s*(?:#?\d+|[a-zA-Z0-9_\-]+)\s*[:\-\.]?)/iu;
    if (sceneMarkerRegex.test(raw)) {
      const parts = raw.split(/(?=(?:^|\n)\s*(?:(?:###?\s*)?(?:Scene|Shot|Sequence|Take|Image|Photo|Frame|दृश्य|सीन)\s*(?:#?\d+|[a-zA-Z0-9_\-]+)\s*[:\-\.]?))/iu)
        .map(p => p.trim())
        .filter(Boolean);
      if (parts.length > 1) return parts;
    }

    // 3. Numbered items e.g. "1. ...\n2. ..."
    const numberedListRegex = /(?:^|\n)\s*\d+[\.\)]\s+/;
    if (numberedListRegex.test(raw)) {
      const parts = raw.split(/(?=(?:^|\n)\s*\d+[\.\)]\s+)/)
        .map(p => p.trim())
        .filter(Boolean);
      if (parts.length > 1) return parts;
    }

    // 4. Bullet points e.g. "- ...\n- ..." or "* ...\n* ..."
    const bulletRegex = /(?:^|\n)\s*[\*\-•]\s+/;
    if (bulletRegex.test(raw)) {
      const parts = raw.split(/(?=(?:^|\n)\s*[\*\-•]\s+)/)
        .map(p => p.trim())
        .filter(Boolean);
      if (parts.length > 1) return parts;
    }

    // 5. Distinct single-line prompts (e.g. "a car\na bus\na truck")
    if (raw.includes("\n")) {
      const lines = raw.split(/\r?\n+/).map(l => l.trim()).filter(Boolean);
      if (lines.length > 1) return lines;
    }

    // 6. Fallback: single prompt
    return [raw];
  }

  if (spMultiPromptText && spSceneCounter) {
    const updateCounterUI = () => {
      const scenes = getParsedScenes();
      const isVideo = currentRapidMode === "video";
      const unit = isVideo ? "Scene" : "Image Prompt";
      spSceneCounter.textContent = `${scenes.length} ${unit}${scenes.length === 1 ? "" : "s"}`;
      if (scenes.length > 0) {
        spSceneCounter.style.background = "rgba(0, 230, 118, 0.22)";
        spSceneCounter.style.color = "#00e676";
      } else {
        spSceneCounter.style.background = "rgba(0, 229, 255, 0.15)";
        spSceneCounter.style.color = "var(--accent)";
      }
    };

    spMultiPromptText.addEventListener("input", updateCounterUI);

    spMultiPromptText.addEventListener("paste", () => {
      setTimeout(() => {
        updateCounterUI();
        const scenes = getParsedScenes();
        const isVideo = currentRapidMode === "video";
        const unit = isVideo ? "Video Scene" : "Image Prompt";
        log(`[Rapid Dispatcher] Pasted ${scenes.length} ${unit}(s) in parallel! Click 'Dispatch All' or press Ctrl+Enter to generate instantly in real time.`, "info");
      }, 20);
    });

    spMultiPromptText.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (spBtnDispatchBatch && !spBtnDispatchBatch.disabled) {
          spBtnDispatchBatch.click();
        }
      }
    });
  }

  // Handle Rapid Batch Dispatch
  if (spBtnDispatchBatch) {
    spBtnDispatchBatch.addEventListener("click", async () => {
      const scenes = getParsedScenes();
      if (scenes.length === 0) {
        showToast("Please enter at least 1 prompt separated by newlines.");
        return;
      }

      const isVideo = currentRapidMode === "video";
      const model = isVideo
        ? (spSelectVideoModel?.value || "veo-omni")
        : (spSelectImageModel?.value || "🍌 Nano Banana 2.1");
      const ratio = isVideo
        ? (spSelectRatio?.value || "9:16")
        : (spSelectImageRatio?.value || "9:16");
      const duration = isVideo
        ? parseInt(spSelectDuration?.value || "10", 10)
        : null;
      const count = isVideo
        ? parseInt(spSelectVideoCount?.value || "1", 10)
        : parseInt(spSelectImageCount?.value || "1", 10);

      spBtnDispatchBatch.disabled = true;
      spBtnDispatchBatch.style.opacity = "0.7";
      spBtnDispatchBatch.innerHTML = `<span>⚡</span> Submitting ${scenes.length} ${isVideo ? "Scenes" : "Prompts"} Live...`;

      log(`[AnyAI Engine] Starting instant real-time dispatch of ${scenes.length} ${isVideo ? "video scene(s)" : "image prompt(s)"} (${model} · ${ratio}${duration ? ` · ${duration}s` : ""} · x${count})...`, "info");

      chrome.runtime.sendMessage({
        type: "DISPATCH_RAPID_BATCH",
        payload: {
          scriptText: spMultiPromptText.value,
          mode: isVideo ? "textToVideo" : "textToImage",
          model,
          aspectRatio: ratio,
          duration: duration || 8,
          count,
          pacingDelaySec: 0.8,
          rapidDispatch: true
        }
      }, (res) => {
        spBtnDispatchBatch.disabled = false;
        spBtnDispatchBatch.style.opacity = "1";
        spBtnDispatchBatch.innerHTML = `<span>⚡</span> Dispatch All ${isVideo ? "Scenes" : "Prompts"} Back-to-Back (Parallel)`;

        if (res?.success) {
          const dispatched = res.result?.dispatchedCount ?? scenes.length;
          log(`✅ All ${dispatched} ${isVideo ? "scenes" : "prompts"} successfully submitted to Google Flow! Generating in parallel in real time.`, "success");
          showToast(`All ${dispatched} submitted to Google Flow!`);
        } else {
          log(`❌ Dispatch error: ${res?.error || "Unknown error"}`, "error");
          showToast("Error dispatching prompts");
        }
      });
    });
  }

  // Handle Autonomous Storyboard Pipeline (Auto-Analyze & Auto-Chain)
  const spBtnAutoStoryboard = document.getElementById("spBtnAutoStoryboard");
  if (spBtnAutoStoryboard) {
    spBtnAutoStoryboard.addEventListener("click", async () => {
      const scenes = getParsedScenes();
      if (scenes.length === 0) {
        showToast("Please enter at least 1 scene prompt separated by newlines.");
        return;
      }

      const isVideo = currentRapidMode === "video";
      const model = isVideo
        ? (spSelectVideoModel?.value || "veo-omni")
        : (spSelectImageModel?.value || "🍌 Nano Banana 2.1");
      const ratio = isVideo
        ? (spSelectRatio?.value || "16:9")
        : (spSelectImageRatio?.value || "9:16");
      const duration = isVideo
        ? parseInt(spSelectDuration?.value || "10", 10)
        : null;
      const count = isVideo
        ? parseInt(spSelectVideoCount?.value || "1", 10)
        : parseInt(spSelectImageCount?.value || "1", 10);

      spBtnAutoStoryboard.disabled = true;
      spBtnAutoStoryboard.style.opacity = "0.7";
      spBtnAutoStoryboard.innerHTML = `<span>⏳</span> Autopilot Running ${scenes.length} ${isVideo ? "Scenes" : "Prompts"}...`;

      log(`[DeepX Autopilot] Starting autonomous pipeline: ${scenes.length} ${isVideo ? "scenes" : "prompts"}, ${ratio}${duration ? `, ${duration}s` : ""} (${model})...`, "info");
      showToast("🚀 Autopilot started! Executing on Flow canvas...");

      chrome.runtime.sendMessage({
        type: "RUN_AUTONOMOUS_STORYBOARD",
        payload: {
          scriptText: spMultiPromptText.value,
          mode: isVideo ? "video" : "image",
          aspectRatio: ratio,
          duration: duration || 8,
          model: model,
          count: count || 1,
          autoDownload: isVideo
        }
      }, (res) => {
        spBtnAutoStoryboard.disabled = false;
        spBtnAutoStoryboard.style.opacity = "1";
        spBtnAutoStoryboard.innerHTML = isVideo
          ? `<span>🚀</span> Launch Autonomous Storyboard Pipeline (Auto-Analyze & Auto-Chain)`
          : `<span>🚀</span> Launch Autonomous Image Pipeline (Auto-Analyze & Render)`;

        if (res?.success) {
          const completed = res.result?.completedScenes || scenes.length;
          const total = res.result?.totalScenes || scenes.length;
          log(`✅ Autopilot completed ${completed}/${total} ${isVideo ? "scenes" : "prompts"} on Google Flow canvas!`, "success");
          showToast(`✅ Autopilot complete! ${completed} ${isVideo ? "scenes" : "prompts"} executed.`);
        } else {
          log(`❌ Autopilot error: ${res?.error || "Unknown error"}`, "error");
          showToast("Autopilot execution error");
        }
      });
    });
  }


  // Real-Time Settings Synchronizer:
  // When user changes Model, Ratio, Duration, or Mode in Side Panel, immediately update Google Flow in real time!
  let syncDebounceTimer = null;
  function triggerRealtimeSync() {
    clearTimeout(syncDebounceTimer);
    syncDebounceTimer = setTimeout(() => {
      const isVideo = currentRapidMode === "video";
      const payload = {
        mode: isVideo ? "video" : "image",
        model: isVideo ? (spSelectVideoModel?.value || "veo-omni") : (spSelectImageModel?.value || "🍌 Nano Banana 2.1"),
        aspectRatio: isVideo ? (spSelectRatio?.value || "9:16") : (spSelectImageRatio?.value || "9:16"),
        duration: isVideo ? parseInt(spSelectDuration?.value || "10", 10) : null,
        outputCount: isVideo ? parseInt(spSelectVideoCount?.value || "1", 10) : parseInt(spSelectImageCount?.value || "1", 10)
      };

      chrome.runtime.sendMessage({
        type: "SYNC_SETTINGS_REALTIME",
        payload
      }, (res) => {
        if (res?.success) {
          log(`[Realtime Sync] Flow pill updated: ${payload.mode.toUpperCase()} · ${payload.model} · ${payload.aspectRatio}${payload.duration ? ` · ${payload.duration}s` : ""} · x${payload.outputCount}`, "info");
        }
      });
    }, 150);
  }

  [spSelectVideoModel, spSelectRatio, spSelectDuration, spSelectVideoCount, spSelectImageModel, spSelectImageRatio, spSelectImageCount].forEach(el => {
    if (el) el.addEventListener("change", triggerRealtimeSync);
  });

  // Listen for broadcasted active state changes & progress
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "FLOW_ACTIVE_STATE_CHANGED" || msg.type === "EXTENSION_UNLOCKED") {
      updateStatus();
    }
    if (msg.type === "RAPID_BATCH_PROGRESS" && msg.progress) {
      const p = msg.progress;
      if (p.type === "PROMPT_CONFIGURING") {
        log(`[Realtime Flow] [${p.index + 1}/${p.total}] ⚙️ Setting Model: ${p.model} | Ratio: ${p.aspectRatio}${p.count ? ` | x${p.count}` : ""}...`, "info");
      } else if (p.type === "PROMPT_START") {
        log(`[Realtime Flow] [${p.index + 1}/${p.total}] ✍️ Entering prompt: "${p.prompt}"...`, "info");
      } else if (p.type === "PROMPT_DISPATCHED") {
        log(`[Realtime Flow] [${p.index + 1}/${p.total}] 🚀 Submitted to Google Flow canvas! (${p.sceneRecord?.dispatchTimeMs || 700}ms)`, "success");
      } else if (p.type === "PROMPT_ERROR") {
        log(`[Realtime Flow] [${p.index + 1}/${p.total}] ❌ Dispatch error: ${p.error}`, "error");
      } else if (p.type === "AUTOPILOT_PROGRESS") {
        log(`[DeepX Autopilot] ${p.message}`, p.status === "success" ? "success" : "info");
      } else if (p.type === "TILES_REALTIME_UPDATE" && p.tiles) {
        p.tiles.forEach(t => {
          if (t.status === "generating") {
            log(`[Realtime Flow] '${t.prompt || "Scene"}': ${t.percent}% generating...`, "info");
          } else if (t.status === "ready") {
            log(`[Realtime Flow] '${t.prompt || "Scene"}': Generation complete (100%)! 🎉`, "success");
          }
        });
      } else if (p.type === "TILES_ALL_COMPLETED") {
        log(`[Realtime Flow] ✅ All scenes have finished rendering in Google Flow!`, "success");
        showToast("All scenes generated in Google Flow!");
      }
    }
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.extensionUnlocked) {
      setLockUI(changes.extensionUnlocked.newValue);
    }
  });
});
