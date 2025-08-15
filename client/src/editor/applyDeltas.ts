import { editor } from "monaco-editor";

export interface PreDelta {
  type: "insert" | "delete" | "replace";
  pos: number;
  ln: number;
  data: string;
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
export const getTextSpan = (text: string, start_col: number): TextSpan => {
  const lastNewlineIndex = text.lastIndexOf("\n");
  const lastNewlineDistance =
    lastNewlineIndex !== -1
      ? text.length - lastNewlineIndex - start_col
      : text.length;
  const newlineCount = (text.match(/\n/g) || []).length;
  return { linespan: newlineCount, colspan: lastNewlineDistance };
};

export const reverseDelta = (delta: rDelta): rDelta => {
  const { sourceText, startLine, startCol } = delta;
  const span = getTextSpan(delta.text, startCol);
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
const compare_equal = (
  l1: number,
  c1: number,
  l2: number,
  c2: number,
): boolean => {
  // funciton which returns true if l1,c1 is before or equal to l2,c2
  //
  if (l1 < l2) return true;
  if (l1 > l2) return false;
  return c1 <= c2;
};

const compare_strict = (
  l1: number,
  c1: number,
  l2: number,
  c2: number,
): boolean => {
  if (l1 < l2) return true;
  if (l1 > l2) return false;
  return c1 < c2;
};

const text_shift = (text: string): [number, number] => {
  // split text by newlines, then find the number of newlines and the length of the last row of text
  if (text.length === 0) {
    return [0, 0];
  }
  const lines = text.split("\n");
  if (lines.length === 1) {
    return [0, text.length];
  }
  return [
    lines.length - 1, // number of newlines
    lines[lines.length - 1].length,
  ];
};

export const transformRDelta = (
  source_delta: rDelta,
  base_delta: Delta,
): rDelta => {
  console.log("at hte entrypint");
  if (
    compare_equal(
      source_delta.startLine,
      source_delta.startCol,
      base_delta.startLine,
      base_delta.startCol,
    ) &&
    compare_equal(
      base_delta.endLine,
      base_delta.endCol,
      source_delta.endLine,
      source_delta.endCol,
    )
  ) {
    // source delta is before or equal to base delta
    console.log("not the right entrypoint");
    let [delta_lines, last_row_len] = text_shift(base_delta.text);
    let base_end_line, base_end_col;
    base_end_line = base_delta.startLine + delta_lines;
    if (delta_lines === 0) {
      base_end_col = base_delta.startCol + last_row_len;
    } else {
      base_end_col = last_row_len + 1;
    }
    console.log("base_end_line, base_end_col", base_end_line, base_end_col);

    let delta_lines_prefix = base_delta.startLine - source_delta.startLine;
    let delta_col_prefix =
      delta_lines_prefix === 0
        ? base_delta.startCol - source_delta.startCol
        : base_delta.startCol - 1;
    // prefix index, is the index of source delta source_text after delta_lines_prefix newlines and after that delta_col_prefix places
    let prefix_index = 0;
    for (let i = 0; i < delta_lines_prefix; i++) {
      prefix_index = source_delta.sourceText.indexOf("\n", prefix_index) + 1;
      if (prefix_index === -1) {
        console.error(
          "Error: prefix_index is -1, sourceText might not have enough newlines",
          source_delta,
          source_delta.sourceText,
          delta_lines_prefix,
          delta_col_prefix,
        );
      }
    }
    prefix_index += delta_col_prefix;

    let delta_lines_suffix = base_delta.endLine - source_delta.startLine;
    let delta_col_suffix =
      delta_lines_suffix === 0
        ? base_delta.endCol - source_delta.startCol
        : base_delta.endCol - 1;
    let suffix_index = 0;
    for (let i = 0; i < delta_lines_suffix; i++) {
      suffix_index = source_delta.sourceText.indexOf("\n", suffix_index) + 1;
      if (suffix_index === -1) {
        console.error(
          "Error: suffix_index is -1, sourceText might not have enough newlines",
          source_delta,
          source_delta.sourceText,
          delta_lines_suffix,
          delta_col_suffix,
        );
      }
    }
    suffix_index += delta_col_suffix;

    let source_text =
      source_delta.sourceText.slice(0, prefix_index) +
      base_delta.text +
      source_delta.sourceText.slice(suffix_index);
    console.log("source_delta sourcetext = ", source_delta.sourceText);
    console.log("prefix index = ", prefix_index);
    console.log(
      "source_delta sourcetext prefix = ",
      source_delta.sourceText.slice(0, prefix_index),
    );
    console.log("base_delta text = ", base_delta.text);
    console.log("suffix_index = ", suffix_index);
    console.log(
      "source_delta sourcetext suffix = ",
      source_delta.sourceText.slice(suffix_index),
    );
    console.log("source_text", source_text);

    return {
      startLine: source_delta.startLine,
      startCol: source_delta.startCol,
      endLine: base_end_line + (source_delta.endLine - base_delta.endLine),
      endCol:
        source_delta.endLine === base_delta.endLine
          ? base_end_col + source_delta.endCol - base_delta.endCol
          : source_delta.endCol,
      text: source_delta.text,
      sourceText: source_text,
    };
  } else if (
    compare_equal(
      source_delta.endLine,
      source_delta.endCol,
      base_delta.startLine,
      base_delta.startCol,
    )
  ) {
    return {
      startLine: source_delta.startLine,
      startCol: source_delta.startCol,
      endLine: source_delta.endLine,
      endCol: source_delta.endCol,
      text: source_delta.text,
      sourceText: source_delta.sourceText,
    };
  } else if (
    compare_equal(
      base_delta.endLine,
      base_delta.endCol,
      source_delta.startLine,
      source_delta.startCol,
    )
  ) {
    console.log("base before source");
    // source delta is after base delta
    let [delta_lines, last_row_len] = text_shift(base_delta.text);
    let base_end_line, base_end_col;
    base_end_line = base_delta.startLine + delta_lines;
    if (delta_lines === 0) {
      base_end_col = base_delta.startCol + last_row_len;
    } else {
      base_end_col = last_row_len + 1;
    }
    console.log("base_end_line, base_end_col", base_end_line, base_end_col);

    return {
      startLine: base_end_line + (source_delta.startLine - base_delta.endLine),
      startCol:
        base_delta.endLine == source_delta.startLine
          ? base_end_col + source_delta.startCol - base_delta.endCol
          : source_delta.startCol,
      endLine: base_end_line + (source_delta.endLine - base_delta.endLine),
      endCol:
        base_delta.endLine == source_delta.endLine
          ? base_end_col + source_delta.endCol - base_delta.endCol
          : source_delta.endCol,
      text: source_delta.text,
      sourceText: source_delta.sourceText,
    };
  } else if (
    compare_strict(
      source_delta.startLine,
      source_delta.startCol,
      base_delta.endLine,
      base_delta.endCol,
    )
  ) {
    let delta_lines = base_delta.endLine - source_delta.startLine;
    let last_row_len =
      delta_lines === 0
        ? base_delta.endCol - source_delta.startCol
        : base_delta.endCol - 1;

    let prefix_index = 0;
    for (let i = 0; i < delta_lines; i++) {
      prefix_index = source_delta.sourceText.indexOf("\n", prefix_index) + 1;
      if (prefix_index === -1) {
        console.error(
          "Error: prefix_index is -1, sourceText might not have enough newlines",
          source_delta,
          source_delta.sourceText,
          delta_lines,
        );
      }
    }
    prefix_index += last_row_len;

    let new_source_delta = {
      startLine: base_delta.endLine,
      startCol: base_delta.endCol,
      endLine: source_delta.endLine,
      endCol: source_delta.endCol,
      text: source_delta.text,
      sourceText: source_delta.sourceText.slice(prefix_index),
    };
    return transformRDelta(new_source_delta, base_delta);
  } else {
    console.assert(
      compare_strict(
        base_delta.startLine,
        base_delta.startCol,
        source_delta.endLine,
        source_delta.endCol,
      ),
    );

    let delta_lines = base_delta.startLine - source_delta.startLine;
    let last_row_len =
      delta_lines === 0
        ? base_delta.startCol - source_delta.startCol
        : base_delta.startCol - 1;

    let suffix_index = 0;

    let new_source_delta = {
      startLine: source_delta.startLine,
      startCol: source_delta.startCol,
      endLine: base_delta.startLine,
      endCol: base_delta.startCol,
      text: source_delta.text,
      sourceText: source_delta.sourceText.slice(0, suffix_index),
    };
    return transformRDelta(new_source_delta, base_delta);
  }
};
