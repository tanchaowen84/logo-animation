import { getDb } from '@/db';
import { logoTask, logoTaskLog } from '@/db/schema';
import type { InferInsertModel } from 'drizzle-orm';
import { eq, desc } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export type LogoTaskStatus =
  | 'vectorized'
  | 'generating_animation'
  | 'awaiting_render'
  | 'rendering'
  | 'succeeded'
  | 'failed';

export interface LogoTaskFileRef {
  key: string;
  url?: string | null;
}

export interface CreateLogoTaskParams {
  id?: string;
  userId?: string | null;
  status?: LogoTaskStatus;
  original: LogoTaskFileRef;
  vectorized?: LogoTaskFileRef | null;
  vectorizedSvg?: string | null;
  vectorizedSvgKey?: string | null;
  labels?: Array<Record<string, unknown>>;
  width?: number | null;
  height?: number | null;
  originalFormat?: string | null;
  metadata?: Record<string, unknown> | null;
}

type LogoTaskInsert = InferInsertModel<typeof logoTask>;

export async function createLogoTask(
  params: CreateLogoTaskParams
): Promise<string> {
  const db = await getDb();
  const id = params.id ?? randomUUID();

  const row: LogoTaskInsert = {
    id,
    userId: params.userId ?? null,
    status: params.status ?? 'vectorized',
    originalFileKey: params.original.key,
    originalFileUrl: params.original.url ?? null,
    vectorizedFileKey: params.vectorized?.key ?? null,
    vectorizedFileUrl: params.vectorized?.url ?? null,
    vectorizedSvg: params.vectorizedSvg ?? null,
    metadata: {
      ...(params.metadata ?? {}),
      ...(params.vectorizedSvgKey
        ? { vectorizedSvgKey: params.vectorizedSvgKey }
        : {}),
    },
    labels: params.labels ?? [],
    width: params.width ?? null,
    height: params.height ?? null,
    originalFormat: params.originalFormat ?? null,
    compositionId: null,
    compositionDurationInFrames: null,
    compositionFps: null,
    compositionWidth: null,
    compositionHeight: null,
    compositionProps: {},
    animationModuleUrl: null,
    animationModuleKey: null,
    renderedVideoKey: null,
    renderedVideoUrl: null,
    renderedAt: null,
  };

  await db.insert(logoTask).values(row);
  return id;
}

export async function updateLogoTask(
  id: string,
  updates: Partial<Omit<LogoTaskInsert, 'id'> & { updatedAt?: Date }>
) {
  const db = await getDb();
  await db
    .update(logoTask)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(logoTask.id, id));
}

export async function getLogoTaskById(id: string) {
  const db = await getDb();
  const rows = await db.select().from(logoTask).where(eq(logoTask.id, id));
  return rows[0] ?? null;
}

export async function getLogoTaskLogs(taskId: string, limit = 50) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(logoTaskLog)
    .where(eq(logoTaskLog.taskId, taskId))
    .orderBy(desc(logoTaskLog.createdAt))
    .limit(limit);
  return rows;
}

export async function getLogoTaskWithLogs(taskId: string) {
  const [task, logs] = await Promise.all([
    getLogoTaskById(taskId),
    getLogoTaskLogs(taskId),
  ]);
  return { task, logs };
}

export interface AppendTaskLogParams {
  taskId: string;
  level?: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  details?: Record<string, unknown> | null;
}

export async function appendLogoTaskLog({
  taskId,
  level = 'info',
  message,
  details,
}: AppendTaskLogParams) {
  const db = await getDb();
  await db.insert(logoTaskLog).values({
    id: randomUUID(),
    taskId,
    level,
    message,
    details: details ?? {},
  });
}
