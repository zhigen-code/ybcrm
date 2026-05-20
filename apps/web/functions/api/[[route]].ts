export async function onRequest({
  request,
  env,
}: {
  request: Request
  env: { WORKER: { fetch(r: Request): Promise<Response> } }
}): Promise<Response> {
  return env.WORKER.fetch(request)
}
