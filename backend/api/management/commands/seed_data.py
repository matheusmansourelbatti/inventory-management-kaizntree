from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from api.models import Product, Stock, PurchaseOrder, PurchaseOrderItem, SalesOrder, SalesOrderItem
from decimal import Decimal


class Command(BaseCommand):
    help = "Seed the database with sample data"

    def handle(self, *args, **options):
        user, created = User.objects.get_or_create(
            username="demo",
            defaults={"email": "demo@example.com"},
        )
        if created:
            user.set_password("demo1234")
            user.save()
            self.stdout.write(self.style.SUCCESS("Created demo user (demo / demo1234)"))

        products_data = [
            {"name": "Organic Orange Juice", "sku": "OJ-001", "unit": "L", "description": "Premium organic orange juice, 100% natural"},
            {"name": "Whole Wheat Flour", "sku": "FL-001", "unit": "kg", "description": "Stone-ground whole wheat flour for baking"},
            {"name": "Sparkling Water", "sku": "SW-001", "unit": "unit", "description": "500mL bottles of sparkling mineral water"},
            {"name": "Olive Oil Extra Virgin", "sku": "OO-001", "unit": "mL", "description": "Cold-pressed extra virgin olive oil"},
            {"name": "Granola Bars", "sku": "GB-001", "unit": "unit", "description": "Healthy oat and honey granola bars, box of 12"},
        ]

        products = []
        for pd in products_data:
            product, _ = Product.objects.get_or_create(
                owner=user, sku=pd["sku"],
                defaults={k: v for k, v in pd.items() if k != "sku"},
            )
            products.append(product)

        po = PurchaseOrder.objects.create(
            owner=user, reference="PO-2025-001", supplier="Fresh Farms Co.", status="completed",
        )
        items = [
            PurchaseOrderItem.objects.create(order=po, product=products[0], quantity=Decimal("200"), unit_cost=Decimal("3.50")),
            PurchaseOrderItem.objects.create(order=po, product=products[1], quantity=Decimal("500"), unit_cost=Decimal("1.20")),
            PurchaseOrderItem.objects.create(order=po, product=products[2], quantity=Decimal("1000"), unit_cost=Decimal("0.50")),
        ]
        for item in items:
            Stock.objects.create(product=item.product, quantity=item.quantity, note=f"PO {po.reference}", source="purchase_order", purchase_order_item=item)

        po2 = PurchaseOrder.objects.create(
            owner=user, reference="PO-2025-002", supplier="Global Ingredients Ltd.", status="completed",
        )
        items2 = [
            PurchaseOrderItem.objects.create(order=po2, product=products[3], quantity=Decimal("5000"), unit_cost=Decimal("0.02")),
            PurchaseOrderItem.objects.create(order=po2, product=products[4], quantity=Decimal("300"), unit_cost=Decimal("2.00")),
        ]
        for item in items2:
            Stock.objects.create(product=item.product, quantity=item.quantity, note=f"PO {po2.reference}", source="purchase_order", purchase_order_item=item)

        so = SalesOrder.objects.create(
            owner=user, reference="SO-2025-001", customer="SuperMart Chain", status="completed",
        )
        sales_items = [
            SalesOrderItem.objects.create(order=so, product=products[0], quantity=Decimal("100"), unit_price=Decimal("7.99")),
            SalesOrderItem.objects.create(order=so, product=products[2], quantity=Decimal("500"), unit_price=Decimal("1.50")),
        ]
        for item in sales_items:
            Stock.objects.create(product=item.product, quantity=-item.quantity, note=f"SO {so.reference}", source="manual")

        so2 = SalesOrder.objects.create(
            owner=user, reference="SO-2025-002", customer="HealthFood Store", status="completed",
        )
        sales_items2 = [
            SalesOrderItem.objects.create(order=so2, product=products[1], quantity=Decimal("200"), unit_price=Decimal("3.50")),
            SalesOrderItem.objects.create(order=so2, product=products[4], quantity=Decimal("150"), unit_price=Decimal("4.99")),
        ]
        for item in sales_items2:
            Stock.objects.create(product=item.product, quantity=-item.quantity, note=f"SO {so2.reference}", source="manual")

        self.stdout.write(self.style.SUCCESS("Database seeded successfully!"))
