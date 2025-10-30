export interface SvgBBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SvgLayer {
  id: string;
  originalId?: string;
  label?: string;
  type: string;
  d?: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: string;
  opacity?: number;
  bbox?: SvgBBox;
  attributes: Record<string, string>;
  children?: SvgLayer[];
}

export interface ParsedSvgDocument {
  width?: string;
  height?: string;
  viewBox?: string;
  attributes: Record<string, string>;
  layers: SvgLayer[];
}

export interface SvgLayerCollection {
  document: ParsedSvgDocument | null;
  layers: SvgLayer[];
  byId(id: string): SvgLayer | undefined;
  byLabel(...labels: string[]): SvgLayer[];
  all(): SvgLayer[];
}
