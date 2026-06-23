import { requireAdmin } from "../../_shared/auth.js";
import { badRequest, json, readJson } from "../../_shared/http.js";
import { productPayload } from "../../_shared/db.js";

export async function onRequestGet(context) {
  const auth = await requireAdmin(context);
  if (!auth.ok) return auth.response;

  const result = await context.env.DB
    .prepare(
      `SELECT p.*,
              COUNT(c.id) AS code_count,
              SUM(CASE WHEN c.status = 'normal' THEN 1 ELSE 0 END) AS normal_count,
              SUM(CASE WHEN c.status = 'risk' THEN 1 ELSE 0 END) AS risk_count,
              SUM(CASE WHEN c.status = 'disabled' THEN 1 ELSE 0 END) AS disabled_count
       FROM products p
       LEFT JOIN codes c ON c.product_id = p.id
       GROUP BY p.id
       ORDER BY p.id DESC`
    )
    .all();

  return json({ ok: true, products: result.results || [] });
}

export async function onRequestPost(context) {
  const auth = await requireAdmin(context);
  if (!auth.ok) return auth.response;

  const payload = productPayload(await readJson(context.request));
  if (!payload.name || !payload.brand) {
    return badRequest("品牌和产品名称不能为空");
  }

  const result = await context.env.DB
    .prepare(
      `INSERT INTO products
       (name, brand, specs, weight, batch_no, production_date, manufacturer, image_url, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      payload.name,
      payload.brand,
      payload.specs,
      payload.weight,
      payload.batch_no,
      payload.production_date,
      payload.manufacturer,
      payload.image_url,
      payload.description
    )
    .run();

  const product = await context.env.DB
    .prepare("SELECT * FROM products WHERE id = ?")
    .bind(result.meta?.last_row_id)
    .first();

  return json({ ok: true, product }, { status: 201 });
}
