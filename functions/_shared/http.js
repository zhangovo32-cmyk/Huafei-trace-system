export function json(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");

  return new Response(JSON.stringify(data), {
    ...init,
    headers
  });
}

export function html(body, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("content-type", "text/html; charset=utf-8");
  headers.set("cache-control", "no-store");

  return new Response(body, {
    ...init,
    headers
  });
}

export function csv(body, filename = "export.csv") {
  return new Response(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store"
    }
  });
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export function getClientIp(request) {
  const cfIp = request.headers.get("CF-Connecting-IP");
  if (cfIp) return cfIp;

  const forwarded = request.headers.get("X-Forwarded-For");
  if (forwarded) return forwarded.split(",")[0].trim();

  return "";
}

export function badRequest(message, extra = {}) {
  return json({ ok: false, message, ...extra }, { status: 400 });
}

export function notFound(message = "Not found") {
  return json({ ok: false, message }, { status: 404 });
}

export function serverError(message = "Server error") {
  return json({ ok: false, message }, { status: 500 });
}

export function escapeCsv(value) {
  const text = value == null ? "" : String(value);
  if (!/[",\r\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}
