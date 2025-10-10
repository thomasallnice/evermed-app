/**
 * FeatureFlagsSection - Feature Flags Management UI
 *
 * Allows admins to toggle feature flags and adjust rollout percentages.
 * Client component with optimistic UI updates.
 */

'use client';

import React, { useState, useEffect } from 'react';

interface FeatureFlag {
  id: string;
  name: string;
  enabled: boolean;
  rolloutPercent: number;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function FeatureFlagsSection() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFlags();
  }, []);

  async function fetchFlags() {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/feature-flags');
      if (!res.ok) throw new Error('Failed to fetch feature flags');
      const data = await res.json();
      setFlags(data.flags);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  async function updateFlag(
    name: string,
    enabled: boolean,
    rolloutPercent: number
  ) {
    try {
      // Optimistic update
      setFlags((prev) =>
        prev.map((f) =>
          f.name === name ? { ...f, enabled, rolloutPercent } : f
        )
      );

      const res = await fetch('/api/admin/feature-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, enabled, rolloutPercent }),
      });

      if (!res.ok) {
        throw new Error('Failed to update feature flag');
      }

      const data = await res.json();
      // Update with server response
      setFlags((prev) =>
        prev.map((f) => (f.name === name ? data.flag : f))
      );
    } catch (err) {
      console.error('Error updating feature flag:', err);
      // Revert optimistic update
      await fetchFlags();
      alert('Failed to update feature flag');
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-200">
        <p className="text-gray-500">Loading feature flags...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-md border border-red-200">
        <p className="text-red-600">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-200">
      {flags.length === 0 ? (
        <p className="text-gray-500">No feature flags found</p>
      ) : (
        <div className="space-y-4">
          {flags.map((flag) => (
            <FeatureFlagRow
              key={flag.id}
              flag={flag}
              onUpdate={updateFlag}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface FeatureFlagRowProps {
  flag: FeatureFlag;
  onUpdate: (name: string, enabled: boolean, rolloutPercent: number) => void;
}

function FeatureFlagRow({ flag, onUpdate }: FeatureFlagRowProps) {
  const [rolloutPercent, setRolloutPercent] = useState(flag.rolloutPercent);

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
      {/* Header Row */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-gray-900">{flag.name}</h4>
          {flag.description && (
            <p className="text-xs text-gray-600 mt-1">{flag.description}</p>
          )}
        </div>

        {/* Toggle Switch */}
        <button
          onClick={() =>
            onUpdate(flag.name, !flag.enabled, rolloutPercent)
          }
          className={`
            relative inline-flex h-6 w-11 items-center rounded-full transition-colors
            ${flag.enabled ? 'bg-blue-600' : 'bg-gray-300'}
          `}
          aria-label={`Toggle ${flag.name}`}
        >
          <span
            className={`
              inline-block h-4 w-4 transform rounded-full bg-white transition-transform
              ${flag.enabled ? 'translate-x-6' : 'translate-x-1'}
            `}
          />
        </button>
      </div>

      {/* Rollout Percentage Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-gray-700">
            Rollout Percentage
          </label>
          <span className="text-xs font-semibold text-blue-600">
            {rolloutPercent}%
          </span>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={rolloutPercent}
            onChange={(e) => {
              const newValue = parseInt(e.target.value, 10);
              setRolloutPercent(newValue);
            }}
            onMouseUp={(e) => {
              const newValue = parseInt((e.target as HTMLInputElement).value, 10);
              onUpdate(flag.name, flag.enabled, newValue);
            }}
            className="flex-1 h-2 bg-gray-200 rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4
              [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:cursor-pointer"
          />
        </div>

        {/* Estimated Reach */}
        <p className="text-xs text-gray-500">
          {flag.enabled
            ? `Visible to ${rolloutPercent}% of users`
            : 'Disabled for all users'}
        </p>
      </div>

      {/* Metadata */}
      <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
        <span>Last updated: {new Date(flag.updatedAt).toLocaleDateString()}</span>
      </div>
    </div>
  );
}
