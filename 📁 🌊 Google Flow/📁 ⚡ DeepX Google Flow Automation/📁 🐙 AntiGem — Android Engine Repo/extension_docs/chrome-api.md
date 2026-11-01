# Chrome API reference

This reference includes every implemented public facade method and event, with stubs/rejections identified. AntiGem supplies these APIs to your worker and isolated content scripts; do not copy or import the app runtime to use them. Other `chrome.*` namespaces are absent.

Unless stated synchronous, a method returns a Promise and also accepts a final callback. A callback form returns no Promise. On failure, Promises reject; callbacks receive `undefined` with `chrome.runtime.lastError.message` set **only during the callback**. API values and messages are JSON-serialized: do not pass functions, DOM objects, cycles or BigInts. `scripting.executeScript.func` is the explicit function-serialization exception. `chrome.antigem` methods use Promises only.

All events expose synchronous `addListener(fn)`, `removeListener(fn)`, `hasListener(fn) → boolean`, `hasListeners() → boolean`. No event filters/extra registration arguments are implemented. A compatibility event listed as inert can accept listeners but does not currently fire.

## runtime and extension

| Method/property | Arguments → result and behavior |
| --- | --- |
| `runtime.id` | Synchronous stable manifest ID. |
| `runtime.lastError` | Callback-scoped `{message}`; absent after the callback. |
| `runtime.getManifest()` | Synchronous JSON copy of manifest metadata. |
| `runtime.getURL(path)` | Synchronous package resource URL. Relative package paths only for actual resource access. Tokenized loopback origin, **not** chrome-extension://. HTML resources are blocked. |
| `runtime.sendMessage(message, options?)` | JSON message → first response from another non-content context in this extension. |
| `runtime.sendMessage(extensionId, message, options?)` | Same-extension IDs only. Cross-extension messaging rejects. Options are accepted but not otherwise acted on. String messages with an options object can be ambiguous with this overload; prefer object messages. |
| `runtime.connect(connectInfo?)` | Synchronous Port; `{name?}`. Connection establishment is asynchronous; posts wait for it. |
| `runtime.connect(extensionId, connectInfo?)` | Same extension only; no external communication. |
| `runtime.reload()` | Schedules this worker's reload; current jobs/variables will be lost. |
| `runtime.getPlatformInfo()` | `{os:"android",arch,nacl_arch}`. |
| `runtime.getBrowserInfo()` | AntiGem metadata `{name,vendor,version,buildID}`; not Chromium version negotiation. |
| `runtime.getContexts(filter?)` | Current extension contexts `{contextId,contextType,tabId,frameId,documentUrl}[]`; filter is currently ignored. Context types include BACKGROUND, CONTENT and transient MCP. |
| `runtime.openOptionsPage()` | Rejects: extension UI unsupported. |
| `extension.getURL(path)` | Synchronous alias of runtime.getURL. |
| `extension.inIncognitoContext` | Synchronous `false`. |

Events:

| Event | Listener arguments / status |
| --- | --- |
| `runtime.onMessage` | `(message, sender, sendResponse)`. Return `true` to reply later, or return a Promise of a response. First response wins. No listeners → connection error; all unhandled listeners → undefined response. Message timeout 180 seconds. |
| `runtime.onConnect` | `(port)` for same-extension connection. |
| `runtime.onInstalled` | `({reason:"install"|"update",previousVersion?})` when stored version is new/different. |
| `runtime.onStartup` | `()` on every successful worker load, including reload. |
| `runtime.onMessageExternal` | Inert; external messaging unsupported. |
| `runtime.onSuspend` | Inert; host closes workers directly. |

`sender` includes ID, origin, URL and, for content contexts, tab/frameId. Port members: `name`, optional `sender`, synchronous `postMessage(json)`, `disconnect()`, `onMessage(message,port)`, `onDisconnect(port)`. Ports disconnect on context removal/navigation. There is no `connectNative` or `sendNativeMessage`. A "port" here is a messaging channel, not a listening TCP port; use HTTP/WebSocket clients to contact a local service.

## storage — permission `storage`

Each area is `chrome.storage.local`, `.sync` or `.session`. Local/sync persist per stable ID; sync does not synchronize with a Google account. Session resets when that extension reloads. No quotas or trusted/untrusted access-level modes are emulated.

| Method (each area) | Arguments → result |
| --- | --- |
| `storage.local.get(keys?)`, `storage.sync.get(keys?)`, `storage.session.get(keys?)` | String, string[], defaults object or null → object. No keys returns whole area. Missing string keys are absent; defaults are merged. |
| `storage.local.set(items)`, `storage.sync.set(items)`, `storage.session.set(items)` | Object → void. JSON values only. |
| `storage.local.remove(keys)`, `storage.sync.remove(keys)`, `storage.session.remove(keys)` | String or string[] → void. |
| `storage.local.clear()`, `storage.sync.clear()`, `storage.session.clear()` | → void. |
| `storage.local.getBytesInUse(keys?)`, `storage.sync.getBytesInUse(keys?)`, `storage.session.getBytesInUse(keys?)` | → approximate serialized key/value byte count. |
| `storage.local.getKeys()`, `storage.sync.getKeys()`, `storage.session.getKeys()` | → string[]. |

`storage.onChanged(changes,areaName)` and each area's `storage.local.onChanged(changes)`, `storage.sync.onChanged(changes)`, `storage.session.onChanged(changes)` fire after actual differences. `changes[key]` contains oldValue/newValue when defined. Read-modify-write is not atomic; serialize conflicting storage updates in your worker.

## tabs

Tab IDs are host-assigned integers and change when the host restarts. Do not persist them as permanent native tab identifiers. There is one window, `windowId:1`. `-2` denotes the current window. Tab data includes id,index,windowId,active,highlighted,url,title,status and fixed desktop compatibility fields (pinned/incognito/audible=false,groupId=-1). `status` is loading/complete. Basic tab operations do not require the `tabs` permission here; page injection still requires permitted host access.

| Method | Arguments → result / limitations |
| --- | --- |
| `tabs.query(queryInfo)` | `{active?,windowId?,url?:pattern|patterns[],status?,title?:glob}` → Tab[]. Other filters ignored. |
| `tabs.get(tabId)` | → Tab. |
| `tabs.create(properties)` | `{url?,active?}` → Tab. Creates a desktop-layout WebView tab. Other properties ignored. |
| `tabs.update(tabId?, properties)` | `{url?,active?,...}` → updated Tab; omitted ID means active tab. URL/activation supported; desktop fields are not a full Chrome Tab API. |
| `tabs.remove(tabIds)` | Integer or integer[] → void. |
| `tabs.reload(tabId?, reloadProperties?)` | `{bypassCache?}` → void; explicit reload only. |
| `tabs.goBack(tabId?)`, `tabs.goForward(tabId?)` | Calls page history navigation → void. |
| `tabs.duplicate(tabId)` | Opens same URL in a new tab; does not copy full browsing history → Tab. |
| `tabs.getZoom(tabId?)` | Visual viewport scale → number. |
| `tabs.setZoom(tabId?, zoomFactor)` | Sets native tab scale → void. Automation locks may prevent changes. |
| `tabs.getZoomSettings(tabId?)` | Fixed `{mode:"automatic",scope:"per-tab",defaultZoomFactor:1}`. |
| `tabs.setZoomSettings(tabId?, settings)` | Accepts mode automatic; other modes reject. Other settings aren't implemented. |
| `tabs.captureVisibleTab(windowId?, options?)` | `{format:"png"|"jpeg",quality?}` → data URL from active WebView screenshot. Only window1/current. |
| `tabs.sendMessage(tabId, message, options?)` | `{frameId?}` → response from isolated content context. Initializes its API world if needed; does not invent an onMessage listener. Requires page access. |
| `tabs.connect(tabId, connectInfo?)` | `{name?}` → Port to already-existing content contexts. Does not automatically inject a listener/context. |
| `tabs.executeScript(tabId?, details)` | Legacy `{code? or file?}` → result[] in isolated top-frame world. Other legacy options ignored; use scripting.executeScript. |
| `tabs.move(...)` | Rejects: unsupported. |
| `tabs.detectLanguage(...)` | Rejects: unsupported. |

Events: `tabs.onCreated(tab)`, `tabs.onUpdated(tabId,changeInfo,tab)`, `tabs.onRemoved(tabId,{windowId,isWindowClosing:false})`, `tabs.onActivated({tabId,windowId})` are generated by the ~300ms poll; brief intermediate transitions may be combined. `tabs.onMoved`, `tabs.onZoomChange`, `tabs.onReplaced` are inert.

## scripting — permission `scripting` and permitted page host

| Method | Arguments → result / limitations |
| --- | --- |
| `scripting.executeScript(injection)` | `{target:{tabId,allFrames?,frameIds?},func?,files?,args?,world?}` → `{frameId,result}[]`. Exactly one of func or files. Func is serialized, so closures are lost. Async results are awaited. Default world ISOLATED; MAIN runs in page. `documentIds` rejects; `injectImmediately` ignored. See frame limitations below. |
| `scripting.insertCSS(injection)` | `{target:{tabId},css? or files?}` → void. Adds deduplicated style node in top document. origin/allFrames ignored. |
| `scripting.removeCSS(injection)` | Same CSS/files → removes matching style nodes. |
| `scripting.registerContentScripts(scripts)` | Array of `{id,matches,exclude_matches?,js?,css?,world?,run_at?,all_frames?}` → void. Duplicate IDs reject. Memory-only. |
| `scripting.getRegisteredContentScripts(filter?)` | `{ids?}` → current dynamic script[]. Excludes manifest content_scripts. |
| `scripting.updateContentScripts(scripts)` | Merge by ID; current implementation also accepts new IDs. Changes apply through next preparation poll. |
| `scripting.unregisterContentScripts(filter?)` | `{ids?}` → void; omitted ids removes all dynamic scripts. |

For explicit frame targeting, frame IDs are temporary indices in a depth-first CDP frame-tree walk, not Chrome's persistent frame IDs. Isolated execution can target child frames; MAIN currently evaluates the top document. Returned frameId values enumerate results and should not be used as persistent identifiers. Default top frame (`0`) is the dependable case. Do not request allFrames for authenticated cross-origin automation without verifying each target's access requirements; the current permission check is against the top document.

Match patterns support `<all_urls>`, http/https/file/ftp, wildcard http+https schemes and `*.host` boundaries. Pattern paths match pathname plus query, not fragment. WebView file access remains subject to Android settings/permissions.

## debugger — permission `debugger` and page host access

| Method | Arguments → result |
| --- | --- |
| `debugger.attach(target, requiredVersion)` | `{tabId}` and compatibility version string → void. One extension may own a tab debugger. |
| `debugger.detach(target)` | `{tabId}` → void. |
| `debugger.sendCommand(target, method, commandParams?)` | Raw engine CDP result; requires attach. Includes Runtime.evaluate remote objects/promises, DOM.setFileInputFiles, Page and Input commands supported by installed WebView. Engine errors propagate. Deadline180 seconds. |
| `debugger.getTargets()` | → `{id,tabId,type:"page",title,url,attached}[]`. Targets are browser tabs only. |

Events: `debugger.onEvent(source,method,params)`, `debugger.onDetach(source,reason)`. Native Android trusted touch is provided by `chrome.antigem.automation`, described separately; JS element.click does not have identical website trust behavior.

## windows

| Method | Arguments → result |
| --- | --- |
| `windows.get(windowId,getInfo?)` | → single Window; only1/current. |
| `windows.getAll(getInfo?)` | → [Window]. |
| `windows.getCurrent(getInfo?)`, `windows.getLastFocused(getInfo?)` | → Window. |
| `windows.update(windowId,updateInfo)` | → Window; geometry/focus updates are compatibility no-ops. |
| `windows.create(createData?)` | `{url?:string|string[]}` → Window populated with tabs; creates tabs in existing window, not a new Android window. |
| `windows.remove(windowId)` | Rejects; use tabs.remove. |

Window is `{id:1,focused:true,incognito:false,type:"normal",state:"normal",alwaysOnTop:false,tabs?}`. `{populate:true}` requests tabs. `windows.onCreated`, `windows.onRemoved`, `windows.onFocusChanged` are inert.

## cookies — permission `cookies` plus host permission

| Method | Arguments → result / limitations |
| --- | --- |
| `cookies.get(details)` | `{url,name}` → Cookie or null. |
| `cookies.getAll(details)` | `{url?,name?,domain?}` → Cookie[]. Without URL, reads permitted open-tab URLs, not the entire WebView store. Only these filters implemented. |
| `cookies.set(details)` | `{url,name,value,domain?,path?,secure?,httpOnly?,expirationDate?}` → Cookie or rejection. sameSite/partitionKey are not written. |
| `cookies.remove(details)` | `{url,name}` → `{url,name,storeId:"0"}`. |
| `cookies.getAllCookieStores()` | → `[{id:"0",tabIds}]`. |

A permitted open page/CDP connection is needed for read/write operations. Only WebView's shared store0 is used. `cookies.onChanged` is inert. Cookie results add hostOnly,session,expirationDate,storeId and a lowercased sameSite value to CDP fields; do not assume exact Chrome enum spelling.

## downloads — permission `downloads`

| Method | Arguments → result / limitations |
| --- | --- |
| `downloads.download(options)` | `{url,filename?:relativePath,conflictAction?:"overwrite"}` → integer ID immediately. Fetch continues asynchronously. Default conflicts uniquify. saveAs/headers/method/body not implemented. |
| `downloads.search(query)` | `{id?,state?,query?:string[],limit?}` → this extension's in-memory DownloadItem[]. query matches case-sensitive URL/filename substrings. Other filters/orderBy ignored. |
| `downloads.cancel(downloadId)` | Aborts transfer → void; no resume. |
| `downloads.erase(query)` | `{id?}` → removed IDs; removes history, not disk file. Other query filters currently ignored. |
| `downloads.removeFile(downloadId)` | Removes file → void. |
| `downloads.open(...)`, `downloads.show(...)`, `downloads.getFileIcon(...)` | Reject: no desktop file UI. |

Files are stored under `<parent of host root>/Downloads/<extension ID>/` by default. With the app's private root this is private `files/Downloads/<ID>/`, not necessarily Android's public Downloads app. Relative paths cannot contain `..` or be absolute. `chrome.antigem.download` provides an explicit terminal-home path instead.

Events: `downloads.onCreated(item)`, `downloads.onChanged(delta)` (completion/interruption), `downloads.onErased(id)`. `downloads.onDeterminingFilename` is inert. Progress bytes can be read with search; not every chunk emits an event. Download history is host-memory only. Node fetch does not share authenticated WebView cookies.

## alarms — permission `alarms`

| Method | Arguments → result |
| --- | --- |
| `alarms.create(name?,alarmInfo)` | `{when?:epochMs,delayInMinutes?,periodInMinutes?}` → void. Replaces same name. |
| `alarms.get(name?)` | → `{name,scheduledTime,periodInMinutes?}` or undefined. |
| `alarms.getAll()` | → Alarm[]. |
| `alarms.clear(name?)` | → boolean removed. |
| `alarms.clearAll()` | → true. |

`alarms.onAlarm(alarm)` fires only while host is alive. Schedules persist, not operating-system wakeups. Millisecond JS timers are used, not Chrome alarm throttling rules.

## permissions

| Method | Arguments → result |
| --- | --- |
| `permissions.getAll()` | → manifest `{permissions,origins:host_permissions}`. |
| `permissions.contains(request)` | `{permissions?,origins?}` → boolean; exact string membership, not implied-pattern matching. |
| `permissions.request(request)` | Same boolean check; no permission dialog or new grants. |
| `permissions.remove(request)` | Rejects; edit manifest and update/reload extension. |

`permissions.onAdded`, `permissions.onRemoved` are inert. This is a declared-permission model, not Chrome's optional-permission UI.

## i18n

| Method | Arguments → result |
| --- | --- |
| `i18n.getUILanguage()` | Synchronous `"en"`. |
| `i18n.getMessage(name,substitutions?)` | Synchronous message from default_locale; replaces $1,$2 etc. Missing → empty string. Named placeholder expansion not implemented. |
| `i18n.getAcceptLanguages()` | → ["en"]. |
| `i18n.detectLanguage(text)` | Compatibility stub → `{isReliable:false,languages:[]}`. |

## action, browserAction and sidePanel

No toolbar, popup, side panel or options-page UI is supported. `chrome.browserAction` aliases `chrome.action`. Methods below retain only in-memory, extension-wide metadata; tabId-specific state is not implemented and nothing is drawn in the browser.

| Method | Contract |
| --- | --- |
| `action.setBadgeText({text})`, `action.getBadgeText(details?)` | Store/read string; default empty. |
| `action.setBadgeBackgroundColor({color})`, `action.getBadgeBackgroundColor(details?)` | Store/read supplied color; default empty object. |
| `action.setTitle({title})`, `action.getTitle(details?)` | Store/read title; defaults action.default_title/name. |
| `action.setIcon(details)` | Retains details, no visible icon. |
| `action.enable(tabId?)`, `action.disable(tabId?)`, `action.isEnabled(tabId?)` | Store/read extension-wide boolean. |
| `action.setPopup(...)`, `action.getPopup(...)`, `action.openPopup(...)` | Reject: extension UI unsupported. |
| `sidePanel.open(...)`, `sidePanel.close(...)`, `sidePanel.setOptions(...)`, `sidePanel.getOptions(...)`, `sidePanel.setPanelBehavior(...)`, `sidePanel.getPanelBehavior(...)` | Reject: extension UI unsupported. |

`action.onClicked` is inert. `chrome.antigem` is fully documented in [the native API reference](antigem-api.md).

Unsupported namespaces include webRequest, declarativeNetRequest, navigation/history/bookmarks/contextMenus/notifications, commands, identity, management and nativeMessaging. Do not infer support merely because a similar Chrome extension loads. User-facing UI APIs must be replaced by MCP tools.
