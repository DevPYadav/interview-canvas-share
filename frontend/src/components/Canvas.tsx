import { useState, useRef, useEffect } from 'react';
import type { CanvasDocument, CanvasElement } from '../types';
import './Canvas.css';

interface CanvasProps {
  canvas: CanvasDocument;
  readonly: boolean;
  onUpdate: (canvas: CanvasDocument) => void;
}

function Canvas({ canvas, readonly, onUpdate }: CanvasProps) {
  const [selectedElement, setSelectedElement] = useState<CanvasElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleElementMouseDown = (e: React.MouseEvent, element: CanvasElement) => {
    if (readonly) return;
    
    e.stopPropagation();
    setSelectedElement(element);
    setIsDragging(true);
    
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !selectedElement || !canvasRef.current) return;

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const newX = e.clientX - canvasRect.left - dragOffset.x;
    const newY = e.clientY - canvasRect.top - dragOffset.y;

    const updatedElements = canvas.elements.map(el =>
      el.id === selectedElement.id
        ? { ...el, x: newX, y: newY, updated_at: new Date().toISOString() }
        : el
    );

    onUpdate({ ...canvas, elements: updatedElements });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement) === canvasRef.current) {
      setSelectedElement(null);
    }
  };

  const getComponentIcon = (type: string) => {
    switch (type) {
      case 'client': return '💻';
      case 'server': return '🖥️';
      case 'database': return '🗄️';
      case 'cache': return '⚡';
      case 'queue': return '📬';
      case 'llm': return '🤖';
      default: return '📦';
    }
  };

  const getComponentColor = (type: string) => {
    switch (type) {
      case 'client': return '#3B82F6';
      case 'server': return '#10B981';
      case 'database': return '#8B5CF6';
      case 'cache': return '#F59E0B';
      case 'queue': return '#EF4444';
      case 'llm': return '#EC4899';
      default: return '#6B7280';
    }
  };

  return (
    <div
      ref={canvasRef}
      className="canvas"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onClick={handleCanvasClick}
    >
      <svg className="canvas-svg">
        {canvas.elements.map((element) => (
          <g key={element.id}>
            {element.type === 'connector' ? (
              <line
                x1={element.x}
                y1={element.y}
                x2={element.x + 100}
                y2={element.y}
                stroke="#6B7280"
                strokeWidth="2"
                markerEnd="url(#arrowhead)"
              />
            ) : (
              <g
                onMouseDown={(e) => handleElementMouseDown(e, element)}
                style={{ cursor: readonly ? 'default' : 'move' }}
              >
                <rect
                  x={element.x}
                  y={element.y}
                  width={element.width || 120}
                  height={element.height || 80}
                  fill={element.color || getComponentColor(element.type)}
                  stroke={selectedElement?.id === element.id ? '#3B82F6' : 'none'}
                  strokeWidth={selectedElement?.id === element.id ? 3 : 0}
                  rx={element.type === 'rounded-rectangle' ? 8 : 4}
                />
                <text
                  x={element.x + (element.width || 120) / 2}
                  y={element.y + (element.height || 80) / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize="14"
                  fontWeight="500"
                >
                  {element.label || getComponentIcon(element.type)}
                </text>
              </g>
            )}
          </g>
        ))}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#6B7280" />
          </marker>
        </defs>
      </svg>
      {!readonly && (
        <div className="canvas-toolbar">
          <button className="tool-button" title="Select">Select</button>
          <button className="tool-button" title="Rectangle">Rectangle</button>
          <button className="tool-button" title="Database">Database</button>
          <button className="tool-button" title="Connector">Connector</button>
        </div>
      )}
    </div>
  );
}

export default Canvas;
