import { requireAdmin } from "../../_shared/auth.js";
import { csv, escapeCsv } from "../../_shared/http.js";

export async function onRequestGet(context) {
  const auth = await requireAdmin(context);
  if (!auth.ok) return auth.response;

  const url = new URL(context.request.url);
  const productId = Number.parseInt(url.searchParams.get("product_id") || "", 10);
  const params = [];
  const where = Number.isFinite(productId) && productId > 0 ? "WHERE c.product_id = ?" : "";
  if (where) params.push(productId);

  const result = await context.env.DB
    .prepare(
      `SELECT c.code, p.name AS product_name, p.batch_no
       FROM codes c
       LEFT JOIN products p ON p.id = c.product_id
       ${where}
       ORDER BY c.id DESC`
    )
    .bind(...params)
    .all();

  const rows = [
    ["code", "verify_url", "product_name", "batch_no"],
    ...(result.results || []).map((row) => [
      row.code,
      `${url.origin}/check/${row.code}`,
      row.product_name || "",
      row.batch_no || ""
    ])
  ];

  const body = rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n");
  return csv(`\uFEFF${body}`, "qr-codes.csv");
}
