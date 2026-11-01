package com.example.gemini.ui.browser

/** Input and viewport control shared by all browser extensions. */
object BrowserAutomationScripts {
    fun inputLock(enabled: Boolean) = """
        (function () {
            function freezeZoom(on) {
              var state = window.__antigemInputLock;
              if (!on) {
                if (!state) return { ok: true };
                state.observer.disconnect();
                document.removeEventListener('focusin', state.onFocus, true);
                if (window.visualViewport) window.visualViewport.removeEventListener('resize', state.applyViewport);
                state.fields.forEach(function (original, el) {
                  if (original == null) el.removeAttribute('inputmode');
                  else el.setAttribute('inputmode', original);
                });
                var meta = document.querySelector('meta[name="viewport"]');
                if (meta) {
                  if (state.createdViewport) meta.remove();
                  else if (state.originalViewport == null) meta.removeAttribute('content');
                  else meta.setAttribute('content', state.originalViewport);
                }
                window.__antigemInputLock = null;
                return { ok: true };
              }
              if (state) {
                state.applyViewport();
                return { ok: true, scale: state.scale };
              }
              var meta = document.querySelector('meta[name="viewport"]');
              state = { originalViewport: meta && meta.getAttribute('content'), createdViewport: !meta, fields: new Map() };
              window.__antigemInputLock = state;
              function protect(el) {
                if (!el || !el.matches || !el.matches('input, textarea, [contenteditable="true"], [contenteditable="plaintext-only"]')) return;
                if (!state.fields.has(el)) state.fields.set(el, el.getAttribute('inputmode'));
                if (el.getAttribute('inputmode') !== 'none') el.setAttribute('inputmode', 'none');
              }
              function protectFields() {
                document.querySelectorAll('input, textarea, [contenteditable="true"], [contenteditable="plaintext-only"]').forEach(protect);
              }
              state.applyViewport = function () {
                var current = document.querySelector('meta[name="viewport"]');
                if (!current) {
                  current = document.createElement('meta');
                  current.name = 'viewport';
                  (document.head || document.documentElement).appendChild(current);
                }
                var width = 1280, vv = window.visualViewport;
                var physicalWidth = vv ? vv.width * vv.scale : window.innerWidth;
                state.scale = Math.max(0.01, physicalWidth / width).toFixed(6);
                var locked = 'width=' + width + ', initial-scale=' + state.scale + ', minimum-scale=' + state.scale + ', maximum-scale=' + state.scale + ', user-scalable=no';
                if (current.getAttribute('content') !== locked) current.setAttribute('content', locked);
              };
              state.onFocus = function (event) { protect(event.target); };
              state.observer = new MutationObserver(function () { state.applyViewport(); protectFields(); });
              state.observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['content', 'inputmode'] });
              document.addEventListener('focusin', state.onFocus, true);
              if (window.visualViewport) window.visualViewport.addEventListener('resize', state.applyViewport);
              protectFields();
              state.applyViewport();
              return { ok: true, scale: state.scale };
            }
          return freezeZoom($enabled);
        })();
    """.trimIndent()
}
