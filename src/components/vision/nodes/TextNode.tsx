import React, { memo, useState, useRef } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { BaseNodeData } from './BaseNode';
import { renderNodeContent } from './NodeContentRenderer';

export default memo(function TextNode(props: NodeProps<BaseNodeData>) {
  const node = props.data.node;
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(node.value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.metaKey) {
      setIsEditing(false);
    } else if (e.key === 'Escape') {
      setEditValue(node.value);
      setIsEditing(false);
    }
  };
  
  return (
    <div className="bg-white border border-green-200 rounded-lg shadow-sm min-w-[300px] max-w-[500px]">
      <Handle 
        type="target" 
        position={Position.Top}
        className="w-3 h-3 !bg-green-500"
      />
      
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-xs font-semibold text-green-700 uppercase tracking-wider">Text</span>
        </div>
        <div className="mb-2">
          <h4 className="font-medium text-sm">{node.title}</h4>
          {node.thought && (
            <p className="text-xs text-gray-600 mt-1">{node.thought}</p>
          )}
        </div>
        {renderNodeContent(node, props.data.onOpenChat, isEditing, editValue, setEditValue, textareaRef, handleKeyDown)}
      </div>
      
      <Handle 
        type="source" 
        position={Position.Bottom}
        className="w-3 h-3 !bg-green-500"
      />
    </div>
  );
});