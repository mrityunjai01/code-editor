import { editor } from "monaco-editor";

export interface Cursor {
  id: string;
  name: string;
  pos: number;
  ln: number;
  color: string;
  isMain?: boolean;
  options?: editor.IModelDecorationOptions;
}

export class CursorManager {
  private editor: editor.IStandaloneCodeEditor;
  private decorationsCollection: editor.IEditorDecorationsCollection | null =
    null;
  private decorations: string[] = [];
  private cursors: Map<string, Cursor> = new Map();
  private onCursorsChange?: (cursors: Cursor[]) => void;

  constructor(
    editorInstance: editor.IStandaloneCodeEditor,
    onCursorsChange?: (cursors: Cursor[]) => void,
  ) {
    this.editor = editorInstance;
    this.onCursorsChange = onCursorsChange;
    this.initializeStyles();
    this.initializeDecorations();
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
      console.log("changed cursor to ", this.cursors.get(id));
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

  getMainCursor(): Cursor | undefined {
    return Array.from(this.cursors.values()).find((cursor) => cursor.isMain);
  }

  private reinitializeDecorations(): void {
    if (!this.decorationsCollection) return;

    const newDecorations: editor.IModelDeltaDecoration[] = Array.from(
      this.cursors.values(),
    )
      .filter((cursor) => !cursor.isMain) // Don't decorate main cursor
      .map((cursor) => {
        const defaultOptions: editor.IModelDecorationOptions = {
          className: `remote-cursor cursor-${cursor.id}`,
          beforeContentClassName: "remote-cursor-line",
          stickiness: 1, // NeverGrowsWhenTypingAtEdges
          hoverMessage: {
            value: `**${cursor.name}**\nLine: ${cursor.ln + 1}, Column: ${cursor.pos + 1}`,
          },
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
    this.updateCursorStyles();
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
      .remote-cursor, .user-cursor {
        position: relative;
      }
      
      .remote-cursor-line::before {
        content: '';
        position: absolute;
        width: 2px;
        height: 1.2em;
        background-color: var(--cursor-color, #007ACC);
        animation: cursor-blink 1s infinite;
        z-index: 1000;
        border-radius: 1px;
      }
      
      .remote-cursor-after {
        position: relative;
      }
      
      .remote-cursor-glyph {
        background-color: var(--cursor-color, #007ACC);
        width: 4px;
        border-radius: 2px;
      }
      
      .remote-cursor-inline {
        background-color: var(--cursor-color, #007ACC);
        opacity: 0.2;
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
          --cursor-color: ${color};
        }
        .cursor-${index} {
          --cursor-color: ${color};
        }
      `;
    });

    styleSheet.innerHTML = css;
    document.head.appendChild(styleSheet);
  }

  private updateCursorStyles() {
    // Update CSS custom properties for each cursor
    this.cursors.forEach((cursor) => {
      const cursorElements = document.querySelectorAll(`.cursor-${cursor.id}`);
      cursorElements.forEach((element) => {
        (element as HTMLElement).style.setProperty(
          "--cursor-color",
          cursor.color,
        );
      });
    });
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

export const createInitialCursors = (): Cursor[] => {
  const cursors: Cursor[] = [
    {
      id: "main",
      name: "You",
      pos: 0,
      ln: 0,
      color: "#007ACC",
      isMain: true,
    },
  ];

  // Add 10 remote cursors with custom decoration options
  for (let i = 0; i < 1; i++) {
    cursors.push({
      id: `remote-${i}`,
      name: `User ${i + 1}`,
      pos: 0,
      ln: i,
      color: DEFAULT_COLORS[i],
      options: {
        className: `remote-cursor-${i} user-cursor`,
        glyphMarginClassName: `remote-cursor-glyph cursor-${i}`,
        stickiness: 1,
        hoverMessage: {
          value: `**User ${i + 1}** is here\nLine: ${i + 1}, Column: 1`,
        },
      },
    });
  }

  return cursors;
};
