# Wrangler CLI Guide

**Wrangler** is Cloudflare's official CLI tool for managing Cloudflare Workers. In this project, it handles deployment, configuration, and local development of our crash analytics API.

## 🤔 What is Wrangler?

Wrangler is the **deployment and development tool** for Cloudflare Workers:
- **Deploys** your JavaScript code to Cloudflare's edge network
- **Manages configuration** (environment variables, routes, etc.)
- **Provides local development** server for testing
- **Handles authentication** with your Cloudflare account

Think of it like:
- `npm` for Node.js packages
- `vercel` for Vercel deployments  
- `heroku` for Heroku apps
- **`wrangler` for Cloudflare Workers**

## 🏗️ How We Use Wrangler

### 1. **Project Configuration** (`wrangler.toml`)
```toml
name = "crash-analytics-api"           # Worker name
main = "worker/index.js"               # Entry point file
compatibility_date = "2023-12-01"      # Cloudflare runtime version

[vars]
RATE_LIMIT_PER_MINUTE = "60"           # Non-secret config
MAX_PAYLOAD_SIZE = "50000"
```

### 2. **Deployment** 
```bash
# Deploy to production
wrangler deploy

# What this does:
# - Uploads worker/index.js to Cloudflare
# - Configures routing and domains
# - Sets up environment variables
# - Makes your API live at: https://crash-analytics-api.your-subdomain.workers.dev
```

### 3. **Local Development**
```bash
# Start local development server
wrangler dev

# What this does:
# - Runs your worker locally at http://localhost:8787
# - Hot reloads on code changes
# - Uses your .dev.vars for environment variables
# - Perfect for testing without deploying
```

### 4. **Authentication**
```bash
# Login to Cloudflare account
wrangler login

# What this does:
# - Opens browser for OAuth login
# - Saves authentication tokens
# - Allows deployment to your account
```

## 📁 File Structure

```
crash-analytics-api/
├── wrangler.toml              # Wrangler configuration (committed)
├── wrangler.example.toml      # Template for others (.gitignore'd)
├── .dev.vars                  # Local secrets (.gitignore'd)
├── worker/
│   └── index.js              # Main worker code (deployed by wrangler)
└── .wrangler/                # Wrangler cache (.gitignore'd)
```

## 🔒 Environment Variables

Wrangler handles environment variables in **two ways**:

### **Local Development** (`.dev.vars`)
```bash
# .dev.vars (never committed)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
HMAC_SECRET=your-secret-key
```

### **Production** (Cloudflare Dashboard)
- Go to: Cloudflare Dashboard → Workers → Your Worker → Settings → Variables
- Add secrets through the web interface
- Wrangler reads these when deploying

## 🚀 Deployment Process

When you run `wrangler deploy`:

1. **Bundles** your worker code (`worker/index.js`)
2. **Uploads** to Cloudflare's global network
3. **Configures** routing and domains
4. **Sets** environment variables from dashboard
5. **Makes live** at your worker URL

Your API becomes available at:
```
https://crash-analytics-api.your-subdomain.workers.dev
```

## 🛠️ Common Wrangler Commands

```bash
# Authentication
wrangler login                 # Login to Cloudflare
wrangler whoami               # Check current user

# Development  
wrangler dev                  # Start local dev server
wrangler dev --port 3000      # Use different port

# Deployment
wrangler deploy               # Deploy to production
wrangler deploy --dry-run     # Test deployment without publishing

# Management
wrangler tail                 # View live logs
wrangler delete               # Delete the worker
```

## 🔄 Our npm Scripts

We've wrapped Wrangler commands in npm scripts:

```bash
# package.json scripts
"scripts": {
  "deploy": "wrangler deploy",           # Deploy to production
  "dev": "wrangler dev",                 # Start local development
  "test": "node test-api.js"             # Test the deployed API
}

# Usage
pnpm run deploy     # Deploy your worker
pnpm run dev        # Start local development
pnpm test          # Test the live API
```

## 🌍 Why Cloudflare Workers?

We chose Cloudflare Workers (managed by Wrangler) because:

### **Performance**
- **Edge deployment** - Runs in 280+ cities worldwide
- **0ms cold start** - Instant response times
- **Auto-scaling** - Handles traffic spikes automatically

### **Cost**
- **Free tier**: 100,000 requests/day
- **No servers** to manage or pay for
- **Pay-per-use** above free tier

### **Developer Experience**
- **Simple deployment** with Wrangler
- **Local development** environment
- **Integrated monitoring** and logging

### **Security**
- **Isolated execution** environment
- **Built-in DDoS protection**
- **Global load balancing**

## 🔧 Configuration Details

### **wrangler.toml breakdown:**
```toml
name = "crash-analytics-api"
# ↑ This becomes your worker name and URL subdomain

main = "worker/index.js"  
# ↑ Entry point - Wrangler uploads this file

compatibility_date = "2023-12-01"
# ↑ Cloudflare runtime version (like Node.js version)

[vars]
# ↑ Non-secret environment variables (safe to commit)

# Secrets go in Cloudflare Dashboard, not here!
```

## 🚨 Security Best Practices

### **✅ Safe to commit:**
- `wrangler.toml` (configuration only, no secrets)
- `wrangler.example.toml` (template)
- `worker/index.js` (your code)

### **❌ Never commit:**
- `.dev.vars` (contains actual secrets)  
- `.wrangler/` (cache and temporary files)
- Any files with real API keys or passwords

### **🔐 Secrets management:**
1. **Local**: Use `.dev.vars` for development
2. **Production**: Set via Cloudflare dashboard
3. **Never** put secrets in `wrangler.toml`

## 🆚 Alternatives to Wrangler

If you don't want to use Cloudflare Workers, you could deploy the same code to:

### **Vercel Functions**
```bash
# Deploy to Vercel instead
vercel --prod
# Your API: https://your-project.vercel.app/api/crash-report
```

### **Netlify Functions**  
```bash
# Deploy to Netlify instead  
netlify deploy --prod
# Your API: https://your-site.netlify.app/.netlify/functions/crash-report
```

### **AWS Lambda**
```bash
# Deploy with Serverless Framework
serverless deploy
# Your API: https://api-gateway-url.amazonaws.com/crash-report
```

**But Wrangler + Cloudflare Workers is optimal for this use case** due to global edge deployment and generous free tier.

## 📚 Learning Resources

- **Wrangler Docs**: https://developers.cloudflare.com/workers/wrangler/
- **Cloudflare Workers**: https://developers.cloudflare.com/workers/
- **Configuration Reference**: https://developers.cloudflare.com/workers/wrangler/configuration/
- **Local Development**: https://developers.cloudflare.com/workers/wrangler/commands/#dev

---

**Wrangler makes Cloudflare Workers deployment as simple as `git push` - but for serverless functions!**