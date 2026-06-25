import { requireAdmin } from "../../../_shared/auth.js";
import { badRequest, readJson } from "../../../_shared/http.js";
import { MAX_QR_CODES, printLabelsHtml } from "../../../_shared/qr-print.js";

function buildCodeFilters(url) {
  const productId = Number.parseInt(url.searchParams.get("product_id") || "", 10);
  const status = url.searchParams.get("status") || "";
  const search = (url.searchParams.get("q") || "").trim();
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

  return {
    params,
    whereSql: where.length ? `WHERE ${where.join(" AND ")}` : ""
  };
}

function htmlResponse(url, rows) {
  return new Response(printLabelsHtml(url.origin, rows), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

export async function onRequestGet(context) {
  const auth = await requireAdmin(context);
  if (!auth.ok) return auth.response;

  const url = new URL(context.request.url);
  const { params, whereSql } = buildCodeFilters(url);

  const countRow = await context.env.DB
    .prepare(`SELECT COUNT(*) AS total FROM codes c ${whereSql}`)
    .bind(...params)
    .first();
  const total = Number(countRow?.total || 0);

  if (total === 0) return badRequest("没有可打印的防伪码");
  if (total > MAX_QR_CODES) {
    return badRequest(`一次最多打印 ${MAX_QR_CODES} 个二维码，请先缩小筛选范围`, { total });
  }

  const result = await context.env.DB
    .prepare(
      `SELECT c.code, p.name AS product_name, p.batch_no
       FROM codes c
       LEFT JOIN products p ON p.id = c.product_id
       ${whereSql}
       ORDER BY c.id DESC`
    )
    .bind(...params)
    .all();

  return htmlResponse(url, result.results || []);
}

export async function onRequestPost(context) {
  const auth = await requireAdmin(context);
  if (!auth.ok) return auth.response;

  const url = new URL(context.request.url);
  const body = await readJson(context.request);
  const codes = Array.isArray(body.codes)
    ? body.codes.map((code) => String(code).trim()).filter(Boolean)
    : [];
  const uniqueCodes = [...new Set(codes)];

  if (!uniqueCodes.length) return badRequest("没有可打印的防伪码");
  if (uniqueCodes.length > MAX_QR_CODES) {
    return badRequest(`一次最多打印 ${MAX_QR_CODES} 个二维码，请减少本次选择数量`);
  }

  const placeholders = uniqueCodes.map(() => "?").join(",");
  const result = await context.env.DB
    .prepare(
      `SELECT c.code, p.name AS product_name, p.batch_no
       FROM codes c
       LEFT JOIN products p ON p.id = c.product_id
       WHERE c.code IN (${placeholders})
       ORDER BY c.id DESC`
    )
    .bind(...uniqueCodes)
    .all();

  const rows = result.results || [];
  if (!rows.length) return badRequest("没有找到可打印的防伪码");

  return htmlResponse(url, rows);
}
