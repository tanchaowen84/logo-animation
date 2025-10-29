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
    '编写的 TSX 必须：\n- 仅使用 remotion 官方导出的 API；\n- 默认导出名为 LogoAnimation 的 React 组件；\n- 必须声明 `export interface LogoAnimationProps`，并确保组件参数显式注解为 `(props: LogoAnimationProps)` 或 `({prop}: LogoAnimationProps)`；\n- JSX 属性和字符串全部使用单引号，这样 JSON 中无需额外转义；\n- 不使用项目别名导入（避免 @/ 前缀），可以自由创建内部辅助函数；\n- 不要引用浏览器或 Node 特定的全局对象（如 window/document/process）；\n- 不使用随机数或当前时间，保持确定性；\n- 严格禁止在 TSX 中内联原始 SVG 字符串或任何大型原始资源。如需引用资源，使用 `vectorizedSvgUrl` 在运行时加载。',
    '矢量化结果可通过 URL 访问：请在运行时按需请求该地址（例如 fetch 或 Remotion Asset），不要将其内容粘贴到返回的代码中。',
    '渲染时将把该文件注册为 composition，compositionId 建议为 `LogoAnimation_' + taskId + '`，默认画布大小 1920×1080、FPS 30，可根据需要调整并体现在返回的 JSON 中。',
    instructions ? `额外要求：${instructions}` : '没有额外要求。',
    `任务元数据：\n${JSON.stringify(metadata, null, 2)}`,
  ].join('\n\n');
}
