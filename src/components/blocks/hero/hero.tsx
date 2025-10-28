'use client';

import { Ripple } from '@/components/magicui/ripple';
import { cn } from '@/lib/utils';
import { Loader2, UploadCloud } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { useCallback, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

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
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const uploadHintClassName = useMemo(
    () =>
      cn(
        'text-sm text-muted-foreground transition-opacity',
        isLoading && 'opacity-50'
      ),
    [isLoading]
  );

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
          svg: string;
          width: number;
          height: number;
          originalFormat: string | null;
          labels?: Array<{
            id: string;
            label: string;
            reason?: string;
          }>;
        };

        setSvgResult(data.svg);
        setMeta({
          width: data.width,
          height: data.height,
          originalFormat: data.originalFormat,
        });
        setLabels(data.labels ?? []);
        toast.success('矢量化完成，已生成分层 SVG');
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
    []
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
