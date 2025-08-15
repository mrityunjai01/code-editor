import { QueueOptions } from "./websocket_queue";

export const websocket_config = (queue_manager: any): QueueOptions => {
  return {
    threshold_queue: 1,
    queue_manager: queue_manager,
    total_message_freq: 160,
    pos_update_minimum_freq: 10,
    pos_update_maximum_freq: 140,
  };
};
