import { useState, useRef } from 'react';
import type { CanvasDocument, CanvasElement } from '../types';
import './Canvas.css';

interface CanvasProps {
  canvas: CanvasDocument;
  readonly: boolean;
  onUpdate: (canvas: CanvasDocument) => void;
}

type Tool = 'select' | 'rectangle' | 'database' | 'connector';

function Canvas({ canvas, readonly, onUpdate }: CanvasProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>('select');
  const svgRef = useRef<SVGSVGElement>(null);
  // Drag state lives in a ref so mouse-move handlers never see stale values
  const drag = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);

  // Convert screen coordinates to SVG (viewBox) coordinates
  const toSvgPoint = (e: React.MouseEvent) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  };

  const handleElementMouseDown = (e: React.MouseEvent, element: CanvasElement) => {
    if (readonly) return;
    e.stopPropagation();
    setSelectedId(element.id);
    if (tool !== 'select') return;
    const p = toSvgPoint(e);
    drag.current = { id: element.id, offsetX: p.x - element.x, offsetY: p.y - element.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!drag.current || readonly) return;
    const p = toSvgPoint(e);
    const { id, offsetX, offsetY } = drag.current;
    const updatedElements = canvas.elements.map((el) =>
      el.id === id
        ? { ...el, x: p.x - offsetX, y: p.y - offsetY, updated_at: new Date().toISOString() }
        : el
    );
    onUpdate({ ...canvas, elements: updatedElements });
  };

  const handleMouseUp = () => {
    drag.current = null;
  };

  // Click on empty canvas: deselect (Select tool) or add an element (other tools)
  const handleBackgroundMouseDown = (e: React.MouseEvent) => {
    if (readonly) return;
    if (tool === 'select') {
      setSelectedId(null);
      return;
    }
    const p = toSvgPoint(e);
    const now = new Date().toISOString();
    const base = { id: `el-${Date.now()}`, created_at: now, updated_at: now };
    let newElement: CanvasElement;

    if (tool === 'connector') {
      newElement = { ...base, type: 'connector', x: p.x, y: p.y } as unknown as CanvasElement;
    } else if (tool === 'database') {
      newElement = {
        ...base,
        type: 'database',
        x: p.x - 60,
        y: p.y - 40,
        width: 120,
        height: 80,
        label: 'Database',
      } as unknown as CanvasElement;
    } else {
      newElement = {
        ...base,
        type: 'rectangle',
        x: p.x - 60,
        y: p.y - 40,
        width: 120,
        height: 80,
        label: 'Rectangle',
        color: '#6B7280',
      } as unknown as CanvasElement;
    }

    onUpdate({ ...canvas, elements: [...canvas.elements, newElement] });
    setSelectedId(newElement.id);
    setTool('select');
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

  const toolButton = (t: Tool, label: string) => (
    <button
      className={`tool-button${tool === t ? ' active' : ''}`}
      title={label}
      onClick={() => setTool(t)}
    >
      {label}
    </button>
  );

  return (
    <div className="canvas" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
      <svg
        ref={svgRef}
        className="canvas-svg"
        viewBox="0 0 700 700"
        preserveAspectRatio="xMidYMin meet"
        onMouseDown={handleBackgroundMouseDown}
        style={{ cursor: readonly ? 'default' : tool === 'select' ? 'default' : 'crosshair' }}
      >
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#6B7280" />
          </marker>
        </defs>
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
                  stroke={selectedId === element.id ? '#3B82F6' : 'none'}
                  strokeWidth={selectedId === element.id ? 3 : 0}
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
                  style={{ pointerEvents: 'none' }}
                >
                  {element.label || getComponentIcon(element.type)}
                </text>
              </g>
            )}
          </g>
        ))}
      </svg>
      {!readonly && (
        <div className="canvas-toolbar">
          {toolButton('select', 'Select')}
          {toolButton('rectangle', 'Rectangle')}
          {toolButton('database', 'Database')}
          {toolButton('connector', 'Connector')}
        </div>
      )}
    </div>
  );
}

export default Canvas;
