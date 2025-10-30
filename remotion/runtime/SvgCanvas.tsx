import React from 'react';
import type { ParsedSvgDocument, SvgLayer, SvgLayerCollection } from './types';

export interface SvgCanvasProps {
  document?: ParsedSvgDocument | null;
  layers: SvgLayer[];
  className?: string;
  style?: React.CSSProperties;
  renderLayer?: (context: { layer: SvgLayer; index: number }) => React.ReactNode;
  collection?: SvgLayerCollection;
}

const DEFAULT_SVG_PROPS = {
  width: '100%',
  height: '100%',
  preserveAspectRatio: 'xMidYMid meet',
};

function renderDefaultLayer({ layer, index }: { layer: SvgLayer; index: number }): React.ReactNode {
  if (layer.type === 'path') {
    return <path key={layer.id} {...layer.attributes} data-layer-id={layer.id} />;
  }

  if (layer.children && layer.children.length > 0) {
    return (
      <g key={layer.id} {...layer.attributes} data-layer-id={layer.id}>
        {layer.children.map((child, childIndex) =>
          renderDefaultLayer({ layer: child, index: childIndex })
        )}
      </g>
    );
  }

  const Tag = layer.type as keyof React.JSX.IntrinsicElements;
  return React.createElement(
    Tag,
    { key: layer.id, ...layer.attributes, 'data-layer-id': layer.id },
    layer.children?.map((child, childIndex) => renderDefaultLayer({ layer: child, index: childIndex }))
  );
}

export const SvgCanvas: React.FC<SvgCanvasProps> = ({
  document,
  layers,
  className,
  style,
  renderLayer = renderDefaultLayer,
}) => {
  const svgProps: React.SVGProps<SVGSVGElement> = {
    ...DEFAULT_SVG_PROPS,
    ...document?.attributes,
    className,
    style,
    viewBox: document?.viewBox,
  };

  return (
    <svg {...svgProps}>
      {layers.map((layer, index) => renderLayer({ layer, index }))}
    </svg>
  );
};
