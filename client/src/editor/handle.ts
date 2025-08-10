import { editor } from "monaco-editor";
import { Delta, applyDeltasToEditor } from "./applyDeltas";

export class EditorChangeHandler {
  private cumulativeDeltas: Delta[] = [];
  private editorInstance: editor.IStandaloneCodeEditor | null = null;

  constructor(editorInstance?: editor.IStandaloneCodeEditor) {
    if (editorInstance) {
      this.editorInstance = editorInstance;
    }
  }

  setEditor(editorInstance: editor.IStandaloneCodeEditor) {
    this.editorInstance = editorInstance;
  }

  addDelta(delta: Delta) {
    this.cumulativeDeltas.push(delta);
    console.log("Added delta:", delta);
    console.log("Total deltas:", this.cumulativeDeltas.length);
  }

  addDeltas(deltas: Delta[]) {
    this.cumulativeDeltas.push(...deltas);
    console.log("Added deltas:", deltas);
    console.log("Total deltas:", this.cumulativeDeltas.length);
  }

  applyDelta(delta: Delta) {
    if (!this.editorInstance) {
      console.error("No editor instance available");
      return;
    }
    
    this.addDelta(delta);
    applyDeltasToEditor(this.editorInstance, [delta]);
  }

  applyDeltas(deltas: Delta[]) {
    if (!this.editorInstance) {
      console.error("No editor instance available");
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
    console.log("Cleared all cumulative deltas");
  }

  getDeltaCount(): number {
    return this.cumulativeDeltas.length;
  }

  getLastDelta(): Delta | undefined {
    return this.cumulativeDeltas[this.cumulativeDeltas.length - 1];
  }
}

export const handleEditorChange = (value: string | undefined, event: any) => {
  console.log("Editor content changed:", value);
  console.log("Event:", event);
};
