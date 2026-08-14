export interface HistoryItem {
  id: string;
  query: string;
  displayName: string;
  addedAt: number;
}

export const MAX_HISTORY = 6;
export const STORAGE_KEY = "oasis:history:v1";
