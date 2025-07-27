import type { DocumentNode, DocumentMap } from '@/lib/types';

const initialNodes: DocumentNode[] = [
  { 
    id: 'root', 
    title: 'My Document', 
    content: 'My Document',
    childrenIds: ['child1'], 
    parentId: null 
  },
  { 
    id: 'child1', 
    title: 'Chapter 1', 
    content: 'Chapter 1', 
    childrenIds: [], 
    parentId: 'root' 
  },
];

export const initialDocumentMap: DocumentMap = new Map(initialNodes.map(node => [node.id, node]));
export const rootNodeId = 'root';
