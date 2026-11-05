import dotenv from 'dotenv'

dotenv.config()

async function listModels() {
  const res = await fetch('https://api.groq.com/openai/v1/models', {
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
  })
  const data = await res.json()
  if (data.data) {
    console.log('Modelos disponíveis no Groq:', data.data.map((m) => m.id))
  } else {
    console.log('Erro ao listar:', data)
  }
}

listModels().catch(console.error)
