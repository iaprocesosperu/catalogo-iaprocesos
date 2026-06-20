export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  
  const { image_base64, mode } = req.body
  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY
  
  if (!ANTHROPIC_KEY) return res.status(500).json({ error: 'API key no configurada' })

  const prompt = mode === 'search'
    ? 'Describe esta prenda de vestir en español con palabras clave separadas por comas: tipo de prenda, color, textura, patrón, material aparente, estilo. Solo las palabras clave, nada más.'
    : 'Describe esta prenda de vestir en español con palabras clave separadas por comas: tipo de prenda, color, textura, patrón, material aparente, estilo. Solo las palabras clave, nada más.'

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 150,
        messages: [{ role: 'user', content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image_base64 } },
          { type: 'text', text: prompt }
        ]}]
      })
    })
    const data = await response.json()
    const descripcion = data.content?.[0]?.text || ''
    res.status(200).json({ descripcion })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
