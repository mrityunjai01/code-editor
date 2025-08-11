import { EditorChangeHandler } from '../../editor/handle';
import { Blob } from '../../editor/applyDeltas';

// Mock the applyDeltas module
jest.mock('../../editor/applyDeltas', () => ({
  applyDeltasToEditor: jest.fn(),
}));

describe('EditorChangeHandler', () => {
  let handler: EditorChangeHandler;
  let mockCallback: jest.Mock;

  beforeEach(() => {
    mockCallback = jest.fn();
    handler = new EditorChangeHandler(undefined, mockCallback);
  });

  describe('Blob merging logic', () => {
    test('should merge consecutive inserts on same line', () => {
      const blob1: Blob = {
        type: 'insert',
        pos: 0,
        ln: 0,
        data: 'Hello'
      };

      const blob2: Blob = {
        type: 'insert',
        pos: 5,
        ln: 0,
        data: ' World'
      };

      handler.addDelta(blob1);
      handler.addDelta(blob2);

      const deltas = handler.getCumulativeDeltas();
      expect(deltas).toHaveLength(1);
      expect(deltas[0]).toEqual({
        type: 'insert',
        pos: 0,
        ln: 0,
        data: 'Hello World'
      });
    });

    test('should not merge inserts on different lines', () => {
      const blob1: Blob = {
        type: 'insert',
        pos: 0,
        ln: 0,
        data: 'Hello'
      };

      const blob2: Blob = {
        type: 'insert',
        pos: 0,
        ln: 1,
        data: 'World'
      };

      handler.addDelta(blob1);
      handler.addDelta(blob2);

      const deltas = handler.getCumulativeDeltas();
      expect(deltas).toHaveLength(2);
    });

    test('should not merge non-consecutive inserts', () => {
      const blob1: Blob = {
        type: 'insert',
        pos: 0,
        ln: 0,
        data: 'Hello'
      };

      const blob2: Blob = {
        type: 'insert',
        pos: 10, // Gap between inserts
        ln: 0,
        data: 'World'
      };

      handler.addDelta(blob1);
      handler.addDelta(blob2);

      const deltas = handler.getCumulativeDeltas();
      expect(deltas).toHaveLength(2);
    });

    test('should merge consecutive deletes at same position (backspace)', () => {
      const blob1: Blob = {
        type: 'delete',
        pos: 5,
        ln: 0,
        steps: 2
      };

      const blob2: Blob = {
        type: 'delete',
        pos: 5,
        ln: 0,
        steps: 3
      };

      handler.addDelta(blob1);
      handler.addDelta(blob2);

      const deltas = handler.getCumulativeDeltas();
      expect(deltas).toHaveLength(1);
      expect(deltas[0]).toEqual({
        type: 'delete',
        pos: 5,
        ln: 0,
        steps: 5
      });
    });

    test('should merge consecutive deletes at sequential positions (forward delete)', () => {
      const blob1: Blob = {
        type: 'delete',
        pos: 5,
        ln: 0,
        steps: 2
      };

      const blob2: Blob = {
        type: 'delete',
        pos: 3, // Position adjusted for backspace scenario
        ln: 0,
        steps: 1
      };

      handler.addDelta(blob1);
      handler.addDelta(blob2);

      const deltas = handler.getCumulativeDeltas();
      expect(deltas).toHaveLength(1);
      expect(deltas[0]).toEqual({
        type: 'delete',
        pos: 5,
        ln: 0,
        steps: 3
      });
    });

    test('should not merge different operation types', () => {
      const blob1: Blob = {
        type: 'insert',
        pos: 0,
        ln: 0,
        data: 'Hello'
      };

      const blob2: Blob = {
        type: 'delete',
        pos: 5,
        ln: 0,
        steps: 2
      };

      handler.addDelta(blob1);
      handler.addDelta(blob2);

      const deltas = handler.getCumulativeDeltas();
      expect(deltas).toHaveLength(2);
    });
  });

  describe('Utility methods', () => {
    test('should clear all deltas', () => {
      handler.addDelta({
        type: 'insert',
        pos: 0,
        ln: 0,
        data: 'test'
      });

      expect(handler.getDeltaCount()).toBe(1);
      handler.clearDeltas();
      expect(handler.getDeltaCount()).toBe(0);
    });

    test('should get last delta', () => {
      const blob1: Blob = {
        type: 'insert',
        pos: 0,
        ln: 0,
        data: 'first'
      };

      const blob2: Blob = {
        type: 'insert',
        pos: 5,
        ln: 0,
        data: 'second'
      };

      handler.addDelta(blob1);
      handler.addDelta(blob2);

      const lastDelta = handler.getLastDelta();
      expect(lastDelta).toEqual({
        type: 'insert',
        pos: 0,
        ln: 0,
        data: 'firstsecond'
      });
    });

    test('should return copy of cumulative deltas', () => {
      const blob: Blob = {
        type: 'insert',
        pos: 0,
        ln: 0,
        data: 'test'
      };

      handler.addDelta(blob);
      const deltas1 = handler.getCumulativeDeltas();
      const deltas2 = handler.getCumulativeDeltas();

      expect(deltas1).not.toBe(deltas2); // Different references
      expect(deltas1).toEqual(deltas2); // Same content
    });
  });
});