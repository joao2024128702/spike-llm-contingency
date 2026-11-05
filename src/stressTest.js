import dotenv from 'dotenv'
import { SYSTEM_PROMPT } from './systemPrompt.js'

dotenv.config()

const TEST_PROMPT = 'Quero terças e quintas livres, aulas à tarde e blocos seguidos.'

const PROVIDERS = [
  {
    id: 'groq-llama-3.1-8b',
    name: 'Groq LLaMA 3.1 8B Instant',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    key: process.env.GROQ_API_KEY,
    model: 'llama-3.1-8b-instant',
    type: 'openai',
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Google Gemini 1.5 Flash',
    url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
    key: process.env.GEMINI_API_KEY,
    type: 'gemini',
  },
]

async function sendRequest(provider) {
  const t0 = performance.now()
  try {
    if (provider.type === 'gemini') {
      const res = await fetch(`${provider.url}?key=${provider.key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ parts: [{ text: TEST_PROMPT }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      })
      return { status: res.status, latencyMs: Math.round(performance.now() - t0) }
    }

    const res = await fetch(provider.url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${provider.key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: provider.model,
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: TEST_PROMPT },
        ],
      }),
    })
    return { status: res.status, latencyMs: Math.round(performance.now() - t0) }
  } catch (err) {
    return { status: 500, error: err.message, latencyMs: Math.round(performance.now() - t0) }
  }
}

async function runStressTest() {
  console.log('='.repeat(80))
  console.log('⚡ SPIKE #67: RATE LIMIT & BURST STRESS TEST (30 Rapid Requests)')
  console.log('='.repeat(80))

  for (const provider of PROVIDERS) {
    console.log(`\n▶️ Testing burst resilience for: ${provider.name}...`)
    if (!provider.key) {
      console.log(`⚠️ Skipped: Missing key in .env`)
      continue
    }

    let firstRateLimitIndex = null
    const results = []

    for (let i = 1; i <= 30; i++) {
      const res = await sendRequest(provider)
      results.push(res)

      if (res.status === 429 && firstRateLimitIndex === null) {
        firstRateLimitIndex = i
        process.stdout.write(`🛑[Req #${i}: 429 RATE LIMIT] `)
      } else if (res.status === 200) {
        process.stdout.write(`🟢[${res.latencyMs}ms] `)
      } else {
        process.stdout.write(`❌[${res.status}] `)
      }
    }

    console.log('\n')
    const successCount = results.filter((r) => r.status === 200).length
    const rateLimitCount = results.filter((r) => r.status === 429).length

    console.log(`Summary for ${provider.name}:`)
    console.log(`  - Total Dispatched: 30`)
    console.log(`  - Succeeded (200 OK): ${successCount}`)
    console.log(`  - 429 Rate Limits: ${rateLimitCount}`)
    console.log(
      `  - First 429 Triggered At: ${
        firstRateLimitIndex ? `Request #${firstRateLimitIndex}` : 'None triggered in 30 requests! 🎉'
      }`
    )
  }
}

runStressTest().catch(console.error)
