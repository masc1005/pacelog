const BACKEND_URL = 'https://pacelog-api-production.up.railway.app';

export async function onRequest({ request }: { request: Request }) {
  const url = new URL(request.url);
  const backendUrl = `${BACKEND_URL}${url.pathname}${url.search}`;

  const init: RequestInit = {
    method: request.method,
    headers: request.headers,
    redirect: 'follow',
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body;
  }

  return fetch(backendUrl, init);
}
