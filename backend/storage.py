import json
import os
from typing import Dict, Any

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
DATA_FILE = os.path.join(DATA_DIR, "workflow_data.json")

DEFAULT_INITIAL_DATA = {
    "pipelines": [
        {
            "id": "legal",
            "title": "위기 관리",
            "subtitle": "법무 및 리스크 대응",
            "color": "red",
            "iconType": "shield",
            "steps": [
                {"id": "l1", "title": "내용증명", "status": "done"},
                {"id": "l2", "title": "자료수집", "status": "active"},
                {"id": "l3", "title": "소명서", "status": "locked"},
                {"id": "l4", "title": "결과대기", "status": "locked"}
            ]
        },
        {
            "id": "biz",
            "title": "비즈니스 흐름",
            "subtitle": "짐웨어 리브랜딩 프로젝트",
            "color": "blue",
            "iconType": "dollar",
            "steps": [
                {"id": "b1", "title": "기획", "status": "done"},
                {"id": "b2", "title": "발주", "status": "done"},
                {"id": "b3", "title": "촬영", "status": "active"},
                {"id": "b4", "title": "상세페이지", "status": "pending"},
                {"id": "b5", "title": "오픈", "status": "locked"}
            ]
        },
        {
            "id": "sys",
            "title": "시스템 아키텍처",
            "subtitle": "자동화 워크플로우 구축",
            "color": "green",
            "iconType": "cpu",
            "steps": [
                {"id": "s1", "title": "설계", "status": "done"},
                {"id": "s2", "title": "MVP구현", "status": "active"},
                {"id": "s3", "title": "서버연동", "status": "pending"},
                {"id": "s4", "title": "배포", "status": "locked"}
            ]
        },
        {
            "id": "week-mon",
            "title": "[월] 기획 총괄 & MD",
            "subtitle": "\"판을 짜는 날\"",
            "color": "blue",
            "iconType": "layers",
            "steps": [
                {"id": "mon-1", "title": "주말 판매 데이터 분석", "status": "pending", "description": "어떤 게 반응 왔나? 베스트/워스트 선별"},
                {"id": "mon-2", "title": "신상 샘플 확정 및 거래처 오더", "status": "pending", "description": "제작/사입 상품 리스트업 및 발주"},
                {"id": "mon-3", "title": "이번 주 할인/이벤트 기획", "status": "pending", "description": "스마트스토어 배너 기획 및 혜택 설정"}
            ]
        },
        {
            "id": "week-tue",
            "title": "[화] CTO & 개발자",
            "subtitle": "\"자동화의 날\"",
            "color": "green",
            "iconType": "cpu",
            "steps": [
                {"id": "tue-1", "title": "코딩 집중: API 오류 및 개발", "status": "pending", "description": "연동 오류 수정 및 신규 자동화 기능 개발"},
                {"id": "tue-2", "title": "AI 프롬프트 튜닝", "status": "pending", "description": "상세페이지 Qual 향상을 위한 ComfyUI/GPT 설정"},
                {"id": "tue-3", "title": "반복 업무 스크립트화", "status": "pending", "description": "발견된 반복 업무를 코드로 자동화"}
            ]
        },
        {
            "id": "week-wed",
            "title": "[수] 크리에이티브 디렉터",
            "subtitle": "\"콘텐츠 생산의 날\"",
            "color": "pink",
            "iconType": "palette",
            "steps": [
                {"id": "wed-1", "title": "신상/코디샷 촬영", "status": "pending", "description": "매장 내 자연광 환경에서 몰아 찍기"},
                {"id": "wed-2", "title": "AI 상세페이지/포스팅 제작", "status": "pending", "description": "AI 가공을 통한 상세페이지 및 SNS 초안 20개 생성"},
                {"id": "wed-3", "title": "검수 후 예약 발행", "status": "pending", "description": "콘텐츠 최종 검토 및 플랫폼별 예약 설정"}
            ]
        },
        {
            "id": "week-thu",
            "title": "[목] 영업 & 마케터",
            "subtitle": "\"확산의 날\"",
            "color": "orange",
            "iconType": "zap",
            "steps": [
                {"id": "thu-1", "title": "광고 성과 체크 및 예산 조정", "status": "pending", "description": "네이버/인스타 ROAS 확인 및 효율 최적화"},
                {"id": "thu-2", "title": "타 플랫폼 행사 제안", "status": "pending", "description": "쿠팡, 지그재그 등 타 플랫폼 행사 제안서 투고"},
                {"id": "thu-3", "title": "체험단/인플루언서 관리", "status": "pending", "description": "DM 발송 및 활동 인원 피드백 관리"}
            ]
        },
        {
            "id": "week-fri",
            "title": "[금] CFO & 관리자",
            "subtitle": "\"돈 관리의 날\"",
            "color": "cyan",
            "iconType": "briefcase",
            "steps": [
                {"id": "fri-1", "title": "주간 정산 엑셀 확정", "status": "pending", "description": "매출/매입/순이익 데이터 최종 확인"},
                {"id": "fri-2", "title": "재고 실사 확인", "status": "pending", "description": "전산 재고 vs 3층 실제 재고 교차 체크"},
                {"id": "fri-3", "title": "세금계산서 및 급여/월세 관리", "status": "pending", "description": "지출 관리 및 행정 마감"}
            ]
        },
        {
            "id": "week-sat",
            "title": "[토] 쇼룸 매니저",
            "subtitle": "\"오프라인 올인\"",
            "color": "indigo",
            "iconType": "box",
            "steps": [
                {"id": "sat-1", "title": "접객 및 단골 만들기", "status": "pending", "description": "방문 고객 집중 응대 및 피드백 수집"},
                {"id": "sat-2", "title": "매장 현장 라이브/중계", "status": "pending", "description": "인스타 라방이나 스토리로 매장 분위기 공유"},
                {"id": "sat-3", "title": "고객 반응 및 트렌드 수집", "status": "pending", "description": "손님들이 찾는 아이템 및 가격 저항선 체크"}
            ]
        },
        {
            "id": "week-sun",
            "title": "[일] R&D & 미래사업",
            "subtitle": "\"넥스트 스텝\"",
            "color": "purple",
            "iconType": "maximize",
            "steps": [
                {"id": "sun-1", "title": "인테리어 사업 구상", "status": "pending", "description": "포트폴리오 정리 및 공간 활용 계획 수립"},
                {"id": "sun-2", "title": "시장 조사 및 트렌드 공부", "status": "pending", "description": "해외 플랫폼/경쟁사 분석 및 다음 시즌 준비"},
                {"id": "sun-3", "title": "주간 회고 및 다음 주 과제 등록", "status": "pending", "description": "비효율 점검 및 화요일 개발 과제화"}
            ]
        }
    ],
    "routines": [
        {"id": "rt-morning-1", "title": "매장 오픈 체크 (난방/청소/환기)", "time": "09:00", "type": "morning", "done": False},
        {"id": "rt-morning-2", "title": "어제 매출 분석 & 전략 수립", "time": "11:00", "type": "morning", "done": False},
        {"id": "rt-afternoon-1", "title": "경쟁사 & 당근마켓 광고 현황", "time": "14:00", "type": "afternoon", "done": False},
        {"id": "rt-afternoon-2", "title": "택배 발송 & 송장 입력 마감", "time": "17:00", "type": "afternoon", "done": False},
        {"id": "rt-afternoon-3", "title": "마감 정산 & 아버님 통화", "time": "22:00", "type": "afternoon", "done": False},
        {"id": "rt-afternoon-4", "title": "내일 발주 & 온라인 재고 연동", "time": "23:00", "type": "afternoon", "done": False}
    ],
    "sopLibrary": []
}

class StorageManager:
    def __init__(self):
        self._ensure_data_dir()

    def _ensure_data_dir(self):
        if not os.path.exists(DATA_DIR):
            os.makedirs(DATA_DIR)

    def save_state(self, data: Dict[str, Any]):
        """Saves the workflow state to a JSON file."""
        try:
            with open(DATA_FILE, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            return True
        except Exception as e:
            print(f"Error saving state: {e}")
            return False

    def load_state(self) -> Dict[str, Any]:
        """Loads the workflow state from a JSON file. Returns DEFAULT_INITIAL_DATA if empty/missing."""
        data = None
        if os.path.exists(DATA_FILE):
            try:
                with open(DATA_FILE, 'r', encoding='utf-8') as f:
                    data = json.load(f)
            except Exception as e:
                print(f"Error loading state: {e}")
        
        # If no data or all arrays empty, seed with defaults
        if not data or (not data.get("pipelines", []) and not data.get("routines", [])):
            print("Seeding initial workflow data...")
            return DEFAULT_INITIAL_DATA
            
        return data
