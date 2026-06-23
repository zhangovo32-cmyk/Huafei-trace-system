import { requireAdmin } from "../../_shared/auth.js";
import { json } from "../../_shared/http.js";
import { parsePositiveInt } from "../../_shared/db.js";

export async function onRequestGet(context) {
  const auth = await requireAdmin(context);
  if (!auth.ok) return auth.response;

  const url = new URL(context.request.url);
  const productId = Number.parseInt(url.searchParams.get("product_id") || "", 10);
  const status = url.searchParams.get("status") || "";
  const search = (url.searchParams.get("q") || "").trim();
  const limit = parsePositiveInt(url.searchParams.get("limit"), 100, 500);
  const offset = Math.max(0, Number.parseInt(url.searchParams.get("offset") || "0", 10) || 0);

  const where = [];
  const params = [];

  if (Number.isFinite(productId) && productId > 0) {
    where.push("c.product_id = ?");
    params.push(productId);
  }

  if (["normal", "risk", "disabled"].includes(status)) {
    where.push("c.status = ?");
    params.push(status);
  }

  if (search) {
    where.push("c.code LIKE ?");
    params.push(`%${search}%`);
  }

  const sql = `SELECT c.*, p.name AS product_name, p.batch_no AS product_batch_no
               FROM codes c
               LEFT JOIN products p ON p.id = c.product_id
               ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
               ORDER BY c.id DESC
               LIMIT ? OFFSET ?`;

  const result = await context.env.DB
    .prepare(sql)
    .bind(...params, limit, offset)
    .all();

  return json({ ok: true, codes: result.results || [], limit, offset });
}
