import { CursorManager, Cursor, DEFAULT_COLORS } from "../editor/cursors";
import { logger } from "../utils/logger";
import { reversed_delta, transformdelta } from "../editor/applyDeltas";
import { Delta } from "../editor/types";

function apply_updates(
  base_updates: Delta[],
  message: any,
  change_handler_ref: any,
  queue_manager_ref: any,
  set_force_read_only: (r: boolean) => void,
): void {
  const source_updates = queue_manager_ref.current
    .get_suffix_updates(0)
    .concat(change_handler_ref.current.get_deltas());
  change_handler_ref.current.clear_deltas();
  queue_manager_ref.current.clear_text_updates();
  const transformed_source_updates: Delta[] = source_updates.map(
    (update: any) => {
      let new_update = update;
      for (const base_update of base_updates) {
        new_update = transformdelta(new_update, base_update);
      }
      return new_update;
    },
  );
  queue_manager_ref.current.enqueue_text(transformed_source_updates);

  logger.websocket.debug("received update message: ", message);
  logger.websocket.debug("applying base_updates: ", base_updates);
  logger.websocket.debug("applying source_updates: ", source_updates);
  logger.websocket.debug("transformed updates: ", transformed_source_updates);

  // apply reversed source updates
  set_force_read_only(true);
  change_handler_ref.current.applyDeltas(
    source_updates
      .map((update: any) => {
        return reversed_delta(update);
      })
      .toReversed(),
  );
  change_handler_ref.current.applyDeltas(base_updates);
  set_force_read_only(false);
  change_handler_ref.current.applyDeltas(transformed_source_updates);
  queue_manager_ref.current.increment_last_text_update_msg_id(
    base_updates.length,
  );
}

export const handleMessagesFunctionWrapper = (
  set_is_connected: (arg: boolean) => void,
  set_client_id: (arg: any) => void,
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
        logger.websocket.debug("Processing message:", message);
        if (message.type === "connect_ack") {
          set_is_connected(true);
          set_client_id(message.client_id);
        } else if (message.type === "cursor_update") {
          if (cursorManagerRef.current && message.client_id) {
            cursorManagerRef.current.updateCursor(message.client_id, {
              pos: message.pos,
              ln: message.ln,
            });
            setCursors(cursorManagerRef.current.getCursors());
          }
        } else if (message.type === "typing_indicator") {
          // logger.cursor.debug("Received typing indicator:", message);
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
          change_handler_ref.current.set_content(message.content);
          queue_manager_ref.current.set_initial_dump_message_id(
            message.last_msg_id,
          );

          logger.editor.info("Received initial document:", message.content);
        } else if (message.type === "input_response") {
          // Handle input response with recent deltas
        } else if (message.type === "text_accepted") {
          logger.editor.info("Text accepted:", message.count);
          queue_manager_ref.current.accept_text_updates(message.count);
        } else if (message.type === "update") {
          // update
          const n_base_deltas_to_use = Math.max(
            message.deltas.length -
              queue_manager_ref.current.last_text_update_msg_id +
              message.start_msg_id -
              1,
            0,
          );
          // select hte last n_base_deltas_to_use deltas
          const base_updates: Delta[] = message.deltas.slice(
            message.deltas.length - n_base_deltas_to_use,
          );
          logger.editor.info(
            "I have chosen last ",
            n_base_deltas_to_use,
            " deltas as base updates",
          );
          logger.editor.info("Base updates:", base_updates);
          apply_updates(
            base_updates,
            message,
            change_handler_ref,
            queue_manager_ref,
            set_force_read_only,
          );
        }
      }
    } catch (error) {
      logger.websocket.error("Error parsing message:", error);
      logger.websocket.error("message:", event.data);
      set_force_read_only(false);
    }
  };
};
