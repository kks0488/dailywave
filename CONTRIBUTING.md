# Contributing to DailyWave

Thank you for your interest in contributing to DailyWave! This document provides guidelines and instructions for contributing.

## Code of Conduct

Please be respectful and constructive in all interactions. We welcome contributors of all experience levels.

## How to Contribute

### Reporting Bugs

1. Check existing issues to avoid duplicates
2. Use the bug report template
3. Include steps to reproduce
4. Include browser/OS information

### Suggesting Features

1. Check existing feature requests
2. Use the feature request template
3. Explain the use case clearly

### Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run linting (`npm run lint`)
5. Commit with clear messages
6. Push to your fork
7. Open a Pull Request

## Development Setup

### Prerequisites

- Node.js 18+
- Python 3.11+
- Docker (optional, for memU)

### Environment Variables

```bash
# Backend
cp backend/.env.example backend/.env
# Set GEMINI_API_KEY (required for AI features)
# Set API_SECRET_KEY (optional, for API auth)

# Frontend
cp frontend/.env.example frontend/.env
# VITE_API_URL defaults to http://localhost:8020
```

### Local Development

```bash
git clone https://github.com/YOUR_USERNAME/dailywave.git
cd dailywave

# Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8020

# Frontend (new terminal)
cd frontend
npm install
npm run dev

# memU (optional, for AI personalization)
docker run -d -p 8100:8000 nevamindai/memu-server:latest
```

## Code Style

### Frontend (React)
- Use functional components
- Use Zustand for state management
- Follow existing component patterns

### Backend (Python)
- Follow PEP 8
- Use type hints
- Use async/await for I/O operations

## Commit Messages

Use clear, descriptive commit messages:
- `feat: add dark mode support`
- `fix: resolve pipeline drag-drop issue`
- `docs: update installation guide`
- `refactor: simplify routine store logic`

## Questions?

Open an issue with the "question" label or reach out to the maintainers.

Thank you for contributing! 🌊
