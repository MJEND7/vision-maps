import { useReducer, useCallback } from 'react';
import { PASTE_BIN_STORAGE_KEYS } from './constants';

// State machine for paste-bin boolean states
interface PasteBinState {
  isDragOver: boolean;
  isLoadingLinkMeta: boolean;
  isLoadingTwitter: boolean;
  imageLoaded: boolean;
}

type PasteBinAction = 
  | { type: 'SET_DRAG_OVER'; payload: boolean }
  | { type: 'SET_LOADING_LINK_META'; payload: boolean }
  | { type: 'SET_LOADING_TWITTER'; payload: boolean }
  | { type: 'SET_IMAGE_LOADED'; payload: boolean }
  | { type: 'RESET_ALL_LOADING' }
  | { type: 'RESET_STATE' };

const initialState: PasteBinState = {
  isDragOver: false,
  isLoadingLinkMeta: false,
  isLoadingTwitter: false,
  imageLoaded: false,
};

function pasteBinReducer(state: PasteBinState, action: PasteBinAction): PasteBinState {
  switch (action.type) {
    case 'SET_DRAG_OVER':
      return { ...state, isDragOver: action.payload };
    case 'SET_LOADING_LINK_META':
      return { ...state, isLoadingLinkMeta: action.payload };
    case 'SET_LOADING_TWITTER':
      return { ...state, isLoadingTwitter: action.payload };
    case 'SET_IMAGE_LOADED':
      return { ...state, imageLoaded: action.payload };
    case 'RESET_ALL_LOADING':
      return { 
        ...state, 
        isLoadingLinkMeta: false, 
        isLoadingTwitter: false 
      };
    case 'RESET_STATE':
      return initialState;
    default:
      return state;
  }
}

// Custom hook for paste-bin state management
export function usePasteBinState() {
  const [state, dispatch] = useReducer(pasteBinReducer, initialState);

  const actions = {
    setDragOver: useCallback((value: boolean) => 
      dispatch({ type: 'SET_DRAG_OVER', payload: value }), []),
    
    setLoadingLinkMeta: useCallback((value: boolean) => 
      dispatch({ type: 'SET_LOADING_LINK_META', payload: value }), []),
    
    setLoadingTwitter: useCallback((value: boolean) => 
      dispatch({ type: 'SET_LOADING_TWITTER', payload: value }), []),
    
    setImageLoaded: useCallback((value: boolean) => 
      dispatch({ type: 'SET_IMAGE_LOADED', payload: value }), []),
    
    resetAllLoading: useCallback(() => 
      dispatch({ type: 'RESET_ALL_LOADING' }), []),
    
    resetState: useCallback(() => 
      dispatch({ type: 'RESET_STATE' }), []),
  };

  return { state, actions };
}

// LocalStorage utility functions
export const storageUtils = {
  // Get from localStorage with error handling
  get: <T>(key: string, fallback: T): T => {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return fallback;
      const parsed = JSON.parse(item);
      return parsed !== null ? parsed : fallback;
    } catch (error) {
      console.error(`Error parsing localStorage item ${key}:`, error);
      localStorage.removeItem(key);
      return fallback;
    }
  },

  // Set to localStorage with error handling
  set: (key: string, value: any): void => {
    try {
      if (value === null || value === undefined || value === '') {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (error) {
      console.error(`Error setting localStorage item ${key}:`, error);
    }
  },

  // Remove from localStorage
  remove: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing localStorage item ${key}:`, error);
    }
  },

  // Clear multiple keys
  clearKeys: (keys: string[]): void => {
    keys.forEach(key => storageUtils.remove(key));
  }
};

// Types for stored data
export interface StoredMediaItem {
  type: "image" | "audio" | "video" | "file" | "link" | "text" | "ai";
  url?: string;
  chatId?: string;
  isUploading?: boolean;
  uploadedUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  customName?: string;
}

export interface StoredLinkMeta {
  type: string;
  title?: string;
  description?: string;
  url: string;
  image?: string;
  siteName?: string;
}

// Paste-bin specific storage functions
export const pasteBinStorage = {
  load: () => ({
    inputValue: storageUtils.get<string>(PASTE_BIN_STORAGE_KEYS.INPUT_VALUE, ''),
    mediaItem: storageUtils.get<StoredMediaItem | null>(PASTE_BIN_STORAGE_KEYS.MEDIA_ITEM, null),
    linkMeta: storageUtils.get<StoredLinkMeta | null>(PASTE_BIN_STORAGE_KEYS.LINK_META, null),
    thought: storageUtils.get<string>(PASTE_BIN_STORAGE_KEYS.THOUGHT, ''),
    textContent: storageUtils.get<string>(PASTE_BIN_STORAGE_KEYS.TEXT_CONTENT, ''),
    chatId: storageUtils.get<string | null>(PASTE_BIN_STORAGE_KEYS.CHAT_ID, null),
    isAiMode: storageUtils.get<boolean>(PASTE_BIN_STORAGE_KEYS.IS_AI_MODE, false),
    mode: storageUtils.get<string>(PASTE_BIN_STORAGE_KEYS.MODE, 'idle'),
  }),

  save: {
    inputValue: (value: string) => storageUtils.set(PASTE_BIN_STORAGE_KEYS.INPUT_VALUE, value),
    mediaItem: (value: any) => {
      // Remove File object before saving as it can't be serialized
      const serializableValue = value ? { ...value, file: undefined } : null;
      storageUtils.set(PASTE_BIN_STORAGE_KEYS.MEDIA_ITEM, serializableValue);
    },
    linkMeta: (value: any) => storageUtils.set(PASTE_BIN_STORAGE_KEYS.LINK_META, value),
    thought: (value: string) => storageUtils.set(PASTE_BIN_STORAGE_KEYS.THOUGHT, value),
    textContent: (value: string) => storageUtils.set(PASTE_BIN_STORAGE_KEYS.TEXT_CONTENT, value),
    chatId: (value: string | null) => storageUtils.set(PASTE_BIN_STORAGE_KEYS.CHAT_ID, value),
    isAiMode: (value: boolean) => storageUtils.set(PASTE_BIN_STORAGE_KEYS.IS_AI_MODE, value),
    mode: (value: string) => storageUtils.set(PASTE_BIN_STORAGE_KEYS.MODE, value),
  },

  clear: () => {
    storageUtils.clearKeys(Object.values(PASTE_BIN_STORAGE_KEYS));
  }
};
