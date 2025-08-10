import { editor } from "monaco-editor";

export interface Delta {
  type: "insert" | "delete" | "replace";
  pos: number;
  ln: number;
  data?: string;
  steps?: number;
}

export const applyDeltasToEditor = (
  editorInstance: editor.IStandaloneCodeEditor,
  deltas: Delta[],
) => {
  const model = editorInstance.getModel();
  if (!model) return;

  const edits: editor.IIdentifiedSingleEditOperation[] = deltas.map((delta) => {
    const { type, pos, ln, data = "", steps = 0 } = delta;

    switch (type) {
      case "insert":
        return {
          range: {
            startLineNumber: ln + 1,
            startColumn: pos + 1,
            endLineNumber: ln + 1,
            endColumn: pos + 1
          },
          text: data,
          forceMoveMarkers: true,
        };

      case "delete":
        return {
          range: {
            startLineNumber: ln + 1,
            startColumn: pos + 1,
            endLineNumber: ln + 1,
            endColumn: pos + 1 + steps
          },
          text: "",
          forceMoveMarkers: true,
        };

      case "replace":
        return {
          range: {
            startLineNumber: ln + 1,
            startColumn: pos + 1,
            endLineNumber: ln + 1,
            endColumn: pos + 1 + steps
          },
          text: data,
          forceMoveMarkers: true,
        };

      default:
        throw new Error(`Unsupported delta type: ${type}`);
    }
  });

  model.pushEditOperations([], edits, () => null);
};

export const applyDeltaToText = (text: string, delta: Delta): string => {
  const lines = text.split("\n");
  const { type, pos, ln, data = "", steps = 0 } = delta;

  if (ln >= lines.length) return text;

  const line = lines[ln];

  switch (type) {
    case "insert":
      lines[ln] = line.slice(0, pos) + data + line.slice(pos);
      break;

    case "delete":
      lines[ln] = line.slice(0, pos) + line.slice(pos + steps);
      break;

    case "replace":
      lines[ln] = line.slice(0, pos) + data + line.slice(pos + steps);
      break;

    default:
      throw new Error(`Unsupported delta type: ${type}`);
  }

  return lines.join("\n");
};

