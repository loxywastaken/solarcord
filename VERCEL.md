# Vercel deployment notes

This repository includes a Vercel entrypoint for Solarcord.

Deployment configuration is tracked on the `main` branch.

Required production environment variables:

- `DATABASE`: PostgreSQL connection string (recommended: Neon)
- `THREADS=1`

Solarcord's CDN storage defaults to the local filesystem. Vercel instances are ephemeral, so file uploads/avatars should use S3-compatible storage before treating this as a production deployment:

- `STORAGE_PROVIDER=s3`
- `STORAGE_BUCKET`
- `STORAGE_REGION`
- AWS credentials supported by the AWS SDK

The Vercel entrypoint loads the existing bundled Solarcord server, which listens on `process.env.PORT` and provides the HTTP API, CDN routes, and WebSocket gateway.
