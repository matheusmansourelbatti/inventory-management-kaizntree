from rest_framework import viewsets, status, permissions
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from decimal import Decimal

from .models import (
    Product,
    Stock,
    PurchaseOrder,
    SalesOrder,
)
from .serializers import (
    UserRegistrationSerializer,
    UserSerializer,
    ProductSerializer,
    ProductListSerializer,
    StockSerializer,
    PurchaseOrderSerializer,
    SalesOrderSerializer,
    FinancialSummarySerializer,
)



@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def register(request):
    serializer = UserRegistrationSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.save()
    return Response(
        UserSerializer(user).data,
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET"])
def me(request):
    return Response(UserSerializer(request.user).data)



class ProductViewSet(viewsets.ModelViewSet):

    filterset_fields = ["unit"]
    search_fields = ["name", "sku", "description"]
    ordering_fields = ["name", "created_at", "sku"]

    def get_serializer_class(self):
        if self.action == "list":
            return ProductListSerializer
        return ProductSerializer

    def get_queryset(self):
        return Product.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)



class StockViewSet(viewsets.ModelViewSet):

    serializer_class = StockSerializer

    def get_queryset(self):
        qs = Stock.objects.filter(product__owner=self.request.user)
        product_id = self.request.query_params.get("product")
        if product_id:
            qs = qs.filter(product_id=product_id)
        return qs

    def perform_create(self, serializer):
        product = serializer.validated_data["product"]
        if product.owner != self.request.user:
            raise PermissionError("You don't own this product.")
        serializer.save(source="manual")



class PurchaseOrderViewSet(viewsets.ModelViewSet):

    serializer_class = PurchaseOrderSerializer
    filterset_fields = ["status"]
    search_fields = ["reference", "supplier"]
    ordering_fields = ["created_at", "status"]

    def get_queryset(self):
        return PurchaseOrder.objects.filter(owner=self.request.user).prefetch_related(
            "items__product"
        )

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)



class SalesOrderViewSet(viewsets.ModelViewSet):

    serializer_class = SalesOrderSerializer
    filterset_fields = ["status"]
    search_fields = ["reference", "customer"]
    ordering_fields = ["created_at", "status"]

    def get_queryset(self):
        return SalesOrder.objects.filter(owner=self.request.user).prefetch_related(
            "items__product"
        )

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)



@api_view(["GET"])
def financial_summary(request):
    products = Product.objects.filter(owner=request.user)

    total_revenue = Decimal("0")
    total_costs = Decimal("0")

    for product in products:
        total_revenue += product.total_revenue
        total_costs += product.total_purchased_cost

    total_profit = total_revenue - total_costs
    margin = ((total_revenue - total_costs) / total_costs * 100) if total_costs > 0 else None

    data = {
        "total_revenue": total_revenue,
        "total_costs": total_costs,
        "total_profit": total_profit,
        "profit_margin": margin,
        "total_products": products.count(),
        "total_purchase_orders": PurchaseOrder.objects.filter(
            owner=request.user, status="completed"
        ).count(),
        "total_sales_orders": SalesOrder.objects.filter(
            owner=request.user, status="completed"
        ).count(),
        "products": ProductSerializer(products, many=True).data,
    }

    return Response(data)
