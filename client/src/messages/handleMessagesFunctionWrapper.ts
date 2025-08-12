import { useCallback } from "react";
import { CursorManager, Cursor, DEFAULT_COLORS } from "../editor/cursors";

export const handleMessagesFunctionWrapper = (
  set_is_connected: (arg: boolean) => void,
  set_client_id: (arg: any) => void,
  set_editor_value: (arg: any) => void,
  cursorManagerRef: React.MutableRefObject<CursorManager | null>,
  client_id: string | null,
  setCursors: (cursors: Cursor[]) => void,
) => {
  return (messages: any) => {
    // check if it is a list
    if (!Array.isArray(messages)) {
      messages = [messages];
    }
    for (const message of messages) {
      if (message.type === "connect_ack") {
        set_is_connected(true);
        set_client_id(message.client_id);
      } else if (message.type === "update") {
      } else if (message.type === "cursor_update") {
        if (cursorManagerRef.current && message.client_id) {
          cursorManagerRef.current.updateCursor(message.client_id, {
            pos: message.position.column,
            ln: message.position.line,
          });
          setCursors(cursorManagerRef.current.getCursors());
        }
      } else if (message.type === "typing_indicator") {
        if (cursorManagerRef.current && message.client_id) {
          cursorManagerRef.current.updateTypingStatus(
            message.client_id,
            message.typing,
          );
          setCursors(cursorManagerRef.current.getCursors());
        }
      } else if (message.type === "addclient") {
        if (cursorManagerRef.current) {
          const currentCursors = cursorManagerRef.current.getCursors();
          for (const [index, client] of message.clients.entries()) {
            if (client.client_id !== client_id) {
              const colorIndex =
                (index + currentCursors.length) % DEFAULT_COLORS.length;
              cursorManagerRef.current.addCursor({
                id: client.client_id,
                name: client.name,
                pos: 0,
                ln: 0,
                color: DEFAULT_COLORS[colorIndex],
                isTyping: false,
              });
            }
          }
          setCursors(cursorManagerRef.current.getCursors());
        } else {
          console.warn("CursorManager is not initialized, cannot add clients.");
        }
      } else if (message.type === "removeclient") {
        if (cursorManagerRef.current) {
          console.log("Remove clients:", message.clients);
          const currentCursors = cursorManagerRef.current.getCursors();
          for (const client of message.clients) {
            cursorManagerRef.current.removeCursor(client.client_id);
            setCursors(cursorManagerRef.current.getCursors());
          }
        } else {
          console.warn("CursorManager is not initialized, cannot add clients.");
        }
      } else if (message.type === "initial_dump") {
        // Handle initial document content
        set_editor_value(message.content);
        console.log("Received initial document:", message.content);
      } else if (message.type === "input_response") {
        // Handle input response with recent deltas
        const deltas = message.deltas || [];
      }
    }
  };
};
