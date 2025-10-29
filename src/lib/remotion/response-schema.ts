export const animationResponseSchema = {
  name: 'logo_animation_response',
  schema: {
    type: 'object',
    required: ['tsx', 'compositionId', 'durationInFrames', 'fps'],
    properties: {
      tsx: { type: 'string' },
      compositionId: { type: 'string' },
      durationInFrames: { type: 'number' },
      fps: { type: 'number' },
      props: { type: ['object', 'null'] },
      width: { type: ['number', 'null'] },
      height: { type: ['number', 'null'] },
    },
    additionalProperties: false,
  },
} as const;
