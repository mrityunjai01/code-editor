export interface ConnectMessage {
  type: "connect";
  room_id: string;
  name: string;
}

export interface TextMessage {
  type: "text";
  content: string;
  client_id: string;
}

export interface CursorMessage {
  type: "cursor";
  ln: number;
  pos: number;
  client_id: string;
}

export interface TypingMessage {
  type: "typing";
  is_typing: boolean;
  client_id: string;
}

export interface InitialDumpMessage {
  type: "initial_dump_request";
  room_id: string;
  client_id: string;
}

export type MessageType =
  | ConnectMessage
  | TextMessage
  | CursorMessage
  | TypingMessage
  | InitialDumpMessage;

export function validateMessage(message: any): MessageType | null {
  if (!message || typeof message !== "object" || !message.type) {
    return null;
  }

  try {
    switch (message.type) {
      case "connect":
        if (typeof message.room_id === "string") {
          return message as ConnectMessage;
        }
        break;
      case "text":
        if (
          typeof message.content === "string" &&
          typeof message.client_id === "string"
        ) {
          return message as TextMessage;
        }
        break;
      case "cursor":
        if (
          typeof message.position === "number" &&
          typeof message.client_id === "string"
        ) {
          return message as CursorMessage;
        }
        break;
      case "typing":
        if (
          typeof message.is_typing === "boolean" &&
          typeof message.client_id === "string"
        ) {
          return message as TypingMessage;
        }
        break;
    }
  } catch {
    return null;
  }

  return null;
}
