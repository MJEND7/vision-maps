# Python Dev Server

## Overview

The `dev_server.py` is a custom Python HTTP server that runs the YouTube Captions API locally during development, without requiring Vercel CLI.

## Why Not Vercel CLI?

- **Simpler setup**: No need to install Vercel CLI globally
- **Faster startup**: Pure Python server without Node.js overhead
- **Better debugging**: Direct Python execution with full stack traces
- **Portable**: Works anywhere Python is installed

## How It Works

1. **Build Step**: Copies API files to `build/` directory
2. **Install Dependencies**: Installs Python packages from `requirements.txt`
3. **Run Server**: Starts custom HTTP server on port 3001
4. **Handle Requests**: Routes `/api/captions` to the Python function

## Architecture

```
HTTP Request
    ↓
http://localhost:3001/api/captions?video_id=XXX
    ↓
dev_server.py (HTTP Server)
    ↓
Routes to /api/captions
    ↓
Imports: from api.captions import get_youtube_captions
    ↓
Calls: get_youtube_captions(video_id, lang)
    ↓
Returns JSON response
```

## File Structure

```
apps/api/
├── api/
│   └── captions.py          # Main API handler
├── build/                    # Built files (gitignored)
│   ├── api/
│   │   └── captions.py
│   └── requirements.txt
├── dev_server.py            # Development HTTP server
├── requirements.txt         # Python dependencies
└── package.json            # npm scripts
```

## Development Workflow

```bash
# From monorepo root
pnpm dev

# Or run API only
pnpm --filter api dev
```

The `dev` script:
1. Cleans old build: `rm -rf build`
2. Creates build dir: `mkdir -p build`
3. Copies files: `cp -r api requirements.txt build/`
4. Installs deps: `pip install -q -r requirements.txt`
5. Runs server: `python dev_server.py 3001`

## Features

### CORS Support
- Automatically adds CORS headers
- Handles OPTIONS preflight requests
- Allows requests from any origin (development only)

### Error Handling
- Catches Python exceptions
- Returns proper HTTP status codes
- Provides JSON error responses

### Logging
- Logs all incoming requests
- Shows request path and client IP
- Formatted for easy debugging

## Testing

```bash
# Test the API locally
curl "http://localhost:3001/api/captions?video_id=dQw4w9WgXcQ&lang=en"

# Expected response
{
  "captions": "Full transcript text here..."
}
```

## Production Deployment

In production, the API is deployed to Vercel as serverless functions:
- Uses `api/captions.py` as Vercel function
- Configured via `vercel.json`
- Automatically handles Python runtime

The dev server is **only for local development** and is not used in production.

## Troubleshooting

### Port already in use
```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9
```

### Python dependencies not found
```bash
# Reinstall dependencies
pip install -r apps/api/requirements.txt
```

### Module import errors
Make sure the `build/` directory is created and contains:
- `api/captions.py`
- `requirements.txt`
- All installed packages

## Comparison: Dev Server vs Vercel

| Feature | Dev Server | Vercel CLI |
|---------|-----------|------------|
| Setup | Python only | Requires Vercel CLI + Node.js |
| Speed | Fast | Slower (Node.js overhead) |
| Debugging | Direct Python | Through Vercel wrapper |
| CORS | Built-in | Needs config |
| Dependencies | pip install | Handled by Vercel |
| Production Parity | Similar | Exact match |

For local development, the custom dev server provides a faster and simpler experience. For production deployment, Vercel handles everything automatically.
