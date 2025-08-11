import React, { useState, useEffect, useRef, useCallback } from "react";
import "./App.css";
import ClientSidebar from "./components/ClientSidebar";
import { useWebSocket } from "./messages/useWebSocket";
import { faker } from "@faker-js/faker";

import { Editor } from "@monaco-editor/react";
import { Delta } from "./editor/applyDeltas";
import { handleEditorChange } from "./editor/handle";
import type { editor } from "monaco-editor";
import { applyDeltasToEditor } from "./editor/applyDeltas";
import {
  CursorManager,
  Cursor,
  createInitialCursors,
  DEFAULT_COLORS,
} from "./editor/cursors";
import { EditorChangeHandler } from "./editor/handle";
import { useQueue, QueueManager } from "./messages/websocket_queue";

function App() {
  const room_id = "room-123"; // For demo purposes
  const user_name: string = faker.commerce.productName();
  const [cursors, setCursors] = useState<Cursor[]>(
    createInitialCursors(user_name),
  );
  const [isConnected, set_is_connected] = useState(false);
  const [client_id, set_client_id] = useState(null);
  const [cursorManager, setCursorManager] = useState<CursorManager | null>(
    null,
  );
  const [editorValue, setEditorValue] = useState();

  const { sendMessage } = useWebSocket({
    url: "ws://localhost:8000/ws",
    onMessage: handleWebSocketMessage,
    room_id,
    user_name,
    client_id,
    set_is_connected,
    set_client_id,
  });

  const { enqueue, update_connected_status } = useQueue({
    max_size: 15,
    threshold_queue: 1,
    interval_delay: 1000,
    queue_manager: new QueueManager(sendMessage),
  });

  // Update the connected status whenever isConnected changes
  useEffect(() => {
    console.log("updating connected status, clientId = ", client_id);
    update_connected_status(client_id);
  }, [client_id]);

  const defaultValue: string = `def main():
    print('Hello, world!')
if __name__ == '__main__':
    main()`;

  let editorInstance: editor.IStandaloneCodeEditor;
  let changeHandler: EditorChangeHandler;

  // Function to send updates to server
  const sendUpdateToServer = (deltas: Delta[]) => {
    if (deltas.length === 0) return;

    console.log("Sending deltas to server:", deltas);
    // Send deltas to WebSocket server
    if (isConnected) {
      sendMessage({
        type: "update",
        deltas: deltas,
      });
    }
  };
  function handleEditorMount(
    editor: editor.IStandaloneCodeEditor,
    _monaco: typeof import("monaco-editor"),
  ) {
    editorInstance = editor;

    // Initialize change handler with callback
    changeHandler = new EditorChangeHandler(editor, sendUpdateToServer);

    const manager = new CursorManager(editor, setCursors);
    setCursorManager(manager);

    // Initialize with the cursors after a short delay to ensure editor is ready
    setTimeout(() => {
      manager.setCursors(cursors);
    }, 100);

    // Track main cursor position and send to server
    editor.onDidChangeCursorPosition((e) => {
      manager.updateCursor("main", {
        pos: e.position.column - 1,
        ln: e.position.lineNumber - 1,
      });
      // Enqueue cursor position update
      enqueue({
        type: "cursor",
        cursor_pos: e.position.column - 1,
        cursor_ln: e.position.lineNumber - 1,
      });
    });

    // Add typing indicator support
    let typingTimer: NodeJS.Timeout | null = null;
    let isTyping = false;

    editor.onDidChangeModelContent(() => {
      if (!isTyping) {
        isTyping = true;
        // Enqueue typing start
        enqueue({
          type: "typing",
          typing: true,
        });
      }

      // Clear existing timer
      if (typingTimer) {
        clearTimeout(typingTimer);
      }

      // Set timer to stop typing indicator after 2 seconds of inactivity
      typingTimer = setTimeout(() => {
        isTyping = false;
        // Enqueue typing stop
        enqueue({
          type: "typing",
          typing: false,
        });
      }, 2000);
    });

    // Request initial document content when connected
  }

  function handleWebSocketMessage(message: any) {
    if (message.type === "connect_ack") {
      console.log("Connected with client_id:", message.client_id);
      set_is_connected(true);
      set_client_id(message.client_id);
    } else if (message.type === "update") {
      // Handle document updates from other clients
      const deltas = message.deltas || [];
      if (deltas.length > 0 && changeHandler) {
        // Apply deltas to editor (from other clients)
        changeHandler.applyDeltas(deltas);
      }
    } else if (message.type === "cursor_update") {
      // Handle cursor position updates from other clients
      if (cursorManager && message.client_id) {
        cursorManager.updateCursor(message.client_id, {
          pos: message.position.column - 1,
          ln: message.position.line - 1,
        });
      }
    } else if (message.type === "typing_indicator") {
      // Handle typing indicator updates
      if (cursorManager && message.client_id) {
        cursorManager.updateTypingStatus(message.client_id, message.typing);
      }
    } else if (message.type === "addclient") {
      // Handle new client added to room
      if (cursorManager && message.client_id && message.name) {
        const currentCursors = cursorManager.getCursors();
        const colorIndex = currentCursors.length % DEFAULT_COLORS.length;
        cursorManager.addCursor({
          id: message.client_id,
          name: message.name,
          pos: 0,
          ln: 0,
          color: DEFAULT_COLORS[colorIndex],
          isTyping: false,
        });
      }
    } else if (message.type === "client_left") {
      // Handle client leaving
      if (cursorManager && message.client_id) {
        cursorManager.removeCursor(message.client_id);
      }
    } else if (message.type === "initial_dump") {
      // Handle initial document content
      setEditorValue(message.content);
      console.log("Received initial document:", message.content);
    } else if (message.type === "input_response") {
      // Handle input response with recent deltas
      const deltas = message.deltas || [];
      if (deltas.length > 0 && changeHandler) {
        changeHandler.applyDeltas(deltas);
      }
    }
  }

  const handleTextChange = (value: string) => {
    // setContent(value);

    // Send update to server
    sendMessage({
      type: "update",
      operation: {
        type: "Insert",
        pos: 0,
        ln: 0,
        data: value,
      },
    });
  };

  const fireTestEdit = () => {
    // const delta: Delta = {
    //   type: "insert",
    //   pos: 0,
    //   ln: 0,
    //   data: "Hello, world!",
    // };
    // applyDeltasToEditor(editorInstance, [delta]);
  };

  // Function to update a cursor position
  const updateCursorPosition = (id: string, pos: number, ln: number) => {
    if (cursorManager) {
      cursorManager.updateCursor(id, { pos, ln });
    }
  };

  // Function to request initial document dump
  const requestInitialDump = () => {
    sendMessage({
      type: "initial_dump_request",
      room_id: room_id,
      client_id: client_id,
    });
  };

  return (
    <div style={{ height: "100vh", display: "flex" }}>
      {/* Cursor list sidebar */}
      <div
        style={{
          width: "250px",
          padding: "10px",
          borderRight: "1px solid #ccc",
          backgroundColor: "#f5f5f5",
        }}
      >
        <h3 style={{ color: "#2c3e50", marginBottom: "16px" }}>
          Active Cursors
        </h3>
        {cursors.map((cursor) => (
          <div
            key={cursor.id}
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "8px",
              padding: "8px",
              backgroundColor: "white",
              borderRadius: "4px",
              boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
              border: cursor.isTyping
                ? `2px solid ${cursor.color}`
                : "2px solid transparent",
            }}
          >
            <div
              style={{
                width: "12px",
                height: "12px",
                backgroundColor: cursor.color,
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
                      color: cursor.color,
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
                      color: cursor.color,
                      fontStyle: "italic",
                    }}
                  >
                    typing...
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}

        <div style={{ marginTop: "20px" }}>
          <button
            onClick={fireTestEdit}
            style={{ marginBottom: "8px", width: "100%" }}
          >
            Test Edit
          </button>
          <button
            onClick={() =>
              updateCursorPosition(
                "remote-0",
                Math.floor(Math.random() * 20),
                Math.floor(Math.random() * 5),
              )
            }
            style={{ marginBottom: "8px", width: "100%" }}
          >
            Move User 1 Cursor
          </button>
          <button
            onClick={() => {
              if (isConnected) {
                sendMessage({
                  type: "input_request",
                  last_message_id: 0,
                });
              }
            }}
            style={{ width: "100%" }}
          >
            Request Updates
          </button>
        </div>
      </div>

      {/* Editor */}
      <div style={{ flex: 1 }}>
        <div
          style={{
            padding: "10px",
            borderBottom: "1px solid #ccc",
            backgroundColor: "#f9f9f9",
          }}
        >
          <h1 style={{ margin: 0, fontSize: "18px" }}>
            Collaborative Text Editor
          </h1>
          <div style={{ fontSize: "12px", color: "#666" }}>
            <span
              className={`status-indicator ${isConnected ? "connected" : "disconnected"}`}
            >
              {isConnected ? "🟢 Connected" : "🔴 Disconnected"}
            </span>
            <span style={{ marginLeft: "10px" }}>Room: {room_id}</span>
            <span style={{ marginLeft: "10px" }}>
              {isConnected
                ? "✏️ Ready to edit"
                : "⏳ Waiting for connection..."}
            </span>
          </div>
        </div>
        <Editor
          height="calc(100vh - 60px)"
          defaultLanguage="python"
          value={editorValue}
          defaultValue={defaultValue}
          onMount={handleEditorMount}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            readOnly: !isConnected,
          }}
        />
      </div>
    </div>
  );
}

export default App;
