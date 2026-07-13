import { generateSignature } from './auth';
import { XenithApiError } from './errors';

export interface HttpClientConfig {
  baseUrl: string;
  accessKey: string;
  secretKey: string;
}

export class HttpClient {
  private readonly baseUrl: string;
  private readonly accessKey: string;
  private readonly secretKey: string;

  constructor(config: HttpClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // strip trailing slash
    this.accessKey = config.accessKey;
    this.secretKey = config.secretKey;
  }

  async request<T>(
    method: string,
    path: string,
    body?: unknown,
    extraHeaders?: Record<string, string>
  ): Promise<T> {
    const timestamp = new Date().toISOString();
    const minifiedBody = body ? JSON.stringify(body) : '';

    // The signature uses just the path+query portion of the URL
    const signature = generateSignature(
      method.toUpperCase(),
      path,
      timestamp,
      minifiedBody,
      this.secretKey
    );

    const headers: Record<string, string> = {
      accept: 'application/json',
      'Content-Type': 'application/json',
      'Xenith-Api-Key': this.accessKey,
      'Xenith-Request-Timestamp': timestamp,
      'Xenith-Request-Signature': signature,
      ...extraHeaders,
    };

    const url = `${this.baseUrl}${path}`;

    const response = await fetch(url, {
      method: method.toUpperCase(),
      headers,
      body: minifiedBody || undefined,
    });

    let responseData: unknown;
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    if (!response.ok) {
      const message =
        typeof responseData === 'object' &&
        responseData !== null &&
        'message' in responseData
          ? String((responseData as Record<string, unknown>).message)
          : `HTTP Error ${response.status}`;

      throw new XenithApiError(message, response.status, responseData);
    }

    return responseData as T;
  }
}
