This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, set up your environment variables by copying the example file:

```bash
cp .env.example .env.local
```

Then, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Health Checks

The frontend includes comprehensive health checks for all dependent services with service-specific monitoring:

### Services Monitored:

- **Steel Browser** (Docker: `steel-browser:3000`, External: `localhost:3003`) - Browser automation service
  - Uses HEAD requests to check service availability
  - Any HTTP response (even 404) indicates the service is running

- **SearX Search** (Docker: `searxng:8080`, External: `localhost:8080`) - Search engine service
  - Performs standard HTTP health checks
  - Requires successful HTTP response (200-299 status codes)

- **ChromaDB** (Docker: `chromadb:8000`, External: `localhost:8000`) - Vector database service
  - Uses HEAD requests for lightweight health checks
  - Accepts any HTTP response as indication of service health

- **Redis** - Cache service (used by SearXNG, managed by Docker dependency system)

### Environment Configuration:

The health checks automatically detect Docker vs localhost environments:

- **Docker Environment**: Uses Docker service names and internal ports
- **Development**: Uses localhost URLs with external mapped ports

### Configuration:

Set the following environment variables based on your environment:

**For Docker (recommended):**
```bash
# Docker internal service names
STEEL_BROWSER_URL=http://steel-browser:3000
SEARXNG_URL=http://searxng:8080
CHROMADB_URL=http://chromadb:8000
```

**For Local Development:**
```bash
# Local service URLs
STEEL_BROWSER_URL=http://localhost:3003
SEARXNG_URL=http://localhost:8080
CHROMADB_URL=http://localhost:8000
```

The health check automatically adapts to your environment based on the configured URLs.

### Health Status:

- **Online**: Service is responding and healthy
- **Offline**: Service is unreachable (timeout/network error)
- **Error**: Service returned an unexpected response

Health status can be viewed in the header's status dropdown. The health check endpoint is available at `/api/health` and returns detailed JSON data about all services.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
