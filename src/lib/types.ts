
export interface DocumentNode {
  id: string;
  title: string;
  content: string;
  childrenIds: string[];
  parentId: string | null;
}

export type DocumentMap = Map<string, DocumentNode>;

    