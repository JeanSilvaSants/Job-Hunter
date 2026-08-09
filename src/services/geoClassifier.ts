export type GeoCategory =
  | 'BRAZIL'
  | 'REMOTE_BRAZIL'
  | 'LATAM_COMPATIBLE'
  | 'INTERNATIONAL_UNKNOWN'
  | 'NOT_COMPATIBLE';

/**
 * Classifies location and description into a geographic eligibility tier for candidates in Brazil.
 */
export function classifyGeo(location: string, description: string): GeoCategory {
  const locLower = (location || '').toLowerCase();
  const descLower = (description || '').toLowerCase();
  const combined = `${locLower} ${descLower}`;

  // 1. Explicit Exclusion Rules (NOT_COMPATIBLE)
  // Check for explicit US / Canada / EU / UK restrictions
  const explicitIncompatiblePatterns = [
    'us only',
    'u.s. only',
    'united states only',
    'remote - us',
    'remote (us)',
    'remote us',
    'us remote',
    'must reside in the us',
    'must reside in us',
    'must be located in the us',
    'must be located in us',
    'north america only',
    'canada only',
    'eu only',
    'uk only',
    'emea only',
    'apac only',
    'us timezones only',
    'us time zone only',
    'us time zones only',
  ];

  for (const pattern of explicitIncompatiblePatterns) {
    if (combined.includes(pattern)) {
      // Unless Brazil is explicitly included alongside
      if (!combined.includes('brazil') && !combined.includes('brasil') && !combined.includes('latam')) {
        return 'NOT_COMPATIBLE';
      }
    }
  }

  // Check if location is a pure US/EU city/state without mentioning Brazil
  const foreignOnlyLocations = [
    'united states',
    'austin, tx',
    'san francisco, ca',
    'new york, ny',
    'london, uk',
    'berlin, germany',
    'paris, france',
    'toronto, canada',
  ];
  for (const foreignLoc of foreignOnlyLocations) {
    if (locLower.includes(foreignLoc) && !combined.includes('brazil') && !combined.includes('brasil')) {
      return 'NOT_COMPATIBLE';
    }
  }

  // 2. Brazil Specific Checks (BRAZIL or REMOTE_BRAZIL)
  const brazilLocations = [
    'brazil',
    'brasil',
    ' br',
    'br ',
    ', br',
    '/br',
    'são paulo',
    'sao paulo',
    'sp',
    'rio de janeiro',
    'rj',
    'minas gerais',
    'mg',
    'paraná',
    'parana',
    'pr',
    'santa catarina',
    'sc',
    'rio grande do sul',
    'rs',
    'pernambuco',
    'pe',
    'bahia',
    'ba',
    'ceará',
    'ceara',
    'ce',
    'distrito federal',
    'df',
    'brasília',
    'brasilia',
    'curitiba',
    'florianópolis',
    'florianopolis',
    'belo horizonte',
    'porto alegre',
    'campinas',
    'guarulhos',
    'salvador',
    'fortaleza',
    'recife',
    'manaus',
    'belém',
    'belem',
    'goiânia',
    'goiania',
  ];

  const hasBrazilMention = brazilLocations.some((term) => combined.includes(term));
  const isRemote =
    combined.includes('remoto') ||
    combined.includes('remote') ||
    combined.includes('home office') ||
    combined.includes('teletrabalho') ||
    combined.includes('work from home');

  if (hasBrazilMention) {
    if (isRemote || locLower.includes('remote') || locLower.includes('remoto') || locLower.includes('home office')) {
      return 'REMOTE_BRAZIL';
    }
    return 'BRAZIL';
  }

  // 3. LATAM Compatible Checks
  const latamTerms = [
    'latin america',
    'latam',
    'south america',
    'américa latina',
    'américa do sul',
  ];
  const hasLatamMention = latamTerms.some((term) => combined.includes(term));
  if (hasLatamMention) {
    return 'LATAM_COMPATIBLE';
  }

  // 4. International Generic Remote (INTERNATIONAL_UNKNOWN)
  const genericRemoteTerms = [
    'remote',
    'remoto',
    'worldwide',
    'global',
    'anywhere',
    'distributed',
    'work from anywhere',
  ];
  const hasGenericRemote = genericRemoteTerms.some((term) => combined.includes(term));
  if (hasGenericRemote) {
    return 'INTERNATIONAL_UNKNOWN';
  }

  // Default fallback if no specific location cues match
  return 'NOT_COMPATIBLE';
}
