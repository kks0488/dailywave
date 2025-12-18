import React, { useState } from 'react';
import { 
  CheckSquare, Activity, ShieldAlert, BadgeDollarSign, Cpu, 
  Menu, Bell, Settings, Search, Check, Play, Lock, ChevronRight 
} from 'lucide-react';
import './CommandCenter.css';

const CommandCenter = () => {
  // 1. LEFT SIDE: ROUTINES
  const [routines, setRoutines] = useState([
    { id: 'r1', title: 'CS / 주문 확인', time: '09:00', done: false, type: 'morning' },
    { id: 'r2', title: '부친 물류 소통', time: '10:00', done: false, type: 'morning' },
    { id: 'r3', title: '서버 모니터링', time: '10:30', done: true, type: 'morning' },
    { id: 'r4', title: '송장 입력', time: '17:00', done: false, type: 'evening' },
    { id: 'r5', title: '업무 회고', time: '18:00', done: false, type: 'evening' },
    { id: 'r6', title: '학습 (인테리어)', time: '19:00', done: false, type: 'evening' },
  ]);

  const toggleRoutine = (id) => {
    setRoutines(routines.map(r => r.id === id ? { ...r, done: !r.done } : r));
  };

  // 2. MAIN AREA: PIPELINES
  const PIPELINES = [
    {
      id: 'legal',
      title: 'CRISIS CORE (법무/리스크)',
      color: 'red',
      icon: <ShieldAlert size={20} />,
      steps: [
        { id: 'l1', title: '내용증명', status: 'done' },
        { id: 'l2', title: '자료수집', status: 'active' }, // Bottleneck
        { id: 'l3', title: '소명서', status: 'locked' },
        { id: 'l4', title: '결과대기', status: 'locked' }
      ]
    },
    {
      id: 'biz',
      title: 'BUSINESS FLOW (짐웨어)',
      color: 'blue',
      icon: <BadgeDollarSign size={20} />,
      steps: [
        { id: 'b1', title: '기획', status: 'done' },
        { id: 'b2', title: '발주', status: 'done' },
        { id: 'b3', title: '촬영', status: 'active' }, // Active
        { id: 'b4', title: '상세페이지', status: 'pending' },
        { id: 'b5', title: '판매개시', status: 'locked' }
      ]
    },
    {
      id: 'sys',
      title: 'SYSTEM ARCH (자동화)',
      color: 'emerald',
      icon: <Cpu size={20} />,
      steps: [
        { id: 's1', title: '설계', status: 'done' },
        { id: 's2', title: 'MVP구현', status: 'active' },
        { id: 's3', title: '서버연동', status: 'pending' },
        { id: 's4', title: '배포', status: 'locked' }
      ]
    }
  ];

  return (
    <div className="hq-container">
      
      {/* SIDEBAR: PROTOCOLS */}
      <aside className="hq-sidebar">
        <div className="sidebar-header">
           <div className="hq-logo">MARKTRADE HQ</div>
           <div className="hq-date">2025.12.14</div>
        </div>

        <div className="protocol-section">
          <h3>MORNING PROTOCOL</h3>
          <div className="protocol-list">
            {routines.filter(r => r.type === 'morning').map(r => (
              <div 
                key={r.id} 
                className={`protocol-item ${r.done ? 'done' : ''}`}
                onClick={() => toggleRoutine(r.id)}
              >
                <div className="checkbox">{r.done && <Check size={12}/>}</div>
                <div className="proto-content">
                  <span className="time">{r.time}</span>
                  <span className="task">{r.title}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="protocol-section">
          <h3>EVENING PROTOCOL</h3>
          <div className="protocol-list">
             {routines.filter(r => r.type === 'evening').map(r => (
              <div 
                key={r.id} 
                className={`protocol-item ${r.done ? 'done' : ''}`}
                onClick={() => toggleRoutine(r.id)}
              >
                <div className="checkbox">{r.done && <Check size={12}/>}</div>
                <div className="proto-content">
                  <span className="time">{r.time}</span>
                  <span className="task">{r.title}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* MAIN: STRATEGIC MAP */}
      <main className="hq-main">
        <header className="main-header">
           <h2>STRATEGIC OVERVIEW</h2>
           <div className="header-actions">
              <button className="icon-btn"><Search size={18}/></button>
              <button className="icon-btn"><Bell size={18}/></button>
              <button className="icon-btn"><Settings size={18}/></button>
           </div>
        </header>

        <div className="pipeline-grid">
           {PIPELINES.map(lane => (
             <div key={lane.id} className={`pipeline-card theme-${lane.color}`}>
                <div className="lane-header">
                   <div className="lane-title">
                      {lane.icon} {lane.title}
                   </div>
                   <div className="lane-status">Processing</div>
                </div>

                <div className="lane-track">
                   {/* Connect Line Background */}
                   <div className="track-line"></div>

                   {lane.steps.map((step, idx) => (
                      <div key={step.id} className={`track-node status-${step.status}`}>
                         <div className="node-circle">
                            {step.status === 'done' && <Check size={16} />}
                            {step.status === 'active' && <div className="pulse-core"></div>}
                            {step.status === 'locked' && <Lock size={14} />}
                            {step.status === 'pending' && <span className="step-num">{idx+1}</span>}
                         </div>
                         <div className="node-label">
                            {step.title}
                            {step.status === 'active' && <span className="now-badge">NOW</span>}
                         </div>
                      </div>
                   ))}
                </div>
             </div>
           ))}
        </div>
      </main>

    </div>
  );
};

export default CommandCenter;
