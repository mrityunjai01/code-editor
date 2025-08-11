import { editor } from "monaco-editor";

export interface Blob {
  type: "insert" | "delete" | "replace";
  pos: number;
  ln: number;
  data?: string;
  steps?: number;
}

export interface Delta {
  startLine: number;
  startCol: number;
  endLine: number;
  endCol: number;
  text: string;
}

// reversible delta
export interface rDelta {
  startLine: number;
  startCol: number;
  endLine: number;
  endCol: number;
  text: string;
  sourceText: string;
}

export interface TextSpan {
  linespan: number;
  colspan: number;
}

// if linespan is 0, then colspan is relative to the start of hte range
export const getTextSpan = (text: string): TextSpan => {
  const lastNewlineIndex = text.lastIndexOf("\n");
  const lastNewlineDistance =
    lastNewlineIndex !== -1 ? text.length - lastNewlineIndex - 1 : text.length;
  const newlineCount = (text.match(/\n/g) || []).length;
  return { linespan: newlineCount, colspan: lastNewlineDistance };
};

export const reverseDelta = (delta: rDelta): rDelta => {
  const { sourceText, startLine, startCol } = delta;
  const span = getTextSpan(sourceText);
  return {
    startLine: startLine,
    startCol: startCol,
    endLine: startLine + span["linespan"],
    endCol: startCol + span["colspan"],
    sourceText: delta.text,
    text: sourceText,
  };
};

export const applyDeltasToEditor = (
  editorInstance: editor.IStandaloneCodeEditor,
  deltas: Delta[],
) => {
  const model = editorInstance.getModel();
  if (!model) return;

  const edits: editor.IIdentifiedSingleEditOperation[] = deltas.map(
    ({ startLine, startCol, endLine, endCol, text }) => ({
      range: {
        startLineNumber: startLine,
        startColumn: startCol,
        endLineNumber: endLine,
        endColumn: endCol,
      },
      text: text,
    }),
  );

  model.pushEditOperations([], edits, () => null);
};

// we want to transform source rdelta to shift its form so it can be applied after base rdelta
export const transformRDelta = (
  source_delta: rDelta,
  base_delta: Delta,
): rDelta => {};
