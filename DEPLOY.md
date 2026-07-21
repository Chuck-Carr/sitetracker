# SiteStatus — Production Deployment Guide

Step-by-step instructions for deploying SiteStatus on a fresh Ubuntu server.
The same steps apply to any Linux VPS (DigitalOcean, Hetzner, Linode, AWS EC2, etc.)
or a home server running Ubuntu 22.04+.

---

## What Gets Deployed

```
Internet
  │
  ▼
Caddy  (ports 80 + 443, automatic Let's Encrypt TLS)
  │
  ▼
Next.js App  (port 3000, internal only)
  ├── PostgreSQL  (port 5432, internal + loopback)
  └── MinIO       (port 9000, internal only)
```

All services run in Docker containers on a private internal network.
Only Caddy is exposed to the internet.

---

## Prerequisites

- Ubuntu 22.04+ server (minimum 1 GB RAM, 10 GB disk recommended)
- DNS A record for `sitestatus.com` pointing at your server's public IP
  *(and an A record for `www.sitestatus.com` if desired)*
- Ports **80** and **443** open in any firewall and router in front of the server
- SSH access to the server

> **Home server:** Forward TCP ports 80 and 443 to your server's local IP in your
> router's port-forwarding settings before starting. Caddy must be reachable on
> port 80 to complete the ACME HTTP-01 challenge that issues the TLS certificate.

---

## Part 1 — Prepare the Server

### 1.1 Update packages

```bash
sudo apt update && sudo apt upgrade -y
```

### 1.2 Install Docker

The official Docker convenience script installs the latest stable release
plus the Compose v2 plugin:

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker
```

Verify:

```bash
docker --version          # e.g. Docker version 27.x
docker compose version    # e.g. Docker Compose version v2.x
```

### 1.3 Install Node.js 22

Node.js is needed **only on the host** to run database migrations and the
admin bootstrap script. The app itself runs entirely inside Docker.

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node --version    # v22.x
```

### 1.4 Configure the firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

---

## Part 2 — Get the Code on the Server

### Option A — Clone from Git (recommended)

If you push your repo to GitHub/GitLab/Gitea:

```bash
cd ~
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git sitestatus
cd sitestatus
```

### Option B — Copy from your local machine

From your **local machine**:

```bash
rsync -avz \
  --exclude=node_modules \
  --exclude=.next \
  --exclude=app/generated \
  /Users/chuck/projects/sitetracker/ \
  user@YOUR_SERVER_IP:~/sitestatus/
```

Then on the server:

```bash
cd ~/sitestatus
```

### Install Node dependencies

These are needed by the migration and admin scripts (not the Docker build):

```bash
npm ci
```

### Generate the Prisma client

```bash
npx prisma generate
```

---

## Part 3 — Configure Environment Variables

### 3.1 Create your `.env` file

```bash
cp .env.example .env
nano .env
```

Work through every variable. The sections below explain each one.

### 3.2 Generate `SESSION_SECRET`

Run this and paste the output into `.env`:

```bash
openssl rand -base64 48
```

### 3.3 Variable reference

**`NEXT_PUBLIC_APP_URL`**
Your full public URL — must begin with `https://`. The app uses this to
determine whether to set the `Secure` flag on session cookies. If this is
wrong, logins will silently fail over HTTPS.

```
NEXT_PUBLIC_APP_URL=https://sitestatus.com
```

**`SESSION_SECRET`**
Long random string used to sign JWT session tokens. Keep this secret.
Rotating it invalidates all active sessions.

**`POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB`**
Credentials for the Postgres container. Choose a strong password.
**Avoid special shell characters** (`$`, `!`, `#`, `@`) in the password —
they cause quoting issues when the value is embedded in a connection URL.

**`DATABASE_URL`**
Copy the pattern below, substituting your password:

```
DATABASE_URL=postgresql://sitestatus:YOUR_PASSWORD@postgres:5432/sitestatus
```

The hostname must be `postgres` — that is the Docker service name on the
internal network. Do not change it to `localhost`.

**`MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD`**
MinIO admin credentials. `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY`
must be set to the **same values**; the app uses them to authenticate to MinIO.

**`DOMAIN`** and **`ACME_EMAIL`**
Your domain (no `https://`, no trailing slash) and an email address for
Let's Encrypt expiry notifications.

### 3.4 Verify the file

```bash
grep "replace_with" .env
```

This should produce no output. If it does, you missed a placeholder value.

---

## Part 4 — Initialize the Database

### 4.1 Start Postgres only

```bash
docker compose -p sitestatus -f docker-compose.prod.yml up -d postgres
```

Wait about 10 seconds, then confirm it is healthy:

```bash
docker compose -p sitestatus -f docker-compose.prod.yml ps
```

The `postgres` service should show `(healthy)`.

### 4.2 Run database migrations

The postgres container exposes port 5432 on `127.0.0.1` (loopback only)
so host-side tooling can reach it. Load your env vars and run:

```bash
set -a; source .env; set +a

DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@127.0.0.1:5432/${POSTGRES_DB}" \
  npx prisma migrate deploy
```

Expected output:

```
Applying migration `20260713132621_init`
Applying migration `20260713184453_device_regions_v1`
All migrations have been successfully applied.
```

### 4.3 Seed system device types

```bash
DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@127.0.0.1:5432/${POSTGRES_DB}" \
  npm run db:seed
```

This inserts the built-in fire alarm device types shared across all companies.
It is safe to run multiple times (uses `skipDuplicates`).

### 4.4 Create your first admin account

```bash
DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@127.0.0.1:5432/${POSTGRES_DB}" \
  npx tsx scripts/create-admin.ts
```

You will be prompted for:

| Prompt | Example |
|--------|---------|
| Company name | Acme Fire Protection |
| Company slug | acme (lowercase, hyphens ok) |
| Admin full name | Jane Smith |
| Admin email | jane@acme.com |
| Admin password | (min 8 characters) |

The script is idempotent — run it again to reset a password or add another admin.

---

## Part 5 — Build and Launch

### 5.1 Build the app image

```bash
docker compose -p sitestatus -f docker-compose.prod.yml build app
```

This compiles the Next.js app and generates the Prisma client inside the image.
First build takes 3–5 minutes depending on server speed.

### 5.2 Start all services

```bash
docker compose -p sitestatus -f docker-compose.prod.yml up -d
```

Services started:

| Service | Role |
|---------|------|
| `app` | Next.js application |
| `postgres` | PostgreSQL (already running) |
| `minio` | S3-compatible file storage |
| `minio-setup` | Creates the storage bucket, then exits |
| `caddy` | Reverse proxy + automatic HTTPS |

### 5.3 Check service status

```bash
docker compose -p sitestatus -f docker-compose.prod.yml ps
```

All long-running services should show `Up` or `Up (healthy)`. `minio-setup`
will show `Exited (0)` — that is expected.

### 5.4 Watch the logs

```bash
# All services
docker compose -p sitestatus -f docker-compose.prod.yml logs -f

# Caddy only (watch for certificate issuance)
docker compose -p sitestatus -f docker-compose.prod.yml logs -f caddy

# App only
docker compose -p sitestatus -f docker-compose.prod.yml logs -f app
```

Caddy will log something like this when the certificate is ready:

```
certificate obtained successfully  {"domain": "sitestatus.com"}
```

This can take up to 60 seconds on first start.

---

## Part 6 — Verify

1. Open `https://sitestatus.com` in a browser.
2. You should see the login page with a valid HTTPS padlock.
3. Log in with the email and password you entered in Step 4.4.

### Troubleshooting

**Browser shows "connection refused" or "site can't be reached"**
- DNS may not have propagated yet. Test with: `dig +short sitestatus.com`
- Check ports: `sudo ufw status` and confirm router forwarding.
- Check Caddy: `docker compose -p sitestatus -f docker-compose.prod.yml logs caddy`

**Caddy can't get a TLS certificate**
- Port 80 must be reachable from the internet for the ACME challenge.
- Let's Encrypt has rate limits. Do not restart Caddy repeatedly.

**Login silently fails / bounces back to login page**
- `NEXT_PUBLIC_APP_URL` must start with exactly `https://`.
  The app won't set `Secure` cookies without it, and the browser discards them.
- Verify: `grep NEXT_PUBLIC_APP_URL .env`

**App can't reach the database**
- `DATABASE_URL` in `.env` must use `postgres` (not `localhost`) as host.
- Restart: `docker compose -p sitestatus -f docker-compose.prod.yml restart app`
- Check app logs for connection errors.

---

## Part 7 — Updating the App

Pull the latest code and redeploy without downtime to other services:

```bash
cd ~/sitestatus
git pull

# Run any new migrations
set -a; source .env; set +a
DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@127.0.0.1:5432/${POSTGRES_DB}" \
  npx prisma migrate deploy

# Rebuild and restart only the app container
docker compose -p sitestatus -f docker-compose.prod.yml build app
docker compose -p sitestatus -f docker-compose.prod.yml up -d app
```

Postgres, MinIO, and Caddy keep running throughout.

---

## Part 8 — Database Backups

### Manual backup

```bash
set -a; source .env; set +a

docker compose -p sitestatus -f docker-compose.prod.yml exec postgres \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" \
  > "backup_$(date +%Y%m%d_%H%M%S).sql"
```

### Restore from a backup

```bash
set -a; source .env; set +a

docker compose -p sitestatus -f docker-compose.prod.yml exec -T postgres \
  psql -U "$POSTGRES_USER" "$POSTGRES_DB" < backup_20260101_120000.sql
```

### Automated daily backup via cron

Create the backup script:

```bash
sudo tee /usr/local/bin/sitestatus-backup > /dev/null << 'EOF'
#!/bin/bash
set -euo pipefail
APP_DIR=/home/$(logname)/sitestatus
BACKUP_DIR=/var/backups/sitestatus
mkdir -p "$BACKUP_DIR"
cd "$APP_DIR"
set -a; source .env; set +a
docker compose -p sitestatus -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" \
  | gzip > "$BACKUP_DIR/db_$(date +%Y%m%d).sql.gz"
# Keep the last 14 days
find "$BACKUP_DIR" -name "db_*.sql.gz" -mtime +14 -delete
EOF
sudo chmod +x /usr/local/bin/sitestatus-backup
```

Schedule it to run daily at 3 AM:

```bash
(crontab -l 2>/dev/null; echo "0 3 * * * /usr/local/bin/sitestatus-backup >> /var/log/sitestatus-backup.log 2>&1") | crontab -
```

---

## Part 9 — Maintenance Reference

### Common commands

```bash
# Shorthand — set this in your shell to save typing
alias dc='docker compose -p sitestatus -f ~/sitestatus/docker-compose.prod.yml'

dc ps                    # service status
dc logs -f               # live logs (all services)
dc logs -f app           # live logs (app only)
dc restart app           # restart just the app
dc restart               # restart everything
dc stop                  # stop everything (data preserved)
dc down                  # remove containers (data preserved in volumes)
dc down -v               # ⚠️  remove containers AND wipe all data
```

### Open a database shell

```bash
docker compose -p sitestatus -f docker-compose.prod.yml \
  exec postgres psql -U sitestatus sitestatus
```

### Reset an admin password

Re-run the create-admin script with the same email — it will update the
password for the existing user:

```bash
set -a; source .env; set +a
DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@127.0.0.1:5432/${POSTGRES_DB}" \
  npx tsx scripts/create-admin.ts
```

### Rotate `SESSION_SECRET`

Generate a new secret and update `.env`, then restart the app.
All existing sessions will be invalidated — all users will be logged out.

```bash
openssl rand -base64 48
# Update SESSION_SECRET in .env, then:
docker compose -p sitestatus -f docker-compose.prod.yml up -d app
```
