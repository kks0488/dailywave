import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
} from 'reactflow';

// --- INITIAL DATA: THE 4 WORLDS ---

const WORLDS_DATA = {
    brand: {
        id: 'brand',
        name: 'World 1: The Factory',
        description: 'Brand & Commerce (Money Maker)',
        theme: 'city', // bg-blue-100
        nodes: [
            { id: 'b1', type: 'quest', position: { x: 100, y: 100 }, data: { title: '브랜드 기획', status: 'clear', description: '컨셉: Raw & Heavy', checklist: [] } },
            { id: 'b2', type: 'quest', position: { x: 400, y: 100 }, data: { title: '네이밍 (FRAME)', status: 'current', description: '상표권 등록 대기중', checklist: [{id:'c1', text:'출원번호 확인', done:false}] } },
            { id: 'b3', type: 'quest', position: { x: 700, y: 100 }, data: { title: '로고 디자인', status: 'locked', description: '네이밍 확정 후 진행', checklist: [] } },
        ],
        edges: [
            { id: 'e1-2', source: 'b1', target: 'b2', style: { strokeWidth: 4, stroke: '#10b981' } },
            { id: 'e2-3', source: 'b2', target: 'b3', animated: true, style: { strokeWidth: 4, stroke: '#d1d5db', strokeDasharray: '5 5' } }
        ]
    },
    legal: {
        id: 'legal',
        name: 'World 2: The Dungeon',
        description: 'Risk & Legal (Crisis)',
        theme: 'fire', // bg-red-900
        nodes: [
            { id: 'l1', type: 'quest', position: { x: 300, y: 50 }, data: { title: '소명 자료 수집', status: 'current', description: '쿠팡 소명 요청 건', checklist: [{id:'c1', text:'매입 증빙 스캔', done:true}, {id:'c2', text:'소명서 작성', done:false}] } },
            { id: 'l2', type: 'quest', position: { x: 300, y: 250 }, data: { title: '제출 및 대기', status: 'locked', description: '영업일 기준 3일 소요', checklist: [] } },
        ],
        edges: [
            { id: 'el1-2', source: 'l1', target: 'l2', animated: true }
        ]
    },
    dev: {
        id: 'dev',
        name: 'World 3: The Lab',
        description: 'R&D & Self-Improvement',
        theme: 'sky',
        nodes: [],
        edges: []
    },
    logistics: {
        id: 'logistics',
        name: 'World 4: The Storage',
        description: 'Routine & Logistics',
        theme: 'port',
        nodes: [],
        edges: []
    }
};

export const useQuestStore = create(
  persist(
    (set, get) => ({
      // Navigation State
      currentWorldId: null, // null = Overworld
      
      // Data State (All Worlds)
      worlds: WORLDS_DATA,

      // ReactFlow State (Active World Only - Hydrated on Enter)
      nodes: [],
      edges: [],
      selectedQuestId: null,

      // --- Actions ---

      enterWorld: (worldId) => {
          const world = get().worlds[worldId];
          set({ 
              currentWorldId: worldId,
              nodes: world.nodes || [],
              edges: world.edges || [],
              selectedQuestId: null
          });
      },

      leaveWorld: () => {
          // Save current state back to worlds object before leaving? 
          // For MVP, we presume nodes/edges are updated in real-time in 'nodes' state.
          // We need to sync back to 'worlds' to persist changes when switching worlds.
          const { currentWorldId, nodes, edges, worlds } = get();
          if (currentWorldId) {
              set({
                  worlds: {
                      ...worlds,
                      [currentWorldId]: { ...worlds[currentWorldId], nodes, edges }
                  },
                  currentWorldId: null
              });
          } else {
              set({ currentWorldId: null });
          }
      },

      selectQuest: (id) => set({ selectedQuestId: id }),

      // ReactFlow Hooks
      onNodesChange: (changes) => set({ nodes: applyNodeChanges(changes, get().nodes) }),
      onEdgesChange: (changes) => set({ edges: applyEdgeChanges(changes, get().edges) }),
      onConnect: (connection) => set({ edges: addEdge(connection, get().edges) }),

      // Sub-quest Toggle
      toggleChecklistItem: (nodeId, itemId) => set((state) => ({
          nodes: state.nodes.map(node => {
              if (node.id !== nodeId) return node;
              const newChecklist = node.data.checklist.map(item => 
                  item.id === itemId ? { ...item, done: !item.done } : item
              );
              return { ...node, data: { ...node.data, checklist: newChecklist } };
          })
      })),
    }),
    {
      name: 'super-mario-world-storage',
    }
  )
);
