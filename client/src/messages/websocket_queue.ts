import { useEffect, useRef, useState, useCallback } from "react";
import { MessageType } from "./types";
import { logger } from "../utils/logger";
import { Delta } from "../editor/applyDeltas";

export interface QueueOptions {
  threshold_queue: number;
  interval_delay?: number;
  queue_manager: QueueManager;
  total_message_freq: number;
  pos_update_minimum_freq: number;
  pos_update_maximum_freq: number;
}

type QueueEvent =
  | { type: "typing"; typing: boolean; last_update?: number }
  | {
      type: "cursor";
      cursor_pos: number;
      cursor_ln: number;
      last_update?: number;
    };

export class QueueManager {
  private text_updates: Delta[] = [];
  private last_text_update_msg_id = -1;
  private last_text_update_msg_id_sent = -1000000;
  private initial_typing = false;
  private initial_cursor_ln = 0;
  private initial_cursor_pos = 0;
  private typing = false;
  private cursor_ln = 0;
  private cursor_pos = 0;
  private send_messages: (message: MessageType) => void;
  private client_id: string | null = null;
  private room_id: string | null = null;

  constructor(callback: (message: MessageType) => void) {
    this.send_messages = callback;
  }

  update_client_room_id(client_id: string | null, room_id: string | null) {
    this.client_id = client_id;
    this.room_id = room_id;
  }

  enqueue_pos(event: QueueEvent) {
    if (event.type == "typing") {
      this.typing = event.typing;
    }
    if (event.type == "cursor") {
      this.cursor_ln = event.cursor_ln;
      this.cursor_pos = event.cursor_pos;
    }
  }

  enqueue_text(text_updates: Delta[]) {
    for (const text_update of text_updates) {
      console.debug("enqueueing text update", text_update);
      this.text_updates.push(text_update);
    }
  }

  increment_last_text_update_msg_id(count: number) {
    this.last_text_update_msg_id += count;
  }

  accept_text_updates(count: number) {
    this.text_updates = this.text_updates.slice(count);
    this.last_text_update_msg_id += count;
  }

  length() {
    return this.text_updates.length;
  }

  get_prefix_updates(count: number) {
    return this.text_updates.slice(0, count);
  }
  get_suffix_updates(count: number) {
    return this.text_updates.slice(count);
  }

  flush_text_updates() {
    if (!this.client_id || !this.room_id) {
      logger.queue.warn("cant flush because no client id or room id");
      return;
    }
    if (this.last_text_update_msg_id_sent >= this.last_text_update_msg_id) {
      logger.queue.debug(
        "cant flush because last_message_id_sent, ",
        this.last_text_update_msg_id_sent,
        " >= ",
        this.last_text_update_msg_id,
      );
      return;
    }
    if (this.text_updates.length > 0) {
      console.log("finally sneding  text updates", this.text_updates);
      const messages: MessageType = {
        type: "update",
        deltas: this.text_updates,
        last_msg_id: this.last_text_update_msg_id,
        client_id: this.client_id,
        room_id: this.room_id, // Replace with actual room ID if needed
      };
      this.send_messages(messages);
    }
    this.last_text_update_msg_id_sent = this.last_text_update_msg_id;
  }

  flush_pos_updates() {
    if (!this.client_id) {
      logger.queue.warn("cant flush because no client id");
      return;
    }
    let messages: MessageType[] = [];
    if (this.typing != this.initial_typing) {
      messages.push({
        type: "typing",
        is_typing: this.typing,
        client_id: this.client_id,
      });
    }
    if (
      (this.cursor_ln, this.cursor_pos) !=
      (this.initial_cursor_ln, this.initial_cursor_pos)
    ) {
      messages.push({
        type: "cursor",
        ln: this.cursor_ln,
        pos: this.cursor_pos,
        client_id: this.client_id,
      });
    }
    messages.forEach((message) => {
      this.send_messages(message);
    });
    this.initial_typing = this.typing;
    this.initial_cursor_ln = this.cursor_ln;
    this.initial_cursor_pos = this.cursor_pos;

    // empty the queue at this point
  }
}

export const useQueue = (options: QueueOptions) => {
  // set interval
  const {
    threshold_queue,
    queue_manager,
    pos_update_maximum_freq,
    pos_update_minimum_freq,
    total_message_freq,
  } = options;
  const [queueTrigger, setQueueTrigger] = useState(false);
  const queue_manager_ref = useRef(queue_manager);
  const message_tick_log = useRef([]);
  const [pos_update_interval, set_pos_update_interval] = useState(1000);

  const enqueue_pos = useCallback((message: QueueEvent) => {
    queue_manager_ref.current.enqueue_pos(message);
  }, []);

  const enqueue_text = useCallback((message: Delta[]) => {
    queue_manager_ref.current.enqueue_text(message);
    if (queue_manager_ref.current.length() >= threshold_queue) {
      setQueueTrigger((prev) => !prev); // Trigger the effect to empty the queue
    }
  }, []);

  const update_connected_status = useCallback(
    (client_id: string | null, room_id: string | null) => {
      logger.queue.info("client id ", client_id);
      queue_manager_ref.current.update_client_room_id(client_id, room_id);
    },
    [],
  );

  useEffect(() => {
    const interval = setInterval(() => {
      queue_manager_ref.current.flush_pos_updates();
    }, pos_update_interval);

    return () => clearInterval(interval);
  }, [pos_update_interval]);

  useEffect(() => {
    queue_manager_ref.current.flush_text_updates();
  }, [queueTrigger]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const n_text_updates_past_interval = message_tick_log.current.filter(
        (msg_time) => {
          return msg_time > now - 10000;
        },
      ).length;
      const text_update_freq = n_text_updates_past_interval * 6;
      const pos_update_freq = Math.min(
        Math.max(
          total_message_freq - text_update_freq,
          pos_update_minimum_freq,
        ),
        pos_update_maximum_freq,
      );
      set_pos_update_interval(60000 / pos_update_freq);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  return {
    enqueue_pos,
    enqueue_text,
    update_connected_status,
  };
};
