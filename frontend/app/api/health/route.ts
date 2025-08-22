export const dynamic = "force-dynamic";

export async function GET() {
  const base = process.env.BACKEND_URL || "http://127.0.0.1:8000";
  try {
    const r = await fetch(`${base}/health`, { next: { revalidate: 0 } });
    const data = await r.json();
    return new Response(JSON.stringify(data), {
      status: r.ok ? 200 : r.status,
      headers: { "content-type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
