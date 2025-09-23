import type { UserResource } from "@clerk/types";

export type AuthMethod = {
  type: 'email' | 'google' | 'github' | 'phone';
  label: string;
  icon: string;
};

export const AUTH_METHODS: Record<string, AuthMethod> = {
  email: {
    type: 'email',
    label: 'Email & Password',
    icon: '✉️'
  },
  google: {
    type: 'google',
    label: 'Google',
    icon: '🔗'
  },
  github: {
    type: 'github',
    label: 'GitHub', 
    icon: '📱'
  },
  phone: {
    type: 'phone',
    label: 'Phone Number',
    icon: '📞'
  }
};

/**
 * Determines the user's last used authentication method based on their Clerk user data
 */
export function getLastUsedAuthMethod(user: UserResource | null | undefined): AuthMethod | null {
  if (!user) return null;

  // Check for OAuth providers (external accounts)
  const verifiedExternalAccounts = user.externalAccounts?.filter(account => account.verification?.status === 'verified') || [];
  
  // Check for Google OAuth
  const hasGoogle = verifiedExternalAccounts.some(account => account.provider === 'google');
  if (hasGoogle) {
    return AUTH_METHODS.google;
  }
  
  // Check for GitHub OAuth  
  const hasGithub = verifiedExternalAccounts.some(account => account.provider === 'github');
  if (hasGithub) {
    return AUTH_METHODS.github;
  }
  
  // Check for verified phone numbers
  const hasVerifiedPhone = user.phoneNumbers?.some(phone => phone.verification?.status === 'verified');
  if (hasVerifiedPhone) {
    return AUTH_METHODS.phone;
  }
  
  // Check for verified email addresses and password
  const hasVerifiedEmail = user.emailAddresses?.some(email => email.verification?.status === 'verified');
  const hasPassword = user.passwordEnabled;
  
  if (hasVerifiedEmail && hasPassword) {
    return AUTH_METHODS.email;
  }
  
  // Default fallback
  return null;
}

/**
 * Stores the authentication method used during sign-in to localStorage
 */
export function storeLastAuthMethod(method: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('lastAuthMethod', method);
  }
}

/**
 * Retrieves the last used authentication method from localStorage
 */
export function getStoredLastAuthMethod(): AuthMethod | null {
  if (typeof window === 'undefined') return null;
  
  const stored = localStorage.getItem('lastAuthMethod');
  if (stored && AUTH_METHODS[stored]) {
    return AUTH_METHODS[stored];
  }
  
  return null;
}