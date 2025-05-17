/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck - Disable TypeScript checking to bypass complex type issues
"use client";

import type React from "react";
import { useChat } from "@ai-sdk/react";
import Image from "next/image";

// Define UsageMetadata interface for token usage tracking
interface UsageMetadata {
  // AI SDK naming convention
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  // Alternative naming convention
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  input_tokens?: number;
  output_tokens?: number;
}

// Define a more flexible message type
type Message = {
  id?: string;
  role: string;
  content: string;
  usage?: UsageMetadata;
  [key: string]: unknown;
};

import { ChatMessage } from "@/components/message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Send, Square, PanelLeft as PanelLeftIcon, PanelRight as PanelRightIcon, X, Trash2 } from "lucide-react";
import { LoadingMessage } from "@/components/loading-message";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useState, useEffect, useCallback, useRef } from "react";
// ShadCN Sidebar components - Assuming this is the correct path
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useAtom, useAtomValue, useSetAtom } from "jotai/react";
import {
  commitHeadAtom,
  commitsAtom,
  commitThreadAtom,
  currentCommitChildrenAtom,
  currentCommitChildrenIndexMapAtom,
  fullCommitListAtom,
  isLoadingAtom,
  lastUserCommitAtom,
} from "@/services/gitchat/atoms";
import {
  cmdkOpenAtom,
  dialogOpenAtom,
  modelNameAtom,
  pendingMessageConfigAtom,
} from "@/services/commands/atoms";
import { Export } from "@/components/export";
import { Badge } from "@/components/ui/badge";
import { CmdK } from "@/components/cmdk";
import gitChat from "@/services/gitchat/client";
import type { GitChat, Commit } from "@/services/gitchat/client";
import { ToolsSidebar } from "@/components/tools-sidebar";
import Keybinding from "@/components/keybinding";
import { cn } from "@/lib/utils";
import { ServerConfigDialog } from "@/components/server-config-dialog";
import { breakdownAtom, isMcpConfigOpenAtom } from "@/services/mcp/atoms";
import ModelSelector from "@/components/model-selector";

// Helper function to generate unique IDs with fallback for environments where crypto.randomUUID() isn't available
const generateUniqueId = () => {
  try {
    return crypto.randomUUID();
  } catch {
    // Fallback for environments where randomUUID is not available
    return Math.random().toString(36).substring(2, 15) +
           Math.random().toString(36).substring(2, 15) +
           Date.now().toString(36);
  }
};

// Function to format date into a pretty relative time
const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return `${diffInSeconds}s`;
  } else if (diffInSeconds < 3600) {
    return `${Math.floor(diffInSeconds / 60)}m`;
  } else if (diffInSeconds < 86400) {
    return `${Math.floor(diffInSeconds / 3600)}h`;
  } else {
    return `${Math.floor(diffInSeconds / 86400)}d`;
  }
};

export default function ChatPage() {
  // Ref for the scroll viewport
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  // Ref for the input field
  const inputRef = useRef<HTMLInputElement | null>(null);

  // GitChat instance
  const chatRef = useRef<GitChat>(null);
  useEffect(() => {
    if (!chatRef.current) {
      chatRef.current = gitChat;
    }
  }, []);

  // Atoms
  const commitHead = useAtomValue(commitHeadAtom);
  const commits = useAtomValue(commitsAtom);
  const commitThread = useAtomValue(commitThreadAtom);
  const fullCommitList = useAtomValue(fullCommitListAtom);
  const pendingMessageConfig = useAtomValue(pendingMessageConfigAtom);
  const currentCommitChildren = useAtomValue(currentCommitChildrenAtom);
  const currentCommitChildrenIndexMap = useAtomValue(
    currentCommitChildrenIndexMapAtom
  );
  const lastUserCommit = useAtomValue(lastUserCommitAtom);
  const [isLoading, setIsLoading] = useAtom(isLoadingAtom);
  const [cmdkOpen, setCmdkOpen] = useAtom(cmdkOpenAtom);
  const setDialogOpen = useSetAtom(dialogOpenAtom);
  const setMcpConfigOpen = useSetAtom(isMcpConfigOpenAtom);
  const breakdown = useAtomValue(breakdownAtom);

  // We're using direct API data from AI SDK responses

  // Monitor breakdown changes
  useEffect(() => {
    // Track AI tool availability
  }, [breakdown]);

  // Get model name for token counter
  const modelName = useAtomValue(modelNameAtom);

  // Running token count for the entire conversation
  const [totalTokens, setTotalTokens] = useState({
    prompt: 0,
    completion: 0,
    total: 0
  });

  // Simple function to estimate tokens for user input
  // Use simple estimation as a fallback when API token counts aren't available
  const estimateTokens = (text: string | null | undefined): number => {
    if (!text) return 0;
    // Estimate approximately 4 characters per token
    return Math.ceil(text.length / 4);
  };

  // Utility function to check if an object has usage data
  // This function is unused but kept for future reference
  // const hasUsageData = (obj: unknown): boolean => {
  //   return obj &&
  //     (obj.promptTokens || obj.prompt_tokens ||
  //      obj.completionTokens || obj.completion_tokens ||
  //      obj.totalTokens || obj.total_tokens);
  // };

  const messageFinishCallback = useCallback(
      (assistantMessage: Message, responseData?: { usage?: UsageMetadata }) => {
      // For debugging and updating running total
      if (responseData?.usage) {
        console.log("ACTUAL TOKEN USAGE:", responseData.usage);

        // Update running total with this exchange's tokens
        setTotalTokens(prev => ({
          prompt: prev.prompt + (responseData.usage?.promptTokens || responseData.usage?.prompt_tokens || 0),
          completion: prev.completion + (responseData.usage?.completionTokens || responseData.usage?.completion_tokens || 0),
          total: prev.total + (responseData.usage?.totalTokens || responseData.usage?.total_tokens || 0)
        }));
      }

      if (chatRef.current && assistantMessage.role === "assistant") {
        // The 'commitHead' atom at this point should be the ID of the user's message
        // that initiated this turn, because we set it at the end of onSubmit.
        // To ensure we get the latest value and avoid stale closures,
        // read directly from the store. By the time onFinish is called,
        // onSubmit should have updated commitHeadAtom to the user's message ID.
        const parentOfAssistantMessage = chatRef.current?.commitHead;

        // Add usage data to the message if available, normalizing to our expected format
        if (responseData?.usage) {
          assistantMessage.usage = {
            prompt_tokens: responseData.usage.promptTokens || responseData.usage.prompt_tokens || 0,
            completion_tokens: responseData.usage.completionTokens || responseData.usage.completion_tokens || 0,
            total_tokens: responseData.usage.totalTokens || responseData.usage.total_tokens || 0
          };
        }

        const aiCommit: Commit = {
          id: assistantMessage.id,
          message: assistantMessage.content,
          author:
            assistantMessage.role === "assistant"
              ? pendingMessageConfig.modelName
              : "user",
          date: (assistantMessage.createdAt ?? new Date()).toISOString(),
          metadata: {
            message: assistantMessage,
            usage: responseData?.usage,  // Store usage data directly in commit metadata
          },
          parentId: parentOfAssistantMessage ?? undefined, // Parent is the user commit
        };
        chatRef.current?.addCommit(aiCommit, true);
        chatRef.current?.setCommitHead(aiCommit.id); // Update global commit head to this new AI commit
        setIsLoading(false);
      }
    },
    [pendingMessageConfig.modelName, setIsLoading]
  );

  // Get AI SDK chat functionality
  const { messages, status, input, setInput, setMessages, append, stop } =
    useChat({
      id: commitHead ?? undefined,
      body: {
        pendingMessageConfig,
      },
      onToolCall: () => {
        // Tool call handler
      },
      onFinish: messageFinishCallback,
      onResponse: () => {
        // Response handler
      },
      onError: (error) => {
        console.error("Chat error:", error); // Log the error for debugging
        setIsLoading(false); // Stop the loading indicator

        // Attempt to find the user message that initiated this turn.
        // We rely on commitHead being set to the user message ID in onSubmit.
        const userMessageId = chatRef.current?.commitHead;

        // Construct a more informative error message.
        // We can include different details based on the error object structure.
        let userErrorMessage = 'An unexpected error occurred.';

        if (error instanceof Error) {
           // If it's a standard Error object, use its message
           userErrorMessage = `Error: ${error.message}`;
        } else if (typeof error === 'object' && error !== null) {
           // If it's an object, try to stringify it or access specific properties
           try {
             userErrorMessage = `Error: ${JSON.stringify(error)}`;
           } catch {
             userErrorMessage = `Error: Could not display error details.`;
           }
        } else {
           // For primitive types or other unexpected error formats
           userErrorMessage = `Error: ${String(error)}`;
        }


        if (userMessageId) {
          // Create an error message object with the more informative message.
          const errorMessage = {
            id: generateUniqueId(),
            content: `Failed to process your request: ${userErrorMessage}`, // Prepend a user-friendly phrase
            role: 'assistant', // Or 'system'
            createdAt: new Date(),
            metadata: {
               isError: true,
               originalError: userErrorMessage, // Store the formatted error message
            }
          };

          // Add the error message to the commit tree
          const errorCommit = {
            id: errorMessage.id,
            message: errorMessage.content,
            author: 'system', // Or 'error'
            date: errorMessage.createdAt.toISOString(),
            metadata: {
              message: errorMessage,
              usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
            },
            parentId: userMessageId, // Link to the user commit
          };
          chatRef.current?.addCommit(errorCommit, true);

          // Update the messages state
          setMessages(currentMessages => {
            const userMessageIndex = currentMessages.findIndex(msg => msg.id === userMessageId);
            if (userMessageIndex !== -1) {
              const newMessages = [...currentMessages];
              newMessages.splice(userMessageIndex + 1, 0, errorMessage);
              return newMessages;
            }
            return [...currentMessages, errorMessage];
          });

        } else {
           // If userMessageId is not available, just append a general error message at the end
           const generalErrorMessage = {
            id: generateUniqueId(),
            content: `Failed to process your request: ${userErrorMessage}`, // Use the informative message here too
            role: 'assistant', // Or 'system'
            createdAt: new Date(),
             metadata: {
               isError: true,
               originalError: userErrorMessage,
            }
           };
           setMessages(currentMessages => [...currentMessages, generalErrorMessage]);
            const errorCommit = {
            id: generalErrorMessage.id,
            message: generalErrorMessage.content,
            author: 'system', // Or 'error'
            date: generalErrorMessage.createdAt.toISOString(),
            metadata: {
              message: generalErrorMessage,
              usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
            },
            parentId: undefined,
          };
           chatRef.current?.addCommit(errorCommit, true);
        }
      },
    });

  useEffect(() => {
    if (status === "submitted" || status === "streaming") {
      setIsLoading(true);
    } else {
      setIsLoading(false);
    }
  }, [status, setIsLoading]);

  const onSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (input.trim()) {
        setIsLoading(true);
        // Estimate tokens for user message
        const estimatedTokens = estimateTokens(input);

        // Add estimated user tokens to running total
        setTotalTokens(prev => ({
          prompt: prev.prompt + estimatedTokens,
          completion: prev.completion,
          total: prev.total + estimatedTokens
        }));

        const message: Message = {
          id: generateUniqueId(),
          content: input,
          role: "user",
          createdAt: new Date(),
        };

        const commit: Commit = {
          id: message.id,
          message: message.content,
          author: message.role,
          date:
            message.createdAt instanceof Date
              ? message.createdAt.toISOString()
              : new Date().toISOString(),
          metadata: {
            message,
            usage: {
              prompt_tokens: estimatedTokens,
              completion_tokens: 0,
              total_tokens: estimatedTokens
            }
          },
          parentId: chatRef.current?.commitHead,
        };
        setInput("");
        chatRef.current?.addCommit(commit, true);
        chatRef.current?.setCommitHead(commit.id);
        append(commit.metadata.message);
      }
    },
    [input, setInput, append, setIsLoading]
  );

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    const viewport = scrollAreaRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]"
    );
    if (viewport) {
      viewport.scrollTop = viewport.scrollHeight;
    }
  }, [messages]);

  // Set the messages to the commit thread when the commit thread changes
  useEffect(() => {
    // Calculate token counts for all messages in the thread
    const messagesWithUsage = commitThread.map((c) => {
      const message = c.metadata.message;
      // Add usage data from commit metadata if available
      if (c.metadata.usage) {
        message.usage = c.metadata.usage;
      } else if (!message.usage) {
        // If no usage data in either place, add estimated tokens
        const estimatedTokens = estimateTokens(c.message);
        message.usage = {
          prompt_tokens: c.author === 'user' ? estimatedTokens : 0,
          completion_tokens: c.author !== 'user' ? estimatedTokens : 0,
          total_tokens: estimatedTokens
        };
      }
      return message;
    });
    setMessages(messagesWithUsage);
  }, [commitThread, setMessages]);

  // Reset running total when chat is cleared
  useEffect(() => {
    if (commitThread.length === 0) {
      setTotalTokens({ prompt: 0, completion: 0, total: 0 });
    }
  }, [commitThread.length]);

  // Effect to focus input on Tab key press
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        inputRef.current?.blur();
      }
      // If the input is focused, don't do anything
      if (document.activeElement === inputRef.current) return;
      if (event.key === "Tab" || event.key === "i") {
        event.preventDefault();
        inputRef.current?.focus();
      }

      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setCmdkOpen((open) => !open);
      }

      // If there's a message streaming, pause all key presses below this
      if (isLoading || cmdkOpen) return;
      // Process key event

      // Clear the chat (start a new thread)
      if (event.key === "n") {
        event.preventDefault();
        chatRef.current?.clearCommits();
      }

      // Configure MCP
      if (event.key === "m") {
        event.preventDefault();
        setMcpConfigOpen(true);
      }

      // Configure Exports
      if (event.key === "e") {
        event.preventDefault();
        setDialogOpen(true);
      }

      if (commitHead) {
        const commit = commits[commitHead];
        // Go to the last user commit
        if (event.key === "u") {
          event.preventDefault();
          chatRef.current?.redoLastUserCommit();
        }

        // Retry the last user message
        if (event.key === "r") {
          if (commit.metadata.message.content) {
            setIsLoading(true);
            append(commit.metadata.message);
          }
        }

        // Go to the previous message
        if (event.key === "p") {
          event.preventDefault();
          if (commit.parentId) {
            chatRef.current?.setCommitHead(commit.parentId);
          }
        }

        // Go to the child node at the specified index in currentCommitChildren
        if (!isNaN(Number(event.key)) && event.key.trim() !== "") {
          const index = Number(event.key);
          if (index > 0 && index <= currentCommitChildren.length) {
            chatRef.current?.setCommitHead(currentCommitChildren[index - 1].id);
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    // Cleanup function to remove the event listener
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    commitHead,
    commits,
    currentCommitChildren,
    setCmdkOpen,
    isLoading,
    cmdkOpen,
    setMcpConfigOpen,
    setDialogOpen,
    append,
    setIsLoading,
  ]);

  // Tool sidebar state
  const [isToolSidebarOpen, setIsToolSidebarOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(true);

  // Initialize based on screen size and handle resize
  useEffect(() => {
    const checkScreenSize = () => {
      const isMobile = window.innerWidth < 768;
      setIsMobileView(isMobile);

      // Only set default state on first render
      if (!isMobile) {
        setIsToolSidebarOpen(true);
      }
    };

    // Set initial state
    checkScreenSize();

    // Add event listener for screen resizing
    window.addEventListener('resize', checkScreenSize);

    // Clean up
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const toggleToolSidebar = useCallback(() => {
    // Force update state to ensure re-render
    setIsToolSidebarOpen(prevState => !prevState);
    // Prevent scrolling when sidebar is open on mobile
    if (isMobileView) {
      document.body.style.overflow = !isToolSidebarOpen ? 'hidden' : '';
    }
  }, [isMobileView, isToolSidebarOpen]);

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex flex-row h-screen w-full">
        {/* Left Sidebar */}
        <Sidebar className="border-r flex flex-col">
          <SidebarHeader className="py-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold">History</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  chatRef.current?.clearCommits(true);
                }}
              >
                <Trash2 className="h-4 w-4 mr-1" /> Clear
              </Button>
            </div>
          </SidebarHeader>
          <SidebarContent className="flex-grow overflow-y-auto">
            <SidebarGroup className="py-2 px-0">
              {fullCommitList.map((commit) => {
                // Determine background color based on commit selection and parent relationship
                let bgColor = "";
                if (commitHead === commit.id) {
                  // Current commit head
                  bgColor = "bg-primary/10 dark:bg-muted py-6";
                }
                let author = <span>{commit.author}</span>;
                if (currentCommitChildrenIndexMap[commit.id] !== undefined) {
                  author = (
                    <div className="my-2">
                      <Keybinding>
                        {currentCommitChildrenIndexMap[commit.id] + 1}
                      </Keybinding>{" "}
                      <span className="ml-2 font-bold">Next user message</span>
                    </div>
                  );
                }
                if (
                  commitHead !== null &&
                  commit.id === commits[commitHead]?.parentId
                ) {
                  author = (
                    <div className="my-2">
                      <Keybinding>P</Keybinding>{" "}
                      <span className="ml-2 font-bold">Previous message</span>
                    </div>
                  );
                }
                return (
                  <div
                    key={commit.id}
                    onClick={() => {
                      if (isLoading) return;
                      chatRef.current?.setCommitHead(commit.id);
                      setMessages(commitThread.map((c) => c.metadata.message));
                    }}
                    className={cn(
                      `px-4 py-3 rounded-md ${bgColor}`,
                      isLoading
                        ? "cursor-default"
                        : "cursor-pointer hover:bg-gray-100 dark:hover:bg-muted"
                    )}
                  >
                    <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                      <span className="text-muted-foreground">{author}</span>
                      <span>
                        <span
                          className="font-semibold"
                          suppressHydrationWarning={true}
                        >
                          {formatRelativeTime(commit.date)}
                        </span>
                        {" · "}
                        <Badge variant="outline" className="mx-1">
                          {commit.id.slice(0, 10)}
                        </Badge>
                      </span>
                      <span
                        className="text-foreground truncate"
                        style={{
                          maxWidth: "100%",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          display: "block",
                        }}
                        title={commit.message}
                      >
                        {commit.message}
                      </span>
                    </div>
                  </div>
                );
              })}
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        {/* Main Chat Content */}
        <div className="flex flex-col flex-1 h-full overflow-x-auto">
          <header className="p-4 border-b flex flex-col md:flex-row justify-between items-center space-y-2 md:space-y-0">
            <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
              <div className="flex items-center gap-2">
                <SidebarTrigger className="mr-2">
                  <PanelLeftIcon className="h-4 w-4" />
                </SidebarTrigger>
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
                <h1 className="text-xl font-semibold">MCP Chat</h1>
              </div>
              <div className="flex md:hidden ">
                 <ModelSelector className=" w-auto h-full mr-1 " />
                <ThemeToggle />
                {/* Tools sidebar toggle button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleToolSidebar}
                  aria-label="Toggle tools sidebar"
                  className="z-50 relative"
                >
                  {isToolSidebarOpen ? <X className="h-4 w-4" /> : <PanelRightIcon className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <ModelSelector className="hidden md:flex" />
              <div className="hidden md:flex items-center gap-3">
                <ThemeToggle />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleToolSidebar}
                  aria-label="Toggle tools sidebar"
                >
                  {isToolSidebarOpen ? <X className="h-4 w-4" /> : <PanelRightIcon className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </header>

          <ScrollArea className="flex-1 p-2 md:p-4 space-y-4" ref={scrollAreaRef}>
            <div className="max-w-md md:max-w-[80vw] xl:max-w-[65vw] mx-auto space-y-4 pb-10">
              {commitThread.length === 0 &&
              !isLoading &&
              currentCommitChildren.length === 0 ? (
                <div className="text-center py-20 flex flex-col items-center gap-4">
                  <span className="text-muted-foreground">
                    <span className="text-xl text-muted-foreground flex items-center gap-2 justify-center">
                      Press{" "}
                      <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                        Tab
                      </kbd>{" "}
                      to type a message.
                    </span>
                  </span>
                  <span className="text-muted-foreground">
                    <span className="text-xl text-muted-foreground flex items-center gap-2 justify-center">
                      <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                        <span className="text-xs">⌘</span>K
                      </kbd>{" "}
                      to open the command palette.
                    </span>
                  </span>
                </div>
              ) : (
                commitThread.map((commit, index) => (
                  <div key={`msg-${commit.id}-${index}`}>
                    <div className="w-full flex items-center justify-center gap-2 pb-2">
                      <p className="text-xs text-muted-foreground">
                        {commit.author}
                      </p>
                      <p
                        className="text-xs text-muted-foreground "
                        suppressHydrationWarning={true}
                      >
                        {formatRelativeTime(commit.date)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        <Badge variant="outline">
                          {commit.id.slice(0, 10)}
                        </Badge>
                      </p>
                    </div>
                    {/* Wrap ChatMessage with a div for conditional styling */}
                    <div className={commit.metadata?.isError ? 'border border-red-500 rounded-md p-2' : ''}>
                      <ChatMessage commit={commit} />
                    </div>
                    <div className="flex justify-end gap-2">
                      {lastUserCommit?.id === commit.id && !isLoading && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              chatRef.current?.redoLastUserCommit()
                            }
                          >
                            <Keybinding>U</Keybinding> Undo
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (commit.metadata.message.content) {
                                setIsLoading(true);
                                append(commit.metadata.message);
                              }
                            }}
                          >
                            <Keybinding>R</Keybinding> Retry
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
              {status === "streaming" && (
                <ChatMessage
                  commit={commitThread[commitThread.length - 1]}
                  messageProp={messages[messages.length - 1]}
                />
              )}
              {isLoading && <LoadingMessage />}
              {currentCommitChildren.length > 0 && (
                <div className="w-[100%] mx-auto">

                <ScrollArea className=" whitespace-nowrap mx-12 rounded-md border">
                  <div className="flex w-max space-x-4 p-4  ">
                    {currentCommitChildren.map((commit) => {
                      // Determine background color based on commit selection and parent relationship
                      let bgColor = "";
                      if (commitHead === commit.id) {
                        // Current commit head
                        bgColor = "bg-gray-200 dark:bg-muted py-6";
                      } else if (
                        commitHead &&
                        commits[commitHead]?.parentId === commit.id
                      ) {
                        // This commit is the parent of the current head
                        // TODO: Add a different color for this
                      } else if (
                        commit.parentId &&
                        commit.parentId === commitHead
                      ) {
                        // This commit is a child of the current head
                        bgColor =
                          "border-1 border-dashed border-gray-400 dark:border-gray-500/50";
                      }
                      return (
                        <div
                          key={commit.id}
                          onClick={() => {
                            chatRef.current?.setCommitHead(commit.id);
                            setMessages(
                              commitThread.map((c) => c.metadata.message)
                            );
                          }}
                          className={`cursor-pointer px-4 py-3 hover:bg-gray-100 dark:hover:bg-muted rounded-md ${bgColor} w-64`}
                        >
                          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                            <span className="text-muted-foreground truncate">
                              {currentCommitChildrenIndexMap[commit.id] !==
                                undefined && (
                                <Keybinding>
                                  {currentCommitChildrenIndexMap[commit.id] + 1}
                                </Keybinding>
                              )}
                              <span className="ml-2">{commit.author}</span>
                            </span>
                            <span>
                              <span
                                className="font-semibold"
                                suppressHydrationWarning={true}
                              >
                                {formatRelativeTime(commit.date)}
                              </span>
                              {" · "}
                              <Badge variant="outline" className="mx-1">
                                {commit.id.slice(0, 10)}
                              </Badge>
                            </span>
                            <span
                              className="text-foreground truncate"
                              style={{
                                maxWidth: "100%",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                display: "block",
                              }}
                              title={commit.message}
                            >
                              {commit.message}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
                </div>
              )}
            </div>
          </ScrollArea>

          <section className="p-4  border-t">
            <div className="max-w-md md:max-w-[80vw] xl:max-w-[65vw] mx-auto md:px-12 lg:pb-4">
              <div className="flex flex-col lg:flex-row w-full gap-4 mb-2">
                {/* First row - Token info */}
                <div className="flex flex-col gap-1 text-xs text-muted-foreground w-full lg:w-auto lg:mr-auto">
                  <div className="flex flex-row items-center justify-between gap-2 overflow-x-auto whitespace-nowrap">

                  </div>
                  <div className="flex flex-row items-center justify-between gap-2 px-2 py-1 rounded-md overflow-x-auto whitespace-nowrap text-xs  font-mono">
                    Total: <p className="text-blue-500 dark:text-blue-400 inline">{totalTokens.prompt.toLocaleString()}</p> in + <p className="text-green-600 dark:text-green-400 inline">{totalTokens.completion.toLocaleString()}</p> out = <p className="text-amber-600 dark:text-amber-400 inline">{totalTokens.total.toLocaleString()}</p> • Cost: ${((totalTokens.prompt * 0.00007 + totalTokens.completion * 0.00014)/1000).toFixed(5)} <p className="opacity-70 inline">({modelName ? modelName.split('/')[0] : 'google'})</p>
                  </div>
                </div>

                {/* Second row - Buttons */}
                <div className="flex w-full lg:w-auto">
                  <div className="flex flex-wrap gap-2 w-full">
                    <ServerConfigDialog />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setMcpConfigOpen(true)}
                    >
                      <Keybinding>M</Keybinding> MCP
                    </Button>
                    {commitThread.length > 0 && (
                      <>
                        <Export />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDialogOpen(true)}
                        >
                          <Keybinding>E</Keybinding> Export Chat
                        </Button>
                        {!isLoading && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              chatRef.current?.clearCommits();
                            }}
                          >
                            <Keybinding>N</Keybinding> New Thread
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <form onSubmit={onSubmit} className="flex gap-2">
                  <Input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="[PRESS TAB] Type a message..."
                    className="flex-1 p-2 xl:p-4 xl:text-base"
                    disabled={isLoading}
                    autoFocus
                  />
                {status === "streaming" ? (
                  <Button
                    type="button"
                    className="bg-red-500"
                    size="icon"
                    onClick={() => stop()}
                  >
                    <Square className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    size="icon"
                    disabled={isLoading || !input.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                )}
                <CmdK />
              </form>
              </div>
            </div>
          </section>
        </div>

        {/* Tools Sidebar - togglable on all devices */}
        {isToolSidebarOpen && (
          <>
            {/* Mobile backdrop overlay */}
            {isMobileView && (
              <div
                className="fixed inset-0 bg-black/50 z-40 md:hidden"
                onClick={toggleToolSidebar}
                aria-hidden="true"
              />
            )}
            <div className={isMobileView ? "fixed right-0 top-0 z-50 h-screen bg-card dark:bg-card shadow-xl" : ""}>
              <ToolsSidebar
                className={isMobileView ? "h-full border-l" : ""}
                onClose={toggleToolSidebar}
                isMobile={isMobileView}
                key="tools-sidebar"
              />
            </div>
          </>
        )}
      </div>
    </SidebarProvider>
  );
}
