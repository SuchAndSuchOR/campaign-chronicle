import "./workspace.js";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(new URL("../sw.js", import.meta.url))
      .catch(error => {
        console.error("Service worker registration failed", error);
      });
  });
}
