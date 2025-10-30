import 'server-only';

import { getOpenRouterClient } from '@/lib/ai';
import type { StructuredSvgNode } from '@/lib/vectorizer/structure';

export interface LabelSvgElementInput {
  nodes: StructuredSvgNode[];
  imageBase64: string;
  instructions?: string;
}

export interface LabeledSvgElement {
  id: string;
  label: string;
  reason?: string;
}

export interface LabelSvgElementResult {
  labels: LabeledSvgElement[];
}

const DEFAULT_PROMPT = `You are an expert motion designer helping to analyze a brand logo before animating it. 
You receive:
- The raw logo image.
- A list of SVG elements extracted from that logo. Each element includes an id, type, fill color, bounding box, area, and path length.

Goal:
- Assign a semantic label to each SVG element so an animation system understands the role of every piece (for example: brand-mark, wordmark, icon background, decorative accent, stroke, shadow, highlight, etc.).
- Use concise, descriptive labels that reflect the element's role in the composition.
- Return results as JSON array with objects { "id": "...", "label": "...", "reason": "..." }.
- "reason" should be a brief justification (one sentence) to aid human review.`;

export async function labelSvgElements({
  nodes,
  imageBase64,
  instructions,
}: LabelSvgElementInput): Promise<LabelSvgElementResult> {
  if (!nodes.length) {
    return { labels: [] };
  }

  const client = getOpenRouterClient();
  const prompt = instructions ?? DEFAULT_PROMPT;

  const elementSummaries = nodes.map((node) => ({
    id: node.id,
    type: node.type,
    fill: node.fill ?? null,
    stroke: node.stroke ?? null,
    bbox: node.bbox,
    area: node.area,
    pathLength: node.pathLength,
    children: node.children?.map((child) => child.id) ?? [],
  }));

  const rawSummary = JSON.stringify(elementSummaries);
  const MAX_SUMMARY_LENGTH = 12000;
  const summaryText =
    rawSummary.length > MAX_SUMMARY_LENGTH
      ? `${rawSummary.slice(0, MAX_SUMMARY_LENGTH)}... (truncated ${rawSummary.length - MAX_SUMMARY_LENGTH} chars)`
      : rawSummary;

  const completion = await client.chat.completions.create({
    model: process.env.OPENROUTER_LOGO_LABEL_MODEL ?? 'minimax/minimax-m2',
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: prompt,
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: [
              'You will receive structured SVG element data in JSON.',
              'Return a JSON object in the format { "labels": [{ "id": string, "label": string, "reason"?: string }] }.',
              'Here is the data:',
              summaryText,
            ].join('\n'),
          },
          {
            type: 'image_url',
            image_url: {
              url: imageBase64,
            },
          },
        ],
      },
    ],
  });

  const messageContent = completion.choices[0]?.message?.content;
  if (!messageContent) {
    throw new Error('Model did not return any content.');
  }

  const jsonStart = messageContent.indexOf('{');
  const jsonEnd = messageContent.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error('Model response is not valid JSON.');
  }

  const parsed = JSON.parse(messageContent.slice(jsonStart, jsonEnd + 1)) as LabelSvgElementResult;
  if (!parsed.labels) {
    throw new Error('Model response missing labels array.');
  }

  return parsed;
}
