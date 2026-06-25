import { getClientIp, json } from "../../_shared/http.js";
import { getProduct, normalizeCode, nowIso, publicProduct } from "../../_shared/db.js";

function messageFor(row) {
  if (!row) {
    return {
      level: "danger",
      message: "该防伪码不存在，请谨慎核验"
    };
  }

  if (row.status === "disabled") {
    return {
      level: "danger",
      message: "该防伪码已作废，请谨慎核验"
    };
  }

  if (row.status === "risk") {
    return {
      level: "danger",
      message: "该防伪码存在异常查询记录，请谨慎核验"
    };
  }

  const count = Number(row.scan_count || 0);
  if (count <= 1) {
    return {
      level: "success",
      message: "该产品为首次查询，建议核对包装完整性"
    };
  }

  if (count <= 3) {
    return {
      level: "success",
      message: "该产品已通过防伪中心认证"
    };
  }

  return {
    level: "warning",
    message: "该防伪码已被多次查询，存在被复制风险，请谨慎核验"
  };
}

async function writeScanLog(db, request, code, scanTime) {
  const ip = getClientIp(request).slice(0, 80);
  const userAgent = (request.headers.get("user-agent") || "").slice(0, 500);

  await db
    .prepare("INSERT INTO scan_logs (code, scan_time, ip, user_agent) VALUES (?, ?, ?, ?)")
    .bind(code, scanTime, ip, userAgent)
    .run();
}

async function updateScanCount(db, code, scanTime) {
  try {
    return await db
      .prepare(
        `UPDATE codes
         SET scan_count = scan_count + 1,
             first_scan_time = COALESCE(first_scan_time, ?),
             last_scan_time = ?
         WHERE code = ?
         RETURNING id, code, product_id, scan_count, first_scan_time, last_scan_time, status, created_at`
      )
      .bind(scanTime, scanTime, code)
      .first();
  } catch (error) {
    if (!String(error?.message || "").toLowerCase().includes("returning")) throw error;

    const current = await db.prepare("SELECT * FROM codes WHERE code = ?").bind(code).first();
    if (!current) return null;

    const nextCount = Number(current.scan_count || 0) + 1;
    const firstScanTime = current.first_scan_time || scanTime;

    await db
      .prepare("UPDATE codes SET scan_count = ?, first_scan_time = ?, last_scan_time = ? WHERE id = ?")
      .bind(nextCount, firstScanTime, scanTime, current.id)
      .run();

    return {
      ...current,
      scan_count: nextCount,
      first_scan_time: firstScanTime,
      last_scan_time: scanTime
    };
  }
}

export async function onRequestGet(context) {
  const db = context.env.DB;
  const code = normalizeCode(context.params.code);
  const scanTime = nowIso();

  if (!db) {
    return json({ ok: false, message: "D1 数据库未绑定，请检查 DB binding" }, { status: 500 });
  }

  if (!code) {
    return json({
      ok: true,
      exists: false,
      code: String(context.params.code || ""),
      status: "not_found",
      scan_count: 0,
      certified_time: scanTime,
      ...messageFor(null)
    });
  }

  const codeRow = await updateScanCount(db, code, scanTime);
  const logPromise = writeScanLog(db, context.request, code, scanTime);
  if (typeof context.waitUntil === "function") {
    context.waitUntil(logPromise);
  } else {
    await logPromise;
  }

  if (!codeRow) {
    return json({
      ok: true,
      exists: false,
      code,
      status: "not_found",
      scan_count: 0,
      first_scan_time: null,
      last_scan_time: scanTime,
      certified_time: scanTime,
      ...messageFor(null)
    });
  }

  const state = messageFor(codeRow);
  const product = codeRow.status === "normal"
    ? publicProduct(await getProduct(db, codeRow.product_id))
    : null;

  return json({
    ok: true,
    exists: true,
    code,
    status: codeRow.status,
    scan_count: Number(codeRow.scan_count || 0),
    first_scan_time: codeRow.first_scan_time,
    last_scan_time: codeRow.last_scan_time,
    certified_time: codeRow.first_scan_time || codeRow.last_scan_time || scanTime,
    product,
    ...state
  });
}
