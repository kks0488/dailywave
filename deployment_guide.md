# DailyWave Deployment Guide

Ubuntu 환경에서 DailyWave를 24시간 안정적으로 구동하는 방법을 설명합니다.

## 1. 파일 복사 및 준비

```bash
git clone https://github.com/kkaemo/dailywave.git
cd dailywave
```

## 2. 환경변수 설정

### Backend
```bash
cp backend/.env.example backend/.env
# 필수: GEMINI_API_KEY 설정
# 선택: API_SECRET_KEY 설정 (API 인증 활성화)
```

### Frontend
```bash
cp frontend/.env.example frontend/.env
# VITE_API_URL=http://localhost:8020
```

## 3. 권장 방법: Docker (가장 간편함)

Docker를 사용하면 백엔드, 프론트엔드, memU가 한 번에 실행됩니다.

### 설치 (Ubuntu)
```bash
sudo apt update
sudo apt install docker.io docker-compose -y
sudo usermod -aG docker $USER
# 로그아웃 후 다시 로그인하여 권한 반영
```

### 실행
```bash
docker-compose up -d --build
```

### 구성 서비스
| 서비스 | 포트 | 설명 |
|--------|------|------|
| frontend | 3020 | React UI |
| backend | 8020 | FastAPI |
| memu | 8100 | AI 메모리 (선택) |

### 확인
- 프론트엔드: `http://[서버_IP]:3020`
- 백엔드 API: `http://[서버_IP]:8020/docs`
- memU 상태: `http://[서버_IP]:8100/health`

## 4. 대안 방법: PM2 (직접 서비스 관리)

### 필수 패키지 설치
```bash
# Node.js (v18+)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Python 3.11+
sudo apt install -y python3 python3-venv

# PM2
sudo npm install -g pm2
```

### 앱 실행
```bash
# 1. 백엔드 가상환경 설정 (처음 한 번만)
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ..

# 2. 프론트엔드 빌드 (처음 + 코드 변경 시)
cd frontend
npm install
npm run build
cd ..

# 3. PM2로 시작
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 5. 방화벽 설정

```bash
sudo ufw allow 3020/tcp   # 프론트엔드
sudo ufw allow 8020/tcp   # 백엔드
sudo ufw enable
```

## 6. memU 없이 실행

memU는 선택적 서비스입니다. 없어도 DailyWave는 정상 작동합니다.
- memU 없음: AI 추천이 일반적으로 동작
- memU 있음: 사용자 행동 패턴 기반 개인화된 AI 추천

Docker 없이 memU를 별도 실행하려면:
```bash
docker run -d -p 8100:8000 --name memu nevamindai/memu-server:latest
```

## 7. 캘린더 연동

캘린더 URL은 `http://[서버_IP]:8020/api/calendar/feed`에서 `.ics` 피드를 제공합니다.
고정 IP를 사용하거나, 프론트엔드에서 `window.location.hostname`을 통해 동적으로 생성됩니다.
