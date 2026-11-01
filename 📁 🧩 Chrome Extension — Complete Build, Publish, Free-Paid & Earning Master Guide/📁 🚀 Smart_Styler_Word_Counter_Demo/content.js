function getWordCount() {
  const text = document.body.innerText || "";
  const words = text.trim().split(/\s+/).filter(word => word.length > 0);
  return words.length;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "get_word_count") {
    sendResponse({ count: getWordCount() });
  } else if (request.action === "apply_reading_mode") {
    document.body.style.backgroundColor = "#faf0ca";
    document.body.style.color = "#0d3b66";
    sendResponse({ status: "success" });
  } else if (request.action === "reset_style") {
    document.body.style.backgroundColor = "";
    document.body.style.color = "";
    sendResponse({ status: "success" });
  }
  return true;
});
