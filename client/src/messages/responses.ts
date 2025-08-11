export interface ConnectAckResponse {
  type: "connect_ack";
  client_id: string;
}

export interface AddClientResponse {
  type: "addclient";
  client_id: string;
  name: string;
}

export interface CursorResponse {
  type: "cursor_update";
  client_id: string;
  position: {
    line: number;
    column: number;
  };
}

export interface TypingResponse {
  type: "typing_indicator";
  client_id: string;
  typing: boolean;
}

export interface InitialDumpResponse {
  type: "initial_dump";
  content: string;
}

export interface TextResponse {
  type: "update";
  deltas: Array<{
    type: string;
    pos: number;
    ln: number;
    data: string;
  }>;
}

export type ResponseType = 
  | ConnectAckResponse 
  | AddClientResponse 
  | CursorResponse 
  | TypingResponse 
  | InitialDumpResponse 
  | TextResponse;

export function validateResponse(message: any): ResponseType | null {
  if (!message || typeof message !== "object" || !message.type) {
    return null;
  }

  try {
    switch (message.type) {
      case "connect_ack":
        if (typeof message.client_id === "string") {
          return message as ConnectAckResponse;
        }
        break;
      case "addclient":
        if (typeof message.client_id === "string" && typeof message.name === "string") {
          return message as AddClientResponse;
        }
        break;
      case "cursor_update":
        if (
          typeof message.client_id === "string" &&
          message.position &&
          typeof message.position.line === "number" &&
          typeof message.position.column === "number"
        ) {
          return message as CursorResponse;
        }
        break;
      case "typing_indicator":
        if (
          typeof message.client_id === "string" &&
          typeof message.typing === "boolean"
        ) {
          return message as TypingResponse;
        }
        break;
      case "initial_dump":
        if (typeof message.content === "string") {
          return message as InitialDumpResponse;
        }
        break;
      case "update":
        if (Array.isArray(message.deltas)) {
          return message as TextResponse;
        }
        break;
    }
  } catch {
    return null;
  }

  return null;
}