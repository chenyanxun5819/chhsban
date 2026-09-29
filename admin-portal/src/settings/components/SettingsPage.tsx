import React from "react";
import { Layout } from "@/shared/components/Layout";
import "@/tution/styles/index.css";

/**
 * 共用設定頁的外框：這些頁面從 tution-portal 的管理後台搬來，
 * 與補習班管理頁一樣同時帶 .st-scope／.tu-scope，沿用搬來的樣式（見 tution/styles/index.css）。
 */
export const SettingsPage: React.FC<{ title: string; children: React.ReactNode; bare?: boolean }> = ({ title, children, bare }) => (
  <Layout title={title}>
    <div className="st-scope tu-scope">
      <div className="admin-panel">
        {bare ? (
          children
        ) : (
          <section className="admin-section">
            <h2 className="section-title">{title}</h2>
            {children}
          </section>
        )}
      </div>
    </div>
  </Layout>
);
