'use client'

import { useEffect } from 'react'

interface GlucoseKeypadProps {
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
}

/**
 * GlucoseKeypad - 3x4 numeric keypad for glucose entry
 *
 * Features:
 * - Large touch targets (64x64px buttons)
 * - Visual feedback on tap (scale animation)
 * - Number keys (1-9, 0)
 * - Backspace key
 * - Clear key
 * - Disabled state when value reaches max (3 digits)
 * - Keyboard support (0-9, Backspace, Escape)
 * - WCAG 2.1 AA compliant
 */
export default function GlucoseKeypad({ value, onValueChange, disabled = false }: GlucoseKeypadProps) {
  // Handle keyboard input
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (disabled) return

      // Number keys
      if (event.key >= '0' && event.key <= '9') {
        event.preventDefault()
        handleNumberPress(event.key)
      }
      // Backspace
      else if (event.key === 'Backspace') {
        event.preventDefault()
        handleBackspace()
      }
      // Escape = Clear
      else if (event.key === 'Escape') {
        event.preventDefault()
        handleClear()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [value, disabled])

  function handleNumberPress(num: string) {
    // Max 3 digits (e.g., 600)
    if (value.length >= 3) return

    // Prevent leading zeros (except for "0" itself)
    if (value === '0' && num !== '0') {
      onValueChange(num)
    } else if (value === '' || value !== '0') {
      onValueChange(value + num)
    }
  }

  function handleBackspace() {
    if (value.length > 0) {
      onValueChange(value.slice(0, -1))
    }
  }

  function handleClear() {
    onValueChange('')
  }

  // Keypad button component
  function KeypadButton({
    label,
    onClick,
    isOperator = false,
    ariaLabel,
  }: {
    label: string
    onClick: () => void
    isOperator?: boolean
    ariaLabel?: string
  }) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={ariaLabel || label}
        className={`
          w-full aspect-square rounded-2xl font-semibold text-2xl
          transition-all duration-150 active:scale-95
          disabled:opacity-40 disabled:cursor-not-allowed
          focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none
          ${
            isOperator
              ? 'bg-gray-200 text-gray-700 hover:bg-gray-300 active:bg-gray-400'
              : 'bg-white text-gray-900 hover:bg-gray-50 active:bg-gray-100 shadow-md hover:shadow-lg border border-gray-200'
          }
        `}
      >
        {label}
      </button>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto">
      {/* Row 1: 1, 2, 3 */}
      <KeypadButton label="1" onClick={() => handleNumberPress('1')} />
      <KeypadButton label="2" onClick={() => handleNumberPress('2')} />
      <KeypadButton label="3" onClick={() => handleNumberPress('3')} />

      {/* Row 2: 4, 5, 6 */}
      <KeypadButton label="4" onClick={() => handleNumberPress('4')} />
      <KeypadButton label="5" onClick={() => handleNumberPress('5')} />
      <KeypadButton label="6" onClick={() => handleNumberPress('6')} />

      {/* Row 3: 7, 8, 9 */}
      <KeypadButton label="7" onClick={() => handleNumberPress('7')} />
      <KeypadButton label="8" onClick={() => handleNumberPress('8')} />
      <KeypadButton label="9" onClick={() => handleNumberPress('9')} />

      {/* Row 4: Clear, 0, Backspace */}
      <KeypadButton
        label="C"
        onClick={handleClear}
        isOperator
        ariaLabel="Clear"
      />
      <KeypadButton label="0" onClick={() => handleNumberPress('0')} />
      <KeypadButton
        label="⌫"
        onClick={handleBackspace}
        isOperator
        ariaLabel="Backspace"
      />
    </div>
  )
}
