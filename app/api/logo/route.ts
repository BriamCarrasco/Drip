import { auth } from "@/auth";
import { getOrFetchLogo } from "@/lib/logo-cache";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("No autenticado", { status: 401 });
  }

  const url = new URL(request.url).searchParams.get("u");
  if (!url) {
    return new Response("Falta el parámetro u", { status: 400 });
  }

  try {
    const { contentType, data } = await getOrFetchLogo(url);
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": contentType,
        "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
        "Cache-Control": "private, max-age=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("No se pudo obtener el logo", { status: 404 });
  }
}
