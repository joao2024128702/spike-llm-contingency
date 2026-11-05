import dotenv from 'dotenv'

dotenv.config()

async function testGroq() {
  console.log('\n--- DIAGNÓSTICO GROQ ---')
  console.log('Chave presente?', !!process.env.GROQ_API_KEY)
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: 'Diz ola' }],
    }),
  })
  console.log('Status Groq:', res.status)
  const text = await res.text()
  console.log('Resposta Groq:', text)
}

async function testGemini() {
  console.log('\n--- DIAGNÓSTICO GEMINI ---')
  console.log('Chave presente?', !!process.env.GEMINI_API_KEY)
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Diz ola' }] }],
      }),
    }
  )
  console.log('Status Gemini:', res.status)
  const text = await res.text()
  console.log('Resposta Gemini:', text)
}

async function main() {
  await testGroq()
  await testGemini()
}

main().catch(console.error)
