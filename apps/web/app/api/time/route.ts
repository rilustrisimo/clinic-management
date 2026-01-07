export async function GET() {
  return new Response(JSON.stringify({ now: new Date().toISOString() }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
