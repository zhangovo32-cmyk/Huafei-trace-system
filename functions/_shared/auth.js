import { json } from "./http.js";

const COOKIE_NAME = "qr_trace_admin";
const SESSION_MAX_AGE = 60 * 60 * 8;
const encoder = new TextEncoder();

function base64UrlEncode(value) {
  return btoa(value)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  return atob(padded);
}

function arrayBufferToHex(buffer) {
  return [...new Uint8Array(buffer)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

async function sign(value, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return arrayBufferToHex(signature);
}

function parseCookies(request) {
  const header = request.headers.get("cookie") || "";
  return Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        return index === -1
          ? [part, ""]
          : [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      })
  );
}

function cookieOptions(request, maxAge) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export function hasAdminPassword(env) {
  return typeof env.ADMIN_PASSWORD === "string" && env.ADMIN_PASSWORD.length > 0;
}

export async function createSessionCookie(request, env) {
  const payload = {
    role: "admin",
    exp: Date.now() + SESSION_MAX_AGE * 1000
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = await sign(encodedPayload, env.ADMIN_PASSWORD);
  return `${COOKIE_NAME}=${encodedPayload}.${signature}; ${cookieOptions(request, SESSION_MAX_AGE)}`;
}

export function clearSessionCookie(request) {
  return `${COOKIE_NAME}=; ${cookieOptions(request, 0)}`;
}

export async function getAdminSession(request, env) {
  if (!hasAdminPassword(env)) return null;

  const token = parseCookies(request)[COOKIE_NAME];
  if (!token || !token.includes(".")) return null;

  const [encodedPayload, signature] = token.split(".");
  const expected = await sign(encodedPayload, env.ADMIN_PASSWORD);
  if (!timingSafeEqual(signature, expected)) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    if (payload.role !== "admin" || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function requireAdmin(context) {
  const session = await getAdminSession(context.request, context.env);
  if (!session) {
    return {
      ok: false,
      response: json({ ok: false, message: "请先登录后台" }, { status: 401 })
    };
  }

  return { ok: true, session };
}
