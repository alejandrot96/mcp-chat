import { z } from "zod";

export const availableModelSchema = z.enum([
  "google/gemini-2.5-flash-preview-04-17",
  "anthropic/claude-4-sonnet-20250514",
  "openai/gpt-4.1",
]);

export type AvailableModel = z.infer<typeof availableModelSchema>;
