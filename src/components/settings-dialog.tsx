
"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from '@/components/ui/textarea';
import { useToast } from "@/hooks/use-toast";
import { Save, Loader2, Trash2, Sun, Moon, Sparkles as ThemeSparkles, Monitor, RefreshCw } from 'lucide-react';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { useTheme } from "next-themes";
import { cn } from '@/lib/utils';


interface SettingsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const LOCAL_STORAGE_KEY_SETTINGS = 'treetextllm_settings';

const DEFAULT_SYSTEM_PROMPT = `You are a writing assistant. A user will provide you with text, a prompt, and the document's outline for context. Modify the text based on the user's prompt. Return only the modified text.`;

export function SettingsDialog({ isOpen, onOpenChange }: SettingsDialogProps) {
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [openAIBaseUrl, setOpenAIBaseUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (isOpen) {
      const savedSettings = localStorage.getItem(LOCAL_STORAGE_KEY_SETTINGS);
      if (savedSettings) {
        const { systemPrompt, openAIBaseUrl } = JSON.parse(savedSettings);
        if (systemPrompt) setSystemPrompt(systemPrompt);
        if (openAIBaseUrl) setOpenAIBaseUrl(openAIBaseUrl);
      } else {
        setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
      }
    }
  }, [isOpen]);

  const handleSave = () => {
    setIsSaving(true);
    const settingsToSave = {
      systemPrompt,
      openAIBaseUrl,
    };
    localStorage.setItem(LOCAL_STORAGE_KEY_SETTINGS, JSON.stringify(settingsToSave));
    
    setTimeout(() => {
      setIsSaving(false);
      toast({
        title: "Settings Saved",
        description: "Your settings have been saved to your browser's local storage.",
      });
      onOpenChange(false);
    }, 500);
  };

  const handleApplyTheme = () => {
    // Save current settings first
    const settingsToSave = {
      systemPrompt,
      openAIBaseUrl,
    };
    localStorage.setItem(LOCAL_STORAGE_KEY_SETTINGS, JSON.stringify(settingsToSave));

    // Add query param to re-open settings dialog after reload
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('settings', 'true');
    window.history.pushState({}, '', currentUrl);

    // Reload the page to apply the theme
    window.location.reload();
  };
  
  const handleReset = () => {
    setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
  }

  const handleDeleteData = () => {
    // This is more robust now with multi-document support
    localStorage.removeItem('treetextllm_documents_v2');
    localStorage.removeItem('treetextllm_ui_state_v2');
    toast({
      title: "Local Data Deleted",
      description: "All documents have been cleared. The page will now reload.",
    });
    setTimeout(() => {
        window.location.reload();
    }, 1500);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[625px] flex flex-col h-full max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Configure the behavior of the AI assistant and manage application data.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-4 py-4 min-h-0">
          <ScrollArea className="flex-1 pr-6 -mr-6">
            <div className="grid gap-6">
                 <div className="grid gap-4">
                    <h3 className="text-lg font-medium">Appearance</h3>
                     <div className="grid gap-2">
                       <Label>Theme</Label>
                       <div className="flex items-center gap-2 flex-wrap">
                          <Button variant="outline" size="sm" onClick={() => setTheme('light')} className={cn(theme === 'light' && 'border-primary')}>
                              <Sun className="mr-2 h-4 w-4" /> Light
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setTheme('dark')} className={cn(theme === 'dark' && 'border-primary')}>
                              <Moon className="mr-2 h-4 w-4" /> Night
                          </Button>
                           <Button variant="outline" size="sm" onClick={() => setTheme('warm')} className={cn(theme === 'warm' && 'border-primary')}>
                              <ThemeSparkles className="mr-2 h-4 w-4" /> Warm
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setTheme('retro')} className={cn(theme === 'retro' && 'border-primary')}>
                              <Monitor className="mr-2 h-4 w-4" /> Retro
                          </Button>
                          <Button size="sm" onClick={handleApplyTheme}>
                             <RefreshCw className="mr-2 h-4 w-4"/>
                             Apply & Reload
                          </Button>
                       </div>
                     </div>
                </div>

                <Separator />

                <div className="grid gap-4">
                  <h3 className="text-lg font-medium">LLM Settings</h3>
                  <div className="grid gap-2">
                      <Label htmlFor="openai-base-url">
                        Local LLM API Base URL (OpenAI-compatible)
                      </Label>
                      <Input
                        id="openai-base-url"
                        placeholder="e.g., http://localhost:8080/v1"
                        value={openAIBaseUrl}
                        onChange={(e) => setOpenAIBaseUrl(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        For tools like Llama.cpp, LM Studio, or KoboldAI.
                      </p>
                    </div>
                    <div className="grid gap-2">
                      <div className="flex items-center justify-between">
                          <Label htmlFor="system-prompt">System Prompt</Label>
                          <Button variant="link" size="sm" onClick={handleReset} className="p-0 h-auto">Reset to Default</Button>
                      </div>
                      <Textarea
                        id="system-prompt"
                        value={systemPrompt}
                        onChange={(e) => setSystemPrompt(e.target.value)}
                        className="h-48 resize-none font-code text-xs"
                      />
                    </div>
                </div>
              </div>
          </ScrollArea>
        
          <Separator />

          <div className="grid gap-4 shrink-0">
              <h3 className="text-lg font-medium">Data Management</h3>
                <div className="flex items-center justify-between rounded-lg border border-destructive/50 p-4">
                    <div>
                      <Label>Clear Local Data</Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        This will permanently delete ALL documents from your browser's storage.
                      </p>
                    </div>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete All Documents
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete all of your documents from this browser's local storage.
                              You should export backups first if you want to save your work.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleDeleteData}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Yes, delete everything
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                </div>
            </div>
          </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
