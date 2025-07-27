
"use client";

import { useState, useCallback, useEffect } from 'react';
import type { DocumentMap, DocumentNode } from '@/lib/types';
import { initialDocumentMap, rootNodeId as initialRootId } from '@/lib/mock-data';
import { Header } from '@/components/header';
import { OutlinePanel } from '@/components/outline-panel';
import { EditorPanel } from '@/components/editor-panel';
import { PreviewPanel, PreviewContent } from '@/components/preview-panel';
import { Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { SettingsDialog } from '@/components/settings-dialog';


const LOCAL_STORAGE_KEY_DOCUMENTS = 'treetextllm_documents_v2';
const LOCAL_STORAGE_KEY_UI_STATE = 'treetextllm_ui_state_v2';

export interface DocV2 {
    id: string;
    name: string;
    docMap: DocumentMap;
    rootId: string;
    lastModified: number;
}

interface UiState {
    activeDocumentId: string | null;
    focusedNodeId: string | null;
    expandedNodeIds: string[];
    activeTab: string;
}

// Function to migrate old data structure to new one
function migrateV1ToV2(v1_doc: any, v1_ui: any) : { docs: DocV2[], ui: UiState } {
    const now = Date.now();
    const newDocId = `doc-${now}`;
    
    // Check if v1_doc has the expected structure
    if (v1_doc && v1_doc.rootId && v1_doc.docMap) {
        const newDoc: DocV2 = {
            id: newDocId,
            name: new Map(v1_doc.docMap).get(v1_doc.rootId)?.title || 'My First Document',
            docMap: new Map(v1_doc.docMap),
            rootId: v1_doc.rootId,
            lastModified: now,
        };

         const newUi: UiState = {
            activeDocumentId: newDocId,
            focusedNodeId: v1_ui?.focusedNodeId || v1_doc.rootId,
            expandedNodeIds: v1_ui?.expandedNodeIds || [v1_doc.rootId],
            activeTab: 'outline',
        };

        return { docs: [newDoc], ui: newUi };
    }
    
    // If no valid v1 data, create a default document
    const rootId = 'root';
    const firstDoc: DocV2 = {
        id: newDocId,
        name: 'My First Document',
        docMap: new Map(initialDocumentMap),
        rootId: rootId,
        lastModified: now,
    };
     const defaultUi: UiState = {
        activeDocumentId: newDocId,
        focusedNodeId: rootId,
        expandedNodeIds: [rootId],
        activeTab: 'outline',
    };

    return { docs: [firstDoc], ui: defaultUi };
}


export default function MainLayout() {
  const [documents, setDocuments] = useState<DocV2[]>([]);
  const [uiState, setUiState] = useState<UiState>({ activeDocumentId: null, focusedNodeId: null, expandedNodeIds: [], activeTab: 'outline'});
  const [renamingNode, setRenamingNode] = useState<DocumentNode | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { toast } = useToast();

  // Load state from local storage only on the client-side
  useEffect(() => {
    let finalDocs: DocV2[] = [];
    let finalUiState: UiState | null = null;
    
    try {
        const savedDocsString = localStorage.getItem(LOCAL_STORAGE_KEY_DOCUMENTS);
        const savedUiString = localStorage.getItem(LOCAL_STORAGE_KEY_UI_STATE);

        if (savedDocsString) {
             const parsedDocs = JSON.parse(savedDocsString);
             finalDocs = parsedDocs.map((d: any) => ({...d, docMap: new Map(d.docMap)}));
        }
        if (savedUiString) {
            finalUiState = JSON.parse(savedUiString);
        }

        // Migration from previous documents key if needed
        const oldDocsKey = localStorage.getItem('treetextllm_documents');
        if(!savedDocsString && oldDocsKey) {
            const parsedDocs = JSON.parse(oldDocsKey);
            finalDocs = parsedDocs.map((d: any) => ({...d, docMap: new Map(d.docMap)}));
            localStorage.removeItem('treetextllm_documents');
        }


        if (finalDocs.length === 0) {
            // Check for V1 data and migrate if no V2 data exists
            const oldDocString = localStorage.getItem('treetextllm_document');
            const oldUiString = localStorage.getItem('treetextllm_ui_state');
            if (oldDocString) {
                const oldDoc = JSON.parse(oldDocString);
                const oldUi = oldUiString ? JSON.parse(oldUiString) : null;
                const { docs: migratedDocs, ui: migratedUi } = migrateV1ToV2(oldDoc, oldUi);
                finalDocs = migratedDocs;
                finalUiState = migratedUi;
                // Clear old keys
                localStorage.removeItem('treetextllm_document');
                localStorage.removeItem('treetextllm_ui_state');
            } else {
                 // Create a fresh default document if no data exists at all
                 const { docs: defaultDocs, ui: defaultUi } = migrateV1ToV2(null, null);
                 finalDocs = defaultDocs;
                 finalUiState = defaultUi;
            }
        }
        
        setDocuments(finalDocs);
        if (finalUiState) {
            // Ensure the active document actually exists
            if (finalDocs.some(d => d.id === finalUiState.activeDocumentId)) {
                setUiState(finalUiState);
            } else if (finalDocs.length > 0) {
                 const newActiveDoc = finalDocs.sort((a,b) => b.lastModified - a.lastModified)[0];
                 setUiState({
                    ...finalUiState,
                    activeDocumentId: newActiveDoc.id,
                    focusedNodeId: newActiveDoc.rootId,
                    expandedNodeIds: [newActiveDoc.rootId],
                });
            } else {
                 setUiState({ ...finalUiState, activeDocumentId: null, focusedNodeId: null, expandedNodeIds: [] });
            }
        } else if (finalDocs.length > 0) {
            // Fallback if UI state is missing for some reason
            const firstDocId = finalDocs[0].id;
            setUiState({
                activeDocumentId: firstDocId,
                focusedNodeId: finalDocs[0].rootId,
                expandedNodeIds: [finalDocs[0].rootId],
                activeTab: 'outline',
            });
        }
    } catch (e) {
        console.error("Failed to load state from localStorage", e);
        // Handle potential corruption by starting fresh
        const { docs: defaultDocs, ui: defaultUi } = migrateV1ToV2(null, null);
        setDocuments(defaultDocs);
        setUiState(defaultUi);
    }

    setIsLoaded(true);
  }, []);

  // Effect to handle opening settings dialog from URL param
  useEffect(() => {
    if (!isLoaded) return;
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('settings') === 'true') {
        setIsSettingsOpen(true);
        // Clean up URL
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
    }
  }, [isLoaded]);


  // Save state to local storage whenever it changes
  useEffect(() => {
    if (!isLoaded) return;
    try {
        const docsToSave = documents.map(d => ({...d, docMap: Array.from(d.docMap.entries())}));
        localStorage.setItem(LOCAL_STORAGE_KEY_DOCUMENTS, JSON.stringify(docsToSave));
        localStorage.setItem(LOCAL_STORAGE_KEY_UI_STATE, JSON.stringify(uiState));
    } catch (e) {
        console.error("Failed to save state to localStorage", e);
    }
  }, [documents, uiState, isLoaded]);

  const activeDoc = documents.find(d => d.id === uiState.activeDocumentId);
  const focusedNode = activeDoc?.docMap.get(uiState.focusedNodeId || '');

  const updateActiveDocument = (updater: (doc: DocV2) => DocV2) => {
    setDocuments(docs => docs.map(d => {
        if (d.id === uiState.activeDocumentId) {
            return { ...updater(d), lastModified: Date.now() };
        }
        return d;
    }));
  };
  
  const handleUpdateNode = useCallback((nodeId: string, updates: Partial<DocumentNode>) => {
    updateActiveDocument(doc => {
      const newMap = new Map(doc.docMap);
      const nodeToUpdate = newMap.get(nodeId);
      if (nodeToUpdate) {
        newMap.set(nodeId, { ...nodeToUpdate, ...updates });

        // If root node title is updated, update doc name
        if (nodeId === doc.rootId && updates.title) {
            doc.name = updates.title;
        }
      }
      return { ...doc, docMap: newMap };
    });
  }, [uiState.activeDocumentId]);

  const handleCreateNode = useCallback((newNode: DocumentNode) => {
    updateActiveDocument(doc => {
      const newMap = new Map(doc.docMap);
      newMap.set(newNode.id, newNode);
      
      if (newNode.parentId) {
        const parentNode = newMap.get(newNode.parentId);
        if (parentNode) {
          const updatedParent = {
            ...parentNode,
            childrenIds: [...parentNode.childrenIds, newNode.id],
          };
          newMap.set(newNode.parentId, updatedParent);
        }
      }
       return { ...doc, docMap: newMap };
    });
    setUiState(prevState => ({...prevState, focusedNodeId: newNode.id, expandedNodeIds: [...prevState.expandedNodeIds, newNode.parentId!]}));
  }, [uiState.activeDocumentId]);

  const handleDeleteNode = useCallback((nodeId: string) => {
    let nodeToDeleteTitle = 'Node';
    let parentOfDeleted: string | null = null;

    updateActiveDocument(doc => {
        const newMap = new Map(doc.docMap);
        const nodeToDelete = newMap.get(nodeId);
        if (!nodeToDelete) return doc;

        if (nodeToDelete.id === doc.rootId) {
            toast({ variant: "destructive", title: "Cannot delete root node." });
            return doc;
        }

        parentOfDeleted = nodeToDelete.parentId || doc.rootId;
        nodeToDeleteTitle = nodeToDelete.title;

        const deleteQueue = [nodeId];
        const nodesToDelete = new Set<string>();

        while (deleteQueue.length > 0) {
            const currentId = deleteQueue.shift()!;
            nodesToDelete.add(currentId);
            const node = newMap.get(currentId);
            if (node) {
                deleteQueue.push(...node.childrenIds);
            }
        }
        
        nodesToDelete.forEach(id => newMap.delete(id));

        const parent = newMap.get(nodeToDelete.parentId!);
        if (parent) {
            const updatedParent = {
                ...parent,
                childrenIds: parent.childrenIds.filter(id => id !== nodeId),
            };
            newMap.set(parent.id, updatedParent);
        }

        if (uiState.focusedNodeId && nodesToDelete.has(uiState.focusedNodeId)) {
            setUiState(prevState => ({...prevState, focusedNodeId: parentOfDeleted}));
        }

        return { ...doc, docMap: newMap };
    });

    toast({ title: "Node Deleted", description: `"${nodeToDeleteTitle}" and its children have been deleted.` });
  }, [uiState.focusedNodeId, toast]);

  const handleMoveNode = useCallback((nodeId: string, direction: 'up' | 'down' | 'left' | 'right') => {
     updateActiveDocument(doc => {
        const newMap = new Map(doc.docMap);
        const node = newMap.get(nodeId);
        if (!node || !node.parentId) return doc;

        const oldParent = newMap.get(node.parentId);
        if (!oldParent) return doc;

        const siblings = [...oldParent.childrenIds];
        const currentIndex = siblings.indexOf(nodeId);

        if (direction === 'up' && currentIndex > 0) {
            [siblings[currentIndex], siblings[currentIndex - 1]] = [siblings[currentIndex - 1], siblings[currentIndex]];
            const updatedParent = { ...oldParent, childrenIds: siblings };
            newMap.set(oldParent.id, updatedParent);
        } else if (direction === 'down' && currentIndex < siblings.length - 1) {
            [siblings[currentIndex], siblings[currentIndex + 1]] = [siblings[currentIndex + 1], siblings[currentIndex]];
            const updatedParent = { ...oldParent, childrenIds: siblings };
            newMap.set(oldParent.id, updatedParent);
        } else if (direction === 'right' && currentIndex > 0) { // Indent
            const newParentId = siblings[currentIndex - 1];
            const newParent = newMap.get(newParentId);
            if (!newParent) return doc;

            const newSiblings = siblings.filter(id => id !== nodeId);
            const updatedOldParent = { ...oldParent, childrenIds: newSiblings };
            newMap.set(oldParent.id, updatedOldParent);

            const updatedNewParent = { ...newParent, childrenIds: [...newParent.childrenIds, nodeId] };
            newMap.set(newParentId, updatedNewParent);

            const updatedNode = { ...node, parentId: newParentId };
            newMap.set(nodeId, updatedNode);
        } else if (direction === 'left' && oldParent.parentId) { // Outdent
            const grandParent = newMap.get(oldParent.parentId);
            if (!grandParent) return doc;

            const parentIndex = grandParent.childrenIds.indexOf(oldParent.id);
            const newGrandParentChildren = [...grandParent.childrenIds];
            newGrandParentChildren.splice(parentIndex + 1, 0, nodeId);
            const updatedGrandParent = { ...grandParent, childrenIds: newGrandParentChildren };
            newMap.set(grandParent.id, updatedGrandParent);

            const updatedNode = { ...node, parentId: grandParent.id };
            newMap.set(nodeId, updatedNode);
        } else {
            return doc; 
        }
        
        return { ...doc, docMap: newMap };
     });
  }, [uiState.activeDocumentId]);

  const handleSelectNode = useCallback((nodeId: string) => {
    setUiState(prevState => ({...prevState, focusedNodeId: nodeId}));
  }, []);

  const handlePreviewNodeSelect = (nodeId: string) => {
    setUiState(prevState => ({
      ...prevState,
      focusedNodeId: nodeId,
      activeTab: 'outline',
    }));
  };
  
  const handleNodeDoubleClick = useCallback((nodeId: string) => {
    setUiState(prevState => ({
        ...prevState,
        focusedNodeId: nodeId,
        activeTab: 'editor',
    }));
  }, []);

  const handleToggleNodeExpansion = (nodeId: string) => {
    setUiState(prevState => {
        const newExpanded = new Set(prevState.expandedNodeIds);
        if (newExpanded.has(nodeId)) {
            newExpanded.delete(nodeId);
        } else {
            newExpanded.add(nodeId);
        }
        return {...prevState, expandedNodeIds: Array.from(newExpanded)};
    });
  };

  const getFullContent = useCallback((nodeId: string, map: DocumentMap, level = 1): string => {
    const node = map.get(nodeId);
    if (!node) return '';
    
    let content = `${node.content}\n\n`; // We removed auto-titling
    for (const childId of node.childrenIds) {
      content += getFullContent(childId, map, level + 1);
    }
    return content;
  }, []);
  
  const getPreviewContent = useCallback((nodeId: string, map: DocumentMap, level = 1): PreviewContent[] => {
    const node = map.get(nodeId);
    if (!node) return [];
    
    let content: PreviewContent[] = [{ nodeId: node.id, text: node.content }];
    
    for (const childId of node.childrenIds) {
      content = content.concat(getPreviewContent(childId, map, level + 1));
    }
    return content;
  }, []);

  const generateOutline = (nodeId: string, map: DocumentMap, level = 0): string => {
    const node = map.get(nodeId);
    if (!node) return '';

    let outline = `${'  '.repeat(level)}- ${node.title} (id: ${node.id})\n`;
    for (const childId of node.childrenIds) {
        outline += generateOutline(childId, map, level + 1);
    }
    return outline;
  };
  
  const handleCreateNewDocument = () => {
    const now = Date.now();
    const newDocId = `doc-${now}`;
    const rootId = `node-${now}`;
    const newDoc: DocV2 = {
        id: newDocId,
        name: 'Untitled Document',
        rootId: rootId,
        lastModified: now,
        docMap: new Map([
            [rootId, {
                id: rootId,
                title: 'Untitled Document',
                content: 'Untitled Document',
                childrenIds: [],
                parentId: null,
            }]
        ])
    };
    setDocuments(docs => [...docs, newDoc].sort((a,b) => b.lastModified - a.lastModified));
    setUiState(prevState => ({
        ...prevState,
        activeDocumentId: newDocId,
        focusedNodeId: rootId,
        expandedNodeIds: [rootId],
    }));
    toast({ title: 'New document created!' });
  };

  const handleDeleteCurrentDocument = () => {
    if (!activeDoc) return;
    const docIdToDelete = activeDoc.id;
    
    setDocuments(docs => docs.filter(d => d.id !== docIdToDelete));
    
    setUiState(prevState => {
        const remainingDocs = documents.filter(d => d.id !== docIdToDelete);
        if (remainingDocs.length > 0) {
              const newActiveDoc = remainingDocs.sort((a,b) => b.lastModified - a.lastModified)[0];
              return {
                ...prevState,
                activeDocumentId: newActiveDoc.id,
                focusedNodeId: newActiveDoc.rootId,
                expandedNodeIds: [newActiveDoc.rootId],
            };
        } else {
            // This will be caught by the "no active doc" block below and prompt creation
            return {
                ...prevState,
                activeDocumentId: null,
                focusedNodeId: null,
                expandedNodeIds: [],
            };
        }
    });
    toast({ title: "Document deleted." });
    setIsDeleteAlertOpen(false);
  };

  // Effect to create a new document if none exist after deletion or on first load
  useEffect(() => {
    if (isLoaded && documents.length === 0) {
      handleCreateNewDocument();
    }
  }, [documents, isLoaded]);

  const handleSelectDocument = (docId: string) => {
    const newActiveDoc = documents.find(d => d.id === docId);
    if (newActiveDoc) {
        setUiState(prevState => ({
            ...prevState,
            activeDocumentId: docId,
            focusedNodeId: newActiveDoc.rootId,
            expandedNodeIds: [newActiveDoc.rootId],
            activeTab: 'outline' // Reset to outline on doc switch
        }));
    }
  };

  const previewContent = activeDoc ? getPreviewContent(activeDoc.rootId, activeDoc.docMap) : [];
  const documentOutline = activeDoc ? generateOutline(activeDoc.rootId, activeDoc.docMap) : '';

  const handleExport = () => {
    if (!activeDoc) return;
    const fullText = getFullContent(activeDoc.rootId, activeDoc.docMap);
    const blob = new Blob([fullText], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeDoc.name.replace(/ /g, '_') || 'document'}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const handleExportTree = () => {
    if (!activeDoc) return;
    const docData = {
      ...activeDoc,
      docMap: Array.from(activeDoc.docMap.entries()),
    };
    const jsonString = JSON.stringify(docData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `treetext-${activeDoc.name.replace(/ /g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const handleImportTree = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') throw new Error('File content is not a string.');
        
        const importedData = JSON.parse(text);
        
        // Basic validation of the imported structure
        if (importedData.id && importedData.name && importedData.rootId && Array.isArray(importedData.docMap)) {
            const newDoc: DocV2 = {
                ...importedData,
                docMap: new Map(importedData.docMap),
                lastModified: Date.now(),
            };

            const docExists = documents.some(d => d.id === newDoc.id);
            if (docExists) {
                // If it exists, update it.
                setDocuments(docs => docs.map(d => d.id === newDoc.id ? newDoc : d));
            } else {
                 // Otherwise, add it to the list.
                 setDocuments(docs => [...docs, newDoc].sort((a,b) => b.lastModified - a.lastModified));
            }
            
            handleSelectDocument(newDoc.id);
            toast({ title: "Import Successful", description: `Document "${newDoc.name}" has been loaded.` });
        } else {
            throw new Error('Invalid document file format.');
        }

      } catch (error) {
        console.error("Failed to import tree:", error);
        toast({ variant: "destructive", title: "Import Failed", description: error instanceof Error ? error.message : "The selected file is not a valid document." });
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };
  
 const handleBatchImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !activeDoc) return;
    
    const parentId = uiState.focusedNodeId;
    if (!parentId) {
        toast({ variant: "destructive", title: "No Node Selected", description: "Please select a node to add files to." });
        return;
    }

    const readFile = (file: File): Promise<{ name: string; content: string }> =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target?.result;
          if (typeof text === 'string') {
            resolve({ name: file.name, content: text });
          } else {
            reject(new Error(`Could not read file: ${file.name}`));
          }
        };
        reader.onerror = () => reject(new Error(`Error reading file: ${file.name}`));
        reader.readAsText(file);
      });

    try {
      const fileContents = await Promise.all(Array.from(files).map(readFile));
      
      updateActiveDocument(doc => {
        const newMap = new Map(doc.docMap);
        const parentNode = newMap.get(parentId);
        if (!parentNode) {
            toast({ variant: "destructive", title: "Error", description: "Could not find the selected parent node." });
            return doc;
        }

        const newChildrenIds: string[] = [];
        fileContents.forEach((file, index) => {
            const nodeId = `node-${Date.now()}-${index}`;
            const newNode: DocumentNode = {
              id: nodeId,
              title: file.name.replace(/\.[^/.]+$/, ""),
              content: file.content,
              childrenIds: [],
              parentId: parentId,
            };
            newMap.set(nodeId, newNode);
            newChildrenIds.push(nodeId);
        });

        const updatedParent = {
            ...parentNode,
            childrenIds: [...parentNode.childrenIds, ...newChildrenIds],
        };
        newMap.set(parentId, updatedParent);
        
        return {...doc, docMap: newMap};
      });
      
      toast({ title: "Batch Import Successful", description: `${fileContents.length} files have been added under "${activeDoc.docMap.get(parentId)?.title || 'the current node'}".` });

    } catch (error) {
       const desc = error instanceof Error ? error.message : "An unknown error occurred.";
       toast({ variant: "destructive", title: "Import Failed", description: desc });
    } finally {
        event.target.value = '';
    }
  };

  const handleRename = () => {
    if (!renamingNode || !newTitle) return;
    handleUpdateNode(renamingNode.id, { title: newTitle });
    toast({ title: "Node renamed", description: `"${renamingNode.title}" is now "${newTitle}".` });
    setRenamingNode(null);
    setNewTitle('');
  };

  // Effect to set initial title in rename dialog
  useEffect(() => {
    if (renamingNode) {
      setNewTitle(renamingNode.title);
    }
  }, [renamingNode]);


  if (!isLoaded) {
     return (
        <div className="flex h-screen w-screen items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
        <Header 
          documents={documents}
          activeDocumentId={uiState.activeDocumentId}
          activeDocumentName={activeDoc?.name || null}
          onSelectDocument={handleSelectDocument}
          onCreateNewDocument={handleCreateNewDocument}
          onDeleteCurrentDocument={() => setIsDeleteAlertOpen(true)}
          onExport={handleExport} 
          onExportTree={handleExportTree} 
          onImportTree={handleImportTree} 
          onBatchImport={handleBatchImport}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
        
        <main className="flex-1 flex min-h-0">
          <Tabs value={uiState.activeTab} onValueChange={(t) => setUiState(s => ({...s, activeTab: t}))} className="h-full flex flex-col flex-1 min-w-0">
              <div className="p-2 border-b">
                <TabsList>
                  <TabsTrigger value="outline">Outline</TabsTrigger>
                  <TabsTrigger value="editor">Editor</TabsTrigger>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                </TabsList>
              </div>

              {!activeDoc ? (
                 <div className="flex-1 flex h-full items-center justify-center text-muted-foreground">
                    <p>No document selected. Create or select one to begin.</p>
                </div>
              ) : (
                <>
                    <TabsContent value="outline" className="flex-1 min-h-0">
                        <Card className="h-full border-0 shadow-none rounded-none">
                            <CardContent className="p-0 h-full">
                            <OutlinePanel
                                    docMap={activeDoc.docMap}
                                    rootId={activeDoc.rootId}
                                    focusedNodeId={uiState.focusedNodeId}
                                    expandedNodeIds={uiState.expandedNodeIds}
                                    onSelectNode={handleSelectNode}
                                    onCreateNode={handleCreateNode}
                                    onDeleteNode={handleDeleteNode}
                                    onMoveNode={handleMoveNode}
                                    onToggleNodeExpansion={handleToggleNodeExpansion}
                                    onNodeDoubleClick={handleNodeDoubleClick}
                                    onRenameNode={setRenamingNode}
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="editor" className="flex-1 min-h-0">
                        {focusedNode ? (
                            <EditorPanel
                                key={focusedNode.id}
                                node={focusedNode}
                                onUpdateNode={handleUpdateNode}
                                onRenameNode={setRenamingNode}
                                documentOutline={documentOutline}
                            />
                            ) : (
                                <div className="flex-1 flex h-full items-center justify-center text-muted-foreground">
                                    <p>Select a node from the outline to start editing.</p>
                                </div>
                            )}
                    </TabsContent>
                    <TabsContent value="preview" className="flex-1 min-h-0">
                       <PreviewPanel 
                        key={uiState.activeDocumentId}
                        content={previewContent} 
                        onExport={handleExport} 
                        onNodeSelect={handlePreviewNodeSelect}
                       />
                    </TabsContent>
                </>
              )}
          </Tabs>
      </main>
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Delete "{activeDoc?.name}"?</AlertDialogTitle>
                  <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the current document and all its content.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                      onClick={handleDeleteCurrentDocument}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                      Delete
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
      <Dialog open={!!renamingNode} onOpenChange={() => setRenamingNode(null)}>
        <DialogContent onKeyDown={(e) => {if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleRename(); }}}>
          <DialogHeader><DialogTitle>Rename Node</DialogTitle></DialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="newTitle">New title:</Label>
            <Input id="newTitle" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenamingNode(null)}>Cancel</Button>
            <Button onClick={handleRename}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <SettingsDialog isOpen={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
    </div>
  );
}
