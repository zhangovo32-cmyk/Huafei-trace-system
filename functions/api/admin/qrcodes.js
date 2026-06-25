import { requireAdmin } from "../../_shared/auth.js";
import { badRequest, escapeCsv, readJson } from "../../_shared/http.js";
import { generateQrSvg } from "../../_shared/qr.js";
import { createZip } from "../../_shared/zip.js";

const MAX_QR_CODES = 2000;

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

function safeCodeName(code) {
  return String(code).replace(/[^\dA-Za-z_-]/g, "_");
}

function zipResponse(url, rows) {
  const files = [];
  const manifestRows = [["code", "verify_url", "product_name", "batch_no"]];

  for (const row of rows) {
    const verifyUrl = `${url.origin}/check/${row.code}`;
    const filename = `${safeCodeName(row.code)}.svg`;

    files.push({
      name: filename,
      content: generateQrSvg(verifyUrl)
    });

    manifestRows.push([
      row.code,
      verifyUrl,
      row.product_name || "",
      row.batch_no || ""
    ]);
  }

  files.unshift({
    name: "qr-codes.csv",
    content: `\uFEFF${manifestRows.map((row) => row.map(escapeCsv).join(",")).join("\r\n")}`
  });

  return new Response(createZip(files), {
    headers: {
      "content-type": "application/zip",
      "content-disposition": 'attachment; filename="qr-codes.zip"',
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

  if (total === 0) return badRequest("没有可下载的防伪码");
  if (total > MAX_QR_CODES) {
    return badRequest(`一次最多下载 ${MAX_QR_CODES} 个二维码，请先按产品、状态或搜索码缩小范围`, { total });
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

  return zipResponse(url, result.results || []);
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

  if (!uniqueCodes.length) return badRequest("没有可下载的防伪码");
  if (uniqueCodes.length > MAX_QR_CODES) {
    return badRequest(`一次最多下载 ${MAX_QR_CODES} 个二维码，请减少本次选择数量`);
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
  if (!rows.length) return badRequest("没有找到可下载的防伪码");

  return zipResponse(url, rows);
}
