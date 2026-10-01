import React, { useEffect, useRef } from "react";

declare global {
  interface Window {
    google: any;
  }
}

// Google 登入的 OAuth 用戶端 ID（公開值）：Google Cloud 專案 CHHSBAN-ACADoc 的「CHHSBAN_ACA」。
// 這個網站的網址必須列在該用戶端的「已授權的 JavaScript 來源」裡，按鈕才會正常運作。
export const GOOGLE_CLIENT_ID: string =
  import.meta.env.VITE_GOOGLE_CLIENT_ID || "491731246647-gf63vkq4vso6uji4dilcd84g5aedocsf.apps.googleusercontent.com";

let scriptPromise: Promise<void> | null = null;

function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        scriptPromise = null;
        reject(new Error("無法載入 Google 登入，請檢查網路後重新整理頁面"));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

interface GoogleSignInButtonProps {
  /** 使用者完成 Google 登入後，拿到要交給後端驗證的 ID token */
  onCredential: (credential: string) => void;
  onError?: (message: string) => void;
}

/** Google 官方登入按鈕（Google Identity Services），後端用 /api/auth/google 驗證 credential */
export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({ onCredential, onError }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onCredential);
  callbackRef.current = onCredential;

  useEffect(() => {
    let cancelled = false;
    loadGoogleScript()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response: { credential?: string }) => {
            if (response.credential) callbackRef.current(response.credential);
          },
        });
        window.google.accounts.id.renderButton(containerRef.current, {
          theme: "outline",
          size: "large",
          width: 300,
          text: "signin_with",
        });
      })
      .catch((error: Error) => onError?.(error.message));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} style={{ display: "flex", justifyContent: "center", minHeight: 44 }} />;
};

export default GoogleSignInButton;
