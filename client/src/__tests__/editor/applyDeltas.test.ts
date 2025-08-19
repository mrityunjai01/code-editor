import { getTextSpan, transformdelta } from "../../editor/applyDeltas";
import { Delta, DeltaWithOffset } from "../../editor/types";

describe("Helper Functions", () => {
  describe("getTextSpan", () => {
    test("should calculate span for single line text", () => {
      const result = getTextSpan("hello", 1);
      expect(result).toEqual({ linespan: 0, colspan: 5 });
    });

    test("should calculate span for empty text", () => {
      const result = getTextSpan("", 1);
      expect(result).toEqual({ linespan: 0, colspan: 0 });
    });

    test("should calculate span for text with single newline", () => {
      const result = getTextSpan("hello\nworld", 1);
      expect(result).toEqual({ linespan: 1, colspan: 5 });
    });

    test("should calculate span for text with multiple newlines", () => {
      const result = getTextSpan("line1\nline2\nline3", 2);
      expect(result).toEqual({ linespan: 2, colspan: 4 });
    });

    test("should calculate span for text ending with newline", () => {
      const result = getTextSpan("hello\n", 1);
      expect(result).toEqual({ linespan: 1, colspan: 0 });
    });

    test("should calculate span for text ending with newline", () => {
      const result = getTextSpan("hello\nh", 1);
      expect(result).toEqual({ linespan: 1, colspan: 1 });
    });
    test("should calculate span for text with only newlines", () => {
      const result = getTextSpan("\n\n\n", 1);
      expect(result).toEqual({ linespan: 3, colspan: 0 });
    });
  });

  describe("transformdelta", () => {
    test("case1: short + shortend, base delta contained inside source delta", () => {
      const sourceDelta: DeltaWithOffset = {
        startLine: 1,
        startCol: 1,
        endLine: 1,
        endCol: 6,
        text: "jungle",
        source_text: "world",
        offset: 0,
      };
      const baseDelta: Delta = {
        startLine: 1,
        startCol: 2,
        endLine: 1,
        endCol: 3,
        text: "XX",
      };
      const result = transformdelta(sourceDelta, baseDelta);
      expect(result).toEqual({
        startLine: 1,
        startCol: 1,
        endLine: 1,
        endCol: 7,
        text: "jungle",
        source_text: "wXXrld",
        offset: 0,
      });
    });

    test("case1: long + shortend, base delta contained inside source delta", () => {
      const sourceDelta: DeltaWithOffset = {
        startLine: 1,
        startCol: 1,
        endLine: 2,
        endCol: 6,
        text: "jungle",
        source_text: "wi\nworldo",
        offset: 0,
      };
      const baseDelta: Delta = {
        startLine: 1,
        startCol: 2,
        endLine: 1,
        endCol: 3,
        text: "XX",
      };
      const result = transformdelta(sourceDelta, baseDelta);
      expect(result).toEqual({
        startLine: 1,
        startCol: 1,
        endLine: 2,
        endCol: 6,
        text: "jungle",
        source_text: "wXX\nworldo",
        offset: 0,
      });
    });

    test("case1: long + longend, base delta contained inside source delta", () => {
      const sourceDelta: DeltaWithOffset = {
        startLine: 1,
        startCol: 3,
        endLine: 3,
        endCol: 7,
        text: "jungle\nchicken\nchicken",
        // source_text: "helpmore\nhelpmore\nhelpmore",
        source_text: "lpmore\nhelpmore\nhelpmo",
        offset: 0,
      };
      const baseDelta: Delta = {
        startLine: 1,
        startCol: 6,
        endLine: 2,
        endCol: 3,
        text: "X\nX",
      };
      const result = transformdelta(sourceDelta, baseDelta);
      expect(result).toEqual({
        startLine: 1,
        startCol: 3,
        endLine: 3,
        endCol: 7,
        text: "jungle\nchicken\nchicken",
        source_text: "lpmX\nXlpmore\nhelpmo",
        offset: 0,
      });
    });

    test("case1: long + longend, base delta contained inside source delta", () => {
      const sourceDelta: DeltaWithOffset = {
        startLine: 1,
        startCol: 3,
        endLine: 3,
        endCol: 7,
        text: "jungle\nchicken\nchicken",
        source_text: "lpmore\nhelpmore\nhelpmo",
        offset: 0,
      };
      const baseDelta: Delta = {
        startLine: 1,
        startCol: 6,
        endLine: 2,
        endCol: 3,
        text: "XX",
      };
      const result = transformdelta(sourceDelta, baseDelta);
      expect(result).toEqual({
        startLine: 1,
        startCol: 3,
        endLine: 2,
        endCol: 7,
        text: "jungle\nchicken\nchicken",
        source_text: "lpmXXlpmore\nhelpmo",
        offset: 0,
      });
    });

    test("case2: long + shortend, base before source", () => {
      const base: Delta = {
        startLine: 1,
        startCol: 7,
        endLine: 2,
        endCol: 2,
        text: "\ncc",
      };
      const source: DeltaWithOffset = {
        startLine: 2,
        startCol: 5,
        endLine: 2,
        endCol: 7,
        text: "",
        source_text: "ke",
        offset: 0,
      };
      const result = transformdelta(source, base);
      expect(result).toEqual({
        startLine: 2,
        startCol: 6,
        endLine: 2,
        endCol: 8,
        text: "",
        source_text: "ke",
        offset: 0,
      });
    });

    test("base before source short end", () => {
      const base: Delta = {
        startLine: 1,
        startCol: 7,
        endLine: 2,
        endCol: 2,
        text: "d\ncc",
      };
      const source: DeltaWithOffset = {
        startLine: 2,
        startCol: 5,
        endLine: 2,
        endCol: 7,
        text: "ke",
        source_text: "",
        offset: 0,
      };
      const result = transformdelta(source, base);
      expect(result).toEqual({
        startLine: 2,
        startCol: 6,
        endLine: 2,
        endCol: 8,
        text: "ke",
        source_text: "",
        offset: 0,
      });
    });

    test("base before source long end", () => {
      const base: Delta = {
        startLine: 1,
        startCol: 7,
        endLine: 2,
        endCol: 2,
        text: "d\ncc",
      };
      const source: DeltaWithOffset = {
        startLine: 3,
        startCol: 5,
        endLine: 3,
        endCol: 7,
        text: "ke",
        source_text: "",
        offset: 0,
      };
      const result = transformdelta(source, base);
      expect(result).toEqual({
        startLine: 3,
        startCol: 5,
        endLine: 3,
        endCol: 7,
        text: "ke",
        source_text: "",
        offset: 0,
      });
    });
    test("base before source short end compression", () => {
      const base: Delta = {
        startLine: 1,
        startCol: 7,
        endLine: 2,
        endCol: 2,
        text: "cc",
      };
      const source: DeltaWithOffset = {
        startLine: 2,
        startCol: 5,
        endLine: 2,
        endCol: 7,
        text: "",
        source_text: "ke",
        offset: 0,
      };
      const result = transformdelta(source, base);
      expect(result).toEqual({
        startLine: 1,
        startCol: 12,
        endLine: 1,
        endCol: 14,
        text: "",
        source_text: "ke",
        offset: 0,
      });
    });

    test("base before source short end compression with overlap", () => {
      const base: Delta = {
        startLine: 1,
        startCol: 7,
        endLine: 2,
        endCol: 6,
        text: "cc",
      };
      const source: DeltaWithOffset = {
        startLine: 2,
        startCol: 5,
        endLine: 2,
        endCol: 7,
        text: "",
        source_text: "ke",
        offset: 0,
      };
      const result = transformdelta(source, base);
      expect(result).toEqual({
        startLine: 1,
        startCol: 9,
        endLine: 1,
        endCol: 10,
        text: "",
        source_text: "e",
        offset: 0,
      });
    });

    test("base after source short end  with overlap", () => {
      const base: Delta = {
        startLine: 1,
        startCol: 7,
        endLine: 1,
        endCol: 12,
        text: "cc",
      };
      const source: DeltaWithOffset = {
        startLine: 1,
        startCol: 4,
        endLine: 1,
        endCol: 8,
        text: "",
        source_text: "kite",
        offset: 0,
      };
      const result = transformdelta(source, base);
      expect(result).toEqual({
        startLine: 1,
        startCol: 4,
        endLine: 1,
        endCol: 7,
        text: "",
        source_text: "kit",
        offset: 0,
      });
    });

    // describe("text_shift", () => {
    //   test("should return [0, 0] for empty text", () => {
    //     const result = eval(`
    //       const text_shift = (text) => {
    //         if (text.length === 0) {
    //           return [0, 0];
    //         }
    //         const lines = text.split("\\n");
    //         if (lines.length === 1) {
    //           return [0, text.length];
    //         }
    //         return [
    //           lines.length - 1,
    //           lines[lines.length - 1].length
    //         ];
    //       };
    //       text_shift("");
    //     `);
    //     expect(result).toEqual([0, 0]);
    //   });
    //
    //   test("should return [0, length] for single line text", () => {
    //     const result = eval(`
    //       const text_shift = (text) => {
    //         if (text.length === 0) {
    //           return [0, 0];
    //         }
    //         const lines = text.split("\\n");
    //         if (lines.length === 1) {
    //           return [0, text.length];
    //         }
    //         return [
    //           lines.length - 1,
    //           lines[lines.length - 1].length
    //         ];
    //       };
    //       text_shift("hello");
    //     `);
    //     expect(result).toEqual([0, 5]);
    //   });
    //
    //   test("should return correct shift for multi-line text", () => {
    //     const result = eval(`
    //       const text_shift = (text) => {
    //         if (text.length === 0) {
    //           return [0, 0];
    //         }
    //         const lines = text.split("\\n");
    //         if (lines.length === 1) {
    //           return [0, text.length];
    //         }
    //         return [
    //           lines.length - 1,
    //           lines[lines.length - 1].length
    //         ];
    //       };
    //       text_shift("line1\\nline2\\nline3");
    //     `);
    //     expect(result).toEqual([2, 5]);
    //   });
    // });

    // describe("compare_equal", () => {
    //   test("should return true when first position is before second", () => {
    //     const result = eval(`
    //       const compare_equal = (l1, c1, l2, c2) => {
    //         if (l1 < l2) return true;
    //         if (l1 > l2) return false;
    //         return c1 <= c2;
    //       };
    //       compare_equal(1, 5, 2, 3);
    //     `);
    //     expect(result).toBe(true);
    //   });
    //
    //   test("should return false when first position is after second", () => {
    //     const result = eval(`
    //       const compare_equal = (l1, c1, l2, c2) => {
    //         if (l1 < l2) return true;
    //         if (l1 > l2) return false;
    //         return c1 <= c2;
    //       };
    //       compare_equal(2, 3, 1, 5);
    //     `);
    //     expect(result).toBe(false);
    //   });
    //
    //   test("should return true when positions are equal", () => {
    //     const result = eval(`
    //       const compare_equal = (l1, c1, l2, c2) => {
    //         if (l1 < l2) return true;
    //         if (l1 > l2) return false;
    //         return c1 <= c2;
    //       };
    //       compare_equal(1, 5, 1, 5);
    //     `);
    //     expect(result).toBe(true);
    //   });
    //
    //   test("should return true when on same line and first column is before second", () => {
    //     const result = eval(`
    //       const compare_equal = (l1, c1, l2, c2) => {
    //         if (l1 < l2) return true;
    //         if (l1 > l2) return false;
    //         return c1 <= c2;
    //       };
    //       compare_equal(1, 3, 1, 5);
    //     `);
    //     expect(result).toBe(true);
    //   });
    // });

    // describe("compare_strict", () => {
    //   test("should return false when positions are equal", () => {
    //     const result = eval(`
    //       const compare_strict = (l1, c1, l2, c2) => {
    //         if (l1 < l2) return true;
    //         if (l1 > l2) return false;
    //         return c1 < c2;
    //       };
    //       compare_strict(1, 5, 1, 5);
    //     `);
    //     expect(result).toBe(false);
    //   });
    //
    //   test("should return true when first position is strictly before second", () => {
    //     const result = eval(`
    //       const compare_strict = (l1, c1, l2, c2) => {
    //         if (l1 < l2) return true;
    //         if (l1 > l2) return false;
    //         return c1 < c2;
    //       };
    //       compare_strict(1, 3, 1, 5);
    //     `);
    //     expect(result).toBe(true);
    //   });
    // });
    // });

    // describe("transformRDelta", () => {
    // describe("Case 1: Source delta before or overlapping with base delta", () => {
    //   test("should transform simple text insertion before base delta", () => {
    //     const sourceDelta: rDelta = {
    //       startLine: 0,
    //       startCol: 0,
    //       endLine: 0,
    //       endCol: 5,
    //       text: "NEW ",
    //       sourceText: "hello",
    //     };
    //
    //     const baseDelta: Delta = {
    //       startLine: 0,
    //       startCol: 2,
    //       endLine: 0,
    //       endCol: 4,
    //       text: "XX",
    //     };
    //
    //     const result = transformRDelta(sourceDelta, baseDelta);
    //
    //     expect(result).toEqual({
    //       startLine: 0,
    //       startCol: 0,
    //       endLine: 0,
    //       endCol: 6,
    //       text: "NEW ",
    //       sourceText: "heXXo",
    //     });
    //   });
    //
    //   test("should transform multi-line text insertion", () => {
    //     const sourceDelta: rDelta = {
    //       startLine: 0,
    //       startCol: 0,
    //       endLine: 1,
    //       endCol: 5,
    //       text: "line1\nline2",
    //       sourceText: "old\ntext",
    //     };
    //
    //     const baseDelta: Delta = {
    //       startLine: 0,
    //       startCol: 1,
    //       endLine: 0,
    //       endCol: 2,
    //       text: "X",
    //     };
    //
    //     const result = transformRDelta(sourceDelta, baseDelta);
    //
    //     expect(result).toEqual({
    //       startLine: 0,
    //       startCol: 0,
    //       endLine: 1,
    //       endCol: 5,
    //       text: "line1\nline2",
    //       sourceText: "oXd\ntext",
    //     });
    //   });
    //
    //   test("should handle text replacement within source delta", () => {
    //     const sourceDelta: rDelta = {
    //       startLine: 0,
    //       startCol: 0,
    //       endLine: 0,
    //       endCol: 10,
    //       text: "REPLACED",
    //       sourceText: "0123456789",
    //     };
    //
    //     const baseDelta: Delta = {
    //       startLine: 0,
    //       startCol: 2,
    //       endLine: 0,
    //       endCol: 8,
    //       text: "NEW",
    //     };
    //
    //     const result = transformRDelta(sourceDelta, baseDelta);
    //
    //     expect(result).toEqual({
    //       startLine: 0,
    //       startCol: 0,
    //       endLine: 0,
    //       endCol: 7,
    //       text: "REPLACED",
    //       sourceText: "01NEW89",
    //     });
    //   });
    //
    //   test("should handle deletion (empty text) in base delta", () => {
    //     const sourceDelta: rDelta = {
    //       startLine: 0,
    //       startCol: 0,
    //       endLine: 0,
    //       endCol: 8,
    //       text: "NEWTEXT",
    //       sourceText: "original",
    //     };
    //
    //     const baseDelta: Delta = {
    //       startLine: 0,
    //       startCol: 2,
    //       endLine: 0,
    //       endCol: 6,
    //       text: "",
    //     };
    //
    //     const result = transformRDelta(sourceDelta, baseDelta);
    //
    //     expect(result).toEqual({
    //       startLine: 0,
    //       startCol: 0,
    //       endLine: 0,
    //       endCol: 4,
    //       text: "NEWTEXT",
    //       sourceText: "oral",
    //     });
    //   });
    //
    //   test("should handle multi-line base delta insertion", () => {
    //     const sourceDelta: rDelta = {
    //       startLine: 0,
    //       startCol: 0,
    //       endLine: 0,
    //       endCol: 5,
    //       text: "HELLO",
    //       sourceText: "world",
    //     };
    //
    //     const baseDelta: Delta = {
    //       startLine: 0,
    //       startCol: 2,
    //       endLine: 0,
    //       endCol: 3,
    //       text: "new\nline",
    //     };
    //
    //     const result = transformRDelta(sourceDelta, baseDelta);
    //
    //     expect(result).toEqual({
    //       startLine: 0,
    //       startCol: 0,
    //       endLine: 1,
    //       endCol: 6,
    //       text: "HELLO",
    //       sourceText: "wonew\nlineld",
    //     });
    //   });
    // });
    // describe("Case 2: Source delta after base delta", () => {
    //   test("should return unchanged delta when source is completely after base", () => {
    //     const sourceDelta: rDelta = {
    //       startLine: 2,
    //       startCol: 0,
    //       endLine: 2,
    //       endCol: 5,
    //       text: "HELLO",
    //       sourceText: "world",
    //     };
    //
    //     const baseDelta: Delta = {
    //       startLine: 0,
    //       startCol: 0,
    //       endLine: 1,
    //       endCol: 0,
    //       text: "new\n",
    //     };
    //
    //     const result = transformRDelta(sourceDelta, baseDelta);
    //
    //     expect(result).toEqual({
    //       startLine: 2,
    //       startCol: 0,
    //       endLine: 2,
    //       endCol: 5,
    //       text: "HELLO",
    //       sourceText: "world",
    //     });
    //   });
    //
    //   test("should return unchanged delta when source ends exactly where base starts", () => {
    //     const sourceDelta: rDelta = {
    //       startLine: 0,
    //       startCol: 0,
    //       endLine: 0,
    //       endCol: 5,
    //       text: "HELLO",
    //       sourceText: "world",
    //     };
    //
    //     const baseDelta: Delta = {
    //       startLine: 0,
    //       startCol: 5,
    //       endLine: 0,
    //       endCol: 8,
    //       text: "NEW",
    //     };
    //
    //     const result = transformRDelta(sourceDelta, baseDelta);
    //
    //     expect(result).toEqual({
    //       startLine: 0,
    //       startCol: 0,
    //       endLine: 0,
    //       endCol: 5,
    //       text: "HELLO",
    //       sourceText: "world",
    //     });
    //   });
    // });
    // describe("Edge Cases", () => {
    //   test("should handle zero-length source text", () => {
    //     const sourceDelta: rDelta = {
    //       startLine: 0,
    //       startCol: 5,
    //       endLine: 0,
    //       endCol: 5,
    //       text: "INSERT",
    //       sourceText: "",
    //     };
    //
    //     const baseDelta: Delta = {
    //       startLine: 0,
    //       startCol: 2,
    //       endLine: 0,
    //       endCol: 4,
    //       text: "XX",
    //     };
    //
    //     const result = transformRDelta(sourceDelta, baseDelta);
    //
    //     expect(result).toEqual({
    //       startLine: 0,
    //       startCol: 5,
    //       endLine: 0,
    //       endCol: 7,
    //       text: "INSERT",
    //       sourceText: "XX",
    //     });
    //   });
    //
    //   test("should handle zero-length base text", () => {
    //     const sourceDelta: rDelta = {
    //       startLine: 0,
    //       startCol: 0,
    //       endLine: 0,
    //       endCol: 5,
    //       text: "HELLO",
    //       sourceText: "world",
    //     };
    //
    //     const baseDelta: Delta = {
    //       startLine: 0,
    //       startCol: 2,
    //       endLine: 0,
    //       endCol: 2,
    //       text: "",
    //     };
    //
    //     const result = transformRDelta(sourceDelta, baseDelta);
    //
    //     expect(result).toEqual({
    //       startLine: 0,
    //       startCol: 0,
    //       endLine: 0,
    //       endCol: 5,
    //       text: "HELLO",
    //       sourceText: "world",
    //     });
    //   });
    //
    //   test("should handle identical start and end positions", () => {
    //     const sourceDelta: rDelta = {
    //       startLine: 1,
    //       startCol: 3,
    //       endLine: 1,
    //       endCol: 3,
    //       text: "INSERT",
    //       sourceText: "",
    //     };
    //
    //     const baseDelta: Delta = {
    //       startLine: 1,
    //       startCol: 3,
    //       endLine: 1,
    //       endCol: 3,
    //       text: "BASE",
    //     };
    //
    //     const result = transformRDelta(sourceDelta, baseDelta);
    //
    //     expect(result).toEqual({
    //       startLine: 1,
    //       startCol: 3,
    //       endLine: 1,
    //       endCol: 7,
    //       text: "INSERT",
    //       sourceText: "BASE",
    //     });
    //   });
    // });
    // describe("Complex Multi-line Scenarios", () => {
    //   test("should handle multi-line source with multi-line base delta", () => {
    //     const sourceDelta: rDelta = {
    //       startLine: 0,
    //       startCol: 0,
    //       endLine: 2,
    //       endCol: 5,
    //       text: "new\nmulti\nline",
    //       sourceText: "old\noriginal\ntext",
    //     };
    //
    //     const baseDelta: Delta = {
    //       startLine: 1,
    //       startCol: 2,
    //       endLine: 1,
    //       endCol: 6,
    //       text: "CHANGE",
    //     };
    //
    //     const result = transformRDelta(sourceDelta, baseDelta);
    //
    //     expect(result).toEqual({
    //       startLine: 0,
    //       startCol: 0,
    //       endLine: 2,
    //       endCol: 7,
    //       text: "new\nmulti\nline",
    //       sourceText: "old\norCHANGEnal\ntext",
    //     });
    //   });
    //
    //   test("should handle base delta spanning multiple lines within source", () => {
    //     const sourceDelta: rDelta = {
    //       startLine: 0,
    //       startCol: 0,
    //       endLine: 3,
    //       endCol: 4,
    //       text: "completely\nreplaced\ncontent\nhere",
    //       sourceText: "line1\nline2\nline3\nline4",
    //     };
    //
    //     const baseDelta: Delta = {
    //       startLine: 1,
    //       startCol: 2,
    //       endLine: 2,
    //       endCol: 3,
    //       text: "REPLACED",
    //     };
    //
    //     const result = transformRDelta(sourceDelta, baseDelta);
    //
    //     expect(result).toEqual({
    //       startLine: 0,
    //       startCol: 0,
    //       endLine: 2,
    //       endCol: 6,
    //       text: "completely\nreplaced\ncontent\nhere",
    //       sourceText: "line1\nliREPLACEDne3\nline4",
    //     });
    //   });
  });
});
