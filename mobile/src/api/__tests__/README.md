# Mobile API Tests

This directory contains comprehensive test suites for the mobile app's API client modules.

## Test Files

### `glucose-session.spec.ts`

**Purpose**: Tests session retry logic in the glucose API client to ensure reliable Apple Health sync even during long-running operations.

**Background**: During Apple Health sync of 210+ glucose readings, the Supabase session token can expire mid-sync (typically after 36 readings), causing the entire sync to fail. The retry logic ensures sessions are automatically refreshed when they expire, with exponential backoff.

**Coverage**:

1. **Session Refresh Scenarios**
   - Success on first attempt (no retry needed)
   - Success on second attempt (1s delay before retry)
   - Success on third attempt (1s + 2s delays)
   - Failure after all 3 retries exhausted

2. **Exponential Backoff Timing**
   - Validates delays between retries: 1s, 2s, 4s (2^n * 1000ms)
   - Uses fake timers to test timing without real delays

3. **Real-World Scenarios**
   - Session expiration during long Apple Health sync (152+ readings)
   - Concurrent reading submissions (batch manual entry)
   - Network errors (no retry, immediate failure)

4. **Integration with createGlucoseReading()**
   - Successful reading creation after session refresh
   - Graceful failure when session cannot be refreshed
   - Glucose value validation (20-600 mg/dL range)
   - API error handling (404, 401, 500 status codes)

5. **Medical Safety**
   - Preserves reading timestamps across retries (critical for accuracy)
   - Logs session diagnostics for production debugging
   - No data loss during retry cycles

**Performance Requirements**:
- Retries must use exponential backoff to avoid overwhelming the auth service
- Total retry time: ~3 seconds (1s + 2s) before final failure
- Session validation: p95 < 2s per attempt

**Medical Safety Considerations**:
- Timestamps must reflect actual reading time, not retry time
- All readings must succeed or fail atomically (no partial syncs)
- Diagnostic logging must not expose PHI (timestamps and errors only)

## Running Tests

```bash
# Run all mobile API tests
npm test mobile/src/api/__tests__

# Run specific test file
npx vitest run mobile/src/api/__tests__/glucose-session.spec.ts

# Run tests in watch mode
npx vitest mobile/src/api/__tests__/glucose-session.spec.ts
```

## Test Setup

**Mocking Strategy**:
- `supabase.auth.refreshSession()` - Mocked to simulate success/failure
- `global.fetch` - Mocked to simulate API responses
- Timers - Mocked with `vi.useFakeTimers()` to control delays

**Key Testing Patterns**:
1. Attach `.catch()` handlers immediately to prevent unhandled rejection warnings
2. Use `vi.advanceTimersByTimeAsync()` to control exponential backoff timing
3. Mock both session refresh and fetch to isolate retry logic
4. Test concurrent operations to validate real-world usage

## Future Test Coverage

- [ ] Test session refresh during meal photo upload (longer operations)
- [ ] Test session expiration in background sync workers
- [ ] Test retry logic for getGlucoseReadings() and deleteGlucoseReading()
- [ ] Test token refresh race conditions (multiple concurrent API calls)
