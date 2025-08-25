import { UserData } from "@clerk/types";

export function getUserAvatarFallbackInitials(user: UserData): string {
  const firstInitial = user.firstName ? user.firstName[0] : '';
  const lastInitial = user.lastName ? user.lastName[0] : '';

  const initials = (firstInitial + lastInitial).toUpperCase();

  // Return initials if they exist, otherwise a fallback character
  return initials.length > 0 ? initials : '?';
}

export function getUserAvatarAltText(user: UserData): string {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');
  return fullName.length > 0 ? fullName : 'User Avatar';
}
