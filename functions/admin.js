export async function onRequest(context) {
  const url = new URL(context.request.url);
  url.pathname = "/admin.html";
  url.search = "";

 return Response.redirect(url.toString(), 302);
}
