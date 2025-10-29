import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { ensureManifestFiles } from './manifest';

const REMOTION_ENTRY = path.join(process.cwd(), 'remotion', 'index.ts');

let cachedServeUrl: string | null = null;
let bundlingPromise: Promise<string> | null = null;
let bundlerModulePromise: Promise<typeof import('@remotion/bundler')> | null = null;
let rendererModulePromise: Promise<typeof import('@remotion/renderer')> | null = null;

async function importBundler(): Promise<typeof import('@remotion/bundler')> {
  if (!bundlerModulePromise) {
    bundlerModulePromise = import('@remotion/bundler');
  }
  return bundlerModulePromise;
}

async function importRenderer(): Promise<typeof import('@remotion/renderer')> {
  if (!rendererModulePromise) {
    rendererModulePromise = import('@remotion/renderer');
  }
  return rendererModulePromise;
}

export function invalidateRemotionBundle() {
  cachedServeUrl = null;
  bundlingPromise = null;
}

async function bundleProject(): Promise<string> {
  if (bundlingPromise) {
    return bundlingPromise;
  }

  await ensureManifestFiles();

  bundlingPromise = importBundler().then(({ bundle }) =>
    bundle({
      entryPoint: REMOTION_ENTRY,
      onProgress: (progress: number) => {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[remotion] bundling progress: ${(progress * 100).toFixed(1)}%`);
        }
      },
    })
  );

  try {
    const serveUrl = await bundlingPromise;
    cachedServeUrl = serveUrl;
    return serveUrl;
  } catch (error) {
    cachedServeUrl = null;
    bundlingPromise = null;
    throw error;
  }
}

async function getServeUrl(): Promise<string> {
  if (cachedServeUrl) {
    return cachedServeUrl;
  }
  return bundleProject();
}

export interface RenderCompositionParams {
  compositionId: string;
  inputProps: Record<string, unknown>;
  codec?: 'h264' | 'h265' | 'vp8' | 'vp9' | 'prores';
  imageFormat?: 'jpeg' | 'png';
}

export interface RenderResult {
  serveUrl: string;
  compositionDurationInFrames: number;
  compositionFps: number;
  compositionWidth: number;
  compositionHeight: number;
  outputLocation: string;
}

export async function renderComposition({
  compositionId,
  inputProps,
  codec = 'h264',
}: RenderCompositionParams): Promise<RenderResult> {
  const serveUrl = await getServeUrl();
  const { selectComposition, renderMedia } = await importRenderer();
  const composition = await selectComposition({
    serveUrl,
    id: compositionId,
    inputProps,
  });

  if (!composition) {
    throw new Error(`未在 Remotion bundle 中找到 composition: ${compositionId}`);
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'remotion-render-'));
  const outputLocation = path.join(tmpDir, `${compositionId}-${Date.now()}.mp4`);

  await renderMedia({
    serveUrl,
    composition,
    codec,
    outputLocation,
    inputProps,
    chromiumOptions: {
      gl: 'angle',
    },
  });

  return {
    serveUrl,
    compositionDurationInFrames: composition.durationInFrames,
    compositionFps: composition.fps,
    compositionWidth: composition.width,
    compositionHeight: composition.height,
    outputLocation,
  };
}
