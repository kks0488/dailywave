# DailyWave Ubuntu Deployment Guide

이 가이드는 현재 Mac 환경의 프로젝트를 Ubuntu PC로 옮겨서 24시간 안정적으로 구동하는 방법을 설명합니다.

## 1. 파일 복사 및 준비
전체 `marktrade-workflow` 폴더를 Ubuntu PC의 원하는 위치(예: `~/projects/`)로 복사합니다.

## 2. 권장 방법: Docker 사용 (가장 간편함)
Docker를 사용하면 파이썬이나 노드를 수동으로 설치할 필요가 없습니다.

### 설치 (Ubuntu)
```bash
sudo apt update
sudo apt install docker.io docker-compose -y
sudo usermod -aG docker $USER
# 로그아웃 후 다시 로그인하여 권한 반영
```

### 실행
프로젝트 루트 폴더(`docker-compose.yml`이 있는 곳)에서 실행:
```bash
docker-compose up -d --build
```
- `-d`: 백그라운드 실행 (상시 가동)
- `--build`: 처음 실행하거나 코드가 바뀌었을 때 빌드

### 확인
- 프론트엔드: `http://[우분투_IP]:3020`
- 백엔드: `http://[우분투_IP]:8020`

---

## 3. 대안 방법: PM2 사용 (직접 서비스 관리)
우분투에 파이썬과 노드가 직접 설치된 경우 사용합니다.

### 필수 패키지 설치
```bash
# Node.js 설치 (v18+)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Python 3.11+ 설치
sudo apt install -y python3 python3-venv

# PM2 설치
sudo npm install -g pm2
```

### 앱 실행
프로젝트 루트 폴더에서:
```bash
# 1. 백엔드 가상환경 설정 (처음 한 번만)
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ..

# 2. 프론트엔드 종속성 설치 (처음 한 번만)
cd frontend
npm install
cd ..

# 3. PM2로 시작
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## 4. 방화벽 설정 (필수)
우분투 방화벽에서 포트를 열어주어야 외부(맥 등)에서 접속 가능합니다.
```bash
sudo ufw allow 3020/tcp
sudo ufw allow 8020/tcp
sudo ufw enable
```

## 5. 캘린더 연동 설정
변경 후 캘린더 URL을 복사할 때 IP가 동적으로 변할 수 있으므로, 고정 IP를 사용하거나 `window.location.hostname`을 통해 정상적으로 복사되는지 확인하세요.
