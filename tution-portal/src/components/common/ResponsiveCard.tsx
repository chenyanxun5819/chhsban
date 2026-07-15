import React from "react";
import "./responsive-components.css";

interface ResponsiveCardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  variant?: "default" | "highlight" | "status-pending" | "status-approved";
}

/**
 * 響應式卡片組件
 * 特性:
 * - 桌機: 固定寬度卡片
 * - 手機: 全寬卡片
 * - 觸摸友好的按鈕
 */
export const ResponsiveCard: React.FC<ResponsiveCardProps> = ({
  title,
  subtitle,
  children,
  action,
  className = "",
  variant = "default",
}) => {
  return (
    <div className={`responsive-card responsive-card--${variant} ${className}`}>
      {(title || subtitle) && (
        <div className="responsive-card__header">
          <div className="responsive-card__header-text">
            {title && <h3 className="responsive-card__title">{title}</h3>}
            {subtitle && <p className="responsive-card__subtitle">{subtitle}</p>}
          </div>
          {action && <div className="responsive-card__action">{action}</div>}
        </div>
      )}
      <div className="responsive-card__body">{children}</div>
    </div>
  );
};

interface ResponsiveGridProps {
  children: React.ReactNode;
  columns?: "auto" | "2" | "3" | "4";
  gap?: "sm" | "md" | "lg";
}

/**
 * 響應式網格組件
 * 自動適配裝置尺寸
 */
export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  columns = "auto",
  gap = "md",
}) => {
  return (
    <div
      className={`responsive-grid responsive-grid--${columns}-col responsive-grid--gap-${gap}`}
    >
      {children}
    </div>
  );
};

interface ResponsiveFormRowProps {
  children: React.ReactNode;
  cols?: "1" | "2" | "3";
  gap?: "sm" | "md" | "lg";
}

/**
 * 響應式表單行組件
 * 自動堆疊在手機版
 */
export const ResponsiveFormRow: React.FC<ResponsiveFormRowProps> = ({
  children,
  cols = "1",
  gap = "md",
}) => {
  return (
    <div className={`responsive-form-row responsive-form-row--${cols}col responsive-form-row--gap-${gap}`}>
      {children}
    </div>
  );
};

interface ResponsiveButtonGroupProps {
  children: React.ReactNode;
  justify?: "start" | "center" | "end" | "space-between";
  stacked?: boolean;
}

/**
 * 響應式按鈕組
 * 手機版自動堆疊
 */
export const ResponsiveButtonGroup: React.FC<ResponsiveButtonGroupProps> = ({
  children,
  justify = "end",
  stacked,
}) => {
  return (
    <div
      className={`responsive-button-group responsive-button-group--${justify} ${
        stacked ? "responsive-button-group--stacked" : ""
      }`}
    >
      {children}
    </div>
  );
};

interface ResponsiveTableProps {
  children: React.ReactNode;
  striped?: boolean;
  hover?: boolean;
}

/**
 * 響應式表格容器
 * 手機版自動橫向滾動
 */
export const ResponsiveTable: React.FC<ResponsiveTableProps> = ({
  children,
  striped = true,
  hover = true,
}) => {
  return (
    <div className="responsive-table-wrapper">
      <table
        className={`responsive-table ${striped ? "responsive-table--striped" : ""} ${
          hover ? "responsive-table--hover" : ""
        }`}
      >
        {children}
      </table>
    </div>
  );
};

interface ResponsiveStackProps {
  children: React.ReactNode;
  direction?: "row" | "column";
  gap?: "xs" | "sm" | "md" | "lg" | "xl";
  align?: "start" | "center" | "end";
  justify?: "start" | "center" | "end" | "space-between";
  responsive?: boolean;
}

/**
 * 響應式堆疊組件
 * 可設定在不同螢幕尺寸下的方向
 */
export const ResponsiveStack: React.FC<ResponsiveStackProps> = ({
  children,
  direction = "column",
  gap = "md",
  align = "start",
  justify = "start",
  responsive = true,
}) => {
  return (
    <div
      className={`responsive-stack responsive-stack--${direction} responsive-stack--gap-${gap} responsive-stack--align-${align} responsive-stack--justify-${justify} ${
        responsive ? "responsive-stack--responsive" : ""
      }`}
    >
      {children}
    </div>
  );
};
