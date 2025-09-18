import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { BadgeInfo, Link } from 'lucide-react';
import { renderNodeContent } from './NodeContentRenderer';

export default memo(function LinkNode(props: NodeProps & { data: any }) {
    const node = props.data.node;

    return (
        <div 
            className="bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-900/20 dark:to-slate-900/20 bg-card border border-gray-500/20 rounded-lg shadow-sm min-w-[300px] max-w-[500px] ring-1 ring-gray-500/10"
            onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Link node right-clicked, selecting:', props.id);
                props.data.onNodeRightClick?.(props.id, e);
            }}
        >
            <Handle
                type="target"
                position={Position.Top}
                id={Position.Top}
                className="w-4 h-4 !bg-gray-500 !border-2 !border-background"
            />
            <Handle
                type="target"
                position={Position.Left}
                id={Position.Left}
                className="w-4 h-4 !bg-gray-500 !border-2 !border-background"
            />
            <Handle
                type="source"
                position={Position.Right}
                id={Position.Right}
                className="w-4 h-4 !bg-gray-500 !border-2 !border-background"
            />

            <div className="w-[500px] p-4">
                <div className="flex items-center gap-2 mb-2">
                    <Link className="w-3 h-3 text-gray-600" />
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Link</span>
                </div>
                <div className="mb-2">
                    {node.title != "" && node.title !== "Unnamed link" && (
                        <h4 className="font-medium text-sm text-foreground">{node.title}</h4>
                    )}
                    {node.thought && (
                        <p className="text-sm flex items-center gap-1 mt-1 text-muted-foreground"><BadgeInfo className="h-5 w-5 text-muted-foreground"/> {node.thought}</p>
                    )}
                </div>
                {renderNodeContent(node, props.data.onOpenChat)}
            </div>

            <Handle
                type="source"
                position={Position.Bottom}
                id={Position.Bottom}
                className="w-4 h-4 !bg-gray-500 !border-2 !border-background"
            />
        </div>
    );
});
