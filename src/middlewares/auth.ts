import type { PublicUrlProps } from '@/lib/types';
import type { JWTPayload } from 'hono/utils/jwt/types';

import { compareSync, hash } from 'bcrypt-ts';
import { sign, verify } from 'hono/jwt';

import env from '@/env';

export async function HashPass(password: string) {
  const hashPassword = await hash(password, env.SALT);

  return hashPassword;
}

export async function ComparePass(password: string, hashPassword: string) {
  return compareSync(password, hashPassword);
}

export function isHashedPassword(password: string): boolean {
  // bcrypt hashes typically start with $2a$, $2b$, or $2y$ and are 60 characters long
  const bcryptPattern = /^\$2[ayb]\$\d{2}\$.{53}$/;
  return bcryptPattern.test(password);
}

export async function CreateToken(payload: JWTPayload) {
  return sign(payload, env.PRIVATE_KEY);
}

export async function VerifyToken(token: string) {
  const decodedPayload = await verify(token, env.PRIVATE_KEY);

  return !!decodedPayload;
}

export function isPublicRoute(url: string, method: string, query?: Record<string, string>) {
  // Dynamic public route check for /work endpoints
  const isWorkPublic = url.startsWith('/v1/work') && query?.public === 'true';

  if (isWorkPublic) {
    return true;
  }

  const publicUrls: PublicUrlProps[] = [
    { url: '/v1/hr/user/login', method: 'POST' },
    { url: '/v1/hr/user', method: 'POST' },
    { url: '/v1/hr/employee-login', method: 'POST' },
    { url: '/v1/public', method: 'GET' },
    { url: '/v1/other/store/model/value/label', method: 'GET' },
    { url: '/v1/other/store/brand/value/label', method: 'GET' },
    { url: '/v1/other/store/category/value/label', method: 'GET' },
    { url: '/v1/work/info', method: 'POST' },
    { url: '/v1/work/order', method: 'POST' },
    { url: '/v1/uploads', method: 'GET' },
    { url: '/v1/work/order', method: 'GET' }, // ! public route need to add
    { url: '/v1/work/info', method: 'GET' }, // ! public route need to add
    { url: '/v1/work/order-by-info', method: 'GET' }, // ! public route need to add
    { url: '/v1/work/diagnosis-by-order', method: 'GET' }, // ! public route need to add
    { url: '/v1/work/process', method: 'GET' }, // ! public route need to add
    { url: '/v1/store/product', method: 'GET' },
    { url: '/v1/store/bill-info', method: 'POST' },
    { url: '/v1/store/ship-address', method: 'POST' },
    { url: '/v1/store/ordered', method: 'POST' },
    { url: '/v1/store/review', method: 'POST' },
    { url: '/v1/work/contact-us', method: 'POST' },
    { url: '/v1/store/review', method: 'GET' },
    { url: '/v1/store/brand', method: 'POST' },
    { url: '/v1/store/model', method: 'POST' },
    { url: '/v1/store/forum', method: 'GET' },
    { url: '/v1/store/forum', method: 'POST' },
    { url: '/v1/store/forum-reply', method: 'POST' },
    { url: '/v1/other/store/product/value/label', method: 'GET' },
  ];

  // Check for api-docs routes
  if (url.startsWith('/api-docs')) {
    return true;
  }

  // Check for OpenAPI documentation routes
  if (url.startsWith('/reference') || url.startsWith('/doc')) {
    return true;
  }

  if (url.startsWith('/iclock')) {
    return true;
  }

  return publicUrls.some(route => url.startsWith(route.url) && route.method === method);
}

export const ALLOWED_ROUTES: string[] = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
  'http://localhost:3004',
  'http://localhost:3005',
  'http://192.168.10.175:5090',
  'http://103.147.163.46:5090',
  'http://192.168.10.175:4070',
  'http://103.147.163.46:4070',
  'http://192.168.10.175:4076',
  'http://103.147.163.46:4076',
  'https://synap-erp-starter.vercel.app',
  'http://localhost:4000',
  'http://103.147.163.46:5095',
  'https://bwt-frontend.fortunezip.com',
  'https://bwt-web.fortunezip.com',
  'https://bwt-admin.synaptech.cloud',
  'https://bwt-web.synaptech.cloud',
];
