/**
 * TODO: another vibe-coded component.
 * I think it's not working properly with nested fields,
 * i.e. z.number().describe("A number").optional() return description
 * but z.number().optional().describe("A number") does not.
 */

import { useEffect } from "react";
import mcpClient from "@/services/mcp/client";
import { errorAtom, reloadToolsAtom } from "@/services/mcp/atoms";
import { isMcpLoadingAtom } from "@/services/mcp/atoms";
import { toolsAtom } from "@/services/mcp/atoms";
import { useAtom, useAtomValue } from "jotai";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ToolsSidebarProps {
  className?: string;
  onClose?: () => void;
  isMobile?: boolean;
}

export function ToolsSidebar({ className, onClose, isMobile = false }: ToolsSidebarProps) {
  const tools = useAtomValue(toolsAtom);
  const isLoading = useAtomValue(isMcpLoadingAtom);
  const error = useAtomValue(errorAtom);
  const [reloadTools, setReloadTools] = useAtom(reloadToolsAtom);

  useEffect(() => {
    if (reloadTools) {
      mcpClient.getTools();
      setReloadTools(false);
    }
  }, [reloadTools, setReloadTools]);

  return (
    <div className={cn(
      "border-l flex flex-col h-full bg-card dark:bg-card shadow-md",
      isMobile ? "w-full max-w-xs" : "w-64",
      className
    )}>
      <div className="p-4 border-b flex justify-between items-center bg-card dark:bg-card">
        <h2 className="text-lg font-semibold">Available Tools</h2>
        <div className="flex items-center gap-2">
          <a
            className="text-sm text-muted-foreground hover:text-foreground cursor-pointer"
            onClick={async () => {
              mcpClient.deleteTools();
              await fetch("/api/tools", { method: "DELETE" });
              setReloadTools(true);
            }}
          >
            (Reset)
          </a>
          {isMobile && onClose && (
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose} aria-label="Close tools panel">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      <div className="flex-grow overflow-y-auto bg-card dark:bg-card">
        <Accordion type="single" collapsible className="w-full">
          {isLoading ? (
            <div className="p-4 text-sm text-muted-foreground">
              Loading tools...
            </div>
          ) : error ? (
            <div className="p-4 text-sm text-red-500">{error}</div>
          ) : tools && tools.breakdown && Object.keys(tools.breakdown).length > 0 ? (
            Object.entries(tools.breakdown).map(([server, tools]) => (
              <AccordionItem key={server} value={server}>
                <div className="p-4 border-b last:border-b-0 hover:bg-muted dark:hover:bg-muted">
                  <AccordionTrigger>{server}</AccordionTrigger>
                  <AccordionContent>
                    <div className="flex flex-col gap-4">
                      {Object.entries(tools).map(([name, tool]) => (
                        <div key={`${server}-${name}`}>
                          <p className="text-sm font-medium">{name}</p>
                          <p className="text-sm text-muted-foreground">
                            {tool.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </div>
              </AccordionItem>
            ))
          ) : (
            <div className="p-4 text-sm text-muted-foreground">
              No tools available. Configure MCP to add tools.
            </div>
          )}
        </Accordion>
      </div>
    </div>
  );
}
