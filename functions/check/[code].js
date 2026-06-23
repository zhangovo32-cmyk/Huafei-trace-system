export async function onRequest(context) {
  const url = new URL(context.request.url);
  url.pathname = "/check.html";
  url.search = "";

  return context.env.ASSETS.fetch(new Request(url.toString(), context.request));
}
