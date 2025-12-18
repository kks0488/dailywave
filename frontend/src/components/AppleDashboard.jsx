import React, { useState } from 'react';
import { 
  Sun, Moon, Coffee, Truck, Check, ChevronRight, 
  Layout, Play, Circle, Clock, Command 
} from 'lucide-react';
import './AppleDashboard.css';

const AppleDashboard = () => {
  // --- STATE ---
  const [routines, setRoutines] = useState([
    { id: 'r1', title: 'CS 및 주문 확인', time: '09:00', done: true, type: 'morning' },
    { id: 'r2', title: '부친 물류 소통', time: '10:00', done: false, type: 'morning' },
    { id: 'r3', title: '서버 상태 점검', time: '10:30', done: false, type: 'morning' },
    { id: 'r4', title: '업무 회고', time: '18:00', done: false, type: 'evening' },
    { id: 'r5', title: '인테리어 학습', time: '19:00', done: false, type: 'evening' },
  ]);

  const [activeProject, setActiveProject] = useState('brand');

  const PROJECTS = {
    legal: {
      id: 'legal',
      label: 'Crisis',
      title: '법적 분쟁 대응',
      color: 'red',
      status: 'In Progress',
      progress: 35,
      tasks: [
        { id: 'l1', title: '내용증명 수신', done: true },
        { id: 'l2', title: '증빙 자료 수집', done: false, active: true },
        { id: 'l3', title: '소명서 작성', done: false, active: false },
      ]
    },
    brand: {
      id: 'brand',
      label: 'Business',
      title: '짐웨어 리브랜딩',
      color: 'blue',
      status: 'Active',
      progress: 60,
      tasks: [
        { id: 'b1', title: '브랜드 기획', done: true },
        { id: 'b2', title: '로고/라벨 발주', done: true },
        { id: 'b3', title: '룩북 촬영 (Studio)', done: false, active: true },
        { id: 'b4', title: '상세페이지 제작', done: false, active: false },
      ]
    },
    dev: {
      id: 'dev',
      label: 'System',
      title: '워크플로우 시스템',
      color: 'green',
      status: 'Stable',
      progress: 45,
      tasks: [
        { id: 'd1', title: '기획 및 설계', done: true },
        { id: 'd2', title: '프론트엔드 구현', done: false, active: true },
        { id: 'd3', title: '서버 연동', done: false, active: false },
      ]
    }
  };

  const toggleRoutine = (id) => {
    setRoutines(routines.map(r => r.id === id ? { ...r, done: !r.done } : r));
  };

  const currentProj = PROJECTS[activeProject];

  return (
    <div className="apple-container">
      
      {/* 1. SIDEBAR (Routine & Navigation) */}
      <aside className="apple-sidebar">
        <div className="sidebar-header">
          <div className="apple-logo">MARKTRADE</div>
          <div className="user-profile">K</div>
        </div>

        <div className="routine-group">
          <h3>Morning Schedule</h3>
          {routines.filter(r => r.type === 'morning').map(r => (
            <div 
              key={r.id} 
              className={`routine-card ${r.done ? 'done' : ''}`}
              onClick={() => toggleRoutine(r.id)}
            >
              <div className="check-ring">{r.done && <Check size={14} strokeWidth={3} />}</div>
              <div className="routine-info">
                <span className="time">{r.time}</span>
                <span className="title">{r.title}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="routine-group mt-auto">
          <h3>Evening Schedule</h3>
          {routines.filter(r => r.type === 'evening').map(r => (
            <div 
              key={r.id} 
              className={`routine-card ${r.done ? 'done' : ''}`}
              onClick={() => toggleRoutine(r.id)}
            >
              <div className="check-ring text-indigo">{r.done && <Check size={14} strokeWidth={3} />}</div>
              <div className="routine-info">
                <span className="time">{r.time}</span>
                <span className="title">{r.title}</span>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* 2. MAIN CONTENT (Project Focus) */}
      <main className="apple-main">
        
        {/* Top Navigation / Status */}
        <header className="main-header">
           <div className="breadcrumb">
              <span className="text-gray-400">Workspace</span>
              <ChevronRight size={14} className="text-gray-300" />
              <span className="font-semibold text-black">Dashboard</span>
           </div>
           <div className="date-pill">
              <Clock size={14} />
              <span>Dec 14, Sun</span>
           </div>
        </header>

        <h1 className="page-title">Good Morning, Kyung-soo.</h1>

        {/* Project Switcher Cards */}
        <div className="project-grid">
           {Object.values(PROJECTS).map(p => (
             <div 
               key={p.id} 
               className={`project-snap-card ${activeProject === p.id ? 'active' : ''}`}
               onClick={() => setActiveProject(p.id)}
             >
                <div className={`status-dot ${p.color}`}></div>
                <div className="card-top">
                  <span className="label">{p.label}</span>
                  <h3>{p.title}</h3>
                </div>
                <div className="progress-bar-bg">
                   <div 
                     className={`progress-bar-fill ${p.color}`} 
                     style={{ width: `${p.progress}%` }}
                   ></div>
                </div>
             </div>
           ))}
        </div>

        {/* Detailed Focus View (The "Flow") */}
        <section className="focus-section">
           <div className="focus-header">
             <h2>Focus Task</h2>
             <button className="action-btn">
               <Play size={14} fill="currentColor" /> Start Log
             </button>
           </div>
           
           <div className="flow-timeline">
              {currentProj.tasks.map((task, idx) => (
                <div key={task.id} className={`flow-step ${task.done ? 'done' : ''} ${task.active ? 'active' : ''}`}>
                   
                   {/* Connector Line */}
                   {idx < currentProj.tasks.length - 1 && <div className="step-line"></div>}

                   {/* Icon Indicator */}
                   <div className={`step-icon ${currentProj.color}`}>
                      {task.done ? <Check size={18} color="white" /> : 
                       task.active ? <div className="white-dot" /> : 
                       <span className="idx-num">{idx + 1}</span>}
                   </div>

                   {/* Content */}
                   <div className="step-content">
                      <div className="step-title">{task.title}</div>
                      {task.active && <div className="step-badge">In Progress</div>}
                   </div>
                   
                   {/* Right Side Action (if active) */}
                   {task.active && (
                     <div className="step-time">Now</div>
                   )}
                </div>
              ))}
           </div>
        </section>

      </main>
    </div>
  );
};

export default AppleDashboard;
