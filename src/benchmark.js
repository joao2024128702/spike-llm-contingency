import dotenv from 'dotenv'
import { SYSTEM_PROMPT } from './systemPrompt.js'
import { DATASET } from './dataset.js'
import { validateConstraints, evaluateAccuracy } from './validator.js'

dotenv.config()

/**
 * Available models based on active Groq and Gemini quotas.
 */
const PROVIDERS = [
  {
    id: 'groq-gpt-oss-20b',
    name: 'Groq GPT-OSS 20B (Fast)',
    type: 'openai-compatible',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    key: process.env.GROQ_API_KEY,
    model: 'openai/gpt-oss-20b',
    temperature: 0.1,
  },
  {
    id: 'groq-qwen-27b',
    name: 'Groq Qwen 3.8 27B (Alternative)',
    type: 'openai-compatible',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    key: process.env.GROQ_API_KEY,
    model: 'qwen/qwen3.8-27b',
    temperature: 0.1,
  },
  {
    id: 'groq-gpt-oss-120b',
    name: 'Groq GPT-OSS 120B (High Quality)',
    type: 'openai-compatible',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    key: process.env.GROQ_API_KEY,
    model: 'openai/gpt-oss-120b',
    temperature: 0.1,
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Google Gemini 1.5 Flash',
    type: 'gemini',
    url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
    key: process.env.GEMINI_API_KEY,
    temperature: 0.1,
  },
]

async function callProvider(provider, prompt) {
  const t0 = performance.now()

  if (provider.type === 'gemini') {
    if (!provider.key || provider.key === 'your_gemini_api_key_here') {
      return { status: 401, latencyMs: 0, rawOutput: null, error: 'Chave Gemini não configurada' }
    }
    const fullUrl = `${provider.url}?key=${provider.key}`
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: provider.temperature,
          responseMimeType: 'application/json',
        },
      }),
    })

    const latencyMs = Math.round(performance.now() - t0)
    const status = response.status
    if (!response.ok) {
      const errText = await response.text()
      return { status, latencyMs, rawOutput: null, error: errText }
    }

    const data = await response.json()
    const rawOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text || null
    return { status, latencyMs, rawOutput, error: null }
  }

  // OpenAI-compatible format (Groq)
  if (!provider.key) throw new Error(`Missing API key for ${provider.name} in .env`)
  const response = await fetch(provider.url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${provider.key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: provider.model,
      temperature: provider.temperature,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
    }),
  })

  const latencyMs = Math.round(performance.now() - t0)
  const status = response.status
  if (!response.ok) {
    const errText = await response.text()
    return { status, latencyMs, rawOutput: null, error: errText }
  }

  const data = await response.json()
  const rawOutput = data?.choices?.[0]?.message?.content || null
  return { status, latencyMs, rawOutput, error: null }
}

function computePercentile(numbers, p) {
  if (numbers.length === 0) return 0
  const sorted = [...numbers].sort((a, b) => a - b)
  const idx = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, idx)]
}

async function runBenchmark() {
  console.log('='.repeat(80))
  console.log('🚀 SPIKE #67: CONTINGENCY BENCHMARK OF ALTERNATIVE LLM MODELS')
  console.log(`📊 Evaluating ${DATASET.length} prompts across configured providers`)
  console.log('='.repeat(80))

  const summary = []

  for (const provider of PROVIDERS) {
    console.log(`\n▶️ Testing: ${provider.name}...`)
    if (!provider.key || provider.key === 'your_gemini_api_key_here') {
      console.log(`⚠️ Skipped: API key not set or invalid in .env`)
      continue
    }

    const latencies = []
    let validJsonCount = 0
    let validSchemaCount = 0
    let totalAccuracy = 0
    let errorsCount = 0

    for (const testCase of DATASET) {
      try {
        const result = await callProvider(provider, testCase.prompt)
        if (result.status !== 200 || !result.rawOutput) {
          errorsCount++
          process.stdout.write(`❌[${testCase.id}] `)
          continue
        }

        latencies.push(result.latencyMs)
        const validation = validateConstraints(result.rawOutput)
        if (validation.validJson) validJsonCount++
        if (validation.schemaValid) {
          validSchemaCount++
          const acc = evaluateAccuracy(validation.data, testCase.expected)
          totalAccuracy += acc
          process.stdout.write(`✅[${testCase.id}:${acc}%] `)
        } else {
          process.stdout.write(`⚠️[${testCase.id}:schema] `)
        }
      } catch (err) {
        errorsCount++
        process.stdout.write(`🔥[${testCase.id}:err] `)
      }
    }

    console.log('\n')

    const runsCount = latencies.length || 1
    const avgLatency = Math.round(latencies.reduce((a, b) => a + b, 0) / runsCount)
    const p95Latency = computePercentile(latencies, 95)
    const avgAccuracy = Math.round(totalAccuracy / DATASET.length)
    const jsonValidPct = Math.round((validJsonCount / DATASET.length) * 100)

    summary.push({
      Provider: provider.name,
      'Valid JSON': `${jsonValidPct}%`,
      'Avg Accuracy': `${avgAccuracy}%`,
      'Avg Latency': `${avgLatency} ms`,
      'P95 Latency': `${p95Latency} ms`,
      Errors: errorsCount,
    })
  }

  console.log('\n' + '='.repeat(80))
  console.log('📊 FINAL BENCHMARK SUMMARY TABLE')
  console.log('='.repeat(80))
  console.table(summary)
}

runBenchmark().catch(console.error)
