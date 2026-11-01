# 🤖 Module 7: Master AI Prompts for Chrome Extensions

> AI (ChatGPT, Claude, Gemini) से एक्सटेंशन का आर्किटेक्चर, कोड और डीबगिंग करवाने के लिए प्रोडक्शन प्रॉम्प्ट्स।

---

## Prompt 1: Architecture & Component Breakdown
```text
Act as a Senior Chrome Extension Developer (Manifest V3 expert).
I want to build a custom Chrome extension for: [अपना Idea यहाँ लिखें]

Please deliver:
1. Architectural overview (Manifest, Popup, Content Script, Background Worker).
2. Minimal required permissions in manifest.json with justification.
3. Clean folder structure.
4. Security and CSP compliance considerations.
```

---

## Prompt 2: Full Production Code Generation
```text
Now generate the complete, production-ready code for the above extension.
Strict guidelines:
- Full Manifest V3 compliance.
- No inline JavaScript (CSP safe).
- Error handling with chrome.runtime.lastError.
- Clean vanilla JS with modular functions.
Provide exact code for manifest.json, popup.html, popup.css, popup.js, content.js, and background.js.
```

---

## Prompt 3: Error Resolution & Debugging
```text
I am getting this error in my Chrome Extension:
[Error Paste Here]

Here is my manifest.json and relevant script:
[Code Paste Here]

Please analyze why this error occurs in Manifest V3 and provide the corrected code along with explanation.
```
