import { vectorize } from '@neplex/vectorizer';
import type { Config } from '@neplex/vectorizer';
import sharp from 'sharp';
import { ensureSvgElementIds } from '@/lib/vectorizer/id';

export interface VectorizeLogoOptions {
  /**
   * 最大尺寸限制，默认 1024。
   */
  maxSize?: number;
}

export interface VectorizeLogoResult {
  svg: string;
  width: number;
  height: number;
  originalFormat: string | null;
}

/**
 * 使用 vTracer 对 Logo 进行矢量化，并生成层次化 SVG。
 */
export async function vectorizeLogoFromBuffer(
  buffer: Buffer,
  options: VectorizeLogoOptions = {}
): Promise<VectorizeLogoResult> {
  const maxSize = options.maxSize ?? 1024;

  const sharpInstance = sharp(buffer, { failOn: 'none' }).ensureAlpha();
  const metadata = await sharpInstance.metadata();

  const { data: optimized, info } = await sharpInstance
    .resize({
      width: maxSize,
      height: maxSize,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .png()
    .toBuffer({ resolveWithObject: true });

  const COLOR_MODE_COLOR = 0 as Config['colorMode'];
  const HIERARCHICAL_STACKED = 0 as Config['hierarchical'];
  const PATH_SIMPLIFY_SPLINE = 2 as Config['mode'];

  const rawSvg = await vectorize(optimized, {
    colorMode: COLOR_MODE_COLOR,
    hierarchical: HIERARCHICAL_STACKED,
    filterSpeckle: 4,
    colorPrecision: 8,
    layerDifference: 6,
    mode: PATH_SIMPLIFY_SPLINE,
    cornerThreshold: 60,
    lengthThreshold: 4,
    maxIterations: 2,
    spliceThreshold: 45,
    pathPrecision: 4,
  });

  const svg = await ensureSvgElementIds(rawSvg);

  return {
    svg,
    width: info.width,
    height: info.height,
    originalFormat: metadata.format ?? null,
  };
}
