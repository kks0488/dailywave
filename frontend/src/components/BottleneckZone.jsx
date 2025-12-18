import React from 'react';
import { useWarRoomStore } from '../store/useWarRoomStore';
import { AlertTriangle, Clock } from 'lucide-react';

const BottleneckZone = () => {
    const { bottlenecks } = useWarRoomStore();

    return (
        <div className="zone-container zone-bottleneck">
            <div className="zone-header">
                <span className="zone-title text-red-600">⚠️ The Bottleneck (정체구간)</span>
            </div>
            <div className="flex flex-col gap-3 mt-4">
                {bottlenecks.map(b => (
                    <div key={b.id} className={`bottleneck-card ${b.daysInactive >= 3 ? 'critical' : 'warning'}`}>
                        <div className="flex justify-between items-start">
                            <span className="font-bold text-gray-800">{b.title}</span>
                            <span className="days-badge">
                                <Clock size={12} /> {b.daysInactive}일째
                            </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                            {b.daysInactive >= 3 ? '3일 이상 변동 없음. 즉시 처리 요망.' : '곧 정체될 수 있습니다.'}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default BottleneckZone;
