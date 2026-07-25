import React from "react";
import "./class.css";

interface ClassStatusBadgeProps {
  status: string;
  variant?: "default" | "large";
}

export const ClassStatusBadge: React.FC<ClassStatusBadgeProps> = ({
  status,
  variant = "default",
}) => {
  const getStatusDisplay = (status: string) => {
    const map: { [key: string]: { emoji: string; text: string; color: string } } = {
      approved: { emoji: "✅", text: "已批准", color: "green" },
      pending: { emoji: "⏳", text: "待審批", color: "orange" },
      rejected: { emoji: "❌", text: "已拒絕", color: "red" },
      active: { emoji: "🟢", text: "進行中", color: "blue" },
      initial: { emoji: "📝", text: "初始", color: "gray" },
      dropped: { emoji: "🗑️", text: "已移除", color: "gray" },
    };
    return map[status] || { emoji: "❓", text: status, color: "gray" };
  };

  const display = getStatusDisplay(status);

  return (
    <span
      className={`status-badge status-${status} ${variant === "large" ? "badge-large" : ""}`}
      style={{
        backgroundColor: `var(--color-${display.color}, #ccc)`,
      }}
    >
      {display.emoji} {display.text}
    </span>
  );
};
