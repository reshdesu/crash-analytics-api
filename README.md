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

### 🔐 Secrets Management

**Never commit secrets to git!** This project is configured to keep your secrets secure:

- **`.env`** - Your actual secrets (ignored by git)
- **`.env.example`** - Template showing required variables (safe to commit)
- **`wrangler.toml`** - Cloudflare configuration (ignored by git)
- **`wrangler.example.toml`** - Template for Cloudflare config (safe to commit)

**Required Environment Variables:**
```bash
# API Configuration
API_ENDPOINT=https://your-worker-name.your-subdomain.workers.dev

# Security
HMAC_SECRET=your-256-bit-random-secret

# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key

# Optional: Rate limiting and payload size
RATE_LIMIT_PER_MINUTE=60
MAX_PAYLOAD_SIZE=50000
```

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
2. Get your **Project URL** and **Service Role Key**:
   - Settings → API → Project URL
   - Settings → API → Project API keys → service_role (secret)

### Step 3: Setup Cloudflare Worker

```bash
# Install Wrangler CLI (already included in project)
pnpm add -D wrangler@4

# Login to Cloudflare
npx wrangler login
```

### Step 4: Set Environment Variables

**Option 1: Via Cloudflare Dashboard (Recommended)**
1. Go to: Cloudflare Dashboard → Workers → Your Worker → Settings → Variables
2. Add these 5 variables with correct types:

```
SUPABASE_URL = https://your-project-id.supabase.co  (Type: Text)
SUPABASE_SERVICE_KEY = eyJ...your-service-key  (Type: Secret)
HMAC_SECRET = [generated-secret]  (Type: Secret)
RATE_LIMIT_PER_MINUTE = 60  (Type: Text)
MAX_PAYLOAD_SIZE = 50000  (Type: Text)
```

**Generate HMAC Secret:**
```bash
# Generate secure 256-bit secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 5: Deploy

```bash
# Deploy to Cloudflare Workers
pnpm run deploy

# Your API will be available at:
# https://your-worker-name.your-subdomain.workers.dev
```

### Step 6: Setup Database

**✨ Automated Setup (Recommended):**
```bash
# Run the automated setup script
pnpm run setup-db
```

**Manual Setup (if automated fails):**
1. Go to: [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to: SQL Editor
4. Copy and paste the contents of `scripts/clean-setup.sql`
5. Click "Run" to execute

### Step 7: Test Your Deployment

```bash
# Test your live API
pnpm test

# Or start local development
pnpm run dev  # Available at http://localhost:8787
```

### Step 8: Integrate with Your Apps

#### JavaScript/Node.js Apps

```javascript
// Install the crash reporter
const { installCrashHandler } = require('./clients/javascript/crash_reporter');

// One-time setup in your main.js
const reporter = installCrashHandler({
    app_name: "my-awesome-app",           // Your app name
    app_version: "v1.2.3",               // Your app version  
    api_endpoint: "https://your-worker-name.your-subdomain.workers.dev",
    hmac_secret: "your-hmac-secret",     // Same HMAC secret from Cloudflare
    user_id: "user-12345"                // Optional: anonymous user ID
});

// That's it! All crashes are now automatically reported
```

#### Python Apps

```python
# Install the crash reporter
from clients.python.crash_reporter import install_crash_handler

# One-time setup in your main.py
reporter = install_crash_handler({
    'app_name': "my-awesome-app",           // Your app name
    'app_version': "v1.2.3",               // Your app version  
    'api_endpoint': "https://your-worker-name.your-subdomain.workers.dev",
    'hmac_secret': "your-hmac-secret",     // Same HMAC secret from Cloudflare
    'user_id': "user-12345"                // Optional: anonymous user ID
})

# That's it! All crashes are now automatically reported
```

#### Testing the Clients

```bash
# Test the JavaScript client
cd clients/javascript
node test-simple.js

# Test the Python client
cd clients/python
python crash_reporter.py

# Test with custom endpoint
API_ENDPOINT="https://your-worker-url.workers.dev" HMAC_SECRET="your-secret" pnpm test
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

### Quick Queries

**Recent crashes by app:**
```sql
SELECT app_name, COUNT(*) as crashes 
FROM crash_reports 
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY app_name;
```

**Using the Analytics View:**
```sql
-- Dashboard data (pre-aggregated)
SELECT * FROM crash_analytics 
WHERE hour > NOW() - INTERVAL '24 hours'
ORDER BY hour DESC;

-- Top crashing apps this week
SELECT app_name, SUM(crash_count) as total_crashes
FROM crash_analytics 
WHERE hour > NOW() - INTERVAL '7 days'
GROUP BY app_name
ORDER BY total_crashes DESC;
```

### Hardware Analysis (Last 7 Days)

**GPU-based crashes:**
```sql
SELECT 
    hardware_specs->'gpu'->>'name' as gpu_name,
    COUNT(*) as crashes_7d,
    COUNT(DISTINCT ip_hash) as unique_users_7d,
    COUNT(DISTINCT app_name) as affected_apps
FROM crash_reports 
WHERE created_at > NOW() - INTERVAL '7 days'
AND hardware_specs->'gpu'->>'name' IS NOT NULL
GROUP BY hardware_specs->'gpu'->>'name'
ORDER BY crashes_7d DESC;
```

**Memory configuration crashes:**
```sql
SELECT 
    CASE 
        WHEN (hardware_specs->'memory'->>'total')::bigint < 4000000000 THEN '< 4GB'
        WHEN (hardware_specs->'memory'->>'total')::bigint < 8000000000 THEN '4-8GB'
        WHEN (hardware_specs->'memory'->>'total')::bigint < 16000000000 THEN '8-16GB'
        WHEN (hardware_specs->'memory'->>'total')::bigint < 32000000000 THEN '16-32GB'
        ELSE '32GB+'
    END as memory_range,
    COUNT(*) as crashes_7d,
    COUNT(DISTINCT ip_hash) as unique_users_7d
FROM crash_reports 
WHERE created_at > NOW() - INTERVAL '7 days'
AND hardware_specs->'memory'->>'total' IS NOT NULL
GROUP BY memory_range
ORDER BY crashes_7d DESC;
```

**CPU model analysis:**
```sql
SELECT 
    hardware_specs->'cpu'->>'name' as cpu_model,
    (hardware_specs->'cpu'->>'cores')::int as cores,
    COUNT(*) as crashes_7d,
    COUNT(DISTINCT ip_hash) as unique_users_7d
FROM crash_reports 
WHERE created_at > NOW() - INTERVAL '7 days'
AND hardware_specs->'cpu'->>'name' IS NOT NULL
GROUP BY cpu_model, cores
ORDER BY crashes_7d DESC;
```

**Low-resource device crashes:**
```sql
SELECT 
    app_name,
    COUNT(*) as crashes_7d,
    COUNT(DISTINCT ip_hash) as affected_users,
    AVG((hardware_specs->'cpu'->>'cores')::int) as avg_cpu_cores,
    ROUND(AVG((hardware_specs->'memory'->>'total')::bigint) / 1000000000.0, 1) as avg_memory_gb
FROM crash_reports 
WHERE created_at > NOW() - INTERVAL '7 days'
AND (
    (hardware_specs->'cpu'->>'cores')::int <= 4 
    OR (hardware_specs->'memory'->>'total')::bigint < 8000000000
)
GROUP BY app_name
ORDER BY crashes_7d DESC;
```

**Hardware combination analysis:**
```sql
SELECT 
    hardware_specs->'platform'->>'system' as os,
    (hardware_specs->'cpu'->>'cores')::int as cpu_cores,
    CASE 
        WHEN (hardware_specs->'memory'->>'total')::bigint < 8000000000 THEN '< 8GB'
        WHEN (hardware_specs->'memory'->>'total')::bigint < 16000000000 THEN '8-16GB'
        ELSE '16GB+'
    END as memory_tier,
    COALESCE(hardware_specs->'gpu'->>'name', 'Integrated') as gpu_type,
    COUNT(*) as crashes_7d,
    COUNT(DISTINCT ip_hash) as unique_users_7d
FROM crash_reports 
WHERE created_at > NOW() - INTERVAL '7 days'
AND hardware_specs->'platform'->>'system' IS NOT NULL
GROUP BY os, cpu_cores, memory_tier, gpu_type
HAVING COUNT(*) > 1
ORDER BY crashes_7d DESC;
```

### Error Analysis

**Most common errors:**
```sql
SELECT 
    LEFT(error_message, 100) as error_preview,
    COUNT(*) as frequency,
    COUNT(DISTINCT ip_hash) as affected_users,
    array_agg(DISTINCT app_name) as affected_apps
FROM crash_reports 
WHERE error_message IS NOT NULL
GROUP BY LEFT(error_message, 100)
ORDER BY frequency DESC
LIMIT 20;
```

**Version comparison:**
```sql
SELECT 
    app_version,
    COUNT(*) as total_crashes,
    COUNT(DISTINCT ip_hash) as unique_users,
    ROUND(COUNT(*)::numeric / COUNT(DISTINCT ip_hash), 2) as crashes_per_user
FROM crash_reports 
WHERE app_name = 'your-app-name'  -- Replace with your app
GROUP BY app_version
ORDER BY total_crashes DESC;
```

### 📊 Complete Query Collection

**For 100+ more analytics queries, see:**
- `database/example-queries.sql` - Comprehensive query collection
- **Basic Statistics** - App crashes, user counts, trends
- **Hardware Analysis** - GPU, CPU, memory breakdowns
- **Error Patterns** - Common crashes and stack traces
- **Time Analysis** - Daily/hourly patterns, spike detection  
- **User Behavior** - Session analysis, repeat crashers
- **Monitoring** - Automated alerts and anomaly detection

### Build Your Dashboard

**Connect with any tool:**
- **Grafana** - Real-time dashboards and alerts
- **Metabase** - Business intelligence and charts  
- **Custom React/Vue app** - Direct Supabase connection
- **Jupyter Notebooks** - Data science analysis
- **Excel/Google Sheets** - Export CSV data

**Pre-built views:**
- `crash_reports` - Raw crash data with full details
- `crash_analytics` - Aggregated hourly statistics
- Export as CSV/JSON for external analysis

## 📦 Project Structure

```
crash-analytics-api/
├── worker/
│   └── index.js              # Cloudflare Worker with auto-table creation
├── database/
│   ├── schema.sql            # Reference schema (auto-created by worker)
│   └── example-queries.sql   # 100+ analytics queries
├── clients/
│   ├── python/               # Python crash reporter
│   │   ├── crash_reporter.py
│   │   ├── requirements.txt
│   │   └── env.example       # Environment template
│   └── javascript/           # JavaScript client
│       ├── crash_reporter.js
│       ├── test-simple.js    # Test script
│       ├── package.json
│       └── env.example       # Environment template
├── scripts/
│   ├── auto-setup.js         # Automated database setup
│   ├── setup-db.sql          # Database schema
│   ├── clean-setup.sql       # Clean database setup
│   ├── nuke-db.sql           # Nuclear cleanup option
│   ├── validate-env.js       # Environment validation
│   ├── test-api.js           # End-to-end API testing
│   └── ...                   # Other utility scripts
├── docs/
│   └── wrangler-guide.md     # Complete Wrangler CLI guide
├── .github/workflows/        # Automated testing and releases
├── wrangler.example.toml     # Cloudflare Worker config template
├── .env.example              # Environment variables template
└── README.md                 # This file
```

## 🛠️ What is Wrangler?

**Wrangler** is Cloudflare's CLI tool that powers this project's deployment:

- **🚀 Deploys** your worker to Cloudflare's global edge network (280+ cities)
- **⚡ Local development** server at `http://localhost:8787`
- **🔒 Manages secrets** securely through Cloudflare dashboard
- **📊 Monitors** your API with real-time logs and analytics

**Think of it as `git push` for serverless functions!**

```bash
# Deploy your API to the world
pnpm run deploy

# Start local development  
pnpm run dev

# Test your live API
pnpm test
```

**📚 Complete guide:** See [docs/wrangler-guide.md](docs/wrangler-guide.md) for detailed Wrangler documentation.

## ✨ Key Features

### 🔄 Automated Setup
- **Zero manual database setup** - Tables created automatically via setup scripts
- **Multiple setup methods** - Automated script with manual SQL fallback
- **Production ready** - Handles all edge cases and provides clear instructions

### 🔒 Enterprise Security
- **HMAC authentication** - Prevents unauthorized crash reports
- **Rate limiting** - IP-based protection (configurable)
- **Data validation** - 15+ validation rules prevent abuse
- **Anonymous data** - No personal info, hashed IPs only

### 📊 What Gets Stored
- App name, version, and platform
- Error messages and stack traces  
- Hardware specs (CPU, RAM, OS)
- Anonymous user/session IDs (optional)
- Crash timestamps and metadata

## 🚀 Quick Start Commands

```bash
# Install dependencies
pnpm install

# Setup database (automated)
pnpm run setup-db

# Deploy to Cloudflare
pnpm run deploy

# Test everything works
pnpm test

# Test individual clients
cd clients/javascript && node test-simple.js
cd clients/python && python crash_reporter.py
```

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

### Environment Setup

1. **Copy environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Fill in your secrets in `.env`:**
   ```bash
   API_ENDPOINT=https://your-worker-name.your-subdomain.workers.dev
   HMAC_SECRET=your-256-bit-hmac-secret
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_SERVICE_KEY=your-service-role-key
   ```

3. **Install dependencies:**
   ```bash
   # Node.js dependencies
   pnpm install
   
   # Python client dependencies
   pnpm run install:python-deps
   ```

### Development Commands

```bash
# Start local development
pnpm run dev

# Deploy to production
pnpm run deploy

# Test the complete API
pnpm run test

# Test individual clients
cd clients/javascript && node test-simple.js
cd clients/python && python crash_reporter.py

# Setup database
pnpm run setup-db

# Clear database (for testing)
pnpm run clear-db
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