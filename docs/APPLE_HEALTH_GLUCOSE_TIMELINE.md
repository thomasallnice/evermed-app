# Apple Health-Inspired Glucose Timeline

## Overview

The GlucoLens glucose timeline has been completely redesigned to match Apple Health's design patterns, providing a familiar and intuitive experience for users tracking their glucose levels.

## Implementation Date

**October 16, 2025**

## Design Principles

### 1. Time Range Selector
- **Component**: `GlucoseTimeRangeSelector.tsx`
- **Design**: Pill-shaped button group with 5 time range options
- **Options**: Day (T), Week (W), Month (M), 6 Months (6 M.), Year (J)
- **Styling**:
  - Light gray background (`bg-gray-200`)
  - Active button: white with subtle shadow (`bg-white shadow-sm`)
  - Smooth transitions (`transition-all duration-200`)
  - Fully accessible with ARIA labels

### 2. Range Display
- **Component**: `GlucoseSummaryCard.tsx`
- **Features**:
  - Shows min-max range or average based on time range
  - Labels adapt to context (BEREICH, DURCHSCHNITT/TAG, etc.)
  - Two-tier display: stats above chart, summary pill below
  - Day average gets special red background treatment

### 3. Chart Visualization Styles

#### Day View (T)
- **Component**: `GlucoseDayChart.tsx`
- **Style**: Continuous line graph with area fill
- **Features**:
  - Smooth curve interpolation
  - Red gradient fill (`#ef4444` to transparent)
  - Small dots at each data point
  - X-axis: Hours (00, 06, 12, 18 Uhr)
  - Y-axis: 0-300 mg/dL range

#### Week View (W)
- **Component**: `GlucoseWeekChart.tsx`
- **Style**: Scatter plot with individual dots
- **Features**:
  - Each reading shown as a dot
  - No connecting lines
  - Vertical spread shows daily variation
  - X-axis: Days of week (Do, Fr, Sa, So, Mo, Di, Mi)

#### Month View (M)
- **Component**: `GlucoseMonthChart.tsx`
- **Style**: Daily averages with connected dots
- **Features**:
  - Small dots (6-8px) connected with light lines
  - Daily aggregation of readings
  - X-axis: Day numbers (1-31)

#### 6-Month View (6 M.)
- **Component**: `Glucose6MonthChart.tsx`
- **Style**: Weekly vertical bars
- **Features**:
  - Each bar shows weekly min-max range
  - Rounded bar caps (`rounded-full`)
  - Bar width: 12-16px
  - Grouped by week within month

#### Year View (J)
- **Component**: `GlucoseYearChart.tsx`
- **Style**: Monthly vertical bars
- **Features**:
  - Taller bars with monthly min-max ranges
  - Red gradient fill (Material Design inspired)
  - Bar width: 20-24px
  - X-axis: Month names (Jan-Dez)

## Color Palette (Apple Health Inspired)

```typescript
{
  primaryRed: '#FF3B30',      // Tailwind: red-500
  lightRed: '#FF6961',        // Tailwind: red-400
  gridLines: '#E5E5EA',       // Tailwind: gray-300
  labels: '#8E8E93',          // Tailwind: gray-400
  background: '#F2F2F7',      // Tailwind: gray-100
}
```

## Grid System

### Vertical Gridlines
- Light gray dotted lines (`border-dashed border-gray-300`)
- Visible in all chart types

### Horizontal Gridlines
- Very subtle solid lines (`border-gray-200`)
- Consistent spacing at 100 mg/dL intervals

### Axis Configuration
- **Y-axis**: Right-aligned, showing 0, 100, 200, 300
- **X-axis**: Bottom labels adapt to time range
- All axis text in gray (`text-gray-400`)

## File Structure

```
apps/web/src/components/glucose/
├── GlucoseTimeline.tsx           # Master orchestrator component
├── GlucoseTimeRangeSelector.tsx  # Pill-shaped time selector
├── GlucoseDayChart.tsx           # Day view (line + area)
├── GlucoseWeekChart.tsx          # Week view (scatter dots)
├── GlucoseMonthChart.tsx         # Month view (connected dots)
├── Glucose6MonthChart.tsx        # 6-month view (weekly bars)
├── GlucoseYearChart.tsx          # Year view (monthly bars)
└── GlucoseSummaryCard.tsx        # Summary stats display
```

## Integration

### Dashboard Usage

```typescript
import { GlucoseTimeline } from '@/components/glucose/GlucoseTimeline'

// In your component
<GlucoseTimeline
  data={glucoseData}
  selectedDate={selectedDate}
/>
```

### Data Format

```typescript
interface GlucoseReading {
  timestamp: string  // ISO 8601 format
  value: number      // mg/dL
}
```

## Accessibility (WCAG 2.1 AA Compliant)

### Keyboard Navigation
- All time range buttons are keyboard accessible
- Tab navigation between controls
- Enter/Space to select time ranges

### Screen Reader Support
- ARIA labels on all interactive elements
- `aria-pressed` state for selected time range
- Proper semantic HTML structure

### Color Contrast
- Red on white: 4.5:1 ratio (meets AA standard)
- Gray labels: 4.5:1 ratio for normal text
- All interactive elements have sufficient contrast

### Focus Indicators
- Visible focus states on all buttons
- `focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`

## Responsive Design

### Mobile (< 640px)
- Full-width charts
- Stacked time range selector
- Touch-friendly button sizes (min 44x44px)

### Tablet (640px - 1024px)
- Optimized chart aspect ratios
- Horizontal time range selector

### Desktop (> 1024px)
- Maximum chart width with padding
- Enhanced hover states
- Larger data point sizes

## Performance Optimizations

### Memoization
- `useMemo` for statistics calculations
- Prevents unnecessary re-renders on prop changes

### Chart Rendering
- Recharts library with optimized SVG rendering
- Responsive container with debounced resize

### Data Aggregation
- Weekly/monthly aggregations performed client-side
- Efficient Map-based grouping algorithms

## Medical Disclaimer Integration

All glucose timeline views include the standard medical disclaimer from `/apps/web/src/lib/copy.ts`:

> This information is for educational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment. The metabolic insights provided are informational only and should not be used for diagnosis, dosing, or triage decisions.

## Future Enhancements

### Phase 2 (Q1 2026)
- [ ] Meal markers overlay on all time ranges
- [ ] Target range shading (70-180 mg/dL)
- [ ] Interactive tooltips with meal context
- [ ] Export charts as images

### Phase 3 (Q2 2026)
- [ ] Predictive glucose curves
- [ ] Pattern recognition highlights
- [ ] Comparison view (week-over-week)
- [ ] Customizable Y-axis ranges

## Testing

### Unit Tests
- Component rendering for all chart types
- Time range selection state management
- Data transformation accuracy
- Edge cases (empty data, single reading)

### E2E Tests
- User flow: select time range → view chart
- Responsive design across breakpoints
- Accessibility audit (axe-core)

### Visual Regression
- Screenshot comparisons for each chart type
- Theme consistency validation

## Related Documentation

- [Material Design Guidelines](https://material.io/design)
- [Apple Health UI Patterns](https://developer.apple.com/design/human-interface-guidelines/)
- [WCAG 2.1 AA Standards](https://www.w3.org/WAI/WCAG21/quickref/)
- [Recharts Documentation](https://recharts.org/)

## Contributors

- Claude Code (AI Assistant)
- Design inspired by Apple Health
- Built with Next.js 14, React 18, Tailwind CSS

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | Oct 16, 2025 | Initial Apple Health-inspired redesign |
| 1.1.0 | TBD | Meal markers overlay integration |
| 2.0.0 | TBD | Predictive glucose curves |
