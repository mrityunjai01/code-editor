import { editor } from "monaco-editor";
import { logger } from "../utils/logger";
import { TextSpan, Delta, DocModel, DeltaWithOffset } from "./types";

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

export const reversed_delta = (delta: DeltaWithOffset): DeltaWithOffset => {
  const { source_text, startLine, startCol } = delta;
  const span = getTextSpan(delta.text, startCol);
  return {
    startLine: startLine,
    startCol: startCol,
    endLine: startLine + span["linespan"],
    endCol: startCol + span["colspan"],
    source_text: delta.text,
    text: source_text,
    offset: 0,
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

  edits.forEach((edit) => {
    model.pushEditOperations([], [edit], (inverse_edit_operations) => {
      console.log("Inverse edit operations:", inverse_edit_operations);
      return null;
    });
  });
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

export const text_shift = (text: string): [number, number] => {
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

export const applyDelta = (doc: DocModel, delta: Delta): void => {
  const splitDelta = delta.text.split("\n");
  let n = doc.lines.length;

  if (
    delta.startLine < 1 ||
    delta.endLine < 1 ||
    delta.startCol < 1 ||
    delta.endCol < 1
  ) {
    throw new Error("Delta start or end line cannot be negative");
  }

  if (delta.startLine >= n || delta.endLine >= n) {
    const desiredLength = Math.max(delta.endLine, delta.startLine, n);
    doc.lines.push(...new Array(desiredLength - n).fill(""));
  }

  n = doc.lines.length;

  if (delta.startLine === delta.endLine && splitDelta.length === 1) {
    doc.lines[delta.startLine - 1] =
      doc.lines[delta.startLine - 1].slice(0, delta.startCol - 1) +
      splitDelta[0] +
      doc.lines[delta.startLine - 1].slice(delta.endCol - 1);
  } else if (delta.startLine === delta.endLine && splitDelta.length > 1) {
    const prefix = doc.lines[delta.startLine - 1].slice(0, delta.startCol - 1);
    const suffix = doc.lines[delta.startLine - 1].slice(delta.endCol - 1);
    doc.lines[delta.startLine - 1] = prefix + splitDelta[0];

    doc.lines.splice(
      delta.startLine,
      0,
      splitDelta[splitDelta.length - 1] + suffix,
    );

    for (let i = 1; i < splitDelta.length - 1; i++) {
      doc.lines.splice(delta.startLine - 1 + i, 0, splitDelta[i]);
    }
  } else if (delta.startLine < delta.endLine && splitDelta.length === 1) {
    doc.lines[delta.startLine - 1] =
      doc.lines[delta.startLine - 1].slice(0, delta.startCol - 1) +
      splitDelta[0] +
      doc.lines[delta.endLine - 1].slice(delta.endCol - 1);

    for (let i = delta.endLine - 1; i >= delta.startLine; i--) {
      doc.lines.splice(delta.startLine, 1);
    }
  } else if (splitDelta.length > 1 && delta.startLine < delta.endLine) {
    doc.lines[delta.startLine - 1] =
      doc.lines[delta.startLine - 1].slice(0, delta.startCol - 1) +
      splitDelta[0];

    doc.lines[delta.endLine - 1] =
      splitDelta[splitDelta.length - 1] +
      doc.lines[delta.endLine - 1].slice(delta.endCol - 1);

    if (splitDelta.length > 2) {
      const startIdx = Math.max(delta.startLine, 0);
      const endIdx = Math.min(delta.endLine - 1, n);
      doc.lines.splice(startIdx, endIdx - startIdx, ...splitDelta.slice(1, -1));
    }
  }
};

export const transformdelta = (
  source_delta: DeltaWithOffset,
  base_delta: Delta,
): DeltaWithOffset => {
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
    ) &&
    !(
      source_delta.startLine === source_delta.endLine &&
      source_delta.startCol === source_delta.endCol
    )
  ) {
    // source delta is before or equal to base delta
    let [delta_lines, last_row_len] = text_shift(base_delta.text);
    let base_end_line, base_end_col;
    base_end_line = base_delta.startLine + delta_lines;
    if (delta_lines === 0) {
      base_end_col = base_delta.startCol + last_row_len;
    } else {
      base_end_col = last_row_len + 1;
    }
    let delta_lines_prefix = base_delta.startLine - source_delta.startLine;
    let delta_col_prefix =
      delta_lines_prefix === 0
        ? base_delta.startCol - source_delta.startCol
        : base_delta.startCol - 1;
    // prefix index, is the index of source delta source_text after delta_lines_prefix newlines and after that delta_col_prefix places
    let prefix_index = 0;
    for (let i = 0; i < delta_lines_prefix; i++) {
      prefix_index = source_delta.source_text.indexOf("\n", prefix_index) + 1;
      if (prefix_index === -1) {
        console.error(
          "Error: prefix_index is -1, source_text might not have enough newlines",
          source_delta,
          source_delta.source_text,
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
      suffix_index = source_delta.source_text.indexOf("\n", suffix_index) + 1;
      if (suffix_index === -1) {
        console.error(
          "Error: suffix_index is -1, source_text might not have enough newlines",
          source_delta,
          source_delta.source_text,
          delta_lines_suffix,
          delta_col_suffix,
        );
      }
    }
    suffix_index += delta_col_suffix;

    let source_text =
      source_delta.source_text.slice(0, prefix_index) +
      base_delta.text +
      source_delta.source_text.slice(suffix_index);
    return {
      startLine: source_delta.startLine,
      startCol: source_delta.startCol,
      endLine: base_end_line + (source_delta.endLine - base_delta.endLine),
      endCol:
        source_delta.endLine === base_delta.endLine
          ? base_end_col + source_delta.endCol - base_delta.endCol
          : source_delta.endCol,
      text: source_delta.text,
      source_text: source_text,
      offset: 0,
    };
  } else if (
    compare_equal(
      base_delta.endLine,
      base_delta.endCol,
      source_delta.startLine,
      source_delta.startCol,
    )
  ) {
    // source delta is after base delta
    let [delta_lines, last_row_len] = text_shift(base_delta.text);
    let base_end_line, base_end_col;
    base_end_line = base_delta.startLine + delta_lines;
    if (delta_lines === 0) {
      base_end_col = base_delta.startCol + last_row_len;
    } else {
      base_end_col = last_row_len + 1;
    }

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
      source_text: source_delta.source_text,
      offset: 0,
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
      source_text: source_delta.source_text,
      offset: 0,
    };
  } else if (
    compare_strict(
      source_delta.startLine,
      source_delta.startCol,
      base_delta.endLine,
      base_delta.endCol,
    ) &&
    compare_equal(
      base_delta.endLine,
      base_delta.endCol,
      source_delta.endLine,
      source_delta.endCol,
    )
  ) {
    let delta_lines = base_delta.endLine - source_delta.startLine;
    let last_row_len =
      delta_lines === 0
        ? base_delta.endCol - source_delta.startCol
        : base_delta.endCol - 1;

    let prefix_index = 0;
    for (let i = 0; i < delta_lines; i++) {
      prefix_index = source_delta.source_text.indexOf("\n", prefix_index) + 1;
      if (prefix_index === -1) {
        console.error(
          "Error: prefix_index is -1, source_text might not have enough newlines",
          source_delta,
          source_delta.source_text,
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
      source_text: source_delta.source_text.slice(prefix_index),
      offset: 0,
    };
    return transformdelta(new_source_delta, base_delta);
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
    console.log(
      "I am tasked with finding the prefix index from source start ",
      source_delta.startLine,
      source_delta.startCol,
      " to base start ",
      base_delta.startLine,
      base_delta.startCol,
    );

    let prefix_index = 0;
    for (let i = 0; i < delta_lines; i++) {
      prefix_index = source_delta.source_text.indexOf("\n", prefix_index) + 1;
      if (prefix_index === -1) {
        console.error(
          "Error: prefix_index is -1, source_text might not have enough newlines",
          source_delta,
          source_delta.source_text,
          delta_lines,
        );
      }
    }
    prefix_index += last_row_len;
    console.log(
      "Prefix index is ",
      prefix_index,
      " for source delta ",
      source_delta,
      " and base delta ",
      base_delta,
    );

    let new_source_delta = {
      startLine: source_delta.startLine,
      startCol: source_delta.startCol,
      endLine: base_delta.startLine,
      endCol: base_delta.startCol,
      text: source_delta.text,
      source_text: source_delta.source_text.slice(0, prefix_index),
      offset: 0,
    };
    return transformdelta(new_source_delta, base_delta);
  }
};
