import type { INode } from 'svgson';
import { parse } from 'svgson';
import pathBounds from 'svg-path-bounds';
import { nanoid } from 'nanoid';
import type { ParsedSvgDocument, SvgBBox, SvgLayer } from './types';

const LABEL_ATTRIBUTES = ['data-layer', 'data-label', 'aria-label', 'inkscape:label'];

function toNumeric(value?: string): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function computePathBBox(d?: string): SvgBBox | undefined {
  if (!d) return undefined;
  try {
    const [minX, minY, maxX, maxY] = pathBounds(d);
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      cx: minX + (maxX - minX) / 2,
      cy: minY + (maxY - minY) / 2,
    };
  } catch (error) {
    return undefined;
  }
}

function normalizeOpacity(value?: string): number | undefined {
  if (!value) return undefined;
  const number = Number(value);
  if (Number.isFinite(number)) {
    return Math.min(Math.max(number, 0), 1);
  }
  return undefined;
}

function generateId(node: INode, fallbackPrefix: string): string {
  if (node.attributes.id) return node.attributes.id;
  return `${fallbackPrefix}_${nanoid(8)}`;
}

function extractLabel(attributes: Record<string, string>): string | undefined {
  for (const key of LABEL_ATTRIBUTES) {
    if (attributes[key]) {
      return attributes[key];
    }
  }
  return undefined;
}

function mapNode(node: INode, options: { fallbackPrefix: string }): SvgLayer {
  const id = generateId(node, options.fallbackPrefix);
  const label = extractLabel(node.attributes);
  const attributes = { ...node.attributes };

  const base: SvgLayer = {
    id,
    originalId: node.attributes.id,
    label,
    type: node.name,
    attributes,
  };

  if (node.name === 'path') {
    base.d = node.attributes.d;
    base.fill = node.attributes.fill;
    base.stroke = node.attributes.stroke;
    base.strokeWidth = node.attributes['stroke-width'];
    base.opacity = normalizeOpacity(node.attributes.opacity);
    const bbox = computePathBBox(node.attributes.d);
    if (bbox) {
      base.bbox = bbox;
    }
  }

  if (node.children && node.children.length > 0) {
    base.children = node.children.map((child) => mapNode(child, options));
  }

  return base;
}

export async function parseSvgToLayers(svgRaw: string): Promise<ParsedSvgDocument> {
  const parsed = await parse(svgRaw);
  const rootAttributes = parsed.attributes ?? {};

  const layers = (parsed.children ?? []).map((child, index) =>
    mapNode(child, { fallbackPrefix: `layer_${index}` })
  );

  return {
    width: toNumeric(rootAttributes.width),
    height: toNumeric(rootAttributes.height),
    viewBox: rootAttributes.viewBox,
    attributes: rootAttributes,
    layers,
  };
}
