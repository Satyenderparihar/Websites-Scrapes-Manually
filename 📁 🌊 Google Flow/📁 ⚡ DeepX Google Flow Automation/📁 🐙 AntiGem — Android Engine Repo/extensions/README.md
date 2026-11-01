# AntiGem browser extensions

Place an unpacked extension at `~/extensions/<folder>/manifest.json`. Extensions provide MCP tools through one app-managed Node host. Workers and content scripts can use the supported Chrome APIs; extension popups, options pages, side panels and toolbar icons are not supported.

The APK bundles the `google-flow` extension. A home-directory extension with the same ID takes precedence over the bundled copy.

The shared runtime is app infrastructure: its source lives in `app/src/main/assets/browser-runtime/`, and the APK extracts it to the app's private `files/browser-runtime/` directory. Nothing in `~/extensions/runtime` is needed. Deleting or editing user extensions does not change the runtime; the app restores its bundled runtime when the app process starts.

The runtime has separate layers: `chrome-api.mjs` defines the extension-facing `chrome.*` API, `chrome-polyfill.mjs` connects worker contexts, `browser-api.mjs` maps browser operations to Android, `devtools.mjs` implements the WebView debugging transport, and `extension-host.mjs` manages workers, storage, messaging and MCP.

## MCP presets

**WebView Extension Developer** is a separate preset for creating extensions. Its 12 tools serve SDK documentation/examples, create and edit drafts, package/install/update live, enable/disable, rename, reload, test and retrieve worker logs. See [the developer workflow](../extension_docs/developer-mcp.md).

Settings → MCP → **WebView Extension MCP** opens a chooser of enabled extensions that declare `mcp_tools`. Add Google Flow to expose only its 65 Flow tools; another extension gets its own independent server. Tool names are scoped to each extension, so two extensions may use the same name.

Each preset connects to `http://127.0.0.1:8865/mcp?extension=EXTENSION_ID` with the `X-Device-Id` header. An MCP connection must select one enabled extension; missing or invalid IDs never expose other extensions. The existing `/google_flow` endpoint remains a Flow-only compatibility alias.

**Settings → WebView Extensions** installs and updates ZIP packages, renames actual folders, and enables, disables or reloads workers live. The browser has no extension management section or extension popup UI. Folder renames preserve the stable MCP ID.

See [extension_docs](../extension_docs/README.md) for the complete implemented API reference, package format, lifecycle, MCP protocol and runnable example.

The original `flow_mcp/` source remains as a compatibility reference and worker smoke test. It is not loaded or bundled as an active extension.


## Supported foundation

- Manifest V3 workers, relative module imports, classic `importScripts`, and Manifest V2 background script arrays.
- Promise and callback API forms, callback-scoped `runtime.lastError`, delayed `sendResponse`, messaging, connections and message ports.
- Persistent per-extension `storage.local`; `storage.session` is memory only. `storage.sync` uses local persistence and does not synchronize to a Google account.
- Tabs, one Android browser window, tab events, zoom, downloads and alarms. Nonvisual action metadata is retained for worker compatibility; UI-opening APIs reject with an explicit error.
- Script injection with Promise results, file injection, CSS injection and content scripts. WebView DevTools provides separate extension worlds and new-document scripts.
- The WebView engine's CDP commands through `chrome.debugger`, including remote objects and file inputs. Unsupported engine commands reject instead of reporting success.
- Permissions and host-pattern checks for page access; extension resource paths are confined to the extension directory.

`chrome.antigem` contains explicit AntiGem additions for automation input locking, local files, downloads and extracting frames. These require the `antigemFiles` permission; ordinary Chrome extensions do not need them.

## Limits and validation

This is a compatibility runtime, not a complete Chrome browser. Multiple desktop windows, browser-native UI APIs, Google-account storage sync, and every Chrome API are not implemented. The engine and app must be running for page automation. Loading a worker successfully does not prove that every workflow in that extension works.

Run regression tests without installing packages:

```sh
node --experimental-vm-modules --test app/src/test/browserextensions/*.test.mjs
```

For a standalone host (the app normally manages it):

```sh
node --experimental-vm-modules /data/user/0/com.termux/files/browser-runtime/extension-host.mjs --serve --root ~/extensions --port 8865 --device-id YOUR_DEVICE_ID
```

Do not run this alongside the app-managed host on the same port. Settings uses the per-extension HTTP endpoint. A manual stdio client can use `--connect http://127.0.0.1:8865 --extension-id google-flow --device-id YOUR_DEVICE_ID` with the private runtime launcher.
