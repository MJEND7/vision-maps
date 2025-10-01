# YouTube Captions API

Python serverless function for fetching YouTube video transcripts/captions.

## Deployment

This API is deployed automatically to Vercel as part of the main project.

### Setup

1. The Python API will be deployed to `/api/captions` endpoint
2. Set the environment variable in your Vercel project or `.env.local` for production:
   ```
   YOUTUBE_CAPTIONS_API_ENDPOINT=https://your-app.vercel.app/api/captions
   ```

### Local Development

The API runs automatically when you start the dev server from the monorepo root:

```bash
pnpm dev
```

This uses Turborepo to run all workspaces in parallel:
- `apps/web` - Next.js frontend on port 3000 + Convex backend
- `apps/api` - Custom Python dev server on port 3001

The Python API will be available at:
```
http://localhost:3001/api/captions?video_id=VIDEO_ID&lang=en
```

To use the Python API in local development, set the environment variable in `.env.local`:
```
YOUTUBE_CAPTIONS_API_ENDPOINT=http://localhost:3001/api/captions
```

**Note:** The dev server (`dev_server.py`) is a custom Python HTTP server that mimics Vercel's serverless function behavior for local development.

## Usage

### Endpoint

```
GET /api/captions?video_id={VIDEO_ID}&lang={LANGUAGE}
```

### Parameters

- `video_id` (required): The YouTube video ID (e.g., `dQw4w9WgXcQ`)
- `lang` (optional): Language code for captions (default: `en`)

### Response

```json
{
  "captions": "Full transcript text here..."
}
```

### Error Response

```json
{
  "error": "Missing video_id"
}
```

or

```json
{
  "captions": "Error: [error message]"
}
```

## Example

```bash
curl "https://your-app.vercel.app/api/captions?video_id=dQw4w9WgXcQ&lang=en"
```

## Dependencies

- `youtube-transcript-api==0.6.1` - Fetches YouTube video transcripts
