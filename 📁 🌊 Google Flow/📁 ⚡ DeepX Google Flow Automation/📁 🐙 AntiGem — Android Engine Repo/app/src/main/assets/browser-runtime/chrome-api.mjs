// Shared by worker and isolated content-script contexts. Keep this factory self contained.
export function createChromeAPI({ id, manifest, rpc, resourceBase, contextType = 'background', contextId }) {
  const events = new Map(), ports = new Map();
  const copy = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  function event(name) {
    if (!events.has(name)) {
      const listeners = new Set();
      events.set(name, { addListener(fn) { if (typeof fn !== 'function') throw new TypeError('Listener must be a function'); listeners.add(fn); },
        removeListener(fn) { listeners.delete(fn); }, hasListener(fn) { return listeners.has(fn); }, hasListeners() { return listeners.size > 0; },
        _listeners: listeners, _emit(...args) { for (const fn of [...listeners]) { try { const p = fn(...args); p?.catch?.(console.error); } catch (error) { console.error(error); } } } });
    }
    return events.get(name);
  }
  function call(method, args, callback) {
    const promise = Promise.resolve().then(() => rpc(method, copy(args)));
    if (typeof callback !== 'function') return promise;
    promise.then(value => callback(value), error => {
      chrome.runtime.lastError = { message: error?.message || String(error) };
      try { callback(undefined); } finally { delete chrome.runtime.lastError; }
    }).catch(console.error);
  }
  function api(method, normalize = args => args) {
    return (...args) => { const callback = typeof args.at(-1) === 'function' ? args.pop() : undefined; return call(method, normalize(args), callback); };
  }
  function port(portId, name = '', sender) {
    if (ports.has(portId)) return ports.get(portId);
    let closed = false;
    const p = { name, sender, onMessage: event(`port.${portId}.message`), onDisconnect: event(`port.${portId}.disconnect`),
      postMessage(message) { if (closed) throw new Error('Attempting to use a disconnected port'); (p._ready || Promise.resolve()).then(() => call('runtime.portMessage', { portId, message })).catch(error => disconnect(error)); },
      disconnect() { if (closed) return; closed = true; call('runtime.portDisconnect', { portId }).catch(console.error); ports.delete(portId); } };
    function disconnect(error) { if (closed) return; closed = true; if (error) chrome.runtime.lastError = { message: error.message }; p.onDisconnect._emit(p); delete chrome.runtime.lastError; ports.delete(portId); }
    p._disconnect = disconnect; ports.set(portId, p); return p;
  }
  function connect(target, info = {}) {
    const portId = `${contextId}:${Date.now()}:${Math.random()}`;
    const p = port(portId, info.name || '');
    // Connection and subsequent posts share the host's per-context request order.
    p._ready = call('runtime.connect', { portId, target, name: p.name });
    p._ready.catch(error => p._disconnect(error));
    return p;
  }
  const chrome = { runtime: {
    id, getManifest: () => copy(manifest), getURL: p => new URL(String(p || '').replace(/^\//, ''), resourceBase).href,
    onMessage: event('runtime.onMessage'), onMessageExternal: event('runtime.onMessageExternal'),
    onConnect: event('runtime.onConnect'), onInstalled: event('runtime.onInstalled'), onStartup: event('runtime.onStartup'), onSuspend: event('runtime.onSuspend'),
    sendMessage(...args) {
      const callback = typeof args.at(-1) === 'function' ? args.pop() : undefined;
      const extensionId = typeof args[0] === 'string' && args.length > 1 ? args.shift() : id;
      return call('runtime.sendMessage', { extensionId, message: args[0], options: args[1] || {} }, callback);
    },
    connect(extensionId, info) { if (typeof extensionId === 'object' || extensionId === undefined) return connect({ extensionId: id }, extensionId); return connect({ extensionId }, info); },
    reload: api('runtime.reload'), getPlatformInfo: api('runtime.getPlatformInfo'), getContexts: api('runtime.getContexts'),
    getBrowserInfo: api('runtime.getBrowserInfo'), openOptionsPage: api('runtime.openOptionsPage'),
  }, tabs: {}, scripting: {}, storage: { onChanged: event('storage.onChanged') }, debugger: {}, windows: {}, alarms: {}, downloads: {}, action: {}, sidePanel: {}, permissions: {}, cookies: {}, i18n: {} };
  for (const area of ['local', 'sync', 'session']) {
    chrome.storage[area] = { onChanged: event(`storage.${area}.onChanged`) };
    for (const op of ['get', 'set', 'remove', 'clear', 'getBytesInUse', 'getKeys']) chrome.storage[area][op] = api(`storage.${op}`, a => ({ area, value: a[0] ?? null }));
  }
  for (const name of ['query', 'get', 'create', 'remove', 'reload', 'goBack', 'goForward', 'getZoom', 'setZoom', 'getZoomSettings', 'setZoomSettings', 'move', 'duplicate', 'detectLanguage']) chrome.tabs[name] = api(`tabs.${name}`);
  chrome.tabs.update = api('tabs.update', args => typeof args[0] === 'object' ? [null, args[0]] : args);
  chrome.tabs.captureVisibleTab = api('tabs.captureVisibleTab', args => typeof args[0] === 'object' ? [null, args[0]] : args);
  chrome.tabs.sendMessage = api('tabs.sendMessage', a => ({ tabId: a[0], message: a[1], options: a[2] || {} }));
  chrome.tabs.connect = (tabId, info = {}) => connect({ tabId }, info);
  for (const e of ['onCreated', 'onUpdated', 'onRemoved', 'onActivated', 'onMoved', 'onZoomChange', 'onReplaced']) chrome.tabs[e] = event(`tabs.${e}`);
  chrome.scripting.executeScript = (injection, callback) => {
    const { func, ...details } = injection;
    return call('scripting.executeScript', { ...details, func: func ? String(func) : undefined }, callback);
  };
  for (const name of ['insertCSS', 'removeCSS', 'registerContentScripts', 'getRegisteredContentScripts', 'updateContentScripts', 'unregisterContentScripts']) chrome.scripting[name] = api(`scripting.${name}`);
  chrome.tabs.executeScript = (tabId, details, callback) => { if (typeof tabId === 'object') { callback = details; details = tabId; tabId = null; } return call('tabs.executeScript', { tabId, details }, callback); };
  for (const name of ['attach', 'detach', 'sendCommand', 'getTargets']) chrome.debugger[name] = api(`debugger.${name}`);
  chrome.debugger.onEvent = event('debugger.onEvent'); chrome.debugger.onDetach = event('debugger.onDetach');
  for (const name of ['get', 'getAll', 'getCurrent', 'getLastFocused', 'create', 'update', 'remove']) chrome.windows[name] = api(`windows.${name}`);
  for (const name of ['onCreated', 'onRemoved', 'onFocusChanged']) chrome.windows[name] = event(`windows.${name}`);
  for (const name of ['create', 'get', 'getAll', 'clear', 'clearAll']) chrome.alarms[name] = api(`alarms.${name}`);
  chrome.alarms.onAlarm = event('alarms.onAlarm');
  for (const name of ['download', 'search', 'cancel', 'erase', 'removeFile', 'open', 'show', 'getFileIcon']) chrome.downloads[name] = api(`downloads.${name}`);
  for (const name of ['onCreated', 'onChanged', 'onErased', 'onDeterminingFilename']) chrome.downloads[name] = event(`downloads.${name}`);
  for (const name of ['setBadgeText', 'getBadgeText', 'setBadgeBackgroundColor', 'getBadgeBackgroundColor', 'setTitle', 'getTitle', 'setPopup', 'getPopup', 'setIcon', 'enable', 'disable', 'isEnabled', 'openPopup']) chrome.action[name] = api(`action.${name}`);
  chrome.action.onClicked = event('action.onClicked'); chrome.browserAction = chrome.action;
  for (const name of ['open', 'close', 'setOptions', 'getOptions', 'setPanelBehavior', 'getPanelBehavior']) chrome.sidePanel[name] = api(`sidePanel.${name}`);
  for (const name of ['contains', 'getAll', 'request', 'remove']) chrome.permissions[name] = api(`permissions.${name}`);
  chrome.permissions.onAdded = event('permissions.onAdded'); chrome.permissions.onRemoved = event('permissions.onRemoved');
  for (const name of ['get', 'getAll', 'set', 'remove', 'getAllCookieStores']) chrome.cookies[name] = api(`cookies.${name}`);
  chrome.cookies.onChanged = event('cookies.onChanged');
  chrome.i18n.getUILanguage = () => 'en';
  chrome.i18n.getMessage = (key, substitutions) => { const entry = manifest.__messages?.[key]; let value = entry?.message || ''; const values = Array.isArray(substitutions) ? substitutions : [substitutions]; value = value.replace(/\$(\d+)/g, (_, i) => values[Number(i) - 1] ?? ''); return value; };
  chrome.i18n.detectLanguage = api('i18n.detectLanguage'); chrome.i18n.getAcceptLanguages = api('i18n.getAcceptLanguages');
  chrome.extension = { getURL: chrome.runtime.getURL, get inIncognitoContext() { return false; } };
  chrome.antigem = {};
  for (const name of ['automation', 'readFile', 'writeFile', 'listFiles', 'copyFile', 'stat', 'download', 'mediaFrame', 'mediaInfo']) chrome.antigem[name] = args => call(`antigem.${name}`, args);
  async function dispatch(name, args = []) {
    if (name === 'runtime.message') {
      const [message, sender, requestId] = args; let replied = false, keepOpen = false, pending = 0;
      const respond = response => { if (replied) return; replied = true; call('runtime.respond', { requestId, response: copy(response) }).catch(console.error); };
      const finish = () => { if (!replied && !keepOpen && pending === 0) { replied = true; call('runtime.unhandled', { requestId }).catch(console.error); } };
      for (const fn of [...event('runtime.onMessage')._listeners]) {
        try {
          const value = fn(copy(message), copy(sender), respond);
          if (value && typeof value.then === 'function') { pending++; value.then(v => { pending--; if (v !== undefined) respond(v); finish(); }, e => { pending--; if (!replied) { replied = true; call('runtime.respond', { requestId, error: e?.message || String(e) }).catch(console.error); } }); }
          else if (value === true) keepOpen = true;
        } catch (error) { call('runtime.respond', { requestId, error: error.message }).catch(console.error); replied = true; }
      }
      finish();
      return;
    }
    if (name === 'runtime.portConnect') { const [portId, portName, sender] = args; event('runtime.onConnect')._emit(port(portId, portName, sender)); return; }
    if (name === 'runtime.portMessage') { const [portId, message] = args; ports.get(portId)?.onMessage._emit(copy(message), ports.get(portId)); return; }
    if (name === 'runtime.portDisconnect') { ports.get(args[0])?._disconnect(args[1] ? new Error(args[1]) : undefined); return; }
    event(name)._emit(...copy(args));
  }
  return { chrome, dispatch, dispose() { for (const p of [...ports.values()]) p._disconnect(); events.clear(); } };
}
