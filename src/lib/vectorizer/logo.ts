import { ColorMode, Hierarchical, PathSimplifyMode, vectorize } from '@neplex/vectorizer';
import sharp from 'sharp';

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

  const svg = await vectorize(optimized, {
    colorMode: ColorMode.Color,
    hierarchical: Hierarchical.Stacked,
    filterSpeckle: 4,
    colorPrecision: 8,
    layerDifference: 6,
    mode: PathSimplifyMode.Spline,
    cornerThreshold: 60,
    lengthThreshold: 4,
    maxIterations: 2,
    spliceThreshold: 45,
    pathPrecision: 4,
  });

  return {
    svg,
    width: info.width,
    height: info.height,
    originalFormat: metadata.format ?? null,
  };
}
