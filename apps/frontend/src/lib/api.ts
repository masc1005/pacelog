const isBrowser = typeof window !== 'undefined';
const isLocalhost =
  isBrowser &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.startsWith('192.168.'));

export const API_BASE_URL = isLocalhost
  ? `http://${isBrowser ? window.location.hostname : 'localhost'}:3333`
  : '';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    public details?: unknown
  ) {
    super(code);
    this.name = 'ApiError';
  }
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  timeoutMs?: number;
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params, headers, timeoutMs, signal: externalSignal, ...customConfig } = options;

  let url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        searchParams.append(key, String(val));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };

  let controller: AbortController | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let timedOut = false;

  if (timeoutMs && timeoutMs > 0 && typeof AbortController !== 'undefined') {
    controller = new AbortController();
    if (externalSignal) {
      if (externalSignal.aborted) {
        controller.abort();
      } else {
        externalSignal.addEventListener('abort', () => controller?.abort(), { once: true });
      }
    }
    timeoutId = setTimeout(() => {
      timedOut = true;
      controller?.abort();
    }, timeoutMs);
  }

  const config: RequestInit = {
    method: customConfig.method || 'GET',
    headers: {
      ...defaultHeaders,
      ...headers,
    },
    credentials: 'include', // Mandatório para tráfego seguro de cookies HttpOnly do Better Auth
    ...customConfig,
    signal: controller ? controller.signal : externalSignal,
  };

  try {
    const response = await fetch(url, config);

    if (response.status === 204) {
      return {} as T;
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new ApiError(
        response.status,
        data.error || 'REQUEST_FAILED',
        data.details
      );
    }

    return (data.data !== undefined ? data.data : data) as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (timedOut) {
      throw new ApiError(408, 'REQUEST_TIMEOUT', {
        message: 'A requisição excedeu o tempo limite. Tente novamente em instantes.',
      });
    }
    throw new ApiError(0, 'NETWORK_ERROR', {
      originalError: error instanceof Error ? error.message : String(error),
    });
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}
