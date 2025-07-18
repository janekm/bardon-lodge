import { Env } from './index';

/**
 * Verifies that the request comes from an authenticated user who is also an active recipient.
 * @param request The incoming request.
 * @param env The worker environment.
 * @returns The email of the authenticated user, or null if unauthorized.
 */
export async function verifyAuthorizedUser(request: Request, env: Env): Promise<string | null> {
  const authenticatedUserEmail = request.headers.get('Cf-Access-Authenticated-User-Email');

  if (!authenticatedUserEmail) {
    return null; // Unauthenticated
  }

  try {
    const { results } = await env.DB.prepare(
      'SELECT id FROM recipients WHERE email = ? AND active = 1'
    ).bind(authenticatedUserEmail).all();

    if (!results || results.length === 0) {
      return null; // Authenticated, but not an active recipient (Forbidden)
    }

    return authenticatedUserEmail;
  } catch (e) {
    console.error('Authorization check failed:', e);
    return null;
  }
}
