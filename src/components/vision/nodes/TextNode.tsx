import React, { memo, useState, useRef, useEffect } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { renderNodeContent } from './NodeContentRenderer';
import { useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';

export default memo(function TextNode(props: NodeProps<any>) {
  const node = props.data.node;
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(node.value);
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const updateNode = useMutation(api.nodes.update);

  const handleSave = async () => {
    if (isSaving) return;
    
    setIsSaving(true);
    try {
      await updateNode({
        id: node._id,
        value: editValue,
      });
      setIsEditing(false);
      props.data.onEditComplete?.();
    } catch (error) {
      console.error('Failed to update node:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(node.value);
    setIsEditing(false);
    props.data.onEditComplete?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  // Listen for external edit requests from frame component
  useEffect(() => {
    console.log('TextNode useEffect:', {
      editingNodeId: props.data.editingNodeId,
      nodeId: props.id,
      isEditing,
      shouldEdit: props.data.editingNodeId === props.id
    });
    
    if (props.data.editingNodeId === props.id && !isEditing) {
      console.log('Starting edit mode for node:', props.id);
      setIsEditing(true);
      setEditValue(node.value);
      // Focus the textarea after it renders
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    } else if (props.data.editingNodeId !== props.id && isEditing) {
      // Another node is being edited, stop editing this one
      console.log('Stopping edit mode for node:', props.id);
      setIsEditing(false);
      setEditValue(node.value);
    }
  }, [props.data.editingNodeId, props.id, isEditing, node.value]);
  
  return (
    <div 
      className="bg-card border border-green-500/20 rounded-lg shadow-sm min-w-[300px] max-w-[500px] ring-1 ring-green-500/10 group relative"
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        // Select this node on right-click
        console.log('Node right-clicked, selecting:', props.id);
        props.data.onNodeRightClick?.(props.id, e);
      }}
    >
      <Handle 
        type="target" 
        position={Position.Top}
        className="w-4 h-4 !bg-green-500 !border-2 !border-background"
      />
      
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-xs font-semibold text-green-600 uppercase tracking-wider">Text</span>
        </div>
        {renderNodeContent(node, props.data.onOpenChat, isEditing, editValue, setEditValue, handleKeyDown)}
        
        {isEditing && (
          <div className="flex gap-2 mt-3 pt-3 border-t border-green-500/20">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="px-3 py-1.5 bg-gray-500 text-white text-sm rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
      
      <Handle 
        type="source" 
        position={Position.Bottom}
        className="w-4 h-4 !bg-green-500 !border-2 !border-background"
      />
    </div>
  );
});
