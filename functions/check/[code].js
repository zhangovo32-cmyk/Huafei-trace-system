import { QR_LINK_VERSION } from "../_shared/qr-print.js";

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const code = context.params?.code || url.pathname.split("/").filter(Boolean).pop();
  url.pathname = "/check";
  url.search = "";
  if (code) url.searchParams.set("code", String(code));
  url.searchParams.set("v", QR_LINK_VERSION);

  return Response.redirect(url.toString(), 302);
}
