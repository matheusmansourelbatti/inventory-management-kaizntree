import pytest
from decimal import Decimal
from django.urls import reverse


@pytest.mark.django_db
class TestAuth:
    def test_register(self, api_client):
        resp = api_client.post("/api/auth/register/", {
            "username": "newuser", "email": "new@example.com",
            "password": "strongpass123", "password_confirm": "strongpass123",
        })
        assert resp.status_code == 201
        assert resp.data["username"] == "newuser"

    def test_register_password_mismatch(self, api_client):
        resp = api_client.post("/api/auth/register/", {
            "username": "newuser", "email": "new@example.com",
            "password": "strongpass123", "password_confirm": "wrongpass",
        })
        assert resp.status_code == 400

    def test_login(self, api_client, user):
        resp = api_client.post("/api/auth/login/", {
            "username": "testuser", "password": "testpass123",
        })
        assert resp.status_code == 200
        assert "access" in resp.data
        assert "refresh" in resp.data

    def test_me(self, auth_client, user):
        resp = auth_client.get("/api/auth/me/")
        assert resp.status_code == 200
        assert resp.data["username"] == "testuser"

    def test_unauthenticated_access(self, api_client):
        resp = api_client.get("/api/products/")
        assert resp.status_code == 401



@pytest.mark.django_db
class TestProductEndpoints:
    def test_create_product(self, auth_client):
        resp = auth_client.post("/api/products/", {
            "name": "New Product", "sku": "NP-001", "unit": "kg", "description": "Test",
        })
        assert resp.status_code == 201
        assert resp.data["name"] == "New Product"

    def test_list_products(self, auth_client, product):
        resp = auth_client.get("/api/products/")
        assert resp.status_code == 200
        assert resp.data["count"] == 1

    def test_retrieve_product(self, auth_client, product):
        resp = auth_client.get(f"/api/products/{product.id}/")
        assert resp.status_code == 200
        assert resp.data["name"] == "Test Product"

    def test_update_product(self, auth_client, product):
        resp = auth_client.patch(f"/api/products/{product.id}/", {"name": "Updated Product"})
        assert resp.status_code == 200
        assert resp.data["name"] == "Updated Product"

    def test_delete_product(self, auth_client, product):
        resp = auth_client.delete(f"/api/products/{product.id}/")
        assert resp.status_code == 204

    def test_product_data_isolation(self, other_auth_client, product):
        resp = other_auth_client.get("/api/products/")
        assert resp.data["count"] == 0

    def test_product_detail_isolation(self, other_auth_client, product):
        resp = other_auth_client.get(f"/api/products/{product.id}/")
        assert resp.status_code == 404

    def test_duplicate_sku_same_user(self, auth_client):
        auth_client.post("/api/products/", {"name": "A", "sku": "DUP-001", "unit": "unit"})
        resp = auth_client.post("/api/products/", {"name": "B", "sku": "DUP-001", "unit": "unit"})
        assert resp.status_code == 400

    def test_product_financial_fields(self, auth_client, completed_purchase_order, completed_sales_order, product):
        resp = auth_client.get(f"/api/products/{product.id}/")
        assert Decimal(resp.data["total_purchased_cost"]) == Decimal("100.00")
        assert Decimal(resp.data["total_revenue"]) == Decimal("250.00")
        assert Decimal(resp.data["profit"]) == Decimal("150.00")


@pytest.mark.django_db
class TestStockEndpoints:
    def test_add_manual_stock(self, auth_client, product):
        resp = auth_client.post("/api/stocks/", {
            "product": str(product.id), "quantity": "50.000",
        })
        assert resp.status_code == 201
        assert resp.data["source"] == "manual"

    def test_list_stock_by_product(self, auth_client, product_with_stock, product):
        resp = auth_client.get(f"/api/stocks/?product={product.id}")
        assert resp.status_code == 200
        assert resp.data["count"] >= 1



@pytest.mark.django_db
class TestPurchaseOrderEndpoints:
    def test_create_purchase_order(self, auth_client, product):
        resp = auth_client.post("/api/purchase-orders/", {
            "reference": "PO-001", "supplier": "Supplier A", "status": "completed",
            "items": [{"product": str(product.id), "quantity": "100.000", "unit_cost": "1.00"}],
        }, format="json")
        assert resp.status_code == 201
        assert len(resp.data["items"]) == 1
        assert Decimal(resp.data["total_cost"]) == Decimal("100.00")

    def test_purchase_order_creates_stock(self, auth_client, product):
        auth_client.post("/api/purchase-orders/", {
            "reference": "PO-002", "status": "completed",
            "items": [{"product": str(product.id), "quantity": "75.000", "unit_cost": "2.00"}],
        }, format="json")
        resp = auth_client.get(f"/api/products/{product.id}/")
        assert Decimal(resp.data["current_stock"]) == Decimal("75.000")

    def test_draft_po_no_stock(self, auth_client, product):
        auth_client.post("/api/purchase-orders/", {
            "reference": "PO-DRAFT", "status": "draft",
            "items": [{"product": str(product.id), "quantity": "50.000", "unit_cost": "1.00"}],
        }, format="json")
        resp = auth_client.get(f"/api/products/{product.id}/")
        assert Decimal(resp.data["current_stock"]) == Decimal("0")

    def test_list_purchase_orders(self, auth_client, completed_purchase_order):
        resp = auth_client.get("/api/purchase-orders/")
        assert resp.status_code == 200
        assert resp.data["count"] >= 1

    def test_po_data_isolation(self, other_auth_client, completed_purchase_order):
        resp = other_auth_client.get("/api/purchase-orders/")
        assert resp.data["count"] == 0



@pytest.mark.django_db
class TestSalesOrderEndpoints:
    def test_create_sales_order(self, auth_client, product_with_stock, product):
        resp = auth_client.post("/api/sales-orders/", {
            "reference": "SO-001", "customer": "Customer A", "status": "completed",
            "items": [{"product": str(product.id), "quantity": "50.000", "unit_price": "10.00"}],
        }, format="json")
        assert resp.status_code == 201
        assert Decimal(resp.data["total_revenue"]) == Decimal("500.00")

    def test_sales_order_deducts_stock(self, auth_client, product_with_stock, product):
        auth_client.post("/api/sales-orders/", {
            "status": "completed",
            "items": [{"product": str(product.id), "quantity": "30.000", "unit_price": "5.00"}],
        }, format="json")
        resp = auth_client.get(f"/api/products/{product.id}/")
        assert Decimal(resp.data["current_stock"]) == Decimal("70.000")

    def test_insufficient_stock(self, auth_client, product_with_stock, product):
        resp = auth_client.post("/api/sales-orders/", {
            "status": "completed",
            "items": [{"product": str(product.id), "quantity": "200.000", "unit_price": "5.00"}],
        }, format="json")
        assert resp.status_code == 400

    def test_so_data_isolation(self, other_auth_client, completed_sales_order):
        resp = other_auth_client.get("/api/sales-orders/")
        assert resp.data["count"] == 0



@pytest.mark.django_db
class TestFinancialDashboard:
    def test_financial_summary(self, auth_client, completed_purchase_order, completed_sales_order):
        resp = auth_client.get("/api/financial/summary/")
        assert resp.status_code == 200
        assert "total_revenue" in resp.data
        assert "total_costs" in resp.data
        assert "total_profit" in resp.data
        assert "products" in resp.data
        assert Decimal(resp.data["total_costs"]) == Decimal("100.00")
        assert Decimal(resp.data["total_revenue"]) == Decimal("250.00")
        assert Decimal(resp.data["total_profit"]) == Decimal("150.00")

    def test_financial_summary_empty(self, auth_client):
        resp = auth_client.get("/api/financial/summary/")
        assert resp.status_code == 200
        assert Decimal(resp.data["total_revenue"]) == Decimal("0")
        assert Decimal(resp.data["total_costs"]) == Decimal("0")
