import dotenv from 'dotenv'

dotenv.config()

async function testGeminiFlashLatest() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: 'Ola!' }] }],
    }),
  })
  console.log('Gemini Flash Latest Status:', res.status)
  console.log('Gemini Flash Latest Body:', await res.text())
}

testGeminiFlashLatest().catch(console.error)
