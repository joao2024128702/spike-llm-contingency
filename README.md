# Spike #67: Contingency Benchmark of Alternative LLM Models

Autonomous test harness to benchmark latency, rate limits, JSON extraction accuracy, and browser CORS feasibility across LLM providers for the ScheduleMaster academic timetable platform.

## Context & Objectives

ScheduleMaster uses an LLM to convert natural language student preferences (e.g., *"free Tuesdays, afternoon classes, and consecutive blocks"*) into a structured JSON constraint payload.

This spike evaluates alternative models to establish:
1. **Primary & Backup Model**: Is Groq LLaMA 3.1 8B still the optimal primary model? What is the best contingency fallback if Groq experiences rate limits or downtime?
2. **Stress & Burst Limits**: At what point does a rapid burst of requests trigger HTTP `429 Too Many Requests`?
3. **Extraction Accuracy**: Does the model output valid JSON respecting the schema without hallucinating shifts?
4. **Client-side Browser Execution**: Can the model be invoked directly from the React frontend without CORS blocks?

---

## Benchmark Metrics

| Metric | Description |
|---|---|
| **JSON Valid (%)** | Percentage of outputs returning valid, parsable JSON. |
| **Accuracy (%)** | Field-level accuracy against ground-truth expectations across 20 tiered prompts. |
| **Latency (Mean / P95)** | Round-trip request time in milliseconds (average and 95th percentile). |
| **1st 429 Error** | Request index in a 30-request burst where rate limiting is first encountered. |
| **Browser Feasible** | Whether the API allows direct browser CORS requests or requires a proxy. |

---

## Setup & Running

### 1. Install dependencies
```bash
npm install
```

### 2. Configure API Keys
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Add your free tier API keys:
- `GROQ_API_KEY`: [Groq Console](https://console.groq.com/keys)
- `GEMINI_API_KEY`: [Google AI Studio](https://aistudio.google.com/app/apikey)

### 3. Run Benchmark
```bash
# Run the 20-prompt extraction accuracy and latency benchmark
npm run benchmark

# Run the 30-burst stress test
npm run stress

# Run all suites
npm run all
```

---

## Repository Structure

```
├── src/
│   ├── systemPrompt.js   # Formal ScheduleMaster constraint extraction prompt
│   ├── dataset.js        # 20 tiered prompts (Simple, Medium, Complex, Adversarial)
│   ├── validator.js      # Zod schema validation and accuracy scoring
│   ├── benchmark.js      # Main benchmark runner across models
│   └── stressTest.js     # 30-request burst resilience tester
├── .env.example
├── package.json
└── README.md
```

## License
MIT - GPS 2026/27 Group 35 (DEIS - ISEC).
