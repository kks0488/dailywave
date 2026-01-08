# 🌊 DailyWave

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://www.apache.org/licenses/LICENSE-2.0)
[![Stars](https://img.shields.io/github/stars/kkaemo/dailywave.svg?style=social)](https://github.com/kkaemo/dailywave)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)

> **"One clear next step. Then the next."**

DailyWave is an ADHD-friendly flow planner that turns messy to-do lists into a calm, guided sequence.
It recommends one task you can start now, shows only the next step, and blends routines with projects in a
single focused view.

[**🚀 Try it live (https://dailywave.vercel.app/)**](https://dailywave.vercel.app/)

## Screenshot

![DailyWave landing page](docs/assets/landing.png)

## What you will see in 60 seconds

1. Set your current energy (low/medium/high).
2. Get a single "What's Next?" recommendation.
3. Start a visual timer and focus on just one step.
4. Watch routines and project flows update in real time.

## Demo links (for screenshots)

- Landing page: `https://dailywave.vercel.app/?landing=1`
- App demo (EN, always reset): `https://dailywave.vercel.app/?demo=reset&lang=en`
- App demo (KO, always reset): `https://dailywave.vercel.app/?demo=reset&lang=ko`
- Local capture: `http://localhost:3020/?demo=reset&lang=ko`

## Key features

- **"What's Next?" AI (Gemini, optional)** for energy-aware recommendations
- **Time Buddy** visual countdown timer that makes time feel real
- **Flow-based workflows** with clear next-step logic
- **Drag-and-drop** workflows and steps
- **Daily routines** alongside projects in one timeline
- **Live calendar sync** via standard `.ics` feeds
- **Multi-language UI** (EN/KR/JA/ZH) and dark mode
- **Auto-save** so progress never disappears

## How it works

1. Create nodes for tasks or routines.
2. Connect nodes into a flow that defines order.
3. The engine finds the next actionable step.
4. Progress updates instantly and syncs to calendar feeds.

## Quick start

### Docker (recommended)

```bash
git clone https://github.com/kkaemo/dailywave.git
cd dailywave
docker-compose up -d
```

- Web UI: `http://localhost:3020`
- API docs: `http://localhost:8020/docs`

### Local development

#### Backend (FastAPI)
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8020 --reload
```

#### Frontend (React + Vite)
```bash
cd frontend
npm install
cp .env.example .env  # Optional: add your Gemini API key
npm run dev -- --port 3020
```

### Production (PM2)

```bash
npm install pm2 -g
pm2 start ecosystem.config.js
```

## Tech stack

### Frontend
- **React 18** + **Vite**
- **Zustand** for state
- **Lucide React** icons
- **Modern CSS** with glassmorphism-inspired UI

### Backend
- **FastAPI** for async APIs
- **NetworkX** for flow/DAG execution
- **Pydantic** for validation
- **iCalendar** for `.ics` feeds

### DevOps
- **Docker** for local/production parity
- **PM2** for process management

## API overview

| Endpoint | Method | Description |
| :--- | :---: | :--- |
| `/` | `GET` | Health check & version |
| `/api/persistence/load` | `GET` | Load saved state |
| `/api/persistence/save` | `POST` | Save app state |
| `/api/calendar/feed` | `GET` | `.ics` calendar feed |
| `/execute` | `POST` | Run a workflow pipeline |

## Project structure

```text
dailywave/
├── frontend/           # React + Vite application
│   ├── src/            # Components, store, assets
│   └── public/         # Static assets
├── backend/            # FastAPI application
│   ├── data/           # Persistent storage (JSON)
│   └── ...             # Core logic (executor, storage, calendar)
├── docker-compose.yml  # Container orchestration
└── ecosystem.config.js # PM2 config
```

## Internationalization

- 🇺🇸 English
- 🇰🇷 Korean
- 🇯🇵 Japanese
- 🇨🇳 Chinese

## Contributing

1. Fork the project
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m "Add some AmazingFeature"`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a pull request

## Open Source & Future Plans

DailyWave is a **personal, open-source project** created to explore a more humane,
ADHD-friendly approach to productivity and daily workflows.

The core application is fully open source and can be freely **self-hosted, modified,
and extended** under the terms of the Apache-2.0 License.

If there is sufficient interest in the future, **optional hosted services or premium
features** (such as cloud sync, enhanced AI recommendations, or mobile integrations)
may be offered. These would always remain **optional**, and self-hosting will continue
to be supported.

This project is developed and maintained by an individual in their spare time.
As such, there are **no guarantees or commercial commitments**, but feedback,
ideas, and contributions are always welcome ❤️

## Trademark Notice

“DailyWave” and the DailyWave logo are **trademarks of the original author**.

You are free to fork and modify this project under the Apache-2.0 License,
but you may not use the “DailyWave” name or branding to promote derived
products or services without explicit permission.

## License

Distributed under the Apache-2.0 License. See `LICENSE` for details.

---

<p align="center">
  Built with ❤️ by <a href="https://github.com/kkaemo">kkaemo</a>
</p>
