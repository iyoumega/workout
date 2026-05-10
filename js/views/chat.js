/**
 * Chat view — full-screen conversation with the AI coach.
 * Coach has full context: profile, plan, recent logs, weights.
 *
 * Public:
 *   ChatView.open()
 *   ChatView.close()
 */
(function (global) {

  function root() { return document.getElementById('chat-root'); }

  async function open() {
    document.getElementById('tab-bar').classList.add('hidden');
    root().classList.remove('hidden');
    await render();
    setTimeout(scrollToBottom, 50);
  }

  function close() {
    root().classList.add('hidden');
    root().innerHTML = '';
    document.getElementById('tab-bar').classList.remove('hidden');
  }

  async function render() {
    const settings = await Storage.getSettings();
    const coachName = settings.coachName || '教练';
    const history = await Storage.getChatHistory();
    const messages = history.messages || [];

    root().innerHTML = `
      <div class="chat-header">
        <button class="btn btn-icon" data-act="close"><svg viewBox="0 0 24 24"><use href="#i-x"/></svg></button>
        <div class="chat-title-block">
          <div class="chat-title">${coachName}</div>
          <div class="chat-subtitle">AI 教练 · 在线</div>
        </div>
        <button class="btn btn-icon" data-act="clear" title="清空对话">
          <svg viewBox="0 0 24 24"><use href="#i-trash"/></svg>
        </button>
      </div>

      <div class="chat-list" id="chat-list">
        ${messages.length === 0 ? renderWelcome(coachName) : ''}
        ${messages.map(m => renderMessage(m)).join('')}
      </div>

      <div class="chat-input-bar">
        <div class="chat-suggestions" id="chat-suggestions">
          ${renderSuggestions(messages.length === 0)}
        </div>
        <div class="chat-input-row">
          <textarea id="chat-input" placeholder="问点什么..." rows="1"></textarea>
          <button class="btn btn-primary chat-send" id="chat-send" disabled>
            <svg viewBox="0 0 24 24" width="18" height="18"><use href="#i-arrow-r"/></svg>
          </button>
        </div>
      </div>
    `;

    bindEvents();
  }

  function renderWelcome(coachName) {
    return `
      <div class="chat-welcome">
        <div class="chat-welcome-avatar">
          <svg viewBox="0 0 24 24" width="32" height="32"><use href="#i-sparkles"/></svg>
        </div>
        <div class="chat-welcome-name">我是你的私教 ${coachName}</div>
        <div class="chat-welcome-sub">问我任何关于训练、动作、饮食、身体的问题。</div>
      </div>
    `;
  }

  function renderSuggestions(isEmpty) {
    const items = isEmpty
      ? ['今天感觉怎么样?', '我能换个动作吗?', '怎么练才能有翘臀?', '增肌期间该吃什么?', '/计划', '/换']
      : ['今天该练什么?', '换个动作试试', '蛋白质怎么吃', '休息日做什么', '/计划', '/换'];
    return items.map(t => `<button class="chat-chip" data-suggest="${t}">${t}</button>`).join('');
  }

  // slash commands — 用户输入 /xxx 时本地直接回应
  function tryHandleSlash(text) {
    const t = text.trim();
    if (!t.startsWith('/')) return null;
    const cmd = t.slice(1).toLowerCase().split(/\s+/)[0];
    if (cmd === '计划' || cmd === 'plan') {
      return {
        kind: 'plan',
        reply: '让我看看你这周的安排…',
      };
    }
    if (cmd === '换' || cmd === 'swap') {
      return {
        kind: 'swap',
        reply: '想换哪个动作?直接说名字,或回到"今日"页点动作右上角的换一个。',
      };
    }
    if (cmd === '体重' || cmd === 'weight') {
      return {
        kind: 'weight',
        reply: '去"我的"页点"记录"按钮可以加一次体重数据。',
      };
    }
    if (cmd === '帮助' || cmd === 'help') {
      return {
        kind: 'help',
        reply: '可用快捷指令:\n/计划 — 看这周计划\n/换 — 提示换动作\n/体重 — 提示记录体重\n/帮助 — 看这个列表',
      };
    }
    return null;
  }

  function renderMessage(m) {
    if (m.role === 'user') {
      return `<div class="chat-msg user"><div class="bubble">${escapeHtml(m.content)}</div></div>`;
    }
    return `<div class="chat-msg assistant">
      <div class="chat-avatar"><svg viewBox="0 0 24 24"><use href="#i-sparkles"/></svg></div>
      <div class="bubble">${escapeHtml(m.content).replace(/\n/g, '<br/>')}</div>
    </div>`;
  }

  function escapeHtml(s) {
    return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
  }

  function bindEvents() {
    root().querySelector('[data-act="close"]').addEventListener('click', close);
    root().querySelector('[data-act="clear"]').addEventListener('click', async () => {
      const ok = await UI.confirmModal({
        title: '清空对话?',
        text: '聊天历史会被删除,无法恢复。',
        okLabel: '清空', danger: true,
      });
      if (!ok) return;
      await Storage.clearChatHistory();
      render();
    });

    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('chat-send');
    const updateSendState = () => { sendBtn.disabled = !input.value.trim(); };
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
      updateSendState();
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!sendBtn.disabled) send();
      }
    });
    sendBtn.addEventListener('click', send);

    root().querySelectorAll('[data-suggest]').forEach(b => {
      b.addEventListener('click', () => {
        input.value = b.dataset.suggest;
        updateSendState();
        input.focus();
      });
    });
  }

  let isSending = false;
  async function send() {
    if (isSending) return;
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;

    isSending = true;
    input.value = '';
    input.style.height = 'auto';
    document.getElementById('chat-send').disabled = true;

    const history = await Storage.getChatHistory();
    const messages = history.messages || [];
    messages.push({ role: 'user', content: text, at: new Date().toISOString() });

    // slash command 本地处理(不调 API)
    const slash = tryHandleSlash(text);
    if (slash) {
      messages.push({ role: 'assistant', content: slash.reply, at: new Date().toISOString() });
      await Storage.saveChatHistory(messages);
      const list = document.getElementById('chat-list');
      list.insertAdjacentHTML('beforeend', renderMessage({ role: 'user', content: text }));
      list.insertAdjacentHTML('beforeend', renderMessage({ role: 'assistant', content: slash.reply }));
      const sug = document.getElementById('chat-suggestions');
      if (sug) sug.style.display = 'none';
      // 联动:计划命令切到计划 tab
      if (slash.kind === 'plan') {
        setTimeout(() => { close(); App.switchTab('plan'); }, 600);
      }
      isSending = false;
      const sb = document.getElementById('chat-send');
      if (sb) sb.disabled = false;
      scrollToBottom();
      return;
    }

    await Storage.saveChatHistory(messages);

    // 立即渲染用户消息
    const list = document.getElementById('chat-list');
    list.insertAdjacentHTML('beforeend', renderMessage({ role: 'user', content: text }));
    // 占位
    const tempId = 't-' + Date.now();
    list.insertAdjacentHTML('beforeend', `
      <div class="chat-msg assistant" id="${tempId}">
        <div class="chat-avatar"><svg viewBox="0 0 24 24"><use href="#i-sparkles"/></svg></div>
        <div class="bubble"><span class="typing"><span></span><span></span><span></span></span></div>
      </div>
    `);
    // 隐藏建议
    const sug = document.getElementById('chat-suggestions');
    if (sug) sug.style.display = 'none';
    scrollToBottom();

    try {
      const reply = await AIPlanner.chat(messages);
      messages.push({ role: 'assistant', content: reply.text, at: new Date().toISOString() });
      await Storage.saveChatHistory(messages);
      const placeholder = document.getElementById(tempId);
      if (placeholder) {
        placeholder.outerHTML = renderMessage({ role: 'assistant', content: reply.text });
      }
      scrollToBottom();
    } catch (e) {
      const placeholder = document.getElementById(tempId);
      if (placeholder) {
        placeholder.querySelector('.bubble').innerHTML = `<span class="text-faint">(出错:${e.message})</span>`;
      }
    } finally {
      isSending = false;
      const sb = document.getElementById('chat-send');
      if (sb) sb.disabled = false;
    }
  }

  function scrollToBottom() {
    const list = document.getElementById('chat-list');
    if (list) list.scrollTop = list.scrollHeight;
  }

  global.ChatView = { open, close };
})(window);
