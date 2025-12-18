import React from 'react';
import { useQuestStore } from '../store/useQuestStore';
import { X, CheckSquare, Square, FileText, ArrowRight } from 'lucide-react';

const Civilopedia = () => {
    const { nodes, selectedQuestId, selectQuest, toggleChecklistItem } = useQuestStore();
    
    if (!selectedQuestId) return null;

    const quest = nodes.find(n => n.id === selectedQuestId);
    if (!quest) return null;

    return (
        <div className="fixed top-0 right-0 h-full w-[400px] bg-white shadow-2xl border-l border-gray-200 z-50 transform transition-transform duration-300 overflow-y-auto">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 bg-gray-50/50 sticky top-0 backdrop-blur">
                <button 
                    onClick={() => selectQuest(null)}
                    className="absolute top-4 right-4 p-2 hover:bg-gray-200 rounded-full transition"
                >
                    <X size={20} className="text-gray-500" />
                </button>
                <div className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2">Quest Info</div>
                <h2 className="text-2xl font-bold text-gray-900 leading-tight">{quest.data.title}</h2>
            </div>

            {/* Content */}
            <div className="p-6 space-y-8">
                
                {/* 1. Description */}
                <section>
                    <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3">
                        <FileText size={16} /> Description
                    </h3>
                    <div className="bg-blue-50 p-4 rounded-xl text-sm leading-relaxed text-blue-900">
                        {quest.data.description}
                    </div>
                </section>

                {/* 2. Checklist (Sub-quests) */}
                <section>
                    <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3">
                        <CheckSquare size={16} /> Sub-Quests (Checklist)
                    </h3>
                    <div className="space-y-2">
                        {quest.data.checklist && quest.data.checklist.length > 0 ? (
                            quest.data.checklist.map(item => (
                                <div 
                                    key={item.id}
                                    onClick={() => toggleChecklistItem(quest.id, item.id)}
                                    className={`
                                        flex items-center gap-3 p-3 rounded-lg cursor-pointer border transition-all
                                        ${item.done 
                                            ? 'bg-gray-50 border-gray-100 text-gray-400 decoration-slate-400' 
                                            : 'bg-white border-gray-200 hover:border-blue-400 text-gray-800 shadow-sm'}
                                    `}
                                >
                                    {item.done 
                                        ? <CheckSquare size={18} className="text-green-500" />
                                        : <Square size={18} className="text-gray-300" />
                                    }
                                    <span className={item.done ? 'line-through' : ''}>{item.text}</span>
                                </div>
                            ))
                        ) : (
                            <div className="text-sm text-gray-400 italic p-2">No sub-quests defined.</div>
                        )}
                    </div>
                </section>

                {/* 3. Actions */}
                <section className="pt-8 border-t border-gray-100">
                    <button className="w-full py-3 bg-gray-900 hover:bg-black text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg">
                        Mark as Complete <ArrowRight size={16} />
                    </button>
                    <p className="text-xs text-center text-gray-400 mt-3">
                        Completing this unlocks the next stage.
                    </p>
                </section>
            </div>
        </div>
    );
};

export default Civilopedia;
