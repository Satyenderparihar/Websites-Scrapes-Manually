// DeepX Flow Native Asset Upload Interceptor (bypasses OS file dialogs)
(() => {
  let fileInputTarget = null;
  const originalInputClick = HTMLInputElement.prototype.click;

  const isUploadActive = () => {
    try {
      return document.documentElement ? document.documentElement.getAttribute("data-deepx-upload-active") === "true" : false;
    } catch {
      return false;
    }
  };

  HTMLInputElement.prototype.click = function(...args) {
    if (this.type === "file") {
      fileInputTarget = this;
      if (isUploadActive()) {
        console.log("[DeepX Upload] Suppressed native OS file dialog for automated in-memory injection.");
        return;
      }
    }
    return originalInputClick.apply(this, args);
  };

  document.addEventListener("DEEPX_UPLOAD_FILE_DATA", (event) => {
    const detail = event.detail;
    const target = fileInputTarget || document.querySelector('input[type="file"]');
    if (detail && target) {
      try {
        const { base64, filename = "reference_asset.png", mimeType = "image/png" } = detail;
        let cleanBase64 = base64 || "";
        if (cleanBase64.includes(",")) {
          cleanBase64 = cleanBase64.split(",")[1];
        }
        const binaryStr = atob(cleanBase64);
        const len = binaryStr.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: mimeType });
        const file = new File([blob], filename, { type: mimeType });
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        target.files = dataTransfer.files;
        target.dispatchEvent(new Event("change", { bubbles: true }));
        console.log(`[DeepX Upload] Injected file '${filename}' directly into Google Flow file input!`);
      } catch (err) {
        console.error("[DeepX Upload] Failed to inject file data:", err);
      } finally {
        fileInputTarget = null;
        if (document.documentElement) {
          document.documentElement.removeAttribute("data-deepx-upload-active");
        }
      }
    }
  });

  console.log("[DeepX Upload] Native file upload interceptor active in Google Flow.");
})();
