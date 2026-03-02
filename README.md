# Inventory Management System

An inventory management application built for Food & Beverages CPG brands. Manage products, track stock through purchase and sales orders, and analyze financial performance with profit margin calculations.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Python 3.12, Django 5.1, Django REST Framework |
| **Database** | PostgreSQL 16 |
| **Authentication** | JWT (Simple JWT) |
| **Frontend** | TypeScript, React 18, Vite |
| **UI Components** | Mantine v7 |
| **Data Fetching** | TanStack Query v5 |
| **Styling** | Tailwind CSS 3 |
| **Charts** | Recharts |
| **Containerization** | Docker + Docker Compose |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (React)                  │
│  ┌──────────┐ ┌───────────┐ ┌────────────────────┐  │
│  │  Mantine │ │ TanStack  │ │   React Router     │  │
│  │    UI    │ │  Query    │ │   (SPA Routing)    │  │
│  └──────────┘ └───────────┘ └────────────────────┘  │
│                       │                              │
│              Axios + JWT Interceptor                 │
└───────────────────────┬─────────────────────────────┘
                        │ HTTP (REST API)
┌───────────────────────┴─────────────────────────────┐
│                  Nginx Reverse Proxy                 │
│         /api/* → Backend   /* → Frontend SPA         │
└───────────────────────┬─────────────────────────────┘
                        │
┌───────────────────────┴─────────────────────────────┐
│               Backend (Django + DRF)                 │
│  ┌─────────────┐ ┌─────────────┐ ┌──────────────┐   │
│  │   Views /   │ │ Serializers │ │  JWT Auth    │   │
│  │  ViewSets   │ │  (DRF)      │ │  Middleware  │   │
│  └──────┬──────┘ └──────┬──────┘ └──────────────┘   │
│         │               │                            │
│  ┌──────┴───────────────┴───────────────────────┐    │
│  │              Django ORM Models                │    │
│  │  Product │ Stock │ PurchaseOrder │ SalesOrder │    │
│  └──────────────────┬───────────────────────────┘    │
└─────────────────────┬────────────────────────────────┘
                      │
               ┌──────┴──────┐
               │ PostgreSQL  │
               │     16      │
               └─────────────┘
```

### Key Design Decisions

1. **UUID Primary Keys**: All domain models use UUIDs to prevent enumeration attacks and allow safe client-side ID generation.

2. **Stock as Ledger Pattern**: Stock is modeled as individual entries (positive for additions, negative for deductions). Current stock is the sum of all entries for a product. This provides full audit trail.

3. **Order Status Workflow**: Orders follow `draft → completed → cancelled`. Stock is only affected when transitioning to `completed`. This prevents accidental inventory changes.

4. **Owner-Based Data Isolation**: Every model is scoped to the authenticated user via `owner` foreign key. QuerySets are always filtered by `request.user`.

5. **Computed Financial Properties**: Profit calculations are model properties that aggregate from completed orders only, ensuring draft/cancelled orders don't pollute financial data.

6. **Nested Serializers for Orders**: Purchase and sales orders use writable nested serializers for line items, allowing atomic creation of orders with their items.

---

## Database Schema (ER Diagram)

```
┌─────────────┐     ┌─────────────────┐     ┌──────────────────┐
│    User      │     │    Product      │     │      Stock       │
│─────────────│     │─────────────────│     │──────────────────│
│ id (PK)      │◄────│ owner (FK)      │◄────│ product (FK)     │
│ username     │     │ id (UUID, PK)   │     │ id (UUID, PK)    │
│ email        │     │ name            │     │ quantity (±)      │
│ password     │     │ description     │     │ source           │
│              │     │ sku (unique/own)│     │ note             │
│              │     │ unit            │     │ purchase_order   │
│              │     │ created_at      │     │   _item (FK,null)│
│              │     │ updated_at      │     │ created_at       │
└─────────────┘     └─────────────────┘     └──────────────────┘
      │                     ▲
      │                     │
      │    ┌────────────────┴──────────────────┐
      │    │                                    │
┌─────┴────┴──────┐              ┌──────────────┴─────┐
│ PurchaseOrder   │              │   SalesOrder       │
│─────────────────│              │────────────────────│
│ id (UUID, PK)   │              │ id (UUID, PK)      │
│ owner (FK)      │              │ owner (FK)         │
│ reference       │              │ reference          │
│ supplier        │              │ customer           │
│ status          │              │ status             │
│ notes           │              │ notes              │
└────────┬────────┘              └─────────┬──────────┘
         │                                  │
┌────────┴──────────┐           ┌──────────┴──────────┐
│PurchaseOrderItem  │           │  SalesOrderItem     │
│───────────────────│           │─────────────────────│
│ id (UUID, PK)     │           │ id (UUID, PK)       │
│ order (FK)        │           │ order (FK)          │
│ product (FK)      │           │ product (FK)        │
│ quantity          │           │ quantity            │
│ unit_cost         │           │ unit_price          │
└───────────────────┘           └─────────────────────┘
```

---

## Quick Start (Docker)

### Prerequisites
- Docker & Docker Compose installed

### Run

```bash
# Clone the repository
git clone <repo-url>
cd inventory-management

# Start all services (Postgres + Django + React/Nginx)
docker compose up --build -d

# The application is available at:
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000/api/
```

A demo user is automatically seeded with sample data: **username: `demo`**, **password: `demo1234`**

You can also register a new account from the login screen.

### Stop

```bash
docker compose down 
docker compose down -v 
```

---

## How to Use the Application

### 1. Login / Register

Open `http://localhost:3000`. Sign in with the demo account (`demo` / `demo1234`) or click **Register** to create your own account. Each user's data is fully isolated — you will only see products, orders, and financial data that belong to your account.

### 2. Dashboard

After logging in you land on the **Financial Dashboard**. This shows:
- KPI cards for total revenue, total costs, profit, and profit margin
- A bar chart comparing revenue vs. cost per product
- A detailed table with per-product financial breakdown (purchased qty, sold qty, cost, revenue, profit, margin)

### 3. Products

Navigate to **Products** in the sidebar to manage your product catalog.

- **Create a product**: Click "Add Product", fill in name, SKU, unit type (kg, g, L, mL, or units), and description.
- **Add stock manually**: Click the ⋮ menu on any product → "Add Stock" to record inventory received outside of a purchase order.
- **View details**: Click any product row to open a detail modal with three tabs:
  - **Overview** — name, SKU, unit, current stock
  - **Financials** — total cost, revenue, profit, and profit margin for that product
  - **Stock History** — a ledger of all stock additions (+) and deductions (−) with timestamps and source

### 4. Purchase Orders

Navigate to **Purchase Orders** to record product purchases from suppliers.

- Click "New Purchase Order", fill in a reference number, supplier name, and add line items (select a product, set quantity and unit cost).
- **Status matters**:
  - `Draft` — saves the order but does NOT affect stock
  - `Completed` — saves the order AND automatically adds stock for each line item
  - `Cancelled` — no stock effect
- You can view, edit, or delete existing orders from the ⋮ menu.

### 5. Sales Orders

Navigate to **Sales Orders** to record product sales to customers.

- Click "New Sales Order", fill in a reference, customer name, and add line items (product, quantity, unit price).
- Setting status to `Completed` will:
  - Validate that sufficient stock exists for every line item
  - Deduct stock automatically
  - If stock is insufficient, the order will be rejected with an error message
- The product selector shows current stock levels to help you avoid overselling.

### 6. Financial Analysis

Return to the **Dashboard** at any time to see updated financials. You can also click into any individual product (Products → click row → Financials tab) to see per-product profit analysis.

**Example scenario from the assignment**: Purchase 100 units of a product at $1/unit via a completed purchase order ($100 total cost). Then sell all 100 units at $10/unit via a completed sales order ($1,000 revenue). The dashboard and product detail will show: Cost $100, Revenue $1,000, Profit $900, Margin 900%.

---


### Run Tests

```bash
cd backend
pip install pytest pytest-django
pytest -v
```

---

## API Documentation

All endpoints require JWT authentication unless noted. Include the header:
```
Authorization: Bearer <access_token>
```

### Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|:---:|
| POST | `/api/auth/register/` | Register new user | No |
| POST | `/api/auth/login/` | Get JWT tokens | No |
| POST | `/api/auth/refresh/` | Refresh access token | No |
| GET | `/api/auth/me/` | Get current user info | Yes |

**Register** `POST /api/auth/register/`
```json
{
  "username": "john",
  "email": "john@example.com",
  "password": "securepass123",
  "password_confirm": "securepass123"
}
```

**Login** `POST /api/auth/login/`
```json
{ "username": "john", "password": "securepass123" }
```
Response: `{ "access": "...", "refresh": "..." }`

---

### Products

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products/` | List products (paginated, searchable) |
| POST | `/api/products/` | Create product |
| GET | `/api/products/{id}/` | Get product with financial data |
| PATCH | `/api/products/{id}/` | Update product |
| DELETE | `/api/products/{id}/` | Delete product |

**Create Product** `POST /api/products/`
```json
{
  "name": "Orange Juice",
  "sku": "OJ-001",
  "unit": "L",
  "description": "Premium organic orange juice"
}
```

Supported units: `kg`, `g`, `L`, `mL`, `unit`

**Product Detail Response** includes computed financial fields:
```json
{
  "id": "uuid",
  "name": "Orange Juice",
  "sku": "OJ-001",
  "unit": "L",
  "current_stock": "100.000",
  "total_purchased_quantity": "200.000",
  "total_purchased_cost": "700.00",
  "total_sold_quantity": "100.000",
  "total_revenue": "799.00",
  "profit": "99.00",
  "profit_margin": "14.14"
}
```

---

### Stock

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stocks/?product={id}` | List stock entries for a product |
| POST | `/api/stocks/` | Add manual stock |

**Add Stock** `POST /api/stocks/`
```json
{ "product": "uuid", "quantity": "50.000", "note": "Manual restock" }
```

---

### Purchase Orders

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/purchase-orders/` | List purchase orders |
| POST | `/api/purchase-orders/` | Create purchase order |
| GET | `/api/purchase-orders/{id}/` | Get purchase order detail |
| PUT | `/api/purchase-orders/{id}/` | Update purchase order |
| DELETE | `/api/purchase-orders/{id}/` | Delete purchase order |

**Create Purchase Order** `POST /api/purchase-orders/`
```json
{
  "reference": "PO-2025-001",
  "supplier": "Fresh Farms Co.",
  "status": "completed",
  "notes": "",
  "items": [
    { "product": "uuid", "quantity": "100.000", "unit_cost": "1.00" }
  ]
}
```

When `status` is set to `completed`, stock entries are automatically created for each line item.

---

### Sales Orders

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sales-orders/` | List sales orders |
| POST | `/api/sales-orders/` | Create sales order |
| GET | `/api/sales-orders/{id}/` | Get sales order detail |
| PUT | `/api/sales-orders/{id}/` | Update sales order |
| DELETE | `/api/sales-orders/{id}/` | Delete sales order |

**Create Sales Order** `POST /api/sales-orders/`
```json
{
  "reference": "SO-2025-001",
  "customer": "SuperMart Chain",
  "status": "completed",
  "items": [
    { "product": "uuid", "quantity": "50.000", "unit_price": "10.00" }
  ]
}
```

Completing a sales order validates stock availability and creates negative stock entries.

---

### Financial Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/financial/summary/` | Get financial summary |

**Response:**
```json
{
  "total_revenue": "1000.00",
  "total_costs": "100.00",
  "total_profit": "900.00",
  "profit_margin": "900.00",
  "total_products": 5,
  "total_purchase_orders": 2,
  "total_sales_orders": 2,
  "products": [ /* full product details with financials */ ]
}
```