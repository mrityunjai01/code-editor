import { editor } from "monaco-editor";
import { Delta, PreDelta, applyDeltasToEditor, rDelta } from "./applyDeltas";
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

  add_change(predelta: PreDelta) {
    const lastDelta = this.cumulativeDeltas[this.cumulativeDeltas.length - 1];

    // Try to merge with the last delta if they're compatible
    if (lastDelta && this.canMergeDeltas(lastDelta, predelta)) {
      const mergedDelta = this.mergeDeltas(lastDelta, predelta);
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
      this.cumulativeDeltas.push(predelta_to_delta(predelta));
    }
  }

  private canMergeDeltas(delta: Delta, predelta: PreDelta): boolean {
    if (delta1.ln !== delta2.ln || delta2.type == "replace") return false;

    if (delta1.type === "insert" && delta2.type === "insert") {
      return delta2.pos === delta1.pos + (delta1.data?.length || 0);
    }

    if (delta1.type === "delete" && delta2.type === "delete") {
      return delta1.pos === delta2.pos + (delta1.steps || 0);
    }

    return false;
  }

  private mergeDeltas(delta: Delta, predelta: PreDelta): Delta {
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

function predelta_to_rdelta(predelta: PreDelta): rDelta {
  if (predelta.type === "insert") {
    const n_lines = (predelta.data || "").split("\n").length;
    const last_col =
      n_lines == 0
        ? predelta.pos + predelta.data.length
        : predelta.data.length - predelta.data?.lastIndexOf("\n") || 0;

    return {
      startLine: predelta.ln,
      startCol: predelta.pos,
      endLine: predelta.ln,
      endCol: predelta.pos + (predelta.data?.length || 0),
      text: predelta.data || "",
      sourceText: "",
    };
  } else if (predelta.type === "delete") {
    const n_lines = (predelta.data || "").split("\n").length;
    const last_col =
      n_lines == 0
        ? predelta.pos + predelta.data.length
        : predelta.data.length - predelta.data?.lastIndexOf("\n") || 0;
    return {
      startLine: predelta.ln,
      startCol: predelta.pos,
      endLine: predelta.ln,
      endCol: predelta.pos + last_col,
      text: "",
      sourceText: predelta.data || "",
    };
  } else if (predelta.type === "replace") {
    return {
      startLine: predelta.ln,
      startCol: predelta.pos,
      endLine: predelta.ln,
      endCol: predelta.pos + (predelta.data?.length || 0),
      text: predelta.data || "",
      sourceText: predelta.data || "",
    };
  }
}
