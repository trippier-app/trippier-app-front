import { forwardToBack } from '@/lib/server/proxy';

type Context = { params: Promise<{ path?: string[] }> };

export async function GET(request: Request, context: Context): Promise<Response> {
  return forwardToBack(request, 'countries', (await context.params).path ?? []);
}

export async function PUT(request: Request, context: Context): Promise<Response> {
  return forwardToBack(request, 'countries', (await context.params).path ?? [], {
    requireAuth: true,
  });
}

export async function DELETE(request: Request, context: Context): Promise<Response> {
  return forwardToBack(request, 'countries', (await context.params).path ?? [], {
    requireAuth: true,
  });
}
