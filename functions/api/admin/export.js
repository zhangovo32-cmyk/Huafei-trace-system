import { requireAdmin } from "../../_shared/auth.js";
import { csv, escapeCsv } from "../../_shared/http.js";
import { buildVerifyUrl } from "../../_shared/qr-print.js";

export async function onRequestGet(context) {
  const auth = await requireAdmin(context);
  if (!auth.ok) return auth.response;

  const url = new URL(context.request.url);
  const productId = Number.parseInt(url.searchParams.get("product_id") || "", 10);
  const status = url.searchParams.get("status") || "";
  const search = (url.searchParams.get("q") || "").trim();
  const params = [];
  const where = [];

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

  const result = await context.env.DB
    .prepare(
      `SELECT c.code, p.name AS product_name, p.batch_no
       FROM codes c
       LEFT JOIN products p ON p.id = c.product_id
       ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
       ORDER BY c.id DESC`
    )
    .bind(...params)
    .all();

  const rows = [
    ["code", "verify_url", "product_name", "batch_no"],
    ...(result.results || []).map((row) => [
      row.code,
      buildVerifyUrl(url.origin, row.code),
      row.product_name || "",
      row.batch_no || ""
    ])
  ];

  const body = rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n");
  return csv(`\uFEFF${body}`, "qr-codes.csv");
}
