import { labelSvgElements } from '@/lib/ai/vector-labeler';
import { vectorizeLogoFromBuffer } from '@/lib/vectorizer/logo';
import { bufferToPngDataUrl } from '@/lib/vectorizer/image';
import { parseSvgForLabeling, applySemanticLabelsToSvg } from '@/lib/vectorizer/svg';
import type { SvgLabelResponse } from '@/lib/vectorizer/types';
import { NextResponse, type NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function badRequest(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';

  try {
    if (!contentType.includes('multipart/form-data')) {
      return badRequest('Unsupported content type, expected multipart/form-data');
    }

    const formData = await request.formData();
    const file = formData.get('file');
    if (!file) {
      return badRequest('Missing file in request');
    }

    if (!(file instanceof Blob)) {
      return badRequest('Invalid file data');
    }

    if (file.size === 0) {
      return badRequest('Uploaded file is empty');
    }

    if (file.size > MAX_FILE_SIZE) {
      return badRequest('File too large, max size is 10MB');
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await vectorizeLogoFromBuffer(buffer);

    const nodes = parseSvgForLabeling(result.svg);

    let responsePayload: SvgLabelResponse = {
      svg: result.svg,
      labels: [],
    };

    if (nodes.length > 0 && process.env.OPENROUTER_API_KEY) {
      try {
        const base64Image = await bufferToPngDataUrl(buffer);
        const labelResult = await labelSvgElements({
          nodes,
          imageBase64: base64Image,
        });

        const labeledSvg = applySemanticLabelsToSvg(result.svg, labelResult.labels);

        responsePayload = {
          svg: labeledSvg,
          labels: labelResult.labels,
        };
      } catch (error) {
        console.warn('Labeling error:', error);
        responsePayload = {
          svg: result.svg,
          labels: [],
        };
      }
    } else if (!process.env.OPENROUTER_API_KEY) {
      console.warn('OPENROUTER_API_KEY not set, skipping semantic labeling.');
    }

    return NextResponse.json({
      ...responsePayload,
      width: result.width,
      height: result.height,
      originalFormat: result.originalFormat,
    });
  } catch (error) {
    console.error('Vectorize error:', error);
    return badRequest(
      error instanceof Error ? error.message : 'Failed to vectorize image',
      500
    );
  }
}
