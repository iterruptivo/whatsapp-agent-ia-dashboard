'use client';

import { useState, useEffect } from 'react';

// Lista de países con código y bandera (emoji)
const COUNTRIES = [
  { code: 'PE', name: 'Perú', dial: '51', flag: '🇵🇪' },
  { code: 'AR', name: 'Argentina', dial: '54', flag: '🇦🇷' },
  { code: 'BO', name: 'Bolivia', dial: '591', flag: '🇧🇴' },
  { code: 'BR', name: 'Brasil', dial: '55', flag: '🇧🇷' },
  { code: 'CL', name: 'Chile', dial: '56', flag: '🇨🇱' },
  { code: 'CO', name: 'Colombia', dial: '57', flag: '🇨🇴' },
  { code: 'CR', name: 'Costa Rica', dial: '506', flag: '🇨🇷' },
  { code: 'CU', name: 'Cuba', dial: '53', flag: '🇨🇺' },
  { code: 'EC', name: 'Ecuador', dial: '593', flag: '🇪🇨' },
  { code: 'SV', name: 'El Salvador', dial: '503', flag: '🇸🇻' },
  { code: 'ES', name: 'España', dial: '34', flag: '🇪🇸' },
  { code: 'US', name: 'Estados Unidos', dial: '1', flag: '🇺🇸' },
  { code: 'GT', name: 'Guatemala', dial: '502', flag: '🇬🇹' },
  { code: 'HN', name: 'Honduras', dial: '504', flag: '🇭🇳' },
  { code: 'MX', name: 'México', dial: '52', flag: '🇲🇽' },
  { code: 'NI', name: 'Nicaragua', dial: '505', flag: '🇳🇮' },
  { code: 'PA', name: 'Panamá', dial: '507', flag: '🇵🇦' },
  { code: 'PY', name: 'Paraguay', dial: '595', flag: '🇵🇾' },
  { code: 'DO', name: 'Rep. Dominicana', dial: '1', flag: '🇩🇴' },
  { code: 'UY', name: 'Uruguay', dial: '598', flag: '🇺🇾' },
  { code: 'VE', name: 'Venezuela', dial: '58', flag: '🇻🇪' },
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

    // Buscar qué país coincide con el inicio del número
    for (const country of COUNTRIES) {
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
    const country = COUNTRIES.find(c => c.code === newCountryCode);
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

    const country = COUNTRIES.find(c => c.code === selectedCountry);
    if (country && cleanNumber) {
      onChange(`${country.dial}${cleanNumber}`);
    } else {
      onChange('');
    }
  };

  const selectedCountryData = COUNTRIES.find(c => c.code === selectedCountry) || COUNTRIES[0];

  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1b967a] focus:border-transparent";

  return (
    <div className={`flex gap-2 ${className}`}>
      {/* Dropdown de país */}
      <select
        value={selectedCountry}
        onChange={(e) => handleCountryChange(e.target.value)}
        className="w-24 px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1b967a] focus:border-transparent bg-white cursor-pointer"
        title="Seleccionar país"
      >
        {COUNTRIES.map(country => (
          <option key={country.code} value={country.code}>
            {country.flag} {country.dial}
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
