import { z } from "zod";

export const availableModelSchema = z.enum([
  "google/gemini-2.5-flash-preview-04-17",
  "anthropic/claude-3-7-sonnet-latest",
  "openai/gpt-4.1",
]);

export type AvailableModel = z.infer<typeof availableModelSchema>;
