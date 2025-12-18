import asyncio
import httpx
from typing import Dict, Any, List
import logging
from schemas import Workflow, Node, Edge

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class WorkflowExecutor:
    def __init__(self):
        self.results = {}

    async def execute_node(self, node: Node, context: Dict[str, Any]):
        logger.info(f"Executing node: {node.data.label} ({node.id})")
        task_type = node.data.task_type
        
        try:
            if task_type == 'input':
                # Start Trigger - Pass
                return {"status": "started", "timestamp": "now"}
            
            elif task_type == 'api':
                url = node.data.config.get("url")
                method = node.data.config.get("method", "POST")
                payload = node.data.config.get("payload", {})
                
                if not url:
                    raise ValueError("URL is required for API task")
                
                async with httpx.AsyncClient() as client:
                    response = await client.request(method, url, json=payload)
                    return {"status": response.status_code, "data": response.json()}
            
            elif task_type == 'wait':
                seconds = int(node.data.config.get("seconds", 1))
                await asyncio.sleep(seconds)
                return {"waited": seconds}

            elif task_type == 'custom':
                # Placeholder for script execution
                return {"message": "Custom script executed"}
                
            else:
                return {"message": "Unknown task type"}
                
        except Exception as e:
            logger.error(f"Error executing node {node.id}: {e}")
            return {"error": str(e)}

    async def run(self, workflow: Workflow):
        """
        Simple sequential execution for now.
        TODO: Build a proper DAG executor using networkx.
        """
        logger.info(f"Starting workflow: {workflow.name}")
        
        # Build adjacency list
        graph = {node.id: [] for node in workflow.nodes}
        node_map = {node.id: node for node in workflow.nodes}
        
        for edge in workflow.edges:
            if edge.source in graph:
                graph[edge.source].append(edge.target)
        
        # Find start nodes (nodes with no incoming edges) - simplified: assuming 'input' type is start
        # Or just find the first node provided?
        # Better: Toplogical sort or BFS.
        
        # Simplified BFS
        queue = [n for n in workflow.nodes if n.type == 'input']
        visited = set()
        
        results = {}
        
        while queue:
            current_node = queue.pop(0)
            if current_node.id in visited:
                continue
            
            visited.add(current_node.id)
            
            # Execute
            result = await self.execute_node(current_node, results)
            results[current_node.id] = result
            
            # Add neighbors
            for neighbor_id in graph.get(current_node.id, []):
                if neighbor_id not in visited:
                    queue.append(node_map[neighbor_id])
                    
        return results
