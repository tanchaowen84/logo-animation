import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { z } from 'zod';

export const logoPlaceholderSchema = z.object({
  brandColor: z.string().default('#111827'),
  accentColor: z.string().default('#6366f1'),
  title: z.string().default('Logo Animation Placeholder'),
  subtitle: z
    .string()
    .max(120)
    .optional()
    .describe('Optional subtitle or tagline displayed below the title.'),
});

export type LogoPlaceholderProps = z.infer<typeof logoPlaceholderSchema>;

export const LogoPlaceholderComposition: React.FC<LogoPlaceholderProps> = ({
  brandColor,
  accentColor,
  title,
  subtitle,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const overlayProgress = spring({
    frame,
    fps,
    config: {
      damping: 20,
    },
  });

  const strokeDash = interpolate(overlayProgress, [0, 1], [100, 0]);

  const subtitleOpacity = interpolate(frame, [45, 70], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pulse = Math.sin((frame / fps) * Math.PI) * 0.15 + 0.85;

  return (
    <AbsoluteFill
      style={{
        background: brandColor,
        color: 'white',
        fontFamily: 'var(--font-bricolage-grotesque, sans-serif)',
      }}
    >
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          gap: 32,
        }}
      >
        <div
          style={{
            width: 320,
            height: 320,
            borderRadius: '32px',
            border: `6px solid ${accentColor}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
            transform: `scale(${pulse})`,
            transition: 'transform 0.2s linear',
          }}
        >
          <div
            style={{
              width: '70%',
              height: '70%',
              borderRadius: '50%',
              background: `radial-gradient(circle at 30% 30%, ${accentColor}, transparent)`,
              opacity: 0.6,
            }}
          />
          <svg
            viewBox="0 0 120 120"
            style={{
              position: 'absolute',
              inset: 20,
              transform: 'rotate(-12deg)',
              stroke: accentColor,
              fill: 'none',
              strokeWidth: 4,
              strokeDasharray: 100,
              strokeDashoffset: strokeDash,
            }}
          >
            <path d="M10 60 C10 20 60 10 60 60 S110 100 110 60" />
          </svg>
        </div>

        <div style={{ textAlign: 'center', maxWidth: 800 }}>
          <h1 style={{ fontSize: 72, marginBottom: 12 }}>{title}</h1>
          {subtitle ? (
            <p
              style={{
                fontSize: 28,
                lineHeight: 1.4,
                opacity: subtitleOpacity,
              }}
            >
              {subtitle}
            </p>
          ) : null}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
