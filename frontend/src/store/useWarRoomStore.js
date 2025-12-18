import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
} from 'reactflow';

// Initial Flow Nodes imitating the user's Mermaid Diagram
const initialNodes = [
  // Crisis
  { id: '1', type: 'sop', position: { x: 0, y: 0 }, data: { label: '법적 분쟁 대응', description: '소명 자료 제출 및 기일 모니터링', category: 'Crisis', color: '#ef4444' } },
  
  // New Biz
  { id: '2', type: 'sop', position: { x: 300, y: 0 }, data: { label: '신규 기획 (짐웨어)', description: '리브랜딩 및 에셋 제작', category: 'Biz', color: '#3b82f6' } },
  { id: '3', type: 'sop', position: { x: 600, y: 0 }, data: { label: '런칭 및 판매', description: '상세페이지 작업', category: 'Biz', color: '#3b82f6' } },

  // Routine
  { id: '4', type: 'sop', position: { x: 0, y: 300 }, data: { label: '상품 소싱/재고', description: 'K-Swiss 재고 리퀴데이션', category: 'Routine', color: '#f59e0b' } },
  { id: '5', type: 'sop', position: { x: 300, y: 300 }, data: { label: '주문/배송 (부친 위임)', description: '플레이오토 수집 및 전달', category: 'Routine', color: '#f59e0b' } },
];

const initialEdges = [
  { id: 'e2-3', source: '2', target: '3' },
  { id: 'e4-5', source: '4', target: '5' },
];

export const useWarRoomStore = create(
  persist(
    (set, get) => ({
      // --- Zone 2: Pipeline (Workflow) ---
      nodes: initialNodes,
      edges: initialEdges,
      onNodesChange: (changes) => set({ 
        nodes: applyNodeChanges(changes, get().nodes) 
      }),
      onEdgesChange: (changes) => set({ 
        edges: applyEdgeChanges(changes, get().edges) 
      }),
      onConnect: (connection) => set({ 
        edges: addEdge(connection, get().edges) 
      }),
      addNode: (node) => set({ nodes: [...get().nodes, node] }),

      // --- Zone 1: Bottlenecks ---
      bottlenecks: [
        { id: 'b1', title: '소명 자료 제출', daysInactive: 4, type: 'critical' },
        { id: 'b2', title: '인테리어 하자 보수', daysInactive: 2, type: 'warning' },
      ],

      // --- Zone 3: System Logs ---
      systemLogs: [
        { id: 1, time: '09:30:01', msg: '[Success] PlayAuto Order Sync', type: 'success' },
        { id: 2, time: '09:30:05', msg: '[Info] 12 New Orders Fetched', type: 'info' },
        { id: 3, time: '10:00:00', msg: '[Error] Naver API Rate Limit', type: 'error' },
        { id: 4, time: '11:00:00', msg: '[Info] Stock Update Complete', type: 'info' },
      ],

      // --- Zone 4: Routine & Memo ---
      routines: [
         { id: 'r1', text: '오전 3시 발주 마감', done: false },
         { id: 'r2', text: '세무서 전화 (14:00)', done: false },
      ],
      toggleRoutine: (id) => set((state) => ({
        routines: state.routines.map(r => r.id === id ? { ...r, done: !r.done } : r)
      })),
      memo: '',
      setMemo: (text) => set({ memo: text }),

      // --- Focus Mode ---
      currentMode: 'ALL', // ALL, DEV, BIZ, LOGISTICS
      setMode: (mode) => set({ currentMode: mode }),
    }),
    {
      name: 'war-room-storage-v2', // bump version to reset
    }
  )
);
