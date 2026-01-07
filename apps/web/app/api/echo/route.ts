export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  return new Response(JSON.stringify({ ok: true, body }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
