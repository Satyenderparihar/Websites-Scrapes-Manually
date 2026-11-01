// एक्सटेंशन इंस्टॉल होने पर राइट-क्लिक मेन्यू तैयार करना
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "saveSelection",
    title: "नोट्स में सेव करें: '%s'",
    contexts: ["selection"]
  });
});

// जब यूज़र मेन्यू पर क्लिक करे
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "saveSelection") {
    const selectedText = info.selectionText;
    
    chrome.storage.local.get({ notes: [] }, (data) => {
      const updatedNotes = data.notes;
      updatedNotes.push({
        text: selectedText,
        pageUrl: tab.url,
        timestamp: new Date().toLocaleString()
      });
      chrome.storage.local.set({ notes: updatedNotes }, () => {
        console.log("चयनित टेक्स्ट स्थानीय स्टोरेज में सुरक्षित हो गया।");
      });
    });
  }
});
