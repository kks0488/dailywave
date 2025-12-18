import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Check, Lock, MapPin, Play } from 'lucide-react';

const QuestNode = ({ data, selected }) => {
    // Status Styles
    const getStyles = (status) => {
        switch(status) {
            case 'clear': return { 
                bg: 'bg-emerald-100', 
                border: 'border-emerald-500', 
                text: 'text-emerald-900',
                icon: <Check size={20} className="text-emerald-600" />
            };
            case 'current': return { 
                bg: 'bg-white', 
                border: 'border-amber-500', 
                text: 'text-gray-900',
                icon: <MapPin size={20} className="text-amber-500 animate-bounce" />,
                animation: 'ring-4 ring-amber-100'
            };
            case 'locked':
            default: return { 
                bg: 'bg-gray-100', 
                border: 'border-gray-300', 
                text: 'text-gray-400',
                icon: <Lock size={18} className="text-gray-400" />
            };
        }
    };

    const style = getStyles(data.status);

    return (
        <div className={`
            relative w-48 p-4 rounded-xl border-2 transition-all duration-300
            ${style.bg} ${style.border} ${style.animation || ''}
            ${selected ? 'scale-110 shadow-xl z-50' : 'shadow-md hover:scale-105'}
        `}>
            {/* Handles for Flow */}
            <Handle type="target" position={Position.Left} className="!bg-transparent !border-none" />
            <Handle type="source" position={Position.Right} className="!bg-transparent !border-none" />

            {/* Header Icon */}
            <div className="flex justify-between items-start mb-2">
                <div className="p-1.5 bg-white/80 backdrop-blur rounded-lg shadow-sm">
                    {style.icon}
                </div>
                {data.status === 'current' && (
                    <span className="text-[10px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wide">
                        Now
                    </span>
                )}
            </div>

            {/* Content */}
            <div>
                <h3 className={`font-bold text-sm mb-1 ${style.text}`}>
                    {data.title}
                </h3>
                <p className="text-[11px] opacity-80 line-clamp-2 leading-snug">
                    {data.description}
                </p>
            </div>
            
            {/* Locked Overlay */}
            {data.status === 'locked' && (
                <div className="absolute inset-0 bg-gray-100/50 backdrop-blur-[1px] rounded-xl z-10 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <span className="text-xs font-bold text-gray-500 bg-white px-2 py-1 rounded border shadow-sm">Locked Step</span>
                </div>
            )}
        </div>
    );
};

export default memo(QuestNode);
