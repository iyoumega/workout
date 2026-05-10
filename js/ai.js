/**
 * AI client — thin wrapper over OpenAI-compatible API at our Worker.
 *
 * Public:
 *   AI.chat(messages, opts) -> { text, raw }
 *   AI.json(messages, opts) -> parsed JSON object | throws
 *   AI.vision(imageDataUrl, prompt, opts) -> { text }
 *
 * Models: deepseek-chat | deepseek-reasoner | qwen-flash | qwen-plus | qwen-vl-max
 */
(function (global) {
  const BASE_URL = 'https://mega-deepseek.cylsport52330.workers.dev';

  function endpointFor(model) {
    if (model && model.startsWith('qwen')) return BASE_URL + '/qwen/v1/chat/completions';
    return BASE_URL + '/v1/chat/completions';
  }

  async function chat(messages, opts = {}) {
    const model = opts.model || 'deepseek-chat';
    const body = {
      model,
      messages,
      temperature: opts.temperature ?? 0.4,
      max_tokens: opts.maxTokens ?? 1500,
    };
    if (opts.json) body.response_format = { type: 'json_object' };

    const ctrl = new AbortController();
    const timeoutId = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 45000);
    try {
      const resp = await fetch(endpointFor(model), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`HTTP ${resp.status}: ${errText.slice(0, 200)}`);
      }
      const data = await resp.json();
      const text = data?.choices?.[0]?.message?.content || '';
      return { text, raw: data };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async function json(messages, opts = {}) {
    const result = await chat(messages, { ...opts, json: true });
    return parseJSON(result.text);
  }

  function parseJSON(text) {
    if (!text) throw new Error('AI 返回空内容');
    let cleaned = text.trim();
    // 去掉 markdown ```json ... ``` 包裹
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```\s*$/, '');
    }
    // 尝试直接 parse
    try { return JSON.parse(cleaned); } catch (e) {}
    // 兜底:抓第一个 { ... } 块
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) {
      try { return JSON.parse(m[0]); } catch (e) {}
    }
    throw new Error('AI 返回的不是合法 JSON');
  }

  async function vision(imageDataUrl, prompt, opts = {}) {
    const messages = [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: imageDataUrl } },
        ],
      },
    ];
    return chat(messages, { model: opts.model || 'qwen-vl-max', maxTokens: opts.maxTokens || 600, temperature: 0.3 });
  }

  global.AI = { chat, json, vision, parseJSON, BASE_URL };
})(window);
