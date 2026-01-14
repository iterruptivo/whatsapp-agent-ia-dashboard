/**
 * WizardSteps Component
 *
 * Indicador visual de pasos del wizard.
 * Muestra progreso con circulos y lineas conectoras.
 */

'use client';

import { Check } from 'lucide-react';

interface Step {
  number: number;
  label: string;
}

interface WizardStepsProps {
  steps: Step[];
  currentStep: number;
}

export default function WizardSteps({ steps, currentStep }: WizardStepsProps) {
  return (
    <div className="flex items-center justify-center w-full mb-8">
      {steps.map((step, index) => {
        const isCompleted = currentStep > step.number;
        const isCurrent = currentStep === step.number;
        const isLast = index === steps.length - 1;

        return (
          <div key={step.number} className="flex items-center">
            {/* Step circle */}
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-300 ${
                  isCompleted
                    ? 'bg-primary text-white'
                    : isCurrent
                    ? 'bg-primary text-white ring-4 ring-primary/20'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5" />
                ) : (
                  step.number
                )}
              </div>
              <span
                className={`mt-2 text-xs font-medium transition-colors ${
                  isCurrent || isCompleted ? 'text-primary' : 'text-gray-400'
                }`}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {!isLast && (
              <div
                className={`w-16 h-0.5 mx-2 transition-colors duration-300 ${
                  isCompleted ? 'bg-primary' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
