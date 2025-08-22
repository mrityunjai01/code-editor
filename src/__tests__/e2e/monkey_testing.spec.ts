import { test, expect, Page } from '@playwright/test';

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

// Helper function to perform random editor actions
const performRandomEditorAction = async (page: Page, editor: any) => {
  const actions = [
    'type', 'clear', 'arrow', 'enter', 'select', 'delete', 'paste'
  ];
  const action = actions[Math.floor(Math.random() * actions.length)];
  
  try {
    switch (action) {
      case 'type':
        await editor.fill(generateRandomText(Math.floor(Math.random() * 20) + 1));
        break;
      case 'clear':
        await editor.fill('');
        break;
      case 'arrow':
        await page.keyboard.press('ArrowLeft');
        await page.keyboard.press('ArrowRight');
        break;
      case 'enter':
        await page.keyboard.press('Enter');
        break;
      case 'select':
        await page.keyboard.press('Shift+ArrowLeft');
        await page.keyboard.press('Shift+ArrowLeft');
        break;
      case 'delete':
        await page.keyboard.press('Delete');
        break;
      case 'paste':
        await page.keyboard.press('Control+v');
        break;
    }
  } catch (error) {
    console.warn(`Action ${action} failed:`, error);
  }
};

test.describe('Monkey Testing Suite', () => {
  test('Basic UI elements are visible', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Check if essential elements are visible
    const editor = page.locator('.monaco-editor, [data-testid="monaco-editor"], textarea');
    const connectButton = page.locator('button:has-text("Connect")');
    const roomInput = page.locator('input[placeholder*="room" i]');
    
    await expect(editor.first()).toBeVisible();
    await expect(connectButton).toBeVisible();
    await expect(roomInput).toBeVisible();
  });

  test('Monaco Editor chaos testing - random typing', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Wait for Monaco editor to load
    await page.waitForTimeout(2000);
    
    // Try to find the Monaco editor
    const editor = page.locator('.monaco-editor .view-lines').first();
    await editor.waitFor({ timeout: 10000 });
    
    // Click to focus the editor
    await editor.click();
    
    // Perform random typing actions
    for (let i = 0; i < 20; i++) {
      const randomText = generateRandomText(Math.floor(Math.random() * 50) + 1);
      await page.keyboard.type(randomText);
      
      // Random chance to clear
      if (Math.random() < 0.1) {
        await page.keyboard.press('Control+a');
        await page.keyboard.press('Delete');
      }
      
      // Random delay
      if (Math.random() < 0.3) {
        await page.waitForTimeout(Math.random() * 100);
      }
    }
    
    // Verify editor is still functional
    await expect(editor).toBeVisible();
  });

  test('Monaco Editor special characters testing', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const editor = page.locator('.monaco-editor .view-lines').first();
    await editor.waitFor({ timeout: 10000 });
    await editor.click();
    
    const specialChars = [
      '🚀🌟💻🔥⚡🎯🚨🎉',  // Emojis
      '¿¡àáâãäåæçèéêë',      // International chars
      '~`!@#$%^&*()_+-={}[]|\\:";\'<>?,./≈∞≤≥±∆∇∫∮Ω≠', // Special symbols
      '<?xml version="1.0"?><root></root>', // XML
      'SELECT * FROM users; DROP TABLE users;--', // SQL injection attempt
      '<script>alert("xss")</script>', // XSS attempt
    ];

    for (const chars of specialChars) {
      await page.keyboard.type(chars);
      await page.keyboard.press('Enter');
    }

    await expect(editor).toBeVisible();
  });

  test('Connect button chaos testing', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const connectButton = page.locator('button:has-text("Connect")');
    const roomInput = page.locator('input[placeholder*="room" i]');
    
    await expect(connectButton).toBeVisible();
    
    // Enable the button by changing room ID first
    await roomInput.fill('test-room');
    
    // Rapid clicking
    for (let i = 0; i < 15; i++) {
      try {
        await connectButton.click({ timeout: 1000 });
        
        // Re-enable button for next click
        await roomInput.fill(`test-room-${i}`);
        
        // Random short delays
        if (Math.random() < 0.3) {
          await page.waitForTimeout(Math.random() * 50);
        }
      } catch (error) {
        // Button might be disabled, enable it
        await roomInput.fill(`test-room-${i}-retry`);
      }
    }
    
    // Verify button is still functional
    await expect(connectButton).toBeVisible();
  });

  test('Room ID input chaos testing', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const roomInput = page.locator('input[placeholder*="room" i]');
    const connectButton = page.locator('button:has-text("Connect")');
    
    await expect(roomInput).toBeVisible();
    
    // Test various random room IDs
    for (let i = 0; i < 20; i++) {
      const randomRoomId = generateRandomRoomId();
      
      await roomInput.fill('');
      await roomInput.fill(randomRoomId);
      
      // Random chance to press enter or click connect
      if (Math.random() < 0.3) {
        await page.keyboard.press('Enter');
      } else if (Math.random() < 0.5) {
        await connectButton.click();
      }
    }
    
    await expect(roomInput).toBeVisible();
  });

  test('Malicious input testing', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const roomInput = page.locator('input[placeholder*="room" i]');
    const connectButton = page.locator('button:has-text("Connect")');
    
    const maliciousInputs = [
      '', // Empty
      ' '.repeat(1000), // Very long spaces
      '../../etc/passwd', // Path traversal
      '<script>alert("xss")</script>', // XSS
      'DROP TABLE rooms;--', // SQL injection
      '🚀'.repeat(100), // Many emojis
      '../../../windows/system32',
      'rm -rf /',
      String.fromCharCode(0, 1, 2, 3, 4, 5), // Control characters
    ];

    for (const maliciousInput of maliciousInputs) {
      await roomInput.fill('');
      await roomInput.fill(maliciousInput);
      await connectButton.click();
      
      // Small delay
      await page.waitForTimeout(50);
    }

    await expect(roomInput).toBeVisible();
    await expect(connectButton).toBeVisible();
  });

  test('Simultaneous chaos testing', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const editor = page.locator('.monaco-editor .view-lines').first();
    const roomInput = page.locator('input[placeholder*="room" i]');
    const connectButton = page.locator('button:has-text("Connect")');
    
    await editor.waitFor({ timeout: 10000 });
    
    // Perform multiple chaotic actions simultaneously
    const promises = [];
    
    // Editor typing chaos
    promises.push((async () => {
      await editor.click();
      for (let i = 0; i < 10; i++) {
        await page.keyboard.type(generateRandomText(10));
        await page.waitForTimeout(Math.random() * 50);
      }
    })());
    
    // Room ID chaos
    promises.push((async () => {
      for (let i = 0; i < 8; i++) {
        await roomInput.fill(generateRandomRoomId());
        await page.waitForTimeout(Math.random() * 100);
      }
    })());
    
    // Button clicking chaos
    promises.push((async () => {
      for (let i = 0; i < 6; i++) {
        try {
          await roomInput.fill(`chaos-room-${i}`);
          await connectButton.click({ timeout: 1000 });
          await page.waitForTimeout(Math.random() * 150);
        } catch (error) {
          // Continue if button is disabled
          await page.waitForTimeout(100);
        }
      }
    })());
    
    await Promise.all(promises);
    
    // Verify everything is still functional
    await expect(editor).toBeVisible();
    await expect(roomInput).toBeVisible();
    await expect(connectButton).toBeVisible();
  });

  test('Random user behavior simulation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const editor = page.locator('.monaco-editor .view-lines').first();
    const roomInput = page.locator('input[placeholder*="room" i]');
    const connectButton = page.locator('button:has-text("Connect")');
    
    await editor.waitFor({ timeout: 10000 });
    
    // Simulate 30 random user actions
    for (let i = 0; i < 30; i++) {
      const action = Math.floor(Math.random() * 10);
      
      try {
        switch (action) {
          case 0: // Type in editor
            await editor.click();
            await page.keyboard.type(generateRandomText(5));
            break;
          case 1: // Clear editor
            await editor.click();
            await page.keyboard.press('Control+a');
            await page.keyboard.press('Delete');
            break;
          case 2: // Change room ID
            await roomInput.fill(generateRandomRoomId());
            break;
          case 3: // Click connect
            await connectButton.click();
            break;
          case 4: // Tab navigation
            await page.keyboard.press('Tab');
            break;
          case 5: // Arrow keys
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.press('ArrowRight');
            break;
          case 6: // Enter key
            await page.keyboard.press('Enter');
            break;
          case 7: // Random text selection
            await page.keyboard.press('Shift+ArrowLeft');
            break;
          case 8: // Random scroll
            await page.mouse.wheel(0, Math.random() * 200 - 100);
            break;
          case 9: // Random click in safe area (not near browser controls)
            await page.mouse.click(200 + Math.random() * 400, 200 + Math.random() * 300);
            break;
        }
        
        // Random delay between actions
        if (Math.random() < 0.3) {
          await page.waitForTimeout(Math.random() * 100);
        }
      } catch (error) {
        console.warn(`Action ${action} failed:`, error);
      }
    }
    
    // Verify app is still functional
    await expect(editor).toBeVisible();
    await expect(roomInput).toBeVisible();
    await expect(connectButton).toBeVisible();
  });

  test('Performance stress testing', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const editor = page.locator('.monaco-editor .view-lines').first();
    const roomInput = page.locator('input[placeholder*="room" i]');
    const connectButton = page.locator('button:has-text("Connect")');
    
    await editor.waitFor({ timeout: 10000 });
    await editor.click();
    
    // Sustained heavy activity
    for (let session = 0; session < 5; session++) {
      // Fill editor with substantial content
      await page.keyboard.type(generateRandomText(500));
      
      // Rapid room changes
      for (let i = 0; i < 10; i++) {
        await roomInput.fill(`stress_test_${i}`);
        await connectButton.click();
      }
      
      // Clear and repeat
      await editor.click();
      await page.keyboard.press('Control+a');
      await page.keyboard.press('Delete');
    }

    await expect(editor).toBeVisible();
    await expect(roomInput).toBeVisible();
    await expect(connectButton).toBeVisible();
  });

  test('Keyboard accessibility chaos', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Test rapid keyboard navigation
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');
      await page.keyboard.press('Shift+Tab');
      await page.keyboard.press('Enter');
      await page.keyboard.press('Space');
      await page.keyboard.press('Escape');
    }
    
    // Verify page is still responsive
    const editor = page.locator('.monaco-editor .view-lines').first();
    const connectButton = page.locator('button:has-text("Connect")');
    
    await expect(editor).toBeVisible();
    await expect(connectButton).toBeVisible();
  });
});