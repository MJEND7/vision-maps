import React, { memo, useState, useRef, useEffect, useCallback } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { useMutation } from 'convex/react';
import { api } from "@convex/_generated/api";
import { Mic, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default memo(function TranscriptionNode(props: NodeProps & { data: any }) {
  const node = props.data.node;
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(node.value);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    show: boolean;
    x: number;
    y: number;
    selectedText: string;
  }>({ show: false, x: 0, y: 0, selectedText: '' });

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const updateNode = useMutation(api.nodes.update);

  const handleSave = async () => {
    if (isSaving) return;

    setIsSaving(true);
    try {
      await updateNode({
        id: node._id,
        value: editValue,
      });
      props.data.onUpdateNodeContent?.(props.id, editValue);
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

  // Handle text selection and context menu
  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (isEditing) return;

    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();

    if (selectedText && selectedText.length > 0) {
      // Show context menu at mouse position
      setContextMenu({
        show: true,
        x: e.clientX,
        y: e.clientY,
        selectedText,
      });
    } else {
      setContextMenu({ show: false, x: 0, y: 0, selectedText: '' });
    }
  }, [isEditing]);

  const handleExtractToNode = useCallback(async () => {
    if (!contextMenu.selectedText) return;

    try {
      // Call the parent handler if provided
      if (props.data.onCreateNodeFromSelection && props.positionAbsoluteX !== undefined && props.positionAbsoluteY !== undefined) {
        // Calculate a position offset from this node
        props.data.onCreateNodeFromSelection(contextMenu.selectedText, {
          x: props.positionAbsoluteX + 600,
          y: props.positionAbsoluteY,
        });
      }

      setContextMenu({ show: false, x: 0, y: 0, selectedText: '' });
      window.getSelection()?.removeAllRanges();
    } catch (error) {
      console.error('Failed to create node from selection:', error);
    }
  }, [contextMenu.selectedText, props.data, props.positionAbsoluteX, props.positionAbsoluteY]);

  const handleCopyText = useCallback(() => {
    if (!contextMenu.selectedText) return;

    navigator.clipboard.writeText(contextMenu.selectedText);
    setCopiedText(contextMenu.selectedText);
    setTimeout(() => setCopiedText(null), 2000);

    setContextMenu({ show: false, x: 0, y: 0, selectedText: '' });
    window.getSelection()?.removeAllRanges();
  }, [contextMenu.selectedText]);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu.show) {
        setContextMenu({ show: false, x: 0, y: 0, selectedText: '' });
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [contextMenu.show]);

  // Listen for external edit requests
  useEffect(() => {
    if (props.data.editingNodeId === props.id && !isEditing) {
      setIsEditing(true);
      setEditValue(node.value);
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    } else if (props.data.editingNodeId !== props.id && isEditing) {
      setIsEditing(false);
      setEditValue(node.value);
    }
  }, [props.data.editingNodeId, props.id, isEditing, node.value]);

  return (
    <>
      <div
        className="bg-card border border-purple-500/20 rounded-lg shadow-sm min-w-[400px] max-w-[600px] ring-1 ring-purple-500/10 group relative"
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
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

        <div className={`${isEditing ? "w-[600px]" : ""} p-4`}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
            <Mic className="w-3 h-3 text-purple-600" />
            <span className="text-xs font-semibold text-purple-600 uppercase tracking-wider">Transcription</span>
            {copiedText && (
              <span className="ml-auto flex items-center gap-1 text-xs text-green-600">
                <Check className="w-3 h-3" />
                Copied
              </span>
            )}
          </div>

          {isEditing ? (
            <textarea
              ref={textareaRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full min-h-[300px] p-3 bg-background border border-purple-500/20 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-y font-mono"
              placeholder="Edit transcription..."
            />
          ) : (
            <div
              ref={contentRef}
              className="prose prose-sm max-w-none cursor-text select-text text-sm text-foreground whitespace-pre-wrap"
              onMouseUp={handleMouseUp}
              onClick={() => {
                if (!isEditing) setIsEditing(true);
              }}
            >
              <ReactMarkdown
                components={{
                  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                  h1: ({ children }) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-base font-bold mb-2">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-sm font-bold mb-2">{children}</h3>,
                  ul: ({ children }) => <ul className="list-disc list-inside mb-2">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal list-inside mb-2">{children}</ol>,
                  li: ({ children }) => <li className="mb-1">{children}</li>,
                  code: ({ children, ...props }) => (
                    'inline' in props ? (
                      <code className="bg-muted px-1 py-0.5 rounded text-xs">{children}</code>
                    ) : (
                      <code className="block bg-muted p-2 rounded text-xs my-2">{children}</code>
                    )
                  ),
                }}
              >
                {node.value || 'No transcription available'}
              </ReactMarkdown>
            </div>
          )}

          {isEditing && (
            <div className="flex gap-2 mt-3 pt-3 border-t border-purple-500/20">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
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
          id={Position.Bottom}
          className="w-4 h-4 !bg-purple-500 !border-2 !border-background"
        />
      </div>

      {/* Context Menu */}
      {contextMenu.show && (
        <div
          className="fixed z-[9999] bg-background border border-border rounded-md shadow-lg py-1 min-w-[180px]"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full px-4 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
            onClick={handleExtractToNode}
          >
            <span className="text-purple-500">→</span>
            Extract to Text Node
          </button>
          <button
            className="w-full px-4 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
            onClick={handleCopyText}
          >
            <Copy className="w-3 h-3" />
            Copy Text
          </button>
        </div>
      )}
    </>
  );
});