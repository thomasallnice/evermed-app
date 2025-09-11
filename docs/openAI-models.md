Here’s a ready-to-drop-in **openAI-models.md** that briefs GPT-5 apps on model choice, API usage, and web-app best practices. I kept it practical and opinionated.

---
  

> **Purpose.** This doc tells our code _exactly_ how to use OpenAI’s GPT-5 family in production: which model to pick, how to call the API, how to stream, return structured JSON, cache prompts, and keep costs/latency under control. It also includes minimal, copy-pasteable code for Node/JS and Python.

---

## **1) TL;DR Playbook (What to use when)**

- **Default for UX, speed, and cost:** gpt-5-mini
    
    Use for most UI flows, chat, search, summarization, routing, and lightweight tool use. It’s fast, cheap, and strong at coding + writing. 
    
- **When quality really matters or tasks are complex:** gpt-5
    
    Use for multi-step planning, complex coding across repos, critical reasoning, and long-context tasks. 400k total context (≈272k input + 128k output). 
    
- **For ultra-low latency / bulk tasks:** gpt-5-nano
    
    Use for extraction, short rewrites, classification, webhook guards. Combine with **structured outputs** for reliability. 
    
- **Thinking variants (opt-in):** gpt-5-thinking (+ mini/nano, Pro in ChatGPT)
    
    Use only when deeper chain-of-thought pays off; they cost more and add latency. Keep a router that escalates to thinking models _only_ on hard problems. 
    
- **Realtime voice agents:** Use the **Realtime API** with gpt-realtime (WebRTC/WebSocket). 
    

---

## **2) Model catalog (high-level)**

|**Model**|**Best for**|**Context window**|**Notes**|
|---|---|---|---|
|gpt-5|Highest quality, multi-step tool use, complex coding, long-context synthesis|**~400k total** (≈272k in, 128k out)|New **verbosity** param; supports **minimal reasoning** mode; strong at front-end generation.|
|gpt-5-mini|Default production workloads; chat UX; RAG; summarization; coding w/ speed|~400k total|Best price/perf default; keep latency tight with streaming + prompt caching.|
|gpt-5-nano|Mass inference; extraction; classification; guards|~400k total|Pair with **Structured Outputs** for type-safe JSON.|
|gpt-5-thinking (+ mini, nano)|Hard problems where deeper reasoning pays off|Long|Route in selectively; maintain SLAs.|
|gpt-realtime|Production voice agents (SIP/WebRTC), low-latency speech-to-speech|N/A|New Realtime API supports phone calls (SIP), image input, remote MCP tools.|

> **Pricing (indicative):** The GPT-5 page lists per-million-token pricing for gpt-5, gpt-5-mini, and gpt-5-nano. Always check current pricing before deploying. 

---

## **3) API: use the** 

## **Responses API**

##  **(recommended)**

  

**Why:** It’s stateful, tool-aware, multimodal, and streams via SSE. It also lets us pass previous_response_id to reuse reasoning context between calls (lower cost, better agents). 

  

### **3.1 Minimal calls**

  

**Node / TypeScript**

```
import OpenAI from "openai";
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const resp = await client.responses.create({
  model: "gpt-5-mini",
  input: "Summarize the key points in 3 bullets."
});

// Safe extraction (output can be multimodal):
const text = resp.output?.flatMap(o => o.content)
  ?.filter(c => "text" in c)
  ?.map(c => (c as any).text)
  ?.join("\n");
console.log(text);
```

**Python**

```
from openai import OpenAI
client = OpenAI()

resp = client.responses.create(
    model="gpt-5-mini",
    input="Summarize the key points in 3 bullets."
)

text = "".join(
    getattr(chunk, "text", "")
    for item in resp.output
    for chunk in getattr(item, "content", [])
    if hasattr(chunk, "text")
)
print(text)
```

**Notes**

- The Responses API keeps conversation state and allows previous_response_id to branch or continue threads without manually re-packing history. 
    

  

### **3.2 Streaming (SSE)**

  

Set stream: true and consume **Server-Sent Events** for fast TTFB.

(Do this on the server and relay to the browser.) 

  

**Node route (Express)**

```
app.post("/api/ai", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const { prompt } = req.body;
  const stream = await client.responses.create({
    model: "gpt-5-mini",
    input: prompt,
    stream: true,
  });

  for await (const event of stream) {
    if (event.type === "response.output_text.delta") {
      res.write(`data: ${event.delta}\n\n`);
    }
    if (event.type === "response.completed") break;
  }
  res.end();
});
```

(Exact event names may vary—follow the API reference for the response.* event stream.) 

---

## **4) Structured Outputs (type-safe JSON)**

  

Use **Structured Outputs** to _guarantee_ schema-conformant JSON—no brittle regex/parsers. This can be used via response_format: { type: "json_schema", json_schema: {...} } or via function tools with strict: true. 

  

**Example (Node)**

```
const resp = await client.responses.create({
  model: "gpt-5-nano",
  input: "Extract the customer info.",
  response_format: {
    type: "json_schema",
    json_schema: {
      name: "CustomerRecord",
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          email: { type: "string", format: "email" },
          consent: { type: "boolean" }
        },
        required: ["name","email","consent"]
      },
      strict: true
    }
  }
});

const data = resp.output[0].content[0].text; // JSON string; parse safely
```

**When to use:** Forms, extraction, database writes, guardrails, dashboards.

---

## **5) Tool / Function calling (agentic flows)**

  

Pass tools via tools: [...]. Keep **clear names and descriptions**, and use JSON Schema for arguments. Put usage criteria in the tool description (e.g., when _not_ to call). 

```
const resp = await client.responses.create({
  model: "gpt-5",
  input: "Find the doc and summarize it.",
  tools: [{
    type: "function",
    name: "fetch_url",
    description: "Fetch a URL (only if user asked to retrieve external content).",
    parameters: {
      type: "object",
      properties: { url: { type: "string", format: "uri" } },
      required: ["url"],
      additionalProperties: false
    }
  }]
  // tool_choice: "auto" // let the model decide by default
});
```

---

## **6) Reasoning & verbosity controls (GPT-5 specifics)**

- **reasoning_effort**: set to "minimal" for extraction/formatting; default/medium for normal tasks; escalate when tasks are hard. This reduces latency and cost when deep thinking isn’t required. 
    
- **verbosity**: "low" | "medium" | "high" to control _final_ answer length (not the thinking length). Prefer this over re-prompting style. 
    

```
await client.responses.create({
  model: "gpt-5-mini",
  input: "One-paragraph summary for execs.",
  reasoning: { effort: "minimal" },
  text: { verbosity: "low" }
});
```

---

## **7) Long-context tips (400k total)**

- Split very large inputs into **sections** with clear headings; reference them by ID in the prompt (“use only sections #3 and #7”).
    
- Prefer **citations + snippets** over dumping whole documents.
    
- Use **previous_response_id** to reuse prior reasoning across steps instead of re-sending the full context. 
    

---

## **8) Prompt Caching (reduce cost & latency)**

- **What it does:** recently-seen input tokens (e.g., system prompt, tool specs) get discounted & faster.
    
- **How to use:** keep stable, identical system/developer text; pass a stable user identifier and use the **prompt_cache_key** knob to maximize hit rates. Avoid tiny prompt edits. 
    

  

> Tip: Cache the _long_ parts (policies, style guides, tool schemas). Put request-specific details after the cached block.

---

## **9) Realtime API (voice agents)**

  

For low-latency speech-to-speech agents (support/SIP phone), use gpt-realtime over WebRTC/WebSockets. Offload TTS/STT—model handles audio end-to-end; lower latency and more natural prosody. 

---

## **10) Web-app integration patterns (practical)**

  

**Security**

- Keep the **API key server-side** only; expose a thin /api/* layer to the browser.
    
- Enforce auth & quotas on your endpoints; scrub logs of user data.
    

  

**Streaming UX**

- Always stream (stream: true) for chat and editor-style features.
    
- Show a typing indicator + partial tokens; fall back to non-streamed on error. 
    

  

**Model routing**

- Start with gpt-5-mini; escalate to gpt-5 (or -thinking) when a **confidence/complexity check** triggers (e.g., tool chain depth > N, or long-context need). 
    

  

**Responses API state**

- Use previous_response_id to avoid re-sending long context; cheaper and faster agent loops. 
    

  

**Libraries / SDKs**

- Official OpenAI SDKs (JS & Python) are the default; the **Cookbook** has production patterns and examples. 
    

  

**Agents SDK**

- For lightweight agent apps with tools, the **Agents SDK** gives you a thin, idiomatic layer. 
    

  

**Testing & evals**

- Use **Evals** to detect prompt regressions and validate structured outputs end-to-end. Automate before shipping. 
    

---

## **11) Cost & latency: concrete knobs**

1. **Pick the smallest model that passes your evals** (nano → mini → gpt-5).
    
2. **Reasoning**: set effort: "minimal" unless you _need_ deep thinking. 
    
3. **Verbosity**: set low for UI glue, high for audits/teaching. 
    
4. **Prompt caching**: keep prompts stable; use prompt_cache_key. 
    
5. **Streaming**: always on for user-facing text flows. 
    

  

> **Reference pricing:** see the GPT-5 page for current per-million-token rates (e.g., gpt-5, -mini, -nano). Don’t hard-code—read from config. 

---

## **12) Copy-paste snippets**

  

### **A) Node: Structured Outputs + streaming**

```
import OpenAI from "openai";
import { PassThrough } from "stream";
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req, res) {
  const { input } = await req.json();

  const stream = await client.responses.create({
    model: "gpt-5-nano",
    input,
    stream: true,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "TodoItems",
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            items: {
              type: "array",
              items: { type: "string" },
              minItems: 1
            }
          },
          required: ["items"]
        },
        strict: true
      }
    },
    text: { verbosity: "low" },
    reasoning: { effort: "minimal" }
  });

  const pt = new PassThrough();
  res.setHeader("Content-Type", "text/event-stream");
  stream.on("event", (e) => {
    if (e.type === "response.output_text.delta") {
      pt.write(`data: ${e.delta}\n\n`);
    }
    if (e.type === "response.completed") {
      pt.end();
    }
  });
  stream.on("error", () => pt.end());
  pt.pipe(res);
}
```

(Streaming via SSE; event names per API reference.) 

  

### **B) Python: tool call + previous reasoning reuse**

```
from openai import OpenAI
client = OpenAI()

# First step (plan)
r1 = client.responses.create(
    model="gpt-5-mini",
    input="Plan: fetch https://example.com and summarize the H1 section.",
    tools=[{
        "type": "function",
        "name": "fetch_url",
        "description": "Fetch a URL (only if user asked to retrieve external content).",
        "parameters": {
            "type": "object",
            "properties": { "url": {"type":"string","format":"uri"} },
            "required": ["url"],
            "additionalProperties": False
        }
    }],
    text={"verbosity": "low"},
    reasoning={"effort": "minimal"}
)

# Second step (reuse prior reasoning/state, cheaper than resending the whole plan)
r2 = client.responses.create(
    model="gpt-5",
    input="Execute plan and return bullet summary.",
    previous_response_id=r1.id
)
```

(Reusing previous_response_id improves agent loops.) 

---

## **13) Realtime (voice) quick start checklist**

- Use gpt-realtime over **WebRTC** for lowest latency and direct audio I/O.
    
- Can place calls over **SIP**; supports image input and remote MCP tools.
    
- Stream transcription and TTS through the same session; no chained STT/TTS. 
    

---

## **14) References**

- **Overview / Quickstart / Libraries**: platform docs & SDKs. 
    
- **Models & pricing (GPT-5 family)**: model + pricing highlights. 
    
- **GPT-5 for developers** (context limits, quality): 
    
- **Responses API** (stateful, tools, previous_response_id): 
    
- **Structured Outputs** (JSON Schema, strict mode): 
    
- **Prompt caching / prompt_cache_key**: API reference. 
    
- **Verbosity & minimal reasoning** (GPT-5 params): 
    
- **Agents SDK**: 
    
- **Realtime API / voice agents**: 
    

---

### **Final opinionated defaults (use unless a test proves otherwise)**

- **Model:** gpt-5-mini → escalate to gpt-5 only when needed. 
    
- **API:** Responses API with streaming; **Structured Outputs** on anything that touches storage/UI. 
    
- **Controls:** reasoning.effort="minimal" + text.verbosity="low" for UI glue. 
    
- **Cost:** Use **prompt caching** and keep prompts stable; reuse previous_response_id. 
    

---

If you want this saved as a separate file in a project folder, tell me the path and I’ll output it formatted for your repo.