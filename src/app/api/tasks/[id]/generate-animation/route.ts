import { appendLogoTaskLog, getLogoTaskById, updateLogoTask } from '@/lib/logo-tasks';
import { getOpenRouterClient } from '@/lib/ai';
import { upsertManifestEntry } from '@/lib/remotion/manifest';
import { invalidateRemotionBundle } from '@/lib/remotion/bundle';
import fs from 'fs/promises';
import path from 'path';
import { NextResponse, type NextRequest } from 'next/server';
import ts from 'typescript';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface GenerateAnimationRequestBody {
  instructions?: string;
}

interface AnimationModelResponse {
  tsx: string;
  compositionId: string;
  durationInFrames: number;
  fps: number;
  props?: Record<string, unknown>;
  width?: number;
  height?: number;
}

const GENERATED_DIR = path.join(process.cwd(), 'remotion', 'generated');
const REMOTION_PROMPT_PATH = path.join(process.cwd(), 'remotion-system-prompt.md');
let cachedSystemPrompt: string | null = null;

async function loadSystemPrompt(): Promise<string> {
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

function stripCodeFences(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('```')) {
    const fenceEnd = trimmed.indexOf('\n');
    const withoutStart = fenceEnd === -1 ? trimmed : trimmed.slice(fenceEnd + 1);
    const closingIndex = withoutStart.lastIndexOf('```');
    return closingIndex === -1 ? withoutStart.trim() : withoutStart.slice(0, closingIndex).trim();
  }
  return trimmed;
}

function parseModelResponse(content: string): AnimationModelResponse {
  const cleaned = stripCodeFences(content);
  const parsed = JSON.parse(cleaned) as AnimationModelResponse;
  parsed.durationInFrames = Number(parsed.durationInFrames);
  parsed.fps = Number(parsed.fps);
  parsed.width = parsed.width !== undefined ? Number(parsed.width) : undefined;
  parsed.height = parsed.height !== undefined ? Number(parsed.height) : undefined;

  if (
    !parsed.tsx ||
    !parsed.compositionId ||
    Number.isNaN(parsed.durationInFrames) ||
    Number.isNaN(parsed.fps) ||
    parsed.durationInFrames <= 0 ||
    parsed.fps <= 0
  ) {
    throw new Error('模型返回的 JSON 缺少必需字段 (tsx/compositionId/durationInFrames/fps)。');
  }

  if (parsed.width !== undefined && (Number.isNaN(parsed.width) || parsed.width <= 0)) {
    throw new Error('模型返回的宽度不合法。');
  }
  if (parsed.height !== undefined && (Number.isNaN(parsed.height) || parsed.height <= 0)) {
    throw new Error('模型返回的高度不合法。');
  }

  return parsed;
}

async function ensureGeneratedDir() {
  await fs.mkdir(GENERATED_DIR, { recursive: true });
}

async function writeAnimationFile(taskId: string, tsxSource: string): Promise<string> {
  await ensureGeneratedDir();
  const filePath = path.join(GENERATED_DIR, `${taskId}.tsx`);
  await fs.writeFile(filePath, tsxSource, 'utf-8');
  return filePath;
}

function getTsConfig(): { options: ts.CompilerOptions; fileNames: string[] } {
  const configPath = ts.findConfigFile(process.cwd(), ts.sys.fileExists, 'tsconfig.json');
  if (!configPath) {
    throw new Error('未找到 tsconfig.json，无法执行类型检查。');
  }
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  if (configFile.error) {
    const message = ts.formatDiagnosticsWithColorAndContext([configFile.error], {
      getCanonicalFileName: (fileName) => fileName,
      getCurrentDirectory: ts.sys.getCurrentDirectory,
      getNewLine: () => ts.sys.newLine,
    });
    throw new Error(`读取 tsconfig.json 失败：\n${message}`);
  }
  const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, path.dirname(configPath));
  return { options: parsed.options, fileNames: parsed.fileNames };
}

function validateTsxFile(filePath: string) {
  const { options } = getTsConfig();
  const program = ts.createProgram({ rootNames: [filePath], options });
  const diagnostics = ts.getPreEmitDiagnostics(program);
  if (diagnostics.length > 0) {
    const formatted = ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCanonicalFileName: (fileName) => fileName,
      getCurrentDirectory: ts.sys.getCurrentDirectory,
      getNewLine: () => ts.sys.newLine,
    });
    throw new Error(`类型检查失败：\n${formatted}`);
  }
}

function buildUserPrompt({
  taskId,
  svg,
  labels,
  width,
  height,
  originalFormat,
  vectorizedFileUrl,
  instructions,
}: {
  taskId: string;
  svg: string;
  labels: unknown;
  width: number | null;
  height: number | null;
  originalFormat: string | null;
  vectorizedFileUrl: string | null;
  instructions?: string;
}): string {
  const metadata = {
    taskId,
    dimensions: { width, height },
    originalFormat,
    vectorizedFileUrl,
    labels,
  };

  return [
    '请根据以下任务上下文生成 Remotion 动画组件，输出 JSON 对象 {"tsx": string, "compositionId": string, "durationInFrames": number, "fps": number, "props"?: object, "width"?: number, "height"?: number }。',
    '编写的 TSX 必须：\n- 仅使用 remotion 官方导出的 API；\n- 默认导出名为 LogoAnimation 的 React 组件；\n- 组件 props 需要通过声明 `export interface LogoAnimationProps` 并与 props JSON 对应；\n- 不使用项目别名导入（避免 @/ 前缀），可以自由创建内部辅助函数；\n- 不要引用浏览器或 Node 特定的全局对象（如 window/document/process）；\n- 不使用随机数或当前时间，保持确定性。',
    '渲染时将把该文件注册为 composition，compositionId 建议为 `LogoAnimation_' + taskId + '`，默认画布大小 1920×1080、FPS 30，可根据需要调整并体现在返回的 JSON 中。',
    instructions ? `额外要求：${instructions}` : '没有额外要求。',
    `任务元数据：\n${JSON.stringify(metadata, null, 2)}`,
    '矢量化 SVG：```svg\n' + svg + '\n```',
  ].join('\n\n');
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const taskId = params.id;
  if (!taskId) {
    return NextResponse.json({ error: '缺少任务 ID' }, { status: 400 });
  }

  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json({ error: '未配置 OPENROUTER_API_KEY，无法调用模型。' }, { status: 500 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as GenerateAnimationRequestBody;
    const task = await getLogoTaskById(taskId);

    if (!task) {
      return NextResponse.json({ error: '未找到对应任务' }, { status: 404 });
    }

    if (!task.vectorizedSvg) {
      return NextResponse.json({ error: '任务尚未完成矢量化，无法生成动画。' }, { status: 400 });
    }

    await updateLogoTask(taskId, { status: 'generating_animation' });

    const prompt = buildUserPrompt({
      taskId,
      svg: task.vectorizedSvg,
      labels: task.labels,
      width: task.width,
      height: task.height,
      originalFormat: task.originalFormat,
      vectorizedFileUrl: task.vectorizedFileUrl,
      instructions: body.instructions,
    });

    const client = getOpenRouterClient();
    const systemPrompt = await loadSystemPrompt();
    const model = process.env.OPENROUTER_LOGO_ANIMATION_MODEL ?? 'google/gemini-2.5-flash';

    const completion = await client.chat.completions.create({
      model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('模型没有返回内容。');
    }

    const modelResult = parseModelResponse(content);
    const compositionWidth = Math.round(modelResult.width ?? 1920);
    const compositionHeight = Math.round(modelResult.height ?? 1080);

    const filePath = await writeAnimationFile(taskId, modelResult.tsx);
    validateTsxFile(filePath);

    await updateLogoTask(taskId, {
      status: 'awaiting_render',
      compositionId: modelResult.compositionId,
      compositionDurationInFrames: modelResult.durationInFrames,
      compositionFps: modelResult.fps,
      compositionWidth,
      compositionHeight,
      compositionProps: modelResult.props ?? {},
      animationFilePath: path.relative(process.cwd(), filePath),
    });

    const modulePath = path
      .relative(path.join(process.cwd(), 'remotion', 'generated'), filePath)
      .replace(/\\/g, '/');
    await upsertManifestEntry({
      taskId,
      compositionId: modelResult.compositionId,
      modulePath,
      durationInFrames: modelResult.durationInFrames,
      fps: modelResult.fps,
      width: compositionWidth,
      height: compositionHeight,
      defaultProps: modelResult.props ?? {},
    });
    invalidateRemotionBundle();

    await appendLogoTaskLog({
      taskId,
      level: 'info',
      message: 'AI 已生成动画代码',
      details: {
        model,
        compositionId: modelResult.compositionId,
        durationInFrames: modelResult.durationInFrames,
        fps: modelResult.fps,
      },
    });

    return NextResponse.json({
      success: true,
      compositionId: modelResult.compositionId,
      durationInFrames: modelResult.durationInFrames,
      fps: modelResult.fps,
      props: modelResult.props ?? {},
      animationFilePath: path.relative(process.cwd(), filePath),
      width: compositionWidth,
      height: compositionHeight,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '生成动画失败';
    await appendLogoTaskLog({
      taskId,
      level: 'error',
      message: '生成动画失败',
      details: {
        error: message,
      },
    }).catch(() => {});
    await updateLogoTask(taskId, { status: 'vectorized' }).catch(() => {});

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
