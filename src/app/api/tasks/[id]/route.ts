import { getLogoTaskWithLogs } from '@/lib/logo-tasks';
import { NextResponse, type NextRequest } from 'next/server';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;
  if (!taskId) {
    return NextResponse.json({ error: '缺少任务 ID' }, { status: 400 });
  }

  const { task, logs } = await getLogoTaskWithLogs(taskId);

  if (!task) {
    return NextResponse.json({ error: '未找到对应任务' }, { status: 404 });
  }

  return NextResponse.json({ task, logs });
}
