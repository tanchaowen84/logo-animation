import { appendLogoTaskLog, getLogoTaskById, updateLogoTask } from '@/lib/logo-tasks';
import { getOpenRouterClient } from '@/lib/ai';
import { NextResponse, type NextRequest } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import ts from 'typescript';
import { uploadFile } from '@/storage';
import { buildAnimationPrompt, loadAnimationSystemPrompt } from '@/lib/remotion/prompt';
import { animationResponseSchema } from '@/lib/remotion/response-schema';

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

  if (parsed.props === null || parsed.props === undefined) {
    parsed.props = {};
  }

  return parsed;
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
  const { options, fileNames } = getTsConfig();
  const rootNames = Array.from(new Set([...(fileNames ?? []), filePath]));
  const program = ts.createProgram({
    rootNames,
    options: {
      ...options,
      incremental: false,
      composite: false,
      tsBuildInfoFile: undefined,
      outDir: undefined,
      declaration: false,
      emitDeclarationOnly: false,
      noEmit: true,
      allowSyntheticDefaultImports: true,
      esModuleInterop: true,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      module: ts.ModuleKind.ESNext,
      jsx: options.jsx ?? ts.JsxEmit.ReactJSX,
      allowImportingTsExtensions: true,
      baseUrl: options.baseUrl ?? process.cwd(),
      paths: {
        ...(options.paths ?? {}),
        '@runtime': ['remotion/runtime/index.ts'],
        '@runtime/*': ['remotion/runtime/*'],
        '../runtime': ['remotion/runtime/index.ts'],
        '../runtime/*': ['remotion/runtime/*'],
      },
    },
  });
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;
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

    if (!task.vectorizedFileUrl) {
      return NextResponse.json({ error: '任务尚未完成矢量化，无法生成动画。' }, { status: 400 });
    }

    await updateLogoTask(taskId, { status: 'generating_animation' });

    const vectorizedSvgUrl = task.vectorizedFileUrl!;

    const prompt = buildAnimationPrompt({
      taskId,
      vectorizedSvgUrl,
      labels: task.labels,
      width: task.width,
      height: task.height,
      originalFormat: task.originalFormat,
      instructions: body.instructions,
    });

    const client = getOpenRouterClient();
    const systemPrompt = await loadAnimationSystemPrompt();
    const model = process.env.OPENROUTER_LOGO_ANIMATION_MODEL ?? 'google/gemini-2.5-flash';

    const completion = await client.chat.completions.create({
      model,
      temperature: 0.2,
      response_format: {
        type: 'json_schema',
        json_schema: animationResponseSchema,
      },
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
    const mergedProps = {
      vectorizedSvgUrl,
      ...(modelResult.props ?? {}),
    };
    const normalizedTsx = modelResult.tsx.replace(/from ['"]\.\.\/runtime(\/)?/g, (match, slash) => {
      return `from '@runtime${slash ?? ''}`;
    });
    const compositionWidth = Math.round(modelResult.width ?? 1920);
    const compositionHeight = Math.round(modelResult.height ?? 1080);

    const tempDir = path.join(process.cwd(), 'remotion', '.temp', taskId);
    await fs.mkdir(tempDir, { recursive: true });
    const tempFilePath = path.join(tempDir, `${taskId}.tsx`);

    try {
      await fs.writeFile(tempFilePath, normalizedTsx, 'utf-8');
      validateTsxFile(tempFilePath);

      const moduleFolder = `logo-tasks/${taskId}/animation`;
      const moduleUpload = await uploadFile(
        Buffer.from(normalizedTsx, 'utf-8'),
        `${taskId}.tsx`,
        'text/plain',
        moduleFolder
      );

      await updateLogoTask(taskId, {
        status: 'awaiting_render',
        compositionId: modelResult.compositionId,
        compositionDurationInFrames: modelResult.durationInFrames,
        compositionFps: modelResult.fps,
        compositionWidth,
        compositionHeight,
        compositionProps: mergedProps,
        animationModuleUrl: moduleUpload.url,
        animationModuleKey: moduleUpload.key,
      });

      await appendLogoTaskLog({
        taskId,
        level: 'info',
        message: 'AI 已生成动画代码',
        details: {
          model,
          compositionId: modelResult.compositionId,
          durationInFrames: modelResult.durationInFrames,
          fps: modelResult.fps,
          moduleKey: moduleUpload.key,
        },
      });

      return NextResponse.json({
        success: true,
        compositionId: modelResult.compositionId,
        durationInFrames: modelResult.durationInFrames,
        fps: modelResult.fps,
        props: mergedProps,
        width: compositionWidth,
        height: compositionHeight,
        animationModuleUrl: moduleUpload.url,
      });
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
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
