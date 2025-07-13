import type { Context } from 'hono';

import env from '@/env';

interface ApiConfig {
  baseURL?: string;
  headers?: Record<string, string>;
}

interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

export class ApiClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;

  constructor(config: ApiConfig = {}) {
    this.baseURL = config.baseURL || env.SERVER_URL || '';
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      ...config.headers,
    };
  }

  private async makeRequest<T = any>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;

    const config: RequestInit = {
      ...options,
      headers: {
        ...this.defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);

      let data: T;
      const contentType = response.headers.get('content-type');

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      }
      else {
        data = await response.text() as T;
      }

      return {
        data,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      };
    }
    catch (error) {
      console.error(`API request failed: ${error}`);
      throw error;
    }
  }

  async get<T = any>(endpoint: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'GET',
      headers,
    });
  }

  async post<T = any>(
    endpoint: string,
    data?: any,
    headers?: Record<string, string>,
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      headers,
    });
  }

  async put<T = any>(
    endpoint: string,
    data?: any,
    headers?: Record<string, string>,
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      headers,
    });
  }

  async patch<T = any>(
    endpoint: string,
    data?: any,
    headers?: Record<string, string>,
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
      headers,
    });
  }

  async delete<T = any>(endpoint: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'DELETE',
      headers,
    });
  }
}

export function createApi(c: Context): ApiClient {
  const authorization = c.req.header('authorization');

  const headers: Record<string, string> = {};

  if (authorization) {
    headers.Authorization = authorization;
  }

  return new ApiClient({
    headers,
  });
}

// Alternative function that extracts auth from request directly
export function createApiFromRequest(req: Request): ApiClient {
  const authorization = req.headers.get('authorization');

  const headers: Record<string, string> = {};

  if (authorization) {
    headers.Authorization = authorization;
  }

  return new ApiClient({
    headers,
  });
}

// Simple utility function for one-off requests
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit & { baseURL?: string } = {},
): Promise<ApiResponse<T>> {
  const { baseURL = env.SERVER_URL || '', ...requestOptions } = options;

  const api = new ApiClient({ baseURL });

  if (requestOptions.method && requestOptions.method !== 'GET') {
    // For non-GET requests, use the appropriate method
    switch (requestOptions.method.toUpperCase()) {
      case 'POST':
        return api.post<T>(endpoint, requestOptions.body, requestOptions.headers as Record<string, string>);
      case 'PUT':
        return api.put<T>(endpoint, requestOptions.body, requestOptions.headers as Record<string, string>);
      case 'PATCH':
        return api.patch<T>(endpoint, requestOptions.body, requestOptions.headers as Record<string, string>);
      case 'DELETE':
        return api.delete<T>(endpoint, requestOptions.headers as Record<string, string>);
      default:
        return api.get<T>(endpoint, requestOptions.headers as Record<string, string>);
    }
  }

  return api.get<T>(endpoint, requestOptions.headers as Record<string, string>);
}

export default createApi;
