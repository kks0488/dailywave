import React from 'react';
import { useWarRoomStore } from '../store/useWarRoomStore';

const BrainDump = () => {
    const { memo, setMemo } = useWarRoomStore();

    return (
        <div className="brain-dump-container">
            <div className="brain-dump-header">
                <span>Brain Dump</span>
                <span className="save-status">Saved</span>
            </div>
            <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="휘발성 아이디어, 걱정, 해야할 일들을 마구 적으세요..."
                className="brain-dump-textarea"
                spellCheck="false"
            />
        </div>
    );
};

export default BrainDump;
