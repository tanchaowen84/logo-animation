import type React from 'react';
import { Composition } from 'remotion';
import {
  LogoPlaceholderComposition,
  logoPlaceholderSchema,
} from './compositions/LogoPlaceholder';
import { RuntimeDemo } from './demo/RuntimeDemo';
import { LogoAnimation as TestDemoLogoAnimation } from './demo/testdemo';
import { generatedCompositions } from './generated/_manifest';

const runtimeDemoDefaultProps = {
  vectorizedSvgUrl:
    'https://pub-df7551e0092c4444a30e9569c7dd7100.r2.dev/logo-tasks/3bdbf8a0-a6be-4da8-9ca6-f3215d6d453c/92a4b729-88fb-4996-996d-31f4da0328b5.svg',
};

const RuntimeDemoWrapper: React.FC<Record<string, unknown>> = () => (
  <RuntimeDemo {...runtimeDemoDefaultProps} />
);

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
      <Composition
        id="RuntimeDemo"
        component={RuntimeDemoWrapper}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={runtimeDemoDefaultProps}
      />
      <Composition
        id="TestDemo"
        component={TestDemoLogoAnimation}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={runtimeDemoDefaultProps}
      />
      {generatedCompositions.map((composition) => (
        <Composition
          key={composition.id}
          id={composition.id}
          component={composition.component}
          durationInFrames={composition.durationInFrames}
          fps={composition.fps}
          width={composition.width ?? 1920}
          height={composition.height ?? 1080}
          defaultProps={composition.defaultProps}
        />
      ))}
    </>
  );
};
