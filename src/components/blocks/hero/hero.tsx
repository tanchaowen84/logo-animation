'use client';

import { Ripple } from '@/components/magicui/ripple';
import { cn } from '@/lib/utils';
import { Loader2, UploadCloud } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

interface LogoTaskRecord {
  id: string;
  status: string;
  compositionId: string | null;
  compositionDurationInFrames: number | null;
  compositionFps: number | null;
  compositionWidth: number | null;
  compositionHeight: number | null;
  compositionProps: Record<string, unknown> | null;
  animationModuleUrl: string | null;
  animationModuleKey: string | null;
  renderedVideoKey: string | null;
  renderedVideoUrl: string | null;
  renderedAt: string | null;
  vectorizedFileUrl: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface LogoTaskLogEntry {
  id: string;
  taskId: string;
  level: string;
  message: string;
  details: Record<string, unknown> | null;
  createdAt: string;
}

interface GenerateAnimationResponse {
  compositionId: string;
  durationInFrames: number;
  fps: number;
  props?: Record<string, unknown>;
  width?: number;
  height?: number;
  animationModuleUrl: string;
}

interface RenderTaskResponse {
  renderedVideoUrl: string;
  renderedVideoKey: string;
}

export default function HeroSection() {
  const t = useTranslations('HomePage.hero');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [svgResult, setSvgResult] = useState<string | null>(null);
  const [meta, setMeta] = useState<{
    width: number;
    height: number;
    originalFormat: string | null;
  } | null>(null);
  const [labels, setLabels] = useState<
    Array<{
      id: string;
      label: string;
      reason?: string;
    }>
  >([]);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState<string | null>(null);
  const [taskInfo, setTaskInfo] = useState<LogoTaskRecord | null>(null);
  const [taskLogs, setTaskLogs] = useState<LogoTaskLogEntry[]>([]);
  const [instructions, setInstructions] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generationResult, setGenerationResult] = useState<GenerateAnimationResponse | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [renderResult, setRenderResult] = useState<RenderTaskResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const uploadHintClassName = useMemo(
    () =>
      cn(
        'text-sm text-muted-foreground transition-opacity',
        isLoading && 'opacity-50'
      ),
    [isLoading]
  );

  const readableStatus = useMemo(() => {
    if (!taskStatus) return '—';
    const map: Record<string, string> = {
      vectorized: '已矢量化，待生成动画',
      generating_animation: '正在生成动画代码',
      awaiting_render: '动画已生成，待渲染',
      rendering: '渲染中',
      succeeded: '已完成渲染',
      failed: '生成失败，可重试',
    };
    return map[taskStatus] ?? taskStatus;
  }, [taskStatus]);

  const fetchTaskStatus = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/tasks/${id}`);
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        const message = data?.error ?? '获取任务状态失败';
        throw new Error(message);
      }

      const data = (await response.json()) as {
        task: LogoTaskRecord;
        logs: LogoTaskLogEntry[];
      };

      setTaskInfo(data.task);
      setTaskStatus(data.task.status ?? null);
      setTaskLogs(data.logs ?? []);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : '获取任务状态失败';
      toast.error(message);
    }
  }, []);

  const handleFileUpload = useCallback(
    async (file: File | null) => {
      if (!file) {
        return;
      }

      if (!file.type.startsWith('image/')) {
      setError('仅支持图片文件');
      toast.error('请选择 PNG、JPEG 等图片格式');
      return;
    }

      setIsLoading(true);
      setError(null);
      setSvgResult(null);
      setMeta(null);
      setLabels([]);
      setTaskId(null);
      setTaskStatus(null);
      setTaskInfo(null);
      setTaskLogs([]);
      setGenerationResult(null);
      setRenderResult(null);
      setGenerationError(null);
      setRenderError(null);

      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/vectorize', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json().catch(() => null);
          const message =
            (data && typeof data.error === 'string' && data.error) ||
            '矢量化失败，请重试';
          setError(message);
          toast.error(message);
          return;
        }

        const data = (await response.json()) as {
          taskId?: string;
          svg: string;
          width: number;
          height: number;
          originalFormat: string | null;
          labels?: Array<{
            id: string;
            label: string;
            reason?: string;
          }>;
          vectorizedSvgKey?: string;
        };

        setSvgResult(data.svg);
        setMeta({
          width: data.width,
          height: data.height,
          originalFormat: data.originalFormat,
        });
        setLabels(data.labels ?? []);
        toast.success('矢量化完成，已生成分层 SVG');

        if (data.taskId) {
          setTaskId(data.taskId);
          setTaskStatus('vectorized');
          void fetchTaskStatus(data.taskId);
        }
      } catch (err) {
        console.error(err);
        const message =
          err instanceof Error ? err.message : '上传或矢量化过程中出现异常';
        setError(message);
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [fetchTaskStatus]
  );

  const handleFileInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      void handleFileUpload(file ?? null);
    },
    [handleFileUpload]
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();

      const file = event.dataTransfer.files?.[0];
      void handleFileUpload(file ?? null);
    },
    [handleFileUpload]
  );

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleCopySvg = useCallback(async () => {
    if (!svgResult) {
      return;
    }

    try {
      await navigator.clipboard.writeText(svgResult);
      toast.success('SVG 代码已复制到剪贴板');
    } catch (err) {
      console.error(err);
      toast.error('复制失败，请手动复制');
    }
  }, [svgResult]);

  const handleGenerateAnimation = useCallback(async () => {
    if (!taskId) {
      toast.error('请先上传 Logo 并完成矢量化');
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);
    setGenerationResult(null);

    try {
      const response = await fetch(`/api/tasks/${taskId}/generate-animation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instructions: instructions.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        const message = data?.error ?? '生成动画失败';
        throw new Error(message);
      }

      const data = (await response.json()) as GenerateAnimationResponse & {
        success: boolean;
      };

      setGenerationResult({
        compositionId: data.compositionId,
        durationInFrames: data.durationInFrames,
        fps: data.fps,
        props: data.props,
        width: data.width,
        height: data.height,
        animationModuleUrl: data.animationModuleUrl,
      });
      toast.success('AI 已生成动画代码');
      void fetchTaskStatus(taskId);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : '生成动画失败';
      setGenerationError(message);
      toast.error(message);
    } finally {
      setIsGenerating(false);
    }
  }, [taskId, instructions, fetchTaskStatus]);

  const handleRenderVideo = useCallback(async () => {
    if (!taskId) {
      toast.error('缺少任务 ID');
      return;
    }

    setIsRendering(true);
    setRenderError(null);
    setRenderResult(null);

    try {
      const response = await fetch(`/api/tasks/${taskId}/render`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        const message = data?.error ?? '渲染失败';
        throw new Error(message);
      }

      const data = (await response.json()) as RenderTaskResponse & { success: boolean };
      setRenderResult({
        renderedVideoKey: data.renderedVideoKey,
        renderedVideoUrl: data.renderedVideoUrl,
      });
      toast.success('渲染完成，视频已生成');
      void fetchTaskStatus(taskId);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : '渲染失败';
      setRenderError(message);
      toast.error(message);
    } finally {
      setIsRendering(false);
    }
  }, [taskId, fetchTaskStatus]);

  const handleRefreshTask = useCallback(() => {
    if (taskId) {
      void fetchTaskStatus(taskId);
    }
  }, [taskId, fetchTaskStatus]);

  return (
    <>
      <main id="hero" className="overflow-hidden">
        {/* background, light shadows on top of the hero section */}
        <div
          aria-hidden
          className="absolute inset-0 isolate hidden opacity-65 contain-strict lg:block"
        >
          <div className="w-140 h-320 -translate-y-87.5 absolute left-0 top-0 -rotate-45 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,hsla(0,0%,85%,.08)_0,hsla(0,0%,55%,.02)_50%,hsla(0,0%,45%,0)_80%)]" />
          <div className="h-320 absolute left-0 top-0 w-60 -rotate-45 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.06)_0,hsla(0,0%,45%,.02)_80%,transparent_100%)] [translate:5%_-50%]" />
          <div className="h-320 -translate-y-87.5 absolute left-0 top-0 w-60 -rotate-45 bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.04)_0,hsla(0,0%,45%,.02)_80%,transparent_100%)]" />
        </div>

        <section>
          <div className="relative pt-12">
            <div className="mx-auto max-w-7xl px-6">
              <Ripple />

              <div className="text-center sm:mx-auto lg:mr-auto lg:mt-0">
                {/* title */}
                <h1 className="mt-8 text-balance text-5xl font-bricolage-grotesque lg:mt-16 xl:text-[5rem]">
                  {t('title')}
                </h1>

                {/* description */}
                <p className="mx-auto mt-8 max-w-4xl text-balance text-lg text-muted-foreground">
                  {t('description')}
                </p>

                <div className="mt-12 flex flex-col items-center justify-center gap-6">
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    className={cn(
                      'group relative w-full max-w-4xl rounded-2xl border-2 border-dashed border-border px-8 py-12 transition-colors',
                      'hover:border-primary focus-within:border-primary',
                      isLoading && 'opacity-60 pointer-events-none'
                    )}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept="image/png,image/jpeg,image/svg+xml"
                      onChange={handleFileInputChange}
                    />

                    <div className="flex flex-col items-center gap-4 text-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                        {isLoading ? (
                          <Loader2 className="h-8 w-8 animate-spin" />
                        ) : (
                          <UploadCloud className="h-8 w-8" />
                        )}
                      </div>

                      <div className="space-y-1">
                        <p className="text-lg font-semibold">
                          上传 Logo 图片，获取分层 SVG
                        </p>
                        <p className={uploadHintClassName}>
                          支持拖拽文件到此区域，或点击选择图片
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={openFilePicker}
                        className={cn(
                          'rounded-full border border-border px-4 py-2 text-sm font-medium transition-colors',
                          'hover:border-primary hover:text-primary'
                        )}
                      >
                        选择文件
                      </button>
                    </div>
                  </div>

                  {error && (
                    <p className="text-sm text-destructive text-center">{error}</p>
                  )}

                  {svgResult && (
                    <div className="w-full max-w-4xl rounded-2xl border border-border bg-card p-6">
                      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">
                          分层 SVG 结果
                        </span>
                        {meta && (
                          <>
                            <span>
                              大小：{meta.width} × {meta.height}
                            </span>
                            {meta.originalFormat ? (
                              <span>原始格式：{meta.originalFormat.toUpperCase()}</span>
                            ) : null}
                          </>
                        )}
                      </div>

                      <div className="grid gap-6 md:grid-cols-2">
                        <div className="bg-muted/40 rounded-xl border border-border/50 p-4">
                          <div
                            className="mx-auto flex max-h-[420px] max-w-full items-center justify-center overflow-auto"
                            dangerouslySetInnerHTML={{ __html: svgResult }}
                          />
                        </div>

                        <div className="flex flex-col">
                          <div className="mb-3 flex items-center justify-between text-sm text-muted-foreground">
                            <span>SVG 代码</span>
                            <button
                              type="button"
                              onClick={handleCopySvg}
                              className={cn(
                                'rounded-md border border-border px-3 py-1 text-xs font-medium transition-colors',
                                'hover:border-primary hover:text-primary'
                              )}
                            >
                              复制
                            </button>
                          </div>
                          <pre className="h-[420px] overflow-auto rounded-xl border border-border/60 bg-muted/20 p-4 text-xs font-mono leading-relaxed text-foreground">
                            {svgResult}
                          </pre>
                        </div>
                      </div>

                      {labels.length > 0 && (
                        <div className="mt-6">
                          <div className="mb-3 text-sm font-medium text-foreground">
                            AI 语义标签
                          </div>
                          <div className="max-h-72 overflow-auto rounded-xl border border-border/60">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-muted/40 text-muted-foreground uppercase tracking-wide">
                                <tr>
                                  <th className="px-4 py-2">ID</th>
                                  <th className="px-4 py-2">标签</th>
                                  <th className="px-4 py-2">理由</th>
                                </tr>
                              </thead>
                              <tbody>
                                {labels.map((item) => (
                                  <tr key={item.id} className="border-t border-border/40 text-foreground">
                                    <td className="px-4 py-2 font-mono">{item.id}</td>
                                    <td className="px-4 py-2">{item.label}</td>
                                    <td className="px-4 py-2 text-muted-foreground">
                                      {item.reason ?? '—'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {taskId && (
                        <div className="mt-8 space-y-6">
                          <div className="rounded-xl border border-border/60 bg-muted/10 p-4 text-left">
                            <div className="flex flex-wrap items-center gap-3">
                              <div>
                                <div className="text-xs text-muted-foreground">任务 ID</div>
                                <div className="font-mono text-sm text-foreground">{taskId}</div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">当前状态</div>
                                <div className="text-sm font-medium text-foreground">{readableStatus}</div>
                              </div>
                              <button
                                type="button"
                                onClick={handleRefreshTask}
                                className="ml-auto rounded-md border border-border px-3 py-1 text-xs font-medium transition-colors hover:border-primary hover:text-primary"
                              >
                                刷新状态
                              </button>
                            </div>

                            {taskInfo?.renderedVideoUrl ? (
                              <div className="mt-3 text-sm">
                                <span className="text-muted-foreground">最新渲染视频：</span>
                                <a
                                  href={taskInfo.renderedVideoUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-primary underline-offset-4 hover:underline"
                                >
                                  打开视频
                                </a>
                              </div>
                            ) : null}
                          </div>

                          <div className="grid gap-6 md:grid-cols-2">
                            <div className="rounded-xl border border-border/60 bg-muted/10 p-4">
                              <div className="mb-3 flex items-center justify-between">
                                <h3 className="text-sm font-medium text-foreground">
                                  步骤 2：AI 生成动画代码
                                </h3>
                              </div>
                              <label className="mb-2 block text-xs font-medium text-muted-foreground">
                                可选提示词（影响动画风格）
                              </label>
                              <textarea
                                value={instructions}
                                onChange={(event) => setInstructions(event.target.value)}
                                placeholder="例如：强调品牌主色的渐变，加入描边抖动"
                                className="min-h-[120px] w-full resize-y rounded-lg border border-border bg-background p-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                              />
                              <div className="mt-3 flex flex-col gap-2">
                                <button
                                  type="button"
                                  onClick={handleGenerateAnimation}
                                  disabled={isGenerating || taskStatus === 'generating_animation'}
                                  className={cn(
                                    'inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                                    'border-border hover:border-primary hover:text-primary',
                                    (isGenerating || taskStatus === 'generating_animation') &&
                                      'pointer-events-none opacity-60'
                                  )}
                                >
                                  {isGenerating || taskStatus === 'generating_animation'
                                    ? '生成中...'
                                    : '生成动画代码'}
                                </button>
                                {generationError && (
                                  <p className="text-xs text-destructive">{generationError}</p>
                                )}
                                {(generationResult || taskInfo?.compositionId) && (
                                  <div className="rounded-lg border border-border/50 bg-background p-3 text-xs">
                                    <div className="font-medium text-foreground">动画信息</div>
                                    <ul className="mt-2 space-y-1 text-muted-foreground">
                                      <li>
                                        Composition ID：
                                        <span className="font-mono text-foreground">
                                          {generationResult?.compositionId ?? taskInfo?.compositionId}
                                        </span>
                                      </li>
                                      <li>
                                        Duration × FPS：
                                        <span className="font-mono text-foreground">
                                          {(generationResult?.durationInFrames ?? taskInfo?.compositionDurationInFrames) ?? '—'}
                                          {' '}帧 @{' '}
                                          {(generationResult?.fps ?? taskInfo?.compositionFps) ?? '—'} fps
                                        </span>
                                      </li>
                                      <li>
                                        画布尺寸：
                                        <span className="font-mono text-foreground">
                                          {(generationResult?.width ?? taskInfo?.compositionWidth ?? 1920)} ×
                                          {' '}
                                          {(generationResult?.height ?? taskInfo?.compositionHeight ?? 1080)}
                                        </span>
                                      </li>
                                    </ul>
                                    <div className="mt-2">
                                      <div className="text-xs font-medium text-foreground">默认 Props</div>
                                      <pre className="mt-1 max-h-36 overflow-auto rounded-md border border-border/40 bg-muted/40 p-2 text-[11px] leading-relaxed">
                                        {JSON.stringify(
                                          generationResult?.props ?? taskInfo?.compositionProps ?? {},
                                          null,
                                          2
                                        )}
                                      </pre>
                                      {(generationResult?.animationModuleUrl ?? taskInfo?.animationModuleUrl) && (
                                        <div className="mt-2 text-xs text-muted-foreground">
                                          源码位置：{' '}
                                          <a
                                            href={generationResult?.animationModuleUrl ?? taskInfo?.animationModuleUrl ?? undefined}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-primary underline-offset-4 hover:underline"
                                          >
                                            打开 TSX
                                          </a>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="rounded-xl border border-border/60 bg-muted/10 p-4">
                              <div className="mb-3 flex items-center justify-between">
                                <h3 className="text-sm font-medium text-foreground">
                                  步骤 3：渲染视频
                                </h3>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                将生成的 Remotion 组件渲染为 MP4（H.264）。渲染完成后会自动上传至存储并返回下载链接。
                              </p>
                              <div className="mt-3 flex flex-col gap-2">
                                <button
                                  type="button"
                                  onClick={handleRenderVideo}
                                  disabled={
                                    isRendering ||
                                    taskStatus === 'rendering' ||
                                    !taskInfo?.compositionId ||
                                    !taskInfo?.animationModuleUrl
                                  }
                                  className={cn(
                                    'inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                                    'border-border hover:border-primary hover:text-primary',
                                    (isRendering ||
                                      taskStatus === 'rendering' ||
                                      !taskInfo?.compositionId ||
                                      !taskInfo?.animationModuleUrl) &&
                                      'pointer-events-none opacity-60'
                                  )}
                                >
                                  {isRendering || taskStatus === 'rendering'
                                    ? '渲染中...'
                                    : '渲染视频'}
                                </button>
                                {renderError && (
                                  <p className="text-xs text-destructive">{renderError}</p>
                                )}
                                {(renderResult || taskInfo?.renderedVideoUrl) && (
                                  <div className="rounded-lg border border-border/50 bg-background p-3 text-xs">
                                    <div className="font-medium text-foreground">渲染结果</div>
                                    <div className="mt-2 space-y-1 text-muted-foreground">
                                      <div>
                                        视频链接：{' '}
                                        <a
                                          href={renderResult?.renderedVideoUrl ?? taskInfo?.renderedVideoUrl ?? undefined}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-primary underline-offset-4 hover:underline"
                                        >
                                          打开视频
                                        </a>
                                      </div>
                                      <div>
                                        存储 Key：
                                        <span className="font-mono text-foreground">
                                          {renderResult?.renderedVideoKey ?? taskInfo?.renderedVideoKey ?? '—'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {taskLogs.length > 0 && (
                            <div className="rounded-xl border border-border/60 bg-muted/10 p-4">
                              <div className="mb-3 flex items-center justify-between">
                                <h3 className="text-sm font-medium text-foreground">任务日志</h3>
                                <span className="text-xs text-muted-foreground">
                                  最新 {taskLogs.length} 条
                                </span>
                              </div>
                              <div className="space-y-3">
                                {taskLogs.map((log) => (
                                  <div key={log.id} className="rounded-lg border border-border/40 bg-background p-3 text-xs">
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium text-foreground">{log.message}</span>
                                      <span className="text-muted-foreground">
                                        {new Date(log.createdAt).toLocaleString()}
                                      </span>
                                    </div>
                                    <div className="mt-1 flex items-center gap-2 text-muted-foreground">
                                      <span className="uppercase tracking-wide">{log.level}</span>
                                    </div>
                                    {log.details && Object.keys(log.details).length > 0 ? (
                                      <pre className="mt-2 max-h-36 overflow-auto rounded-md border border-border/30 bg-muted/20 p-2 text-[11px] leading-relaxed text-muted-foreground">
                                        {JSON.stringify(log.details, null, 2)}
                                      </pre>
                                    ) : null}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* images */}
            <div>
              <div className="relative -mr-56 mt-8 overflow-hidden px-2 sm:mr-0 sm:mt-12 md:mt-20">
                <div
                  aria-hidden
                  className="bg-linear-to-b to-background absolute inset-0 z-10 from-transparent from-35%"
                />
                <div className="inset-shadow-2xs ring-background dark:inset-shadow-white/20 bg-background relative mx-auto max-w-6xl overflow-hidden rounded-2xl border p-4 shadow-lg shadow-zinc-950/15 ring-1">
                  <Image
                    className="z-2 border-border/25 relative rounded-2xl border"
                    src="https://cdn.flowchartai.org/static/blocks/demo.png"
                    alt="FlowChart AI Demo"
                    width={2796}
                    height={2008}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
