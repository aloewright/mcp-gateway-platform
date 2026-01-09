# Cloudflare Access Setup Guide

This guide explains how to configure Cloudflare Access to protect the MCP Server management interface.

## Overview

Cloudflare Access provides Zero Trust authentication for your applications without requiring a VPN. It validates every request to your application against identity providers before granting access.

## Prerequisites

- A Cloudflare account with Access enabled
- Your application deployed on Cloudflare Pages or Workers
- A custom domain configured in Cloudflare

## Step 1: Enable Cloudflare Access

1. Log in to your Cloudflare dashboard
2. Select your account
3. Navigate to **Zero Trust** > **Access** > **Applications**

## Step 2: Create an Access Application

1. Click **Add an application**
2. Select **Self-hosted**
3. Configure the application:

   **Application Configuration:**
   - Name: `MCP Gateway - Admin Panel`
   - Session Duration: `24 hours` (or your preference)
   - Application Domain:
     - Subdomain: `admin` (or your choice)
     - Domain: `makethe.app` (your domain)
     - Path: `/mcp-servers`

4. Click **Next**

## Step 3: Add an Access Policy

1. Policy name: `MCP Administrators`
2. Action: `Allow`
3. Configure your identity provider:

   **Option A: Email Authentication**
   - Include rule: `Emails ending in` → `@yourdomain.com`
   - Or: `Emails` → `admin@yourdomain.com`

   **Option B: Google Workspace / Okta / Azure AD**
   - Configure your preferred identity provider
   - Add group or user restrictions

4. Click **Next** and then **Add application**

## Step 4: Configure Your Application

### Get Your Team Domain

1. In Cloudflare Zero Trust dashboard
2. Go to **Settings** > **General**
3. Copy your **Team domain** (e.g., `https://yourteam.cloudflareaccess.com`)

### Set Environment Variables

For **Cloudflare Pages** (profiles app):

```bash
wrangler pages secret put CLOUDFLARE_ACCESS_TEAM_DOMAIN
# Enter: https://yourteam.cloudflareaccess.com
```

For **local development** (profiles/.env.local):

```env
CLOUDFLARE_ACCESS_TEAM_DOMAIN=https://yourteam.cloudflareaccess.com
NEXT_PUBLIC_API_URL=https://api.makethe.app
```

### Deploy Changes

```bash
cd profiles
pnpm build
pnpm deploy
```

## Step 5: Update Gateway CORS Settings

Update `gateway/src/index.ts` to allow requests from your admin domain:

```typescript
app.use('*', cors({
  origin: [
    'https://makethe.app',
    'https://*.makethe.app',
    'https://admin.makethe.app'  // Add your admin subdomain
  ],
  credentials: true,
}))
```

## Step 6: Test the Configuration

1. Navigate to `https://admin.makethe.app/mcp-servers`
2. You should be redirected to Cloudflare Access login
3. Authenticate with your configured identity provider
4. Upon successful authentication, you'll be redirected back to the MCP servers page

## Advanced Configuration

### Custom JWT Validation

The middleware in `profiles/middleware.ts` validates Cloudflare Access JWTs. For production, you may want to:

1. Implement proper JWT signature verification using the public keys from `/cdn-cgi/access/certs`
2. Add additional claims validation
3. Implement token caching for better performance

### Multiple Protection Levels

You can create different Access policies for different paths:

```typescript
// In middleware.ts
const PROTECTED_PATHS = [
  { path: '/mcp-servers', policy: 'admin' },
  { path: '/api/admin', policy: 'admin' },
  { path: '/dashboard', policy: 'user' }
]
```

### Service Tokens

For machine-to-machine authentication:

1. Go to **Zero Trust** > **Access** > **Service Auth** > **Service Tokens**
2. Create a new service token
3. Use it in your API requests:
   ```bash
   curl -H "CF-Access-Client-Id: xxx" \
        -H "CF-Access-Client-Secret: yyy" \
        https://admin.makethe.app/mcp-servers
   ```

## Troubleshooting

### Error: "No Cloudflare Access token found"

- Ensure you're accessing the application through the configured domain
- Check that Cloudflare Access is enabled for the route
- Verify your Access policy allows your user

### Error: "Invalid token"

- Check that `CLOUDFLARE_ACCESS_TEAM_DOMAIN` is set correctly
- Verify the token hasn't expired
- Check the Access application configuration

### Bypassing Access in Development

The middleware automatically bypasses Cloudflare Access in development mode (`NODE_ENV=development`). To test Access locally:

1. Set `NODE_ENV=production` locally
2. Use a tool like ngrok to expose your local server
3. Configure Cloudflare Access for the ngrok URL

## Security Best Practices

1. **Rotate Service Tokens**: Regularly rotate service tokens
2. **Use Short Sessions**: Keep session duration as short as practical
3. **Enable MFA**: Require multi-factor authentication for your identity provider
4. **Monitor Access Logs**: Review Access logs regularly in Zero Trust dashboard
5. **Principle of Least Privilege**: Only grant access to users who need it

## Resources

- [Cloudflare Access Documentation](https://developers.cloudflare.com/cloudflare-one/applications/configure-apps/)
- [JWT Validation](https://developers.cloudflare.com/cloudflare-one/identity/authorization-cookie/validating-json/)
- [Identity Providers](https://developers.cloudflare.com/cloudflare-one/identity/idp-integration/)
