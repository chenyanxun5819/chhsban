import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./styles/index.css";
import "./i18n";

// 網址加上 ?debug=1 才載入 Eruda（手機調試用）；記在 sessionStorage，
// 登入後跳轉掉參數也不會消失，?debug=0 或關閉分頁即取消
function isDebugEnabled(): boolean {
  const debug = new URLSearchParams(window.location.search).get("debug");
  try {
    if (debug === "1") sessionStorage.setItem("debug", "1");
    if (debug === "0") sessionStorage.removeItem("debug");
    return sessionStorage.getItem("debug") === "1";
  } catch {
    return debug === "1";
  }
}

if (isDebugEnabled()) {
  import("eruda").then(({ default: eruda }) => eruda.init());
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
