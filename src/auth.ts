interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  CLOUDFLARE_API_KEY?: string;
  CLOUDFLARE_API_EMAIL?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
  CLOUDFLARE_ZONE_ID?: string;
}

/**
 * Detects if we're running on localhost (development mode)
 * Only localhost gets mock authentication - everything else requires real auth
 */
function isLocalhost(request: Request): boolean {
  try {
    const url = new URL(request.url);
    
    // Only allow development mode on localhost
    return url.hostname === 'localhost' || 
           url.hostname === '127.0.0.1' ||
           url.hostname === '0.0.0.0';
  } catch {
    // If we can't determine, assume NOT localhost (require auth)
    return false;
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
  const isDevelopment = isLocalhost(request);

  // Only log debug info on localhost
  if (isDevelopment) {
    console.log('=== AUTH DEBUG (Localhost Development) ===');
    console.log('Request URL:', request.url);
    console.log('Cf-Access header:', authenticatedUserEmail);
    console.log('DB binding available:', !!env.DB);
  }

  // ONLY allow mock authentication on localhost
  if (!authenticatedUserEmail && isDevelopment) {
    console.log('Localhost development: using mock authentication');
    authenticatedUserEmail = 'dev@bardonlodge.co.uk';

    // Ensure the table exists and dev user is available (localhost only)
    try {
      await env.DB.exec(
        `CREATE TABLE IF NOT EXISTS recipients (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, active INTEGER NOT NULL DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`
      );
      console.log('Recipients table created/verified (localhost dev mode)');

      await env.DB.prepare(`INSERT OR IGNORE INTO recipients (email, active) VALUES (?, 1)`)
        .bind(authenticatedUserEmail)
        .run();
      console.log('Dev user ensured in recipients table');
    } catch (e) {
      console.log('Dev user setup failed:', e);
    }
  }

  // For ALL non-localhost environments, require Cloudflare Access
  if (!authenticatedUserEmail) {
    if (isDevelopment) {
      console.log('No authenticated user email found on localhost');
    } else {
      console.log('Cloudflare Access authentication required - no Cf-Access-Authenticated-User-Email header');
    }
    return null; // Unauthenticated
  }

  if (isDevelopment) {
    console.log('Checking authorization for:', authenticatedUserEmail);
  }

  try {
    const { results } = await env.DB.prepare(
      'SELECT id FROM recipients WHERE email = ? AND active = 1'
    )
      .bind(authenticatedUserEmail)
      .all();

    if (isDevelopment) {
      console.log('DB query results length:', results?.length || 0);
    }

    if (!results || results.length === 0) {
      if (isDevelopment) {
        console.log('User not found in recipients table or inactive');
      } else {
        console.log(`User ${authenticatedUserEmail} not authorized - not in recipients table or inactive`);
      }
      return null; // Authenticated, but not an authorized recipient
    }

    if (isDevelopment) {
      console.log('User authorized successfully');
    }
    return authenticatedUserEmail;
  } catch (e) {
    // Always log authorization failures
    console.error('Authorization check failed:', e);
    return null;
  }
}
