// DeepX Popup Controller
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
  const connectionBadge = document.getElementById("connectionBadge");
  const activeHostVal = document.getElementById("activeHostVal");
  const customHostInput = document.getElementById("customHostInput");
  const btnSaveHost = document.getElementById("btnSaveHost");
  const tabStatusVal = document.getElementById("tabStatusVal");
  const projectVal = document.getElementById("projectVal");
  const authStatusVal = document.getElementById("authStatusVal");
  const batchCountBadge = document.getElementById("batchCountBadge");
  const btnCopyMasterPrompt = document.getElementById("btnCopyMasterPrompt");
  const toast = document.getElementById("toast");
  const linkOpenSidePanel = document.getElementById("linkOpenSidePanel");
  const btnTogglePower = document.getElementById("btnTogglePower");
  const powerStatusText = document.getElementById("powerStatusText");
  const powerHintText = document.getElementById("powerHintText");
  const lockOverlay = document.getElementById("lockOverlay");
  const btnSubscribeUnlock = document.getElementById("btnSubscribeUnlock");
  const lockFooterNote = document.getElementById("lockFooterNote");
  const sponsorBadge = document.getElementById("sponsorBadge");

  const subStatusBox = document.getElementById("subStatusBox");
  const subStatusTick = document.getElementById("subStatusTick");
  const subStatusTitle = document.getElementById("subStatusTitle");
  const subStatusSub = document.getElementById("subStatusSub");
  const btnAutoCheck = document.getElementById("btnAutoCheck");
  const mobileAppConfirmRow = document.getElementById("mobileAppConfirmRow");
  const btnMobileAppUnlock = document.getElementById("btnMobileAppUnlock");

  let lastWsConnected = false;

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2500);
  }

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
      if (mobileAppConfirmRow) mobileAppConfirmRow.style.display = "none";
      if (subStatusBox) subStatusBox.className = "sub-status-box verified";
      if (subStatusTick) subStatusTick.innerHTML = "✔";
      if (subStatusTitle) subStatusTitle.textContent = "✔ Channel Subscribed!";
      if (subStatusSub) subStatusSub.textContent = "Verified in real-time via YouTube";
      if (btnAutoCheck) btnAutoCheck.innerHTML = "<span>✔ Verified</span>";

      if (btnSubscribeUnlock) {
        btnSubscribeUnlock.className = "btn-subscribe-action subscribed";
        btnSubscribeUnlock.innerHTML = '<span class="green-tick-pill-icon">✔</span> <span>Subscribed & Unlocked 🔓</span>';
      }
      if (lockFooterNote) {
        lockFooterNote.textContent = "✅ Real-time verified! Enjoy DeepX Flow Bridge.";
      }
      if (sponsorBadge) sponsorBadge.classList.add("visible");
      setTimeout(() => {
        if (lockOverlay) lockOverlay.classList.remove("visible");
      }, 800);
    } else {
      if (lockOverlay) lockOverlay.classList.add("visible");
      if (sponsorBadge) sponsorBadge.classList.remove("visible");
      if (subStatusBox) subStatusBox.className = "sub-status-box";
      if (subStatusTick) subStatusTick.innerHTML = "🔒";
      if (subStatusTitle) subStatusTitle.textContent = "Subscription Required";
      if (subStatusSub) subStatusSub.textContent = "Subscribe to @dipeshkyd to unlock";
      if (btnAutoCheck && !isCheckingRealtime) btnAutoCheck.innerHTML = "<span>🔄 Auto-Check</span>";

      if (btnSubscribeUnlock && !isCheckingRealtime) {
        btnSubscribeUnlock.className = "btn-subscribe-action dim";
        btnSubscribeUnlock.innerHTML = `
          <svg viewBox="0 0 24 24" width="18" height="18" fill="#ffffff"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
          <span id="btnActionText">Subscribe to Unlock</span>
        `;
      }
    }
  }

  // Instant Auto-Check Function across all open YouTube tabs
  async function triggerAutoCheck() {
    if (isUnlocked) return true;
    if (btnAutoCheck) btnAutoCheck.innerHTML = '<span>⏳ Checking...</span>';
    
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "AUTO_CHECK_SUBSCRIPTION" }, (res) => {
        if (res?.isUnlocked) {
          setLockUI(true);
          showToast("🎉 Verified! DeepX Flow Bridge Unlocked!");
          resolve(true);
          return;
        }

        // Direct tab query for dual-engine redundancy
        chrome.tabs.query({ url: ["*://*.youtube.com/*", "*://youtube.com/*"] }, async (tabs) => {
          if (!tabs || tabs.length === 0) {
            if (btnAutoCheck && !isUnlocked) btnAutoCheck.innerHTML = '<span>🔄 Auto-Check</span>';
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
                showToast("🎉 Verified! DeepX Flow Bridge Unlocked!");
                break;
              } else if (status?.isExplicitUnsubscribed === true) {
                chrome.storage.local.set({ extensionUnlocked: false, unlockedAt: null });
                setLockUI(false);
              }
            } catch (err) {}
          }

          if (!found) {
            if (btnAutoCheck && !isUnlocked) btnAutoCheck.innerHTML = '<span>🔄 Auto-Check</span>';
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
  if (btnAutoCheck) {
    btnAutoCheck.addEventListener("click", (e) => {
      e.stopPropagation();
      triggerAutoCheck().then((unlocked) => {
        if (!unlocked) {
          showToast("Not detected yet. Click Subscribe on YouTube tab!");
        }
      });
    });
  }

  // Mobile App One-Tap Unlock Handler
  if (btnMobileAppUnlock) {
    btnMobileAppUnlock.addEventListener("click", () => {
      chrome.storage.local.set({ extensionUnlocked: true, subscribedChannel: "@dipeshkyd", unlockedAt: Date.now() });
      chrome.runtime.sendMessage({ type: "YOUTUBE_SUBSCRIBE_CONFIRMED" });
      setLockUI(true);
      showToast("🎉 Verified! DeepX Flow Bridge Unlocked!");
    });
  }

  // Sponsor Badge click listener: 1-click re-lock for verification & testing
  if (sponsorBadge) {
    sponsorBadge.style.cursor = "pointer";
    sponsorBadge.title = "Verified @dipeshkyd (Click to re-lock for testing)";
    sponsorBadge.addEventListener("click", () => {
      chrome.storage.local.set({ extensionUnlocked: false, unlockedAt: null });
      setLockUI(false);
      chrome.runtime.sendMessage({ type: "LOCK_EXTENSION" });
      showToast("🔒 Re-locked for testing. Subscribe on YouTube to unlock!");
    });
  }

  // Handle single unified Subscribe to Unlock button
  if (btnSubscribeUnlock) {
    btnSubscribeUnlock.addEventListener("click", async () => {
      if (isUnlocked) return;

      // FIRST: Check if already subscribed in any currently open YouTube tab
      btnSubscribeUnlock.className = "btn-subscribe-action checking";
      btnSubscribeUnlock.innerHTML = '<span style="font-size: 15px;">⏳</span> <span>Auto-Checking Open Tabs...</span>';
      
      const alreadySubscribed = await triggerAutoCheck();
      if (alreadySubscribed) {
        return;
      }

      // If not yet detected in open tabs, open the channel tab with subscription dialog
      chrome.tabs.create({ url: "https://www.youtube.com/@dipeshkyd?sub_confirmation=1" });
      
      isCheckingRealtime = true;
      if (mobileAppConfirmRow) mobileAppConfirmRow.style.display = "flex";
      btnSubscribeUnlock.innerHTML = '<span style="font-size: 15px;">⏳</span> <span>Checking Subscription in Real-Time...</span>';
      if (lockFooterNote) {
        lockFooterNote.innerHTML = '⚡ Waiting for subscription on YouTube tab... Click <strong>Subscribe</strong>!';
      }
      showToast("Opening @dipeshkyd... Click Subscribe on YouTube!");

      // Start rapid local check loop for instant reaction
      let checks = 0;
      const checker = setInterval(() => {
        checks++;
        chrome.storage.local.get(["extensionUnlocked"], (st) => {
          if (st.extensionUnlocked) {
            clearInterval(checker);
            isCheckingRealtime = false;
            setLockUI(true);
            showToast("🎉 Subscribed & Unlocked! Welcome to DeepX Flow Bridge!");
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

  // When user clicks the extension in Chrome toolbar, popup opens -> notify background & auto check
  chrome.runtime.sendMessage({ type: "POPUP_OPENED" }, (res) => {
    if (res?.isUnlocked) {
      setLockUI(true);
    }
    updateStatus();
  });

  let currentPowerEnabled = true;

  function setPowerUI(enabled) {
    currentPowerEnabled = enabled;
    if (powerStatusText && btnTogglePower && powerHintText) {
      if (enabled) {
        powerStatusText.textContent = "ON (Active)";
        powerStatusText.style.color = "var(--success)";
        btnTogglePower.textContent = "Turn OFF";
        btnTogglePower.className = "btn-power btn-power-on";
        powerHintText.textContent = "Manual Power Control: DeepX stays ON until you manually turn it OFF.";
      } else {
        powerStatusText.textContent = "OFF (Paused)";
        powerStatusText.style.color = "#b0bec5";
        btnTogglePower.textContent = "Turn ON";
        btnTogglePower.className = "btn-power btn-power-off";
        powerHintText.textContent = "DeepX is OFF. Click Turn ON to activate.";
      }
    }
  }

  // Toggle Power Button (instant response)
  if (btnTogglePower) {
    btnTogglePower.addEventListener("click", () => {
      const targetState = !currentPowerEnabled;
      setPowerUI(targetState);
      showToast(targetState ? "DeepX Extension turned ON" : "DeepX Extension turned OFF");
      chrome.runtime.sendMessage({ type: "SET_EXTENSION_ACTIVE", active: targetState }, () => {
        updateStatus();
      });
    });
  }

  const mcpHubBadge = document.getElementById("mcpHubBadge");
  const btnOpenAntigravity = document.getElementById("btnOpenAntigravity");
  const btnCopyConnectPrompt = document.getElementById("btnCopyConnectPrompt");
  const btnCopyDisconnectPrompt = document.getElementById("btnCopyDisconnectPrompt");

  function updateMcpHubUI(isConnected) {
    if (isConnected) {
      if (mcpHubBadge) {
        mcpHubBadge.textContent = "CONNECTED 🟢";
        mcpHubBadge.style.background = "rgba(0, 230, 118, 0.18)";
        mcpHubBadge.style.color = "var(--success)";
      }
      if (btnOpenAntigravity) {
        btnOpenAntigravity.innerHTML = '<span>🟢</span> Antigravity MCP Connected';
        btnOpenAntigravity.style.background = "linear-gradient(135deg, #00e676 0%, #00b0ff 100%)";
        btnOpenAntigravity.title = "Antigravity MCP Bridge is connected & active. Click to switch to Antigravity IDE.";
      }
      if (btnCopyDisconnectPrompt) {
        btnCopyDisconnectPrompt.innerHTML = '<span>🔌</span> Disconnect MCP';
        btnCopyDisconnectPrompt.style.background = "rgba(255, 82, 82, 0.16)";
        btnCopyDisconnectPrompt.style.color = "var(--danger)";
        btnCopyDisconnectPrompt.style.borderColor = "rgba(255, 82, 82, 0.55)";
        btnCopyDisconnectPrompt.style.opacity = "1";
        btnCopyDisconnectPrompt.title = "Directly disconnect and quit Antigravity MCP server connection (Turn OFF)";
      }
      if (btnCopyConnectPrompt) {
        btnCopyConnectPrompt.innerHTML = '<span>⚡</span> Copy Connect Prompt';
        btnCopyConnectPrompt.style.background = "rgba(0, 230, 118, 0.14)";
        btnCopyConnectPrompt.style.color = "var(--success)";
        btnCopyConnectPrompt.style.borderColor = "rgba(0, 230, 118, 0.45)";
        btnCopyConnectPrompt.title = "Copy 1-click connect prompt for Antigravity";
      }
    } else {
      if (mcpHubBadge) {
        mcpHubBadge.textContent = "DISCONNECTED 🔴";
        mcpHubBadge.style.background = "rgba(255, 82, 82, 0.18)";
        mcpHubBadge.style.color = "var(--danger)";
      }
      if (btnOpenAntigravity) {
        btnOpenAntigravity.innerHTML = '<span>🚀</span> Open Antigravity &amp; Paste Prompt';
        btnOpenAntigravity.style.background = "linear-gradient(135deg, #00e5ff 0%, #00b0ff 100%)";
        btnOpenAntigravity.title = "Launch Antigravity and copy connection prompt";
      }
      if (btnCopyDisconnectPrompt) {
        btnCopyDisconnectPrompt.innerHTML = '<span>🔌</span> Disconnect MCP';
        btnCopyDisconnectPrompt.style.background = "rgba(255, 82, 82, 0.10)";
        btnCopyDisconnectPrompt.style.color = "var(--text-muted)";
        btnCopyDisconnectPrompt.style.borderColor = "rgba(255, 82, 82, 0.30)";
        btnCopyDisconnectPrompt.style.opacity = "0.75";
        btnCopyDisconnectPrompt.title = "Antigravity MCP server is currently disconnected (OFF)";
      }
      if (btnCopyConnectPrompt) {
        btnCopyConnectPrompt.innerHTML = '<span>⚡</span> Connect MCP';
        btnCopyConnectPrompt.style.background = "rgba(0, 230, 118, 0.16)";
        btnCopyConnectPrompt.style.color = "var(--success)";
        btnCopyConnectPrompt.style.borderColor = "rgba(0, 230, 118, 0.55)";
        btnCopyConnectPrompt.title = "Connect to Antigravity MCP Server & copy connect prompt";
      }
    }
  }

  if (btnOpenAntigravity) {
    btnOpenAntigravity.addEventListener("click", () => {
      if (lastWsConnected) {
        showToast("🟢 Antigravity MCP is connected and active!");
        window.location.href = "antigravity://open";
      } else {
        copyTextToClipboard(ANTIGRAVITY_CONNECT_PROMPT, "⚡ Connect Prompt Copied! Launching Antigravity...");
        window.location.href = "antigravity://open";
        chrome.runtime.sendMessage({ type: "CONNECT_MCP" });
      }
    });
  }

  if (btnCopyConnectPrompt) {
    btnCopyConnectPrompt.addEventListener("click", () => {
      copyTextToClipboard(ANTIGRAVITY_CONNECT_PROMPT, "⚡ Connect Prompt Copied to Clipboard!");
      fetch("http://127.0.0.1:8792/api/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: "connect" })
      }).catch(() => {});
      chrome.runtime.sendMessage({ type: "CONNECT_MCP" }, (res) => {
        showToast(res?.connected ? "🟢 Antigravity MCP Connected (Turned ON)!" : "⏳ Connecting to Antigravity MCP...");
        if (res?.connected) {
          lastWsConnected = true;
          updateMcpHubUI(true);
        }
        updateStatus();
      });
    });
  }

  if (btnCopyDisconnectPrompt) {
    btnCopyDisconnectPrompt.addEventListener("click", () => {
      copyTextToClipboard(ANTIGRAVITY_DISCONNECT_PROMPT, "🔌 MCP Disconnected! Disconnect Prompt Copied.");
      lastWsConnected = false;
      updateMcpHubUI(false);
      fetch("http://127.0.0.1:8792/api/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: "disconnect" })
      }).catch(() => {});
      chrome.runtime.sendMessage({ type: "DISCONNECT_MCP" }, () => {
        showToast("🔌 Antigravity MCP Disconnected (Turned OFF)!");
        updateStatus();
      });
    });
  }

  btnCopyMasterPrompt.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(MASTER_ANTIGRAVITY_PROMPT);
      showToast("Master Prompt Copied for Antigravity!");
    } catch {
      const ta = document.createElement("textarea");
      ta.value = MASTER_ANTIGRAVITY_PROMPT;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      showToast("Master Prompt Copied!");
    }
  });

  // Open Side Panel
  linkOpenSidePanel.addEventListener("click", async (e) => {
    e.preventDefault();
    if (chrome.sidePanel?.open) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        chrome.sidePanel.open({ tabId: tab.id });
      }
    }
  });

  // Save custom host
  btnSaveHost.addEventListener("click", () => {
    const host = customHostInput.value.trim();
    if (host) {
      chrome.runtime.sendMessage({ type: "MANUAL_RECONNECT", customHost: host }, (res) => {
        showToast("Reconnecting to " + host);
        updateStatus();
      });
    }
  });

  // Click Connection Badge to Copy Master Prompt only when NOT connected
  if (connectionBadge) {
    connectionBadge.addEventListener("click", async () => {
      if (connectionBadge.classList.contains("connected")) {
        showToast("Antigravity MCP is already connected! 🟢");
        return;
      }
      try {
        await navigator.clipboard.writeText(MASTER_ANTIGRAVITY_PROMPT);
        showToast("📋 Master Prompt Copied!");
      } catch {
        const ta = document.createElement("textarea");
        ta.value = MASTER_ANTIGRAVITY_PROMPT;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
        showToast("📋 Master Prompt Copied!");
      }
    });
  }

  // Click Active Project to Refresh Real Project Name & ID
  const rowActiveProject = document.getElementById("rowActiveProject");
  if (rowActiveProject) {
    rowActiveProject.addEventListener("click", () => {
      projectVal.textContent = "Refreshing... 🔄";
      projectVal.style.color = "var(--accent)";
      chrome.runtime.sendMessage({ type: "REFRESH_PROJECT_INFO" }, (res) => {
        if (res?.success && (res.projectName || res.projectId)) {
          const pName = res.projectName || "Active Project";
          projectVal.textContent = pName;
          projectVal.title = `Project: ${pName}\nID: ${res.projectId}`;
          showToast(`Active Project: ${pName}`);
          updateStatus();
        } else {
          chrome.runtime.sendMessage({ type: "SWITCH_TO_FLOW_AND_ACTIVATE" });
          showToast("Switched to Google Flow");
          updateStatus();
        }
      });
    });
  }

  // Status refresh
  function updateStatus() {
    chrome.runtime.sendMessage({ type: "GET_EXTENSION_STATUS" }, (res) => {
      if (!res) return;

      lastWsConnected = !!res.wsConnected;
      updateMcpHubUI(lastWsConnected);

      // Antigravity MCP connection and Copy Option display
      if (!res.wsConnected) {
        // Disconnected: show copy button & red badge
        connectionBadge.textContent = "Disconnected 🔴";
        connectionBadge.className = "badge disconnected";
        connectionBadge.style.background = "";
        connectionBadge.style.color = "";
        connectionBadge.style.cursor = "pointer";
        if (btnCopyMasterPrompt) btnCopyMasterPrompt.style.display = "inline-flex";
      } else {
        // Connected: DO NOT show copy option!
        if (btnCopyMasterPrompt) btnCopyMasterPrompt.style.display = "none";
        connectionBadge.style.cursor = "default";

        if (res.isExtensionEnabled === false) {
          connectionBadge.textContent = "OFF (Paused) ⚪";
          connectionBadge.className = "badge standby";
          connectionBadge.style.background = "rgba(117,117,117,0.3)";
          connectionBadge.style.color = "#b0bec5";
        } else if (!res.flowTabAttached) {
          connectionBadge.textContent = "No Flow Tab ⚠️";
          connectionBadge.className = "badge disconnected";
          connectionBadge.style.background = "";
          connectionBadge.style.color = "";
        } else if (!res.account?.isLoggedIn) {
          connectionBadge.textContent = "Sign In Required ⚠️";
          connectionBadge.className = "badge standby";
          connectionBadge.style.background = "rgba(255, 82, 82, 0.2)";
          connectionBadge.style.color = "#ff5252";
        } else if (!res.projectId) {
          connectionBadge.textContent = "Needs Project ⚠️";
          connectionBadge.className = "badge standby";
          connectionBadge.style.background = "rgba(255, 179, 0, 0.2)";
          connectionBadge.style.color = "#ffb300";
        } else {
          connectionBadge.textContent = "Connected 🟢";
          connectionBadge.className = "badge connected";
          connectionBadge.style.background = "";
          connectionBadge.style.color = "";
        }
      }

      // Update Power Control
      setPowerUI(res.isExtensionEnabled !== false);

      activeHostVal.textContent = res.connectedHost || res.targetHost || "ws://127.0.0.1:8792";

      if (res.flowTabAttached) {
        tabStatusVal.textContent = "Attached ✅";
        tabStatusVal.style.color = "var(--success)";
      } else {
        tabStatusVal.textContent = "Not Found";
        tabStatusVal.style.color = "var(--danger)";
      }

      const currentPid = res.projectId;
      const currentPname = res.projectName;
      if (currentPname || currentPid) {
        projectVal.textContent = currentPname || `${currentPid.slice(0, 14)}...`;
        projectVal.title = `Project: ${currentPname || "Unnamed"}\nID: ${currentPid || "N/A"}`;
        projectVal.style.color = "var(--accent)";
      } else if (res.flowTabAttached && res.account?.isLoggedIn) {
        projectVal.textContent = "Open a Project ⚠️";
        projectVal.title = "No active project open in Google Flow";
        projectVal.style.color = "var(--warning)";
      } else {
        projectVal.textContent = "None";
        projectVal.style.color = "var(--text-muted)";
      }

      if (res.account?.isLoggedIn) {
        const name = res.account.accountName || "User";
        const email = res.account.email ? ` (${res.account.email})` : "";
        const plan = res.account.plan ? ` [${res.account.plan}]` : "";
        authStatusVal.textContent = `${name}${email}${plan} ✅`;
        authStatusVal.style.color = "var(--success)";
      } else if (res.flowTabAttached) {
        authStatusVal.textContent = "Not Signed In ❌";
        authStatusVal.style.color = "var(--danger)";
      } else {
        authStatusVal.textContent = "No Flow Tab ⚠️";
        authStatusVal.style.color = "var(--warning)";
      }

      batchCountBadge.textContent = `${res.activeBatchesCount || 0} Active`;

      if (typeof res.isUnlocked === "boolean") {
        setLockUI(res.isUnlocked);
      }
    });
  }

  updateStatus();
  setInterval(updateStatus, 1500);

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "MCP_CONNECTION_STATE_CHANGED") {
      lastWsConnected = !!msg.connected;
      updateMcpHubUI(lastWsConnected);
      updateStatus();
    } else if (msg.type === "PROJECT_ID_UPDATED" || msg.type === "PROJECT_CHANGED" || msg.type === "FLOW_ACTIVE_STATE_CHANGED" || msg.type === "ACCOUNT_UPDATED" || msg.type === "EXTENSION_UNLOCKED") {
      updateStatus();
    }
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.extensionUnlocked) {
      setLockUI(changes.extensionUnlocked.newValue);
    }
  });
});
