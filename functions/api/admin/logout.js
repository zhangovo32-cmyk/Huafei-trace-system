import { clearSessionCookie } from "../../_shared/auth.js";
import { json } from "../../_shared/http.js";

export async function onRequestPost(context) {
  return json(
    { ok: true, message: "已退出登录" },
    {
      headers: {
        "set-cookie": clearSessionCookie(context.request)
      }
    }
  );
}
