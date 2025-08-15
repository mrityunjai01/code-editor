import { Delta } from "../editor/applyDeltas";

export interface ConnectAckResponse {
  type: "connect_ack";
  client_id: string;
}

export interface ClientInfo {
  client_id: string;
  name: string;
}

export interface AddClientResponse {
  type: "addclient";
  clients: ClientInfo[];
}
export interface RemoveClientResponse {
  type: "removeclient";
  clients: ClientInfo[];
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
  deltas: Delta[];
}
export interface TextAcceptedResponse {
  type: "text_accepted";
  count: number;
}

export type ResponseType =
  | ConnectAckResponse
  | AddClientResponse
  | RemoveClientResponse
  | CursorResponse
  | TypingResponse
  | InitialDumpResponse
  | TextResponse
  | TextAcceptedResponse;

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
        if (
          Array.isArray(message.clients) &&
          message.clients.every(
            (client: any) =>
              typeof client.client_id === "string" &&
              typeof client.name === "string",
          )
        ) {
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
