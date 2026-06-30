export async function onRequest(context) {
  const url = new URL(context.request.url);
  url.pathname = "/check.html";
  url.search = "";

  let request = new Request(url.toString(), context.request);
  let response = context.env?.ASSETS?.fetch
    ? await context.env.ASSETS.fetch(request)
    : await fetch(request);

  for (let i = 0; i < 3 && [301, 302, 307, 308].includes(response.status); i += 1) {
    const location = response.headers.get("location");
    if (!location) break;
    const nextUrl = new URL(location, url);
    request = new Request(nextUrl.toString(), context.request);
    response = context.env?.ASSETS?.fetch
      ? await context.env.ASSETS.fetch(request)
      : await fetch(request);
  }

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
