import { requireAdmin } from "../../../_shared/auth.js";
import { badRequest, json, notFound, readJson } from "../../../_shared/http.js";
import { getProduct, productPayload } from "../../../_shared/db.js";

function parseId(value) {
  const id = Number.parseInt(value, 10);
  return Number.isFinite(id) && id > 0 ? id : 0;
}

export async function onRequestGet(context) {
  const auth = await requireAdmin(context);
  if (!auth.ok) return auth.response;

  const id = parseId(context.params.id);
  const product = id ? await getProduct(context.env.DB, id) : null;
  if (!product) return notFound("产品不存在");

  return json({ ok: true, product });
}

export async function onRequestPut(context) {
  const auth = await requireAdmin(context);
  if (!auth.ok) return auth.response;

  const id = parseId(context.params.id);
  const current = id ? await getProduct(context.env.DB, id) : null;
  if (!current) return notFound("产品不存在");

  const payload = productPayload(await readJson(context.request));
  if (!payload.name || !payload.brand) {
    return badRequest("品牌和产品名称不能为空");
  }

  await context.env.DB
    .prepare(
      `UPDATE products
       SET name = ?,
           brand = ?,
           specs = ?,
           weight = ?,
           batch_no = ?,
           production_date = ?,
           manufacturer = ?,
           image_url = ?,
           description = ?
       WHERE id = ?`
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
      payload.description,
      id
    )
    .run();

  return json({ ok: true, product: await getProduct(context.env.DB, id) });
}
