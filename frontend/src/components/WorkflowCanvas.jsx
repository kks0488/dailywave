import React, { useCallback, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  ReactFlowProvider,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useWarRoomStore } from '../store/useWarRoomStore';
import SOPNode from './nodes/SOPNode';

const nodeTypes = {
  sop: SOPNode,
};

function CanvasContent() {
  const reactFlowWrapper = useRef(null);
  const { project } = useReactFlow();
  
  // Connect to War Room Store
  const nodes = useWarRoomStore(state => state.nodes);
  const edges = useWarRoomStore(state => state.edges);
  const onNodesChange = useWarRoomStore(state => state.onNodesChange);
  const onEdgesChange = useWarRoomStore(state => state.onEdgesChange);
  const onConnect = useWarRoomStore(state => state.onConnect);
  const addNode = useWarRoomStore(state => state.addNode);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      if (!reactFlowWrapper.current) return;
      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;
      const position = project({
        x: event.clientX - reactFlowWrapper.current.getBoundingClientRect().left,
        y: event.clientY - reactFlowWrapper.current.getBoundingClientRect().top,
      });
      const newNode = {
        id: `${type}-${Date.now()}`,
        type: 'sop', 
        position,
        data: { label: 'New Project Task', description: 'Define task...', link: '', color: '#9ca3af' },
      };
      addNode(newNode);
    },
    [project, addNode]
  );

  return (
    <div className="w-full h-full" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDragOver={onDragOver}
        onDrop={onDrop}
        fitView
      >
        <Background color="#e5e7eb" gap={20} variant="dots" />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}

export default function WorkflowCanvas() {
  return (
    <ReactFlowProvider>
      <CanvasContent />
    </ReactFlowProvider>
  );
}
