import { Router, IRequest, error, json } from 'itty-router';
import { verifyAuthorizedUser } from './auth';

interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  CLOUDFLARE_API_KEY?: string;
  CLOUDFLARE_API_EMAIL?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
  CLOUDFLARE_ZONE_ID?: string;
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

// Helper function to add destination address to Cloudflare
async function addCloudflareDestinationAddress(email: string, env: Env): Promise<boolean> {
  // Debug logging for secret availability
  console.log('=== CLOUDFLARE API DEBUG ===');
  console.log('API Key available:', !!env.CLOUDFLARE_API_KEY);
  console.log('API Email available:', !!env.CLOUDFLARE_API_EMAIL);
  console.log('Account ID available:', !!env.CLOUDFLARE_ACCOUNT_ID);
  console.log('Zone ID available:', !!env.CLOUDFLARE_ZONE_ID);
  
  if (!env.CLOUDFLARE_API_KEY || !env.CLOUDFLARE_API_EMAIL || !env.CLOUDFLARE_ACCOUNT_ID || !env.CLOUDFLARE_ZONE_ID) {
    console.warn('Cloudflare API credentials not configured - skipping destination address creation');
    console.warn('Missing:', [
      !env.CLOUDFLARE_API_KEY && 'CLOUDFLARE_API_KEY',
      !env.CLOUDFLARE_API_EMAIL && 'CLOUDFLARE_API_EMAIL',
      !env.CLOUDFLARE_ACCOUNT_ID && 'CLOUDFLARE_ACCOUNT_ID', 
      !env.CLOUDFLARE_ZONE_ID && 'CLOUDFLARE_ZONE_ID'
    ].filter(Boolean).join(', '));
    return false;
  }

  try {
    console.log(`🌐 Making API call to add destination address: ${email}`);
    console.log(`📧 Using account ID: ${env.CLOUDFLARE_ACCOUNT_ID}`);
    
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/email/routing/addresses`,
      {
        method: 'POST',
        headers: {
          'X-Auth-Email': env.CLOUDFLARE_API_EMAIL,
          'X-Auth-Key': env.CLOUDFLARE_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
        }),
      }
    );

    const result = await response.json() as any;
    
    if (!response.ok) {
      console.error('Failed to add Cloudflare destination address:', result);
      console.error('Response status:', response.status);
      console.error('Response body:', JSON.stringify(result, null, 2));
      return false;
    }

    console.log(`✅ Successfully added destination address: ${email}`);
    console.log(`📧 Verification email sent to: ${email}`);
    return true;
  } catch (e) {
    console.error('Error adding Cloudflare destination address:', (e as Error).message);
    return false;
  }
}

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

    // Add to database first
    const result = await env.DB.prepare(
      'INSERT INTO recipients (email, active, created_at) VALUES (?, 1, datetime("now"))'
    )
      .bind(email)
      .run();

    // Try to add to Cloudflare destination addresses
    const cloudflareSuccess = await addCloudflareDestinationAddress(email, env);
    
    const responseMessage = cloudflareSuccess 
      ? `Recipient added successfully. Verification email sent to ${email}.`
      : `Recipient added to database. Please manually add ${email} to Cloudflare destination addresses.`;

    return new Response(
      JSON.stringify({
        message: responseMessage,
        id: result.meta.last_row_id,
        cloudflare_added: cloudflareSuccess,
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
      console.log(`📧 Email received from: ${message.from}`);
      console.log(`📧 Forwarding to ${recipients.length} recipients: ${recipients.join(', ')}`);
      
      // Track forwarding results
      const forwardingResults = [];
      
      // Forward to each recipient individually to catch specific failures
      for (const recipient of recipients) {
        try {
          console.log(`📤 Attempting to forward to: ${recipient}`);
          await message.forward(recipient);
          console.log(`✅ Successfully forwarded to: ${recipient}`);
          forwardingResults.push({ recipient, status: 'success' });
        } catch (e) {
          const errorMsg = (e as Error).message;
          console.error(`❌ Failed to forward to ${recipient}: ${errorMsg}`);
          forwardingResults.push({ recipient, status: 'failed', error: errorMsg });
        }
      }
      
      // Summary logging
      const successful = forwardingResults.filter(r => r.status === 'success').length;
      const failed = forwardingResults.filter(r => r.status === 'failed').length;
      
      console.log(`📊 Forwarding summary: ${successful} successful, ${failed} failed`);
      
      if (failed > 0) {
        const failedRecipients = forwardingResults
          .filter(r => r.status === 'failed')
          .map(r => `${r.recipient} (${r.error})`)
          .join(', ');
        console.error(`❌ Failed recipients: ${failedRecipients}`);
      }
      
    } catch (e) {
      console.error('Email forwarding system error:', (e as Error).message);
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
