"use client";

import { useState, useEffect, FC, useCallback } from "react";
import { useAtomValue } from "jotai";
import { AvailableModel } from "@/sharedTypes";
import { modelNameAtom } from "@/services/commands/atoms";
import { Coins, Info } from "lucide-react";
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
  const [calculatedInputTokens, setCalculatedInputTokens] = useState<number>(0);
  const [calculatedOutputTokens, setCalculatedOutputTokens] = useState<number>(0);
  const [, setCalculatedTotalTokens] = useState<number>(0);
  const modelName = useAtomValue(modelNameAtom);

  // Use simple estimation as a fallback when API token counts aren't available
  const estimateTokens = useCallback((input: string | null | undefined): number => {
    // Handle null, undefined, or empty strings
    if (!input || typeof input !== 'string' || input.length === 0) return 0;

    // More accurate token estimation based on GPT tokenization rules
    // Count words (roughly 1.3 tokens per word)
    const wordCount = input.split(/\s+/).filter(Boolean).length;
    // Count non-space characters (roughly 0.25 tokens per character)
    const charCount = input.replace(/\s+/g, '').length;

    // Blend both metrics for better estimation
    return Math.ceil((wordCount * 1.3) + (charCount * 0.25));
  }, []);

  // Helper function to extract input tokens from message usage data
  const getInputTokens = (usage?: MessageWithUsage['usage']): number => {
    if (!usage) return 0;
    // Check for both naming conventions (AI SDK vs custom props)
    return (
      typeof usage.input_tokens === 'number' ? usage.input_tokens :
      typeof usage.prompt_tokens === 'number' ? usage.prompt_tokens : 0
    );
  };

  // Helper function to extract output tokens from message usage data
  const getOutputTokens = (usage?: MessageWithUsage['usage']): number => {
    if (!usage) return 0;
    // Check for both naming conventions (AI SDK vs custom props)
    return (
      typeof usage.output_tokens === 'number' ? usage.output_tokens :
      typeof usage.completion_tokens === 'number' ? usage.completion_tokens : 0
    );
  };

  // Helper function to get total tokens, either from direct value or by summing input and output
  // Implementation commented out as it's currently unused
  /*
  const getTotalTokens = (usage?: MessageWithUsage['usage']): number => {
    if (!usage) return 0;
    if (typeof usage.total_tokens === 'number') return usage.total_tokens;

    // Sum input and output tokens
    const input = getInputTokens(usage);
    const output = getOutputTokens(usage);
    return input + output;
  };
  */

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
    return "text-zinc-900 dark:text-zinc-100";
  };

  useEffect(() => {
    let tempInputTokens = 0;
    let tempOutputTokens = 0;
    let tempTotalTokens = 0;

    // First check if direct token values were provided
    if (inputTokens !== undefined || outputTokens !== undefined || totalTokens !== undefined) {
      tempInputTokens = inputTokens ?? 0;
      tempOutputTokens = outputTokens ?? 0;
      tempTotalTokens = totalTokens ?? (tempInputTokens + tempOutputTokens);

      // Handle the case where total is provided but not input/output
      if (totalTokens !== undefined && inputTokens === undefined && outputTokens === undefined) {
        // Split the total based on typical ratios (60/40)
        tempInputTokens = Math.ceil(totalTokens * 0.6);
        tempOutputTokens = Math.ceil(totalTokens * 0.4);
      }
    }
    // Otherwise check for API-provided token counts in messages
    else if (messages && messages.length > 0) {
      // Sum up token counts from all messages with usage data
      let totalInputTokens = 0;
      let totalOutputTokens = 0;
      let userMessages = 0;
      let assistantMessages = 0;

      messages.forEach(m => {
        // Get usage data from the message object
        const usage = (m as MessageWithUsage).usage;

        if (m.role === 'user') {
          userMessages++;
          // For user messages, count them as input tokens
          if (usage) {
            totalInputTokens += getInputTokens(usage);
          } else {
            // Estimate if no usage data
            totalInputTokens += estimateTokens(typeof m.content === 'string' ? m.content : '');
          }
        } else if (m.role === 'assistant') {
          assistantMessages++;
          // For assistant messages, get both input and output tokens
          if (usage) {
            totalInputTokens += getInputTokens(usage);
            totalOutputTokens += getOutputTokens(usage);
          } else {
            // Estimate if no usage data
            totalOutputTokens += estimateTokens(typeof m.content === 'string' ? m.content : '');
          }
        }
      });

      // Always use the calculated values, falling back to estimates when needed
      tempInputTokens = totalInputTokens;
      tempOutputTokens = totalOutputTokens;
      tempTotalTokens = totalInputTokens + totalOutputTokens;

      // If we have no tokens but have messages, ensure we show something
      if (tempTotalTokens === 0 && (userMessages > 0 || assistantMessages > 0)) {
        // Estimate based on all message content
        tempTotalTokens = messages.reduce((acc, message) => {
          return acc + estimateTokens(typeof message.content === 'string' ? message.content : '');
        }, 0);
        tempInputTokens = Math.ceil(tempTotalTokens * 0.6);
        tempOutputTokens = Math.ceil(tempTotalTokens * 0.4);
      }
    } else if (text) {
      // If we're just displaying a text snippet
      tempTotalTokens = estimateTokens(text);
      tempInputTokens = tempTotalTokens; // For text snippets, all tokens are input
    }

    // Update state with our calculated values
    setCalculatedInputTokens(tempInputTokens);
    setCalculatedOutputTokens(tempOutputTokens);
    setCalculatedTotalTokens(tempTotalTokens);
    setTokenCount(tempTotalTokens);
    setEstimatedCost(calculateCost(
      tempInputTokens,
      tempOutputTokens,
      modelName
    ));
  }, [text, messages, modelName, inputTokens, outputTokens, totalTokens, estimateTokens]);

  // Always show detailed tokens now that we have better estimation
  // Implementation commented out as it's currently unused
  // const hasDetailedTokens = true;

  return (
    <div className={`flex flex-col ${className}`}>
      <div className="flex items-center gap-1 mb-1">
        <label className="text-xs text-muted-foreground dark:text-zinc-400 font-mono">Tokens:</label>
        <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3 w-3 text-muted-foreground/70 dark:text-zinc-400/70 cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs max-w-[300px] font-mono dark:bg-zinc-800 dark:text-zinc-100">
              Token counts from API when available, otherwise estimated.
              Input/output prices per 1K tokens:
              Google: $0.00007/$0.00014,
              Anthropic: $0.00025/$0.00075,
              OpenAI: $0.00087/$0.00261
            </TooltipContent>
          </Tooltip>
      </div>

      <div className="flex gap-3 items-center font-mono">
        <div className="flex items-center gap-1.5">
          <span className={`text-xs font-semibold ${getModelColor(modelName)}`}>
            Input: {calculatedInputTokens.toLocaleString()}
          </span>
          <span className="opacity-70 text-xs dark:text-zinc-400">|</span>
          <span className={`text-xs font-semibold ${getModelColor(modelName)}`}>
            Output: {calculatedOutputTokens.toLocaleString()}
          </span>
          <span className="opacity-70 text-xs dark:text-zinc-400">|</span>
          <div className="flex items-center gap-1.5">
            <Coins className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
            <span className="text-xs font-semibold dark:text-zinc-100">{estimatedCost}</span>
          </div>
        </div>
      </div>

      <div className="w-full h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full mt-1 overflow-hidden">
        <div
          className={`h-full ${getModelColor(modelName)} opacity-50`}
          style={{ width: `${Math.min(Math.max(tokenCount, 1) / 80, 100)}%` }}
        />
      </div>
    </div>
  );
};

// Only use named export
