export async function onRequest(context) {
  const code = context.params.code || "";
  const url = new URL(context.request.url);
  url.pathname = "/check";
  url.search = `?code=${encodeURIComponent(code)}`;

  return Response.redirect(url.toString(), 302);
}
