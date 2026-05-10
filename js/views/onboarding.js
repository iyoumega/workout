/**
 * Onboarding view — multi-step wizard with welcome + summary bookends.
 * Renders into #onboarding-root.
 */
(function (global) {
  const QUESTION_STEPS = 8; // basics / goal / experience / days / venue / focus / coach / photos
  const PHASES = ['welcome', 'questions', 'ready'];

  const state = {
    phase: 'welcome',
    step: 0,
    profile: {
      basics: { gender: 'male', age: '', height: '', weight: '' },
      goal: null,
      experience: null,
      daysPerWeek: null,
      venue: null,
      focusAreas: [],
    },
    coach: { name: '小橙', tone: 'friendly' },
    photos: { front: null, side: null, back: null },
    onComplete: null,
    isEdit: false,
  };

  function root() { return document.getElementById('onboarding-root'); }

  function start(onComplete, opts = {}) {
    state.phase = opts.skipWelcome ? 'questions' : 'welcome';
    state.step = 0;
    state.onComplete = onComplete;
    state.isEdit = !!opts.isEdit;
    state.profile = {
      basics: { gender: 'male', age: '', height: '', weight: '' },
      goal: null,
      experience: null,
      daysPerWeek: null,
      venue: null,
      focusAreas: [],
    };
    state.coach = { name: '小橙', tone: 'friendly' };
    state.photos = { front: null, side: null, back: null };
    if (opts.preset) {
      const merged = JSON.parse(JSON.stringify(opts.preset));
      if (!merged.focusAreas) merged.focusAreas = [];
      state.profile = merged;
    }
    if (opts.coach) {
      state.coach = { name: opts.coach.name || '小橙', tone: opts.coach.tone || 'friendly' };
    }
    root().classList.remove('hidden');
    render();
  }

  function close() {
    root().classList.add('hidden');
    root().innerHTML = '';
  }

  function render() {
    if (state.phase === 'welcome') return renderWelcome();
    if (state.phase === 'ready')   return renderReady();
    return renderQuestions();
  }

  // ---------- Welcome ----------
  function renderWelcome() {
    root().innerHTML = `
      <div class="ob-hero">
        <div class="ob-hero-icon">
          <svg viewBox="0 0 24 24" width="48" height="48"><use href="#i-dumbbell"/></svg>
        </div>
        <div class="ob-hero-title">${state.isEdit ? '更新你的档案' : '欢迎'}</div>
        <div class="ob-hero-sub">
          ${state.isEdit
            ? '调整目标和场地后,系统会询问是否重新生成本周计划。'
            : '只需 1 分钟,定制你的 7 天训练和饮食计划。'}
        </div>
      </div>
      <div class="card mt-16">
        <div class="row gap" style="margin-bottom: 12px">
          <svg viewBox="0 0 24 24" width="18" height="18" style="color:var(--accent); flex:0 0 18px;"><use href="#i-flash"/></svg>
          <strong>规则化生成,秒出方案</strong>
        </div>
        <div class="text-sm text-dim">基于训练科学的常用框架,根据你的目标、经验、场地匹配动作和强度。</div>
      </div>
      <div class="card">
        <div class="row gap" style="margin-bottom: 12px">
          <svg viewBox="0 0 24 24" width="18" height="18" style="color:var(--accent); flex:0 0 18px;"><use href="#i-clock"/></svg>
          <strong>每天 3 分钟跟进</strong>
        </div>
        <div class="text-sm text-dim">勾选完成、组间倒计时、看示范一键跳转 B 站。</div>
      </div>
      <div class="card">
        <div class="row gap" style="margin-bottom: 12px">
          <svg viewBox="0 0 24 24" width="18" height="18" style="color:var(--accent); flex:0 0 18px;"><use href="#i-fire"/></svg>
          <strong>数据全在本地</strong>
        </div>
        <div class="text-sm text-dim">不上传服务器,可随时导出备份。</div>
      </div>
      <div class="onboarding-actions">
        <button class="btn btn-primary btn-block" data-act="start">开始</button>
      </div>
    `;
    root().querySelector('[data-act="start"]').addEventListener('click', () => {
      state.phase = 'questions';
      state.step = 0;
      render();
    });
    root().scrollTop = 0;
  }

  // ---------- Questions ----------
  function renderQuestions() {
    const dots = Array.from({length: QUESTION_STEPS}, (_, i) => {
      const cls = i < state.step ? 'dot done' : (i === state.step ? 'dot active' : 'dot');
      return `<div class="${cls}"></div>`;
    }).join('');

    root().innerHTML = `
      <div class="onboarding-progress">${dots}</div>
      <div class="onboarding-step" id="ob-step"></div>
      <div class="onboarding-actions">
        ${state.step > 0 ? '<button class="btn btn-secondary" data-act="back">上一步</button>' : ''}
        <button class="btn btn-primary" data-act="next" id="ob-next">${state.step === QUESTION_STEPS - 1 ? '完成' : '继续'}</button>
      </div>
    `;

    document.getElementById('ob-step').innerHTML = renderStep(state.step);
    bindStepEvents(state.step);
    updateNextDisabled();

    root().querySelector('[data-act="back"]')?.addEventListener('click', () => {
      if (state.step === 0) {
        state.phase = 'welcome';
      } else {
        state.step--;
      }
      render();
    });
    root().querySelector('[data-act="next"]').addEventListener('click', onNext);
    root().scrollTop = 0;
  }

  function renderStep(i) {
    if (i === 0) return stepBasics();
    if (i === 1) return stepGoal();
    if (i === 2) return stepExperience();
    if (i === 3) return stepDays();
    if (i === 4) return stepVenue();
    if (i === 5) return stepFocus();
    if (i === 6) return stepCoach();
    if (i === 7) return stepPhotos();
    return '';
  }

  function stepCoach() {
    const tones = [
      { v: 'friendly', t: '亲和', d: '温和、像可靠的朋友' },
      { v: 'strict',   t: '严师', d: '直接、严格、不啰嗦' },
      { v: 'playful',  t: '俏皮', d: '幽默、有梗、不失专业' },
      { v: 'gentle',   t: '温柔', d: '耐心、鼓励性强' },
    ];
    return `
      <h1>给教练起个名字</h1>
      <p class="text-dim mb-16">这是 AI 教练,会陪你训练、写日记、给建议。</p>
      <div class="field">
        <label>教练昵称</label>
        <input id="ob-coach-name" type="text" maxlength="10" value="${(state.coach.name||'').replace(/"/g,'&quot;')}" placeholder="如 小橙、阿强、Tony" />
      </div>
      <div class="field">
        <label>教练语气</label>
        <div class="option-list">
          ${tones.map(o => `
            <div class="option ${state.coach.tone===o.v?'selected':''}" data-tone="${o.v}">
              <div>
                <div class="option-title">${o.t}</div>
                <div class="option-desc">${o.d}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function stepBasics() {
    const b = state.profile.basics;
    return `
      <h1>先认识下你</h1>
      <p class="text-dim mb-16">这些信息只用来计算训练量和饮食</p>

      <div class="field">
        <label>性别</label>
        <div class="option-grid">
          <div class="option ${b.gender==='male'?'selected':''}" data-gender="male">
            <div class="option-title">男</div>
          </div>
          <div class="option ${b.gender==='female'?'selected':''}" data-gender="female">
            <div class="option-title">女</div>
          </div>
        </div>
      </div>

      <div class="field-row">
        <div class="field">
          <label>年龄</label>
          <input type="number" id="f-age" inputmode="numeric" min="14" max="80" value="${b.age}" placeholder="如 28" />
        </div>
        <div class="field">
          <label>身高 (cm)</label>
          <input type="number" id="f-height" inputmode="numeric" min="120" max="220" value="${b.height}" placeholder="如 175" />
        </div>
      </div>
      <div class="field">
        <label>体重 (kg)</label>
        <input type="number" id="f-weight" inputmode="decimal" step="0.1" min="30" max="200" value="${b.weight}" placeholder="如 70" />
      </div>
    `;
  }

  function stepGoal() {
    const opts = [
      { v: 'fat_loss',    t: '减脂',  d: '降体脂,保持肌肉量,看见线条' },
      { v: 'muscle_gain', t: '增肌',  d: '增加肌肉量,变得更壮、更有力量' },
      { v: 'shape',       t: '塑形',  d: '紧致体态、修饰曲线,轻度减脂' },
      { v: 'maintain',    t: '维持',  d: '保持当前状态,延缓衰老' },
    ];
    return `
      <h1>想变成什么样?</h1>
      <p class="text-dim mb-16">影响训练强度、组数次数和饮食结构</p>
      <div class="option-list">
        ${opts.map(o => `
          <div class="option ${state.profile.goal===o.v?'selected':''}" data-goal="${o.v}">
            <div>
              <div class="option-title">${o.t}</div>
              <div class="option-desc">${o.d}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function stepFocus() {
    const groups = ExerciseLib.FOCUS_GROUPS;
    const selected = new Set(state.profile.focusAreas || []);
    return `
      <h1>重点想练哪里?</h1>
      <p class="text-dim mb-16">可多选,可不选。选中的部位会在计划里多排一个动作</p>
      <div class="chip-grid">
        ${groups.map(g => `
          <button class="chip ${selected.has(g.id)?'selected':''}" data-focus="${g.id}">
            ${g.label}
          </button>
        `).join('')}
      </div>
      <p class="text-faint text-xs center mt-16">不选 = 全身均衡发展</p>
    `;
  }

  function stepExperience() {
    const opts = [
      { v: 'beginner',     t: '新手',     d: '没系统练过,或不到 6 个月' },
      { v: 'intermediate', t: '有基础',   d: '规律训练 6 个月以上' },
      { v: 'advanced',     t: '高级',     d: '2 年以上,熟悉各类动作' },
    ];
    return `
      <h1>训练经验?</h1>
      <p class="text-dim mb-16">新手会优先安排全身/上下分化,降低受伤风险</p>
      <div class="option-list">
        ${opts.map(o => `
          <div class="option ${state.profile.experience===o.v?'selected':''}" data-exp="${o.v}">
            <div>
              <div class="option-title">${o.t}</div>
              <div class="option-desc">${o.d}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function stepDays() {
    const opts = [3, 4, 5, 6];
    return `
      <h1>每周练几天?</h1>
      <p class="text-dim mb-16">建议从能坚持的天数开始</p>
      <div class="option-grid">
        ${opts.map(d => `
          <div class="option ${state.profile.daysPerWeek===d?'selected':''}" data-days="${d}">
            <div class="option-title" style="font-size:28px">${d}</div>
            <div class="option-desc">天 / 周</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function stepVenue() {
    const opts = [
      { v: 'gym',             t: '健身房',         d: '杠铃、哑铃、器械,设备齐全' },
      { v: 'home_dumbbell',   t: '家里(有哑铃)',  d: '一对哑铃 + 简单装备' },
      { v: 'home_bodyweight', t: '家里(纯徒手)',  d: '什么器材都没有' },
    ];
    return `
      <h1>在哪里训练?</h1>
      <p class="text-dim mb-16">动作库会根据场地筛选</p>
      <div class="option-list">
        ${opts.map(o => `
          <div class="option ${state.profile.venue===o.v?'selected':''}" data-venue="${o.v}">
            <div>
              <div class="option-title">${o.t}</div>
              <div class="option-desc">${o.d}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function stepPhotos() {
    const slot = (key, label) => {
      const src = state.photos[key];
      return `
        <label class="photo-slot">
          ${src
            ? `<img src="${src}" alt="${label}" />`
            : `<span class="photo-slot-add"><svg viewBox="0 0 24 24"><use href="#i-camera"/></svg>${label}</span>`}
          <span class="photo-slot-label">${label}</span>
          <input type="file" accept="image/*" data-photo="${key}" />
        </label>
      `;
    };
    return `
      <h1>体态照片(可选)</h1>
      <p class="text-dim mb-16">现在拍 3 张以后能对比变化,跳过不影响功能</p>
      <div class="photo-grid">
        ${slot('front', '正面')}
        ${slot('side', '侧面')}
        ${slot('back', '背面')}
      </div>
      <p class="text-faint text-xs center mt-16">照片仅保存在本地浏览器,不会上传</p>
    `;
  }

  function bindStepEvents(i) {
    if (i === 0) {
      root().querySelectorAll('[data-gender]').forEach(el => {
        el.addEventListener('click', () => { state.profile.basics.gender = el.dataset.gender; render(); });
      });
      ['age','height','weight'].forEach(field => {
        const el = document.getElementById('f-' + field);
        el?.addEventListener('input', () => {
          state.profile.basics[field] = el.value ? Number(el.value) : '';
          updateNextDisabled();
        });
      });
    }
    if (i === 1) {
      root().querySelectorAll('[data-goal]').forEach(el => {
        el.addEventListener('click', () => { state.profile.goal = el.dataset.goal; render(); });
      });
    }
    if (i === 2) {
      root().querySelectorAll('[data-exp]').forEach(el => {
        el.addEventListener('click', () => { state.profile.experience = el.dataset.exp; render(); });
      });
    }
    if (i === 3) {
      root().querySelectorAll('[data-days]').forEach(el => {
        el.addEventListener('click', () => { state.profile.daysPerWeek = Number(el.dataset.days); render(); });
      });
    }
    if (i === 4) {
      root().querySelectorAll('[data-venue]').forEach(el => {
        el.addEventListener('click', () => { state.profile.venue = el.dataset.venue; render(); });
      });
    }
    if (i === 5) {
      root().querySelectorAll('[data-focus]').forEach(el => {
        el.addEventListener('click', () => {
          const id = el.dataset.focus;
          const cur = state.profile.focusAreas || [];
          if (cur.includes(id)) {
            state.profile.focusAreas = cur.filter(x => x !== id);
          } else {
            state.profile.focusAreas = [...cur, id];
          }
          render();
        });
      });
    }
    if (i === 6) {
      const nameInput = document.getElementById('ob-coach-name');
      nameInput?.addEventListener('input', () => {
        state.coach.name = nameInput.value.trim() || '小橙';
      });
      root().querySelectorAll('[data-tone]').forEach(el => {
        el.addEventListener('click', () => { state.coach.tone = el.dataset.tone; render(); });
      });
    }
    if (i === 7) {
      root().querySelectorAll('input[type=file][data-photo]').forEach(input => {
        input.addEventListener('change', async (e) => {
          const file = e.target.files[0];
          if (!file) return;
          try {
            const compressed = await compressImage(file, 800, 0.75);
            state.photos[e.target.dataset.photo] = compressed;
            render();
          } catch (err) {
            UI.toast('图片处理失败', { type: 'error' });
          }
        });
      });
    }
  }

  function isStepValid(i) {
    if (i === 0) {
      const b = state.profile.basics;
      return b.gender && b.age >= 14 && b.height >= 120 && b.weight >= 30;
    }
    if (i === 1) return !!state.profile.goal;
    if (i === 2) return !!state.profile.experience;
    if (i === 3) return !!state.profile.daysPerWeek;
    if (i === 4) return !!state.profile.venue;
    if (i === 5) return true;  // focus areas optional
    if (i === 6) return !!(state.coach.name && state.coach.tone);
    if (i === 7) return true;  // photos optional
    return false;
  }

  function updateNextDisabled() {
    const btn = document.getElementById('ob-next');
    if (!btn) return;
    btn.disabled = !isStepValid(state.step);
  }

  async function onNext() {
    if (!isStepValid(state.step)) return;
    if (state.step < QUESTION_STEPS - 1) {
      state.step++;
      render();
    } else {
      state.phase = 'ready';
      render();
    }
  }

  // ---------- Ready (summary) ----------
  function renderReady() {
    const goalLabels = { fat_loss:'减脂', muscle_gain:'增肌', shape:'塑形', maintain:'维持' };
    const venueLabels = { gym:'健身房', home_dumbbell:'家里·哑铃', home_bodyweight:'家里·徒手' };
    const expLabels = { beginner:'新手', intermediate:'有基础', advanced:'高级' };
    const photoCount = ['front','side','back'].filter(k => state.photos[k]).length;
    const p = state.profile;
    const focusLabels = (p.focusAreas || []).map(id => {
      const g = ExerciseLib.FOCUS_GROUPS.find(x => x.id === id);
      return g ? g.label : id;
    });

    root().innerHTML = `
      <div class="ob-hero">
        <div class="ob-hero-icon" style="animation: celebrate-bounce 0.5s var(--ease)">
          <svg viewBox="0 0 24 24" width="48" height="48"><use href="#i-check"/></svg>
        </div>
        <div class="ob-hero-title">准备就绪</div>
        <div class="ob-hero-sub">下一步会按下方信息生成 7 天计划</div>
      </div>
      <div class="ob-summary">
        <div class="ob-summary-row"><span class="k">基础</span><span class="v">${p.basics.gender==='female'?'女':'男'} · ${p.basics.age}岁 · ${p.basics.height}cm · ${p.basics.weight}kg</span></div>
        <div class="ob-summary-row"><span class="k">目标</span><span class="v">${goalLabels[p.goal]}</span></div>
        <div class="ob-summary-row"><span class="k">经验</span><span class="v">${expLabels[p.experience]}</span></div>
        <div class="ob-summary-row"><span class="k">每周</span><span class="v">${p.daysPerWeek} 天</span></div>
        <div class="ob-summary-row"><span class="k">场地</span><span class="v">${venueLabels[p.venue]}</span></div>
        <div class="ob-summary-row"><span class="k">重点</span><span class="v">${focusLabels.length ? focusLabels.join(' · ') : '全身均衡'}</span></div>
        <div class="ob-summary-row"><span class="k">教练</span><span class="v">${state.coach.name} · ${({friendly:'亲和',strict:'严师',playful:'俏皮',gentle:'温柔'})[state.coach.tone]||''}</span></div>
        <div class="ob-summary-row"><span class="k">体态照片</span><span class="v">${photoCount > 0 ? photoCount + ' 张' : '已跳过'}</span></div>
      </div>
      <div class="onboarding-actions">
        <button class="btn btn-secondary" data-act="back">返回修改</button>
        <button class="btn btn-primary" data-act="generate">生成计划</button>
      </div>
    `;
    root().querySelector('[data-act="back"]').addEventListener('click', () => {
      state.phase = 'questions';
      state.step = QUESTION_STEPS - 1;
      render();
    });
    root().querySelector('[data-act="generate"]').addEventListener('click', async () => {
      const btn = root().querySelector('[data-act="generate"]');
      btn.disabled = true;
      btn.textContent = '生成中…';
      // 让按钮的禁用状态先渲染出来
      await new Promise(r => setTimeout(r, 120));
      close();
      state.onComplete && await state.onComplete(state.profile, state.photos, state.coach);
    });
    root().scrollTop = 0;
  }

  // ---------- Image compression ----------
  async function compressImage(file, maxEdge = 800, quality = 0.75) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > maxEdge || height > maxEdge) {
            if (width > height) { height = Math.round(height * maxEdge / width); width = maxEdge; }
            else { width = Math.round(width * maxEdge / height); height = maxEdge; }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  global.OnboardingView = { start, close, compressImage };
})(window);
