# 🌊 DailyWave

```text
  _____             _  _        __          __                  
 |  __ \           (_)| |       \ \        / /                  
 | |  | | __ _  _  _ | | _   _   \ \  /\  / /  __ _ __   __ ___ 
 | |  | |/ _` || || || || | | |   \ \/  \/ /  / _` |\ \ / // _ \
 | |__| | (_| || || || || |_| |    \  /\  /  | (_| | \ V /|  __/
 |_____/ \__,_||_||_||_| \__, |     \/  \/    \__,_|  \_/  \___|
                          __/ |                                 
                         |___/                                  
```

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Stars](https://img.shields.io/github/stars/kkaemo/dailywave.svg?style=social)](https://github.com/kkaemo/dailywave)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)

> **Transform your daily chaos into a flowing rhythm**

DailyWave is a modern, pipeline-based workflow and routine management application designed with an Apple-style minimalist aesthetic. It helps you visualize your daily tasks as a continuous flow, ensuring you stay productive without feeling overwhelmed.

---

---

## 🖼️ Screenshots

> _Placeholders for high-resolution screenshots showcasing the minimalist UI_

| Dashboard | Workflow Builder |
| :---: | :---: |
| ![Dashboard Placeholder](https://via.placeholder.com/800x450?text=DailyWave+Dashboard) | ![Workflow Placeholder](https://via.placeholder.com/800x450?text=Workflow+Pipeline+Editor) |

## 🚀 Quick Start

### 🐳 Using Docker (Recommended)

The easiest way to get DailyWave up and running is using Docker Compose. This ensures all dependencies and environment variables are correctly configured.

1. **Clone the repository**
   ```bash
   git clone https://github.com/kkaemo/dailywave.git
   cd dailywave
   ```

2. **Launch with Docker Compose**
   ```bash
   # This will build the images and start both frontend and backend
   docker-compose up -d
   ```

3. **Access the application**
   - **Web UI**: [http://localhost:3020](http://localhost:3020)
   - **Interactive API Docs**: [http://localhost:8020/docs](http://localhost:8020/docs) (Swagger UI)

---

### 🛠️ Manual Setup

If you prefer to run the components separately for development, follow these steps.

#### Backend (FastAPI)
1. **Navigate and Setup Environment**:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
3. **Start the server**:
   ```bash
   # Running on port 8020 to match default configuration
   uvicorn main:app --host 0.0.0.0 --port 8020 --reload
   ```

#### Frontend (React + Vite)
1. **Navigate and Install**:
   ```bash
   cd frontend
   npm install
   ```
2. **Start the development server**:
   ```bash
   # Port 3020 is used to avoid common conflicts
   npm run dev -- --port 3020
   ```

### 🚀 Production Deployment (PM2)

For production environments without Docker, you can use PM2 to manage the processes. DailyWave includes an `ecosystem.config.js` for this purpose.

1. **Install PM2 globally**:
   ```bash
   npm install pm2 -g
   ```
2. **Start all services**:
   ```bash
   pm2 start ecosystem.config.js
   ```
3. **Monitor processes**:
   ```bash
   pm2 list
   pm2 logs
   ```

## ✨ Key Features

- 🔄 **Pipeline-Based Workflows**: Visualize your tasks as a logical flow. Chain tasks together where the output of one can become the input for another, creating a seamless automation pipeline.
- 📅 **Intelligent Daily Routines**: Beyond simple todos, DailyWave handles recurring routines with ease. Set your morning rhythm once and let the app guide you through it every day.
- 🗓️ **Live Calendar Sync**: Stop context switching. DailyWave generates a real-time `.ics` feed that you can subscribe to in Apple Calendar, Google Calendar, or Outlook.
- 💾 **Robust State Persistence**: Built with reliability in mind. The backend ensures your workflow states are persisted across sessions, so you can pick up exactly where you left off.
- 🌐 **Global Native Support**: A first-class experience for international users with full localization for English, Korean, Japanese, and Chinese.
- 🍎 **Apple-Style Aesthetics**: Experience a UI that feels native to your workspace. Featuring frosted glass effects, smooth transitions, and a minimalist layout that minimizes cognitive load.
- ⚡ **High Performance**: Built on FastAPI and Vite, the application is lightning-fast, ensuring your productivity tools never slow you down.

## 📱 Mobile Experience

The desktop version is just the beginning. We are currently developing native mobile applications for iOS and Android to bring your flow to your pocket.

- [ ] **iOS App**: Beta testing starting Q3 2026
- [ ] **Android App**: In development
- [ ] **WatchOS Support**: Planned for future release

## 🛠️ Tech Stack

### Frontend
- **Framework**: [React 18](https://react.dev/) with [Vite](https://vitejs.dev/) for blazing fast development.
- **State Management**: [Zustand](https://github.com/pmndrs/zustand) for lightweight, reactive state handling.
- **Icons**: [Lucide React](https://lucide.dev/) for consistent, beautiful vector icons.
- **Styling**: Modern CSS with a focus on Apple-style glassmorphism.

### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) for high-performance, asynchronous API endpoints.
- **Logic Engine**: [NetworkX](https://networkx.org/) for managing and executing complex Directed Acyclic Graphs (DAGs) of workflows.
- **Data Handling**: [Pydantic](https://docs.pydantic.dev/) for strict type safety and data validation.
- **Integration**: [iCalendar](https://github.com/collective/icalendar) for standard-compliant calendar feed generation.

### DevOps
- **Containerization**: [Docker](https://www.docker.com/) for consistent environments across development and production.
- **Process Management**: [PM2](https://pm2.keymetrics.io/) support via `ecosystem.config.js` for production stability.

## 🗺️ Roadmap

- [x] Core Pipeline Engine
- [x] iCalendar Feed Support
- [x] Apple-style UI Implementation
- [ ] Drag-and-drop Workflow Builder
- [ ] Third-party Integrations (Slack, GitHub, Notion)
- [ ] Native Mobile Applications
- [ ] AI-powered Routine Suggestions

## 📡 API Overview

DailyWave provides a clean RESTful API for integration.

| Endpoint | Method | Description |
| :--- | :---: | :--- |
| `/` | `GET` | Health check & Version info |
| `/api/persistence/load` | `GET` | Retrieve the current saved state |
| `/api/persistence/save` | `POST` | Persist the application state |
| `/api/calendar/feed` | `GET` | Returns the `.ics` calendar feed |
| `/execute` | `POST` | Manually trigger a workflow pipeline |

## 💡 How It Works

DailyWave is built around the concept of **"Flows"**. Instead of a static list of tasks, you create dynamic pipelines where activities are connected logically.

1. **Define your Nodes**: Create tasks or routines (Nodes) that represent individual actions.
2. **Connect the Flow**: Link these nodes to create a sequence. DailyWave uses a graph-based engine to determine the order and dependencies.
3. **Execute and Monitor**: Watch as your daily rhythm flows from one task to the next. The system tracks your progress and updates your status in real-time.
4. **Sync Everywhere**: Your flow isn't just trapped in the app. Use the ICS feed to see your scheduled flows on any device or calendar application.

## 📁 Project Structure

```text
dailywave/
├── frontend/           # React + Vite application
│   ├── src/            # Source code (Components, Store, Assets)
│   └── public/         # Static assets
├── backend/            # FastAPI application
│   ├── data/           # Persistent storage (JSON)
│   └── ...             # Core logic (Executor, Storage, Calendar)
├── docker-compose.yml  # Container orchestration
└── ecosystem.config.js # PM2 configuration for production
```

## 🌍 Internationalization (i18n)

DailyWave is built for a global audience. We currently support:
- 🇺🇸 **English** (Primary)
- 🇰🇷 **Korean** (한국어)
- 🇯🇵 **Japanese** (日本語)
- 🇨🇳 **Chinese** (简体中文)

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<p align="center">
  Built with ❤️ by <a href="https://github.com/kkaemo">kkaemo</a>
</p>
