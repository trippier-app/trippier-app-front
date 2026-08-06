import { forwardToBack } from '@/lib/server/proxy';

type Context = { params: Promise<{ path?: string[] }> };

export async function GET(request: Request, context: Context): Promise<Response> {
  return forwardToBack(request, 'discovery', (await context.params).path ?? []);
}
