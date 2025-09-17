import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Video } from 'lucide-react';
import { renderNodeContent } from './NodeContentRenderer';

export default memo(function VideoNode(props: NodeProps & { data: any }) {
  const node = props.data.node;
  
  return (
    <div 
      className="bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-950/20 dark:to-pink-950/20 bg-card border border-red-500/20 rounded-lg shadow-sm min-w-[300px] max-w-[500px] ring-1 ring-red-500/10"
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Video node right-clicked, selecting:', props.id);
        props.data.onNodeRightClick?.(props.id, e);
      }}
    >
      <Handle 
        type="target" 
        position={Position.Top}
        className="w-4 h-4 !bg-red-500 !border-2 !border-background"
      />
      
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Video className="w-3 h-3 text-red-600" />
          <span className="text-xs font-semibold text-red-600 uppercase tracking-wider">Video</span>
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
        className="w-4 h-4 !bg-red-500 !border-2 !border-background"
      />
    </div>
  );
});