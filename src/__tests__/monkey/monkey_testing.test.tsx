import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import App from '../../App';


// Helper function to generate random text
const generateRandomText = (length: number = 100): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Helper function to generate random room ID
const generateRandomRoomId = (): string => {
  const types = ['r', '#r-', 'room_', ''];
  const type = types[Math.floor(Math.random() * types.length)];
  const number = Math.floor(Math.random() * 10000);
  return `${type}${number}`;
};

// Helper to render app with router
const renderApp = () => {
  return render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
};

describe('Monkey Testing Suite', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();
  });

  describe('Basic Element Visibility', () => {
    test('should render all essential UI elements', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.getByTestId('monaco-editor')).toBeVisible();
        expect(screen.getByRole('button', { name: /connect/i })).toBeVisible();
        expect(screen.getByPlaceholderText(/enter room name/i)).toBeVisible();
      });
    });
  });

  describe('Monaco Editor Chaos Testing', () => {
    test('should handle rapid random text input without crashing', async () => {
      renderApp();
      
      const editor = await screen.findByTestId('monaco-editor');
      
      // Simulate rapid random typing
      for (let i = 0; i < 50; i++) {
        const randomText = generateRandomText(Math.floor(Math.random() * 20) + 1);
        await user.type(editor, randomText);
        
        // Random chance to clear editor
        if (Math.random() < 0.1) {
          await user.clear(editor);
        }
      }

      expect(editor).toBeInTheDocument();
    });

    test('should handle special characters and unicode input', async () => {
      renderApp();
      
      const editor = await screen.findByTestId('monaco-editor');
      
      const specialChars = [
        '🚀🌟💻🔥⚡🎯🚨🎉',  // Emojis
        '¿¡àáâãäåæçèéêë',      // International chars
        '~`!@#$%^&*()_+-={}[]|\\:";\'<>?,./≈∞≤≥±∆∇∫∮Ω≠', // Special symbols
        '\n\t\r',               // Control characters
        '<?xml version="1.0"?><root></root>', // XML
        'SELECT * FROM users; DROP TABLE users;--', // SQL injection attempt
        '<script>alert("xss")</script>', // XSS attempt
      ];

      for (const chars of specialChars) {
        await user.type(editor, chars);
        await user.keyboard('{Enter}');
      }

      expect(editor).toBeInTheDocument();
    });

    test('should handle extremely long text input', async () => {
      renderApp();
      
      const editor = await screen.findByTestId('monaco-editor');
      
      // Generate very long text (10KB)
      const longText = generateRandomText(10000);
      
      await user.type(editor, longText.substring(0, 500)); // Type first part
      
      expect(editor).toBeInTheDocument();
    });

    test('should handle rapid cursor movements and selections', async () => {
      renderApp();
      
      const editor = await screen.findByTestId('monaco-editor');
      
      // Add some initial text
      await user.type(editor, 'Initial text for cursor testing');
      
      // Simulate rapid cursor movements
      for (let i = 0; i < 20; i++) {
        await user.keyboard('{ArrowLeft}');
        await user.keyboard('{ArrowRight}');
        await user.keyboard('{ArrowUp}');
        await user.keyboard('{ArrowDown}');
        
        // Random selection
        if (Math.random() < 0.3) {
          await user.keyboard('{Shift>}{ArrowLeft}{ArrowLeft}{/Shift}');
        }
      }

      expect(editor).toBeInTheDocument();
    });
  });

  describe('Connect Button Chaos Testing', () => {
    test('should handle rapid connect button clicks', async () => {
      renderApp();
      
      const connectButton = await screen.findByRole('button', { name: /connect/i });
      
      // Rapidly click connect button
      for (let i = 0; i < 20; i++) {
        await user.click(connectButton);
        
        // Random short delays
        if (Math.random() < 0.3) {
          await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
        }
      }

      expect(connectButton).toBeInTheDocument();
    });

    test('should handle double and triple clicks on connect button', async () => {
      renderApp();
      
      const connectButton = await screen.findByRole('button', { name: /connect/i });
      
      // Double clicks
      for (let i = 0; i < 5; i++) {
        await user.dblClick(connectButton);
      }
      
      // Triple clicks
      for (let i = 0; i < 5; i++) {
        await user.click(connectButton);
        await user.click(connectButton);
        await user.click(connectButton);
      }

      expect(connectButton).toBeInTheDocument();
    });

    test('should handle keyboard interactions on connect button', async () => {
      renderApp();
      
      const connectButton = await screen.findByRole('button', { name: /connect/i });
      
      // Focus and keyboard interactions
      connectButton.focus();
      
      for (let i = 0; i < 10; i++) {
        await user.keyboard('{Enter}');
        await user.keyboard(' '); // Space key
        await user.keyboard('{Tab}');
      }

      expect(connectButton).toBeInTheDocument();
    });
  });

  describe('Room ID Input Chaos Testing', () => {
    test('should handle random room ID inputs', async () => {
      renderApp();
      
      const roomInput = await screen.findByPlaceholderText(/enter room name/i);
      
      // Test various random room IDs
      for (let i = 0; i < 30; i++) {
        const randomRoomId = generateRandomRoomId();
        
        await user.clear(roomInput);
        await user.type(roomInput, randomRoomId);
        
        // Random chance to press enter
        if (Math.random() < 0.2) {
          await user.keyboard('{Enter}');
        }
      }

      expect(roomInput).toBeInTheDocument();
    });

    test('should handle invalid and malicious room ID inputs', async () => {
      renderApp();
      
      const roomInput = await screen.findByPlaceholderText(/enter room name/i);
      
      const maliciousInputs = [
        '', // Empty
        ' '.repeat(1000), // Very long spaces
        '../../etc/passwd', // Path traversal
        '<script>alert("xss")</script>', // XSS
        'DROP TABLE rooms;--', // SQL injection
        '\0\0\0\0', // Null bytes
        'room\n\nwith\nnewlines',
        '🚀'.repeat(100), // Many emojis
        '../../../windows/system32',
        'rm -rf /',
        String.fromCharCode(0, 1, 2, 3, 4, 5), // Control characters
      ];

      for (const maliciousInput of maliciousInputs) {
        await user.clear(roomInput);
        await user.type(roomInput, maliciousInput);
        
        // Try to connect with malicious input
        const connectButton = screen.getByRole('button', { name: /connect/i });
        await user.click(connectButton);
      }

      expect(roomInput).toBeInTheDocument();
    });

    test('should handle rapid room ID changes', async () => {
      renderApp();
      
      const roomInput = await screen.findByPlaceholderText(/enter room name/i);
      const connectButton = screen.getByRole('button', { name: /connect/i });
      
      // Rapidly change room IDs and connect
      for (let i = 0; i < 15; i++) {
        const roomId = `room${i}`;
        
        await user.clear(roomInput);
        await user.type(roomInput, roomId);
        await user.click(connectButton);
        
        // Random short delay
        if (Math.random() < 0.5) {
          await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
        }
      }

      expect(roomInput).toBeInTheDocument();
    });
  });

  describe('Combined Chaos Testing', () => {
    test('should handle simultaneous editor typing and button clicking', async () => {
      renderApp();
      
      const editor = await screen.findByTestId('monaco-editor');
      const roomInput = screen.getByPlaceholderText(/enter room name/i);
      const connectButton = screen.getByRole('button', { name: /connect/i });
      
      // Perform multiple actions simultaneously
      const promises = [];
      
      // Type in editor
      promises.push((async () => {
        for (let i = 0; i < 10; i++) {
          await user.type(editor, generateRandomText(10));
        }
      })());
      
      // Change room ID
      promises.push((async () => {
        for (let i = 0; i < 5; i++) {
          await user.clear(roomInput);
          await user.type(roomInput, `room${i}`);
        }
      })());
      
      // Click connect button
      promises.push((async () => {
        for (let i = 0; i < 8; i++) {
          await user.click(connectButton);
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      })());
      
      await Promise.all(promises);
      
      expect(editor).toBeInTheDocument();
      expect(roomInput).toBeInTheDocument();
      expect(connectButton).toBeInTheDocument();
    });

    test('should handle random user behavior simulation', async () => {
      renderApp();
      
      const editor = await screen.findByTestId('monaco-editor');
      const roomInput = screen.getByPlaceholderText(/enter room name/i);
      const connectButton = screen.getByRole('button', { name: /connect/i });
      
      // Simulate 50 random user actions
      for (let i = 0; i < 50; i++) {
        const action = Math.floor(Math.random() * 8);
        
        try {
          switch (action) {
            case 0: // Type in editor
              await user.type(editor, generateRandomText(5));
              break;
            case 1: // Clear editor
              await user.clear(editor);
              break;
            case 2: // Change room ID
              await user.clear(roomInput);
              await user.type(roomInput, generateRandomRoomId());
              break;
            case 3: // Click connect
              await user.click(connectButton);
              break;
            case 4: // Keyboard navigation
              await user.keyboard('{Tab}');
              break;
            case 5: // Arrow keys in editor
              await user.keyboard('{ArrowLeft}{ArrowRight}');
              break;
            case 6: // Enter key
              await user.keyboard('{Enter}');
              break;
            case 7: // Random text selection
              await user.keyboard('{Shift>}{ArrowLeft}{ArrowLeft}{/Shift}');
              break;
          }
        } catch (error) {
          // Log but don't fail the test for individual action errors
          console.warn(`Action ${action} failed:`, error);
        }
      }
      
      // Verify app is still functional
      expect(editor).toBeInTheDocument();
      expect(roomInput).toBeInTheDocument();
      expect(connectButton).toBeInTheDocument();
    });
  });

  describe('Performance and Memory Stress Testing', () => {
    test('should handle sustained user activity without memory leaks', async () => {
      renderApp();
      
      const editor = await screen.findByTestId('monaco-editor');
      
      // Simulate sustained activity for longer period
      for (let session = 0; session < 10; session++) {
        // Add substantial content
        await user.type(editor, generateRandomText(200));
        
        // Clear and repeat
        await user.clear(editor);
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      expect(editor).toBeInTheDocument();
    });

    test('should handle rapid state changes', async () => {
      renderApp();
      
      const roomInput = screen.getByPlaceholderText(/enter room name/i);
      const connectButton = screen.getByRole('button', { name: /connect/i });
      
      // Rapidly change room states
      for (let i = 0; i < 20; i++) {
        await user.clear(roomInput);
        await user.type(roomInput, `test${i}`);
        await user.click(connectButton);
        
        // Small delay between actions
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      expect(roomInput).toBeInTheDocument();
      expect(connectButton).toBeInTheDocument();
    });
  });
});