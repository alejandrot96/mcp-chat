"use client";

import { useState, useEffect, FC, useCallback } from "react";
import { useAtomValue } from "jotai";
import { AvailableModel } from "@/sharedTypes";
import { modelNameAtom } from "@/services/commands/atoms";
import { Coins, Calculator, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Extended message type that includes usage data from AI SDK
interface MessageWithUsage {
  role: string;
  content: string;
  id?: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    input_tokens?: number;
    output_tokens?: number;
  };
}

interface TokenCounterProps {
  text?: string;
  messages?: MessageWithUsage[];
  className?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

export const TokenCounter: FC<TokenCounterProps> = ({ text, messages, className, inputTokens, outputTokens, totalTokens }) => {
  const [tokenCount, setTokenCount] = useState<number>(0);
  const [estimatedCost, setEstimatedCost] = useState<string>("$0.00");
  const modelName = useAtomValue(modelNameAtom);

  // Use simple estimation as a fallback when API token counts aren't available
  const estimateTokens = useCallback((input: string): number => {
    if (!input) return 0;
    // Simple estimation - about 4 characters per token as a rough approximation
    return Math.ceil(input.length / 4);
  }, []);

  // Helper function to extract input tokens from message usage data
  const getInputTokens = (usage?: MessageWithUsage['usage']): number => {
    if (!usage) return 0;
    return usage.input_tokens ?? usage.prompt_tokens ?? 0;
  };

  // Helper function to extract output tokens from message usage data
  const getOutputTokens = (usage?: MessageWithUsage['usage']): number => {
    if (!usage) return 0;
    return usage.output_tokens ?? usage.completion_tokens ?? 0;
  };

  const calculateCost = (inputTokens: number, outputTokens: number, model: AvailableModel): string => {
    // Accurate costs for input vs output tokens
    const pricingInput: Record<string, number> = {
      "google": 0.00007,  // Gemini 2.5 Flash input pricing
      "anthropic": 0.00025, // Claude 3.7 Sonnet input pricing
      "openai": 0.00087,   // GPT-4.1 input pricing
    };
    
    const pricingOutput: Record<string, number> = {
      "google": 0.00014,   // Gemini 2.5 Flash output pricing 
      "anthropic": 0.00075, // Claude 3.7 Sonnet output pricing
      "openai": 0.00261,   // GPT-4.1 output pricing
    };
    
    // Get provider from model name
    let provider = "google";
    if (model.includes("anthropic")) provider = "anthropic";
    if (model.includes("openai")) provider = "openai";
    
    // Calculate cost using separate input and output prices
    const inputCost = (inputTokens / 1000) * pricingInput[provider];
    const outputCost = (outputTokens / 1000) * pricingOutput[provider];
    const totalCost = inputCost + outputCost;
    
    return totalCost < 0.01 ? `$${totalCost.toFixed(5)}` : `$${totalCost.toFixed(3)}`;
  };
  
  // Get model-specific color
  const getModelColor = (model: AvailableModel): string => {
    if (model.includes("google")) return "text-blue-500 dark:text-blue-400";
    if (model.includes("anthropic")) return "text-purple-500 dark:text-purple-400";
    if (model.includes("openai")) return "text-green-500 dark:text-green-400";
    return "text-primary";
  };

  useEffect(() => {
    let calculatedInputTokens = 0;
    let calculatedOutputTokens = 0;
    let calculatedTotalTokens = 0;

    // First check if direct token values were provided
    if (inputTokens !== undefined || outputTokens !== undefined || totalTokens !== undefined) {
      calculatedInputTokens = inputTokens || 0;
      calculatedOutputTokens = outputTokens || 0;
      calculatedTotalTokens = totalTokens || (calculatedInputTokens + calculatedOutputTokens);
      console.log(`Using provided token counts: ${calculatedInputTokens} input, ${calculatedOutputTokens} output`);
    }
    // Otherwise check for API-provided token counts in messages
    else if (messages && messages.length > 0) {
      // Find the last assistant message that might have usage data
      const lastAssistantMessage = [...messages].reverse().find(m => 
        m.role === 'assistant' && 
        m.usage !== undefined
      );
      
      if (lastAssistantMessage && lastAssistantMessage.usage) {
        // Use accurate token counts from the AI SDK
        calculatedInputTokens = getInputTokens(lastAssistantMessage.usage);
        calculatedOutputTokens = getOutputTokens(lastAssistantMessage.usage);
        calculatedTotalTokens = lastAssistantMessage.usage.total_tokens || 
                               (calculatedInputTokens + calculatedOutputTokens);
        console.log(`Using AI SDK token counts: ${calculatedInputTokens} input, ${calculatedOutputTokens} output, total: ${calculatedTotalTokens}`);
      } else {
        // Fall back to estimation if no usage data is available
        calculatedTotalTokens = messages.reduce((acc, message) => {
          return acc + estimateTokens(message.content);
        }, 0);
        console.log(`No API token data, using estimation: ${calculatedTotalTokens} tokens`);
      }
    } else if (text) {
      // If we're just displaying a text snippet
      calculatedTotalTokens = estimateTokens(text);
    }

    setTokenCount(calculatedTotalTokens);
    setEstimatedCost(calculateCost(
      calculatedInputTokens || Math.ceil(calculatedTotalTokens/2), 
      calculatedOutputTokens || Math.ceil(calculatedTotalTokens/2), 
      modelName
    ));
  }, [text, messages, modelName, inputTokens, outputTokens, totalTokens, estimateTokens]);

  // Check if we have detailed token info either from direct props or from API
  const hasDetailedTokens = (inputTokens !== undefined && outputTokens !== undefined) || 
    (messages && messages.length > 0 && messages.some(m => 
      m.role === 'assistant' && 
      m.usage !== undefined &&
      (getInputTokens(m.usage) > 0 || getOutputTokens(m.usage) > 0 || m.usage.total_tokens)
    ));
  
  return (
    <div className={`flex flex-col ${className}`}>
      <div className="flex items-center gap-1 mb-1">
        <label className="text-xs text-muted-foreground font-mono">Tokens:</label>
        <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3 w-3 text-muted-foreground/70 cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs max-w-[300px] font-mono">
              Token counts from API when available, otherwise estimated.
              Input/output prices per 1K tokens: 
              Google: $0.00007/$0.00014, 
              Anthropic: $0.00025/$0.00075, 
              OpenAI: $0.00087/$0.00261
            </TooltipContent>
          </Tooltip>
      </div>
      
      {hasDetailedTokens ? (
        <div className="flex gap-3 items-center font-mono">
          <div className="flex items-center gap-1.5">
            <span className={`text-xs font-semibold ${getModelColor(modelName)}`}>
              Input: {inputTokens !== undefined ? inputTokens : 
                     getInputTokens(messages?.find(m => m.usage !== undefined)?.usage)}
            </span>
            <span className="opacity-70 text-xs">|</span>
            <span className={`text-xs font-semibold ${getModelColor(modelName)}`}>
              Output: {outputTokens !== undefined ? outputTokens : 
                      getOutputTokens(messages?.find(m => m.usage !== undefined)?.usage)}
            </span>
          </div>
        </div>
      ) : (
        <div className="flex gap-3 items-center font-mono">
          <div className="flex items-center gap-1.5">
            <Calculator className="h-3.5 w-3.5 text-primary" />
            <span className={`text-xs font-semibold ${getModelColor(modelName)}`}>{tokenCount.toLocaleString()}</span>
          </div>
          <span className="opacity-70 text-xs">|</span>
          <div className="flex items-center gap-1.5">
            <Coins className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-xs font-semibold">{estimatedCost}</span>
          </div>
        </div>
      )}
      
      {tokenCount > 0 && (
        <div className="w-full h-1 bg-muted/50 rounded-full mt-1 overflow-hidden">
          <div 
            className={`h-full ${getModelColor(modelName)} opacity-50`} 
            style={{ width: `${Math.min(tokenCount / 50, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
};

// Only use named export