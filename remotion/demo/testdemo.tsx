import { SvgCanvas, useSvgLayers } from '@runtime';
import type { SvgLayer } from '@runtime';
import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame } from 'remotion';

export interface LogoAnimationProps {
  vectorizedSvgUrl: string;
}

export const LogoAnimation: React.FC<LogoAnimationProps> = ({
  vectorizedSvgUrl,
}) => {
  const frame = useCurrentFrame();
  const { status, error, collection } = useSvgLayers({ vectorizedSvgUrl });

  if (status !== 'success' || !collection.document) {
    return (
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#000',
        }}
      >
        {status === 'error'
          ? (error?.message ?? 'SVG åŠ è½½å¤±è´¥')
          : 'åŠ è½½ä¸­â€¦'}
      </AbsoluteFill>
    );
  }

  // èŽ·å–æ˜Ÿæ˜Ÿå±‚
  const starLayers = collection.byLabel('star') ?? [];

  // æ¸²æŸ“æ¯ä¸ªå±‚
  const renderLayer = ({ layer }: { layer: SvgLayer }) => {
    const isStar = layer.label?.includes('star');

    if (isStar) {
      // æ˜Ÿæ˜Ÿç¼“æ…¢è¿›å…¥åŠ¨ç”»
      const starOpacity = interpolate(frame, [0, 60], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });

      // æ ¹æ®æ˜Ÿæ˜Ÿä½ç½®æ·»åŠ ä¸åŒçš„åŠ¨ç”»å»¶è¿Ÿ
      let animationDelay = 0;
      if (layer.label?.includes('top-right')) animationDelay = 10;
      else if (layer.label?.includes('bottom-left')) animationDelay = 20;
      else if (layer.label?.includes('bottom-right')) animationDelay = 30;
      else if (layer.label?.includes('trail')) animationDelay = 15;
      else if (layer.label?.includes('small')) animationDelay = 25;

      const delayedFrame = Math.max(0, frame - animationDelay);
      const delayedOpacity = interpolate(delayedFrame, [0, 40], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });

      // æ˜Ÿæ˜Ÿè½»å¾®ç¼©æ”¾åŠ¨ç”»
      const scale = spring({
        fps: 30,
        frame: delayedFrame,
        config: { damping: 200, stiffness: 100 },
      });

      return (
        <g
          key={layer.id}
          opacity={delayedOpacity}
          transform={`scale(${0.8 + scale * 0.2})`}
        >
          {React.createElement(layer.type as any, { ...layer.attributes })}
        </g>
      );
    }

    // éžæ˜Ÿæ˜Ÿå±‚æ­£å¸¸æ¸²æŸ“
    return React.createElement(layer.type as any, {
      key: layer.id,
      ...layer.attributes,
    });
  };

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <SvgCanvas
        document={collection.document}
        layers={collection.layers}
        renderLayer={renderLayer}
        style={{ width: 1920, height: 1080 }}
      />
    </AbsoluteFill>
  );
};
