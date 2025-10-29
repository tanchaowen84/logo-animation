import { getLogoTaskById } from '@/lib/logo-tasks';
import { getOpenRouterClient } from '@/lib/ai';
import { buildAnimationPrompt, loadAnimationSystemPrompt } from '@/lib/remotion/prompt';
import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;
  const instructions = request.nextUrl.searchParams.get('instructions') ?? undefined;

  if (!taskId) {
    return new Response('event: error\ndata: 缺少任务 ID\n\n', {
      headers: {
        'Content-Type': 'text/event-stream',
        Connection: 'keep-alive',
        'Cache-Control': 'no-cache, no-transform',
      },
      status: 400,
    });
  }

  if (!process.env.OPENROUTER_API_KEY) {
    return new Response('event: error\ndata: 未配置 OPENROUTER_API_KEY\n\n', {
      headers: {
        'Content-Type': 'text/event-stream',
        Connection: 'keep-alive',
        'Cache-Control': 'no-cache, no-transform',
      },
      status: 500,
    });
  }

  const task = await getLogoTaskById(taskId);
  if (!task) {
    return new Response('event: error\ndata: 未找到对应任务\n\n', {
      headers: {
        'Content-Type': 'text/event-stream',
        Connection: 'keep-alive',
        'Cache-Control': 'no-cache, no-transform',
      },
      status: 404,
    });
  }

  if (!task.vectorizedFileUrl) {
    return new Response('event: error\ndata: 任务尚未完成矢量化\n\n', {
      headers: {
        'Content-Type': 'text/event-stream',
        Connection: 'keep-alive',
        'Cache-Control': 'no-cache, no-transform',
      },
      status: 400,
    });
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const encoder = new TextEncoder();
        const client = getOpenRouterClient();
        const systemPrompt = await loadAnimationSystemPrompt();
        const vectorizedSvgUrl = task.vectorizedFileUrl!;
        const prompt = buildAnimationPrompt({
          taskId,
          vectorizedSvgUrl,
          labels: task.labels,
          width: task.width,
          height: task.height,
          originalFormat: task.originalFormat,
          instructions,
        });

        controller.enqueue(
          encoder.encode(`event: status\ndata: 开始向模型请求, taskId=${taskId}\n\n`)
        );

        const completion = await client.chat.completions.create({
          model: process.env.OPENROUTER_LOGO_ANIMATION_MODEL ?? 'google/gemini-2.5-flash',
          temperature: 0.2,
          response_format: { type: 'json_object' },
          stream: true,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
        });

        const abortHandler = () => {
          controller.enqueue(encoder.encode('event: end\ndata: aborted\n\n'));
          controller.close();
        };
        if (request.signal.aborted) {
          abortHandler();
          return;
        }
        request.signal.addEventListener('abort', abortHandler, { once: true });

        for await (const part of completion) {
          const delta = part.choices[0]?.delta?.content;
          if (delta) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(delta)}\n\n`));
          }
        }

        request.signal.removeEventListener('abort', abortHandler);

        controller.enqueue(encoder.encode('event: end\ndata: done\n\n'));
        controller.close();
      } catch (error) {
        const encoder = new TextEncoder();
        const message = error instanceof Error ? error.message : '未知错误';
        controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify(message)}\n\n`));
        controller.close();
      }
    },
    cancel() {
      // noop
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache, no-transform',
    },
  });
}
