import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/revalidate?path=/communes/bordeaux&secret=XXX
 * On-demand ISR invalidation. Protégée par REVALIDATE_SECRET.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const secret = searchParams.get('secret');
  const path = searchParams.get('path');

  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
  }

  if (!path) {
    return NextResponse.json({ message: 'Missing path' }, { status: 400 });
  }

  revalidatePath(path);
  return NextResponse.json({ revalidated: true, path });
}
