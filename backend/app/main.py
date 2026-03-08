from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.routers import solve, teach
from app.routers.exams import router as exams_router
from app.routers.cbt import router as cbt_router
from app.routers.tracking import router as tracking_router
from solution_generator import router as solution_router

# Create the FastAPI app FIRST
app = FastAPI(
    title="MathGenius API",
    description="AI-powered mathematics learning platform",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers AFTER app is created
app.include_router(solve.router)
app.include_router(teach.router)
app.include_router(exams_router)
app.include_router(cbt_router)
app.include_router(tracking_router)
app.include_router(solution_router)

# Serve images statically
app.mount("/images", StaticFiles(directory="images"), name="images")

# Health check
@app.get("/")
async def root():
    return {
        "message": "MathGenius API is running!",
        "version": "1.0.0",
        "modules": ["solve", "teach", "cbt", "exams", "tracking"]
    }