# Running the GymFlow stack with Docker

Domain-based split:

| Domain | Service | Container |
| --- | --- | --- |
| `gymflow.io` | Tenant client (`apps/web`) | `web` :3000 |
| `admin.gymflow.io` | Platform admin (`apps/platform`) | `platform` :3300 |
| `api.gymflow.io` | Backend (`apps/api`) | `api` :5000 |
| — | PostgreSQL | `postgres` :5432 |
| `:80` | nginx reverse proxy (routes the above) | `proxy` |

## Quick start

```bash
cp .env.docker.example .env      # then edit secrets
docker compose up -d --build
```

The `api` container runs `prisma db push` on startup to sync the schema (there
are no migration files in this repo), then boots NestJS.

### Local testing without real DNS

Add to `/etc/hosts`:

```
127.0.0.1  gymflow.io www.gymflow.io admin.gymflow.io api.gymflow.io
```

Then open <http://gymflow.io> (client) and <http://admin.gymflow.io> (admin).

## How it fits together

- **Two separate frontend images.** `apps/web` → `gymflow.io`, `apps/platform`
  → `admin.gymflow.io`. Both are Next.js `output: "standalone"` builds.
- **`basePath` is dropped for the admin subdomain.** `apps/platform` historically
  served under `/platform`. The Dockerfile builds it with
  `NEXT_PUBLIC_BASE_PATH=""`, so it serves at the subdomain root. Leave that arg
  unset to keep the legacy `/platform` prefix.
- **`NEXT_PUBLIC_API_URL` is baked at build time.** It is the API origin as seen
  from the browser (e.g. `https://api.gymflow.io`). Changing it requires
  rebuilding the frontends: `docker compose up -d --build web platform`.
- **CORS** is restricted to `CORS_ORIGINS` (comma-separated) on the API.
- **Prisma** runs on `node:20-slim` (glibc) for engine reliability; the
  `@gym/database` workspace package (TS source) is compiled to JS in the image
  so the compiled API can `require` it at runtime.

## Production TLS

The bundled nginx serves plain HTTP on `:80`. For HTTPS, either:

1. **Front it with a managed LB / Cloudflare** terminating TLS, forwarding to
   the proxy on `:80` (simplest — no config change needed), **or**
2. **Terminate TLS in nginx**: mount certificates and add `listen 443 ssl;`
   server blocks in `docker/nginx/nginx.conf` for each `server_name`, then
   publish `443:443` on the `proxy` service. Set `NEXT_PUBLIC_API_URL` and
   `CORS_ORIGINS` to their `https://` forms and rebuild the frontends.

## Common commands

```bash
docker compose logs -f api            # tail API logs
docker compose up -d --build web      # rebuild just the client
docker compose exec postgres psql -U gymflow gymflow   # DB shell
docker compose down                   # stop (keeps the pgdata volume)
docker compose down -v                # stop and wipe the database volume
```
