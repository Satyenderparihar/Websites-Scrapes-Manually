// Page automation and request guard, migrated from the integrated Flow implementation.

        if (!window.__agFlow || window.__agFlow.v !== 23) {
          window.__agFlow = (function () {
            var IMAGE_RPC = 'ogiZ0b';
            var EDIT_RPC = 'jIps6';
            var UPSCALE_RPC = 'SPrCad';
            var EXTEND_RPC = 'fZytfe';
            var UPSCALE_VIDEO_RPC = 'p0UkFb';
            var GEN_RPCS = [IMAGE_RPC, 'YhhmEf', 'eb1hJf', 'nprQif', 'MZZa6b', EDIT_RPC, UPSCALE_RPC, EXTEND_RPC, UPSCALE_VIDEO_RPC];
            var UPLOAD_RPC = 'maseQ';
            var REFS_RPC = 'MZZa6b';

            function shown(el) {
              if (!el || !el.getBoundingClientRect) return false;
              var r = el.getBoundingClientRect();
              if (r.width < 2 || r.height < 2) return false;
              var s = getComputedStyle(el);
              return s.display !== 'none' && s.visibility !== 'hidden' && parseFloat(s.opacity) !== 0;
            }
            function disabled(el) { return !!el.disabled || el.getAttribute('aria-disabled') === 'true'; }
            function norm(t) { return String(t || '').replace(/\s+/g, ' ').trim(); }
            function label(el) {
              var aria = el.getAttribute('aria-label') || '';
              var txt = norm(el.innerText || el.textContent);
              return norm(txt && txt.indexOf(aria) >= 0 ? txt : aria + ' ' + txt).slice(0, 200);
            }
            function point(el) {
              try { el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' }); } catch (e) {}
              var r = el.getBoundingClientRect();
              var vv = window.visualViewport;
              var ox = vv ? vv.offsetLeft : 0, oy = vv ? vv.offsetTop : 0;
              var vw = vv ? vv.width : window.innerWidth, vh = vv ? vv.height : window.innerHeight;
              return {
                found: true,
                fx: (r.left + r.width / 2 - ox) / vw,
                fy: (r.top + r.height / 2 - oy) / vh,
                label: label(el),
                checked: el.getAttribute('aria-checked') === 'true',
                disabled: disabled(el)
              };
            }
            function byAria(name, root) {
              var list = (root || document).querySelectorAll('[aria-label]');
              for (var i = 0; i < list.length; i++) {
                if (list[i].getAttribute('aria-label') === name && shown(list[i])) return list[i];
              }
              return null;
            }
            // Shortest visible label matching the pattern wins (most specific element)
            function byText(pattern, sel, root) {
              var re = new RegExp(pattern, 'i'), best = null, bestLen = Infinity;
              (root || document).querySelectorAll(sel || 'button, [role="button"]').forEach(function (el) {
                if (!shown(el)) return;
                var l = label(el);
                if (l && re.test(l) && l.length < bestLen) { best = el; bestLen = l.length; }
              });
              return best;
            }
            function promptEl() {
              var el = document.querySelector('div.ProseMirror[contenteditable="true"]');
              if (el && shown(el)) return el;
              var list = document.querySelectorAll('[contenteditable="true"], textarea');
              for (var i = 0; i < list.length; i++) if (shown(list[i])) return list[i];
              return null;
            }
            // The settings popover is the CDK overlay pane that contains radios
            function pane() {
              var panes = document.querySelectorAll('.cdk-overlay-pane');
              for (var i = 0; i < panes.length; i++) {
                if (shown(panes[i]) && panes[i].querySelector('[role="radio"]')) return panes[i];
              }
              return null;
            }
            function menu() {
              var list = document.querySelectorAll('[role="menu"]');
              for (var i = 0; i < list.length; i++) if (shown(list[i])) return list[i];
              return null;
            }
            // The asset picker ("+" ingredients and Start/End frame slots) is the overlay pane with the asset list
            function picker() {
              var panes = document.querySelectorAll('.cdk-overlay-pane');
              for (var i = 0; i < panes.length; i++) {
                var p = panes[i];
                if (shown(p) && (p.querySelector('[role="listbox"][aria-label="Asset list"], flow-add-menu-side-nav, button.asset-item, button.detail-add-to-prompt-btn') || byText('upload\\s*media|add\\s*to\\s*prompt', 'button', p))) return p;
              }
              return null;
            }
            function listbox() { var p = picker(); return p && p.querySelector('[role="listbox"]'); }
            // The prompt bar: the nearest container of the prompt box that also holds "Start generation".
            // Chips elsewhere (e.g. an image's info panel listing its own ingredients) must never be counted.
            function promptRoot() {
              var pm = promptEl();
              if (!pm) return null;
              var box = pm.closest('flow-prompt-box') || pm.closest('flow-base-prompt-box');
              if (box) return box;
              var el = pm;
              for (var i = 0; el && i < 12; i++) {
                if (el.querySelector && el.querySelector('[aria-label="Start generation"]')) return el;
                el = el.parentElement;
              }
              el = pm;
              for (var j = 0; el.parentElement && j < 4; j++) el = el.parentElement;
              return el;
            }
            function chips() {
              // Same custom-element query as flow_mcp: hosts may use display: contents and have no rect.
              var pBox = document.querySelector('flow-prompt-box, flow-base-prompt-box');
              if (!pBox) return [];
              var custom = Array.from(pBox.querySelectorAll('flow-ingredient-chip'));
              return custom.length ? custom : Array.from(pBox.querySelectorAll('[aria-label="Ingredient"], [aria-label="Image ingredient"]'));
            }
            function refCount() { return chips().length; }
            function mediaIdOf(el) {
              var nodes = [el].concat(Array.prototype.slice.call(el.querySelectorAll('[data-media-id], [media-id], img, video, source, a[href]')));
              for (var i = 0; i < nodes.length; i++) {
                var n = nodes[i];
                var id = n.getAttribute('data-media-id') || n.getAttribute('media-id');
                if (id) return id;
                var src = n.currentSrc || n.getAttribute('src') || n.getAttribute('poster') || n.getAttribute('href') || '';
                var m = /\/(?:image|video)\/([^?\/#]+)/.exec(src);
                if (m) return m[1];
              }
              return null;
            }
            function cleanAssetTitle(value) {
              return norm(value).replace(/^[@#]/, '').replace(/\.(png|jpe?g|webp|gif|mp4|webm|mov)$/i, '').toLowerCase();
            }
            // The media id or title each attached chip really carries
            function chipIds() {
              return chips().map(function (el) {
                return mediaIdOf(el) || norm((el.innerText || el.textContent || '').split('\n')[0]);
              });
            }
            function chipPoint(index) { var c = chips()[index]; return c ? point(c) : { found: false }; }
            function pickerTab(name) {
              var p = picker();
              var el = p && byText('(^|\\s)' + name + '\\s*$', '[role="tab"]', p);
              return el ? point(el) : { found: false };
            }
            function pickerOptionAt(i) {
              var lb = listbox();
              var list = lb ? Array.prototype.filter.call(lb.querySelectorAll('[role="option"]'), shown) : [];
              return list[i] ? point(list[i]) : { found: false };
            }
            function pickerOptions() {
              var lb = listbox();
              var list = lb ? Array.prototype.filter.call(lb.querySelectorAll('[role="option"]'), shown) : [];
              return { count: list.length, first: list.length ? point(list[0]) : null, labels: list.slice(0, 10).map(label) };
            }
            // Lock the fitted Flow viewport and suppress IME requests without blocking DOM text editing.
            function freezeZoom(on) {
              var state = window.__agFlowInputLock;
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
                window.__agFlowInputLock = null;
                return { ok: true };
              }
              if (state) {
                state.applyViewport();
                return { ok: true, scale: state.scale };
              }
              var meta = document.querySelector('meta[name="viewport"]');
              state = { originalViewport: meta && meta.getAttribute('content'), createdViewport: !meta, fields: new Map() };
              window.__agFlowInputLock = state;
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
            // Grid tiles: hover a tile (by its unique title) so its "More options" button appears
            function tileHover(title) {
              var tiles = document.querySelectorAll('flow-grid-tile-container');
              for (var i = 0; i < tiles.length; i++) {
                if (tiles[i].getAttribute('aria-label') !== title) continue;
                var t = tiles[i];
                try { t.scrollIntoView({ block: 'center', behavior: 'instant' }); } catch (e) {}
                var r = t.getBoundingClientRect();
                var opts = { bubbles: true, cancelable: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 };
                [t].concat(Array.prototype.slice.call(t.querySelectorAll('*'), 0, 30)).forEach(function (el) {
                  ['pointerover', 'pointerenter', 'mouseover', 'mouseenter', 'mousemove'].forEach(function (type) {
                    try { el.dispatchEvent(type.indexOf('pointer') === 0 ? new PointerEvent(type, opts) : new MouseEvent(type, opts)); } catch (e) {}
                  });
                });
                return { found: true };
              }
              return { found: false };
            }
            function tileMoreOptions(title) {
              var tiles = document.querySelectorAll('flow-grid-tile-container');
              for (var i = 0; i < tiles.length; i++) {
                if (tiles[i].getAttribute('aria-label') !== title) continue;
                var b = tiles[i].querySelector('button[aria-label="More options"]');
                return b ? point(b) : { found: false, tile: true };
              }
              return { found: false };
            }

            // ---------- Agent mode (the pill's aria-pressed is the source of truth) ----------
            function agentPill() {
              var list = document.querySelectorAll('button[aria-pressed]');
              for (var i = 0; i < list.length; i++) {
                if (shown(list[i]) && /(^|\s)agent\s*$/i.test(norm(list[i].innerText || list[i].textContent))) return list[i];
              }
              return null;
            }
            function agentState() {
              var pill = agentPill();
              return { found: !!pill, on: !!pill && pill.getAttribute('aria-pressed') === 'true',
                instructions: !!byAria('Agent instructions'), panel: !!byAria('Start new session') };
            }
            function agentOff() {
              var pill = agentPill();
              if (pill && pill.getAttribute('aria-pressed') === 'true') pill.click();
              if (byAria('Start new session')) { var close = byAria('Close'); if (close) close.click(); }
              return agentState();
            }

            // ---------- Project grid: search + tile menu (picker-free attach, upscales) ----------
            function setInputValue(input, value) {
              input.focus();
              var desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
              desc.set.call(input, value);
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));
            }
            function gridSearch(value) {
              var input = document.querySelector('input[aria-label="Search"]');
              if (!input) return { ok: false };
              setInputValue(input, value);
              ['keydown', 'keypress', 'keyup'].forEach(function (type) {
                input.dispatchEvent(new KeyboardEvent(type, { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
              });
              input.blur();
              return { ok: true };
            }
            function tiles(title) {
              return Array.prototype.filter.call(document.querySelectorAll('flow-grid-tile-container'), function (t) {
                return t.getAttribute('aria-label') === title;
              });
            }
            function tileCount(title) { return { count: tiles(title).length }; }
            function hover(t) {
              try { t.scrollIntoView({ block: 'center', behavior: 'instant' }); } catch (e) {}
              var r = t.getBoundingClientRect();
              var o = { bubbles: true, cancelable: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 };
              [t].concat(Array.prototype.slice.call(t.querySelectorAll('*'), 0, 40)).forEach(function (el) {
                ['pointerover', 'pointerenter', 'mouseover', 'mouseenter', 'mousemove'].forEach(function (type) {
                  try { el.dispatchEvent(type.indexOf('pointer') === 0 ? new PointerEvent(type, o) : new MouseEvent(type, o)); } catch (e) {}
                });
              });
            }
            // Opens the "More options" menu of the (unique) tile with this title; script clicks work for this menu
            function tileMenu(title) {
              var list = tiles(title);
              if (list.length !== 1) return { ok: false, count: list.length };
              hover(list[0]);
              var b = list[0].querySelector('button[aria-label="More options"]');
              if (!b) return { ok: false, count: 1, noButton: true };
              b.click();
              return { ok: true };
            }
            function menuClick(name) {
              var want = name.toLowerCase(), best = null, bestLen = Infinity;
              document.querySelectorAll('[role="menu"] [role="menuitem"], .cdk-overlay-pane [role="menuitem"]').forEach(function (el) {
                var l = label(el);
                if (shown(el) && l.toLowerCase().indexOf(want) >= 0 && l.length < bestLen) { best = el; bestLen = l.length; }
              });
              if (!best) return { ok: false };
              if (disabled(best)) return { ok: false, disabled: true };
              best.click();
              return { ok: true, label: label(best) };
            }
            function clickEl(selOrEl) {
              var el = (typeof selOrEl === 'string') ? document.querySelector(selOrEl) : selOrEl;
              if (!el) return { ok: false, error: 'element_not_found' };
              if (disabled(el)) return { ok: false, error: 'element_disabled' };
              try { el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' }); } catch (e) {}
              var opts = { bubbles: true, cancelable: true, composed: true, view: window };
              try { el.dispatchEvent(new PointerEvent('pointerdown', opts)); } catch (e) {}
              try { el.dispatchEvent(new MouseEvent('mousedown', opts)); } catch (e) {}
              try { el.dispatchEvent(new PointerEvent('pointerup', opts)); } catch (e) {}
              try { el.dispatchEvent(new MouseEvent('mouseup', opts)); } catch (e) {}
              if (typeof el.click === 'function') {
                el.click();
              }
              return { ok: true, label: label(el) };
            }
            function clickAria(name) { var el = byAria(name); if (!el) return { ok: false }; return clickEl(el); }
            function clickRadio(pattern) {
              var root = pane();
              if (!root) return { ok: false, error: 'pane_not_found' };
              var el = byText(pattern, '[role="radio"]', root);
              if (!el) return { ok: false, error: 'radio_not_found' };
              if (el.getAttribute('aria-checked') === 'true') return { ok: true, alreadyChecked: true };
              return clickEl(el);
            }
            function clickModelButton() {
              var root = pane();
              var el = root && root.querySelector('button[aria-label="Select model family"]');
              if (!el) return { ok: false, error: 'model_button_not_found' };
              return clickEl(el);
            }
            function clickPickerTab(name) {
              var p = picker();
              var el = p && byText('(^|\\s)' + name + '\\s*$', '[role="tab"]', p);
              if (!el) return { ok: false, error: 'picker_tab_not_found' };
              return clickEl(el);
            }
            function clickChip(index) {
              var c = chips()[index];
              if (!c) return { ok: false, error: 'chip_not_found' };
              var removeBtn = c.querySelector('.hover-icon-overlay, mat-icon.hover-icon, button') || c;
              return clickEl(removeBtn);
            }
            function submitButton() {
              var root = promptRoot();
              if (!root) return null;
              var buttons = Array.prototype.filter.call(root.querySelectorAll('button'), shown);
              return buttons.find(function (b) {
                return b.matches("button.generate-icon-button, button[aria-label='Start generation'], div.submit-controls button[type='submit']");
              }) || buttons.find(function (b) {
                var icon = b.querySelector('mat-icon');
                return icon && norm(icon.textContent) === 'arrow_forward';
              }) || null;
            }
            function clickPickerOption(i) {
              var lb = listbox();
              var list = lb ? Array.prototype.filter.call(lb.querySelectorAll('[role="option"]'), shown) : [];
              if (!list[i]) return { ok: false, error: 'option_not_found' };
              return clickEl(list[i]);
            }
            function clickPickerButton(pattern) {
              var p = picker();
              var el = p && byText(pattern, 'button, [role="button"]', p);
              if (!el) return { ok: false, error: 'button_not_found' };
              return clickEl(el);
            }
            function submitInfo() {
              var btn = submitButton();
              if (!btn) return { found: false, error: 'submit_button_not_found' };
              if (disabled(btn)) return { found: true, disabled: true, error: 'submit_button_disabled' };

              try { btn.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' }); } catch (e) {}
              var r = btn.getBoundingClientRect();
              var vv = window.visualViewport;
              var vw = vv ? vv.width : window.innerWidth;
              var vh = vv ? vv.height : window.innerHeight;
              var ox = vv ? vv.offsetLeft : 0;
              var oy = vv ? vv.offsetTop : 0;
              var cx = r.left + r.width / 2 - ox;
              var cy = r.top + r.height / 2 - oy;
              var inViewport = vw > 0 && vh > 0 && cx > 0 && cy > 0 && cx < vw && cy < vh;
              var hit = inViewport ? document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) : null;
              var canTap = !!hit && (hit === btn || btn.contains(hit));

              return {
                found: true,
                disabled: false,
                canTap: canTap,
                error: canTap ? null : (inViewport ? 'submit_button_covered' : 'submit_button_outside_viewport'),
                fx: cx / vw,
                fy: cy / vh
              };
            }

            // ---------- Editor: version history ----------
            function mainImageId() {
              var best = null;
              document.querySelectorAll('img').forEach(function (img) {
                var r = img.getBoundingClientRect();
                if (r.width > 300 && shown(img) && (!best || r.width > best.getBoundingClientRect().width)) best = img;
              });
              var m = best ? /\/image\/([^?\/#]+)/.exec(best.currentSrc || best.src || '') : null;
              return { id: m ? m[1] : null };
            }
            function historyItems() {
              return Array.prototype.filter.call(document.querySelectorAll('flow-tile-container'), shown);
            }
            function openHistory() {
              if (historyItems().length) return { ok: true, count: historyItems().length };
              var b = byText('(^|\\s)show history\\s*$');
              if (!b) return { ok: false };
              b.click();
              return { ok: true };
            }
            function historyCount() { return { count: historyItems().length }; }
            function historyClick(i) {
              var it = historyItems()[i];
              if (!it) return { ok: false };
              var target = it.querySelector('button, img') || it;
              target.click();
              return { ok: true };
            }

            // ---------- UI ----------
            function ui() {
              var w = window.WIZ_global_data;
              var m = /\/project\/([^/?#]+)/.exec(location.pathname);
              var trigger = byAria('Settings trigger');
              return {
                url: location.href,
                path: location.pathname,
                ready: !!(w && w.SNlM0e),
                projectId: m ? m[1] : null,
                prompt: !!promptEl(),
                settingsTrigger: !!trigger,
                settingsText: trigger ? norm(trigger.innerText || trigger.textContent) : null,
                agentInstructions: !!byAria('Agent instructions'),
                agentOn: (function () { var p = agentPill(); return !!p && p.getAttribute('aria-pressed') === 'true'; })(),
                newProject: !!byText('new\\s*project'),
                signIn: !!byText('^\\s*(sign\\s*in|log\\s*in)\\b', 'a, button, [role="button"]'),
                account: (function () {
                  var el = document.querySelector('[aria-label^="Google Account:"]');
                  if (!el) return null;
                  return norm(el.getAttribute('aria-label').replace(/^Google Account:\s*/, '')).replace(/\s*\(/, ' (').replace(/\)\s*,.*$/, ')');
                })(),
                settingsOpen: !!pane(),
                menuOpen: !!menu(),
                pickerOpen: !!picker(),
                refs: refCount(),
                chipIds: chipIds(),
                startSlot: !!byText('^\\s*start\\s*$'),
                endSlot: !!byText('^\\s*end\\s*$')
              };
            }
            function aria(name) { var el = byAria(name); return el ? point(el) : { found: false }; }
            function text(pattern, sel) { var el = byText(pattern, sel); return el ? point(el) : { found: false }; }
            function agentToggle() { var el = byText('^\\s*(\\S+\\s+)?agent\\s*$'); return el ? point(el) : { found: false }; }
            function radio(pattern) {
              var root = pane();
              if (!root) return { found: false };
              var el = byText(pattern, '[role="radio"]', root);
              return el ? point(el) : { found: false };
            }
            function radios() {
              var root = pane(), out = [];
              if (!root) return out;
              root.querySelectorAll('[role="radio"]').forEach(function (el) {
                if (shown(el)) out.push(label(el) + (el.getAttribute('aria-checked') === 'true' ? ' [on]' : ''));
              });
              return out;
            }
            function modelButton() {
              var root = pane();
              var el = root && root.querySelector('button[aria-label="Select model family"]');
              return el && shown(el) ? point(el) : { found: false };
            }
            function menuItem(name) {
              if (!menu()) return { found: false };
              var want = name.toLowerCase(), best = null, bestLen = Infinity;
              document.querySelectorAll('[role="menu"] [role="menuitem"]').forEach(function (el) {
                var l = label(el);
                if (shown(el) && l.toLowerCase().indexOf(want) >= 0 && l.length < bestLen) { best = el; bestLen = l.length; }
              });
              return best ? point(best) : { found: false };
            }
            function menuItems() {
              var root = menu(), out = [];
              if (root) root.querySelectorAll('[role="menuitem"]').forEach(function (el) { if (shown(el)) out.push(label(el)); });
              return out;
            }
            function cost() {
              var root = pane();
              var m = root ? /Generating will use (\d+) credits?/i.exec(root.innerText || '') : null;
              return { cost: m ? Number(m[1]) : null };
            }
            function pickerButton(pattern) {
              var p = picker();
              var el = p && byText(pattern, 'button, [role="button"]', p);
              return el ? point(el) : { found: false };
            }
            function pickerSearch(value) {
              var p = picker();
              var input = p && p.querySelector('input[aria-label="Search assets"]');
              if (!input) return { ok: false };
              input.focus();
              input.select();
              document.execCommand('insertText', false, value);
              if (input.value !== value) {
                var desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
                desc.set.call(input, value);
                input.dispatchEvent(new Event('input', { bubbles: true }));
              }
              return { ok: true };
            }
            function pickerItem(mediaId) {
              var lb = listbox();
              if (!lb) return { found: false };
              var opts = lb.querySelectorAll('[role="option"]');
              for (var i = 0; i < opts.length; i++) {
                var img = opts[i].querySelector('img');
                var src = img ? (img.currentSrc || img.src || '') : '';
                if (src.indexOf('/' + mediaId) >= 0 && shown(opts[i])) return point(opts[i]);
              }
              return { found: false };
            }
            function pickerScroll(reset) {
              var root = picker();
              if (!root) return { ok: false };
              var scroller = Array.prototype.find.call(root.querySelectorAll('[role="listbox"], cdk-virtual-scroll-viewport, div'), function (el) {
                return shown(el) && el.scrollHeight > el.clientHeight && /auto|scroll/.test(getComputedStyle(el).overflowY);
              });
              if (!scroller) return { ok: false };
              var before = scroller.scrollTop;
              scroller.scrollTop = reset ? 0 : before + Math.max(200, scroller.clientHeight * 0.8);
              return { ok: true, moved: scroller.scrollTop !== before };
            }
            function findPrompt() { var el = promptEl(); return el ? point(el) : { found: false }; }
            function promptValue() { var el = promptEl(); return { value: el ? norm(el.tagName === 'TEXTAREA' ? el.value : el.innerText) : '' }; }
            function setPrompt(value) {
              var el = promptEl();
              if (!el) return { ok: false, error: 'prompt box not found' };
              el.focus();
              if (el.tagName === 'TEXTAREA') {
                el.select();
                document.execCommand('insertText', false, value);
              } else {
                var range = document.createRange();
                range.selectNodeContents(el);
                var sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
                document.execCommand('delete', false);
                document.execCommand('insertText', false, value);
              }
              var v = norm(el.tagName === 'TEXTAREA' ? el.value : el.innerText);
              return { ok: v === norm(value), value: v.slice(0, 200) };
            }
            function blurAll() {
              try { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); } catch (e) {}
              try { window.getSelection().removeAllRanges(); } catch (e) {}
              return { ok: true };
            }
            function escape() {
              var ev = { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true, cancelable: true };
              (document.activeElement || document.body).dispatchEvent(new KeyboardEvent('keydown', ev));
              document.body.dispatchEvent(new KeyboardEvent('keydown', ev));
              return { ok: true };
            }
            function controls() {
              var out = [];
              document.querySelectorAll('button, [role="button"], [role="radio"], [role="menuitem"]').forEach(function (el) {
                if (!shown(el)) return;
                var l = label(el);
                if (l && l.length <= 80 && out.indexOf(l) < 0) out.push(l);
              });
              return out.slice(0, 60);
            }

            // Like the extension, reuse unchanged settings instead of opening the popover for every prompt.
            // Keep the exact request key too: the compact trigger does not expose every video setting.
            var settingsCache = null;
            function settingsFingerprint() {
              var trigger = byAria('Settings trigger');
              return trigger ? norm(trigger.innerText || trigger.textContent) : null;
            }
            function cachedSettings(key) {
              var c = settingsCache;
              return { matches: !!c && c.key === key && c.path === location.pathname &&
                c.root === promptRoot() && c.fingerprint === settingsFingerprint() &&
                !pane() && !menu() && !picker(), cost: c ? c.cost : null };
            }
            function rememberSettings(key, value) {
              settingsCache = { key: key, path: location.pathname, root: promptRoot(),
                fingerprint: settingsFingerprint(), cost: value };
              return { ok: true };
            }
            function invalidateSettings() { settingsCache = null; return { ok: true }; }

            function configureSettingsFast(isVideo, targetRatio, targetDuration, targetCount, targetModel) {
              var trigger = document.querySelector("button[aria-label='Settings trigger'], button.settings-trigger-button");
              var trigText = (trigger ? (trigger.innerText || '') : '').toLowerCase();
              var cleanRatio = (targetRatio || '').replace(':', '_').replace('/', '_');
              var isAlreadyImage = !isVideo && (trigText.indexOf('banana') >= 0 || trigText.indexOf('imagen') >= 0 || trigText.indexOf('image') >= 0);
              var isAlreadyVideo = isVideo && trigText.indexOf('video') >= 0 && (!targetDuration || trigText.indexOf(targetDuration + 's') >= 0);
              var ratioMatches = !targetRatio || trigText.indexOf(cleanRatio) >= 0 || trigText.indexOf(targetRatio) >= 0;
              var countMatches = !targetCount || trigText.indexOf('x' + targetCount) >= 0;

              if (trigger && ((isAlreadyImage && ratioMatches && countMatches) || (isAlreadyVideo && ratioMatches && countMatches))) {
                return { success: true, skipped: true, cost: (cost() || {}).cost };
              }

              var settings = pane() || document.querySelector('flow-prompt-box-settings');
              if (!settings && trigger) {
                trigger.click();
                settings = pane() || document.querySelector('flow-prompt-box-settings');
              }
              if (!settings) return { success: false, reason: 'Settings popover not found' };

              var modeRadios = Array.prototype.slice.call(settings.querySelectorAll("button[role='radio'], mat-button-toggle button"));
              if (isVideo) {
                var vBtn = modeRadios.find(function(b) { return (b.innerText || '').indexOf('Video') >= 0 || (b.innerHTML || '').indexOf('videocam') >= 0; });
                if (vBtn && vBtn.getAttribute('aria-checked') !== 'true') vBtn.click();
              } else {
                var iBtn = modeRadios.find(function(b) { return (b.innerText || '').indexOf('Image') >= 0 || (b.innerHTML || '').indexOf('image') >= 0; });
                if (iBtn && iBtn.getAttribute('aria-checked') !== 'true') iBtn.click();
              }

              if (targetRatio) {
                var ratioBtn = modeRadios.find(function(b) {
                  var t = (b.innerText || '') + ' ' + (b.getAttribute('aria-label') || '');
                  return t.indexOf(targetRatio) >= 0 || t.indexOf(cleanRatio) >= 0;
                });
                if (ratioBtn && ratioBtn.getAttribute('aria-checked') !== 'true') ratioBtn.click();
              }

              if (isVideo && targetDuration) {
                var durBtn = modeRadios.find(function(b) {
                  var t = (b.innerText || '') + ' ' + (b.getAttribute('aria-label') || '');
                  return t.indexOf(targetDuration + 's') >= 0;
                });
                if (durBtn && durBtn.getAttribute('aria-checked') !== 'true') durBtn.click();
              }

              var c = (cost() || {}).cost;
              escape();
              return { success: true, skipped: false, cost: c };
            }

            function openAddMenu() {
              if (picker()) return { ok: true, open: true };
              var root = promptRoot();
              var addBtn = root && Array.prototype.find.call(root.querySelectorAll("button[aria-label*='Add ingredients' i], button.add-menu-trigger, flow-add-menu button"), shown);
              return addBtn ? clickEl(addBtn) : { ok: false, error: 'add_menu_button_not_found' };
            }
            function isAddMenuOpen() {
              return { open: !!picker() };
            }
            function switchAddMenuTab(tabName) {
              var root = picker();
              if (!root) return { ok: false, error: 'picker_not_open' };
              var allTabs = Array.prototype.filter.call(root.querySelectorAll('[role="tab"]'), shown);
              var tabEl = allTabs.find(function(t) {
                var text = norm(t.innerText || t.textContent).toLowerCase(), name = tabName.toLowerCase();
                return text === name || text.endsWith(' ' + name);
              });
              if (tabEl && tabEl.getAttribute('aria-selected') === 'true') return { ok: true, alreadySelected: true };
              if (tabEl) return clickEl(tabEl);
              return { ok: false, error: 'tab_not_found' };
            }
            // Port of flow_mcp/service-worker.js: attachLibraryAssetsBatch (generation path).
            async function attachLibraryAssetBatch(targets, doClear, promptText, targetMediaId) {
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
                if(targetMediaId){const byId=btns.find(b=>b.outerHTML.includes(targetMediaId));if(byId)return byId;}
                const clean = targetName.replace(/^[:#@]/, "").toLowerCase().trim();
                const cleanSpaced = clean.replace(/_/g, " ");

                // Priority 1: Exact first-line match (title)
                let match = btns.find(b => {
                  const lines = (b.innerText || "").toLowerCase().split("\n").map(l => l.trim()).filter(Boolean);
                  const title = (lines[0] || "").replace(/\.(png|jpg|jpeg|webp)$/i, "");
                  return title === clean || title === cleanSpaced;
                });
                if (match) return match;

                // Priority 2: Word boundary or exact inclusion
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

                const tabNames = ["Characters", "Images", "All", "Uploads", "Videos"];
                for (const tabName of tabNames) {
                  if (getPromptChips().length >= 5) break;
                  if (!(await ensureMenuOpen())) break;
                  await switchTab(tabName);
                  await new Promise(r => setTimeout(r, 80));

                  const match = findMatch(targetName);
                  if (match) {
                    const prevLen = getPromptChips().length;
                    match.click();
                    await new Promise(r => setTimeout(r, 100));
                    const addPromptBtn = Array.from(document.querySelectorAll("button")).find(b => (b.innerText || "").includes("Add to prompt") && !b.disabled);
                    if (addPromptBtn) addPromptBtn.click();

                    await poll(() => getPromptChips().length > prevLen, 400, 15);
                    attached.push(targetName);
                    break;
                  }
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
            }

            // evaluateJavascript cannot await a Promise; keep the extension's result for Kotlin to collect.
            function attachStart(key, targetName, targetMediaId) {
              window.__agFlowRes[key] = { done: false };
              var beforeCount = chipIds().length;
              attachLibraryAssetBatch([targetName.replace(/^@/, '').trim()], false, '', targetMediaId).then(function (value) {
                // Frame slots use Image ingredient buttons, outside the extension's ingredient-chip count.
                var count = chipIds().length;
                if (count > beforeCount) { value.success = true; value.chipsCount = count; }
                window.__agFlowRes[key] = { done: true, value: value };
              }, function (error) {
                window.__agFlowRes[key] = { done: true, error: String(error) };
              });
              return { ok: true };
            }
            function clickAddToPrompt() {
              var root = picker();
              if (!root) return { ok: false, error: 'picker_not_open' };
              var btns = Array.prototype.filter.call(root.querySelectorAll('button'), shown);
              var addPromptBtn = btns.find(function(b) {
                return (b.matches('button.detail-add-to-prompt-btn') || /(^|\s)add to prompt\s*$/i.test(label(b))) && !disabled(b);
              });
              if (addPromptBtn) return clickEl(addPromptBtn);
              return { ok: false, error: 'button_not_found' };
            }
            function closeAddMenu() {
              if (!picker()) return { ok: true };
              var backdrop = Array.prototype.filter.call(document.querySelectorAll('.cdk-overlay-backdrop'), shown).pop();
              if (backdrop) clickEl(backdrop);
              escape();
              return { ok: true };
            }

            function clearPromptFast() {
              if (chipIds().length) return { ok: false };
              if (promptValue().value) setPrompt('');
              blurAll();
              return { ok: chipIds().length === 0 && promptValue().value === '' };
            }

            function fastInsertPrompt(text) {
              // Text insertion sequence from flow_mcp's fastFillAndSubmitPrompt.
              var box = document.querySelector("div.ProseMirror, flow-rich-text-editor div[role='textbox'], div[contenteditable='true']");
              if (!box) return { success: false, reason: 'Prompt box not found' };
              box.focus();
              document.execCommand('selectAll', false, null);
              document.execCommand('delete', false, null);
              document.execCommand('insertText', false, text);
              box.dispatchEvent(new InputEvent('beforeinput', {
                bubbles: true, cancelable: true, inputType: 'insertText', data: text
              }));
              box.dispatchEvent(new Event('input', { bubbles: true }));
              var accepted = promptValue().value === norm(text);
              blurAll();
              return { success: accepted };
            }

            // ---------- RPC (batchexecute) ----------
            function parseBatch(text, id) {
              var lines = String(text || '').split('\n');
              for (var i = 0; i < lines.length; i++) {
                if (lines[i].charAt(0) !== '[') continue;
                try {
                  var arr = JSON.parse(lines[i]);
                  for (var j = 0; j < arr.length; j++) {
                    var e = arr[j];
                    if (e && e[0] === 'wrb.fr' && e[1] === id) {
                      return e[2] ? { value: JSON.parse(e[2]) } : { error: 'Flow returned error ' + JSON.stringify(e[5]) };
                    }
                  }
                } catch (err) {}
              }
              return null;
            }
            function rpc(id, args) {
              var w = window.WIZ_global_data;
              if (!w || !w.SNlM0e) return Promise.reject(new Error('Flow page is not ready (no WIZ_global_data)'));
              var q = new URLSearchParams({ rpcids: id, 'source-path': location.pathname, bl: w.cfb2h, 'f.sid': w.FdrFJe,
                hl: 'en', _reqid: String(100000 + Math.floor(Math.random() * 900000)), rt: 'c' });
              var body = new URLSearchParams({ 'f.req': JSON.stringify([[[id, JSON.stringify(args), null, 'generic']]]), at: w.SNlM0e });
              return fetch('/_/AiSandboxAngularFrontend/data/batchexecute?' + q, {
                method: 'POST', credentials: 'include', body: body,
                headers: { 'content-type': 'application/x-www-form-urlencoded;charset=UTF-8', 'x-same-domain': '1' }
              }).then(function (r) {
                return r.text().then(function (t) {
                  var res = parseBatch(t, id);
                  if (!res) throw new Error('No response for ' + id + ' (HTTP ' + r.status + ')');
                  if (res.error) throw new Error(res.error);
                  return res.value;
                });
              });
            }

            function at(x, path) {
              for (var i = 0; i < path.length; i++) { if (!Array.isArray(x)) return undefined; x = x[path[i]]; }
              return x;
            }
            function str(x) { return typeof x === 'string' ? x : null; }
            function flowUrl(x) { return typeof x === 'string' && x.indexOf('https://flow-content.google/') === 0 ? x : null; }
            function findUrl(x, depth) {
              if (x == null || depth > 10) return null;
              if (typeof x === 'string') return flowUrl(x);
              if (Array.isArray(x)) {
                for (var i = 0; i < x.length; i++) { var r = findUrl(x[i], depth + 1); if (r) return r; }
              }
              return null;
            }
            function mediaRecord(d) {
              var meta = at(d, [5]) || [];
              var video = flowUrl(at(d, [7, 0, 8]));
              var image = flowUrl(meta[10]);
              return {
                mediaId: str(at(d, [0])), projectId: str(at(d, [1])), workflowId: str(at(d, [2])),
                type: video || at(d, [7]) || /abra|veo|omni/.test(str(at(meta, [6, 1, 0, 0])) || '') ? 'video' : 'image',
                url: video || image || findUrl(d, 0), thumbnail: video ? image : null,
                modelKey: str(at(meta, [6, 1, 0, 0])),
                status: at(meta, [8, 0]) === undefined ? null : at(meta, [8, 0]),
                title: str(meta[1]) || '', prompt: (str(meta[12]) || '').slice(0, 300),
                w: at(d, [6, 2, 0]) || 0, h: at(d, [6, 2, 1]) || 0
              };
            }
            var POST = {
              credits: function (d) { return { credits: at(d, [0]) }; },
              models: function (d) {
                function names(list) { return (Array.isArray(list) ? list : []).map(function (f) { return str(at(f, [0])); }).filter(Boolean); }
                return { image: names(at(d, [0, 5])), video: names(at(d, [0, 4])) };
              },
              projects: function (d) {
                return (at(d, [0]) || []).map(function (p) {
                  return { projectId: at(p, [0]), title: at(p, [1, 0]) || '', created: at(p, [1, 2, 0]) || null };
                });
              },
              contents: function (d) {
                var wfs = {};
                (at(d, [1]) || []).forEach(function (w) {
                  var id = str(at(w, [0]));
                  if (id) wfs[id] = { title: str(at(w, [3, 0])) || '', archived: at(w, [3, 2]) === true };
                });
                return (at(d, [2]) || []).map(function (it) {
                  var meta = at(it, [5]) || [];
                  var status = at(meta, [8, 0]);
                  var key = str(at(meta, [6, 1, 0, 0])) || '';
                  var wf = wfs[str(at(it, [2])) || ''] || {};
                  return {
                    mediaId: at(it, [0]), workflowId: str(at(it, [2])),
                    type: at(it, [7]) || /abra|veo|omni/.test(key) ? 'video' : 'image',
                    title: wf.title || str(meta[1]) || '', trashed: !!wf.archived, modelKey: key || null,
                    prompt: (str(meta[12]) || '').slice(0, 300) || undefined, created: at(meta, [0, 0]) || null,
                    pending: status === 2 || status === 6,
                    w: at(it, [6, 2, 0]) || 0, h: at(it, [6, 2, 1]) || 0
                  };
                });
              },
              created: function (d) { return { projectId: str(at(d, [0])), title: at(d, [1, 0]) || '' }; },
              renamed: function (d) { return { title: at(d, [0]) || '' }; },
              media: mediaRecord,
              videoStatus: function (d) {
                return (at(d, [2]) || []).map(function (rec) { return { mediaId: str(at(rec, [0])), status: at(rec, [5, 8, 0]) }; });
              },
              concatStart: function (d) { return { job: str(at(d, [1, 0, 0])) }; },
              concatStatus: function (d, key) { var b = str(at(d, [4])); return { state: at(d, [0]), len: b ? stash(key, b) : 0, key: key }; },
              gif: function (d, key) { var b = str(at(d, [0])); return { len: b ? stash(key, b) : 0, key: key }; },
              scene: function (d) { return { sceneId: str(at(d, [0, 0])), name: str(at(d, [0, 1])) || '' }; },
              ok: function () { return { ok: true }; }
            };
            // Large base64 results (combined MP4, GIF) stay in the page and are read in chunks
            function stash(key, b64) {
              window.__agFlowBlob = window.__agFlowBlob || {};
              window.__agFlowBlob[key] = b64;
              return b64.length;
            }
            function blobChunk(key, start, len) { var b = (window.__agFlowBlob || {})[key]; return b ? b.substr(start, len) : ''; }
            function blobDrop(key) { if (window.__agFlowBlob) delete window.__agFlowBlob[key]; return { ok: true }; }

            // Async results are kept here until Kotlin collects them (evaluateJavascript cannot await)
            window.__agFlowRes = window.__agFlowRes || {};
            function rpcStart(key, id, argsJson, post) {
              var res = window.__agFlowRes;
              res[key] = { done: false };
              rpc(id, JSON.parse(argsJson)).then(function (v) {
                res[key] = { done: true, value: post && POST[post] ? POST[post](v, key) : v };
              }, function (e) {
                res[key] = { done: true, error: String((e && e.message) || e) };
              });
              return { ok: true };
            }
            function result(key) {
              var r = window.__agFlowRes[key];
              if (!r) return { done: true, error: 'unknown request' };
              if (r.done) delete window.__agFlowRes[key];
              return r;
            }

            // ---------- Send Guard ----------
            // An expectation is armed right before "Start generation" is tapped; the next generate request is
            // validated against it and blocked (never sent to Google, no credits) if anything differs.
            function expect(json) { window.__agFlowExpect = JSON.parse(json); watch(); return { ok: true }; }
            function clearExpect() { window.__agFlowExpect = null; return { ok: true }; }
            function sameList(a, b) { return JSON.stringify(a || []) === JSON.stringify(b || []); }
            function validate(rpc, a, exp) {
              var p = [];
              if (!a) return ['Could not decode the outgoing request; stopped before sending'];
              if ((exp.rpcs || []).indexOf(rpc) < 0) return ['wrong request kind ' + rpc + ' (expected ' + (exp.rpcs || []).join('/') + ')'];
              if (rpc === UPSCALE_RPC) {
                if (a[0] !== exp.mediaId) p.push('upscale media ' + a[0] + ' != ' + exp.mediaId);
                return p;
              }
              if (rpc === EXTEND_RPC || rpc === UPSCALE_VIDEO_RPC) {
                if (JSON.stringify(a).indexOf(exp.mediaId) < 0) p.push('request does not reference ' + exp.mediaId);
                return p;
              }
              if (rpc === EDIT_RPC) {
                var ed = at(a, [0]) || [];
                if (JSON.stringify(ed).indexOf(exp.mediaId) < 0) p.push('edit request does not reference ' + exp.mediaId);
                return p;
              }
              var isImage = rpc === IMAGE_RPC, isRefs = rpc === REFS_RPC;
              var entries = isImage ? at(a, [1]) : at(a, [0]);
              if (!Array.isArray(entries) || !entries.length) return ['request has no entries'];
              if (exp.count && entries.length !== exp.count) p.push('count ' + entries.length + ' != ' + exp.count);
              entries.forEach(function (e) {
                var key = String(isImage ? e[5] : isRefs ? e[2] : e[1]);
                var aspect = isImage ? e[4] : isRefs ? e[3] : e[2];
                if (exp.modelKey && key !== exp.modelKey) p.push('model ' + key + ' != ' + exp.modelKey);
                (exp.keyMust || []).forEach(function (re) { if (!new RegExp(re).test(key)) p.push('model key ' + key + ' does not match ' + re); });
                (exp.keyMustNot || []).forEach(function (re) { if (new RegExp(re).test(key)) p.push('model key ' + key + ' must not match ' + re); });
                if (exp.aspect != null && aspect !== exp.aspect) p.push('aspect ' + aspect + ' != ' + exp.aspect);
                if (isImage || isRefs) {
                  var refs = isImage ? (e[2] || []).map(function (r) { return r && r[0]; }) : (e[1] || []).map(function (r) { return r && r[1]; });
                  if (!sameList(refs, exp.refs)) p.push('reference ids ' + JSON.stringify(refs) + ' != ' + JSON.stringify(exp.refs || []));
                }
                if (isImage && exp.workflowId && at(e, [7, 4]) !== exp.workflowId) p.push('edit targets workflow ' + at(e, [7, 4]) + ' != ' + exp.workflowId);
                if (exp.start != null && at(e, [4, 1]) !== exp.start) p.push('start frame ' + at(e, [4, 1]) + ' != ' + exp.start);
                if (exp.end != null && at(e, [5, 1]) !== exp.end) p.push('end frame ' + at(e, [5, 1]) + ' != ' + exp.end);
              });
              return p.filter(function (x, i) { return p.indexOf(x) === i; });
            }

            // ---------- capture of the page's own generate request + response ----------
            // Each generate/upload request gets a sequence number when it is SENT; its reply is attached
            // to the same entry when it arrives, so several requests can be in flight at once.
            function watch() {
              if (window.__agFlowCapOn) return;
              window.__agFlowCapOn = true;
              window.__agFlowCap = [];
              window.__agFlowCapN = 0;
              function start(url, reqBody) {
                try {
                  var u = new URL(url, location.href);
                  if (u.pathname.indexOf('batchexecute') < 0) return null;
                  var id = (u.searchParams.get('rpcids') || '').split(',').filter(function (r) {
                    return GEN_RPCS.indexOf(r) >= 0 || r === UPLOAD_RPC;
                  })[0];
                  if (!id) return null;
                  var args = null;
                  try {
                    var rawReq = (reqBody && typeof reqBody.get === 'function') ? reqBody.get('f.req') : (typeof reqBody === 'string' ? new URLSearchParams(reqBody).get('f.req') : null);
                    if (rawReq) args = JSON.parse(JSON.parse(rawReq)[0][0][1]);
                  } catch (e) {}
                  window.__agFlowCapN++;
                  var entry = { n: window.__agFlowCapN, rpc: id, args: args, done: false, status: 0, body: '' };
                  var exp = window.__agFlowExpect;
                  if (exp && id !== UPLOAD_RPC) {
                    window.__agFlowExpect = null;
                    var problems = validate(id, args, exp);
                    if (exp.dryRun) problems = ['dry-run'].concat(problems);
                    entry.guarded = true;
                    if (problems.length) {
                      entry.blocked = true;
                      entry.problems = problems;
                      entry.done = true;
                    }
                  }
                  window.__agFlowCap.push(entry);
                  if (window.__agFlowCap.length > 80) window.__agFlowCap.shift();
                  return entry;
                } catch (e) { return null; }
              }
              function finish(entry, status, body) {
                if (!entry) return;
                entry.status = status;
                entry.body = String(body || '');
                entry.done = true;
              }
              var oo = XMLHttpRequest.prototype.open, os = XMLHttpRequest.prototype.send;
              XMLHttpRequest.prototype.open = function (m, u) { this.__agU = u; return oo.apply(this, arguments); };
              XMLHttpRequest.prototype.send = function (b) {
                var x = this, entry = start(x.__agU, b);
                if (entry && entry.blocked) {
                  // Blocked by the guard: send an empty request to a dead path instead, so the page sees a failure
                  oo.call(x, 'POST', '/_/AiSandboxAngularFrontend/data/agBlocked', true);
                  return os.call(x, '');
                }
                if (entry) {
                  x.addEventListener('loadend', function () {
                    var body = '';
                    try { if (x.responseType === '' || x.responseType === 'text') body = x.responseText; } catch (e) {}
                    finish(entry, x.status, body);
                  });
                }
                return os.apply(this, arguments);
              };
              var of = window.fetch;
              window.fetch = async function (input, init) {
                var url = typeof input === 'string' ? input : (input && input.url) || '';
                var body = init && init.body;
                // Angular also calls fetch(new Request(...)) without an init argument. Read a clone
                // for validation, leaving the original request body and headers untouched.
                if (url.indexOf('batchexecute') >= 0 && body == null && input && typeof input.clone === 'function') {
                  body = await input.clone().text();
                }
                var entry = url.indexOf('batchexecute') >= 0 ? start(url, body) : null;
                if (entry && entry.blocked) throw new TypeError('Blocked by AntiGem send guard');
                var p = of.apply(window, arguments);
                if (entry) {
                  p.then(function (res) {
                    res.clone().text().then(function (t) { finish(entry, res.status, t); }, function () { finish(entry, res.status, ''); });
                  }, function () { finish(entry, 0, ''); });
                }
                return p;
              };
            }
            // Long strings (reCAPTCHA token, file bytes) are never handed out
            function redact(x, depth) {
              if (typeof x === 'string') return x.length > 600 ? '[' + x.length + ' chars redacted]' : x;
              if (Array.isArray(x) && depth < 12) return x.map(function (v) { return redact(v, depth + 1); });
              return x;
            }
            function capMark() { watch(); return { n: window.__agFlowCapN || 0 }; }
            function entryOf(seq) {
              var list = window.__agFlowCap || [];
              for (var i = 0; i < list.length; i++) if (list[i].n === seq) return list[i];
              return null;
            }
            // First generate request sent after mark n (ours, since submits are serialized) — what the page actually sent
            function capSent(n) {
              var list = window.__agFlowCap || [];
              for (var i = 0; i < list.length; i++) {
                var c = list[i];
                if (c.n <= n || c.rpc === UPLOAD_RPC) continue;
                var a = c.args;
                var sent = c.rpc === IMAGE_RPC
                  ? { count: (at(a, [1]) || []).length, modelKey: str(at(a, [1, 0, 5])), aspect: at(a, [1, 0, 4]), refs: (at(a, [1, 0, 2]) || []).length }
                  : c.rpc === REFS_RPC
                    ? { count: (at(a, [0]) || []).length, modelKey: str(at(a, [0, 0, 2])), aspect: at(a, [0, 0, 3]), refs: (at(a, [0, 0, 1]) || []).length }
                    : { count: (at(a, [0]) || []).length, modelKey: str(at(a, [0, 0, 1])), aspect: at(a, [0, 0, 2]) };
                if (c.problems && c.problems[0] === 'dry-run') sent.args = redact(a, 0);
                return { found: true, seq: c.n, rpc: c.rpc, sent: sent, guarded: !!c.guarded, blocked: !!c.blocked, problems: c.problems || [] };
              }
              return { found: false };
            }
            // The reply to request [seq]; lost: true when the page navigated and the entry is gone
            function capResult(seq) {
              var c = entryOf(seq);
              if (!c) return { found: false, lost: true };
              if (!c.done) return { found: true, done: false };
              var out = { found: true, done: true, rpc: c.rpc, status: c.status };
              var parsed = parseBatch(c.body, c.rpc);
              if (!parsed) { out.error = 'Flow generate request failed (HTTP ' + c.status + ')'; return out; }
              if (parsed.error) { out.error = parsed.error; return out; }
              var R = parsed.value;
              if (c.rpc === UPSCALE_RPC) {
                out.mediaId = str(at(R, [0, 0]));
                return out;
              }
              if (c.rpc === IMAGE_RPC) {
                out.images = (at(R, [0]) || []).map(function (it, idx) {
                  var url = flowUrl(at(it, [6, 0, 13])) || findUrl(it, 0);
                  var id = str(at(it, [0]));
                  if (!id && url) { var m = /\/image\/([^?\/#]+)/.exec(url); id = m ? m[1] : null; }
                  return { mediaId: id, url: url, title: str(at(R, [1, idx, 3, 0])) || '', w: at(it, [6, 2, 0]) || 0, h: at(it, [6, 2, 1]) || 0 };
                }).filter(function (r) { return r.mediaId; });
              } else {
                var ids = (at(R, [3]) || []).map(function (m) { return str(at(m, [0])); }).filter(Boolean);
                if (!ids.length) ids = (at(R, [2]) || []).map(function (w) { return str(at(w, [3, 4])); }).filter(Boolean);
                out.mediaIds = ids;
                out.creditsLeft = at(R, [1]);
              }
              return out;
            }

            function uploadsAfter(n) {
              var ids = [], errors = [];
              (window.__agFlowCap || []).forEach(function (c) {
                if (c.n <= n || c.rpc !== UPLOAD_RPC || !c.done) return;
                var parsed = parseBatch(c.body, c.rpc);
                if (!parsed) errors.push('upload failed (HTTP ' + c.status + ')');
                else if (parsed.error) errors.push(parsed.error);
                else { var id = str(at(parsed.value, [0, 0])); if (id) ids.push(id); }
              });
              return { ids: ids, errors: errors };
            }

            return {
              v: 23,
              ui: ui, aria: aria, text: text, agentToggle: agentToggle, radio: radio, radios: radios,
              modelButton: modelButton, menuItem: menuItem, menuItems: menuItems, cost: cost, findPrompt: findPrompt,
              setPrompt: setPrompt, escape: escape, controls: controls, rpcStart: rpcStart, result: result,
              capMark: capMark, capSent: capSent, capResult: capResult, uploadsAfter: uploadsAfter,
              pickerButton: pickerButton, pickerSearch: pickerSearch, pickerItem: pickerItem, pickerScroll: pickerScroll,
              pickerTab: pickerTab, pickerOptions: pickerOptions, pickerOptionAt: pickerOptionAt,
              agentState: agentState, agentOff: agentOff, gridSearch: gridSearch, tileCount: tileCount, tileMenu: tileMenu,
              menuClick: menuClick, clickAria: clickAria, mainImageId: mainImageId, openHistory: openHistory,
              historyCount: historyCount, historyClick: historyClick, blurAll: blurAll, promptValue: promptValue, chipIds: chipIds, chipPoint: chipPoint,
              expect: expect, clearExpect: clearExpect, freezeZoom: freezeZoom, tileHover: tileHover,
              tileMoreOptions: tileMoreOptions, blobChunk: blobChunk, blobDrop: blobDrop,
              configureSettingsFast: configureSettingsFast, fastInsertPrompt: fastInsertPrompt,
              cachedSettings: cachedSettings, rememberSettings: rememberSettings,
              invalidateSettings: invalidateSettings, clearPromptFast: clearPromptFast,
              openAddMenu: openAddMenu, isAddMenuOpen: isAddMenuOpen, switchAddMenuTab: switchAddMenuTab,
              attachStart: attachStart, clickAddToPrompt: clickAddToPrompt, closeAddMenu: closeAddMenu,
              clickEl: clickEl, clickRadio: clickRadio, clickModelButton: clickModelButton, clickPickerTab: clickPickerTab, clickChip: clickChip, byText: byText, agentPill: agentPill,
              clickPickerOption: clickPickerOption, clickPickerButton: clickPickerButton, submitInfo: submitInfo
            };
          })();
        }
    
