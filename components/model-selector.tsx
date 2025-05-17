"use client";

import { useAtom } from "jotai";
import { modelNameAtom } from "@/services/commands/atoms";
import { AvailableModel, availableModelSchema } from "@/sharedTypes";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Cpu } from "lucide-react";
import { FC } from "react";

interface ModelSelectorProps {
  className?: string;
}

// Helper to format model names for display
const formatModelName = (model: string): string => {
  const parts = model.split('/');
  if (parts.length >= 2) {
    const provider = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    const modelName = parts[1].split('-').map(part =>
      part.charAt(0).toUpperCase() + part.slice(1)
    ).join(' ');

    // Create shorter display names for UI
    if (provider === "Google" && modelName.includes("Gemini")) {
      return `${provider} Gemini`;
    } else if (provider === "Anthropic" && modelName.includes("Claude")) {
      return `${provider} Claude`;
    } else if (provider === "Openai" && modelName.includes("Gpt")) {
      return `${provider} GPT-4`;
    }

    return `${provider} ${modelName}`;
  }
  return model;
};

export const ModelSelector: FC<ModelSelectorProps> = ({ className }) => {
  const [modelName, setModelName] = useAtom(modelNameAtom);

  const handleModelChange = (value: string) => {
    // Validate the model name
    const result = availableModelSchema.safeParse(value);
    if (result.success) {
      setModelName(value as AvailableModel);
    }
  };

  // Get all available models from the schema
  const availableModels = Object.values(
    availableModelSchema.enum
  ) as AvailableModel[];

  return (
    <div className="flex flex-col space-y-1">
      <label htmlFor="model-select" className="text-xs text-muted-foreground font-mono hidden">Model:</label>
      <Select value={modelName} onValueChange={handleModelChange}>
        <SelectTrigger id="model-select" className={`w-auto font-mono text-xs flex items-center ${className}`}>
          <Cpu className="mr-2 h-3.5 w-3.5" />
          <div className="hidden md:block">
            <SelectValue placeholder="Select model" />
          </div>
        </SelectTrigger>
        <SelectContent className="z-50">
          {availableModels.map((model) => (
            <SelectItem key={model} value={model} className="font-mono text-xs">
              {formatModelName(model)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default ModelSelector;
