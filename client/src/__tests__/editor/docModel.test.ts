import { applyDelta } from "../../editor/applyDeltas";
import { DocModel, Delta } from "../../editor/types";

describe("Document Model and applyDelta", () => {
  let doc: DocModel;

  beforeEach(() => {
    doc = { lines: ["hello world", "second line", "third line"] };
  });

  describe("Single line, single text insertion", () => {
    test("should insert text at the beginning of a line", () => {
      const delta: Delta = {
        startLine: 1,
        startCol: 1,
        endLine: 1,
        endCol: 1,
        text: "NEW ",
      };

      applyDelta(doc, delta);

      expect(doc.lines).toEqual([
        "NEW hello world",
        "second line",
        "third line",
      ]);
    });

    test("should insert text in the middle of a line", () => {
      const delta: Delta = {
        startLine: 1,
        startCol: 7,
        endLine: 1,
        endCol: 7,
        text: "beautiful ",
      };

      applyDelta(doc, delta);

      expect(doc.lines).toEqual([
        "hello beautiful world",
        "second line",
        "third line",
      ]);
    });

    test("should replace text within a line", () => {
      const delta: Delta = {
        startLine: 1,
        startCol: 1,
        endLine: 1,
        endCol: 6, // "hello"
        text: "hi",
      };

      applyDelta(doc, delta);

      expect(doc.lines).toEqual(["hi world", "second line", "third line"]);
    });
  });

  describe("Single line, multi-line text insertion", () => {
    test("should split line when inserting multi-line text", () => {
      const delta: Delta = {
        startLine: 1,
        startCol: 7, // after "hello "
        endLine: 1,
        endCol: 7,
        text: "new\nline\nhere ",
      };

      applyDelta(doc, delta);

      expect(doc.lines).toEqual([
        "hello new",
        "line",
        "here world",
        "second line",
        "third line",
      ]);
    });

    test("should replace text and insert multiple lines", () => {
      const delta: Delta = {
        startLine: 1,
        startCol: 7,
        endLine: 1,
        endCol: 12, // "world"
        text: "multi\nline\ntext",
      };

      applyDelta(doc, delta);

      expect(doc.lines).toEqual([
        "hello multi",
        "line",
        "text",
        "second line",
        "third line",
      ]);
    });
  });

  describe("Multi-line, single text replacement", () => {
    test("should replace across multiple lines with single line text", () => {
      const delta: Delta = {
        startLine: 1,
        startCol: 7,
        endLine: 2,
        endCol: 7, // from "world" to "second"
        text: "REPLACED",
      };

      applyDelta(doc, delta);

      expect(doc.lines).toEqual(["hello REPLACED line", "third line"]);
    });

    test("should delete text across multiple lines", () => {
      const delta: Delta = {
        startLine: 1,
        startCol: 7,
        endLine: 3,
        endCol: 6, // from "world" to "third"
        text: "",
      };

      applyDelta(doc, delta);

      expect(doc.lines).toEqual(["hello  line"]);
    });
  });

  describe("Multi-line, multi-line replacement", () => {
    test("should replace multiple lines with multiple lines", () => {
      const delta: Delta = {
        startLine: 1,
        startCol: 7,
        endLine: 2,
        endCol: 7,
        text: "NEW\nLINES\nHERE",
      };

      applyDelta(doc, delta);

      expect(doc.lines).toEqual([
        "hello NEW",
        "LINES",
        "HERE line",
        "third line",
      ]);
    });

    test("should handle complex multi-line replacement", () => {
      const delta: Delta = {
        startLine: 2,
        startCol: 1,
        endLine: 3,
        endCol: 6, // "third"
        text: "COMPLETELY\nNEW\nCONTENT",
      };

      applyDelta(doc, delta);

      expect(doc.lines).toEqual([
        "hello world",
        "COMPLETELY",
        "NEW",
        "CONTENT line",
      ]);
    });
  });

  describe("Edge cases", () => {
    test("should extend document when delta goes beyond existing lines", () => {
      const delta: Delta = {
        startLine: 5,
        startCol: 1,
        endLine: 5,
        endCol: 1,
        text: "new line",
      };

      applyDelta(doc, delta);

      expect(doc.lines).toEqual([
        "hello world",
        "second line",
        "third line",
        "",
        "new line",
      ]);
    });

    test("should handle empty document", () => {
      const emptyDoc: DocModel = { lines: [] };
      const delta: Delta = {
        startLine: 1,
        startCol: 1,
        endLine: 1,
        endCol: 1,
        text: "first line",
      };

      applyDelta(emptyDoc, delta);

      expect(emptyDoc.lines).toEqual(["first line"]);
    });

    test("should throw error for invalid positions", () => {
      const delta: Delta = {
        startLine: 0,
        startCol: 1,
        endLine: 1,
        endCol: 1,
        text: "invalid",
      };

      expect(() => applyDelta(doc, delta)).toThrow(
        "Delta start or end line cannot be negative",
      );
    });
  });

  describe("Real-world scenarios", () => {
    test("should handle typical typing scenario", () => {
      // User types "Hello " at the beginning
      const delta1: Delta = {
        startLine: 1,
        startCol: 1,
        endLine: 1,
        endCol: 1,
        text: "Hello ",
      };
      applyDelta(doc, delta1);

      // User presses Enter after "Hello"
      const delta2: Delta = {
        startLine: 1,
        startCol: 6,
        endLine: 1,
        endCol: 6,
        text: "\n",
      };
      applyDelta(doc, delta2);

      expect(doc.lines).toEqual([
        "Hello",
        " hello world",
        "second line",
        "third line",
      ]);
    });

    test("should handle backspace deletion", () => {
      // Delete "world" from first line
      const delta: Delta = {
        startLine: 1,
        startCol: 7,
        endLine: 1,
        endCol: 12,
        text: "",
      };

      applyDelta(doc, delta);

      expect(doc.lines).toEqual(["hello ", "second line", "third line"]);
    });
  });
});

