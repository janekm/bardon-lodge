interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
}

/**
 * Detects if we're in development mode
 * In local development with Vite plugin, certain environment characteristics are different
 */
function isDevelopmentMode(): boolean {
  // In local development, we typically don't have production environment variables
  // This checks for common development indicators
  try {
    const nodeEnv = (globalThis as unknown as { process?: { env?: { NODE_ENV?: string } } }).process
      ?.env?.NODE_ENV;
    return nodeEnv !== 'production';
  } catch {
    // Fallback: assume development if we can't determine
    return true;
  }
}

/**
 * Verifies that the authenticated user is authorized to access the API.
 * @param request The incoming request object
 * @param env The environment bindings
 * @returns The email of the authenticated user, or null if unauthorized.
 */
export async function verifyAuthorizedUser(request: Request, env: Env): Promise<string | null> {
  let authenticatedUserEmail = request.headers.get('Cf-Access-Authenticated-User-Email');
  const isDev = isDevelopmentMode();

  if (isDev) {
    console.log('=== AUTH DEBUG ===');
    console.log('Original header:', authenticatedUserEmail);
    console.log('Development mode:', isDev);
    console.log('DB binding available:', !!env.DB);
  }

  // Development mode: bypass Cloudflare Access for local testing
  if (!authenticatedUserEmail && isDev) {
    if (isDev) console.log('Development mode: using mock authentication');
    authenticatedUserEmail = 'dev@bardonlodge.co.uk';

    // Ensure the table exists and dev user is available (development only)
    try {
      await env.DB.exec(
        `CREATE TABLE IF NOT EXISTS recipients (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, active INTEGER NOT NULL DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`
      );
      if (isDev) console.log('Table created/verified (dev mode)');

      await env.DB.prepare(`INSERT OR IGNORE INTO recipients (email, active) VALUES (?, 1)`)
        .bind(authenticatedUserEmail)
        .run();
      if (isDev) console.log('Dev user ensured');
    } catch (e) {
      if (isDev) console.log('Dev user creation failed:', e);
    }
  }

  if (!authenticatedUserEmail) {
    if (isDev) console.log('No authenticated user email found');
    return null; // Unauthenticated
  }

  if (isDev) console.log('Checking authorization for:', authenticatedUserEmail);

  try {
    if (isDev) console.log('Executing DB query...');
    const { results } = await env.DB.prepare(
      'SELECT id FROM recipients WHERE email = ? AND active = 1'
    )
      .bind(authenticatedUserEmail)
      .all();

    if (isDev) {
      console.log('DB query results:', results);
      console.log('Results length:', results?.length || 0);
    }

    if (!results || results.length === 0) {
      if (isDev) console.log('User not found or inactive');
      return null; // Authenticated, but not an active recipient (Forbidden)
    }

    if (isDev) console.log('User authorized successfully');
    return authenticatedUserEmail;
  } catch (e) {
    // Always log authorization failures, even in production
    console.error('Authorization check failed:', e);
    return null;
  }
}
