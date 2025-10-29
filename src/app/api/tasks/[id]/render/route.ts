import { appendLogoTaskLog, getLogoTaskById, updateLogoTask } from '@/lib/logo-tasks';
import { renderComposition, invalidateRemotionBundle } from '@/lib/remotion/bundle';
import { ensureManifestFiles, removeManifestEntry, upsertManifestEntry } from '@/lib/remotion/manifest';
import fs from 'fs/promises';
import path from 'path';
import { NextResponse, type NextRequest } from 'next/server';
import { uploadFile } from '@/storage';
import { StorageError } from '@/storage/types';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;

  if (!taskId) {
    return NextResponse.json({ error: '缺少任务 ID' }, { status: 400 });
  }

  const task = await getLogoTaskById(taskId);
  if (!task) {
    return NextResponse.json({ error: '未找到对应任务' }, { status: 404 });
  }

  if (!task.compositionId || !task.animationModuleUrl) {
    return NextResponse.json({ error: '该任务尚未生成动画代码，无法渲染。' }, { status: 400 });
  }

  const compositionProps = (task.compositionProps ?? {}) as Record<string, unknown>;
  let tempOutputPath: string | null = null;
  let localModulePath: string | null = null;

  try {
    await updateLogoTask(taskId, { status: 'rendering' });

    const generatedDir = path.join(process.cwd(), 'remotion', 'generated');
    await fs.mkdir(generatedDir, { recursive: true });
    await ensureManifestFiles();

    localModulePath = path.join(generatedDir, `${taskId}.tsx`);
    const moduleResponse = await fetch(task.animationModuleUrl);
    if (!moduleResponse.ok) {
      throw new Error('无法下载动画组件源码');
    }
    const moduleSource = await moduleResponse.text();
    await fs.writeFile(localModulePath, moduleSource, 'utf-8');

    const moduleRelativePath = path
      .relative(generatedDir, localModulePath)
      .replace(/\\/g, '/');
    await upsertManifestEntry({
      taskId,
      compositionId: task.compositionId,
      modulePath: moduleRelativePath,
      durationInFrames: task.compositionDurationInFrames ?? 150,
      fps: task.compositionFps ?? 30,
      width: task.compositionWidth ?? 1920,
      height: task.compositionHeight ?? 1080,
      defaultProps: (task.compositionProps ?? {}) as Record<string, unknown>,
    });
    invalidateRemotionBundle();

    const renderResult = await renderComposition({
      compositionId: task.compositionId,
      inputProps: compositionProps,
    });

    tempOutputPath = renderResult.outputLocation;

    const videoBuffer = await fs.readFile(renderResult.outputLocation);
    const folder = `logo-tasks/${taskId}`;
    const fileName = `${taskId}-${Date.now()}.mp4`;
    const uploadResult = await uploadFile(videoBuffer, fileName, 'video/mp4', folder);

    await updateLogoTask(taskId, {
      status: 'succeeded',
      renderedVideoKey: uploadResult.key,
      renderedVideoUrl: uploadResult.url,
      renderedAt: new Date(),
    });

    await appendLogoTaskLog({
      taskId,
      level: 'info',
      message: '视频渲染完成',
      details: {
        compositionId: task.compositionId,
        durationInFrames: renderResult.compositionDurationInFrames,
        fps: renderResult.compositionFps,
        width: renderResult.compositionWidth,
        height: renderResult.compositionHeight,
        outputKey: uploadResult.key,
      },
    });

    return NextResponse.json({
      success: true,
      renderedVideoUrl: uploadResult.url,
      renderedVideoKey: uploadResult.key,
    });
  } catch (error) {
    const message =
      error instanceof StorageError
        ? '文件存储未正确配置，请联系管理员。'
        : error instanceof Error
          ? error.message
          : '渲染任务失败';

    await appendLogoTaskLog({
      taskId,
      level: 'error',
      message: '视频渲染失败',
      details: {
        error: message,
      },
    }).catch(() => {});

    await updateLogoTask(taskId, { status: 'awaiting_render' }).catch(() => {});

    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    if (tempOutputPath) {
      try {
        const tempDir = path.dirname(tempOutputPath);
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch (cleanupError) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('清理渲染临时文件失败:', cleanupError);
        }
      }
    }
    if (localModulePath) {
      try {
        await fs.rm(localModulePath, { force: true });
      } catch (cleanupError) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('删除临时动画模块失败:', cleanupError);
        }
      }
      await removeManifestEntry(taskId).catch(() => {});
      invalidateRemotionBundle();
    }
  }
}
