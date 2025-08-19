export interface DeltaWithOffset {
  startLine: number;
  startCol: number;
  endLine: number;
  endCol: number;
  text: string;
  source_text: string;
  offset: number;
}

export interface Delta {
  startLine: number;
  startCol: number;
  endLine: number;
  endCol: number;
  text: string;
}

export interface TextSpan {
  linespan: number;
  colspan: number;
}

export interface DocModel {
  lines: string[];
}
