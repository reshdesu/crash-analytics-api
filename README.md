# Universal Crash Analytics API

A **production-ready**, secure crash reporting service that works with any application. Deploy once, use everywhere. Database-first with local fallback, enterprise-grade security, and always-on reporting.

> **Perfect for indie developers, startups, and teams** who need reliable crash analytics across all their projects without the complexity of setting up individual crash reporting for each app.

## 🌟 Why This Exists

Most crash reporting services are:
- ❌ Expensive ($50-200/month per app)
- ❌ Complex to integrate
- ❌ Tied to specific platforms
- ❌ Privacy-invasive
- ❌ Limited to single applications

This solution is:
- ✅ **Free** (uses free tiers of Cloudflare + Supabase)
- ✅ **Universal** (one API for all your apps)
- ✅ **Secure** (enterprise-grade HMAC + rate limiting)
- ✅ **Private** (anonymous, hashed data only)
- ✅ **Self-hosted** (you own your data)

## 🏗️ Architecture

```
Your Apps → Cloudflare Worker → Supabase Database
     ↓              ↓                ↓
Local Fallback   HMAC Security   Your Data
```

**Flow:**
1. App crashes → Python/JS client catches it
2. Client sends to your Cloudflare Worker (with HMAC signature)
3. Worker validates, sanitizes, and forwards to your Supabase
4. If API fails, stores locally and retries later

## 🔒 Enterprise Security Features

- **HMAC Request Signing** - Cryptographically signed requests prevent spoofing
- **Rate Limiting** - IP-based protection (configurable, default 60/min)
- **Data Validation** - 15+ validation rules prevent malicious payloads
- **Row Level Security** - Database-level insert-only policies
- **Anonymous Reporting** - Zero personal data, SHA-256 hashed IPs
- **Size Limits** - Prevent DoS attacks with configurable payload limits
- **Geographic Filtering** - Optional region blocking
- **Audit Logging** - Full request logging for compliance

## 🎯 Use Cases

- **Multi-app Developers** - One crash API for all your projects
- **Indie Games** - Track crashes across different game releases
- **Open Source Projects** - Community-friendly crash reporting
- **Startups** - Cost-effective alternative to expensive services
- **Enterprise Teams** - Self-hosted crash analytics with full control
- **Desktop Applications** - Cross-platform crash reporting

## 🚀 Complete Setup Guide

### Prerequisites

1. **Supabase Account** (free) - [supabase.com](https://supabase.com)
2. **Cloudflare Account** (free) - [dash.cloudflare.com](https://dash.cloudflare.com)
3. **Node.js 18+** and **pnpm**

### Step 1: Fork & Clone

```bash
# Fork this repository on GitHub first, then:
git clone https://github.com/YOUR-USERNAME/crash-analytics-api.git
cd crash-analytics-api
pnpm install
```

### Step 2: Setup Supabase

1. Create new Supabase project
2. Go to SQL Editor → Copy/paste `database/schema.sql`
3. Run the SQL to create tables and security policies
4. Get your **Project URL** and **Service Role Key**:
   - Settings → API → Project URL
   - Settings → API → Project API keys → service_role (secret)

### Step 3: Setup Cloudflare Worker

```bash
# Install Wrangler CLI globally
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Configure your worker
cp wrangler.toml wrangler.example.toml  # Edit with your settings
```

**Edit wrangler.toml:**
```toml
name = "your-app-crash-api"  # Choose unique name
main = "worker/index.js"
compatibility_date = "2023-12-01"

# Don't put secrets here! Use Cloudflare dashboard instead
```

### Step 4: Set Environment Variables

In Cloudflare Dashboard → Workers → Your Worker → Settings → Environment Variables:

```bash
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY=eyJ...your-service-key
HMAC_SECRET=your-random-256-bit-secret-key
RATE_LIMIT_PER_MINUTE=60
MAX_PAYLOAD_SIZE=50000
```

**Generate HMAC Secret:**
```bash
# Generate secure random key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 5: Deploy

```bash
# Deploy to Cloudflare Workers
pnpm run deploy

# Your API will be available at:
# https://your-app-crash-api.your-subdomain.workers.dev
```

### Step 6: Integrate with Your Apps

#### Python Apps

```python
# Install dependencies
pip install requests psutil

# Copy clients/python/crash_reporter.py to your project
from crash_reporter import install_crash_handler

# One-time setup in your main.py
reporter = install_crash_handler(
    app_name="my-awesome-app",           # Your app name
    app_version="v1.2.3",               # Your app version  
    api_endpoint="https://your-worker-url.workers.dev",
    hmac_secret="your-hmac-secret",     # Same as in Cloudflare
    user_id="user-12345"                # Optional: anonymous user ID
)

# That's it! All crashes are now automatically reported
# + stored locally if API is down
```

#### JavaScript/Node.js Apps

```javascript
// Coming soon - JS client
// Follow this repo for updates
```

## 📊 What Data Gets Collected

**System Information (Anonymous):**
- ✅ OS version, CPU cores, RAM, disk space
- ✅ App version, platform (Windows/Mac/Linux)
- ✅ Crash timestamp and error messages
- ✅ Stack traces (no file paths)
- ✅ Session/user IDs (if you provide them)

**What's NOT Collected:**
- ❌ Real IP addresses (stored as SHA-256 hash)
- ❌ File paths or directory structures  
- ❌ Personal information or usernames
- ❌ File contents or sensitive data
- ❌ Network configuration or WiFi info

## 📈 Accessing Your Data

**Supabase Dashboard:**
```sql
-- Recent crashes by app
SELECT app_name, COUNT(*) as crashes 
FROM crash_reports 
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY app_name;

-- Most common errors
SELECT error_message, COUNT(*) as frequency
FROM crash_reports 
WHERE app_name = 'my-app'
GROUP BY error_message 
ORDER BY frequency DESC;

-- Hardware stats
SELECT hardware_specs->'platform'->>'system' as os,
       COUNT(*) as crashes
FROM crash_reports 
GROUP BY os;
```

**Build Your Dashboard:**
- Connect to Supabase with any tool (Grafana, Metabase, custom React app)
- Use the pre-built `crash_analytics` view for aggregated data
- Export data as CSV/JSON for external analysis

## 📦 Project Structure

```
crash-analytics-api/
├── worker/
│   └── index.js              # Cloudflare Worker (main API)
├── database/
│   └── schema.sql            # Supabase table schema
├── clients/
│   ├── python/               # Python crash reporter
│   │   ├── crash_reporter.py
│   │   └── requirements.txt
│   └── javascript/           # JS client (coming soon)
├── docs/
│   └── integration.md        # Integration guides
└── wrangler.toml            # Cloudflare Worker config
```

## 🔧 Configuration

### Environment Variables

Set these in your Cloudflare Worker dashboard:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key-here
HMAC_SECRET=your-secret-signing-key
RATE_LIMIT_PER_MINUTE=60
MAX_PAYLOAD_SIZE=50000
```

### Database Schema

The crash reports table stores:
- App name and version
- Platform and hardware specs
- Error messages and stack traces
- Anonymous user/session tracking
- Rate limiting data (hashed IPs)

## 📈 What Data is Collected

**We collect (anonymously):**
- ✅ Crash stack traces and error messages
- ✅ OS version, CPU, GPU, RAM specifications
- ✅ App version and crash timestamp
- ✅ Platform information (Windows/Linux/macOS)
- ✅ Anonymous session/user identifiers (optional)

**We do NOT collect:**
- ❌ File paths or system paths
- ❌ Usernames or personal information
- ❌ Email addresses or contact info
- ❌ File contents or sensitive data
- ❌ Network information or IP addresses (stored hashed)

## 🛡️ Privacy & Transparency

This crash reporting system:
1. **Always-on reporting** - No opt-out option, helps improve apps for everyone
2. **Database-first** - Tries to send to central database first
3. **Local fallback** - Stores locally if API is unavailable
4. **Fully anonymous** - No personal data collected
5. **Transparent** - Open source, you can see exactly what data is sent

## 📊 Analytics

Access your crash data through:
- Direct Supabase dashboard queries
- Custom analytics dashboard (build your own)
- SQL queries on the `crash_reports` table
- Pre-built `crash_analytics` view for aggregated data

## 🔄 API Endpoints

### POST `/report`
Submit a crash report.

**Headers:**
- `Content-Type: application/json`
- `X-HMAC-Signature: sha256=<signature>`
- `X-App-Name: <app-name>`

**Body:**
```json
{
  "app_name": "my-app",
  "app_version": "v1.0.0",
  "platform": "windows",
  "crash_timestamp": "2024-01-01T00:00:00Z",
  "error_message": "ValueError: Something went wrong",
  "stack_trace": "Traceback (most recent call last)...",
  "hardware_specs": {...},
  "user_id": "anonymous-user-123",
  "session_id": "session-456"
}
```

**Response:**
```json
{
  "success": true,
  "id": "crash-report-id"
}
```

## 🏗️ Development

```bash
# Install dependencies
pnpm install

# Start local development
pnpm run dev

# Deploy to production
pnpm run deploy

# Install Python client dependencies
pnpm run install:python-deps
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🔗 Related Projects

- [oopsie-daisy](https://github.com/your-username/oopsie-daisy) - Python application using this crash reporter
- Add your other projects here as you integrate them

---

**Built with maximum security and privacy in mind. Always-on crash reporting to help make all apps better.**