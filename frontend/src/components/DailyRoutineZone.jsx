import React from 'react';
import { useWarRoomStore } from '../store/useWarRoomStore';
import { CheckSquare, Square } from 'lucide-react';

const DailyRoutineZone = () => {
    const { routines, toggleRoutine, memo, setMemo } = useWarRoomStore();

    return (
        <div className="zone-container flex flex-col gap-4">
             <div className="zone-header">
                <span className="zone-title">Daily Routine & Logs</span>
            </div>
            
            {/* 1. Checklists */}
            <div className="routine-list">
                {routines.map((routine) => (
                    <div 
                        key={routine.id}
                        onClick={() => toggleRoutine(routine.id)}
                        className={`routine-item ${routine.done ? 'done' : ''}`}
                    >
                        {routine.done 
                            ? <CheckSquare size={16} className="text-gray-400" />
                            : <Square size={16} className="text-gray-800" />
                        }
                        <span>{routine.text}</span>
                    </div>
                ))}
            </div>

            {/* 2. Free Memo */}
            <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                className="daily-memo"
                placeholder="오늘의 급한 메모 (자동 저장됨)..."
            />
        </div>
    );
};

export default DailyRoutineZone;
