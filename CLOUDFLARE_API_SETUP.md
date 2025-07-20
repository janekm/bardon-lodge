# Cloudflare API Setup for Automatic Destination Addresses

This guide shows how to configure automatic destination address creation when adding recipients through the UI.

## 🚨 **Important: Email Routing API Uses Global API Key**

The Email Routing API **does not support API tokens** - it only works with Global API Key authentication.

## 🔑 Required Credentials

### 1. Account ID (Already Known)

```
2aee9d20b17137568cdc5f25f7a27a44
```

### 2. Zone ID for bardonlodge.co.uk

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Click on `bardonlodge.co.uk` domain
3. Copy the **Zone ID** from the right sidebar (under "API")

### 3. Global API Key (Required for Email Routing)

**Email Routing API only supports Global API Key, not API tokens!**

1. Go to [Cloudflare Profile](https://dash.cloudflare.com/profile/api-tokens)
2. Scroll down to **"API Keys"** section (not API Tokens)
3. Find **"Global API Key"** and click **"View"**
4. Enter your password to reveal the key
5. **Copy the Global API Key**

### 4. Account Email

Use the email address associated with your Cloudflare account: `janekm@gmail.com`

## 🚀 Setting Up Secrets

**Delete old API token secrets if they exist:**

```bash
npx wrangler secret delete CLOUDFLARE_API_TOKEN --env production 2>/dev/null || true
```

### For Production Environment

```bash
# Set Global API Key (not API token)
npx wrangler secret put CLOUDFLARE_API_KEY --env production
# Paste your Global API Key when prompted

# Set your Cloudflare account email
npx wrangler secret put CLOUDFLARE_API_EMAIL --env production
# Enter: janekm@gmail.com

npx wrangler secret put CLOUDFLARE_ACCOUNT_ID --env production
# Enter: 2aee9d20b17137568cdc5f25f7a27a44

npx wrangler secret put CLOUDFLARE_ZONE_ID --env production
# Enter your zone ID from dashboard
```

### For Staging Environment

```bash
npx wrangler secret put CLOUDFLARE_API_KEY --env staging
npx wrangler secret put CLOUDFLARE_API_EMAIL --env staging
npx wrangler secret put CLOUDFLARE_ACCOUNT_ID --env staging
npx wrangler secret put CLOUDFLARE_ZONE_ID --env staging
```

## ✅ Testing the Setup

1. **Deploy updated code**:

   ```bash
   npm run deploy:prod
   ```

2. **Add a test recipient** through the UI
3. **Check logs** for automatic destination address creation:

   ```bash
   npx wrangler tail directors-worker-prod --env production
   ```

4. **Expected log output**:
   ```
   === CLOUDFLARE API DEBUG ===
   API Key available: true
   API Email available: true
   Account ID available: true
   Zone ID available: true
   🌐 Making API call to add destination address: test@example.com
   📧 Using account ID: 2aee9d20b17137568cdc5f25f7a27a44
   ✅ Successfully added destination address: test@example.com
   📧 Verification email sent to: test@example.com
   ```

## 🎯 How It Works

When you add a recipient through the UI:

1. **Email is added** to the D1 database
2. **API call is made** using Global API Key to add destination address
3. **Verification email** is automatically sent to the recipient
4. **User clicks verification link** to confirm
5. **Email forwarding works** immediately after verification

## 🔧 Troubleshooting

### Error: "POST method not allowed for the api_token authentication scheme"

- **Cause**: Tried to use API token instead of Global API Key
- **Fix**: Use Global API Key as shown above

### If credentials are missing:

- Logs will show: `"Missing: CLOUDFLARE_API_KEY, CLOUDFLARE_API_EMAIL"`
- Recipients are still added to database
- Manual verification required in dashboard

### If API call fails:

- Verify you're using the **Global API Key** (not API token)
- Check that `CLOUDFLARE_API_EMAIL` matches your account email
- Verify account ID and zone ID are correct
- Ensure Global API Key hasn't been regenerated

## ⚠️ Security Note

Global API Keys have broad permissions. Consider:

- Using environment variables only (never commit to code)
- Monitoring API key usage in Cloudflare dashboard
- Regenerating the key if compromised
