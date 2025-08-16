import { editor } from "monaco-editor";
import { Delta, DeltaWithOffset, applyDeltasToEditor } from "./applyDeltas";
import { logger } from "../utils/logger";

export class EditorChangeHandler {
  private cumulativeDeltas: DeltaWithOffset[] = [];
  private editorInstance: editor.IStandaloneCodeEditor | null = null;
  private onChangesCallback?: (deltas: Delta[]) => void;
  private saved_state: editor.ICodeEditorViewState | null = null;
  private ignore_changes_count: number = 0;

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

  public get_deltas(): Delta[] {
    return this.cumulativeDeltas;
  }

  public set_callback(callback: (deltas: Delta[]) => void) {
    this.onChangesCallback = callback;
  }

  public save_state() {
    if (this.editorInstance) {
      this.saved_state = this.editorInstance.saveViewState();
      console.log("saved state:", this.saved_state);
    }
  }

  public restore_state(deltas: Delta[] = []) {
    if (this.editorInstance && this.saved_state) {
      this.editorInstance.restoreViewState(this.saved_state);
    }
  }

  public change_handler_flush() {
    if (this.editorInstance && this.onChangesCallback) {
      logger.editor.debug("Flushing changes:", this.cumulativeDeltas);
      this.onChangesCallback(
        this.cumulativeDeltas.map((delta) => {
          return {
            startLine: delta.startLine,
            startCol: delta.startCol,
            endLine: delta.endLine,
            endCol: delta.endCol,
            text: delta.text,
          };
        }),
      );

      this.cumulativeDeltas = [];
    }
  }

  private setupChangeListener() {
    if (!this.editorInstance || !this.onChangesCallback) return;

    this.editorInstance.onDidChangeModelContent((e) => {
      logger.editor.debug("model change content: ", e);
      logger.editor.debug(
        "model editor change count ",
        e.changes.length,
        " compared to ignore count",
        this.ignore_changes_count,
      );
      const deltas: DeltaWithOffset[] = e.changes
        .slice(this.ignore_changes_count)
        .map((change) => {
          logger.editor.debug("Change detected:", change);

          return {
            startLine: change.range.startLineNumber,
            startCol: change.range.startColumn,
            endLine: change.range.endLineNumber,
            endCol: change.range.endColumn,
            text: change.text,
            offset: change.rangeOffset,
          };
        });

      deltas.forEach((delta) => {
        this.add_change(delta);
      });

      this.ignore_changes_count = Math.max(
        0,
        this.ignore_changes_count - e.changes.length,
      );
    });
  }

  private add_change(delta: DeltaWithOffset) {
    console.log("Adding change:", delta);

    const lastDelta = this.cumulativeDeltas[this.cumulativeDeltas.length - 1];

    if (lastDelta) {
      const mergedDelta = this.mergeDeltas(lastDelta, delta);
      if (mergedDelta) {
        this.cumulativeDeltas[this.cumulativeDeltas.length - 1] = mergedDelta;
        logger.editor.debug("Merged delta:", mergedDelta);
      }
    } else {
      if (lastDelta) {
        logger.editor.debug("cant merge deltas:", lastDelta, delta);
      }
      console.log("cant merge, pushed ", delta);
      this.cumulativeDeltas.push(delta);
    }
  }

  private mergeDeltas(
    delta1: DeltaWithOffset,
    delta2: DeltaWithOffset,
  ): DeltaWithOffset | null {
    if (delta1.offset + delta1.text.length === delta2.offset) {
      return {
        startLine: delta1.startLine,
        startCol: delta1.startCol,
        endLine: delta1.endLine,
        endCol: delta1.endCol,
        text: delta1.text.concat(delta2.text),
        offset: delta1.offset,
      };
    }
    if (
      delta2.offset + delta2.text.length === delta1.offset &&
      delta2.text === "" &&
      delta1.text === ""
    ) {
      return {
        startLine: delta2.startLine,
        startCol: delta2.startCol,
        endLine: delta1.endLine,
        endCol: delta1.endCol,
        text: "",
        offset: delta2.offset,
      };
    }

    return null;
  }

  public applyDeltas(deltas: Delta[]) {
    if (!this.editorInstance) {
      logger.editor.error("No editor instance available");
      return;
    }
    this.ignore_changes_count = deltas.length;
    applyDeltasToEditor(this.editorInstance, deltas);
  }

  public first_message() {
    this.ignore_changes_count = 1;
  }
}
