import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Brain } from 'lucide-react';
import { BaseNodeData } from './BaseNode';
import { renderNodeContent } from './NodeContentRenderer';

export default memo(function AINode(props: NodeProps<BaseNodeData>) {
  const node = props.data.node;
  
  return (
    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-lg shadow-sm min-w-[300px] max-w-[500px]">
      <Handle 
        type="target" 
        position={Position.Top}
        className="w-3 h-3 !bg-purple-500"
      />
      
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Brain className="w-3 h-3 text-purple-600" />
          <span className="text-xs font-semibold text-purple-700 uppercase tracking-wider">AI</span>
        </div>
        <div className="mb-2">
          <h4 className="font-medium text-sm">{node.title}</h4>
          {node.thought && (
            <p className="text-xs text-gray-600 mt-1">{node.thought}</p>
          )}
        </div>
        {renderNodeContent(node, props.data.onOpenChat)}
      </div>
      
      <Handle 
        type="source" 
        position={Position.Bottom}
        className="w-3 h-3 !bg-purple-500"
      />
    </div>
  );
});