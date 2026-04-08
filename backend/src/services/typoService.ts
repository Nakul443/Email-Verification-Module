// typo logic

import levenshtein from 'fast-levenshtein';

// Part 2: "Did You Mean?" Typo Detection
// suggests corrections for common email domain typos using Levenshtein distance

const COMMON_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'icloud.com',
  'aol.com',
  'protonmail.com',
  'zoho.com'
];

export const getDidYouMean = (email: string): string | null => {
  const [user, domain] = email.split('@');
  
  if (!user || !domain) return null;

  for (const commonDomain of COMMON_DOMAINS) {
    // if exact match, no typo detected
    if (domain === commonDomain) return null;

    // check if the edit distance is 2 or less
    const distance = levenshtein.get(domain, commonDomain);
    
    if (distance > 0 && distance <= 2) {
      return `${user}@${commonDomain}`;
    }
  }

  return null;
};