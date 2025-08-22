import { editor } from "monaco-editor";

export interface Cursor {
  id: string;
  name: string;
  pos: number;
  ln: number;
  color_idx: number;
  isMain: boolean;
  isTyping: boolean;
  options?: editor.IModelDecorationOptions;
}

export class CursorManager {
  private editor: editor.IStandaloneCodeEditor;
  private decorationsCollection: editor.IEditorDecorationsCollection | null =
    null;
  private cursors: Map<string, Cursor> = new Map();
  private onCursorsChange?: (cursors: Cursor[]) => void;

  constructor(
    editorInstance: editor.IStandaloneCodeEditor,
    onCursorsChange: (cursors: Cursor[]) => void,
  ) {
    this.editor = editorInstance;
    this.onCursorsChange = onCursorsChange;
    this.initializeStyles();
    this.initializeDecorations();
    return this;
  }

  private initializeDecorations() {
    this.decorationsCollection = this.editor.createDecorationsCollection();
  }

  setCursors(cursors: Cursor[]) {
    this.cursors.clear();
    cursors.forEach((cursor) => {
      this.cursors.set(cursor.id, cursor);
    });
    this.reinitializeDecorations();
    this.notifyChange();
  }

  addCursor(cursor: Cursor) {
    this.cursors.set(cursor.id, cursor);
    this.reinitializeDecorations();
    this.notifyChange();
  }

  updateCursor(id: string, updates: Partial<Cursor>) {
    const existing = this.cursors.get(id);
    if (existing) {
      this.cursors.set(id, { ...existing, ...updates });
      this.reinitializeDecorations();
      this.notifyChange();
    }
  }

  removeCursor(id: string) {
    this.cursors.delete(id);
    this.reinitializeDecorations();
    this.notifyChange();
  }

  getCursors(): Cursor[] {
    return Array.from(this.cursors.values());
  }

  // This manager only handles remote cursors now

  updateTypingStatus(id: string, isTyping: boolean) {
    const existing = this.cursors.get(id);
    if (existing) {
      this.cursors.set(id, { ...existing, isTyping });
      this.reinitializeDecorations();
      this.notifyChange();
    }
  }

  private reinitializeDecorations(): void {
    if (!this.decorationsCollection) return;

    const newDecorations: editor.IModelDeltaDecoration[] = Array.from(
      this.cursors.values(),
    )
      // All cursors in this manager are remote cursors
      .map((cursor) => {
        const defaultOptions: editor.IModelDecorationOptions = {
          className: `remote-cursor cursor-${cursor.id} `,
          beforeContentClassName: `remote-cursor-line cursor-color-${cursor.color_idx}`,
          stickiness: 1, // NeverGrowsWhenTypingAtEdges
          hoverMessage: [
            {
              value: `**${cursor.name}**${cursor.isTyping ? " (typing...)" : ""}\nLine: ${cursor.ln + 1}, Column: ${cursor.pos + 1}`,
            },
          ],
        };

        return {
          range: {
            startLineNumber: cursor.ln + 1,
            endLineNumber: cursor.ln + 1,
            startColumn: cursor.pos + 1,
            endColumn: cursor.pos + 1,
          },
          options: cursor.options
            ? { ...defaultOptions, ...cursor.options }
            : defaultOptions,
        };
      });

    this.decorationsCollection.set(newDecorations);
  }

  private notifyChange() {
    if (this.onCursorsChange) {
      this.onCursorsChange(this.getCursors());
    }
  }

  private initializeStyles() {
    if (document.getElementById("cursor-styles")) return;

    const styleSheet = document.createElement("style");
    styleSheet.id = "cursor-styles";
    styleSheet.type = "text/css";

    let css = `
      /* Base cursor styles */
      
      .remote-cursor-line::before {
        content: '';
        position: absolute;
        width: 1px;
        height: 1.2em;
        animation: cursor-blink 1s infinite;
        z-index: 1000;
        border-radius: 1px;
      }
      
      @keyframes cursor-blink {
        0%, 50% { opacity: 1; }
        51%, 100% { opacity: 0.3; }
      }
    `;

    // Add individual cursor color styles
    DEFAULT_COLORS.forEach((color, index) => {
      css += `
        .cursor-color-${index}::before {
            background-color: ${color};
        }
      `;
    });

    styleSheet.innerHTML = css;
    document.head.appendChild(styleSheet);
  }
}

export const DEFAULT_COLORS = [
  "#FF6B6B", // Red
  "#4ECDC4", // Teal
  "#45B7D1", // Blue
  "#96CEB4", // Green
  "#FFEAA7", // Yellow
  "#DDA0DD", // Plum
  "#98D8C8", // Mint
  "#F7DC6F", // Gold
  "#BB8FCE", // Purple
  "#85C1E9", // Light Blue
  "#F8C471", // Orange
];

export interface MainCursor {
  name: string;
  pos: number;
  ln: number;
}

export class MainCursorManager {
  private cursor: MainCursor;
  private onCursorChange?: (cursor: MainCursor) => void;

  constructor(name: string, onCursorChange?: (cursor: MainCursor) => void) {
    this.cursor = {
      name,
      pos: 0,
      ln: 0,
    };
    this.onCursorChange = onCursorChange;
  }

  updateCursor(pos: number, ln: number) {
    this.cursor = { ...this.cursor, pos, ln };
    this.notifyChange();
  }

  getCursor(): MainCursor {
    return { ...this.cursor };
  }

  private notifyChange() {
    if (this.onCursorChange) {
      this.onCursorChange(this.getCursor());
    }
  }
}

export const createInitialCursors = (user_name: string): Cursor[] => {
  return [];
};
