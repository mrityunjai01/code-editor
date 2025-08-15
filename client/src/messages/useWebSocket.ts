import { useEffect, useRef, useState, useCallback } from "react";
import { logger } from "../utils/logger";
import { InitialDumpMessage } from "./types";

interface WebSocketOptions {
  url: string;
  onMessage: (message: any) => void;
  room_id: string;
  user_name: string;
  client_id: string | null;
  set_is_connected: (arg: boolean) => void;
  set_client_id: (arg: any) => void;
  editor_ready: boolean;
  setCursors: (cursors: any[]) => void; // Optional, for cursor management
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

export const useWebSocket = (options: WebSocketOptions) => {
  const {
    url,
    onMessage,
    room_id,
    user_name,
    client_id,
    set_is_connected,
    set_client_id,
    editor_ready,
    setCursors,
    onConnect,
    onDisconnect,
    onError,
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const maxReconnectAttempts = 5;
  const [trigger_reconnect, setTriggerReconnect] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    try {
      wsRef.current = new WebSocket(url);
      const ws = wsRef.current;

      ws.onopen = () => {
        setReconnectAttempts(0);
        logger.websocket.info(
          "WebSocket connected, reset reconnect attempts to",
          reconnectAttempts,
        );

        // Send connect message
        if (client_id) {
          ws.send(
            JSON.stringify({
              type: "connect",
              room_id: room_id,
              name: user_name,
            }),
          );
        } else {
          ws.send(
            JSON.stringify({
              type: "connect",
              room_id: room_id,
              name: user_name,
              client_id: client_id,
            }),
          );
        }

        onConnect?.();
      };

      ws.onmessage = onMessage;

      ws.onclose = () => {
        logger.websocket.info("WebSocket disconnected");
        set_is_connected(false);
        set_client_id(null);
        setTriggerReconnect((prev) => !prev);
        onDisconnect?.();

        // Attempt to reconnect
      };

      ws.onerror = (error) => {
        logger.websocket.error("WebSocket error:", error);
        onError?.(error);
      };
    } catch (error) {
      logger.websocket.error("Error creating WebSocket connection:", error);
    }
  }, [
    url,
    room_id,
    user_name,
    client_id,
    onConnect,
    onDisconnect,
    onError,
    onMessage,
  ]);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      logger.websocket.debug("sending message", message);
      wsRef.current.send(JSON.stringify(message));
    } else {
      logger.websocket.warn(
        "WebSocket is not connected. Message not sent:",
        message,
      );
    }
  }, []);

  const disconnect = useCallback(() => {
    logger.websocket.info("disconnecting");

    if (wsRef.current) {
      logger.websocket.info("closing WebSocket connection");
      wsRef.current.close();
      wsRef.current = null;
    }

    set_is_connected(false);
    set_client_id(null);
  }, []);

  useEffect(() => {
    if (editor_ready) {
      if (!client_id) {
        if (reconnectAttempts < maxReconnectAttempts) {
          setReconnectAttempts((prev) => prev + 1);
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 1000);
          return () => {
            if (reconnectTimeoutRef.current) {
              clearTimeout(reconnectTimeoutRef.current);
            }
          };
        }
      } else {
        setReconnectAttempts(0);
        return () => {
          disconnect();
        };
      }
    }
  }, [editor_ready, client_id, trigger_reconnect]);

  useEffect(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.onmessage = onMessage;
    }
  }, [onMessage, client_id, setCursors, room_id]);

  return {
    sendMessage,
    disconnect,
    reconnect: connect,
  };
};
