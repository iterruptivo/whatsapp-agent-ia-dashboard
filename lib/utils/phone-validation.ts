// ============================================================================
// UTILITY: Phone Number Validation
// ============================================================================
// Validates phone numbers using libphonenumber-js (Google's library)
// Ensures phone numbers have valid country codes for international use
// ============================================================================

import { parsePhoneNumber, isValidPhoneNumber, CountryCode } from 'libphonenumber-js';

export interface PhoneValidationResult {
  isValid: boolean;
  cleanedNumber: string;
  countryCode?: string;
  country?: CountryCode;
  error?: string;
}

/**
 * Validates and cleans a phone number
 *
 * Rules:
 * 1. Removes all non-numeric characters (+, spaces, dashes, etc.)
 * 2. Validates that it has a valid country code
 * 3. Validates the number format according to the country's rules
 *
 * @param rawPhone - The raw phone number from user input
 * @returns PhoneValidationResult with validation status and cleaned number
 */
export function validatePhoneNumber(rawPhone: string): PhoneValidationResult {
  // Step 1: Clean the phone number - remove all non-digits
  const cleanedNumber = String(rawPhone || '').replace(/\D/g, '');

  // Step 2: Check minimum length (country code + number should be at least 10 digits)
  if (cleanedNumber.length < 10) {
    return {
      isValid: false,
      cleanedNumber,
      error: 'Muy corto - debe tener al menos 10 dígitos incluyendo código de país',
    };
  }

  // Step 3: Check maximum length (no phone number should exceed 15 digits per ITU-T E.164)
  if (cleanedNumber.length > 15) {
    return {
      isValid: false,
      cleanedNumber,
      error: 'Muy largo - máximo 15 dígitos',
    };
  }

  // Step 4: Try to parse the number with the + prefix (required for libphonenumber-js)
  try {
    const phoneWithPlus = '+' + cleanedNumber;

    // Check if it's a valid phone number format
    if (!isValidPhoneNumber(phoneWithPlus)) {
      // Try to give a more specific error
      try {
        const parsed = parsePhoneNumber(phoneWithPlus);
        if (!parsed) {
          return {
            isValid: false,
            cleanedNumber,
            error: 'Sin código de país válido',
          };
        }
        // Has country but invalid format for that country
        return {
          isValid: false,
          cleanedNumber,
          countryCode: parsed.countryCallingCode,
          country: parsed.country,
          error: `Formato inválido para ${parsed.country || 'el país detectado'}`,
        };
      } catch {
        return {
          isValid: false,
          cleanedNumber,
          error: 'Sin código de país válido',
        };
      }
    }

    // Step 5: Parse to get country details
    const parsed = parsePhoneNumber(phoneWithPlus);

    if (!parsed || !parsed.country) {
      return {
        isValid: false,
        cleanedNumber,
        error: 'No se pudo detectar el país',
      };
    }

    return {
      isValid: true,
      cleanedNumber,
      countryCode: parsed.countryCallingCode,
      country: parsed.country,
    };

  } catch (error) {
    return {
      isValid: false,
      cleanedNumber,
      error: 'Sin código de país válido',
    };
  }
}

/**
 * Batch validates an array of phone numbers
 * Returns separated valid and invalid results
 */
export function validatePhoneNumbers(phones: string[]): {
  valid: PhoneValidationResult[];
  invalid: PhoneValidationResult[];
} {
  const valid: PhoneValidationResult[] = [];
  const invalid: PhoneValidationResult[] = [];

  for (const phone of phones) {
    const result = validatePhoneNumber(phone);
    if (result.isValid) {
      valid.push(result);
    } else {
      invalid.push(result);
    }
  }

  return { valid, invalid };
}
