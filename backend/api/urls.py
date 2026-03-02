from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from . import views

router = DefaultRouter()
router.register(r"products", views.ProductViewSet, basename="product")
router.register(r"stocks", views.StockViewSet, basename="stock")
router.register(r"purchase-orders", views.PurchaseOrderViewSet, basename="purchase-order")
router.register(r"sales-orders", views.SalesOrderViewSet, basename="sales-order")

urlpatterns = [
    path("auth/register/", views.register, name="register"),
    path("auth/login/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("auth/me/", views.me, name="me"),
    path("financial/summary/", views.financial_summary, name="financial-summary"),
    path("", include(router.urls)),
]
