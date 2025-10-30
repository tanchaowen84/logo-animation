import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { SvgCanvas, useSvgLayers } from '@runtime';
import type { SvgLayer } from '@runtime';

export interface RuntimeDemoProps {
  vectorizedSvgUrl: string;
}

export const RuntimeDemo: React.FC<RuntimeDemoProps> = ({ vectorizedSvgUrl }) => {
  const { width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const { status, error, collection, runtime } = useSvgLayers({ vectorizedSvgUrl });

  if (status === 'loading' || status === 'idle') {
    return (
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        加载 SVG …
      </AbsoluteFill>
    );
  }

  if (status === 'error' || !collection.document) {
    return (
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', color: 'red' }}>
        {error?.message ?? 'SVG 加载失败'}
      </AbsoluteFill>
    );
  }

  const totalFrames = 150;
  const starLayers = runtime?.byLabel('star') ?? [];

  const renderLayer = ({ layer }: { layer: SvgLayer }): React.ReactNode => {
    const isStar = starLayers.some((star) => star.id === layer.id);
    const appearStart = isStar ? 10 : 0;
    const appearEnd = isStar ? 40 : 20;
    const opacity = interpolate(frame, [appearStart, appearEnd], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });

    if (layer.type === 'path') {
      return (
        <path
          key={layer.id}
          {...layer.attributes}
          data-layer-id={layer.id}
          opacity={opacity}
          style={{ mixBlendMode: isStar ? 'screen' : 'normal' }}
        />
      );
    }

    const Tag = layer.type as keyof React.JSX.IntrinsicElements;
    return React.createElement(
      Tag,
      { key: layer.id, ...layer.attributes, opacity, 'data-layer-id': layer.id },
      layer.children?.map((child) => renderLayer({ layer: child }))
    );
  };

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', backgroundColor: 'black' }}>
      <SvgCanvas
        document={collection.document}
        layers={collection.layers}
        style={{ width, height }}
        renderLayer={renderLayer}
      />
    </AbsoluteFill>
  );
};
