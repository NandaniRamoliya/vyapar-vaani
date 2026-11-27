from fastapi import APIRouter
from app.models.schemas import ApiResponse, DashboardStats
from app.services.business_logic import BusinessService

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

@router.get("/stats", response_model=ApiResponse)
def get_dashboard_statistics():
    stats = BusinessService.get_dashboard_stats()
    return ApiResponse(
        success=True,
        message="Dashboard statistics retrieved",
        data=stats.model_dump()
    )
