export async function onRequestGet(context) {
  return Response.json({
    ok: true,
    message: "pong",
    time: new Date().toISOString(),
    colo: context.request.cf?.colo || null
  }, {
    headers: {
      "cache-control": "no-store"
    }
  });
}
