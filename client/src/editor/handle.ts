import { editor } from "monaco-editor";
import { Delta, applyDeltasToEditor } from "./applyDeltas";
import { logger } from "../utils/logger";

export class EditorChangeHandler {
  private cumulativeDeltas: Delta[] = [];
  private editorInstance: editor.IStandaloneCodeEditor | null = null;
  private onChangesCallback?: (deltas: Delta[]) => void;

  constructor(
    editorInstance?: editor.IStandaloneCodeEditor,
    onChangesCallback?: (deltas: Delta[]) => void,
  ) {
    if (editorInstance) {
      this.editorInstance = editorInstance;
    }
    this.onChangesCallback = onChangesCallback;

    if (editorInstance && onChangesCallback) {
      this.setupChangeListener();
    }
  }

  setEditor(editorInstance: editor.IStandaloneCodeEditor) {
    this.editorInstance = editorInstance;
    if (this.onChangesCallback) {
      this.setupChangeListener();
    }
  }

  setOnChangesCallback(callback: (deltas: Delta[]) => void) {
    this.onChangesCallback = callback;
    if (this.editorInstance) {
      this.setupChangeListener();
    }
  }

  private setupChangeListener() {
    if (!this.editorInstance || !this.onChangesCallback) return;

    this.editorInstance.onDidChangeModelContent((e) => {
      const deltas: Delta[] = e.changes.map((change) => {
        logger.editor.debug("Change detected:", change);

        // Convert to Delta format (startLine, startCol, endLine, endCol, text)
        return {
          startLine: change.range.startLineNumber,
          startCol: change.range.startColumn,
          endLine: change.range.endLineNumber,
          endCol: change.range.endColumn,
          text: change.text,
        };
      });

      // Store deltas cumulatively
      this.addDeltas(deltas);

      // Call the callback with the new deltas
      if (this.onChangesCallback) {
        this.onChangesCallback(deltas);
      }
    });
  }

  addDelta(delta: Delta) {
    const lastDelta = this.cumulativeDeltas[this.cumulativeDeltas.length - 1];

    // Try to merge with the last delta if they're compatible
    if (lastDelta && this.canMergeDeltas(lastDelta, delta)) {
      const mergedDelta = this.mergeDeltas(lastDelta, delta);
      this.cumulativeDeltas[this.cumulativeDeltas.length - 1] = mergedDelta;
      logger.editor.debug("Merged delta:", mergedDelta);
    } else {
      if (lastDelta) {
        logger.editor.debug("cant merge deltas:", lastDelta, delta);
        logger.editor.debug(
          "cant merge deltas:",
          lastDelta.pos,
          lastDelta.data,
          lastDelta.data?.length,
        );
      }
      this.cumulativeDeltas.push(delta);
    }
  }

  private canMergeDeltas(delta: Delta, blob: Blob): boolean {
    if (delta1.ln !== delta2.ln || delta2.type == "replace") return false;

    if (delta1.type === "insert" && delta2.type === "insert") {
      return delta2.pos === delta1.pos + (delta1.data?.length || 0);
    }

    if (delta1.type === "delete" && delta2.type === "delete") {
      return delta1.pos === delta2.pos + (delta1.steps || 0);
    }

    return false;
  }

  private mergeDeltas(delta: Delta, blob: Blob): Delta {
    if (delta1.type === "insert" && delta2.type === "insert") {
      return {
        type: "insert",
        pos: delta1.pos,
        ln: delta1.ln,
        data: (delta1.data || "") + (delta2.data || ""),
      };
    }

    if (delta1.type === "delete" && delta2.type === "delete") {
      return {
        type: "delete",
        pos: delta1.pos,
        ln: delta1.ln,
        steps: (delta1.steps || 0) + (delta2.steps || 0),
      };
    }

    // Fallback - should not reach here if canMergeDeltas works correctly
    logger.editor.warn("Merging incompatible deltas:", delta1, delta2);
    return delta2;
  }

  addDeltas(deltas: Delta[]) {
    deltas.forEach((delta) => {
      this.addDelta(delta);
    });
  }

  applyDeltas(deltas: Delta[]) {
    if (!this.editorInstance) {
      logger.editor.error("No editor instance available");
      return;
    }

    this.addDeltas(deltas);
    applyDeltasToEditor(this.editorInstance, deltas);
  }

  getCumulativeDeltas(): Delta[] {
    return [...this.cumulativeDeltas];
  }

  clearDeltas() {
    this.cumulativeDeltas = [];
    logger.editor.debug("Cleared all cumulative deltas");
  }

  getDeltaCount(): number {
    return this.cumulativeDeltas.length;
  }

  getLastDelta(): Delta | undefined {
    return this.cumulativeDeltas[this.cumulativeDeltas.length - 1];
  }
}

export const handleEditorChange = (value: string | undefined, event: any) => {
  logger.editor.debug("Editor content changed:", value);
  logger.editor.debug("Event:", event);
};
