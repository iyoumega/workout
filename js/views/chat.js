/**
 * Chat view — 全屏对话(事件委托,防止 querySelector 失效)。
 * 公开:
 *   ChatView.open()
 *   ChatView.close()
 */
(function (global) {

  let isSending = false;
  let delegationBound = false;

  function root() { return document.getElementById('chat-root'); }

  async function open() {
    document.getElementById('tab-bar').classList.add('hidden');
    document.getElementById('chat-fab')?.classList.add('hidden');
    root().classList.remove('hidden');
    bindDelegation();
    await render();
    setTimeout(scrollToBottom, 60);
  }

  function close() {
    const r = root();
    r.classList.add('hidden');
    r.innerHTML = '';
    document.getElementById('tab-bar').classList.remove('hidden');
    document.getElementById('chat-fab')?.classList.remove('hidden');
  }

  async function render() {
    let coachName = '教练';
    let messages = [];
    try {
      const settings = await Storage.getSettings();
      coachName = settings.coachName || '教练';
      const history = await Storage.getChatHistory();
      messages = history.messages || [];
    } catch (e) {
      // 即使本地存储有问题也要让界面出来
      console.warn('chat init storage error', e);
    }

    root().innerHTML = `
      <div class="chat-header">
        <button class="btn btn-icon" data-chat="close" aria-label="关闭">
          <svg viewBox="0 0 24 24"><use href="#i-x"/></svg>
        </button>
        <div class="chat-title-block">
          <div class="chat-title">${escapeHtml(coachName)}</div>
          <div class="chat-subtitle">${navigator.onLine ? 'AI 教练 · 在线' : 'AI 教练 · 离线无法响应'}</div>
        </div>
        <button class="btn btn-icon" data-chat="clear" aria-label="清空对话">
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
          <button class="chat-send-btn" id="chat-send" aria-label="发送">
            <svg viewBox="0 0 24 24" width="20" height="20"><use href="#i-arrow-r"/></svg>
          </button>
        </div>
      </div>
    `;
  }

  function renderWelcome(coachName) {
    return `
      <div class="chat-welcome">
        <div class="chat-welcome-avatar">
          <svg viewBox="0 0 24 24" width="32" height="32"><use href="#i-sparkles"/></svg>
        </div>
        <div class="chat-welcome-name">我是你的私教 ${escapeHtml(coachName)}</div>
        <div class="chat-welcome-sub">问我任何关于训练、动作、饮食、身体的问题。</div>
      </div>
    `;
  }

  function renderSuggestions(isEmpty) {
    const items = isEmpty
      ? ['今天感觉怎么样', '我能换个动作吗', '怎么练才能有翘臀', '增肌期间该吃什么']
      : ['今天该练什么', '换个动作试试', '蛋白质怎么吃', '休息日做什么'];
    return items.map(t => `<button class="chat-chip" data-chat-suggest="${escapeHtml(t)}">${escapeHtml(t)}</button>`).join('');
  }

  function tryHandleSlash(text) {
    const t = text.trim();
    if (!t.startsWith('/')) return null;
    const cmd = t.slice(1).toLowerCase().split(/\s+/)[0];
    const replies = {
      '计划': '让我看看你这周的安排…',
      'plan': '让我看看你这周的安排…',
      '换': '想换哪个动作?直接说名字,或回到"今日"页点动作右上角的换一个。',
      'swap': '想换哪个动作?直接说名字,或回到"今日"页点动作右上角的换一个。',
      '体重': '去"我的"页点"记录"按钮可以加一次体重数据。',
      'weight': '去"我的"页点"记录"按钮可以加一次体重数据。',
      '帮助': '可用指令:\n/计划 /换 /体重 /帮助',
      'help': '可用指令:\n/计划 /换 /体重 /帮助',
    };
    return replies[cmd] ? { kind: cmd, reply: replies[cmd] } : null;
  }

  function renderMessage(m) {
    if (m.role === 'user') {
      return `<div class="chat-msg user"><div class="bubble">${escapeHtml(m.content)}</div></div>`;
    }
    const actionsHtml = detectActions(m.content);
    return `<div class="chat-msg assistant">
      <div class="chat-avatar"><svg viewBox="0 0 24 24"><use href="#i-sparkles"/></svg></div>
      <div class="bubble">${escapeHtml(m.content).replace(/\n/g, '<br/>')}${actionsHtml}</div>
    </div>`;
  }

  function detectActions(text) {
    if (!text) return '';
    const buttons = [];
    if (/重新生成|换一份|新计划|生成新/.test(text)) {
      buttons.push(`<button class="chat-action" data-chat-action="regen-ai">用 AI 生成新计划</button>`);
    }
    if (/休息日|歇一天/.test(text) && /今天|改成|换成/.test(text)) {
      buttons.push(`<button class="chat-action" data-chat-action="today-rest">把今天改为休息日</button>`);
    }
    if (/换个动作|换一个|替换/.test(text)) {
      buttons.push(`<button class="chat-action" data-chat-action="go-today">回今日选动作换</button>`);
    }
    if (!buttons.length) return '';
    return `<div class="chat-actions">${buttons.join('')}</div>`;
  }

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
  }

  // 顶层事件委托:整个 #chat-root 一次绑定,re-render 不影响
  function bindDelegation() {
    if (delegationBound) return;
    delegationBound = true;
    const r = root();

    // 点击委托
    r.addEventListener('click', async (e) => {
      // 关闭
      if (e.target.closest('[data-chat="close"]')) {
        close();
        return;
      }
      // 清空
      if (e.target.closest('[data-chat="clear"]')) {
        const ok = await UI.confirmModal({
          title: '清空对话?',
          text: '聊天历史会被删除,无法恢复。',
          okLabel: '清空', danger: true,
        });
        if (ok) {
          await Storage.clearChatHistory();
          render();
        }
        return;
      }
      // 发送
      if (e.target.closest('#chat-send')) {
        e.preventDefault();
        send();
        return;
      }
      // 建议词
      const chip = e.target.closest('[data-chat-suggest]');
      if (chip) {
        const input = document.getElementById('chat-input');
        if (input) {
          input.value = chip.dataset.chatSuggest;
          input.focus();
        }
        return;
      }
      // AI 回复里的快捷动作
      const action = e.target.closest('[data-chat-action]');
      if (action) {
        await handleChatAction(action.dataset.chatAction);
        return;
      }
    });

    // 输入委托 — 处理 textarea 自动高度 + Enter 发送
    r.addEventListener('input', (e) => {
      if (e.target.id === 'chat-input') {
        e.target.style.height = 'auto';
        e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
      }
    });
    r.addEventListener('keydown', (e) => {
      if (e.target.id === 'chat-input' && e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        send();
      }
    });
  }

  async function handleChatAction(act) {
    try {
      if (act === 'regen-ai') {
        close();
        await App.switchTab('plan');
        setTimeout(() => document.getElementById('ai-regen')?.click(), 250);
      } else if (act === 'today-rest') {
        const ok = await UI.confirmModal({
          title: '把今天改为休息日?',
          text: '原本的训练动作会清空,可以稍后再生成或手动恢复。',
          okLabel: '确认',
        });
        if (!ok) return;
        const plan = await Storage.getPlan();
        const profile = await Storage.getProfile();
        const todayKey = Planner.toDateKey(new Date());
        const idx = plan.days.findIndex(d => d.date === todayKey);
        if (idx === -1) { UI.toast('找不到今天', { type: 'error' }); return; }
        plan.days[idx].type = 'rest';
        plan.days[idx].title = Planner.TYPE_TITLES.rest;
        plan.days[idx].exercises = [];
        plan.days[idx].nutrition = Nutrition.calcMacros(profile, false);
        await Storage.savePlan(plan);
        UI.toast('今天已改为休息日', { type: 'success', icon: 'i-check' });
        close();
        App.switchTab('today');
      } else if (act === 'go-today') {
        close();
        App.switchTab('today');
      }
    } catch (e) {
      UI.toast('操作失败:' + e.message, { type: 'error' });
    }
  }

  async function send() {
    if (isSending) return;
    const input = document.getElementById('chat-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text) {
      input.focus();
      return;
    }

    isSending = true;
    input.value = '';
    input.style.height = 'auto';

    let messages = [];
    try {
      const history = await Storage.getChatHistory();
      messages = history.messages || [];
    } catch (e) {
      messages = [];
    }
    messages.push({ role: 'user', content: text, at: new Date().toISOString() });

    const list = document.getElementById('chat-list');
    if (list) {
      list.insertAdjacentHTML('beforeend', renderMessage({ role: 'user', content: text }));
    }
    const sug = document.getElementById('chat-suggestions');
    if (sug) sug.style.display = 'none';
    scrollToBottom();

    // slash command 本地处理
    const slash = tryHandleSlash(text);
    if (slash) {
      messages.push({ role: 'assistant', content: slash.reply, at: new Date().toISOString() });
      try { await Storage.saveChatHistory(messages); } catch(e) {}
      if (list) list.insertAdjacentHTML('beforeend', renderMessage({ role: 'assistant', content: slash.reply }));
      isSending = false;
      scrollToBottom();
      return;
    }

    try { await Storage.saveChatHistory(messages); } catch(e) {}

    // 检查网络
    if (!navigator.onLine) {
      if (list) {
        list.insertAdjacentHTML('beforeend', renderMessage({
          role: 'assistant',
          content: '当前没有网络,无法回应。等联网后再试 🙂',
        }));
      }
      isSending = false;
      scrollToBottom();
      return;
    }

    // 占位泡泡
    const tempId = 'pending-' + Date.now();
    if (list) {
      list.insertAdjacentHTML('beforeend', `
        <div class="chat-msg assistant" id="${tempId}">
          <div class="chat-avatar"><svg viewBox="0 0 24 24"><use href="#i-sparkles"/></svg></div>
          <div class="bubble"><span class="typing"><span></span><span></span><span></span></span></div>
        </div>
      `);
    }
    scrollToBottom();

    try {
      const reply = await AIPlanner.chat(messages);
      const replyText = (reply && reply.text) || '(没收到回复,稍后再试)';
      messages.push({ role: 'assistant', content: replyText, at: new Date().toISOString() });
      try { await Storage.saveChatHistory(messages); } catch(e) {}
      const placeholder = document.getElementById(tempId);
      if (placeholder) {
        placeholder.outerHTML = renderMessage({ role: 'assistant', content: replyText });
      }
    } catch (err) {
      const placeholder = document.getElementById(tempId);
      const errMsg = `连接失败:${err && err.message ? err.message : '未知错误'}`;
      if (placeholder) {
        placeholder.outerHTML = renderMessage({ role: 'assistant', content: errMsg });
      }
    } finally {
      isSending = false;
      scrollToBottom();
    }
  }

  function scrollToBottom() {
    const list = document.getElementById('chat-list');
    if (list) list.scrollTop = list.scrollHeight;
  }

  global.ChatView = { open, close };
})(window);
