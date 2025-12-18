import React, { useState, useEffect } from 'react';
import { Target, CheckCircle, Package, Truck, Monitor, Sun, ChevronRight, Star } from 'lucide-react';

// --- DATA: 1인 기업 우주 ---
const INITIAL_DATA = {
  // [The Sun] : 오늘의 MVP
  core: {
    id: 'core-1',
    title: '짐웨어 리브랜딩 기획',
    desc: '라인업(Frame/Focus) 확정',
    status: 'active'
  },

  // [Inner Orbit] : 매일 루틴 (빠른 회전)
  routines: [
    { id: 'r1', title: 'CS 답변', icon: <Monitor size={14}/>, status: 'pending' },
    { id: 'r2', title: '발주 마감', icon: <Package size={14}/>, status: 'pending' },
    { id: 'r3', title: '물류 소통', icon: <Truck size={14}/>, status: 'done' },
  ],

  // [Outer Rings] : 프로젝트 워크플로우 (순서대로 배치)
  projects: [
    {
      id: 'p1',
      name: 'K-Swiss 재고 처리',
      color: 'cyan',
      radius: 280, // 궤도 반지름
      nodes: [
        { id: 'n1', title: '재고파악', status: 'done' },
        { id: 'n2', title: '마진계산', status: 'done' },
        { id: 'n3', title: '채널입점', status: 'current' }, // 현재 위치
        { id: 'n4', title: '판매개시', status: 'pending' },
      ]
    },
    {
      id: 'p2',
      name: '법적 분쟁 대응',
      color: 'rose',
      radius: 420, // 더 먼 궤도
      nodes: [
        { id: 'l1', title: '내용증명 수신', status: 'done' },
        { id: 'l2', title: '변호사 상담', status: 'done' },
        { id: 'l3', title: '자료 수집', status: 'current' },
        { id: 'l4', title: '소명서 제출', status: 'pending' },
        { id: 'l5', title: '결과 통보', status: 'pending' },
      ]
    }
  ]
};

const OrbitDashboard = () => {
  const [data, setData] = useState(INITIAL_DATA);
  const [hoverNode, setHoverNode] = useState(null);

  // --- ACTIONS ---
  const toggleRoutine = (id) => {
    setData(prev => ({
      ...prev,
      routines: prev.routines.map(r => 
        r.id === id ? { ...r, status: r.status === 'done' ? 'pending' : 'done' } : r
      )
    }));
  };

  const completeCore = () => {
    if(window.prompt("오늘의 MVP를 완료했나요? '완료'라고 적어주세요.") === '완료') {
      setData(prev => ({ ...prev, core: { ...prev.core, status: 'done' } }));
      // 축하 이펙트 등 추가 가능
    }
  };

  // --- HELPER: 원형 배치 계산 ---
  const getPosition = (index, total, radius, offsetAngle = 0) => {
    const angle = (360 / total) * index + offsetAngle;
    const rad = (angle * Math.PI) / 180;
    return {
      x: Math.cos(rad) * radius,
      y: Math.sin(rad) * radius,
      deg: angle
    };
  };

  return (
    <div className="galaxy-container">
      
      {/* 1. Background Universe */}
      <div className="stars-layer"></div>
      <div className="nebula-layer"></div>

      {/* 2. System Center Coordinate */}
      <div className="solar-system-wrapper">

        {/* --- A. THE SUN (Central Core) --- */}
        <div className={`sun-core ${data.core.status === 'done' ? 'sun-success' : 'sun-active'}`}>
            <button onClick={completeCore} className="sun-button">
                {data.core.status === 'done' ? (
                     <CheckCircle size={40} className="text-white drop-shadow-lg" />
                ) : (
                    <>
                        <div className="sun-flare"></div>
                        <span className="sun-label">TODAY'S MISSION</span>
                        <h1 className="sun-title">{data.core.title}</h1>
                        <p className="sun-desc">{data.core.desc}</p>
                    </>
                )}
            </button>
            <div className="sun-ring-glow"></div>
        </div>

        {/* --- B. INNER ORBIT (Routines) --- */}
        <div className="orbit-track ring-routine">
             {data.routines.map((r, i) => {
                 const pos = getPosition(i, data.routines.length, 140); // 반경 140px
                 return (
                     <div 
                        key={r.id}
                        className={`planet-routine ${r.status}`}
                        style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
                        onClick={() => toggleRoutine(r.id)}
                        title={r.title}
                     >
                         {r.icon}
                     </div>
                 );
             })}
        </div>

        {/* --- C. OUTER ORBITS (Projects) --- */}
        {data.projects.map((proj, idx) => (
            <div 
                key={proj.id} 
                className={`orbit-track ring-${proj.color}`}
                style={{ width: proj.radius * 2, height: proj.radius * 2 }}
            >
                {/* 궤도 이름 라벨 */}
                <div className="orbit-label">
                    <span className={`orb-tag ${proj.color}`}>{proj.name}</span>
                </div>

                {/* 프로젝트 노드 (행성들) */}
                {proj.nodes.map((node, nodeIdx) => {
                    // 반원(180도) 안에 배치하거나, 전체 원에 배치
                    // 여기선 가독성을 위해 -90도(위쪽)부터 시작
                    const pos = getPosition(nodeIdx, proj.nodes.length, proj.radius, -90);
                    
                    return (
                        <div 
                            key={node.id}
                            className={`planet-node ${node.status} node-${proj.color}`}
                            style={{ 
                                transform: `translate(${pos.x}px, ${pos.y}px)`,
                                // 노드 자체가 회전하지 않도록 역보정은 CSS에서 처리하거나 생략
                            }}
                            onMouseEnter={() => setHoverNode(node)}
                            onMouseLeave={() => setHoverNode(null)}
                        >
                            <div className="node-body">
                                {node.status === 'done' && <CheckCircle size={12}/>}
                                {node.status === 'current' && <Star size={12} fill="currentColor"/>}
                                {node.status === 'pending' && <div className="dot"></div>}
                            </div>
                            
                            {/* 노드 이름 항상 표시 (가독성 확보) */}
                            <div className="node-text">{node.title}</div>
                        </div>
                    );
                })}
            </div>
        ))}
      </div>

      {/* 3. HUD (Overlay Information) */}
      <div className="hud-overlay">
          <div className="hud-stats">
              <h2>GALAXY VIEW</h2>
              <p>System Status: <span className="text-green-400">Stable</span></p>
          </div>
          <div className="hud-legend">
              <div className="legend-item"><span className="dot current"></span> Current Focus</div>
              <div className="legend-item"><span className="dot done"></span> Completed</div>
          </div>
      </div>

    </div>
  );
};

export default OrbitDashboard;
