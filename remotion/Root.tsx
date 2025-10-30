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
    'https://pub-df7551e0092c4444a30e9569c7dd7100.r2.dev/logo-tasks/b310b8db-2f7f-40d1-b0ea-07db02166002/a203f893-8db4-44a7-8730-d763b4b398ce.svg',
};

const TestDemoWrapper: React.FC = () => (
  <TestDemoLogoAnimation
    vectorizedSvgUrl={runtimeDemoDefaultProps.vectorizedSvgUrl}
  />
);

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
        component={TestDemoWrapper}
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
