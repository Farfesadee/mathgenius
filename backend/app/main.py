from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import solve, teach
from app.routers.exams import router as exams_router
from app.routers.cbt import router as cbt_router

# Create the FastAPI app
app = FastAPI(
    title="MathGenius API",
    description="AI-powered mathematics learning platform",
    version="1.0.0"
)

# CORS — this allows your React frontend to talk to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register the routers
app.include_router(solve.router)
app.include_router(teach.router)
app.include_router(exams_router)
app.include_router(cbt_router)

# Health check — tells you the server is alive
@app.get("/")
async def root():
    return {
        "message": "MathGenius API is running!",
        "version": "1.0.0",
        "modules": ["solve", "teach"]
    } 
