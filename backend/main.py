from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from schemas import Workflow
from executor import WorkflowExecutor
from storage import StorageManager
from calendar_gen import generate_calendar_ics
from typing import Dict, Any


app = FastAPI(
    title="DailyWave API",
    description="Transform your daily chaos into a flowing rhythm",
    version="1.0.0"
)
storage = StorageManager()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



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

@app.on_event("startup")
async def startup_event():
    print("🌊 DailyWave API Started")


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

@app.get("/health")
def health_check():
    return {"status": "healthy"}


