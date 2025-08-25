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
  PROFILE_VISIONS: '/profile/visions',
  
  // Legacy routes (for backward compatibility)
  VISIONS: '/visions',
  
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
