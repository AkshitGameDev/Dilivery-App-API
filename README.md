
# Delivery App API (Pilot X)

Node.js + Express API with **PostgreSQL (Prisma)** and **Redis**.
Implements **Q1 – Import Orders** with idempotency & no-change detection. (Q2/Q3 endpoints included where noted.)

## Tech Stack

* Node 20+ (tested with 20.x / 22.x)
* Express, Helmet, CORS, Pino
* **Prisma** (PostgreSQL)
* **Redis** (Render Key Value / ioredis)
* Nodemon (dev)

---

## 1) Quick Start

### 1.1 Prerequisites

* **Node** ≥ 20 (check: `node -v`)
* A **PostgreSQL** database (Render recommended)
* A **Redis** instance (Render Key Value)

> You can use Render for both DBs and run the API locally. No Docker required.

### 1.2 Clone

```bash
git clone https://github.com/<you>/Dilivery-App-API.git
cd Dilivery-App-API
npm ci
```

### 1.3 Environment variables

Create a `.env` in the project root:

```dotenv
# PostgreSQL (Render External URL — include port & sslmode & schema)
DATABASE_URL=postgresql://<USER>:<PASS>@<HOST>.render.com:5432/<DB>?sslmode=require&schema=public

# Redis (Render Key Value External URL — requires Access Control)
REDIS_URL=rediss://:<PASSWORD>@red-xxxxxxxxxxxxxxxx.<region>-kv.render.com:6379

# Optional (Express binds to PORT; Render injects this automatically in prod)
# PORT=4000
```

> **Important:**
>
> * In your Render Key Value service, go to **Settings → Access Control** and allow your IP (or `0.0.0.0/0` for quick dev).
> * Copy the **External** connection string from the **Connect → External** tab (starts with `rediss://`).

### 1.4 Generate Prisma client & apply schema

```bash
npx prisma generate
npx prisma migrate deploy
```

### 1.5 (Optional) Seed sample data

```bash
npm run seed
```

### 1.6 Run the API (dev)

```bash
npm run dev
```

* API: `http://localhost:4000`

---

## 2) Health Checks (Postman / browser)

* `GET /healthz` → basic ping
* `GET /healthz/db` → Postgres connectivity
* `GET /healthz/redis` → Redis connectivity

Examples:

```bash
curl -s http://localhost:4000/healthz
curl -s http://localhost:4000/healthz/db
curl -s http://localhost:4000/healthz/redis
```

Expected:

```json
// / or /healthz
{ "ok": true, "service": "pilotx-api", "ts": "..." }

// /healthz/db and /healthz/redis
{ "ok": true }
```

---

## 3) Q1 – Import Orders

### Endpoint

```
POST /api/import-orders
Content-Type: application/json
```

### Request body (example)

```json
{
  "platform": "custom",
  "order": {
    "externalId": "ORD-2001",
    "placedAt": "2025-09-24T12:00:00Z",
    "currency": "CAD",
    "totals": { "subtotal": 20, "shipping": 5, "tax": 0, "grand": 25 },
    "customer": { "name": "Testy McTest", "email": "t@example.com", "phone": "123" },
    "items": [{ "sku": "SKU1", "name": "Burger", "qty": 1, "price": 20 }],
    "shippingAddress": { "line1": "123 King St", "city": "Toronto", "state": "ON", "country": "CA", "postal": "M5H" },
    "status": "CREATED"
  }
}
```

### Responses

* `{"orderId":"...","status":"created"}` – first time
* `{"orderId":"...","status":"no_change"}` – same payload replay (hash match)
* `{"orderId":"...","status":"updated"}` – same `(platform, externalId)` but payload changed
* `409 {"error":"duplicate_request"}` – if you send `Idempotency-Key` twice quickly

### Optional header

```
Idempotency-Key: <any-unique-id>
```

---

## 4) (Optional) Q2/Q3 endpoints

### Driver heartbeat

```
POST /api/drivers/heartbeat
```

```json
{ "name":"Driver A", "lat":43.653, "lng":-79.383, "status":"available" }
```

→ `{ "ok": true, "driverId": "..." }`

### Jobs available near a location

```
GET /api/jobs/available?lat=43.653&lng=-79.383&radiusKm=5
```

→ `{ "ok": true, "count": n, "jobs": [ { "id": "...", "distanceKm": 1.23, ... } ] }`

### Accept a job

```
POST /api/jobs/:id/accept
```

```json
{ "driverId": "..." }
```

→ `{ "ok": true, "jobId": "..." }`

---

## 5) Scripts

`package.json`:

```json
{
  "scripts": {
    "dev": "nodemon src/index.js",
    "start": "node src/index.js",
    "build": "prisma generate",
    "migrate:deploy": "prisma migrate deploy",
    "seed": "node scripts/seed.js",
    "test": "echo \"No tests yet\" && exit 0"
  }
}
```

Common commands:

```bash
# install deps
npm ci

# prisma
npx prisma generate
npx prisma migrate dev --name init        # local, creates migration files
npx prisma migrate deploy                 # apply to target DB

# run
npm run dev
npm start                                 # production start

# seeding
npm run seed
```

---

## 6) Deploy to Render (Web Service)

1. **Push to GitHub**

   ```bash
   git add .
   git commit -m "deploy: initial"
   git push origin main
   ```

2. **Create Web Service** (Render dashboard → New → Web Service)

   * Select repo & **Node** environment
   * **Region**: same as your DB/KV
   * **Build Command**: `npm ci && npm run build`
   * **Start Command**: `npm run migrate:deploy && npm start`
   * **Health Check Path**: `/healthz`
   * **Auto deploy**: On

3. **Environment (Render → Web Service → Settings → Environment)**

   ```
   NODE_ENV=production
   DATABASE_URL=postgresql://<USER>:<PASS>@<HOST>.render.com:5432/<DB>?sslmode=require&schema=public
   REDIS_URL=redis://red-xxxxxxxxxxxxxxxx:6379   # Internal KV URL on Render
   ```

   Save → Redeploy.

4. **Verify**

   ```
   GET https://<your-service>.onrender.com/healthz
   GET https://<your-service>.onrender.com/healthz/db
   GET https://<your-service>.onrender.com/healthz/redis
   POST https://<your-service>.onrender.com/api/import-orders
   ```

> Locally you’ll use the **External** Redis URL (`rediss://...`) with TLS; on Render you can use the **Internal** (`redis://red-...:6379`) for speed.

---

## 7) Project Structure (key files)

```
src/
  index.js               # express app, health routes, routers
  db.js                  # Prisma client
  redis.js               # ioredis (TLS aware for rediss://)
  routes/
    orders.js            # Q1: import orders (created/updated/no_change + idempotency)
    drivers.js           # driver heartbeat
    jobs.js              # available jobs, accept job
prisma/
  schema.prisma          # models + @@unique(platform, externalId)
scripts/
  seed.js                # seed one order + job
.env                     # your local secrets (ignored by git)
```

---

## 8) Troubleshooting

* **`/healthz/db` fails**
  Ensure `DATABASE_URL` has `:5432` and `?sslmode=require&schema=public`.
  Run:

  ```bash
  npx prisma generate
  npx prisma migrate deploy
  ```

* **`/healthz/redis` fails locally**
  Use **External** Key Value URL (must allow your IP in **Access Control**), looks like:

  ```
  rediss://:<PASSWORD>@red-xxxx.<region>-kv.render.com:6379
  ```

  Ensure `src/redis.js` enables TLS when URL starts with `rediss://`:

  ```js
  import Redis from 'ioredis';
  const url = process.env.REDIS_URL;
  export const redis = new Redis(url, url?.startsWith('rediss://') ? { tls: {} } : {});
  ```

* **Render build fails: “Missing script: build”**
  Add `"build": "prisma generate"` to `package.json` or set Build Command to `npx prisma generate`.

* **Render start fails: “Missing script: migrate\:deploy”**
  Add `"migrate:deploy": "prisma migrate deploy"` to `package.json` or change Start Command to `npx prisma migrate deploy && node src/index.js`.

---

## 9) Security Notes

* Never commit `.env`. Use Render **Environment** for prod secrets.
* Rotate DB user passwords if you ever leak them.
* Limit Redis **Access Control** to your IP instead of `0.0.0.0/0` when possible.