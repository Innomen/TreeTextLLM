
import { FilePen, Settings, Download, Upload, Share2, Library, FilePlus, Trash2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DocV2 } from './main-layout';
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "@/components/ui/menubar"


interface HeaderProps {
  documents: DocV2[];
  activeDocumentId: string | null;
  activeDocumentName: string | null;
  onSelectDocument: (docId: string) => void;
  onCreateNewDocument: () => void;
  onDeleteCurrentDocument: () => void;
  onExport: () => void;
  onExportTree: () => void;
  onImportTree: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onBatchImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenSettings: () => void;
}

export function Header({ 
  documents,
  activeDocumentId,
  activeDocumentName,
  onSelectDocument,
  onCreateNewDocument,
  onDeleteCurrentDocument,
  onExport, 
  onExportTree, 
  onImportTree, 
  onBatchImport,
  onOpenSettings
}: HeaderProps) {

  const handleImportClick = () => {
    document.getElementById('import-tree-input')?.click();
  };

  const handleBatchImportClick = () => {
    document.getElementById('batch-import-input')?.click();
  };

  return (
    <>
      <header className="flex items-center justify-between px-4 py-2 border-b shrink-0 z-20">
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2">
                <FilePen className="w-6 h-6 text-primary" />
                <h1 className="text-xl font-bold font-headline text-foreground">
                    TreeTextLLM
                </h1>
           </div>
            <Menubar className="border-0 shadow-none">
              <MenubarMenu>
                <MenubarTrigger>File</MenubarTrigger>
                <MenubarContent>
                   <MenubarItem onClick={onCreateNewDocument}>
                    <FilePlus className="mr-2 h-4 w-4" /> New Document
                  </MenubarItem>
                  <MenubarSub>
                    <MenubarSubTrigger>Switch Document</MenubarSubTrigger>
                    <MenubarSubContent>
                      {documents.map(doc => (
                        <MenubarItem key={doc.id} onClick={() => onSelectDocument(doc.id)}>
                          {doc.id === activeDocumentId && <Check className="mr-2 h-4 w-4" />}
                          {doc.id !== activeDocumentId && <span className="w-6 mr-2 h-4" />}
                          {doc.name}
                        </MenubarItem>
                      ))}
                    </MenubarSubContent>
                  </MenubarSub>
                  <MenubarSeparator />
                  <MenubarItem onClick={handleBatchImportClick}>
                    <Library className="mr-2 h-4 w-4" /> Batch Import Files...
                  </MenubarItem>
                  <MenubarItem onClick={handleImportClick}>
                    <Upload className="mr-2 h-4 w-4" /> Import Document...
                  </MenubarItem>
                   <MenubarSeparator />
                  <MenubarItem onClick={onExportTree}>
                     <Share2 className="mr-2 h-4 w-4" /> Export Document (JSON)...
                  </MenubarItem>
                  <MenubarItem onClick={onExport}>
                    <Download className="mr-2 h-4 w-4" /> Export as Markdown...
                  </MenubarItem>
                  <MenubarSeparator />
                   <MenubarItem onClick={onDeleteCurrentDocument} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete Current Document...
                  </MenubarItem>
                </MenubarContent>
              </MenubarMenu>
            </Menubar>
        </div>
        <div className="flex items-center gap-4">
          {activeDocumentName && <div className="text-sm text-muted-foreground truncate">Editing: <span className="text-foreground font-medium">{activeDocumentName}</span></div>}
           <Button variant="ghost" size="icon" onClick={onOpenSettings} className="h-8 w-8">
              <Settings />
              <span className="sr-only">Settings</span>
            </Button>
          <input
            type="file"
            id="import-tree-input"
            className="hidden"
            accept=".json"
            onChange={onImportTree}
          />
           <input
            type="file"
            id="batch-import-input"
            className="hidden"
            accept=".md,.txt,text/markdown,text/plain"
            multiple
            onChange={onBatchImport}
          />
        </div>
      </header>
    </>
  );
}
