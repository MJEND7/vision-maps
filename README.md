# Vision Maps - Turborepo Monorepo

A monorepo powered by Turborepo containing Vision Maps web application and Python API services.

## What's inside?

This monorepo includes the following packages/apps:

### Apps

- `apps/web`: Next.js web application with Convex backend
- `apps/api`: Python serverless functions (YouTube captions API)

### Packages

- `packages/*`: Shared packages (to be added as needed)

## Project Structure

```
vision-maps/
├── apps/
│   ├── web/              # Next.js frontend + Convex backend
│   │   ├── src/          # Source code
│   │   ├── public/       # Static assets
│   │   └── package.json
│   └── api/              # Python serverless functions
│       ├── api/          # API routes
│       │   └── captions.py
│       ├── requirements.txt
│       └── package.json
├── convex/               # Convex backend (shared at root)
├── packages/             # Shared packages
├── turbo.json           # Turborepo configuration
└── package.json         # Root package.json
```

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- Python 3.9+ with pip (for API functions)

```bash
# Install pnpm globally
npm install -g pnpm
```

### Installation

Install dependencies for all workspaces:

```bash
pnpm install
```

**Note:** This will install dependencies for the web app and create necessary workspace structure for the Python API. The API itself uses Python dependencies (pip), which are handled by Vercel during deployment.

### Development

Run all apps in development mode:

```bash
pnpm dev
```

This will start all services in parallel:
- **Next.js** on http://localhost:3000
- **Python API** on http://localhost:3001
- **Convex backend** (syncs in background)

All three services run concurrently via Turborepo and npm-run-all.

### Individual Service Commands

Run services individually:

```bash
# Run only Turborepo workspaces (Next.js + Python API)
pnpm dev:turbo

# Run only Convex
pnpm dev:convex

# Run specific workspace
pnpm --filter web dev
pnpm --filter api dev
```

### Build

Build all apps:

```bash
pnpm build
```

### Lint

Lint all apps:

```bash
pnpm lint
```

### Type Check

Type check all TypeScript apps:

```bash
pnpm typecheck
```

## Convex Backend

The Convex backend is located at the root level in the `convex/` directory and is shared across the monorepo.

### Convex Commands

```bash
# Start Convex in development mode (runs automatically with pnpm dev)
pnpm convex:dev

# Deploy Convex to production
pnpm convex:deploy
```

## Environment Variables

Create a `.env.local` file at the root with the following variables:

```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_key
CLERK_SECRET_KEY=your_secret
CLERK_JWT_ISSUER_DOMAIN=your_domain

# Convex
CONVEX_DEPLOYMENT=your_deployment
NEXT_PUBLIC_CONVEX_URL=your_url

# OpenAI
OPENAI_API_KEY=your_key

# YouTube Captions API (optional - for production)
YOUTUBE_CAPTIONS_API_ENDPOINT=https://your-app.vercel.app/api/captions
```

See `.env.local.example` for a complete list.

## Deployment

### Vercel Deployment

The monorepo can be deployed to Vercel:

1. Connect your repository to Vercel
2. Vercel will automatically detect the Turborepo setup
3. Set environment variables in Vercel dashboard
4. Deploy!

The Python API in `apps/api` will be automatically deployed as serverless functions.

### Convex Deployment

Deploy Convex separately:

```bash
npm run convex:deploy
```

## Turborepo Features

### Caching

Turborepo caches build outputs to speed up subsequent builds. The cache is stored in `.turbo/`.

### Parallel Execution

All workspace tasks run in parallel by default for maximum performance.

### Task Pipeline

Tasks are configured in `turbo.json` with dependency management:
- `build` tasks depend on upstream builds
- `dev` tasks run persistently without caching

## Learn More

- [Turborepo Documentation](https://turbo.build/repo/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Convex Documentation](https://docs.convex.dev)
- [Vercel Documentation](https://vercel.com/docs)

## Workspaces

### apps/web

Next.js application with:
- React 19
- TypeScript
- Tailwind CSS
- Convex realtime backend
- Clerk authentication

### apps/api

Python serverless functions:
- YouTube transcript fetching
- Deployed as Vercel serverless functions

## Contributing

1. Create a new branch
2. Make your changes
3. Run `npm run typecheck` and `npm run lint`
4. Submit a pull request
