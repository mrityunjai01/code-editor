import "@testing-library/jest-dom";

// Polyfills for jsdom environment
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Mock WebSocket
const mockWebSocket = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
  send: jest.fn(),
  close: jest.fn(),
  readyState: 1,
  onopen: null,
  onclose: null,
  onmessage: null,
  onerror: null,
};

global.WebSocket = jest.fn(() => mockWebSocket) as any;

// Mock @monaco-editor/react
jest.mock("@monaco-editor/react", () => ({
  Editor: ({ onMount, onChange, ...props }: any) => {
    const mockEditor = {
      onDidChangeModelContent: jest.fn(),
      onDidChangeCursorPosition: jest.fn(),
      getModel: jest.fn(() => ({
        deltaDecorations: jest.fn(() => []),
        pushEditOperations: jest.fn(),
      })),
      createDecorationsCollection: jest.fn(() => ({
        set: jest.fn(),
      })),
    };

    // Simulate onMount being called
    setTimeout(() => {
      if (onMount) {
        onMount(mockEditor, {});
      }
    }, 0);

    return <div data-testid="monaco-editor" {...props} />;
  },
}));
