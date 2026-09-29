import React from "react";
import { Layout } from "@/shared/components/Layout";
import "@/tution/styles/index.css";

/**
 * 補習班管理頁的外框：套上 .tu-scope／.st-scope（搬來的樣式只在這個範圍內生效，見 tution/styles/index.css）
 * 與原本 AdminPanel 的 .admin-panel 結構。
 */
export const TutionPage: React.FC<{ title: string; heading?: React.ReactNode; error?: string | null; children: React.ReactNode }> = ({
  title,
  heading,
  error,
  children,
}) => (
  <Layout title={title}>
    <div className="tu-scope st-scope">
      <div className="admin-panel">
        <section className="admin-section">
          <h2 className="section-title">{heading ?? title}</h2>
          {children}
        </section>
        {error && (
          <div className="error-banner">
            <span>⚠️ 出現錯誤：{error}</span>
          </div>
        )}
      </div>
    </div>
  </Layout>
);
