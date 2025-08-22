import React from "react";
import { Cursor, MainCursor } from "../editor/cursors";
import { DEFAULT_COLORS } from "../editor/cursors";

interface CursorItemProps {
  cursor: Cursor;
}

const CursorItem: React.FC<CursorItemProps> = ({ cursor }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      marginBottom: "8px",
      padding: "8px",
      backgroundColor: "white",
      borderRadius: "4px",
      boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
      border: cursor.isTyping
        ? `2px solid ${DEFAULT_COLORS[cursor.color_idx]}`
        : "2px solid transparent",
    }}
  >
    <div
      style={{
        width: "12px",
        height: "12px",
        backgroundColor: DEFAULT_COLORS[cursor.color_idx],
        marginRight: "8px",
        borderRadius: "2px",
      }}
    />
    <div style={{ flex: 1 }}>
      <div
        style={{
          fontWeight: cursor.isMain ? "bold" : "normal",
          fontSize: "14px",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          color: "#2c3e50",
        }}
      >
        {cursor.name}
        {cursor.isTyping && (
          <span
            style={{
              fontSize: "12px",
              color: DEFAULT_COLORS[cursor.color_idx],
              animation: "pulse 1.5s infinite",
            }}
          >
            ⌨️
          </span>
        )}
      </div>
      <div style={{ fontSize: "12px", color: "#666" }}>
        L{cursor.ln + 1}:C{cursor.pos + 1}
        {cursor.isTyping && (
          <span
            style={{
              marginLeft: "6px",
              color: DEFAULT_COLORS[cursor.color_idx],
              fontStyle: "italic",
            }}
          >
            typing...
          </span>
        )}
      </div>
    </div>
  </div>
);

interface CursorListProps {
  cursors: Cursor[];
  mainCursor: MainCursor;
}

export const CursorList: React.FC<CursorListProps> = ({
  cursors,
  mainCursor,
}) => (
  <div
    style={{
      width: "250px",
      padding: "10px",
      borderRight: "1px solid #ccc",
      backgroundColor: "#f5f5f5",
      overflowY: "scroll",
    }}
  >
    <h3 style={{ color: "#2c3e50", marginBottom: "16px" }}>Active Cursors</h3>

    {/* Main cursor display */}
    <div
      style={{
        display: "flex",
        alignItems: "center",
        marginBottom: "8px",
        padding: "8px",
        backgroundColor: "white",
        borderRadius: "4px",
        boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
        border: "2px solid #007ACC",
      }}
    >
      <div
        style={{
          width: "12px",
          height: "12px",
          backgroundColor: "#007ACC",
          marginRight: "8px",
          borderRadius: "2px",
        }}
      />
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontWeight: "bold",
            fontSize: "14px",
            color: "#2c3e50",
          }}
        >
          {mainCursor.name} (You)
        </div>
        <div style={{ fontSize: "12px", color: "#666" }}>
          L{mainCursor.ln + 1}:C{mainCursor.pos + 1}
        </div>
      </div>
    </div>

    {/* Remote cursors */}
    {cursors.map((cursor) => (
      <CursorItem key={cursor.id} cursor={cursor} />
    ))}
  </div>
);
