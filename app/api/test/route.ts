import { connectDB } from '@/lib/db';
export async function GET() {
  try {
    await connectDB();
    return Response.json({ ok: true, msg: 'Connected!' });
  } catch (e: any) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}