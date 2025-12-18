import React from 'react';
import ReactFlow, { Background, Controls } from 'reactflow';
import 'reactflow/dist/style.css';
import { useQuestStore } from '../store/useQuestStore';
import QuestNode from './nodes/QuestNode';

const nodeTypes = {
  quest: QuestNode,
};

const QuestMap = () => {
    const { nodes, edges, onNodesChange, onEdgesChange, onConnect, selectQuest } = useQuestStore();

    return (
        <div className="w-full h-full bg-[#f0f9ff]"> {/* Map Background */}
            <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={(_, node) => selectQuest(node.id)} // Open Civilopedia
                fitView
                minZoom={0.5}
                maxZoom={1.5}
            >
                <Background color="#cbd5e1" gap={40} size={1} />
                <Controls />
            </ReactFlow>
        </div>
    );
};

export default QuestMap;
