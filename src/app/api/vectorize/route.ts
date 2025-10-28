import { vectorizeLogoFromBuffer } from '@/lib/vectorizer/logo';
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

    return NextResponse.json({
      svg: result.svg,
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
