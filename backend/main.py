import os
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from schemas import Workflow
from executor import WorkflowExecutor
from storage import StorageManager
from calendar_gen import generate_calendar_ics
from auth import APIKeyAuthMiddleware
from ai_proxy import router as ai_router
from memory_service import memorize_user_action
from typing import Dict, Any

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    import httpx
    memu_url = os.getenv("MEMU_URL", "http://localhost:8100")
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            r = await client.get(f"{memu_url}/health")
            if r.status_code == 200:
                print(f"🧠 memU connected at {memu_url}")
            else:
                print(f"⚠️  memU responded with {r.status_code} - AI personalization disabled")
    except Exception:
        print(f"⚠️  memU not available at {memu_url} - AI personalization disabled (app works fine without it)")
    print("🌊 DailyWave API Started")
    yield


app = FastAPI(
    title="DailyWave API",
    description="Transform your daily chaos into a flowing rhythm",
    version="1.1.0",
    lifespan=lifespan,
)
storage = StorageManager()

app.add_middleware(APIKeyAuthMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3005",
        "http://localhost:3020",
        "http://localhost:9008",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3005",
        "http://127.0.0.1:3020",
        "http://127.0.0.1:9008",
        "https://dailywave.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)
app.include_router(ai_router)



executor = WorkflowExecutor()

@app.post("/api/persistence/save")
async def save_persistence_state(data: Dict[str, Any]):
    success = storage.save_state(data)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to save state")
    return {"status": "saved"}

@app.get("/api/persistence/load")
async def load_persistence_state():
    data = storage.load_state()
    return {"status": "loaded", "data": data}

@app.get("/api/calendar/feed")
async def get_calendar_feed():
    data = storage.load_state()
    ics_content = generate_calendar_ics(data)
    return Response(content=ics_content, media_type="text/calendar")


@app.get("/")
def read_root():
    return {"status": "ok", "message": "DailyWave API is Running", "version": "1.0.0"}

@app.post("/execute")
async def execute_workflow(workflow: Workflow):
    """
    Executes a workflow immediately.
    """
    try:
        results = await executor.run(workflow)
        return {"status": "completed", "results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/memory/track")
async def track_user_action(data: Dict[str, Any]):
    """Track user actions for memU learning (non-blocking)"""
    user_id = data.get("user_id", "guest")
    action_type = data.get("action_type", "unknown")
    action_data = data.get("data", {})
    await memorize_user_action(user_id, action_type, action_data)
    return {"status": "tracked"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}


