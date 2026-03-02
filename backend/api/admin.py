from django.contrib import admin
from .models import Product, Stock, PurchaseOrder, PurchaseOrderItem, SalesOrder, SalesOrderItem


class PurchaseOrderItemInline(admin.TabularInline):
    model = PurchaseOrderItem
    extra = 1


class SalesOrderItemInline(admin.TabularInline):
    model = SalesOrderItem
    extra = 1


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ["name", "sku", "unit", "owner", "created_at"]
    list_filter = ["unit", "owner"]
    search_fields = ["name", "sku"]


@admin.register(Stock)
class StockAdmin(admin.ModelAdmin):
    list_display = ["product", "quantity", "source", "created_at"]
    list_filter = ["source"]


@admin.register(PurchaseOrder)
class PurchaseOrderAdmin(admin.ModelAdmin):
    list_display = ["__str__", "supplier", "status", "owner", "created_at"]
    list_filter = ["status"]
    inlines = [PurchaseOrderItemInline]


@admin.register(SalesOrder)
class SalesOrderAdmin(admin.ModelAdmin):
    list_display = ["__str__", "customer", "status", "owner", "created_at"]
    list_filter = ["status"]
    inlines = [SalesOrderItemInline]
