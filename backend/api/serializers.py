from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    Product,
    Stock,
    PurchaseOrder,
    PurchaseOrderItem,
    SalesOrder,
    SalesOrderItem,
)


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ["id", "username", "email", "password", "password_confirm"]

    def validate(self, data):
        if data["password"] != data["password_confirm"]:
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        return data

    def create(self, validated_data):
        validated_data.pop("password_confirm")
        user = User.objects.create_user(**validated_data)
        return user


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email"]



class StockSerializer(serializers.ModelSerializer):
    class Meta:
        model = Stock
        fields = [
            "id", "product", "quantity", "note", "source",
            "purchase_order_item", "created_at",
        ]
        read_only_fields = ["id", "created_at", "source", "purchase_order_item"]


class ProductSerializer(serializers.ModelSerializer):
    current_stock = serializers.DecimalField(max_digits=12, decimal_places=3, read_only=True)
    total_purchased_quantity = serializers.DecimalField(max_digits=12, decimal_places=3, read_only=True)
    total_purchased_cost = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    total_sold_quantity = serializers.DecimalField(max_digits=12, decimal_places=3, read_only=True)
    total_revenue = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    profit = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    profit_margin = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True, allow_null=True)

    class Meta:
        model = Product
        fields = [
            "id", "name", "description", "sku", "unit",
            "current_stock", "total_purchased_quantity", "total_purchased_cost",
            "total_sold_quantity", "total_revenue", "profit", "profit_margin",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_sku(self, value):
        request = self.context.get("request")
        if request and request.user:
            qs = Product.objects.filter(owner=request.user, sku=value)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError("A product with this SKU already exists.")
        return value


class ProductListSerializer(serializers.ModelSerializer):
    current_stock = serializers.DecimalField(max_digits=12, decimal_places=3, read_only=True)

    class Meta:
        model = Product
        fields = ["id", "name", "description", "sku", "unit", "current_stock", "created_at"]



class PurchaseOrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    total_cost = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = PurchaseOrderItem
        fields = ["id", "product", "product_name", "quantity", "unit_cost", "total_cost"]
        read_only_fields = ["id"]


class PurchaseOrderSerializer(serializers.ModelSerializer):
    items = PurchaseOrderItemSerializer(many=True)
    total_cost = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = PurchaseOrder
        fields = [
            "id", "reference", "supplier", "status", "notes",
            "items", "total_cost", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_items(self, items):
        if not items:
            raise serializers.ValidationError("At least one item is required.")
        return items

    def validate(self, data):
        request = self.context.get("request")
        for item_data in data.get("items", []):
            product = item_data.get("product")
            if product and product.owner != request.user:
                raise serializers.ValidationError(
                    f"Product {product.name} does not belong to you."
                )
        return data

    def create(self, validated_data):
        items_data = validated_data.pop("items")
        order = PurchaseOrder.objects.create(**validated_data)
        for item_data in items_data:
            PurchaseOrderItem.objects.create(order=order, **item_data)

        if order.status == "completed":
            self._add_stock_for_order(order)

        return order

    def update(self, instance, validated_data):
        items_data = validated_data.pop("items", None)
        old_status = instance.status
        new_status = validated_data.get("status", old_status)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if items_data is not None:
            instance.items.all().delete()
            for item_data in items_data:
                PurchaseOrderItem.objects.create(order=instance, **item_data)

        if old_status != "completed" and new_status == "completed":
            self._add_stock_for_order(instance)

        return instance

    def _add_stock_for_order(self, order):
        for item in order.items.all():
            Stock.objects.create(
                product=item.product,
                quantity=item.quantity,
                note=f"Purchase Order {str(order.id)[:8]}",
                source="purchase_order",
                purchase_order_item=item,
            )



class SalesOrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    total_price = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = SalesOrderItem
        fields = ["id", "product", "product_name", "quantity", "unit_price", "total_price"]
        read_only_fields = ["id"]


class SalesOrderSerializer(serializers.ModelSerializer):
    items = SalesOrderItemSerializer(many=True)
    total_revenue = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = SalesOrder
        fields = [
            "id", "customer", "reference", "status", "notes",
            "items", "total_revenue", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_items(self, items):
        if not items:
            raise serializers.ValidationError("At least one item is required.")
        return items

    def validate(self, data):
        request = self.context.get("request")
        for item_data in data.get("items", []):
            product = item_data.get("product")
            if product and product.owner != request.user:
                raise serializers.ValidationError(
                    f"Product {product.name} does not belong to you."
                )

        if data.get("status") == "completed":
            for item_data in data.get("items", []):
                product = item_data["product"]
                qty = item_data["quantity"]
                if product.current_stock < qty:
                    raise serializers.ValidationError(
                        f"Insufficient stock for {product.name}. "
                        f"Available: {product.current_stock}, Requested: {qty}"
                    )
        return data

    def create(self, validated_data):
        items_data = validated_data.pop("items")
        order = SalesOrder.objects.create(**validated_data)
        for item_data in items_data:
            SalesOrderItem.objects.create(order=order, **item_data)

        if order.status == "completed":
            self._deduct_stock_for_order(order)

        return order

    def update(self, instance, validated_data):
        items_data = validated_data.pop("items", None)
        old_status = instance.status
        new_status = validated_data.get("status", old_status)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if items_data is not None:
            instance.items.all().delete()
            for item_data in items_data:
                SalesOrderItem.objects.create(order=instance, **item_data)

        if old_status != "completed" and new_status == "completed":
            self._deduct_stock_for_order(instance)

        return instance

    def _deduct_stock_for_order(self, order):
        for item in order.items.all():
            Stock.objects.create(
                product=item.product,
                quantity=-item.quantity,
                note=f"Sales Order {str(order.id)[:8]}",
                source="manual",
            )



class FinancialSummarySerializer(serializers.Serializer):
    total_revenue = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_costs = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_profit = serializers.DecimalField(max_digits=14, decimal_places=2)
    profit_margin = serializers.DecimalField(
        max_digits=10, decimal_places=2, allow_null=True
    )
    total_products = serializers.IntegerField()
    total_purchase_orders = serializers.IntegerField()
    total_sales_orders = serializers.IntegerField()
    products = ProductSerializer(many=True)
