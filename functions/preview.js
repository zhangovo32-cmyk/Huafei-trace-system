export async function onRequest(context) {
  const url = new URL(context.request.url);
  url.pathname = "/preview.html";
  url.search = "";

 return Response.redirect(url.toString(), 302);
}
