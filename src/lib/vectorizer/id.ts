import { parse, stringify } from 'svgson';
import { nanoid } from 'nanoid';

const ID_PREFIX = 'layer';

function shouldAssignId(nodeName: string): boolean {
  return ['path', 'g', 'rect', 'circle', 'ellipse', 'polygon', 'polyline', 'line'].includes(
    nodeName
  );
}

function assignIds(node: any, prefix: string) {
  if (node.type !== 'element') {
    return;
  }

  if (shouldAssignId(node.name)) {
    const attributes = node.attributes ?? {};

    if (!attributes.id) {
      attributes.id = `${prefix}_${nanoid(8)}`;
    }

    node.attributes = attributes;
  }

  if (Array.isArray(node.children)) {
    node.children.forEach((child: any) => assignIds(child, prefix));
  }
}

export async function ensureSvgElementIds(svg: string): Promise<string> {
  const parsed = await parse(svg);
  assignIds(parsed, ID_PREFIX);
  return stringify(parsed);
}
