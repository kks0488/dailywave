from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class Position(BaseModel):
    x: float
    y: float

class NodeData(BaseModel):
    label: str
    task_type: str = "custom"  # script, api, wait, conditional
    config: Dict[str, Any] = {}

class Node(BaseModel):
    id: str
    type: str = "default"  # reactflow node type
    position: Position
    data: NodeData
    width: Optional[float] = None
    height: Optional[float] = None

class Edge(BaseModel):
    id: str
    source: str
    target: str
    type: str = "default"
    animated: bool = False

class Workflow(BaseModel):
    id: str
    name: str
    nodes: List[Node]
    edges: List[Edge]
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
