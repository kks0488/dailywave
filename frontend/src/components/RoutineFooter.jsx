import React from 'react';
import { useWarRoomStore } from '../store/useWarRoomStore';
import { CheckSquare, Square } from 'lucide-react';

const RoutineFooter = () => {
    const { routines, toggleRoutine } = useWarRoomStore();

    return (
        <div className="footer-container">
            <h3 className="footer-title">
                Daily Routines & Delegation
            </h3>
            <div className="routine-grid">
                {routines.map((routine) => (
                    <div 
                        key={routine.id}
                        onClick={() => toggleRoutine(routine.id)}
                        className={`routine-card ${routine.done ? 'done' : ''}`}
                    >
                        {routine.done 
                            ? <CheckSquare size={18} className="icon-done" />
                            : <Square size={18} className="icon-todo" />
                        }
                        <span className="routine-text">
                            {routine.text}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default RoutineFooter;
