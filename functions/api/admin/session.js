import { getAdminSession, hasAdminPassword } from "../../_shared/auth.js";
import { json } from "../../_shared/http.js";

export async function onRequestGet(context) {
  return json({
    ok: true,
    configured: hasAdminPassword(context.env),
    authenticated: Boolean(await getAdminSession(context.request, context.env))
  });
}
