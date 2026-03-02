import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from decimal import Decimal
from api.models import Product, Stock, PurchaseOrder, PurchaseOrderItem, SalesOrder, SalesOrderItem


@pytest.fixture
def user(db):
    return User.objects.create_user(username="testuser", password="testpass123", email="test@example.com")


@pytest.fixture
def other_user(db):
    return User.objects.create_user(username="otheruser", password="otherpass123", email="other@example.com")


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def auth_client(api_client, user):
    token = RefreshToken.for_user(user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.access_token}")
    return api_client


@pytest.fixture
def other_auth_client(api_client, other_user):
    client = APIClient()
    token = RefreshToken.for_user(other_user)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.access_token}")
    return client


@pytest.fixture
def product(user):
    return Product.objects.create(
        owner=user, name="Test Product", description="A test product", sku="TP-001", unit="unit",
    )


@pytest.fixture
def product_with_stock(product):
    Stock.objects.create(product=product, quantity=Decimal("100"), source="manual", note="Initial stock")
    return product


@pytest.fixture
def completed_purchase_order(user, product):
    po = PurchaseOrder.objects.create(owner=user, reference="PO-TEST", supplier="Test Supplier", status="completed")
    item = PurchaseOrderItem.objects.create(order=po, product=product, quantity=Decimal("100"), unit_cost=Decimal("1.00"))
    Stock.objects.create(product=product, quantity=Decimal("100"), source="purchase_order", purchase_order_item=item, note="PO")
    return po


@pytest.fixture
def completed_sales_order(user, product, completed_purchase_order):
    so = SalesOrder.objects.create(owner=user, reference="SO-TEST", customer="Test Customer", status="completed")
    SalesOrderItem.objects.create(order=so, product=product, quantity=Decimal("50"), unit_price=Decimal("5.00"))
    Stock.objects.create(product=product, quantity=Decimal("-50"), source="manual", note="SO deduction")
    return so
