import { useEffect, useRef, useState, useCallback } from "react";

interface WebSocketOptions {
  url: string;
  onMessage: (message: any) => void;
  room_id: string;
  user_name: string;
  client_id: string | null;
  set_is_connected: (arg: boolean) => void;
  set_client_id: (arg: any) => void;
  editor_ready: boolean;
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
    onConnect,
    onDisconnect,
    onError,
    editor_ready,
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    try {
      wsRef.current = new WebSocket(url);
      const ws = wsRef.current;

      ws.onopen = () => {
        setReconnectAttempts(0);
        console.log("WebSocket connected, reset to ", reconnectAttempts);

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

      ws.onmessage = (event) => {
        console.log("received message", event.data);
        try {
          const message = JSON.parse(event.data);

          onMessage(message);
        } catch (error) {}
      };

      ws.onclose = () => {
        console.log("WebSocket disconnected");
        set_is_connected(false);
        set_client_id(null);
        onDisconnect?.();

        // Attempt to reconnect
        if (reconnectAttempts < maxReconnectAttempts) {
          const timeout = Math.pow(2, reconnectAttempts) * 1000; // Exponential backoff
          console.log(
            `Attempting to reconnect in ${timeout}ms... (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`,
          );

          setReconnectAttempts((prev) => prev + 1);
          // reconnectTimeoutRef.current = setTimeout(() => {
          //   // setReconnectTrigger((prev) => !prev); // Trigger reconnect
          // }, timeout);
        } else {
          console.log("Max reconnection attempts reached");
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        onError?.(error);
      };
    } catch (error) {
      console.error("Error creating WebSocket connection:", error);
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
      console.log("sending message", message);
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn("WebSocket is not connected. Message not sent:", message);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (wsRef.current) {
      console.log("closing");
      wsRef.current.close();
      wsRef.current = null;
    }

    set_is_connected(false);
    set_client_id(null);
  }, []);

  useEffect(() => {
    if (editor_ready) connect();

    return () => {
      disconnect();
    };
  }, [editor_ready]);

  useEffect(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log("change callback");
      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          onMessage(message);
        } catch (error) {}
      };
    }
  }, [onMessage, client_id]);

  return {
    sendMessage,
    disconnect,
    reconnect: connect,
  };
};
