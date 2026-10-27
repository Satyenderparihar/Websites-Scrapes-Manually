// youtube-detector.js - Real-time YouTube Subscription Detector for DeepX Flow Bridge
(() => {
  const TARGET_CHANNEL_HANDLE = "@dipeshkyd";
  const TARGET_CHANNEL_ID = "ucyf1kp1w4xvnkhagmehx1w";
  const TARGET_CHANNEL_NAME = "dipeshkyd";
  let hasReportedUnlock = false;

  function isTargetChannelPage() {
    const url = (window.location.href || "").toLowerCase();
    if (url.includes(TARGET_CHANNEL_HANDLE) || url.includes(TARGET_CHANNEL_ID) || url.includes("dipeshkyd")) return true;
    
    // Also detect if on a video, community post, or page with Dipesh Kyd channel link
    const owner = document.querySelector('#owner ytd-channel-name a, #channel-name a, ytd-video-owner-renderer a, ytd-channel-name a');
    if (owner) {
      const href = (owner.getAttribute('href') || '').toLowerCase();
      const text = (owner.textContent || '').toLowerCase().replace(/\s+/g, '');
      if (href.includes(TARGET_CHANNEL_HANDLE) || href.includes(TARGET_CHANNEL_ID) || text.includes(TARGET_CHANNEL_NAME)) {
        return true;
      }
    }
    // Check channel ID in page meta tags
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical && (canonical.href.toLowerCase().includes(TARGET_CHANNEL_ID) || canonical.href.toLowerCase().includes("dipeshkyd"))) {
      return true;
    }
    return false;
  }

  function checkSubscriptionStatus() {
    if (!isTargetChannelPage()) return { isSubscribed: false, isExplicitUnsubscribed: false };

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
          // Confirmation dialog is actively waiting for user confirmation! NOT subscribed yet.
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

    // If an explicit unsubscribed "Subscribe" button is found, return immediately as NOT subscribed!
    if (foundExplicitUnsubscribed) {
      return { isSubscribed: false, isExplicitUnsubscribed: true };
    }

    // 4. POSITIVE GUARDS (Only evaluate if negative check passed)

    // Guard 4A: Dedicated Channel Notification Bell Toggle
    // MUST be strictly within channel subscribe area (#subscribe-button or channel header)
    // NEVER query masthead / top navbar!
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

    // Guard 4B: Official 'subscribed' attribute on subscribe-button-renderer
    for (const sr of subscribeRenderers) {
      if (
        sr.hasAttribute('subscribed') ||
        sr.getAttribute('subscribed') === 'true' ||
        sr.classList.contains('subscribed')
      ) {
        return { isSubscribed: true, isExplicitUnsubscribed: false };
      }
    }

    // Guard 4C: Explicit "Subscribed" button inside channel header
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

  function notifySubscribed() {
    if (hasReportedUnlock) return;
    hasReportedUnlock = true;
    console.log('[DeepX] Confirmed subscription to @dipeshkyd! Unlocking extension...');

    // 1. Notify background service worker
    try {
      chrome.runtime.sendMessage({
        type: 'YOUTUBE_SUBSCRIBE_CONFIRMED',
        channel: TARGET_CHANNEL_HANDLE,
        url: window.location.href
      }, () => {});
    } catch (e) {
      console.warn('[DeepX] Message send warning:', e);
    }

    // 2. Direct local storage update
    try {
      chrome.storage.local.set({
        extensionUnlocked: true,
        subscribedChannel: TARGET_CHANNEL_HANDLE,
        unlockedAt: Date.now()
      });
    } catch (e) {
      console.warn('[DeepX] Storage set warning:', e);
    }

    // 3. Show floating confirmation banner on YouTube page
    showInPageNotification();
  }

  function notifyUnsubscribed() {
    hasReportedUnlock = false;
    chrome.storage.local.get(['extensionUnlocked'], (res) => {
      if (res?.extensionUnlocked) {
        console.log('[DeepX] Explicit unsubscribed status verified on @dipeshkyd! Relocking extension...');
        chrome.storage.local.set({
          extensionUnlocked: false,
          unlockedAt: null
        });
        try {
          chrome.runtime.sendMessage({
            type: 'YOUTUBE_UNSUBSCRIBED_CONFIRMED',
            channel: TARGET_CHANNEL_HANDLE
          }, () => {});
        } catch (e) {}
      }
    });
  }

  function evaluateAndAct() {
    const status = checkSubscriptionStatus();
    if (status.isSubscribed) {
      notifySubscribed();
    } else if (status.isExplicitUnsubscribed) {
      notifyUnsubscribed();
    }
  }

  function showInPageNotification() {
    if (document.getElementById('deepx-yt-toast')) return;
    const toast = document.createElement('div');
    toast.id = 'deepx-yt-toast';
    toast.innerHTML = `
      <div style="
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 9999999;
        background: #212121;
        border: 1px solid #383838;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.9);
        border-radius: 12px;
        padding: 14px 18px;
        color: #f1f1f1;
        font-family: Roboto, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        display: flex;
        align-items: center;
        gap: 12px;
        animation: deepxSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      ">
        <div style="
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #cc0000;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          flex-shrink: 0;
        ">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="#ffffff"><path d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
        </div>
        <div>
          <div style="font-weight: 700; font-size: 13px; color: #ffffff; letter-spacing: 0.3px;">
            DeepX Flow Bridge Unlocked 🔓
          </div>
          <div style="font-size: 11px; color: #aaaaaa; margin-top: 2px;">
            Subscribed to <strong>@dipeshkyd</strong>! Full AI generation is permanently enabled.
          </div>
        </div>
      </div>
      <style>
        @keyframes deepxSlideIn {
          from { transform: translateY(40px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      </style>
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.transition = 'opacity 0.6s ease';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 700);
    }, 5000);
  }

  // Listen for user clicks on YouTube's subscribe buttons or confirmation dialog
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('button, yt-button-shape, ytd-subscribe-button-renderer, #confirm-button');
    if (btn && isTargetChannelPage()) {
      // Fast polling loop after click to catch subscription confirmation in real-time
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        const status = checkSubscriptionStatus();
        if (status.isSubscribed) {
          clearInterval(interval);
          notifySubscribed();
        } else if (attempts > 35) {
          clearInterval(interval);
          if (status.isExplicitUnsubscribed) {
            notifyUnsubscribed();
          }
        }
      }, 250);
    }
  }, true);

  // MutationObserver for real-time DOM changes
  const observer = new MutationObserver(() => {
    evaluateAndAct();
  });

  observer.observe(document.documentElement || document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['subscribed', 'aria-label', 'class']
  });

  function startContinuousCheck(durationSec = 25) {
    evaluateAndAct();
    let elapsed = 0;
    const poller = setInterval(() => {
      elapsed += 250;
      const status = checkSubscriptionStatus();
      if (status.isSubscribed) {
        clearInterval(poller);
        notifySubscribed();
      } else if (status.isExplicitUnsubscribed) {
        notifyUnsubscribed();
      }
      if (elapsed >= durationSec * 1000) {
        clearInterval(poller);
      }
    }, 250);
  }

  // Check immediately and on YouTube SPA navigations
  window.addEventListener('yt-navigate-finish', () => {
    startContinuousCheck(20);
  });

  // Check on page ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      startContinuousCheck(30);
    });
  } else {
    startContinuousCheck(30);
  }
})();
