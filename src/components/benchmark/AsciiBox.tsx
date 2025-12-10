import React from "react";

interface AsciiBoxProps {
  title?: string;
  children: React.ReactNode;
  variant?: "single" | "double";
  className?: string;
}

export function AsciiBox({ title, children, variant = "double", className = "" }: AsciiBoxProps) {
  // Unicode box-drawing characters
  const chars =
    variant === "double"
      ? { tl: "╔", tr: "╗", bl: "╚", br: "╝", h: "═", v: "║" }
      : { tl: "┌", tr: "┐", bl: "└", br: "┘", h: "─", v: "│" };

  return (
    <div className={`benchmark-mono ${className}`} style={{ color: "#00FF00" }}>
      {/* Top border */}
      <div style={{ display: "flex", lineHeight: 1 }}>
        <span>{chars.tl}</span>
        {title && (
          <>
            <span>{chars.h}{chars.h} {title} </span>
            <span style={{ flex: 1 }}>{chars.h.repeat(60)}</span>
          </>
        )}
        {!title && <span style={{ flex: 1 }}>{chars.h.repeat(60)}</span>}
        <span>{chars.tr}</span>
      </div>

      {/* Content with side borders */}
      <div style={{ display: "flex", lineHeight: 1.5 }}>
        <span>{chars.v}</span>
        <div style={{ flex: 1, padding: "0.5rem 1rem" }}>{children}</div>
        <span>{chars.v}</span>
      </div>

      {/* Bottom border */}
      <div style={{ display: "flex", lineHeight: 1 }}>
        <span>{chars.bl}</span>
        <span style={{ flex: 1 }}>{chars.h.repeat(60)}</span>
        <span>{chars.br}</span>
      </div>
    </div>
  );
}
