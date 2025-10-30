import fs from 'fs/promises';
import path from 'path';

const REMOTION_PROMPT_PATH = path.join(process.cwd(), 'remotion-system-prompt.md');
let cachedSystemPrompt: string | null = null;

export async function loadAnimationSystemPrompt(): Promise<string> {
  if (cachedSystemPrompt) {
    return cachedSystemPrompt;
  }
  try {
    const content = await fs.readFile(REMOTION_PROMPT_PATH, 'utf-8');
    cachedSystemPrompt = `${content}\n\nFollow all instructions above. You must only output JSON as instructed by the user.`;
    return cachedSystemPrompt;
  } catch (error) {
    throw new Error('无法读取 Remotion 系统提示，请确认 remotion-system-prompt.md 存在。');
  }
}

export interface AnimationPromptParams {
  taskId: string;
  vectorizedSvgUrl: string;
  labels: unknown;
  width: number | null;
  height: number | null;
  originalFormat: string | null;
  instructions?: string;
}

export function buildAnimationPrompt({
  taskId,
  vectorizedSvgUrl,
  labels,
  width,
  height,
  originalFormat,
  instructions,
}: AnimationPromptParams): string {
  const metadata = {
    taskId,
    dimensions: { width, height },
    originalFormat,
    vectorizedSvgUrl,
    labels,
  };

  return [
    '请根据以下任务上下文生成 Remotion 动画组件，输出 JSON 对象 {"tsx": string, "compositionId": string, "durationInFrames": number, "fps": number, "props"?: object, "width"?: number, "height"?: number }。',
    [
      '你可以使用以下运行时工具（路径为 `../runtime`）：',
      '- `useSvgLayers({ vectorizedSvgUrl })`：返回 `{ status, error, collection, runtime }`，其中 `collection.byId(id)` / `collection.byLabel(label)` 可定位真实 SVG 元素。',
      '- `SvgCanvas`：把 `document` 与 `layers` 渲染成 `<svg>`，可通过 `renderLayer` 自定义每个元素的 JSX。',
      '- `createSvgRuntime(collection)`：若需要进一步分析层，可用它创建帮助函数；默认你可以直接使用 `collection` 或 `runtime`。',
      'SVG 层中提供 `id`、`label`、`d`、`fill`、`bbox` 等字段，供你决定动画逻辑。',
    ].join('\n'),
    [
      '编写 TSX 时必须遵循：',
      '- `import { useSvgLayers, SvgCanvas } from "@runtime";`，如需访问类型可使用 `import type { SvgLayer } from "@runtime";`。与 Remotion 原生 API（`AbsoluteFill`, `Sequence`, `spring`, `interpolate` 等）自由组合。',
      '- 默认导出名为 `LogoAnimation` 的组件；显式声明 `export interface LogoAnimationProps`，并让组件参数使用该类型。',
      '- JSX 属性、字符串一律使用单引号，避免 JSON 解析错误；不要使用模板字符串包裹大段 SVG。',
      '- 如果在 `renderLayer` 等回调中使用解构，务必为参数标注类型（如 `(layer: SvgLayer)` 或 `({ layer }: { layer: SvgLayer })`）。',
      '- 禁止在 TSX 中内联原始 SVG 字符串或 `vectorizedSvgUrl` 的内容；应通过 `useSvgLayers` 获得元素，再对其做动画。',
      '- 不要引用浏览器专用对象（window/document/localStorage 等），确保代码在 Remotion Node 渲染环境下可运行。',
    ].join('\n'),
    '请充分利用 `collection.byLabel`、`collection.byId`、`layer.bbox` 等信息，为不同元素设计差异化动画，避免千篇一律。Remotion 的 `spring`、`interpolate`、`Sequence` 等 API 都可以使用。',
    '渲染时将把该文件注册为 composition，compositionId 建议为 `LogoAnimation_' + taskId + '`，默认画布大小 1920×1080、FPS 30，可根据需要调整并体现在返回的 JSON 中。',
    instructions ? `额外要求：${instructions}` : '没有额外要求。',
    `任务元数据：\n${JSON.stringify(metadata, null, 2)}`,
  ].join('\n\n');
}
