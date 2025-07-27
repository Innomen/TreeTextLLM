
"use client";

import { useRef, useLayoutEffect } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export interface PreviewContent {
  nodeId: string;
  text: string;
}

interface PreviewPanelProps {
  content: PreviewContent[];
  onExport: () => void;
  onNodeSelect: (nodeId: string) => void;
}

const renderContent = (content: PreviewContent[], onNodeSelect: (nodeId: string) => void) => {
  return content.map((item, itemIndex) => (
    <div
      key={`${item.nodeId}-${itemIndex}`}
      data-node-id={item.nodeId}
      onClick={() => onNodeSelect(item.nodeId)}
      className="cursor-pointer hover:bg-primary/10 p-2 -m-2 rounded-md"
    >
      {item.text.split('\n').map((line, lineIndex) => {
        const uniqueKey = `${item.nodeId}-${itemIndex}-${lineIndex}`;
        if (line.startsWith('# ')) {
          return <h1 key={uniqueKey} className="text-2xl font-bold mt-6 mb-2 font-headline">{line.substring(2)}</h1>;
        }
        if (line.startsWith('## ')) {
          return <h2 key={uniqueKey} className="text-xl font-bold mt-4 mb-2 font-headline">{line.substring(3)}</h2>;
        }
        if (line.startsWith('### ')) {
          return <h3 key={uniqueKey} className="text-lg font-bold mt-4 mb-2 font-headline">{line.substring(4)}</h3>;
        }
        if (line.startsWith('- ')) {
          return <li key={uniqueKey} className="ml-4 list-disc">{line.substring(2)}</li>;
        }
        if (line.match(/^\d+\. /)) {
          return <li key={uniqueKey} className="ml-4 list-decimal" value={parseInt(line)}>{line.substring(line.indexOf(' ') + 1)}</li>;
        }
        if (line.trim() === '') {
            return <br key={uniqueKey} />;
        }
        const parts = line.split(/(\*\*.*?\*\*|\*.*?\*)/g);
        return <p key={uniqueKey} className="leading-7 my-2">{parts.map((part, i) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={i}>{part.slice(2, -2)}</strong>;
          }
          if (part.startsWith('*') && part.endsWith('*')) {
            return <em key={i}>{part.slice(1, -1)}</em>;
          }
          return part;
        })}</p>;
      })}
    </div>
  ));
};


export function PreviewPanel({ content, onExport, onNodeSelect }: PreviewPanelProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Store scroll position on unmount
  useLayoutEffect(() => {
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea) return;
    const handleScroll = () => {
      sessionStorage.setItem('previewScrollTop', scrollArea.scrollTop.toString());
    };
    scrollArea.addEventListener('scroll', handleScroll);
    return () => scrollArea.removeEventListener('scroll', handleScroll);
  }, []);

  // Restore scroll position on mount
  useLayoutEffect(() => {
    const savedScrollTop = sessionStorage.getItem('previewScrollTop');
    if (savedScrollTop && scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = parseInt(savedScrollTop, 10);
    }
  }, []);


  return (
    <aside className="h-full p-2">
      <Card className="w-full h-full flex flex-col">
        <CardContent className="flex-1 min-h-0 p-6">
          <ScrollArea className="h-full" viewportRef={scrollAreaRef}>
            <div className="prose prose-sm dark:prose-invert max-w-none pr-4">
              <div>{renderContent(content, onNodeSelect)}</div>
            </div>
          </ScrollArea>
        </CardContent>
         <CardFooter className="justify-center p-4 border-t">
          <Button onClick={onExport} size="lg">
            <Download className="mr-2" />
            Export Full Document to Markdown
          </Button>
        </CardFooter>
      </Card>
    </aside>
  );
}
