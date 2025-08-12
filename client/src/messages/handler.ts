import { CursorManager, DEFAULT_COLORS, Cursor } from "../editor/cursors";

export const handleMessagesFunctionWrapper = (
  set_is_connected: (arg: boolean) => void,
  set_client_id: (arg: any) => void,
  set_editor_value: (arg: any) => void,
  cursorManagerRef: React.MutableRefObject<CursorManager | null>,
  client_id: string | null,
  setCursors: (cursors: Cursor[]) => void,
) => {
  return (message: any) => {
    console.log("received, ", message);
    if (message.type === "connect_ack") {
      set_is_connected(true);
      set_client_id(message.client_id);
    } else if (message.type === "update") {
      const deltas = message.deltas || [];
      // if (deltas.length > 0 && changeHandler) {
      //   changeHandler.applyDeltas(deltas);
      // }
    } else if (message.type === "cursor_update") {
      if (cursorManagerRef.current && message.client_id) {
        cursorManagerRef.current.updateCursor(message.client_id, {
          pos: message.position.column - 1,
          ln: message.position.line - 1,
        });
      }
    } else if (message.type === "typing_indicator") {
      if (cursorManagerRef.current && message.client_id) {
        cursorManagerRef.current.updateTypingStatus(
          message.client_id,
          message.typing,
        );
      }
    } else if (message.type === "addclient") {
      if (cursorManagerRef.current) {
        console.log("Adding clients:", message.clients);
        const currentCursors = cursorManagerRef.current.getCursors();
        const colorIndex = currentCursors.length % DEFAULT_COLORS.length;
        message.clients.foreach((client: any) => {
          console.log("Adding cursor for client:", client);
          if (client.client_id !== client_id) {
            cursorManagerRef.current.addCursor({
              id: client.client_id,
              name: client.name,
              pos: 0,
              ln: 0,
              color: DEFAULT_COLORS[colorIndex],
              isTyping: false,
            });
          }
        });
      } else {
        console.warn("CursorManager is not initialized, cannot add clients.");
      }
    } else if (message.type === "client_left") {
      // Handle client leaving
      if (cursorManagerRef.current && message.client_id) {
        cursorManagerRef.current.removeCursor(message.client_id);
      }
    } else if (message.type === "initial_dump") {
      // Handle initial document content
      set_editor_value(message.content);
      console.log("Received initial document:", message.content);
    } else if (message.type === "input_response") {
      // Handle input response with recent deltas
      const deltas = message.deltas || [];
    }
  };
};
