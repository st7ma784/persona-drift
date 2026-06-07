import OpenAI from 'openai'

// Resolve relative paths (e.g. '/ollama') to absolute for the OpenAI SDK
function abs(url) {
  if (url.startsWith('/')) return window.location.origin + url
  return url
}

export function createClient(baseUrl) {
  return new OpenAI({
    baseURL: `${abs(baseUrl)}/v1`,
    apiKey: 'ollama',
    dangerouslyAllowBrowser: true,
  })
}

export async function fetchModels(baseUrl) {
  try {
    const res = await fetch(`${baseUrl}/api/tags`)
    if (!res.ok) return []
    const data = await res.json()
    return (data.models ?? []).map(m => m.name)
  } catch {
    return []
  }
}

export async function* streamChat(client, model, system, messages) {
  const stream = await client.chat.completions.create({
    model,
    stream: true,
    messages: [
      ...(system ? [{ role: 'system', content: system }] : []),
      ...messages,
    ],
  })
  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content
    if (text) yield text
  }
}

export async function jsonChat(client, model, userContent) {
  const res = await client.chat.completions.create({
    model,
    stream: false,
    response_format: { type: 'json_object' },
    messages: [{ role: 'user', content: userContent }],
  })
  return JSON.parse(res.choices[0].message.content)
}
