# VaultStock Backend

Complete production backend for VaultStock enterprise inventory management system.

## Tech Stack
- **Runtime:** Node.js + Express
- **Database:** PostgreSQL 16
- **Caching:** Redis 7
- **Auth:** JWT + Google OAuth
- **AI:** Google Gemini 2.0 Flash
- **Real-time:** Socket.IO
- **Deployment:** Docker + Docker Compose

## Features
✅ Full REST API with 9 resource endpoints
✅ Atomic transaction processing
✅ Role based access control
✅ Automatic audit logging
✅ Real-time WebSocket events
✅ AI driven inventory insights
✅ Complete analytics system

## Quick Start

```bash
# Start database services
docker compose up -d

# Install dependencies
npm install

# Run database migrations
npm run migrate

# Start development server
npm run dev
```

## Environment Variables
Copy `.env.example` to `.env` and configure:

```env
PORT=3001
DATABASE_URL=postgresql://vaultstock:vaultstock@localhost:5432/vaultstock
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-key
ADMIN_AUTH_KEY=LEONE_ADMIN_2026
GOOGLE_CLIENT_ID=your-google-client-id
GEMINI_API_KEY=your-gemini-api-key
```

## API Endpoints

| Route | Methods | Auth |
|---|---|---|
| `/api/v1/auth/*` | POST/GET | Public |
| `/api/v1/products` | GET/POST/PUT/DELETE | Authenticated |
| `/api/v1/clients` | GET/POST/PUT/DELETE | Authenticated |
| `/api/v1/orders` | GET/POST/PUT/DELETE | Authenticated |
| `/api/v1/payments` | GET/POST/PUT/DELETE | Authenticated |
| `/api/v1/insights` | GET/POST/DELETE | Authenticated |
| `/api/v1/analytics/*` | GET | Admin only |
| `/api/v1/logs` | GET | Admin only |
| `/api/v1/notifications` | GET/PATCH/DELETE | Authenticated |

## Database Schema
8 tables: `users`, `admins`, `products`, `clients`, `orders`, `payments`, `logs`, `insights`, `notifications`

## Business Logic
✅ **Atomic stock deduction** on order creation
✅ **Automatic payment status** calculation
✅ **Client balance tracking**
✅ **Low stock notifications**
✅ **Immutable audit logs**

## Development

```bash
# Run tests
npm test

# Build production
npm run build

# Start production
npm start
```

## Docker Deployment

```bash
# Build and start all services
docker compose up --build -d

# View logs
docker compose logs -f