import type { AppRouteHandler } from '@/lib/types';

import { auth } from '@/lib/auth';
// import { ComparePass, CreateToken, HashPass, isHashedPassword } from '@/middlewares/auth';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type {
  ChangePasswordRoute,
  SignInRoute,
  SignOutRoute,
  SignUpRoute,

} from './routes';

// ...existing code...
export const signIn: AppRouteHandler<SignInRoute> = async (c: any) => {
  try {
    const body = await c.req.json();

    // Forward request headers (include cookies) to the auth API so session-based endpoints work
    // const forwardedHeaders: Record<string, string> = Object.fromEntries((c.req.headers as Headers).entries());
    // // Ensure cookie header is present (some runtimes differ in header casing)
    // forwardedHeaders.cookie = forwardedHeaders.cookie || forwardedHeaders.Cookie || c.req.header('cookie') || c.req.header('Cookie') || '';

    const result = await auth.api.signInEmail({
      body,
      // headers: forwardedHeaders,
    });

    return c.json(result);
  }
  catch (err: any) {
    // Prefer domain errors if thrown by helpers/utilities
    if (err instanceof DataNotFound || err instanceof ObjectNotFound) {
      return c.json(createToast('error', 'Not found'), 404);
    }

    // Authentication failures commonly throw with explicit messages — map them to 401
    if (err?.message?.toLowerCase().includes('invalid')
      || err?.message?.toLowerCase().includes('credentials')
      || err?.message?.toLowerCase().includes('unauthoriz')) {
      return c.json(createToast('error', err.message || 'Invalid credentials'), 401);
    }

    // Fallback: internal error
    console.error('signIn error:', err);
    return c.json(createToast('error', 'Internal server error'), 500);
  }
};

// ...existing code...
export const signUp: AppRouteHandler<SignUpRoute> = async (c: any) => {
  try {
    const body = await c.req.json();

    // body.uuid = nanoid();

    // console.log('Generated UUID:', body.uuid);

    // console.log('SignUp Body:', body);

    // // Forward request headers (include cookies) to the auth API so session-based endpoints work
    // const forwardedHeaders: Record<string, string> = Object.fromEntries((c.req.headers as Headers).entries());
    // forwardedHeaders.cookie = forwardedHeaders.cookie || forwardedHeaders.Cookie || c.req.header('cookie') || c.req.header('Cookie') || '';

    const result = await auth.api.signUpEmail({
      body,
      // headers: forwardedHeaders,
    });

    return c.json(result);
  }
  catch (err: any) {
    if (err instanceof DataNotFound || err instanceof ObjectNotFound) {
      return c.json(createToast('error', 'Not found'), 404);
    }

    if (err?.message?.toLowerCase().includes('invalid')
      || err?.message?.toLowerCase().includes('password')
      || err?.message?.toLowerCase().includes('email')) {
      return c.json(createToast('error', err.message || 'Invalid input'), 400);
    }

    if (err?.message?.toLowerCase().includes('exist')
      || err?.message?.toLowerCase().includes('duplicate')) {
      return c.json(createToast('error', err.message || 'Already exists'), 409);
    }

    console.error('signUp error:', err);
    return c.json(createToast('error', 'Internal server error'), 500);
  }
};

// ...existing code...
export const signOut: AppRouteHandler<SignOutRoute> = async (c: any) => {
  try {
    // Prefer a runtime-provided headers() helper when available (e.g. some serverless runtimes).
    // Fallback to the request headers from the Hono context.
    let forwardedHeaders: Record<string, string> = {};

    const maybeHeadersFn = (globalThis as any).headers;
    if (typeof maybeHeadersFn === 'function') {
      const h = await maybeHeadersFn();
      forwardedHeaders = h instanceof Headers
        ? Object.fromEntries(h.entries())
        : (typeof h === 'object' && h !== null ? { ...(h as Record<string, string>) } : {});
    }
    else {
      forwardedHeaders = Object.fromEntries((c.req.headers as Headers).entries());
    }

    // Ensure cookie header is present (some runtimes differ in header casing)
    forwardedHeaders.cookie = forwardedHeaders.cookie
      || forwardedHeaders.Cookie
      || c.req.header('cookie')
      || c.req.header('Cookie')
      || '';

    const result = await auth.api.signOut({
      // This endpoint requires session cookies.
      headers: forwardedHeaders,
    });

    return c.json(result);
  }
  catch (err: any) {
    console.error('signOut error:', err);
    return c.json(createToast('error', 'Internal server error'), 500);
  }
};

// ...existing code...
export const changePassword: AppRouteHandler<ChangePasswordRoute> = async (c: any) => {
  try {
    const body = await c.req.json();

    // Prefer a runtime-provided headers() helper when available (e.g. some serverless runtimes).
    // Fallback to the request headers from the Hono context.
    // let forwardedHeaders: Record<string, string> = {};

    // const maybeHeadersFn = (globalThis as any).headers;
    // if (typeof maybeHeadersFn === 'function') {
    //   const h = await maybeHeadersFn();
    //   forwardedHeaders = h instanceof Headers
    //     ? Object.fromEntries(h.entries())
    //     : (typeof h === 'object' && h !== null ? { ...(h as Record<string, string>) } : {});
    // }
    // else {
    //   forwardedHeaders = Object.fromEntries((c.req.headers as Headers).entries());
    // }

    // // Ensure cookie header is present (some runtimes differ in header casing)
    // forwardedHeaders.cookie = forwardedHeaders.cookie
    //   || forwardedHeaders.Cookie
    //   || c.req.header('cookie')
    //   || c.req.header('Cookie')
    //   || '';

    const result = await auth.api.changePassword({
      body,
      // This endpoint requires session cookies.
      // headers: forwardedHeaders,
    });

    return c.json(result);
  }
  catch (err: any) {
    if (err instanceof DataNotFound || err instanceof ObjectNotFound) {
      return c.json(createToast('error', 'Not found'), 404);
    }

    if (err?.message?.toLowerCase().includes('invalid')
      || err?.message?.toLowerCase().includes('credentials')
      || err?.message?.toLowerCase().includes('unauthoriz')) {
      return c.json(createToast('error', err.message || 'Invalid credentials'), 401);
    }

    if (err?.message?.toLowerCase().includes('password')
      || err?.message?.toLowerCase().includes('current')) {
      return c.json(createToast('error', err.message || 'Invalid input'), 400);
    }

    console.error('changePassword error:', err);
    return c.json(createToast('error', 'Internal server error'), 500);
  }
};
