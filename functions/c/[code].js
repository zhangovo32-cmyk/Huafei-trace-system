export async function onRequest(context) {
  const url = new URL(context.request.url);
  url.pathname = "/check.html";
  url.search = "";

  const request = new Request(url.toString(), context.request);
  const response = context.env?.ASSETS?.fetch
    ? await context.env.ASSETS.fetch(request)
    : await fetch(request);

  const headers = new Headers(response.headers);
  headers.set("cache-control", "no-store, no-cache, must-revalidate, max-age=0");
  headers.set("pragma", "no-cache");
  headers.set("expires", "0");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
