import '@testing-library/jest-dom';

// Mock Monaco Editor since it requires DOM environment
jest.mock('monaco-editor', () => ({
  editor: {
    IStandaloneCodeEditor: {},
    IModelDeltaDecoration: {},
    IModelDecorationOptions: {},
    TrackedRangeStickiness: {
      NeverGrowsWhenTypingAtEdges: 1,
    },
  },
}));

// Mock @monaco-editor/react
jest.mock('@monaco-editor/react', () => ({
  Editor: ({ onMount, onChange, ...props }: any) => {
    const mockEditor = {
      onDidChangeModelContent: jest.fn(),
      onDidChangeCursorPosition: jest.fn(),
      getModel: jest.fn(() => ({
        deltaDecorations: jest.fn(() => []),
        pushEditOperations: jest.fn(),
      })),
      createDecorationsCollection: jest.fn(() => ({
        set: jest.fn(),
      })),
    };
    
    // Simulate onMount being called
    setTimeout(() => {
      if (onMount) {
        onMount(mockEditor, {});
      }
    }, 0);
    
    return <div data-testid="monaco-editor" {...props} />
  },
}));
