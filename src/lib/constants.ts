import banner from '../../public/landing/banner.png';

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
