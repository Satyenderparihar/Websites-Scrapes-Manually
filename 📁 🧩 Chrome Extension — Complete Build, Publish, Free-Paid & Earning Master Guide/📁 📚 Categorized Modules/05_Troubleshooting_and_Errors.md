# 🛠️ Module 5: Troubleshooting & Error Handbook

> सबसे आम 3 Errors, उनके कारण और 100% सटीक समाधान।

---

## Error 1: "Could not establish connection. Receiving end does not exist."

- **कारण 1**: एक्सटेंशन लोड या रीलोड करने के बाद आपने एक्टिव वेबपेज को रिफ्रेश नहीं किया, जिससे `content.js` इंजेक्ट नहीं हुआ।
- **कारण 2**: आप किसी आंतरिक पेज पर टेस्ट कर रहे हैं (जैसे `chrome://extensions`, New Tab या Chrome Web Store), जहाँ Google कंटेंट स्क्रिप्ट चलाने की अनुमति नहीं देता।
- **समाधान**: सामान्य वेबसाइट (उदा. Wikipedia, Google) खोलें और F5 दबाकर पेज रिफ्रेश करें।

---

## Error 2: "Refused to execute inline script because it violates CSP..."

- **कारण**: आपने HTML में इनलाइन जावास्क्रिप्ट लिखा है (उदा. `onclick="myFunction()"` या `<script>...</script>`)।
- **समाधान**: HTML से सभी स्क्रिप्ट्स और इवेंट्स हटाएं। अलग `.js` फ़ाइल बनाएं और `addEventListener` का प्रयोग करें:
  ```javascript
  document.getElementById("myBtn").addEventListener("click", myFunction);
  ```

---

## Error 3: Service Worker Registration Failed / Inactive

- **कारण**: `background.js` में सिंटैक्स एरर है या वर्कर आइडल होने पर सस्पेंड हो गया है।
- **समाधान**:
  1. `chrome://extensions/` पर जाएं।
  2. एक्सटेंशन कार्ड में नीले रंग के **"service worker"** लिंक पर क्लिक करें।
  3. खुलने वाले DevTools Console में असली एरर लाइन देखें।
