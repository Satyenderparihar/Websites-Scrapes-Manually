# ⚡ Module 2: Advanced Features, Storage & Hotkeys

> Context Menus, Settings Options Page, Local vs Sync Storage और Keyboard Shortcuts का विस्तृत गाइड।

---

## 1. Right-Click Context Menu API

यूज़र द्वारा पेज पर टेक्स्ट सेलेक्ट करके राइट-क्लिक करने पर कस्टम ऑप्शन दिखाने का कोड:

```javascript
// background.js
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "quickSave",
    title: "सेव करें: '%s'",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "quickSave") {
    console.log("Selected:", info.selectionText);
  }
});
```

---

## 2. Storage API (`chrome.storage.local` vs `chrome.storage.sync`)

| फ़ीचर | `chrome.storage.local` | `chrome.storage.sync` |
|---|---|---|
| **डेटा का दायरा** | केवल उसी ब्राउज़र/डिवाइस में | यूज़र के सभी सिंक किए हुए डिवाइसेस पर |
| **स्टोरेज लिमिट** | 10 MB (और `unlimitedStorage` पर असीमित) | लगभग 100 KB कुल (8 KB प्रति आइटम) |
| **उपयोग** | बड़े नोट्स, कैश, हिस्ट्री, लोकल फाइल्स | API Key, थीम सेटिंग्स, टॉगल विकल्प |

### डेटा सेव और लोड करना:
```javascript
// डेटा सेव करना
chrome.storage.local.set({ userToken: "12345" }, () => {
  console.log("Saved locally");
});

// डेटा लोड करना
chrome.storage.local.get(["userToken"], (result) => {
  console.log("Token:", result.userToken);
});
```

---

## 3. Keyboard Shortcuts (Hotkeys)

`manifest.json`:
```json
{
  "commands": {
    "run-action": {
      "suggested_key": {
        "default": "Ctrl+Shift+Y",
        "mac": "Command+Shift+Y"
      },
      "description": "एक्शन को ट्रिगर करें"
    }
  }
}
```

`background.js`:
```javascript
chrome.commands.onCommand.addListener((command) => {
  if (command === "run-action") {
    console.log("Hotkeys pressed!");
  }
});
```
