import dotenv from 'dotenv'

dotenv.config()

async function listGeminiModels() {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`
  )
  const data = await res.json()
  if (data.models) {
    console.log(
      'Modelos Gemini disponíveis:',
      data.models.map((m) => m.name.replace('models/', ''))
    )
  } else {
    console.log('Erro ao listar Gemini:', data)
  }
}

listGeminiModels().catch(console.error)
