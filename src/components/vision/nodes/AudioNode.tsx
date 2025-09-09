import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Volume2 } from 'lucide-react';
import { BaseNodeData } from './BaseNode';
import { renderNodeContent } from './NodeContentRenderer';

export default memo(function AudioNode(props: NodeProps<BaseNodeData>) {
  const node = props.data.node;
  
  return (
    <div className="bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-950/20 dark:to-yellow-950/20 bg-card border border-orange-500/20 rounded-lg shadow-sm min-w-[300px] max-w-[500px] ring-1 ring-orange-500/10">
      <Handle 
        type="target" 
        position={Position.Top}
        className="w-4 h-4 !bg-orange-500 !border-2 !border-background"
      />
      
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Volume2 className="w-3 h-3 text-orange-600" />
          <span className="text-xs font-semibold text-orange-600 uppercase tracking-wider">Audio</span>
        </div>
        <div className="mb-2">
          <h4 className="font-medium text-sm text-foreground">{node.title}</h4>
          {node.thought && (
            <p className="text-xs text-muted-foreground mt-1">{node.thought}</p>
          )}
        </div>
        {renderNodeContent(node, props.data.onOpenChat)}
      </div>
      
      <Handle 
        type="source" 
        position={Position.Bottom}
        className="w-4 h-4 !bg-orange-500 !border-2 !border-background"
      />
    </div>
  );
});