# Frontend Command

Starts the Next.js development server on port 3200 as a background task. If a server is already running on port 3200, it will be killed and restarted.

---

**YOU MUST EXECUTE THE FOLLOWING STEPS:**

1. Check for existing server on port 3200 and kill it if found:
```bash
lsof -ti:3200 | xargs kill -9 2>/dev/null || echo "No existing server on port 3200"
```

2. Start new frontend server on port 3200 in background:
```bash
PORT=3200 npm run dev 2>&1 &
```

3. Wait 2 seconds for server to start:
```bash
sleep 2
```

4. Check server output with BashOutput to verify it's running

5. Inform user:
   - ✅ Server started successfully on http://localhost:3200
   - Provide bash_id for monitoring
   - Remind user they can check output with BashOutput tool

---

## Usage

```bash
/frontend
```

## What it does

1. **Check for existing server**: Searches for processes using port 3200
2. **Kill existing server** (if found): Terminates the process gracefully
3. **Start new server**: Launches `npm run dev` on port 3200 in the background
4. **Background execution**: Server runs in background, allowing you to continue working
5. **Output monitoring**: Server output is available via BashOutput tool

## Implementation

The command:
- Detects processes using port 3200 with `lsof -ti:3200`
- Kills existing processes with `kill -9` if found
- Sets PORT environment variable to 3200
- Runs `npm run dev` in the background
- Returns the bash shell ID for monitoring

## Example

```
User: /frontend
Assistant: Starting frontend server on port 3200...
✓ Killed existing server on port 3200 (PID: 12345)
✓ Starting new frontend server...
✓ Server is starting in background (bash_id: abc123)
  Local: http://localhost:3200
```

## Monitoring

Check server output:
```bash
# View latest output
BashOutput(bash_id)

# Check if server is ready
# Look for "Ready in Xms" message
```

## Notes

- Port 3200 is used to avoid conflicts with other services (default Next.js uses 3000)
- Server runs in background - it won't block your workflow
- To stop the server, kill the background bash process
- Logs are available through BashOutput tool
