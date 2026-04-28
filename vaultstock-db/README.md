# VaultStock Database

Production grade PostgreSQL 16 database implementation for VaultStock enterprise inventory management system.

## ✅ Features
- **14 Tables** with full audit history, append-only ledgers, and immutable logs
- **Atomic transaction processing** with automatic stock movement tracking
- **Row Level Security** enforcing admin/shopkeeper role isolation
- **Materialized Views** for real-time analytics
- **Database level triggers** for automatic business logic
- **Full text search** for products, clients, and logs
- **Firestore compatible** schema for seamless migration
- **Docker deployment** with auto migrations

## 🚀 Quick Start

```bash
cp .env.example .env
docker compose up -d
```

Database will be available at: `postgresql://vaultstock:vaultstock@localhost:5432/vaultstock`

## 🗂️ Table Structure

| Table | Append Only | Deletable | Notes |
|---|---|---|---|
| `users` | ❌ | ✅ | Firebase UID primary keys |
| `admins` | ❌ | ✅ | bcrypt hashed auth keys |
| `products` | ❌ | ✅ | Soft delete via `is_active` |
| `clients` | ❌ | ✅ | Balance tracking |
| `orders` | ❌ | ✅ | Denormalized names for speed |
| `order_item_snapshots` | ✅ | ❌ | Immutable analytics ledger |
| `payments` | ✅ | ❌ | Financial append-only ledger |
| `stock_movements` | ✅ | ❌ | Full inventory audit trail |
| `logs` | ✅ | ❌ | Physically immutable |
| `insights` | ❌ | ✅ | Gemini + local fallback |
| `notifications` | ❌ | ✅ | User scoped |
| `refresh_tokens` | ❌ | ✅ | SHA-256 hashed only |
| `ai_chat_sessions` | ❌ | ✅ | |
| `ai_chat_messages` | ✅ | ❌ | |

## 🧮 Materialized Views
- `mv_daily_revenue` - Daily revenue breakdown
- `mv_product_sales` - Product performance analytics
- `mv_client_stats` - Client lifetime value metrics
- `mv_shopkeeper_stats` - Shopkeeper performance

## 🛠️ Maintenance

```bash
# Create full backup
./db-maintenance.sh backup

# Refresh all materialized views
./db-maintenance.sh refresh-views

# Show slow queries
./db-maintenance.sh slow-queries

# Clean expired tokens
./db-maintenance.sh cleanup-tokens
```

## 🔑 Row Level Security

All connections run with:
```sql
SET LOCAL app.current_user_id = '<user_uid>';
SET LOCAL app.current_role = 'admin|shop';
```

Policies automatically enforce shopkeeper isolation, admin access, and scope all operations per user.