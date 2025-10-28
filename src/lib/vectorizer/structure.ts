import { parseSync, type Node } from 'svgson';
import { nanoid } from 'nanoid';
import svgPathBounds from 'svg-path-bounds';

export interface BBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface StructuredSvgNode {
  id: string;
  type: string;
  fill?: string;
  stroke?: string;
  area?: number;
  pathLength?: number;
  bbox?: BBox;
  attributes: Record<string, string>;
  children?: StructuredSvgNode[];
}

let hasLoggedBoundsError = false;

function computePathMetrics(d: string): { bbox: BBox; area: number; pathLength: number } | null {
  try {
    const [minX, minY, maxX, maxY] = svgPathBounds(d);
    const width = maxX - minX;
    const height = maxY - minY;
    const area = Math.abs(width * height);
    const pathLength = d.length;
    return {
      bbox: { x: minX, y: minY, width, height },
      area,
      pathLength,
    };
  } catch (error) {
    if (!hasLoggedBoundsError) {
      console.warn('Failed to compute path metrics, using fallback metrics for remaining paths.', error);
      hasLoggedBoundsError = true;
    }
    return null;
  }
}

function mapNode(node: Node, inheritedId?: string): StructuredSvgNode {
  const id = node.attributes.id ?? inheritedId ?? `node_${nanoid(8)}`;
  const type = node.name;
  const attributes = node.attributes ?? {};

  const structured: StructuredSvgNode = {
    id,
    type,
    attributes,
  };

  if (attributes.fill) {
    structured.fill = attributes.fill;
  }
  if (attributes.stroke) {
    structured.stroke = attributes.stroke;
  }

  if (type === 'path' && attributes.d) {
    const metrics = computePathMetrics(attributes.d);
    if (metrics) {
      structured.bbox = metrics.bbox;
      structured.area = metrics.area;
      structured.pathLength = metrics.pathLength;
    }
  }

  if (node.children && node.children.length > 0) {
    structured.children = node.children.map((child) => mapNode(child));
  }

  return structured;
}

export function parseSvgToStructuredNodes(svg: string): StructuredSvgNode[] {
  const parsed = parseSync(svg);

  const nodes: StructuredSvgNode[] = [];

  const rootChildren = Array.isArray(parsed.children) ? parsed.children : [];
  for (const child of rootChildren) {
    nodes.push(mapNode(child));
  }

  return nodes;
}
