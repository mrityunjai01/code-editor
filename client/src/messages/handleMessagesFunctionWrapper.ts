import { CursorManager, Cursor, DEFAULT_COLORS } from "../editor/cursors";
import { logger } from "../utils/logger";
import { Delta, transformdelta } from "../editor/applyDeltas";

export const handleMessagesFunctionWrapper = (
  set_is_connected: (arg: boolean) => void,
  set_client_id: (arg: any) => void,
  set_editor_value: (arg: any) => void,
  cursorManagerRef: React.MutableRefObject<CursorManager | null>,
  client_id: string | null,
  setCursors: (cursors: Cursor[]) => void,
  set_force_read_only: (r: boolean) => void,
  change_handler_ref: any,
  queue_manager_ref: any,
) => {
  return (event: any) => {
    logger.websocket.debug("received message:", event.data);
    try {
      let messages = JSON.parse(event.data);
      logger.websocket.debug("Parsed messages:", messages);
      // check if it is a list
      if (!Array.isArray(messages)) {
        messages = [messages];
      }
      for (const message of messages) {
        logger.websocket.debug(
          "Processing message:",
          message,
          " with type = ",
          message.type,
        );
        if (message.type === "connect_ack") {
          set_is_connected(true);
          set_client_id(message.client_id);
        } else if (message.type === "update") {
        } else if (message.type === "cursor_update") {
          if (cursorManagerRef.current && message.client_id) {
            cursorManagerRef.current.updateCursor(message.client_id, {
              pos: message.pos,
              ln: message.ln,
            });
            setCursors(cursorManagerRef.current.getCursors());
          }
        } else if (message.type === "typing_indicator") {
          logger.cursor.debug("Received typing indicator:", message);
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
                  color_idx: colorIndex,
                  isTyping: false,
                  isMain: false,
                });
              }
            }
            setCursors(cursorManagerRef.current.getCursors());
          } else {
            logger.cursor.warn(
              "CursorManager is not initialized, cannot add clients.",
            );
          }
        } else if (message.type === "removeclient") {
          if (cursorManagerRef.current) {
            logger.cursor.info("Remove clients:", message.clients);
            for (const client of message.clients) {
              cursorManagerRef.current.removeCursor(client.client_id);
              setCursors(cursorManagerRef.current.getCursors());
            }
          } else {
            logger.cursor.warn(
              "CursorManager is not initialized, cannot remove clients.",
            );
          }
        } else if (message.type === "initial_dump") {
          // Handle initial document content
          change_handler_ref.current.first_message();

          set_editor_value(message.content);
          change_handler_ref.current.save_state();

          logger.editor.info("Received initial document:", message.content);
        } else if (message.type === "input_response") {
          // Handle input response with recent deltas
        } else if (message.type === "text_accepted") {
          // Handle text accepted response
          logger.editor.info("Text accepted:", message.count);
          set_force_read_only(true);
          console.assert(
            queue_manager_ref.current,
            "Queue manager is not initialized",
          );
          console.debug("received text accept");
          console.debug(
            "applying updates: ",
            queue_manager_ref.current.get_prefix_updates(message.count),
          );
          console.debug(
            "applying updates: ",
            queue_manager_ref.current.get_suffix_updates(message.count),
          );
          console.debug(
            "change handler updates,",
            change_handler_ref.current.get_deltas(),
          );
          change_handler_ref.current.restore_state();
          change_handler_ref.current.applyDeltas(
            queue_manager_ref.current.get_prefix_updates(message.count),
          );
          change_handler_ref.current.save_state();
          change_handler_ref.current.applyDeltas(
            queue_manager_ref.current.get_suffix_updates(message.count),
          );
          change_handler_ref.current.applyDeltas(
            change_handler_ref.current.get_deltas(),
          );
          set_force_read_only(false);
          queue_manager_ref.current.accept_text_updates(message.count);
        } else if (message.type === "update") {
          // update
          const base_updates: Delta[] = message.updates || [];
          const source_updates =
            queue_manager_ref.current.get_suffix_updates(0) +
            change_handler_ref.current.get_deltas();
          const transformed_source_updates: Delta[] = source_updates.map(
            (update: any) => {
              let new_update = update;
              for (const base_update of base_updates) {
                new_update = transformdelta(new_update, base_update);
              }
              return new_update;
            },
          );

          set_force_read_only(true);
          change_handler_ref.current.applyDeltas(
            base_updates.concat(transformed_source_updates),
          );
          set_force_read_only(false);
          queue_manager_ref.current.increment_last_text_update_msg_id(
            base_updates.length,
          );
        }
      }
    } catch (error) {
      logger.websocket.error("Error parsing message:", error);
      logger.websocket.error("message:", event.data);
    }
  };
};
