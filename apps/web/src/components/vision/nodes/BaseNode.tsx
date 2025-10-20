import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { NodeUser } from "@/hooks/users/useUserCache";

export interface BaseNodeData {
  node: any; // The actual node data from the database
  nodeUser: NodeUser | null;
  frameId?: string; // Frame ID for context actions
  onNodeRightClick?: (nodeId: string, event: React.MouseEvent) => void; // Right-click handler for selection
  onOpenChat?: (chatId: string) => void;
  onChannelNavigate?: (channelId: string, nodeId?: string) => void;
  onShowDeleteDialog?: () => void;
  onShowMobileDrawer?: () => void;
  isMobile?: boolean;
}

export default memo(function BaseNode({ data }: NodeProps & { data: any }) {
  const node = data.node;
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm min-w-[300px] max-w-[500px]">
      <Handle 
        type="target" 
        position={Position.Top}
        id={Position.Top}
        className="w-3 h-3 !bg-blue-500"
      />
      <Handle 
        type="target" 
        position={Position.Left}
        id={Position.Left}
        className="w-3 h-3 !bg-blue-500"
      />
      <Handle 
        type="source" 
        position={Position.Right}
        id={Position.Right}
        className="w-3 h-3 !bg-blue-500"
      />
      
      <div className="p-4">
        <div className="mb-2">
          <h4 className="font-medium text-sm">{node.title}</h4>
          {node.thought && (
            <p className="text-xs text-gray-600 mt-1">{node.thought}</p>
          )}
        </div>
        <div className="text-xs text-gray-500 truncate">
          {node.value}
        </div>
      </div>
      
      <Handle 
        type="source" 
        position={Position.Bottom}
        id={Position.Bottom}
        className="w-3 h-3 !bg-blue-500"
      />
    </div>
  );
});
