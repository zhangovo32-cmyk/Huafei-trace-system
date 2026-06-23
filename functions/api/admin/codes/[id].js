import { requireAdmin } from "../../../_shared/auth.js";
import { badRequest, json, notFound, readJson } from "../../../_shared/http.js";
import { VALID_STATUSES } from "../../../_shared/db.js";

function parseId(value) {
  const id = Number.parseInt(value, 10);
  return Number.isFinite(id) && id > 0 ? id : 0;
}

export async function onRequestPatch(context) {
  const auth = await requireAdmin(context);
  if (!auth.ok) return auth.response;

  const id = parseId(context.params.id);
  const body = await readJson(context.request);
  const status = String(body.status || "");

  if (!VALID_STATUSES.has(status)) {
    return badRequest("状态只能是 normal、risk 或 disabled");
  }

  const current = id
    ? await context.env.DB.prepare("SELECT * FROM codes WHERE id = ?").bind(id).first()
    : null;
  if (!current) return notFound("防伪码不存在");

  await context.env.DB
    .prepare("UPDATE codes SET status = ? WHERE id = ?")
    .bind(status, id)
    .run();

  const updated = await context.env.DB
    .prepare("SELECT * FROM codes WHERE id = ?")
    .bind(id)
    .first();

  return json({ ok: true, code: updated });
}
