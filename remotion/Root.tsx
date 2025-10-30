import React from 'react';
import { Composition } from 'remotion';
import {
  LogoPlaceholderComposition,
  logoPlaceholderSchema,
} from './compositions/LogoPlaceholder';
import { RuntimeDemo } from './demo/RuntimeDemo';
import { generatedCompositions } from './generated/_manifest';

const runtimeDemoDefaultProps = {
  vectorizedSvgUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/4f/SVG_Logo.svg',
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
