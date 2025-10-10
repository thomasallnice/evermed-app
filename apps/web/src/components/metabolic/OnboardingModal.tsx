/**
 * Metabolic Insights Beta Onboarding Modal
 *
 * 3-step wizard for welcoming beta users to Metabolic Insights feature.
 * Collects optional glucose targets and CGM connection preferences.
 *
 * Steps:
 * 1. Welcome - Feature overview and benefits
 * 2. Set Targets - Optional glucose target range input
 * 3. Connect CGM - Explain CGM connection (Dexcom/FreeStyle Libre)
 *
 * Completion status stored in Person.metadata.metabolic_onboarding_completed
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [targetMin, setTargetMin] = useState('70');
  const [targetMax, setTargetMax] = useState('180');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  async function handleComplete() {
    try {
      setSubmitting(true);

      // Save targets and mark onboarding as complete
      const res = await fetch('/api/metabolic/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetGlucoseMin: targetMin ? parseFloat(targetMin) : null,
          targetGlucoseMax: targetMax ? parseFloat(targetMax) : null,
          onboardingCompleted: true,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to save onboarding data');
      }

      onClose();
      router.refresh(); // Refresh to update UI
    } catch (error) {
      console.error('Error completing onboarding:', error);
      alert('Failed to save your preferences. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleNext() {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  }

  function handleSkip() {
    if (currentStep < 3) {
      setCurrentStep(3); // Skip to last step
    } else {
      handleComplete();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="relative p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            {currentStep === 1 && 'Welcome to Metabolic Insights Beta!'}
            {currentStep === 2 && 'Set Your Glucose Targets'}
            {currentStep === 3 && 'Connect Your CGM (Optional)'}
          </h2>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          {/* Progress Indicator */}
          <div className="flex items-center gap-2 mt-4">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`h-2 flex-1 rounded-full transition-all ${
                  step <= currentStep ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {currentStep === 1 && <Step1Welcome />}
          {currentStep === 2 && (
            <Step2Targets
              targetMin={targetMin}
              targetMax={targetMax}
              onMinChange={setTargetMin}
              onMaxChange={setTargetMax}
            />
          )}
          {currentStep === 3 && <Step3CGM />}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <button
            onClick={handleSkip}
            className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {currentStep < 3 ? 'Skip for now' : 'Skip'}
          </button>

          <button
            onClick={handleNext}
            disabled={submitting}
            className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Saving...' : currentStep < 3 ? 'Next' : 'Get Started'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Step 1: Welcome
function Step1Welcome() {
  return (
    <div className="space-y-4">
      <p className="text-gray-700 text-base leading-relaxed">
        You've been selected for our <strong>Metabolic Insights Beta</strong>!
        This powerful new feature helps you understand how meals affect your glucose levels.
      </p>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">What you can do:</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start gap-2">
            <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span><strong>Log meals</strong> with photos and get AI-powered nutrition analysis</span>
          </li>
          <li className="flex items-start gap-2">
            <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span><strong>Track glucose patterns</strong> and see meal correlations</span>
          </li>
          <li className="flex items-start gap-2">
            <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span><strong>Get personalized insights</strong> with AI-powered predictions (coming soon)</span>
          </li>
          <li className="flex items-start gap-2">
            <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span><strong>Connect your CGM</strong> for automatic glucose tracking</span>
          </li>
        </ul>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <p className="text-xs text-amber-800">
          <strong>Medical Disclaimer:</strong> This is not medical advice. These insights are informational trends only.
          Consult your doctor for medical decisions.
        </p>
      </div>
    </div>
  );
}

// Step 2: Set Glucose Targets
interface Step2TargetsProps {
  targetMin: string;
  targetMax: string;
  onMinChange: (value: string) => void;
  onMaxChange: (value: string) => void;
}

function Step2Targets({ targetMin, targetMax, onMinChange, onMaxChange }: Step2TargetsProps) {
  return (
    <div className="space-y-4">
      <p className="text-gray-700 text-base leading-relaxed">
        Set your target glucose range (optional). We'll use these to highlight when your glucose is outside your target.
      </p>

      <div className="space-y-4">
        {/* Target Min */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Target Minimum (mg/dL)
          </label>
          <input
            type="number"
            value={targetMin}
            onChange={(e) => onMinChange(e.target.value)}
            placeholder="70"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
          />
        </div>

        {/* Target Max */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Target Maximum (mg/dL)
          </label>
          <input
            type="number"
            value={targetMax}
            onChange={(e) => onMaxChange(e.target.value)}
            placeholder="180"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-sm text-gray-700">
          <strong>Typical ranges:</strong>
        </p>
        <ul className="text-sm text-gray-600 mt-2 space-y-1">
          <li>• Type 1/Type 2 Diabetes: 70-180 mg/dL</li>
          <li>• Prediabetes: 70-140 mg/dL</li>
          <li>• General health: 70-120 mg/dL</li>
        </ul>
      </div>

      <p className="text-xs text-gray-500 italic">
        You can always change these later in your settings.
      </p>
    </div>
  );
}

// Step 3: CGM Connection
function Step3CGM() {
  return (
    <div className="space-y-4">
      <p className="text-gray-700 text-base leading-relaxed">
        Connect your Continuous Glucose Monitor (CGM) to automatically sync glucose readings.
      </p>

      <div className="space-y-3">
        {/* Dexcom */}
        <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-not-allowed opacity-50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
              <span className="text-xl font-bold text-gray-600">D</span>
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900">Dexcom</h4>
              <p className="text-xs text-gray-500">G6, G7, and ONE</p>
            </div>
            <span className="text-xs text-gray-500 font-medium">Coming Soon</span>
          </div>
        </div>

        {/* FreeStyle Libre */}
        <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-not-allowed opacity-50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
              <span className="text-xl font-bold text-gray-600">F</span>
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900">FreeStyle Libre</h4>
              <p className="text-xs text-gray-500">Libre 2 and Libre 3</p>
            </div>
            <span className="text-xs text-gray-500 font-medium">Coming Soon</span>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Manual entry available now:</strong> You can manually log glucose readings
          while we work on CGM integrations.
        </p>
      </div>

      <p className="text-xs text-gray-500 italic">
        CGM integration is coming soon! You'll be notified when it's available.
      </p>
    </div>
  );
}
