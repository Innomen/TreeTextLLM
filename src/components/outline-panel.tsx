
"use client";

import React, { useState } from 'react';
import type { DocumentMap, DocumentNode } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, FileText, ChevronDown, ChevronRight, Loader2, Trash2, Pencil, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OutlinePanelProps {
  docMap: DocumentMap;
  rootId: string;
  focusedNodeId: string | null;
  expandedNodeIds: string[];
  onSelectNode: (id: string) => void;
  onCreateNode: (node: DocumentNode) => void;
  onDeleteNode: (id: string) => void;
  onMoveNode: (nodeId: string, direction: 'up' | 'down' | 'left' | 'right') => void;
  onToggleNodeExpansion: (id: string) => void;
  onNodeDoubleClick: (id: string) => void;
  onRenameNode: (node: DocumentNode) => void;
}

const NodeTreeItem: React.FC<{
  node: DocumentNode;
  docMap: DocumentMap;
  focusedNodeId: string | null;
  isExpanded: boolean;
  expandedNodeIds: string[];
  onSelectNode: (id: string) => void;
  onDeleteNode: (id: string) => void;
  onRenameNode: (node: DocumentNode) => void;
  onMoveNode: (nodeId: string, direction: 'up' | 'down' | 'left' | 'right') => void;
  onToggleNodeExpansion: (id: string) => void;
  onNodeDoubleClick: (id: string) => void;
  onOpenCreateNodeDialog: (parentId: string) => void;
  level: number;
}> = ({ node, docMap, focusedNodeId, isExpanded, expandedNodeIds, onSelectNode, onDeleteNode, onRenameNode, onMoveNode, onToggleNodeExpansion, onNodeDoubleClick, onOpenCreateNodeDialog, level }) => {
  const hasChildren = node.childrenIds.length > 0;
  
  const parent = node.parentId ? docMap.get(node.parentId) : null;
  const siblings = parent ? parent.childrenIds : [];
  const nodeIndex = siblings.indexOf(node.id);
  
  const canMoveUp = nodeIndex > 0;
  const canMoveDown = nodeIndex < siblings.length - 1;
  const canMoveRight = nodeIndex > 0; // Can indent if not the first child
  const canMoveLeft = !!parent?.parentId; // Can outdent if not a direct child of root


  return (
    <div style={{ paddingLeft: `${level * 1}rem` }}>
      <div
        className={cn(
          "flex items-center gap-1 py-1.5 px-2 rounded-md hover:bg-muted group",
          focusedNodeId === node.id && "bg-primary/10"
        )}
        onDoubleClick={(e) => { e.preventDefault(); onNodeDoubleClick(node.id); }}
      >
        <div className="flex items-center flex-1 min-w-0" onClick={() => onSelectNode(node.id)}>
            {hasChildren ? (
            <button onClick={(e) => { e.stopPropagation(); onToggleNodeExpansion(node.id); }} className="p-0.5 rounded-sm hover:bg-muted-foreground/20">
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
            ) : (
            <span className="w-5 h-5 inline-block" />
            )}
            <FileText className="h-4 w-4 mr-1 shrink-0" />
            <span className="truncate flex-1">{node.title}</span>
        </div>
        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
             <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => {e.stopPropagation(); onOpenCreateNodeDialog(node.id); }}>
                <PlusCircle className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" disabled={!canMoveUp} onClick={(e) => {e.stopPropagation(); onMoveNode(node.id, 'up'); }}>
                <ArrowUp className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" disabled={!canMoveDown} onClick={(e) => {e.stopPropagation(); onMoveNode(node.id, 'down'); }}>
                <ArrowDown className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" disabled={!canMoveLeft} onClick={(e) => {e.stopPropagation(); onMoveNode(node.id, 'left'); }}>
                <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" disabled={!canMoveRight} onClick={(e) => {e.stopPropagation(); onMoveNode(node.id, 'right'); }}>
                <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => {e.stopPropagation(); onRenameNode(node); }}>
                <Pencil className="h-4 w-4" />
            </Button>
            {node.parentId && ( // Don't show delete for root node
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => e.stopPropagation()}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent onEscapeKeyDown={e => e.preventDefault()}>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the node "{node.title}" and all of its descendants.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDeleteNode(node.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Yes, delete it
                    </AlertDialogAction>
                </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            )}
        </div>
      </div>
      {hasChildren && isExpanded && (
        <div>
          {node.childrenIds.map(childId => {
            const childNode = docMap.get(childId);
            return childNode ? (
              <NodeTreeItem
                key={childId}
                node={childNode}
                docMap={docMap}
                focusedNodeId={focusedNodeId}
                isExpanded={expandedNodeIds.includes(childId)}
                expandedNodeIds={expandedNodeIds}
                onSelectNode={onSelectNode}
                onDeleteNode={onDeleteNode}
                onRenameNode={onRenameNode}
                onMoveNode={onMoveNode}
                onToggleNodeExpansion={onToggleNodeExpansion}
                onNodeDoubleClick={onNodeDoubleClick}
                onOpenCreateNodeDialog={onOpenCreateNodeDialog}
                level={level + 1}
              />
            ) : null;
          })}
        </div>
      )}
    </div>
  );
};


export function OutlinePanel({ docMap, rootId, focusedNodeId, expandedNodeIds, onSelectNode, onCreateNode, onDeleteNode, onMoveNode, onToggleNodeExpansion, onNodeDoubleClick, onRenameNode }: OutlinePanelProps) {
  const [isCreateNodeDialogOpen, setIsCreateNodeDialogOpen] = useState(false);
  const [createNodeParentId, setCreateNodeParentId] = useState<string | null>(null);
  const [intent, setIntent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const rootNode = docMap.get(rootId);


  const handleOpenCreateNodeDialog = (parentId: string) => {
    setCreateNodeParentId(parentId);
    setIntent('');
    setIsCreateNodeDialogOpen(true);
  };

  const handleSmartNodeCreate = async () => {
    if (!intent || !createNodeParentId) return;
    setIsLoading(true);
    try {
      const savedSettings = localStorage.getItem('treetextllm_settings');
      const settings = savedSettings ? JSON.parse(savedSettings) : {};
      const { openAIBaseUrl } = settings;

      if (!openAIBaseUrl) {
        toast({
          variant: "destructive",
          title: "Missing LLM URL",
          description: "Please set the Local LLM URL in the settings.",
        });
        setIsLoading(false);
        return;
      }
      
      const parentNodeId = createNodeParentId;
      const prompt = `You are a document creation assistant. Given a parent node ID and a description of the desired content, generate a relevant title and initial content for a new document node.

Parent Node ID: ${parentNodeId}
Intent: ${intent}

Return the result as a JSON object with two keys: "title" and "content". For example:
{
  "title": "A Relevant Title",
  "content": "Initial content for the new node."
}`;

      const response = await fetch('/api/local-llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: openAIBaseUrl,
          payload: {
            messages: [
              { role: 'system', content: 'You are an assistant that only responds in JSON.' },
              { role: 'user', content: prompt }
            ],
            response_format: { type: "json_object" },
          }
        })
      });
      
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'An unknown error occurred.');
      }
      
      const jsonResponse = result.choices[0]?.message?.content?.trim() ?? '{}';
      const parsedData = JSON.parse(jsonResponse);
      const title = parsedData.title || "Untitled";

      const newNode: DocumentNode = {
        id: `node-${Date.now()}`,
        title: title,
        content: parsedData.content || title,
        childrenIds: [],
        parentId: parentNodeId,
      };
      onCreateNode(newNode);
      setIsCreateNodeDialogOpen(false);
      setIntent('');
      setCreateNodeParentId(null);
      toast({ title: "Node created successfully!", description: `"${newNode.title}" was added.` });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      console.error("Failed to create smart node:", error);
      toast({ variant: "destructive", title: "Error", description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmptyNodeCreate = () => {
    if (!createNodeParentId) return;
    const newNode: DocumentNode = {
      id: `node-${Date.now()}`,
      title: "Untitled",
      content: "Untitled",
      childrenIds: [],
      parentId: createNodeParentId,
    };
    onCreateNode(newNode);
    setIsCreateNodeDialogOpen(false);
    setIntent('');
    setCreateNodeParentId(null);
    toast({ title: "Node created successfully!", description: `"${newNode.title}" was added.` });
  };

  return (
    <aside className="h-full flex flex-col">
       <div className="p-2 shrink-0">
          {/* This space is now clear */}
       </div>
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-2">
          {rootNode && <NodeTreeItem 
              node={rootNode} 
              docMap={docMap} 
              focusedNodeId={focusedNodeId} 
              isExpanded={expandedNodeIds.includes(rootNode.id)}
              expandedNodeIds={expandedNodeIds}
              onSelectNode={onSelectNode} 
              onDeleteNode={onDeleteNode} 
              onRenameNode={onRenameNode}
              onMoveNode={onMoveNode} 
              onToggleNodeExpansion={onToggleNodeExpansion}
              onNodeDoubleClick={onNodeDoubleClick}
              onOpenCreateNodeDialog={handleOpenCreateNodeDialog}
              level={0} 
          />}
        </div>
      </ScrollArea>
      
      <Dialog open={isCreateNodeDialogOpen} onOpenChange={setIsCreateNodeDialogOpen}>
        <DialogContent onKeyDown={(e) => {if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSmartNodeCreate(); }}}>
          <DialogHeader>
            <DialogTitle>Create New Node</DialogTitle>
            <DialogDescription>
                You can either describe the new section for the AI to generate, or create a blank node to fill in yourself. The new node will be a child of the selected node.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="intent">Describe the new section (for AI generation):</Label>
            <Input id="intent" placeholder="e.g., 'A section about the main character''s backstory'" value={intent} onChange={(e) => setIntent(e.target.value)} />
          </div>
          <DialogFooter className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={handleEmptyNodeCreate}>Create Empty Node</Button>
            <Button onClick={handleSmartNodeCreate} disabled={isLoading || !intent}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
              Generate with AI
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
