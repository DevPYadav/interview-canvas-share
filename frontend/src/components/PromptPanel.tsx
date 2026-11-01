import { useState } from 'react';
import './PromptPanel.css';

interface PromptPanelProps {
  prompt: string;
}

function PromptPanel({ prompt }: PromptPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className={`prompt-panel ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <button 
        className="prompt-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? '▼' : '▶'} Interview Prompt
      </button>
      {isExpanded && (
        <div className="prompt-content">
          <p>{prompt || 'No prompt configured for this session.'}</p>
        </div>
      )}
    </div>
  );
}

export default PromptPanel;
