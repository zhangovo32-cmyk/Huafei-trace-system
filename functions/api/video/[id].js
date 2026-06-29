const VIDEO_IDS = {
  company: "f2dfd73248094db5b05244d947b9a2e8",
  product: "7cd5ab39e0e84282af2fa750b4471d82"
};

const ALLOWED_IDS = new Set(Object.values(VIDEO_IDS));

export async function onRequest(context) {
  if (!["GET", "HEAD"].includes(context.request.method)) {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: { Allow: "GET, HEAD" }
    });
  }

  const rawId = context.params.id;
  const videoId = VIDEO_IDS[rawId] || rawId;
  if (!ALLOWED_IDS.has(videoId)) {
    return new Response("Video Not Found", { status: 404 });
  }

  const upstreamHeaders = new Headers();
  const range = context.request.headers.get("Range");
  if (range) upstreamHeaders.set("Range", range);

  const upstreamUrl = `http://zs.nfx360.com/trace/work/minio/noAuth/video/${videoId}`;
  const upstream = await fetch(upstreamUrl, {
    method: context.request.method,
    headers: upstreamHeaders
  });

  const headers = new Headers(upstream.headers);
  headers.set("Content-Type", "video/mp4");
  headers.set("Accept-Ranges", "bytes");
  headers.set("Cache-Control", "public, max-age=86400");
  headers.set("Access-Control-Allow-Origin", "*");
  headers.delete("Set-Cookie");

  return new Response(context.request.method === "HEAD" ? null : upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers
  });
}
