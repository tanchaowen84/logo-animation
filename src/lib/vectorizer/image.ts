import sharp from 'sharp';

export async function bufferToPngDataUrl(buffer: Buffer): Promise<string> {
  const optimized = await sharp(buffer, { failOn: 'none' })
    .ensureAlpha()
    .png()
    .toBuffer();

  return `data:image/png;base64,${optimized.toString('base64')}`;
}
