# Universal Crash Analytics API - Client Libraries

This directory contains client libraries for integrating with the Universal Crash Analytics API.

## 📁 Available Clients

- **Python** (`python/`) - Python client with automatic hardware detection
- **JavaScript** (`javascript/`) - Node.js client with HMAC signing

## 🚀 Quick Start

### 1. Environment Setup

Copy the sample environment file and configure it:

```bash
# For Python client
cp python/env.example python/.env

# For JavaScript client  
cp env.example .env
```

Edit the `.env` file with your actual values:

```bash
# Your Cloudflare Workers API endpoint
API_ENDPOINT=https://your-worker-name.your-subdomain.workers.dev

# Your HMAC secret (same as in your worker)
HMAC_SECRET=your-256-bit-random-secret-here
```

### 2. Install Dependencies

#### Python Client
```bash
cd python
pip install -r requirements.txt
```

#### JavaScript Client
```bash
cd javascript
npm install
```

## 🐍 Python Client

### Features
- Automatic hardware specification detection
- Built-in HMAC signing
- Comprehensive error handling
- Easy integration

### Usage

```python
from crash_reporter import CrashReporter

# Initialize the reporter
reporter = CrashReporter(
    api_endpoint="https://your-api.workers.dev",
    hmac_secret="your-secret",
    app_name="my-app",
    app_version="v1.0.0"
)

# Report a crash
try:
    # Your application code
    result = some_risky_operation()
except Exception as e:
    reporter.report_crash(e, {
        "user_id": "user123",
        "session_id": "session456",
        "additional_context": "extra info"
    })
```

### Test the Client
```bash
cd python
python crash_reporter.py
```

## 🟨 JavaScript Client

### Features
- Node.js native implementation
- HMAC signature generation
- Hardware specification detection
- Promise-based API

### Usage

```javascript
const { CrashReporter } = require('./crash_reporter');

// Initialize the reporter
const reporter = new CrashReporter({
    apiEndpoint: 'https://your-api.workers.dev',
    hmacSecret: 'your-secret',
    appName: 'my-app',
    appVersion: 'v1.0.0'
});

// Report a crash
try {
    // Your application code
    const result = someRiskyOperation();
} catch (error) {
    reporter.reportCrash(error, {
        userId: 'user123',
        sessionId: 'session456',
        additionalContext: 'extra info'
    });
}
```

### Test the Client
```bash
cd javascript
node test-simple.js
```

## 🔧 Configuration Options

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `API_ENDPOINT` | Your Cloudflare Workers API URL | Yes |
| `HMAC_SECRET` | Your HMAC secret for request signing | Yes |

### Client Configuration

| Option | Description | Default |
|--------|-------------|---------|
| `app_name` | Your application name | Required |
| `app_version` | Your application version | Required |
| `platform` | Target platform | Auto-detected |
| `user_id` | User identifier | Optional |
| `session_id` | Session identifier | Auto-generated |

## 🧪 Testing

Both clients include test scripts to verify your setup:

- **Python**: `python crash_reporter.py`
- **JavaScript**: `node test-simple.js`

## 📊 Data Collected

The clients automatically collect:

- **Application Info**: Name, version, platform
- **Crash Details**: Error message, stack trace, timestamp
- **Hardware Specs**: CPU, memory, OS details
- **User Context**: User ID, session ID (if provided)
- **Security**: HMAC-signed requests

## 🔒 Security Features

- **HMAC Signing**: All requests are cryptographically signed
- **Rate Limiting**: Built-in protection against abuse
- **Data Validation**: Input sanitization and validation
- **Secure Headers**: Proper Content-Type and security headers

## 🚨 Error Handling

Both clients include comprehensive error handling:

- Network failures
- Authentication errors
- Rate limiting
- Invalid responses
- Fallback to local storage when possible

## 📝 Integration Examples

### Web Application
```javascript
// Frontend error boundary
window.addEventListener('error', (event) => {
    reporter.reportCrash(event.error, {
        userId: getCurrentUserId(),
        sessionId: getSessionId()
    });
});
```

### Backend Service
```python
# Flask error handler
@app.errorhandler(Exception)
def handle_exception(e):
    reporter.report_crash(e, {
        "user_id": current_user.id if current_user.is_authenticated else None,
        "session_id": session.get('session_id')
    })
    return "Internal Server Error", 500
```

### Desktop Application
```python
# PyQt error handler
def handle_exception(exc_type, exc_value, exc_traceback):
    reporter.report_crash(exc_value, {
        "user_id": get_user_id(),
        "session_id": get_session_id()
    })
```

## 🆘 Troubleshooting

### Common Issues

1. **HMAC Secret Mismatch**: Ensure the secret in your client matches your worker
2. **API Endpoint**: Verify the URL is correct and accessible
3. **Environment Variables**: Check that `.env` file is properly configured
4. **Dependencies**: Ensure all required packages are installed

### Debug Mode

Enable debug logging by setting environment variables:

```bash
# Python
export DEBUG=1

# JavaScript
export DEBUG=1
```

## 📚 API Reference

For detailed API documentation, see the main project README or the individual client files.

## 🤝 Contributing

To add support for additional languages or improve existing clients:

1. Follow the existing code structure
2. Include comprehensive error handling
3. Add tests and documentation
4. Ensure HMAC signing is implemented
5. Follow the data format specification

## 📄 License

This project is licensed under the same terms as the main Universal Crash Analytics API project.
