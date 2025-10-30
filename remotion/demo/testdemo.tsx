import { SvgCanvas, type SvgLayer, useSvgLayers } from '@runtime';
import type React from 'react';
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
} from 'remotion';

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
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        {status === 'error'
          ? (error?.message ?? 'SVG åŠ è½½å¤±è´¥')
          : 'åŠ è½½ä¸­â€¦'}
      </AbsoluteFill>
    );
  }

  const svgWidth = Number(collection.document.width ?? 312);
  const svgHeight = Number(collection.document.height ?? 306);

  const scale = spring({
    frame,
    fps: 30,
    config: {
      damping: 200,
      stiffness: 100,
    },
    durationInFrames: 60,
  });

  const planetBase = collection.byLabel('planet-base')?.[0];
  const planetStripes = collection.layers.filter((layer) =>
    layer.label?.startsWith('planet-stripe-dark-')
  );
  const planetSpots = collection.layers.filter((layer) =>
    layer.label?.startsWith('planet-spot-')
  );

  const astronautSuitMain = collection.byLabel('astronaut-suit-main')?.[0];
  const astronautHelmetGlass = collection.byLabel(
    'astronaut-helmet-glass'
  )?.[0];
  const astronautHelmetBase = collection.byLabel('astronaut-helmet-base')?.[0];
  const astronautDetails = collection.layers.filter(
    (layer) =>
      layer.label?.startsWith('astronaut-') &&
      !layer.label?.includes('background-star')
  );

  const backgroundStarsSmall = collection.layers.filter((layer) =>
    layer.label?.startsWith('background-star-small-')
  );
  const mainStars = collection.layers.filter(
    (layer) =>
      layer.label?.startsWith('star-main-') ||
      layer.label?.startsWith('star-highlight-')
  );

  const renderLayer = ({ layer }: { layer: SvgLayer }) => {
    const isBackgroundStarSmall = layer.label?.startsWith(
      'background-star-small-'
    );
    const isMainStar =
      layer.label?.startsWith('star-main-') ||
      layer.label?.startsWith('star-highlight-');
    const isPlanetPart = layer.label?.startsWith('planet-');
    const isAstronautPart = layer.label?.startsWith('astronaut-');

    let opacity = 1;
    let transform = '';

    if (isBackgroundStarSmall) {
      const delay = (Number(layer.id.split('-').pop()) || 0) * 5; // Stagger small stars
      opacity = interpolate(frame - delay, [0, 30], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
      const translateY = interpolate(frame - delay, [0, 60], [-20, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
      transform = `translateY(${translateY}px)`;
    } else if (isMainStar) {
      const delay = (Number(layer.id.split('-').pop()) || 0) * 3; // Stagger main stars
      opacity = interpolate(frame - delay, [30, 60], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
      const scaleStar = spring({
        frame: frame - delay,
        fps: 30,
        config: { damping: 100, stiffness: 200 },
        durationInFrames: 30,
      });
      transform = `scale(${scaleStar})`;
    } else if (isPlanetPart) {
      opacity = interpolate(frame, [30, 60], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
      const translateY = interpolate(frame, [0, 60], [50, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
      transform = `translateY(${translateY}px)`;
    } else if (isAstronautPart) {
      opacity = interpolate(frame, [60, 90], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
      const translateY = interpolate(frame, [30, 90], [100, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
      transform = `translateY(${translateY}px)`;
    }

    return (
      <path
        key={layer.id}
        {...layer.attributes}
        style={{
          opacity,
          transform,
          transformOrigin: layer.bbox
            ? `${layer.bbox.cx}px ${layer.bbox.cy}px`
            : 'center center',
        }}
      />
    );
  };

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          width: svgWidth,
          height: svgHeight,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
      >
        <SvgCanvas
          document={collection.document}
          layers={collection.layers}
          renderLayer={renderLayer}
          style={{
            width: '100%',
            height: '100%',
            overflow: 'visible',
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
