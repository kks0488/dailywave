import React from 'react';
import { AlertTriangle, Check, Play, Lock, ChevronRight, Zap } from 'lucide-react';
import './PipelineDashboard.css';

const PipelineDashboard = () => {
  // DATA: Lanes & Steps
  const lanes = [
    {
      id: 'legal',
      title: '⚖️ Crisis (법무/리스크)',
      color: 'red',
      steps: [
        { id: 'l1', title: '내용증명 수신', status: 'done', x: 0, y: 0 },
        { id: 'l2', title: '증거자료 수집', status: 'active', x: 1, y: 0 }, // Current Bottleneck
        { id: 'l3', title: '소명서 작성', status: 'locked', x: 2, y: 0 },
        { id: 'l4', title: '결과 대기', status: 'locked', x: 3, y: 0 },
      ]
    },
    {
      id: 'brand',
      title: '👕 Business (의류/재고)',
      color: 'blue',
      steps: [
        { id: 'b1', title: '리브랜딩 기획', status: 'done', x: 0, y: 1 },
        { id: 'b2', title: '로고/라벨 발주', status: 'done', x: 1, y: 1 },
        { id: 'b3', title: '샘플 촬영', status: 'active', x: 2, y: 1 }, // Current Active
        { id: 'b4', title: '상세페이지', status: 'pending', x: 3, y: 1 },
        { id: 'b5', title: '오픈/마케팅', status: 'locked', x: 4, y: 1 },
      ]
    },
    {
      id: 'dev',
      title: '💻 System (개발/자동화)',
      color: 'green',
      steps: [
        { id: 'd1', title: '워크플로우 설계', status: 'done', x: 0, y: 2 },
        { id: 'd2', title: '프론트엔드 MVP', status: 'active', x: 1, y: 2 }, // Current Active
        { id: 'd3', title: '서버 연동', status: 'pending', x: 1, y: 3 }, // Branch Down
        { id: 'd4', title: '배포/안정화', status: 'locked', x: 2, y: 3 },
      ]
    }
  ];

  // Helper: Draw Curves
  const renderConnection = (start, end, laneColor) => {
    // Grid Configuration matches CSS
    const UNIT_X = 240; 
    const UNIT_Y = 160;
    const BOX_WIDTH = 200;
    const BOX_HEIGHT = 100;
    
    // Calculate center points of boxes for lines
    const startX = (start.x * UNIT_X) + (BOX_WIDTH / 2);
    const startY = (start.y * UNIT_Y) + (BOX_HEIGHT / 2);
    const endX = (end.x * UNIT_X) + (BOX_WIDTH / 2);
    const endY = (end.y * UNIT_Y) + (BOX_HEIGHT / 2);

    // Line Styling based on status
    const isDone = start.status === 'done';
    // Map 'red'/'blue'/'green' to actual Hex for SVG stroke
    const colorMap = { 
        red: '#ef4444', 
        blue: '#3b82f6', 
        green: '#22c55e', 
        slate: '#475569' 
    };
    const strokeColor = isDone ? colorMap[laneColor] : '#334155'; // Active/Pending lines are dark slate
    
    // Bezier control points for smooth curves
    const controlDist = 80;
    const pathD = `M ${startX + (BOX_WIDTH/2)} ${startY} 
                   C ${startX + (BOX_WIDTH/2) + controlDist} ${startY}, 
                     ${endX - (BOX_WIDTH/2) - controlDist} ${endY}, 
                     ${endX - (BOX_WIDTH/2)} ${endY}`;

    // Straight line logic for same-row vs curved for branches? 
    // Actually, simple connecting from Right Face to Left Face is better.
    // Right Face of Start:
    const x1 = startX + (BOX_WIDTH / 2);
    const y1 = startY;
    // Left Face of End:
    const x2 = endX - (BOX_WIDTH / 2);
    const y2 = endY;

    const bezierFn = `M ${x1} ${y1} C ${x1 + 60} ${y1}, ${x2 - 60} ${y2}, ${x2} ${y2}`;

    return (
      <g key={`${start.id}-${end.id}`}>
        <path 
          d={bezierFn}
          fill="none"
          stroke={strokeColor}
          strokeWidth="3"
          strokeDasharray={isDone ? '0' : '6,6'}
          className="pipeline-connector"
        />
        {/* Arrow Head at End */}
        <circle cx={x2} cy={y2} r="3" fill={strokeColor} />
      </g>
    );
  };

  return (
    <div className="pipeline-container">
      <header className="pipeline-header">
        <h1><Zap className="header-icon" /> Factory Pipeline View</h1>
        <div className="pipeline-legend">
            <span>🚀 Active</span>
            <span>✅ Done</span>
            <span>🔒 Locked</span>
        </div>
      </header>

      <div className="pipeline-scroll-area">
        <div className="pipeline-grid-wrapper">
            
            {/* 1. SVG Layer for Connections */}
            <svg className="pipeline-svg-layer">
                {lanes.map(lane => (
                    lane.steps.map((step, idx) => {
                        // Connect to next step in array if explicitly linear
                        if (idx < lane.steps.length - 1) {
                            // Check if next step is visually "next" (simple logic for MVP)
                            // A better logic would be looking at 'next' IDs, but array order serves for now
                            // Exception: The branch in 'dev' lane (index 1 -> 2 is d2->d3 which is (1,2)->(1,3))
                            // renderConnection handles x/y diff automatically.
                            return renderConnection(step, lane.steps[idx+1], lane.color);
                        }
                        return null;
                    })
                ))}
            </svg>

            {/* 2. Nodes Layer */}
            {lanes.map(lane => (
                <div key={lane.id} className="pipeline-lane-group">
                    {/* Lane Label */}
                    <div 
                        className={`lane-label label-${lane.color}`}
                        style={{ top: lane.steps[0].y * 160 + 'px' }} // Align with first row of lane
                    >
                        {lane.title}
                    </div>

                    {lane.steps.map(step => (
                        <div 
                            key={step.id}
                            className={`step-box status-${step.status} color-${lane.color}`}
                            style={{ 
                                left: (step.x * 240) + 'px', 
                                top: (step.y * 160) + 'px' 
                            }}
                        >
                            <div className="step-header">
                                <span className="step-id">STEP {step.id.toUpperCase()}</span>
                                {step.status === 'done' && <Check size={14} />}
                                {step.status === 'active' && <Play size={14} fill="currentColor" />}
                                {step.status === 'locked' && <Lock size={14} />}
                                {step.status === 'pending' && <ChevronRight size={14} />}
                            </div>
                            
                            <div className="step-title">{step.title}</div>

                            {step.status === 'active' && (
                                <div className="step-action-badge">DO IT NOW</div>
                            )}
                        </div>
                    ))}
                </div>
            ))}

        </div>
      </div>
      
      <div className="pipeline-footer-tip">
          💡 <b>Tip:</b> 회색 점선은 끊긴 흐름입니다. 붉은 박스(Crisis)를 우선 해결하여 파이프를 뚫으세요.
      </div>
    </div>
  );
};

export default PipelineDashboard;
