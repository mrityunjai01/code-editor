import React, { useState, useEffect, useRef } from "react";
import "./App.css";
import ClientSidebar from "./components/ClientSidebar";
import { useWebSocket } from "./hooks/useWebSocket";

import { Editor } from "@monaco-editor/react";
import { Delta } from "./editor/applyDeltas";
import { handleEditorChange } from "./editor/handle";
import type { editor } from "monaco-editor";
import { applyDeltasToEditor } from "./editor/applyDeltas";
import { CursorManager, Cursor, createInitialCursors } from "./editor/cursors";

interface Client {
  client_id: string;
  name: string;
  status: "online" | "typing" | "idle";
  lastSeen?: Date;
}

function App() {
  const [content, setContent] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [roomId] = useState("room-123"); // For demo purposes
  const [userName] = useState("User" + Math.floor(Math.random() * 1000));
  const [cursors, setCursors] = useState<Cursor[]>(createInitialCursors());
  const [cursorManager, setCursorManager] = useState<CursorManager | null>(null);
  const [editorValue, setEditorValue] = useState(`def main():
    print('Hello, world!')
if __name__ == '__main__':
    main()`);
  const isConnected = true;

  let editorInstance: editor.IStandaloneCodeEditor;

  function handleEditorMount(
    editor: editor.IStandaloneCodeEditor,
    _monaco: typeof import("monaco-editor"),
  ) {
    editorInstance = editor;
    
    const manager = new CursorManager(editor, setCursors);
    setCursorManager(manager);
    
    // Initialize with the cursors after a short delay to ensure editor is ready
    setTimeout(() => {
      manager.setCursors(cursors);
    }, 100);
    
    // Track main cursor position
    editor.onDidChangeCursorPosition((e) => {
      manager.updateCursor('main', {
        pos: e.position.column - 1,
        ln: e.position.lineNumber - 1
      });
    });
  }

  // const { sendMessage, isConnected } = useWebSocket({
  //   url: "ws://localhost:8000/ws",
  //   onMessage: handleWebSocketMessage,
  //   roomId,
  //   userName,
  // });
  //

  function handleWebSocketMessage(message: any) {
    if (message.type === "connect_ack") {
      console.log("Connected with client_id:", message.client_id);
    } else if (message.type === "update") {
      if (
        message.operation?.type === "Insert" ||
        message.operation?.type === "Delete"
      ) {
        // Handle document updates from other clients
        // For now, just log them
        console.log("Received update:", message);
      }
    }
  }

  const handleTextChange = (value: string) => {
    setContent(value);

    // Send update to server
    if (sendMessage) {
      sendMessage({
        type: "update",
        operation: {
          type: "Insert",
          pos: 0,
          ln: 0,
          data: value,
        },
      });
    }
  };

  const fireTestEdit = () => {
    const delta: Delta = {
      type: "insert",
      pos: 0,
      ln: 0,
      data: "Hello, world!",
    };
    applyDeltasToEditor(editorInstance, [delta]);
  };

  // Function to update a cursor position
  const updateCursorPosition = (id: string, pos: number, ln: number) => {
    if (cursorManager) {
      cursorManager.updateCursor(id, { pos, ln });
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex' }}>
      {/* Cursor list sidebar */}
      <div style={{ width: '250px', padding: '10px', borderRight: '1px solid #ccc', backgroundColor: '#f5f5f5' }}>
        <h3>Active Cursors</h3>
        {cursors.map((cursor) => (
          <div key={cursor.id} style={{ 
            display: 'flex', 
            alignItems: 'center', 
            marginBottom: '8px',
            padding: '8px',
            backgroundColor: 'white',
            borderRadius: '4px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
          }}>
            <div 
              style={{
                width: '12px',
                height: '12px',
                backgroundColor: cursor.color,
                marginRight: '8px',
                borderRadius: '2px'
              }}
            />
            <div>
              <div style={{ fontWeight: cursor.isMain ? 'bold' : 'normal', fontSize: '14px' }}>
                {cursor.name}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                L{cursor.ln + 1}:C{cursor.pos + 1}
              </div>
            </div>
          </div>
        ))}
        
        <div style={{ marginTop: '20px' }}>
          <button onClick={fireTestEdit} style={{ marginBottom: '8px', width: '100%' }}>
            Test Edit
          </button>
          <button 
            onClick={() => updateCursorPosition('remote-0', Math.floor(Math.random() * 20), Math.floor(Math.random() * 5))}
            style={{ width: '100%' }}
          >
            Move User 1 Cursor
          </button>
        </div>
      </div>

      {/* Editor */}
      <div style={{ flex: 1 }}>
        <div style={{ padding: '10px', borderBottom: '1px solid #ccc', backgroundColor: '#f9f9f9' }}>
          <h1 style={{ margin: 0, fontSize: '18px' }}>Collaborative Text Editor</h1>
          <div style={{ fontSize: '12px', color: '#666' }}>
            <span className={`status-indicator ${isConnected ? "connected" : "disconnected"}`}>
              {isConnected ? "🟢 Connected" : "🔴 Disconnected"}
            </span>
            <span style={{ marginLeft: '10px' }}>Room: {roomId}</span>
          </div>
        </div>
        <Editor
          height="calc(100vh - 60px)"
          defaultLanguage="python"
          value={editorValue}
          onChange={(value) => setEditorValue(value || '')}
          onMount={handleEditorMount}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
          }}
        />
      </div>
    </div>
  );
}

export default App;
