import React from 'react';
import { useQuestStore } from '../store/useQuestStore';
import { Briefcase, Flame, Code, Truck, ArrowRight } from 'lucide-react';

const WorldCard = ({ id, world, onClick }) => {
    // Theme Config
    const getTheme = (theme) => {
        switch(theme) {
            case 'city': return { bg: 'bg-gradient-to-br from-blue-500 to-indigo-600', icon: <Briefcase size={32} className="text-white" /> };
            case 'fire': return { bg: 'bg-gradient-to-br from-red-600 to-orange-600', icon: <Flame size={32} className="text-yellow-300 animate-pulse" /> };
            case 'sky': return { bg: 'bg-gradient-to-br from-sky-400 to-blue-300', icon: <Code size={32} className="text-white" /> };
            case 'port': return { bg: 'bg-gradient-to-br from-amber-500 to-yellow-600', icon: <Truck size={32} className="text-white" /> };
            default: return { bg: 'bg-gray-500', icon: null };
        }
    };

    const theme = getTheme(world.theme);

    return (
        <div 
            onClick={() => onClick(id)}
            className={`
                relative h-64 rounded-3xl p-6 cursor-pointer shadow-xl transition-all duration-300 
                hover:scale-105 hover:shadow-2xl hover:-translate-y-2 group overflow-hidden
                ${theme.bg}
            `}
        >
            {/* Background Pattern effect */}
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>

            <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                    <div className="bg-white/20 w-fit p-3 rounded-2xl mb-4 backdrop-blur-sm">
                        {theme.icon}
                    </div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-wider mb-1 drop-shadow-md">
                        {world.name}
                    </h2>
                    <p className="text-white/80 font-medium text-sm">
                        {world.description}
                    </p>
                </div>
                
                <div className="flex justify-between items-center">
                    <span className="bg-black/20 text-white text-xs font-bold px-3 py-1 rounded-full backdrop-blur-md">
                        Lv. {world.nodes?.length || 0}
                    </span>
                    <button className="bg-white text-gray-900 w-10 h-10 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0">
                        <ArrowRight size={20} strokeWidth={3} />
                    </button>
                </div>
            </div>
        </div>
    );
};

const WorldSelect = () => {
    const { worlds, enterWorld } = useQuestStore();

    return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-[#0ea5e9] relative overflow-hidden">
            {/* Sea Background */}
            <div className="absolute inset-0 bg-blue-500 opacity-20" 
                 style={{ backgroundImage: 'radial-gradient(#bae6fd 1px, transparent 1px)', backgroundSize: '30px 30px' }}>
            </div>
            
            <div className="z-10 text-center mb-12">
                <h1 className="text-4xl font-black text-white drop-shadow-lg tracking-tighter mb-2">
                    WORLD SELECT
                </h1>
                <p className="text-blue-100 font-bold text-lg">Select a Domain to Manage</p>
            </div>

            <div className="z-10 grid grid-cols-2 gap-8 max-w-4xl w-full px-6">
                {Object.entries(worlds).map(([id, world]) => (
                    <WorldCard key={id} id={id} world={world} onClick={enterWorld} />
                ))}
            </div>
        </div>
    );
};

export default WorldSelect;
