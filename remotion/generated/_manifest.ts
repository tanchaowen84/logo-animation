import type { ComponentType } from 'react';

export interface GeneratedCompositionDefinition {
  id: string;
  component: ComponentType<Record<string, unknown>>;
  durationInFrames: number;
  fps: number;
  width: number;
  height: number;
  defaultProps: Record<string, unknown>;
}

export const generatedCompositions: GeneratedCompositionDefinition[] = [];
