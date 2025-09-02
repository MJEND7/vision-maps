export function getUserAvatarFallbackInitials(firstName: string, lastName: string): string {
  const firstInitial = firstName ? firstName[0] : '';
  const lastInitial = lastName ? lastName[0] : '';

  const initials = (firstInitial + lastInitial).toUpperCase();

  // Return initials if they exist, otherwise a fallback character
  return initials.length > 0 ? initials : '?';
}

export function getUserFullName(firstName?: string, lastName?: string): string {
  const fullName = [firstName, lastName].filter(Boolean).join(' ');
  return fullName.length > 0 ? fullName : 'User Avatar';
}
