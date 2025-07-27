
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import type { DocumentNode } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from "@/hooks/use-toast";
import { Save, Sparkles, Loader2 } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { cn } from '@/lib/utils';
import { Textarea } from './ui/textarea';

interface EditorPanelProps {
  node: DocumentNode;
  onUpdateNode: (nodeId: string, updates: Partial<DocumentNode>) => void;
  onRenameNode: (node: DocumentNode) => void;
  documentOutline: string;
}

const DiffView = ({ original, modified }: { original: string; modified: string }) => {
  const originalLines = original.split('\n');
  const modifiedLines = modified.split('\n');
  const numLines = Math.max(originalLines.length, modifiedLines.length);

  const lines = [];
  for (let i = 0; i < numLines; i++) {
    const originalLine = originalLines[i];
    const modifiedLine = modifiedLines[i];
    const isAdded = originalLine === undefined && modifiedLine !== undefined;
    const isRemoved = originalLine !== undefined && modifiedLine === undefined;
    const isDifferent = originalLine !== modifiedLine && !isAdded && !isRemoved;

    lines.push({
      original: {
        text: originalLine ?? '',
        isRemoved: isRemoved || isDifferent,
      },
      modified: {
        text: modifiedLine ?? '',
        isAdded: isAdded || isDifferent,
      },
    });
  }

  return (
    <div className="grid grid-cols-2 gap-4 font-code text-sm">
      <ScrollArea className="h-full rounded-md border bg-muted/20 p-2">
        <pre>
          {lines.map((line, index) => (
            <div
              key={`orig-${index}`}
              className={cn(
                "w-full block",
                line.original.isRemoved ? 'bg-red-500/20' : 'bg-transparent',
              )}
            >
              <span className="inline-block w-8 text-right pr-4 text-muted-foreground select-none">{index + 1}</span>
              <span>{line.original.text}</span>
            </div>
          ))}
        </pre>
      </ScrollArea>
      <ScrollArea className="h-full rounded-md border p-2">
        <pre>
          {lines.map((line, index) => (
            <div
              key={`mod-${index}`}
              className={cn(
                "w-full block",
                line.modified.isAdded ? 'bg-green-500/20' : 'bg-transparent',
              )}
            >
              <span className="inline-block w-8 text-right pr-4 text-muted-foreground select-none">{index + 1}</span>
              <span>{line.modified.text}</span>
            </div>
          ))}
        </pre>
      </ScrollArea>
    </div>
  );
};


export function EditorPanel({ node, onUpdateNode, onRenameNode, documentOutline }: EditorPanelProps) {
  const [currentContent, setCurrentContent] = useState(node.content);
  const [proposedContent, setProposedContent] = useState('');
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'editor' | 'diff'>('editor');
  
  const { toast } = useToast();
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setCurrentContent(node.content);
    setProposedContent('');
    setPrompt('');
    setViewMode('editor');
  }, [node.id]);

  useEffect(() => {
    if (viewMode === 'editor') {
        if (debounceTimeout.current) {
            clearTimeout(debounceTimeout.current);
        }
        debounceTimeout.current = setTimeout(() => {
            if (currentContent !== node.content) {
                onUpdateNode(node.id, { content: currentContent });
            }
        }, 500); // 500ms debounce delay
    }
    return () => {
        if (debounceTimeout.current) {
            clearTimeout(debounceTimeout.current);
        }
    };
  }, [currentContent, node.id, node.content, onUpdateNode, viewMode]);

  const handlePromptChange = async () => {
    if (!prompt) {
      toast({
        variant: "destructive",
        title: "Missing Prompt",
        description: "Please enter a prompt to transform the text.",
      });
      return;
    }
    setIsLoading(true);
    try {
      const savedSettings = localStorage.getItem('treetextllm_settings');
      const settings = savedSettings ? JSON.parse(savedSettings) : {};
      const { systemPrompt, openAIBaseUrl } = settings;

       if (!openAIBaseUrl) {
        toast({
          variant: "destructive",
          title: "Missing LLM URL",
          description: "Please set the Local LLM URL in the settings.",
        });
        setIsLoading(false);
        return;
      }

      let userMessage = `A user has provided text from a document node and a prompt. Modify the text based on the user's prompt, keeping the overall document structure and context in mind.

User Prompt: ${prompt}
Original Text (from node with ID: ${node.id}):
---
${currentContent}
---

Return a JSON object with a single key "suggestion" containing only the modified text.`;
       
      if (documentOutline) {
        userMessage = `You are editing a node within a larger document. Use the following document outline to understand the context of the node you are modifying. The user is currently focused on the node with ID: ${node.id}.

Document Outline:
---
${documentOutline}
---

${userMessage}`;
      }
      
      const response = await fetch('/api/local-llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: openAIBaseUrl,
          payload: {
            messages: [
              { role: 'system', content: systemPrompt || 'You are an expert writing assistant that only returns JSON.' },
              { role: 'user', content: userMessage },
            ],
            response_format: { type: "json_object" },
          }
        })
      });
      
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'An unknown error occurred.');
      }
      
      const suggestion = result.choices[0]?.message?.content?.trim() ?? '';
      
      try {
          const parsedSuggestion = JSON.parse(suggestion);
          if (parsedSuggestion.suggestion && typeof parsedSuggestion.suggestion === 'string') {
              setProposedContent(parsedSuggestion.suggestion);
          } else {
             setProposedContent(suggestion);
          }
      } catch (e) {
          console.warn("LLM did not return valid JSON for suggestion, using raw output.");
          setProposedContent(suggestion);
      }

      setViewMode('diff');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      console.error("Failed to apply prompt:", error);
      toast({ variant: "destructive", title: "Error", description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleAcceptChanges = () => {
    onUpdateNode(node.id, { content: proposedContent });
    toast({ title: "Node Updated!", description: `The content of "${node.title}" has been updated with the AI suggestion.` });
    setViewMode('editor');
    setCurrentContent(proposedContent);
    setProposedContent('');
  }

  const handleTitleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onRenameNode(node);
  };

  return (
    <section className="flex-1 p-4 flex flex-col gap-4 h-full">
      <Card className="flex-1 flex flex-col">
        <CardHeader>
          <CardTitle 
            className="font-headline text-2xl rounded-md -m-2 p-2 hover:bg-muted cursor-pointer"
            onDoubleClick={handleTitleDoubleClick}
          >
            {node.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col gap-2">
            {viewMode === 'editor' && (
              <>
                <Label htmlFor="main-editor">Node Content (auto-saving)</Label>
                <Textarea
                  id="main-editor"
                  value={currentContent}
                  onChange={(e) => setCurrentContent(e.target.value)}
                  placeholder={node.title}
                  className="flex-1 resize-none text-base leading-7 font-body bg-muted/20"
                />
              </>
            )}
            {viewMode === 'diff' && (
               <>
                <div className="grid grid-cols-2 gap-4">
                  <Label>Here's what you had</Label>
                  <Label>Here's what I suggest</Label>
                </div>
                <div className="flex-1 relative">
                  <DiffView original={currentContent} modified={proposedContent} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <Button variant="outline" onClick={() => { setViewMode('editor'); setProposedContent(''); }} size="sm">
                    Discard and Go Back
                  </Button>
                   <Button onClick={handleAcceptChanges} size="sm">
                    <Save className="mr-2"/>
                    Accept and Save
                  </Button>
                </div>
              </>
            )}
        </CardContent>
      </Card>
      <div className="flex items-center gap-2">
        <Input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter a prompt to transform your text (e.g., 'make it more formal', 'summarize this')"
          className="flex-1"
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) handlePromptChange(); }}
        />
        <Button onClick={handlePromptChange} disabled={isLoading}>
          {isLoading ? <Loader2 className="animate-spin" /> : <Sparkles />}
          <span className="ml-2">Prompt</span>
        </Button>
      </div>
    </section>
  );
}
