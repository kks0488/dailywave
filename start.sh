#!/bin/bash

# Kill ports if already running (optional but safe)
lsof -ti:8020 | xargs kill -9 2>/dev/null
lsof -ti:3020 | xargs kill -9 2>/dev/null

echo "🚀 Starting Marktrade Workflow Engine..."

# Start Backend
cd backend
source venv/bin/activate
uvicorn main:app --reload --port 8020 &
BACKEND_PID=$!
echo "✅ Backend running on PID $BACKEND_PID"

# Start Frontend
cd ../frontend
npm run dev -- --host --port 3020 &
FRONTEND_PID=$!
echo "✅ Frontend running on PID $FRONTEND_PID"

echo "✨ System is ready!"
echo "👉 Frontend: http://localhost:3020"
echo "👉 Backend: http://localhost:8020"

# Wait for process
wait $BACKEND_PID $FRONTEND_PID
