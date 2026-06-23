import { requireAdmin } from "../../_shared/auth.js";
import { json } from "../../_shared/http.js";
import { parsePositiveInt } from "../../_shared/db.js";

export async function onRequestGet(context) {
  const auth = await requireAdmin(context);
  if (!auth.ok) return auth.response;

  const url = new URL(context.request.url);
  const code = (url.searchParams.get("code") || "").trim();
  const limit = parsePositiveInt(url.searchParams.get("limit"), 100, 500);
  const offset = Math.max(0, Number.parseInt(url.searchParams.get("offset") || "0", 10) || 0);

  const where = code ? "WHERE l.code = ?" : "";
  const params = code ? [code] : [];

  const result = await context.env.DB
    .prepare(
      `SELECT l.*, c.status, p.name AS product_name
       FROM scan_logs l
       LEFT JOIN codes c ON c.code = l.code
       LEFT JOIN products p ON p.id = c.product_id
       ${where}
       ORDER BY l.id DESC
       LIMIT ? OFFSET ?`
    )
    .bind(...params, limit, offset)
    .all();

  return json({ ok: true, logs: result.results || [], limit, offset });
}
