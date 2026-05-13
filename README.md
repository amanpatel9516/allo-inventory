# Allo Health - High-Concurrency Inventory Engine

A production-grade inventory reservation system built for multi-warehouse D2C brands. This system solves the classic e-commerce race condition: preventing overselling during high-traffic checkouts without artificially depleting stock during cart abandonment.

## 🚀 Live Demo
**URL**: [Your Vercel URL will go here]

---

## 🛠️ Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (End-to-End Type Safety)
- **Database**: PostgreSQL (Supabase) + Prisma ORM
- **Concurrency/Idempotency**: Upstash Redis
- **Validation**: Zod
- **UI/UX**: Tailwind CSS + shadcn/ui + Sonner

---

## 🌟 Key Features & Novelty

### 1. Atomic Reservation Engine (Concurrency-Safe)
Instead of a naive "check then update" logic, this system utilizes **Pessimistic Locking** (`SELECT FOR UPDATE SKIP LOCKED`) within a single database transaction. 
- **Result**: It is mathematically impossible to oversell an item, even if thousands of requests hit the same SKU at the same millisecond.

### 2. Self-Healing "Shadow Stock" (World-Level Novelty)
Real-world warehouses have "shrinkage" (lost/damaged items). 
- **Algorithm**: We implemented a **Warehouse Reliability Score** using **Laplace Smoothing**.
- **Logic**: If a warehouse has a history of missing items, the engine automatically calculates a **Shadow Buffer** (e.g., hiding 15% of stock from the public). 
- **Benefit**: Protects the customer experience by only promising stock we are *confident* exists.

### 3. Distributed Idempotency (Upstash Redis)
To handle network retries and "double-click" scenarios, we implemented a custom `withIdempotency` wrapper.
- **Logic**: Uses Redis `SET NX` with a TTL to ensure that duplicate requests with the same `Idempotency-Key` do not trigger multiple side effects.

### 4. 3-Layer Expiry Strategy
Reservations automatically expire after 10 minutes via:
1. **Vercel Cron Job**: Frequent background sweeps.
2. **Lazy Cleanup on Read**: Ensuring users never see "dead" stock.
3. **API Validation**: The `/confirm` endpoint rejects tokens if the DB timestamp has passed.

---

## 💻 Local Setup

1. **Clone the Repo**:
   ```bash
   git clone <your-repo-url>
   cd allo-inventory
   ```

2. **Environment Variables**:
   Create a `.env` file with:
   ```env
   DATABASE_URL="your_supabase_connection_string"
   DIRECT_URL="your_supabase_direct_string"
   REDIS_URL="your_upstash_redis_url"
   REDIS_TOKEN="your_upstash_redis_token"
   CRON_SECRET="your_secret_key"
   ```

3. **Install & Sync**:
   ```bash
   npm install
   npx prisma db push
   npm run db:seed
   ```

4. **Run**:
   ```bash
   npm run dev
   ```

---

## 🧪 Testing the Novelty
1. Go to `/admin/inventory`.
2. Click **"Report Error"** on a warehouse.
3. Observe the **Trust %** drop and the **Shadow Buffer** automatically hiding stock on the storefront.
4. Click **"Mark Success"** to see the system "heal" itself as trust increases.
