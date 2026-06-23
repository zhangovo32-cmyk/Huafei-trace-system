import { createSessionCookie, hasAdminPassword } from "../../_shared/auth.js";
import { json, readJson } from "../../_shared/http.js";

export async function onRequestPost(context) {
  if (!hasAdminPassword(context.env)) {
    return json({ ok: false, message: "未设置 ADMIN_PASSWORD 环境变量" }, { status: 500 });
  }

  const body = await readJson(context.request);
  if (String(body.password || "") !== context.env.ADMIN_PASSWORD) {
    return json({ ok: false, message: "密码错误" }, { status: 401 });
  }

  const cookie = await createSessionCookie(context.request, context.env);
  return json(
    { ok: true, message: "登录成功" },
    {
      headers: {
        "set-cookie": cookie
      }
    }
  );
}
