import pytest
from decimal import Decimal
from api.models import Product, Stock, PurchaseOrder, PurchaseOrderItem, SalesOrder, SalesOrderItem


@pytest.mark.django_db
class TestProductModel:
    def test_create_product(self, user):
        product = Product.objects.create(
            owner=user, name="Orange Juice", description="Fresh OJ", sku="OJ-001", unit="L",
        )
        assert product.name == "Orange Juice"
        assert product.sku == "OJ-001"
        assert product.unit == "L"
        assert str(product) == "Orange Juice (OJ-001)"

    def test_current_stock_empty(self, product):
        assert product.current_stock == Decimal("0")

    def test_current_stock_with_entries(self, product):
        Stock.objects.create(product=product, quantity=Decimal("50"), source="manual")
        Stock.objects.create(product=product, quantity=Decimal("30"), source="manual")
        assert product.current_stock == Decimal("80")

    def test_current_stock_with_deductions(self, product):
        Stock.objects.create(product=product, quantity=Decimal("100"), source="manual")
        Stock.objects.create(product=product, quantity=Decimal("-40"), source="manual")
        assert product.current_stock == Decimal("60")

    def test_unique_sku_per_owner(self, user):
        Product.objects.create(owner=user, name="Product A", sku="SKU-001", unit="unit")
        with pytest.raises(Exception):
            Product.objects.create(owner=user, name="Product B", sku="SKU-001", unit="unit")

    def test_same_sku_different_owners(self, user, other_user):
        Product.objects.create(owner=user, name="Product A", sku="SKU-001", unit="unit")
        product_b = Product.objects.create(owner=other_user, name="Product B", sku="SKU-001", unit="unit")
        assert product_b.pk is not None


@pytest.mark.django_db
class TestProfitCalculations:

    def test_example_scenario(self, user):
        product = Product.objects.create(
            owner=user, name="Product A", sku="PA-001", unit="unit",
        )

        po = PurchaseOrder.objects.create(owner=user, status="completed")
        PurchaseOrderItem.objects.create(
            order=po, product=product, quantity=Decimal("100"), unit_cost=Decimal("1.00"),
        )
        Stock.objects.create(product=product, quantity=Decimal("100"), source="purchase_order")

        so = SalesOrder.objects.create(owner=user, status="completed")
        SalesOrderItem.objects.create(
            order=so, product=product, quantity=Decimal("100"), unit_price=Decimal("10.00"),
        )
        Stock.objects.create(product=product, quantity=Decimal("-100"), source="manual")

        assert product.total_purchased_cost == Decimal("100.00")
        assert product.total_revenue == Decimal("1000.00")
        assert product.profit == Decimal("900.00")
        assert product.profit_margin == Decimal("900.00")
        assert product.current_stock == Decimal("0")

    def test_profit_with_no_sales(self, user):
        product = Product.objects.create(owner=user, name="Unsold", sku="UN-001", unit="unit")
        po = PurchaseOrder.objects.create(owner=user, status="completed")
        PurchaseOrderItem.objects.create(
            order=po, product=product, quantity=Decimal("50"), unit_cost=Decimal("2.00"),
        )
        assert product.total_purchased_cost == Decimal("100.00")
        assert product.total_revenue == Decimal("0")
        assert product.profit == Decimal("-100.00")

    def test_profit_margin_no_cost(self, product):
        assert product.profit_margin is None

    def test_partial_sales(self, user):
        product = Product.objects.create(owner=user, name="Partial", sku="PT-001", unit="kg")
        po = PurchaseOrder.objects.create(owner=user, status="completed")
        PurchaseOrderItem.objects.create(
            order=po, product=product, quantity=Decimal("200"), unit_cost=Decimal("5.00"),
        )
        so = SalesOrder.objects.create(owner=user, status="completed")
        SalesOrderItem.objects.create(
            order=so, product=product, quantity=Decimal("100"), unit_price=Decimal("12.00"),
        )

        assert product.total_purchased_cost == Decimal("1000.00")
        assert product.total_revenue == Decimal("1200.00")
        assert product.profit == Decimal("200.00")
        assert product.profit_margin == Decimal("20.00")

    def test_draft_orders_not_counted(self, user):
        product = Product.objects.create(owner=user, name="Draft Test", sku="DR-001", unit="unit")
        po = PurchaseOrder.objects.create(owner=user, status="draft")
        PurchaseOrderItem.objects.create(
            order=po, product=product, quantity=Decimal("100"), unit_cost=Decimal("5.00"),
        )
        so = SalesOrder.objects.create(owner=user, status="draft")
        SalesOrderItem.objects.create(
            order=so, product=product, quantity=Decimal("50"), unit_price=Decimal("10.00"),
        )

        assert product.total_purchased_cost == Decimal("0")
        assert product.total_revenue == Decimal("0")
        assert product.profit == Decimal("0")




@pytest.mark.django_db
class TestPurchaseOrderModel:
    def test_total_cost(self, user, product):
        po = PurchaseOrder.objects.create(owner=user, status="draft")
        PurchaseOrderItem.objects.create(order=po, product=product, quantity=Decimal("10"), unit_cost=Decimal("5.00"))
        PurchaseOrderItem.objects.create(order=po, product=product, quantity=Decimal("20"), unit_cost=Decimal("3.00"))
        assert po.total_cost == Decimal("110.00")

    def test_purchase_order_str(self, user):
        po = PurchaseOrder.objects.create(owner=user, status="draft")
        assert "draft" in str(po)



@pytest.mark.django_db
class TestSalesOrderModel:
    def test_total_revenue(self, user, product):
        so = SalesOrder.objects.create(owner=user, status="draft")
        SalesOrderItem.objects.create(order=so, product=product, quantity=Decimal("10"), unit_price=Decimal("15.00"))
        SalesOrderItem.objects.create(order=so, product=product, quantity=Decimal("5"), unit_price=Decimal("20.00"))
        assert so.total_revenue == Decimal("250.00")
