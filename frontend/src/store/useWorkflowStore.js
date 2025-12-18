import { create } from 'zustand';
import {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
} from 'reactflow';

const initialNodes = [
  // SECTION 1: Logistics & Daily Claims (Yellow/Orange)
  { 
      id: '1', 
      type: 'sop', 
      position: { x: 50, y: 100 }, 
      data: { 
          label: '09:30 주문/클레임 수집', 
          description: '1. PlayAuto [주문수집] 실행\n2. [클레임] 탭 확인\n3. 취소건 승인 -> 반품건 수거지시',
          frequency: 'Daily 09:30',
          link: 'https://admin.playauto.co.kr',
          category: 'Logistics',
          color: '#f59e0b' // Amber
      } 
  },
  { 
      id: '2', 
      type: 'sop', 
      position: { x: 400, y: 100 }, 
      data: { 
          label: '10:00 송장/발주 마감', 
          description: '신규 주문 건 확인 -> 송장 출력 -> 거래처 발주 요청 (오전 마감)',
          frequency: 'Daily 10:00',
          link: 'http://localhost:8505',
          category: 'Logistics',
          color: '#f59e0b'
      } 
  },

  // SECTION 2: Customer Service (Blue)
  { 
      id: '3', 
      type: 'sop', 
      position: { x: 50, y: 350 }, 
      data: { 
          label: '11:00 1차 CS (매크로)', 
          description: '단순 배송/재고 문의는 플레이오토 [자주 쓰는 답변]으로 30분 컷.\n* 복잡한 건은 별도 마킹 후 오후 처리.',
          frequency: 'Daily 11:00',
          link: 'http://localhost:3002',
          category: 'CS',
          color: '#3b82f6' // Blue
      } 
  },
  { 
      id: '4', 
      type: 'sop', 
      position: { x: 400, y: 350 }, 
      data: { 
          label: '14:00 배송지연 선제안내', 
          description: '"언제 와요?" 방어용 문자 발송.\n지연 상품 주문자 필터링 -> [SMS 발송] -> 지연안내 템플릿 전송.',
          frequency: 'Daily 14:00',
          link: 'http://localhost:8001',
          category: 'CS',
          color: '#3b82f6'
      } 
  },
  { 
      id: '5', 
      type: 'sop', 
      position: { x: 400, y: 550 }, 
      data: { 
          label: '16:00 반품검수 & 마감', 
          description: '도착 택배 개봉/검수 -> [반품완료] 처리.\n오늘자 CS 최종 마감.',
          frequency: 'Daily 16:00',
          link: 'http://localhost:8003',
          category: 'CS',
          color: '#3b82f6'
      } 
  },

  // SECTION 3: Strategy & Growth (Green)
  { 
      id: '6', 
      type: 'sop', 
      position: { x: 800, y: 100 }, 
      data: { 
          label: '재고 소진 (Ghost Protocol)', 
          description: '안 팔리는 재고 식별 -> 틱톡/커뮤니티 바이럴 기획.\n목표: 악성 재고 현금화.',
          frequency: 'Weekly',
          link: '',
          category: 'Strategy',
          color: '#10b981' // Emerald
      } 
  },
  { 
      id: '7', 
      type: 'sop', 
      position: { x: 800, y: 350 }, 
      data: { 
          label: 'MD 소통 & 시즌 기획', 
          description: '다음 시즌 상품 기획, 플랫폼 MD 프로모션 제안.\n(잘 팔릴 상품 소싱)',
          frequency: 'Ad-hoc',
          link: '',
          category: 'Strategy',
          color: '#10b981'
      } 
  }
];

const initialEdges = [
    { id: 'e1-2', source: '1', target: '2', animated: true },
    { id: 'e2-3', source: '2', target: '3', animated: true },
    { id: 'e3-4', source: '3', target: '4', animated: true },
    { id: 'e4-5', source: '4', target: '5', animated: true },
];

export const useWorkflowStore = create((set, get) => ({
  nodes: initialNodes,
  edges: initialEdges,
  selectedNodeId: null,

  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
  },

  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },

  onConnect: (connection) => {
    set({
      edges: addEdge(connection, get().edges),
    });
  },

  setSelectedNode: (id) => set({ selectedNodeId: id }),
  
  addNode: (node) => set({ nodes: [...get().nodes, node] }),
  
  updateNodeData: (id, newData) => {
      set({
          nodes: get().nodes.map(node => 
              node.id === id 
              ? { ...node, data: { ...node.data, ...newData } }
              : node
          )
      })
  },

  executeWorkflow: async () => {
    // ... execution logic ...
    console.log("Execute workflow placeholder");
    alert("Execute functionality to be implemented in backend.");
  }
}));
