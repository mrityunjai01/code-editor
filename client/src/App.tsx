import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  MutableRefObject,
} from "react";
import "./App.css";
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
  MainCursorManager,
  MainCursor,
} from "./editor/cursors";
import { EditorChangeHandler } from "./editor/handle";
import { useQueue, QueueManager } from "./messages/websocket_queue";
import { handleMessagesFunctionWrapper } from "./messages/handleMessagesFunctionWrapper";
import { CursorList } from "./components/CursorComponent";

function App() {
  const room_id = "room-123"; // For demo purposes
  const user_name_ref: MutableRefObject<string> = useRef(
    faker.commerce.productName(),
  );
  const [cursors, setCursors] = useState<Cursor[]>(
    createInitialCursors(user_name_ref.current),
  );
  const [mainCursor, setMainCursor] = useState<MainCursor>({
    name: user_name_ref.current,
    pos: 0,
    ln: 0,
  });
  const [isConnected, set_is_connected] = useState(false);
  const [client_id, set_client_id] = useState(null);
  const [change_handler, set_change_handler] =
    useState<EditorChangeHandler | null>(null);
  const cursorManagerRef = useRef<CursorManager | null>(null);
  const mainCursorManagerRef = useRef<MainCursorManager | null>(null);
  const [editorValue, set_editor_value] = useState();

  const response_handler = useMemo(() => {
    return handleMessagesFunctionWrapper(
      set_is_connected,
      set_client_id,
      set_editor_value,
      cursorManagerRef,
      client_id,
      setCursors,
    );
  }, [client_id]);

  const { sendMessage } = useWebSocket({
    url: "ws://localhost:8000/ws",
    onMessage: response_handler,
    room_id,
    user_name: user_name_ref.current,
    client_id,
    set_is_connected,
    set_client_id,
    editor_ready: change_handler !== null && cursorManagerRef.current !== null,
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
    set_change_handler(new EditorChangeHandler(editor, sendUpdateToServer));
    // Initialize cursor manager for remote cursors only

    const manager = new CursorManager(editor, setCursors);
    console.log("CursorManager initialized:", manager);
    cursorManagerRef.current = manager;

    // Initialize main cursor manager
    const mainManager = new MainCursorManager(
      user_name_ref.current,
      setMainCursor,
    );
    console.log("MainCursorManager initialized:", mainManager);
    mainCursorManagerRef.current = mainManager;

    // Track main cursor position and send to server
    editor.onDidChangeCursorPosition((e) => {
      mainManager.updateCursor(
        e.position.column - 1,
        e.position.lineNumber - 1,
      );
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
  // Function to update a cursor position
  const updateCursorPosition = (id: string, pos: number, ln: number) => {
    if (cursorManagerRef.current) {
      cursorManagerRef.current.updateCursor(id, { pos, ln });
    }
  };

  return (
    <div style={{ height: "100vh", display: "flex" }}>
      <CursorList cursors={cursors} mainCursor={mainCursor} />

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
