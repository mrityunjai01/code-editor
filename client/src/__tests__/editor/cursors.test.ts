import { CursorManager, Cursor, createInitialCursors, DEFAULT_COLORS } from '../../editor/cursors';

// Mock Monaco Editor
const mockEditor = {
  createDecorationsCollection: jest.fn(() => ({
    set: jest.fn(),
  })),
  getModel: jest.fn(() => ({
    deltaDecorations: jest.fn(() => []),
  })),
};

describe('CursorManager', () => {
  let cursorManager: CursorManager;
  let mockOnCursorsChange: jest.Mock;

  beforeEach(() => {
    mockOnCursorsChange = jest.fn();
    cursorManager = new CursorManager(mockEditor as any, mockOnCursorsChange);
  });

  describe('Cursor Management', () => {
    test('should add a cursor', () => {
      const cursor: Cursor = {
        id: 'test-cursor',
        name: 'Test User',
        pos: 5,
        ln: 1,
        color: '#FF0000'
      };

      cursorManager.addCursor(cursor);
      
      const cursors = cursorManager.getCursors();
      expect(cursors).toHaveLength(1);
      expect(cursors[0]).toEqual(cursor);
      expect(mockOnCursorsChange).toHaveBeenCalledWith([cursor]);
    });

    test('should update a cursor', () => {
      const cursor: Cursor = {
        id: 'test-cursor',
        name: 'Test User',
        pos: 5,
        ln: 1,
        color: '#FF0000'
      };

      cursorManager.addCursor(cursor);
      cursorManager.updateCursor('test-cursor', { pos: 10, ln: 2 });

      const cursors = cursorManager.getCursors();
      expect(cursors[0]).toEqual({
        id: 'test-cursor',
        name: 'Test User',
        pos: 10,
        ln: 2,
        color: '#FF0000'
      });
    });

    test('should remove a cursor', () => {
      const cursor: Cursor = {
        id: 'test-cursor',
        name: 'Test User',
        pos: 5,
        ln: 1,
        color: '#FF0000'
      };

      cursorManager.addCursor(cursor);
      expect(cursorManager.getCursors()).toHaveLength(1);

      cursorManager.removeCursor('test-cursor');
      expect(cursorManager.getCursors()).toHaveLength(0);
      expect(mockOnCursorsChange).toHaveBeenCalledWith([]);
    });

    test('should set multiple cursors', () => {
      const cursors: Cursor[] = [
        {
          id: 'cursor1',
          name: 'User 1',
          pos: 0,
          ln: 0,
          color: '#FF0000'
        },
        {
          id: 'cursor2',
          name: 'User 2',
          pos: 5,
          ln: 1,
          color: '#00FF00'
        }
      ];

      cursorManager.setCursors(cursors);
      
      const retrievedCursors = cursorManager.getCursors();
      expect(retrievedCursors).toHaveLength(2);
      expect(retrievedCursors).toEqual(expect.arrayContaining(cursors));
    });

    test('should get main cursor', () => {
      const mainCursor: Cursor = {
        id: 'main',
        name: 'Main User',
        pos: 0,
        ln: 0,
        color: '#0000FF',
        isMain: true
      };

      const regularCursor: Cursor = {
        id: 'regular',
        name: 'Regular User',
        pos: 5,
        ln: 1,
        color: '#FF0000'
      };

      cursorManager.setCursors([mainCursor, regularCursor]);
      
      const mainCursorResult = cursorManager.getMainCursor();
      expect(mainCursorResult).toEqual(mainCursor);
    });

    test('should not call onChange callback if cursor update fails', () => {
      mockOnCursorsChange.mockClear();
      
      // Try to update non-existent cursor
      cursorManager.updateCursor('non-existent', { pos: 10 });
      
      expect(mockOnCursorsChange).not.toHaveBeenCalled();
    });
  });
});

describe('createInitialCursors', () => {
  test('should create initial cursors with main cursor and remote cursors', () => {
    const cursors = createInitialCursors();
    
    expect(cursors).toHaveLength(2); // 1 main + 1 remote (as per current implementation)
    
    const mainCursor = cursors.find(c => c.isMain);
    expect(mainCursor).toBeDefined();
    expect(mainCursor?.name).toBe('You');
    expect(mainCursor?.id).toBe('main');

    const remoteCursor = cursors.find(c => !c.isMain);
    expect(remoteCursor).toBeDefined();
    expect(remoteCursor?.name).toBe('User 1');
    expect(remoteCursor?.id).toBe('remote-0');
  });

  test('should assign different colors to remote cursors', () => {
    const cursors = createInitialCursors();
    const remoteCursors = cursors.filter(c => !c.isMain);
    
    remoteCursors.forEach((cursor, index) => {
      expect(cursor.color).toBe(DEFAULT_COLORS[index]);
    });
  });
});

describe('DEFAULT_COLORS', () => {
  test('should have at least 10 colors', () => {
    expect(DEFAULT_COLORS.length).toBeGreaterThanOrEqual(10);
  });

  test('should contain valid hex colors', () => {
    DEFAULT_COLORS.forEach(color => {
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });
});