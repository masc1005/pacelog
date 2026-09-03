const BACKEND_URL = 'https://pacelog-api-production.up.railway.app';

export async function onRequest({ request }: { request: Request }) {
  const url = new URL(request.url);
  const backendUrl = `${BACKEND_URL}${url.pathname}${url.search}`;

  const init: RequestInit = {
    method: request.method,
    headers: request.headers,
    redirect: 'manual',
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body;
    // Necessário para streaming de body no Workers runtime
    (init as any).duplex = 'half';
  }

  const backendRes = await fetch(backendUrl, init);

  // Reconstrói os headers da resposta, reescrevendo Set-Cookie para remover
  // o atributo Domain do Railway (pacelog-api-production.up.railway.app).
  // Sem isso, o browser em pages.dev ignora os cookies de autenticação
  // porque o Domain não bate com o domínio atual.
  const responseHeaders = new Headers(backendRes.headers);
  const rawCookies = backendRes.headers.getSetCookie?.() ?? [];

  if (rawCookies.length > 0) {
    responseHeaders.delete('set-cookie');
    for (const cookie of rawCookies) {
      // Remove "Domain=..." para que o cookie seja válido para o domínio atual (pages.dev)
      const sanitized = cookie.replace(/;\s*Domain=[^;]*/gi, '');
      responseHeaders.append('set-cookie', sanitized);
    }
  }

  return new Response(backendRes.body, {
    status: backendRes.status,
    statusText: backendRes.statusText,
    headers: responseHeaders,
  });
}
