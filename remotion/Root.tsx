import { Composition } from 'remotion';
import {
  LogoPlaceholderComposition,
  logoPlaceholderSchema,
} from './compositions/LogoPlaceholder';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="LogoPlaceholder"
        component={LogoPlaceholderComposition}
        schema={logoPlaceholderSchema}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          brandColor: '#111827',
          accentColor: '#6366f1',
          title: 'Logo Animation Placeholder',
          subtitle: 'AI-generated motion preview',
        }}
      />
    </>
  );
};
