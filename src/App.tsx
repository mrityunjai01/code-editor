import {
  useState,
  useEffect,
  useRef,
  useCallback,
  MutableRefObject,
} from "react";
import { useParams } from "react-router-dom";
import "./App.css";
import { useWebSocket } from "./messages/useWebSocket";
import { faker } from "@faker-js/faker";
import { logger } from "./utils/logger";

import { Editor } from "@monaco-editor/react";

import type { editor } from "monaco-editor";

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
import { InitialDumpMessage, MessageType } from "./messages/types";
import { websocket_config } from "./messages/queue_config";

function App() {
  const { roomId } = useParams<{ roomId: string }>();
  const [room_id, set_room_id] = useState(roomId || "r0"); // Use URL param or default
  const [pot_room_id, set_pot_room_id] = useState(roomId || "r0");
  const [force_read_only, set_force_read_only] = useState(false);
  const user_name_ref: MutableRefObject<string> = useRef(
    faker.commerce.productName(),
  );
  const [change_room_button_disabled, set_change_room_button_disabled] =
    useState(true);
  const [cursors, setCursors] = useState<Cursor[]>(
    createInitialCursors(user_name_ref.current),
  );
  const [mainCursor, setMainCursor] = useState<MainCursor>({
    name: user_name_ref.current,
    pos: 0,
    ln: 0,
  });
  const [isConnected, set_is_connected] = useState(false);
  const [sec_key, set_sec_key] = useState("k");
  const [pot_sec_key, set_pot_sec_key] = useState("k");
  const [client_id, set_client_id] = useState(null);
  const [editor_ready, set_editor_ready] = useState(false);
  const [attempt_connect, set_attempt_connect] = useState(false);
  const change_handler_ref = useRef<EditorChangeHandler | null>(null);
  const cursorManagerRef = useRef<CursorManager | null>(null);
  const mainCursorManagerRef = useRef<MainCursorManager | null>(null);

  const defaultValue: string = `def main():
    print('Hello, world!')
if __name__ == '__main__':
    main()`;
  const [editor_value, set_editor_value] = useState(defaultValue);
  const { wsRef } = useWebSocket({
    url: "ws://localhost:8000/ws",
    sec_key,
    room_id,
    user_name: user_name_ref.current,
    client_id,
    set_is_connected,
    set_client_id,
    editor_ready,
    setCursors,
    set_attempt_connect,
  });

  useEffect(() => {
    logger.websocket.debug("WebSocket reference updated:", wsRef.current);
    if (wsRef.current) {
      logger.websocket.debug("Setting up WebSocket message handler");
      wsRef.current.onmessage = handleMessagesFunctionWrapper(
        set_is_connected,
        set_client_id,
        cursorManagerRef,
        client_id,
        setCursors,
        set_force_read_only,
        change_handler_ref,
        queue_manager_ref,
      );
    }
  }, [client_id, cursors, setCursors, attempt_connect]);

  const queue_manager_ref = useRef<QueueManager>(
    new QueueManager((message: MessageType) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        if (message.type === "update") {
          logger.websocket.debug("sending message", message);
        }

        wsRef.current.send(JSON.stringify(message));
      } else {
        logger.websocket.warn(
          "WebSocket is not connected. Message not sent:",
          message,
        );
      }
    }),
  );
  const sendMessage = useCallback(
    (message: any) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        logger.websocket.debug("sending message", message);
        wsRef.current.send(JSON.stringify(message));
      } else {
        logger.websocket.warn(
          "WebSocket is not connected. Message not sent:",
          message,
        );
      }
    },
    [client_id, attempt_connect],
  );
  const { enqueue_pos, enqueue_text, update_connected_status } = useQueue(
    websocket_config(queue_manager_ref.current),
  );

  // Update the connected status whenever isConnected changes
  useEffect(() => {
    logger.app.info("updating connected status, clientId = ", client_id);
    update_connected_status(client_id, room_id);
    if (client_id) {
      const initial_dump_request: InitialDumpMessage = {
        type: "initial_dump_request",
        room_id: room_id,
        client_id: client_id,
      };
      sendMessage(initial_dump_request);
      const interval = setInterval(() => {
        if (change_handler_ref.current && editorInstance.current) {
          change_handler_ref.current.change_handler_flush();
        }
      }, 4000);
      return () => {
        clearInterval(interval);
      };
    }
  }, [client_id]);

  useEffect(() => {
    set_client_id(null);
    if (
      cursorManagerRef.current !== null &&
      change_handler_ref.current !== null &&
      editorInstance.current
    ) {
      setCursors([]);
      cursorManagerRef.current = new CursorManager(
        editorInstance.current,
        setCursors,
      );
    }
  }, [room_id]);

  useEffect(() => {
    if (roomId) {
      set_room_id(roomId);
      set_pot_room_id(roomId);
    }
  }, [roomId]);

  useEffect(() => {
    if (change_handler_ref.current) {
      change_handler_ref.current.set_callback(enqueue_text);
    }
  }, [enqueue_text]);

  let editorInstance = useRef<editor.IStandaloneCodeEditor | null>(null);

  // Function to send updates to server

  function handleEditorMount(
    editor: editor.IStandaloneCodeEditor,
    _monaco: typeof import("monaco-editor"),
  ) {
    editorInstance.current = editor;

    // Initialize change handler with callback
    change_handler_ref.current = new EditorChangeHandler(editor, enqueue_text);
    // Initialize cursor manager for remote cursors only

    const manager = new CursorManager(editor, setCursors);
    logger.cursor.info("CursorManager initialized:", manager);
    cursorManagerRef.current = manager;

    // Initialize main cursor manager
    const mainManager = new MainCursorManager(
      user_name_ref.current,
      setMainCursor,
    );
    logger.cursor.info("MainCursorManager initialized:", mainManager);
    mainCursorManagerRef.current = mainManager;
    set_editor_ready(true);

    // Track main cursor position and send to server
    editor.onDidChangeCursorPosition((e) => {
      mainManager.updateCursor(
        e.position.column - 1,
        e.position.lineNumber - 1,
      );
      // Enqueue cursor position update
      enqueue_pos({
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
        enqueue_pos({
          type: "typing",
          typing: true,
        });
      }

      if (typingTimer) {
        clearTimeout(typingTimer);
      }

      typingTimer = setTimeout(() => {
        isTyping = false;
        // Enqueue typing stop
        enqueue_pos({
          type: "typing",
          typing: false,
        });
      }, 5000);
    });

    // Request initial document content when connected
  }
  const input_style = {
    borderRadius: "8px",
    border: "1px solid #ccc",
    padding: "4px 12px",
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
            <span style={{ marginLeft: "10px" }}>Room: </span>
            <input
              type="text"
              style={{
                ...input_style,
                marginRight: "10px",
              }}
              placeholder="Enter room name"
              value={pot_room_id}
              onChange={(e) => {
                set_pot_room_id(e.target.value);
                set_change_room_button_disabled(false);
              }}
            />
            <span style={{ marginLeft: "10px" }}>Key: </span>
            <input
              type="text"
              style={{
                ...input_style,
                marginRight: "10px",
              }}
              placeholder="Enter key"
              value={pot_sec_key}
              onChange={(e) => {
                set_pot_sec_key(e.target.value);
                set_change_room_button_disabled(false);
              }}
            />
            <button
              style={{
                border: "1px",
                borderRadius: "8px",
                padding: "4px 12px",
                marginInline: "10px",
              }}
              disabled={change_room_button_disabled}
              onClick={() => {
                change_handler_ref.current?.clear_deltas();
                queue_manager_ref.current?.clear_text_updates();
                set_change_room_button_disabled(true);
                set_room_id(pot_room_id);
                set_sec_key(pot_sec_key);
              }}
            >
              Connect
            </button>
            {isConnected ? "✏️ Ready to edit" : "⏳ Waiting for connection..."}
          </div>
        </div>
        <Editor
          height="calc(100vh - 60px)"
          defaultLanguage="python"
          value={editor_value}
          defaultValue={defaultValue}
          onMount={handleEditorMount}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            readOnly: !isConnected || force_read_only,
          }}
        />
      </div>
    </div>
  );
}

export default App;
