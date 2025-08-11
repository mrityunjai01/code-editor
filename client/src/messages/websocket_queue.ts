import { useEffect, useRef, useState, useCallback } from "react";
import { MessageType } from "./types";

interface QueueOptions {
  max_size: number;
  threshold_queue: number;
  interval_delay?: number;
  queue_manager: QueueManager;
}

type QueueEvent =
  | { type: "text"; last_update?: number }
  | { type: "typing"; typing: boolean; last_update?: number }
  | {
      type: "cursor";
      cursor_pos: number;
      cursor_ln: number;
      last_update?: number;
    };

export class QueueManager {
  private queue: QueueEvent[] = [];
  private initial_typing = false;
  private initial_cursor_ln = 0;
  private initial_cursor_pos = 0;
  private typing = false;
  private cursor_ln = 0;
  private cursor_pos = 0;
  private send_messages: (messages: MessageType[]) => void;
  private client_id: string | null = null;
  private queue_size = 0;

  constructor(callback: (message: MessageType[]) => void) {
    this.send_messages = callback;
  }

  updateClientId(client_id: string | null) {
    this.client_id = client_id;
  }

  enqueue(event: QueueEvent) {
    this.queue_size += 1;
    console.log("incrase queue size", this.queue_size);
    if (event.type == "typing") {
      this.typing = event.typing;
    }
    if (event.type == "cursor") {
      this.cursor_ln = event.cursor_ln;
      this.cursor_pos = event.cursor_pos;
    }
  }

  length() {
    return this.queue_size;
  }

  flush_queue() {
    if (!this.client_id) {
      console.log("cant flush because no client id");

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
    if (messages.length) {
      this.send_messages(messages);
    }
    this.initial_typing = this.typing;
    this.initial_cursor_ln = this.cursor_ln;
    this.initial_cursor_pos = this.cursor_pos;

    // empty the queue at this point
  }
}

export const useQueue = (options: QueueOptions) => {
  // set interval
  const { max_size, threshold_queue, interval_delay, queue_manager } = options;
  const [queueTrigger, setQueueTrigger] = useState(false);
  const queue_manager_ref = useRef(queue_manager);

  const enqueue = useCallback((message: QueueEvent) => {
    queue_manager_ref.current.enqueue(message);
    if (queue_manager_ref.current.length() >= max_size) {
      setQueueTrigger((prev) => !prev); // Trigger the effect to empty the queue
    }
  }, []);

  const update_connected_status = useCallback((clientId: string | null) => {
    console.log("client id ", clientId);
    queue_manager_ref.current.updateClientId(clientId);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (queue_manager.length() > threshold_queue) {
        console.log("flushing ");
        queue_manager.flush_queue();
      } else {
        console.log("not enough messages", queue_manager.length());
      }
    }, interval_delay);

    return () => clearInterval(interval);
  }, [queueTrigger]);

  return {
    enqueue,
    update_connected_status,
  };
};
