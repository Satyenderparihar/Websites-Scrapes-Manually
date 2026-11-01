document.addEventListener("DOMContentLoaded", async () => {
  const wordCountElem = document.getElementById("word-count");
  const btnReading = document.getElementById("btn-reading");
  const btnReset = document.getElementById("btn-reset");

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab || !tab.id) {
    wordCountElem.textContent = "Error";
    return;
  }

  // Content script को संदेश भेजना
  chrome.tabs.sendMessage(tab.id, { action: "get_word_count" }, (response) => {
    if (chrome.runtime.lastError || !response) {
      wordCountElem.textContent = "पेज पर समर्थित नहीं";
    } else {
      wordCountElem.textContent = response.count.toLocaleString();
    }
  });

  btnReading.addEventListener("click", () => {
    chrome.tabs.sendMessage(tab.id, { action: "apply_reading_mode" });
  });

  btnReset.addEventListener("click", () => {
    chrome.tabs.sendMessage(tab.id, { action: "reset_style" });
  });
});
