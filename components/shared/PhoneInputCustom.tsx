'use client';

import { useState, useEffect } from 'react';
import { getCountries, getCountryCallingCode } from 'react-phone-number-input';
import en from 'react-phone-number-input/locale/en';

// Mapa de nombres de países en español
const countryNamesES: Record<string, string> = {
  PE: 'Perú', AR: 'Argentina', BO: 'Bolivia', BR: 'Brasil', CL: 'Chile',
  CO: 'Colombia', CR: 'Costa Rica', CU: 'Cuba', EC: 'Ecuador', SV: 'El Salvador',
  ES: 'España', US: 'Estados Unidos', GT: 'Guatemala', HN: 'Honduras', MX: 'México',
  NI: 'Nicaragua', PA: 'Panamá', PY: 'Paraguay', DO: 'Rep. Dominicana', UY: 'Uruguay',
  VE: 'Venezuela', CA: 'Canadá', FR: 'Francia', DE: 'Alemania', IT: 'Italia',
  GB: 'Reino Unido', PT: 'Portugal', JP: 'Japón', CN: 'China', KR: 'Corea del Sur',
  AU: 'Australia', NZ: 'Nueva Zelanda', IN: 'India', RU: 'Rusia', ZA: 'Sudáfrica',
};

// Función para obtener emoji de bandera desde código de país
const getFlagEmoji = (countryCode: string): string => {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

// Obtener todos los países y ordenarlos (Perú primero, luego Latinoamérica, luego el resto)
const latinCountries = ['PE', 'AR', 'BO', 'BR', 'CL', 'CO', 'CR', 'CU', 'DO', 'EC', 'SV', 'GT', 'HN', 'MX', 'NI', 'PA', 'PY', 'UY', 'VE'];

const allCountries = getCountries().map(code => ({
  code,
  name: countryNamesES[code] || en[code] || code,
  dial: getCountryCallingCode(code as Parameters<typeof getCountryCallingCode>[0]),
  flag: getFlagEmoji(code),
}));

// Ordenar: Perú primero, luego Latinoamérica alfabéticamente, luego el resto alfabéticamente
const sortedCountries = [
  ...allCountries.filter(c => c.code === 'PE'),
  ...allCountries.filter(c => latinCountries.includes(c.code) && c.code !== 'PE').sort((a, b) => a.name.localeCompare(b.name, 'es')),
  ...allCountries.filter(c => !latinCountries.includes(c.code)).sort((a, b) => a.name.localeCompare(b.name, 'es')),
];

interface PhoneInputCustomProps {
  value: string;
  onChange: (value: string) => void;
  defaultCountry?: string;
  className?: string;
}

export default function PhoneInputCustom({
  value,
  onChange,
  defaultCountry = 'PE',
  className = '',
}: PhoneInputCustomProps) {
  // Parsear el valor inicial para separar código de país y número
  const parsePhoneValue = (phone: string): { countryCode: string; number: string } => {
    if (!phone) return { countryCode: defaultCountry, number: '' };

    // Quitar + si existe
    const cleanPhone = phone.startsWith('+') ? phone.slice(1) : phone;

    // Buscar qué país coincide con el inicio del número (probar códigos más largos primero)
    const sortedByDialLength = [...sortedCountries].sort((a, b) => b.dial.length - a.dial.length);

    for (const country of sortedByDialLength) {
      if (cleanPhone.startsWith(country.dial)) {
        return {
          countryCode: country.code,
          number: cleanPhone.slice(country.dial.length),
        };
      }
    }

    // Si no encuentra coincidencia, asumir que es solo el número con país por defecto
    return { countryCode: defaultCountry, number: cleanPhone };
  };

  const initialParsed = parsePhoneValue(value);
  const [selectedCountry, setSelectedCountry] = useState(initialParsed.countryCode);
  const [phoneNumber, setPhoneNumber] = useState(initialParsed.number);

  // Actualizar cuando el value externo cambia
  useEffect(() => {
    const parsed = parsePhoneValue(value);
    setSelectedCountry(parsed.countryCode);
    setPhoneNumber(parsed.number);
  }, [value]);

  // Cuando cambia país o número, notificar al padre
  const handleCountryChange = (newCountryCode: string) => {
    setSelectedCountry(newCountryCode);
    const country = sortedCountries.find(c => c.code === newCountryCode);
    if (country && phoneNumber) {
      onChange(`${country.dial}${phoneNumber}`);
    } else if (country && !phoneNumber) {
      onChange('');
    }
  };

  const handleNumberChange = (newNumber: string) => {
    // Solo permitir dígitos
    const cleanNumber = newNumber.replace(/\D/g, '');
    setPhoneNumber(cleanNumber);

    const country = sortedCountries.find(c => c.code === selectedCountry);
    if (country && cleanNumber) {
      onChange(`${country.dial}${cleanNumber}`);
    } else {
      onChange('');
    }
  };

  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1b967a] focus:border-transparent";

  return (
    <div className={`flex gap-2 ${className}`}>
      {/* Dropdown de país */}
      <select
        value={selectedCountry}
        onChange={(e) => handleCountryChange(e.target.value)}
        className="w-28 px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1b967a] focus:border-transparent bg-white cursor-pointer"
        title="Seleccionar país"
      >
        {sortedCountries.map(country => (
          <option key={country.code} value={country.code}>
            {country.flag} +{country.dial}
          </option>
        ))}
      </select>

      {/* Input de número */}
      <input
        type="tel"
        value={phoneNumber}
        onChange={(e) => handleNumberChange(e.target.value)}
        placeholder="999 888 777"
        className={`flex-1 ${inputClass}`}
      />
    </div>
  );
}
