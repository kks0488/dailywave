import React, { useState } from 'react';
import { 
  Sun, Moon, Coffee, Truck, AlertTriangle, 
  Shirt, Code, Scale, CheckCircle, Circle, ArrowDown 
} from 'lucide-react';
import './OneFlowDashboard.css';

const OneFlowDashboard = () => {
  // 1. DATA: The User's Entire Business Context
  const ROUTINES = [
    { id: 'r1', time: '09:00', title: 'CS & 주문 확인', icon: <Coffee size={18} />, done: false },
    { id: 'r2', time: '10:00', title: '부친 물류 소통', icon: <Truck size={18} />, done: false },
    { id: 'r3', time: '10:30', title: '서버 상태 점검', icon: <AlertTriangle size={18} />, done: true },
  ];

  const PROJECTS = {
    brand: {
      id: 'brand',
      title: '짐웨어 리브랜딩',
      color: 'blue',
      icon: <Shirt size={20} />,
      tasks: [
        { id: 'b1', title: '컨셉/무드보드 확정', done: true },
        { id: 'b2', title: '로고/라벨 발주', done: true },
        { id: 'b3', title: '샘플 촬영 (스튜디오)', done: false, active: true }, // Current
        { id: 'b4', title: '상세페이지 기획', done: false },
      ]
    },
    legal: {
      id: 'legal',
      title: '법적 분쟁 대응',
      color: 'red',
      icon: <Scale size={20} />,
      tasks: [
        { id: 'l1', title: '내용증명 수신 확인', done: true },
        { id: 'l2', title: '매입 증빙 수집', done: false, active: true }, // Current
        { id: 'l3', title: '소명서 작성', done: false },
      ]
    },
    dev: {
      id: 'dev',
      title: '워크플로우 시스템',
      color: 'green',
      icon: <Code size={20} />,
      tasks: [
        { id: 'd1', title: '프론트엔드 기획', done: true },
        { id: 'd2', title: '통합 대시보드 구현', done: false, active: true },
        { id: 'd3', title: '서버 연동', done: false },
      ]
    }
  };

  const END_ROUTINES = [
    { id: 'e1', time: '18:00', title: '오늘 업무 회고', icon: <Moon size={18} />, done: false },
    { id: 'e2', time: '19:00', title: '인테리어 학습', icon: <Sun size={18} />, done: false },
  ];

  // STATE
  const [activeProject, setActiveProject] = useState('brand'); // Default focus
  const [routines, setRoutines] = useState(ROUTINES);
  const [endRoutines, setEndRoutines] = useState(END_ROUTINES);

  // ACTIONS
  const toggleRoutine = (arr, setArr, id) => {
    setArr(arr.map(r => r.id === id ? { ...r, done: !r.done } : r));
  };

  return (
    <div className="oneflow-container">
      
      {/* HEADER */}
      <header className="flow-header">
        <h1>ONE FLOW: daily cycle</h1>
        <p className="date-display">2025. 12. 14 (Sun)</p>
      </header>

      <div className="flow-content">
        
        {/* 1. MORNING BLOCK */}
        <div className="flow-section section-morning">
          <div className="section-title">🌅 MORNING ROUTINE</div>
          <div className="timeline-group">
            {routines.map((item, idx) => (
              <div 
                key={item.id} 
                className={`timeline-item ${item.done ? 'done' : ''}`}
                onClick={() => toggleRoutine(routines, setRoutines, item.id)}
              >
                <div className="time-marker">{item.time}</div>
                <div className="node-marker">
                  {item.done ? <CheckCircle size={16} /> : <Circle size={16} />}
                </div>
                <div className="task-card">
                  <div className="icon-box">{item.icon}</div>
                  <span>{item.title}</span>
                </div>
                {idx < routines.length - 1 && <div className="line-connector"></div>}
              </div>
            ))}
          </div>
        </div>

        {/* 2. THE FOCUS CHOICE (Switcher) */}
        <div className="focus-switcher">
          <div className="arrow-divider"><ArrowDown /> TODAY'S MAIN QUEST <ArrowDown /></div>
          <div className="project-buttons">
            {Object.values(PROJECTS).map(proj => (
              <button
                key={proj.id}
                className={`proj-btn ${activeProject === proj.id ? 'active ' + proj.color : ''}`}
                onClick={() => setActiveProject(proj.id)}
              >
                {proj.icon} {proj.title}
              </button>
            ))}
          </div>
        </div>

        {/* 3. MAIN WORK BLOCK (Injected Flow) */}
        <div className={`flow-section section-work theme-${PROJECTS[activeProject].color}`}>
          <div className="section-title">🔥 CORE WORK FLOW</div>
          <div className="timeline-group wide-timeline">
            {PROJECTS[activeProject].tasks.map((task, idx) => (
              <div key={task.id} className={`timeline-item ${task.done ? 'done' : ''} ${task.active ? 'current' : ''}`}>
                <div className="line-connector big-line"></div>
                <div className="node-marker big-node">
                   {task.done ? <CheckCircle size={24} /> : task.active ? <div className="pulse-dot"/> : <Circle size={24} />}
                </div>
                <div className="task-card big-card">
                   <h3>{task.title}</h3>
                   {task.active && <div className="status-badge">NOW PROCESSING</div>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. EVENING BLOCK */}
        <div className="flow-section section-night">
          <div className="section-title">🌙 EVENING ROUTINE</div>
          <div className="timeline-group">
            {endRoutines.map((item, idx) => (
              <div 
                key={item.id} 
                className={`timeline-item ${item.done ? 'done' : ''}`}
                onClick={() => toggleRoutine(endRoutines, setEndRoutines, item.id)}
              >
                <div className="time-marker">{item.time}</div>
                <div className="node-marker">
                  {item.done ? <CheckCircle size={16} /> : <Circle size={16} />}
                </div>
                <div className="task-card">
                  <div className="icon-box">{item.icon}</div>
                  <span>{item.title}</span>
                </div>
                {idx < endRoutines.length - 1 && <div className="line-connector"></div>}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default OneFlowDashboard;
