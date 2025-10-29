import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Sequence } from 'remotion';

export interface LogoAnimationProps {
  vectorizedSvgUrl: string;
}

const Star: React.FC<{ delay: number; x: number; y: number; scale: number }> = ({ delay, x, y, scale }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = interpolate(frame - delay, [0, fps * 0.5], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const translateY = interpolate(frame - delay, [0, fps * 1.5], [-50, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        opacity: fadeIn,
        transform: `translateY(${translateY}px) scale(${scale})`,
      }}
    >
      <svg width='10' height='10' viewBox='0 0 24 24' fill='yellow' xmlns='http://www.w3.org/2000/svg'>
        <path d='M12 .587l3.668 7.568 8.332 1.151-6.064 5.828 1.48 8.279-7.416-3.908-7.417 3.908 1.481-8.279-6.064-5.828 8.332-1.151z'/>
      </svg>
    </div>
  );
};

export const LogoAnimation: React.FC<LogoAnimationProps> = ({ vectorizedSvgUrl }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const svgOpacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <AbsoluteFill style={{ opacity: svgOpacity }}>
        <img
          src={vectorizedSvgUrl}
          alt='Logo'
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
          }}
        />
      </AbsoluteFill>
      <Star delay={10} x={1400} y={200} scale={1} />
      <Star delay={20} x={300} y={800} scale={0.8} />
      <Star delay={30} x={1600} y={900} scale={0.9} />
      <Star delay={40} x={200} y={100} scale={0.7} />
    </AbsoluteFill>
  );
};
