import { Router, IRequest, error } from 'itty-router';
import { verifyAuthorizedUser } from './auth';

export interface Env {
  DB: D1Database;
}

// Define the recipient type based on the DB schema
interface Recipient {
  id: number;
  email: string;
  active: number; // 0 or 1
}

const router = Router();

// Middleware to check for authorized user on all API routes
const withAuth = async (request: IRequest, env: Env) => {
  const authorizedUser = await verifyAuthorizedUser(request, env);
  if (!authorizedUser) {
    return error(403, 'Forbidden');
  }
  // Attach user to the request for use in handlers
  (request as any).user = authorizedUser;
};

// GET /api/recipients - List all recipients
router.get('/api/recipients', withAuth, async (request, env: Env) => {
  try {
    const { results } = await env.DB.prepare(
      'SELECT id, email, active FROM recipients ORDER BY email'
    ).all<Recipient>();
    return new Response(JSON.stringify(results ?? []),
      {
        headers: { 'Content-Type': 'application/json' },
      });
  } catch (e: any) {
    console.error('Failed to fetch recipients:', e.message);
    return error(500, 'Failed to fetch recipients');
  }
});

// POST /api/recipients - Add a new recipient
router.post('/api/recipients', withAuth, async (request: IRequest, env: Env) => {
  try {
    const { email } = await request.json<any>();
    if (typeof email !== 'string' || !email.includes('@')) {
      return error(422, 'Invalid email format');
    }

    await env.DB.prepare(
      'INSERT INTO recipients (email) VALUES (?)'
    ).bind(email).run();

    return new Response('Recipient added', { status: 201 });
  } catch (e: any) {
    if (e.message?.includes('UNIQUE constraint failed')) {
      return error(409, 'Email already exists');
    }
    console.error('Failed to add recipient:', e.message);
    return error(500, 'Failed to add recipient');
  }
});

// DELETE /api/recipients/:id - Deactivate a recipient
router.delete('/api/recipients/:id', withAuth, async (request: IRequest, env: Env) => {
  const id = request.params.id;
  if (!id) {
    return error(400, 'Missing recipient ID');
  }

  try {
    const info = await env.DB.prepare(
      'UPDATE recipients SET active = 0 WHERE id = ?'
    ).bind(id).run();

    if (info.meta.changes === 0) {
      return error(404, 'Recipient not found');
    }

    return new Response(null, { status: 204 }); // No Content
  } catch (e: any) {
    console.error('Failed to delete recipient:', e.message);
    return error(500, 'Failed to delete recipient');
  }
});

// Catch-all for API routes
router.all('/api/*', () => error(404, 'Not Found'));

export default {
  async email(message: ForwardableEmailMessage, env: Env, ctx: ExecutionContext): Promise<void> {
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

    } catch (e: any) {
      console.error('Email forwarding failed:', e.message);
      // Bounce the email if we can't process it.
      await message.setReject('Failed to process email forwarding.');
    }
  },

  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // For non-API routes, you could serve a SPA or a static page.
    // Here we just return a simple message for the root.
    const url = new URL(request.url);
    if (url.pathname === '/') {
      return new Response('directors-worker is running.');
    }
    return router.handle(request, env, ctx);
  },
};
