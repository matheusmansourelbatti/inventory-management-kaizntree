import uuid
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator
from decimal import Decimal


class Product(models.Model):

    UNIT_CHOICES = [
        ("kg", "Kilograms"),
        ("g", "Grams"),
        ("L", "Liters"),
        ("mL", "Milliliters"),
        ("unit", "Units"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="products"
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    sku = models.CharField(max_length=100, verbose_name="SKU/Code")
    unit = models.CharField(max_length=4, choices=UNIT_CHOICES, default="unit")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        unique_together = ["owner", "sku"]

    def __str__(self):
        return f"{self.name} ({self.sku})"

    @property
    def current_stock(self) -> Decimal:
        result = self.stocks.aggregate(total=models.Sum("quantity"))
        return result["total"] or Decimal("0")

    @property
    def total_purchased_quantity(self) -> Decimal:
        result = PurchaseOrderItem.objects.filter(
            product=self, order__status="completed"
        ).aggregate(total=models.Sum("quantity"))
        return result["total"] or Decimal("0")

    @property
    def total_purchased_cost(self) -> Decimal:
        items = PurchaseOrderItem.objects.filter(
            product=self, order__status="completed"
        )
        total = sum(item.quantity * item.unit_cost for item in items)
        return Decimal(str(total))

    @property
    def total_sold_quantity(self) -> Decimal:
        result = SalesOrderItem.objects.filter(
            product=self, order__status="completed"
        ).aggregate(total=models.Sum("quantity"))
        return result["total"] or Decimal("0")

    @property
    def total_revenue(self) -> Decimal:
        items = SalesOrderItem.objects.filter(
            product=self, order__status="completed"
        )
        total = sum(item.quantity * item.unit_price for item in items)
        return Decimal(str(total))

    @property
    def profit(self) -> Decimal:
        return self.total_revenue - self.total_purchased_cost

    @property
    def profit_margin(self) -> Decimal | None:
        cost = self.total_purchased_cost
        if cost == 0:
            return None
        return ((self.total_revenue - cost) / cost) * 100


class Stock(models.Model):

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="stocks")
    quantity = models.DecimalField(
        max_digits=12, decimal_places=3, validators=[MinValueValidator(Decimal("0"))]
    )
    note = models.CharField(max_length=255, blank=True, default="")
    source = models.CharField(
        max_length=20,
        choices=[("manual", "Manual"), ("purchase_order", "Purchase Order")],
        default="manual",
    )
    purchase_order_item = models.ForeignKey(
        "PurchaseOrderItem",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="stock_entries",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Stock {self.id}: {self.product.name} x {self.quantity}"


class PurchaseOrder(models.Model):

    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("completed", "Completed"),
        ("cancelled", "Cancelled"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="purchase_orders"
    )
    reference = models.CharField(max_length=100, blank=True, default="")
    supplier = models.CharField(max_length=255, blank=True, default="")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
    notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"PO-{str(self.id)[:8]} ({self.status})"

    @property
    def total_cost(self) -> Decimal:
        total = sum(
            item.quantity * item.unit_cost for item in self.items.all()
        )
        return Decimal(str(total))


class PurchaseOrderItem(models.Model):

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(
        PurchaseOrder, on_delete=models.CASCADE, related_name="items"
    )
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.DecimalField(
        max_digits=12, decimal_places=3, validators=[MinValueValidator(Decimal("0.001"))]
    )
    unit_cost = models.DecimalField(
        max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))]
    )

    def __str__(self):
        return f"{self.product.name} x {self.quantity} @ ${self.unit_cost}"

    @property
    def total_cost(self) -> Decimal:
        return self.quantity * self.unit_cost


class SalesOrder(models.Model):

    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("completed", "Completed"),
        ("cancelled", "Cancelled"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sales_orders"
    )
    customer = models.CharField(max_length=255, blank=True, default="")
    reference = models.CharField(max_length=100, blank=True, default="")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
    notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"SO-{str(self.id)[:8]} ({self.status})"

    @property
    def total_revenue(self) -> Decimal:
        total = sum(
            item.quantity * item.unit_price for item in self.items.all()
        )
        return Decimal(str(total))


class SalesOrderItem(models.Model):

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(
        SalesOrder, on_delete=models.CASCADE, related_name="items"
    )
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.DecimalField(
        max_digits=12, decimal_places=3, validators=[MinValueValidator(Decimal("0.001"))]
    )
    unit_price = models.DecimalField(
        max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))]
    )

    def __str__(self):
        return f"{self.product.name} x {self.quantity} @ ${self.unit_price}"

    @property
    def total_price(self) -> Decimal:
        return self.quantity * self.unit_price
