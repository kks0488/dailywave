import React from 'react';
import { useWarRoomStore } from '../store/useWarRoomStore';
import { Terminal, Activity } from 'lucide-react';

const SystemMonitorZone = () => {
    const { systemLogs } = useWarRoomStore();

    return (
        <div className="zone-container">
             <div className="zone-header">
                <span className="zone-title flex items-center gap-2">
                    <Terminal size={14} /> System Monitor
                </span>
                <span className="status-indicator online">ONLINE</span>
            </div>
            <div className="logs-container">
                {systemLogs.map(log => (
                    <div key={log.id} className="log-line">
                        <span className="log-time">{log.time}</span>
                        <span className={`log-msg ${log.type}`}>{log.msg}</span>
                    </div>
                ))}
                <div className="log-cursor">_</div>
            </div>
        </div>
    );
};

export default SystemMonitorZone;
