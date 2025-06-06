import { AvailableModel } from "@/sharedTypes";
import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

export const modelNameAtom = atomWithStorage<AvailableModel>(
  "modelName",
  "google/gemini-2.5-flash-preview-04-17"
);

export const pendingMessageConfigAtom = atom((get) => {
  const modelName = get(modelNameAtom);
  // Default fallback
  return {
    modelName: modelName,
  };
});

export const cmdkOpenAtom = atom(false);
export const dialogOpenAtom = atom(false);
