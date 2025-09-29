import { getCookie } from 'hono/cookie';

import env from '@/env';

export async function fetchZKAuthToken(): Promise<string> {
  const controller = new AbortController();

  try {
    const response = await fetch(`${env.ZKTECO_BASE_URL}/api-token-auth/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username: env.ZKTECO_USERNAME, password: env.ZKTECO_PASSWORD }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Auth failed with status ${response.status}`);
    }

    const data = await response.json();
    if (!data?.token) {
      throw new Error('No token in response');
    }

    return data.token;
  }
  catch (err: any) {
    console.error('Error fetching ZK auth token:', err);
    throw new Error('Failed to fetch ZK auth token');
  }
}

export async function fetchZKData(c: any, subPath: string): Promise<any> {
  const controller = new AbortController();

  // get the token from cookie
  const cookieToken = getCookie(c, 'zk_token');
  if (!cookieToken) {
    throw new Error('Missing zk_token cookie');
  }

  console.warn('subPath: ', subPath);

  // Normalize and build URL to ZKTeco from provided subPath
  const normalized = (subPath || '').replace(/^\/+/, '');
  const targetUrl = `${env.ZKTECO_BASE_URL}/${normalized}/`;

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Authorization': cookieToken,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch employee data with status ${response.status}`);
    }

    const data = await response.json();

    if (!data) {
      throw new Error('No employee data in response');
    }

    return data;
  }
  catch (err: any) {
    console.error('Error fetching ZK employee data:', err);
    throw new Error('Failed to fetch ZK employee data');
  }
}
