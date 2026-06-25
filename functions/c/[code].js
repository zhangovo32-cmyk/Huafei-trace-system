export async function onRequest(context) {
  const url = new URL(context.request.url);
  url.pathname = "/check";
  url.search = "";

  const request = new Request(url.toString(), context.request);
  const response = context.env?.ASSETS?.fetch
    ? await context.env.ASSETS.fetch(request)
    : await fetch(request);

  const headers = new Headers(response.headers);
  headers.set("cache-control", "public, max-age=300");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
