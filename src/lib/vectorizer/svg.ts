import 'server-only';

import { optimize } from 'svgo';
import { parseSvgToStructuredNodes, type StructuredSvgNode } from '@/lib/vectorizer/structure';

export interface SvgSemanticLabel {
  id: string;
  label: string;
  reason?: string;
}

export function applySemanticLabelsToSvg(svg: string, labels: SvgSemanticLabel[]): string {
  if (!labels.length) {
    return svg;
  }

  let output = svg;

  for (const label of labels) {
    const dataAttr = `data-layer="${label.label}"`;
    const reasonAttr = label.reason ? ` data-label-reason="${label.reason.replace(/"/g, '&quot;')}"` : '';

    const pattern = new RegExp(`(<[^>]*id="${label.id}"[^>]*?)(\\s*/?)>`, 'i');
    if (pattern.test(output)) {
      output = output.replace(pattern, `$1 ${dataAttr}${reasonAttr}$2>`);
    }
  }

  return output;
}

export function flattenStructuredNodes(nodes: StructuredSvgNode[]): StructuredSvgNode[] {
  const result: StructuredSvgNode[] = [];
  const stack = [...nodes];

  while (stack.length) {
    const node = stack.shift();
    if (!node) continue;
    result.push(node);
    if (node.children) {
      stack.push(...node.children);
    }
  }

  return result;
}

export function parseSvgForLabeling(svg: string): StructuredSvgNode[] {
  const optimized = optimize(svg, {
    multipass: true,
    floatPrecision: 3,
    plugins: [
      {
        name: 'preset-default',
        params: {
          overrides: {
            cleanupIds: false,
            removeHiddenElems: false,
            removeUselessDefs: false,
          },
        },
      },
    ],
  });
  const content = 'data' in optimized ? optimized.data : svg;
  return flattenStructuredNodes(parseSvgToStructuredNodes(content));
}
