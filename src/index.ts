import { Router, IRequest, error, json } from 'itty-router';
import { verifyAuthorizedUser } from './auth';

interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
}

const router = Router();

// Authentication middleware
const withAuth = async (request: IRequest, env: Env) => {
  const authorizedUser = await verifyAuthorizedUser(request, env);
  if (!authorizedUser) {
    return error(403, 'Forbidden');
  }
  // Attach user to the request for use in handlers
  (request as IRequest & { user: string }).user = authorizedUser;
};

// GET /api/recipients - List all recipients
router.get('/api/recipients', withAuth, async (request, env: Env) => {
  try {
    const { results } = await env.DB.prepare(
      'SELECT id, email, active FROM recipients ORDER BY email'
    ).all();
    return json(results ?? []);
  } catch (e) {
    console.error('Failed to fetch recipients:', (e as Error).message);
    return error(500, 'Failed to fetch recipients');
  }
});

// POST /api/recipients - Add a new recipient
router.post('/api/recipients', withAuth, async (request: IRequest, env: Env) => {
  try {
    const body = (await request.json()) as { email?: string };
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return error(400, 'Email is required');
    }

    // Basic email validation
    if (!email.includes('@') || !email.includes('.')) {
      return error(400, 'Invalid email format');
    }

    const result = await env.DB.prepare(
      'INSERT INTO recipients (email, active, created_at) VALUES (?, 1, datetime("now"))'
    )
      .bind(email)
      .run();

    return new Response(
      JSON.stringify({
        message: 'Recipient added successfully',
        id: result.meta.last_row_id,
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (e) {
    const error_message = (e as Error).message;
    if (error_message?.includes('UNIQUE constraint failed')) {
      return error(409, 'Email already exists');
    }
    console.error('Database error:', error_message);
    return error(500, 'Database error');
  }
});

// DELETE /api/recipients/:id - Remove a recipient
router.delete('/api/recipients/:id', withAuth, async (request, env) => {
  try {
    const id = request.params?.id;

    if (!id) {
      return error(400, 'ID is required');
    }

    const result = await env.DB.prepare('DELETE FROM recipients WHERE id = ?').bind(id).run();

    if (result.meta.changes === 0) {
      return error(404, 'Recipient not found');
    }

    return json({ message: 'Recipient deleted successfully' });
  } catch (e) {
    console.error('Database error:', (e as Error).message);
    return error(500, 'Database error');
  }
});

// Catch-all for API routes
router.all('/api/*', () => error(404, 'Not Found'));

export default {
  async email(message: ForwardableEmailMessage, env: Env, _ctx: ExecutionContext): Promise<void> {
    try {
      const { results } = await env.DB.prepare(
        'SELECT email FROM recipients WHERE active = 1'
      ).all<{ email: string }>();

      if (!results || results.length === 0) {
        console.log('No active recipients found. Bouncing email.');
        await message.setReject('No active recipients for this alias.');
        return;
      }

      const recipients = results.map(r => r.email);
      console.log(`Forwarding email from ${message.from} to ${recipients.length} recipients.`);
      await Promise.all(recipients.map(recipient => message.forward(recipient)));
    } catch (e) {
      console.error('Email forwarding failed:', (e as Error).message);
      // Bounce the email if we can't process it.
      await message.setReject('Failed to process email forwarding.');
    }
  },

  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Handle API routes
    if (url.pathname.startsWith('/api/')) {
      return router.handle(request, env, _ctx);
    }

    // For all other routes (SPA), pass to assets
    // The assets binding handles SPA routing with not_found_handling
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
