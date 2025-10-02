'use client';

import React, { memo } from 'react';
import { Mic } from 'lucide-react';
import { Handle, NodeProps, Position } from '@xyflow/react';
import { renderNodeContent } from './NodeContentRenderer';

export default memo(function TranscriptionNode(props: NodeProps & { data: any }) {
    const node = props.data.node

    return (
        <div
            className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20 bg-card border border-purple-500/20 rounded-lg shadow-sm min-w-[300px] max-w-[500px] ring-1 ring-purple-500/10 group relative"
            onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('AI node right-clicked, selecting:', props.id);
                props.data.onNodeRightClick?.(props.id, e);
            }}
        >
            <Handle
                type="target"
                position={Position.Top}
                id={Position.Top}
                className="w-4 h-4 !bg-purple-500 !border-2 !border-background"
            />
            <Handle
                type="target"
                position={Position.Left}
                id={Position.Left}
                className="w-4 h-4 !bg-purple-500 !border-2 !border-background"
            />
            <Handle
                type="source"
                position={Position.Right}
                id={Position.Right}
                className="w-4 h-4 !bg-purple-500 !border-2 !border-background"
            />

            <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                    <Mic className="w-3 h-3 text-purple-600" />
                    <span className="text-xs font-semibold text-purple-600 uppercase tracking-wider">AI</span>
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
                id={Position.Bottom}
                className="w-4 h-4 !bg-purple-500 !border-2 !border-background"
            />
        </div>
    );

})
