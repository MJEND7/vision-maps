import { NodeVariants } from '../../convex/tables/nodes';
import banner from '../../public/landing/banner.png';


export const NODE_VARIANTS: { value: NodeVariants; label: NodeVariants }[] = [
  { value: NodeVariants.Image, label: NodeVariants.Image },
  { value: NodeVariants.Video, label: NodeVariants.Video },
  { value: NodeVariants.Link, label: NodeVariants.Link },
  { value: NodeVariants.Audio, label: NodeVariants.Audio },
  { value: NodeVariants.Text, label: NodeVariants.Text },
  { value: NodeVariants.YouTube, label: NodeVariants.YouTube },
  { value: NodeVariants.Spotify, label: NodeVariants.Spotify },
  { value: NodeVariants.AppleMusic, label: NodeVariants.AppleMusic },
  { value: NodeVariants.Notion, label: NodeVariants.Notion },
  { value: NodeVariants.Figma, label: NodeVariants.Figma },
  { value: NodeVariants.GitHub, label: NodeVariants.GitHub },
  { value: NodeVariants.AI, label: NodeVariants.AI },
  { value: NodeVariants.Loom, label: NodeVariants.Loom },
  { value: NodeVariants.Excalidraw, label: NodeVariants.Excalidraw },
] as const;

export const ASSETS = {
  banner,
} as const;

export const ROUTES = {
  // Main pages
  HOME: '/',
  
  // Auth routes
  SIGNIN: '/auth/signin',
  SIGNUP: '/auth/signup',
  SSO_CALLBACK: '/sso-callback',
  
  // Profile routes  
  PROFILE: {
    VISIONS: "/dashboard/visions",
    PROFILE: "/dashboard/profile"
  },
  
  // Server routes
  SERVER: '/server',
  
  // Landing page sections (hash routes)
  LANDING: {
    HOME: '#home',
    FEATURES: '#features', 
    ABOUT: '#about',
    PRICING: '#pricing',
  },
  
  // External links
  EXTERNAL: {
    SUPPORT_EMAIL: 'mailto:support@visionmaps.com',
  }
} as const;

// LocalStorage keys for paste-bin component
export const PASTE_BIN_STORAGE_KEYS = {
  INPUT_VALUE: 'paste-bin-input',
  MEDIA_ITEM: 'paste-bin-media',
  LINK_META: 'paste-bin-link-meta', 
  CUSTOM_NAME: 'paste-bin-custom-name',
  THOUGHT: 'paste-bin-thought',
  TEXT_CONTENT: 'paste-bin-text-content',
  CHAT_ID: 'paste-bin-chat-id',
  IS_AI_MODE: 'paste-bin-is-ai-mode',
  MODE: 'paste-bin-mode'
} as const;
