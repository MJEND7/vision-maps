import { useReducer, useCallback } from 'react';

// State machine for paste-bin UI states
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

    setImageLoaded: useCallback((value: boolean) =>
      dispatch({ type: 'SET_IMAGE_LOADED', payload: value }), []),

    resetAllLoading: useCallback(() =>
      dispatch({ type: 'RESET_ALL_LOADING' }), []),

    resetState: useCallback(() =>
      dispatch({ type: 'RESET_STATE' }), []),
  };

  return { state, actions };
}
