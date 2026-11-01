document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.sync.get(["apiKey"], (res) => {
    if (res.apiKey) document.getElementById("apiKey").value = res.apiKey;
  });
});

document.getElementById("saveBtn").addEventListener("click", () => {
  const val = document.getElementById("apiKey").value.trim();
  chrome.storage.sync.set({ apiKey: val }, () => {
    const status = document.getElementById("status");
    status.textContent = "सेटिंग्स सुरक्षित कर दी गईं!";
    setTimeout(() => { status.textContent = ""; }, 2000);
  });
});
