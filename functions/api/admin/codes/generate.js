import { requireAdmin } from "../../../_shared/auth.js";
import { badRequest, json, readJson } from "../../../_shared/http.js";
import { getProduct, parsePositiveInt } from "../../../_shared/db.js";

function randomInt(max) {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return values[0] % max;
}

function hasSequentialRun(code) {
  for (let index = 0; index <= code.length - 4; index += 1) {
    const digits = code.slice(index, index + 4).split("").map(Number);
    const ascending = digits.every((digit, offset) => offset === 0 || digit === digits[offset - 1] + 1);
    const descending = digits.every((digit, offset) => offset === 0 || digit === digits[offset - 1] - 1);
    if (ascending || descending) return true;
  }

  return /(\d)\1{4,}/.test(code);
}

function generateCandidate() {
  const length = 14 + randomInt(5);
  let code = String(1 + randomInt(9));
  while (code.length < length) {
    code += String(randomInt(10));
  }
  return code;
}

async function generateUniqueCode(db) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const code = generateCandidate();
    if (hasSequentialRun(code)) continue;

    const exists = await db
      .prepare("SELECT id FROM codes WHERE code = ?")
      .bind(code)
      .first();

    if (!exists) return code;
  }

  throw new Error("生成唯一防伪码失败，请重试");
}

export async function onRequestPost(context) {
  const auth = await requireAdmin(context);
  if (!auth.ok) return auth.response;

  const body = await readJson(context.request);
  const productId = Number.parseInt(body.product_id, 10);
  const count = parsePositiveInt(body.count, 1, 1000);

  if (!Number.isFinite(productId) || productId <= 0) {
    return badRequest("请选择产品");
  }

  const product = await getProduct(context.env.DB, productId);
  if (!product) return badRequest("产品不存在");

  const created = [];
  for (let index = 0; index < count; index += 1) {
    const code = await generateUniqueCode(context.env.DB);
    try {
      await context.env.DB
        .prepare("INSERT INTO codes (code, product_id, status) VALUES (?, ?, 'normal')")
        .bind(code, productId)
        .run();
      created.push(code);
    } catch (error) {
      if (!String(error?.message || "").toLowerCase().includes("unique")) throw error;
      index -= 1;
    }
  }

  return json({
    ok: true,
    product_id: productId,
    product_name: product.name,
    count: created.length,
    codes: created
  });
}
