// regex and syntax validation logic

// Validates the email syntax using regex pattern.
// Checks for basic format, double dots, and length constraints.


export const isValidSyntax = (email: string): boolean => {
  if (!email) return false;

  // address should not exceed 254 characters
  if (email.length > 254) return false;

  // this pattern checks for the following stuff
  // user@domain format
  // rejects consecutive dots (e.g., user..name@domain.com)
  // rejects leading/trailing dots in labels
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  return emailRegex.test(email);
};

/**
 * Extracts the domain from an email string.
 */
export const extractDomain = (email: string): string => {
  return email.split('@')[1] || '';
};