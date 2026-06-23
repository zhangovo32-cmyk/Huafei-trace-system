export const VALID_STATUSES = new Set(["normal", "risk", "disabled"]);

export function normalizeCode(raw) {
  const code = String(raw || "").trim();
  return /^\d{6,32}$/.test(code) ? code : "";
}

export function normalizeText(value, max = 500) {
  return String(value ?? "").trim().slice(0, max);
}

export function parsePositiveInt(value, fallback = 1, max = 1000) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

export function nowIso() {
  return new Date().toISOString();
}

export async function getProduct(db, id) {
  return db.prepare("SELECT * FROM products WHERE id = ?").bind(id).first();
}

export function publicProduct(row) {
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    specs: row.specs,
    weight: row.weight,
    batch_no: row.batch_no,
    production_date: row.production_date,
    manufacturer: row.manufacturer,
    image_url: row.image_url,
    description: row.description
  };
}

export function productPayload(body) {
  return {
    name: normalizeText(body.name, 120),
    brand: normalizeText(body.brand, 80),
    specs: normalizeText(body.specs, 800),
    weight: normalizeText(body.weight, 80),
    batch_no: normalizeText(body.batch_no, 80),
    production_date: normalizeText(body.production_date, 40),
    manufacturer: normalizeText(body.manufacturer, 160),
    image_url: normalizeText(body.image_url, 600),
    description: normalizeText(body.description, 2000)
  };
}
