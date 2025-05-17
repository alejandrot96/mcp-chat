import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { User } from "lucide-react";
import { MemoizedMarkdown } from "./memoized-markdown";
import Image from "next/image";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Commit } from "@/services/gitchat/client";
import { Message } from "ai";

// Utility function to clean up tool results by removing excessive newlines
function cleanToolResult(result: unknown): string {
  if (typeof result === 'string') {
    // Replace multiple consecutive newlines with a single one
    return result.replace(/\n{3,}/g, '\n\n');
  }
  return JSON.stringify(result, null, 2);
}

export function ChatMessage({
  commit,
  messageProp,
}: {
  commit: Commit;
  messageProp?: Message;
}) {
  const message = messageProp || commit.metadata.message;
  const isUser = message.role === "user";

  // Convert message parts to our MessagePart type
  const messageParts =
    message.parts?.map((part) => ({
      type: part.type,
      text: part.type === "text" ? part.text : undefined,
      toolInvocation:
        part.type === "tool-invocation"
          ? {
              toolName: part.toolInvocation.toolName,
              state: part.toolInvocation.state,
              args: part.toolInvocation.args,
              result:
                part.toolInvocation.state === "result"
                  ? part.toolInvocation.result
                  : undefined,
            }
          : undefined,
    })) || [];

  return (
    <div className={cn("flex items-start gap-3", isUser && "flex-row-reverse")}>
      <Avatar
        className={cn(
          "h-10 w-10 mt-0.5 flex items-center justify-center shadow-xl",
          isUser ? "bg-primary" : "dark:bg-muted bg-white"
        )}
      >
        {isUser ? (
          <User className="h-6 w-6 text-primary-foreground" />
        ) : (<>
          <Image
            src="/ai.dark.svg"
            width={32}
            height={32}
            className="h-8 w-8 dark:block hidden"
            alt="AI icon dark"
          />
          <Image
            src="/ai.light.svg"
            width={32}
            height={32}
            className="h-8 w-8 dark:hidden block"
            alt="AI icon light"
          />
          </>
        )}
      </Avatar>

      <div
        className={cn(
          "flex flex-col max-w-[80%] rounded-lg p-4",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted"
        )}
      >
        {/* Token counter removed from individual messages */}
        {isUser ? (
          <div className="whitespace-pre-wrap font-sans">{message.content}</div>
        ) : (
          messageParts.map((part, index) => {
            if (part.type === "tool-invocation" && part.toolInvocation) {
              const hasIframe = part.toolInvocation.args?.hasIframe;
              const toolDisplayName = part.toolInvocation.toolName
                .split("_")
                .pop();
              return (
                <Sheet key={index}>
                  <SheetTrigger asChild>
                    <div className="my-3 flex justify-between items-center w-full px-4 py-2 rounded-lg bg-black/80 border border-white/30 cursor-pointer hover:bg-black/70">
                      <span
                        className={cn(
                          "font-bold text-white",
                          part.toolInvocation.state !== "result" &&
                            "gradient-background-loading"
                        )}
                      >
                        {toolDisplayName}{" "}
                        {hasIframe ? " (computer use agent)" : ""}
                      </span>
                    </div>
                  </SheetTrigger>
                  <SheetContent
                    side="right"
                    className="bg-background text-foreground border-l"
                  >
                    <SheetHeader className="mb-4">
                      <SheetTitle className="text-foreground">
                        Tool: {toolDisplayName}
                      </SheetTitle>
                    </SheetHeader>
                    <ScrollArea className="h-[calc(100vh-100px)]">
                      <div className="p-4 rounded-b-lg overflow-x-auto">
                        <div className="text-sm mb-4">
                          <span className="font-semibold block mb-1">
                            Arguments:
                          </span>
                          {part.toolInvocation.args &&
                          Object.entries(part.toolInvocation.args).length >
                            0 ? (
                            Object.entries(part.toolInvocation.args).map(
                              ([key, value]) => (
                                <div key={key} className="ml-2 mb-1">
                                  <span className="font-medium">{key}:</span>{" "}
                                  <pre className="inline-block bg-muted p-1 rounded text-xs whitespace-pre-wrap text-muted-foreground overflow-x-auto max-w-full">
                                    {JSON.stringify(value, null, 2)}
                                  </pre>
                                </div>
                              )
                            )
                          ) : (
                            <span className="ml-2 italic">No arguments</span>
                          )}
                        </div>
                        <div className="text-sm">
                          {part.toolInvocation.state === "result" && (
                            <div className="flex flex-col gap-2">
                              <span className="font-semibold block mb-1">
                                Result:
                              </span>
                              {part.toolInvocation.result ? (
                                <>
                                  {part.toolInvocation.toolName ===
                                    "screenshot" ||
                                  part.toolInvocation.toolName ===
                                    "stagehand_act" ? (
                                    <div className="mt-1 ml-2">
                                      <Image
                                        src={`data:image/png;base64,${part.toolInvocation.result}`}
                                        alt="Screenshot Result"
                                        width={400}
                                        height={400}
                                        className="max-w-full rounded-lg border"
                                      />
                                    </div>
                                  ) : (
                                    <pre className="ml-2 bg-muted p-2 rounded text-muted-foreground overflow-x-auto text-xs whitespace-pre-wrap max-w-full">
                                      {cleanToolResult(part.toolInvocation.result)}
                                    </pre>
                                  )}
                                </>
                              ) : (
                                <span className="ml-2 italic">
                                  No result data
                                </span>
                              )}
                            </div>
                          )}
                          {part.toolInvocation.state !== "result" && (
                            <span className="ml-2 italic">
                              Awaiting result...
                            </span>
                          )}
                        </div>
                      </div>
                    </ScrollArea>
                  </SheetContent>
                </Sheet>
              );
            } else if (part.type === "text" && part.text) {
              const textContent =
                typeof part.text === "string"
                  ? part.text
                  : JSON.stringify(part.text, null, 2);
              return (
                <div
                  key={index}
                  className="prose prose-invert max-w-none space-y-2 px-4 overflow-x-auto"
                >
                  <MemoizedMarkdown id={message.id} content={textContent} />
                </div>
              );
            }
            return null;
          })
        )}
      </div>
    </div>
  );
}
