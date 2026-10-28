/* ==========================================================================
   Neyman School — личный кабинет
   ========================================================================== */

   (function () {
    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  
    // ---------- защита страницы ----------
    if (!API.isLoggedIn()) {
      window.location.href = 'contacts.html#login';
      return;
    }
  
    // ---------- баннеры ----------
    function banner(container, message, type = 'error') {
      let b = container.querySelector('.form__banner');
      if (!b) {
        b = document.createElement('div');
        b.className = 'form__banner';
        container.prepend(b);
      }
      b.textContent = message;
      b.style.cssText = `
        padding: .75rem 1rem; border-radius: 8px; margin-bottom: 1rem;
        font-size: .9375rem;
        background: ${type === 'error' ? '#fdecea' : '#e8f5e9'};
        color: ${type === 'error' ? '#c62828' : '#1b5e20'};
        border: 1px solid ${type === 'error' ? '#f5c6cb' : '#c8e6c9'};
      `;
      setTimeout(() => { if (type === 'success') b.remove(); }, 4000);
    }
    function clearBanner(container) {
      const b = container.querySelector('.form__banner');
      if (b) b.remove();
    }
  
    // ---------- табы ----------
    function initTabs() {
      const tabs = $$('#profile-tabs .tabs__btn');
      tabs.forEach((btn) => {
        btn.addEventListener('click', () => {
          tabs.forEach((t) => t.classList.remove('tabs__btn_active'));
          btn.classList.add('tabs__btn_active');
          $$('.tab-panel').forEach((p) => p.classList.remove('tab-panel_active'));
          const target = document.getElementById(btn.dataset.tab);
          if (target) target.classList.add('tab-panel_active');
  
          // ленивая подгрузка при первом открытии
          if (btn.dataset.tab === 'tab-feedback') loadFeedback();
          if (btn.dataset.tab === 'tab-actions') loadActions();
        });
      });
    }
  
    // ---------- профиль: view/edit ----------
    async function loadProfile() {
      try {
        const me = await API.get('/profile', { auth: true });
        API.setCachedUser(me);
        renderProfile(me);
      } catch (err) {
        console.error(err);
        banner($('#tab-info'), err.message || 'Не удалось загрузить профиль');
      }
    }
  
    function renderProfile(me) {
      $('#profile-greeting').textContent = `Привет, ${me.name}! Вы вошли как ${me.email}`;
      $('#pf-name').value = me.name || '';
      $('#pf-username').value = me.username || '';
      $('#pf-email').value = me.email || '';
      $('#pf-phone').value = me.phone || '';
  
      const meta = [];
      meta.push(`Роль: ${me.role === 'admin' ? 'администратор' : 'пользователь'}`);
      if (me.created_at) meta.push(`Регистрация: ${new Date(me.created_at).toLocaleString('ru-RU')}`);
      if (me.last_login) meta.push(`Последний вход: ${new Date(me.last_login).toLocaleString('ru-RU')}`);
      $('#pf-meta').textContent = meta.join(' · ');
    }
  
    function bindProfileForm() {
      const form = $('#profile-form');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearBanner(form);
        const fd = new FormData(form);
        const payload = {
          name: fd.get('name').trim(),
          username: fd.get('username').trim(),
          email: fd.get('email').trim(),
          phone: fd.get('phone').trim() || null,
        };
        const btn = form.querySelector('button[type="submit"]');
        const original = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'Сохранение...';
        try {
          const updated = await API.put('/profile', payload, { auth: true });
          API.setCachedUser(updated);
          renderProfile(updated);
          window.dispatchEvent(new CustomEvent('auth:login'));  // обновить хедер
          banner(form, 'Профиль обновлён', 'success');
        } catch (err) {
          banner(form, err.message || 'Не удалось сохранить');
        } finally {
          btn.disabled = false;
          btn.textContent = original;
        }
      });
    }
  
    // ---------- смена пароля ----------
    function bindPasswordForm() {
      const form = $('#password-form');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearBanner(form);
        const fd = new FormData(form);
        const payload = {
          old_password: fd.get('old_password'),
          new_password: fd.get('new_password'),
        };
        const btn = form.querySelector('button[type="submit"]');
        const original = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'Меняем...';
        try {
          await API.post('/profile/password', payload, { auth: true });
          form.reset();
          banner(form, 'Пароль успешно изменён', 'success');
        } catch (err) {
          banner(form, err.message || 'Не удалось сменить пароль');
        } finally {
          btn.disabled = false;
          btn.textContent = original;
        }
      });
    }
  
    // ---------- мои обращения ----------
    async function loadFeedback() {
      const box = $('#feedback-list');
      box.innerHTML = '<p class="form__note">Загрузка...</p>';
      try {
        const items = await API.get('/profile/feedback', { auth: true });
        if (!items.length) {
          box.innerHTML = '<p class="form__note">У вас пока нет обращений.</p>';
          return;
        }
        box.innerHTML = items.map((f) => `
          <article class="card" style="max-width:640px;">
            <div style="display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;">
              <strong>${escapeHtml(f.subject)}</strong>
              <span class="badge badge_${f.status}">${statusLabel(f.status)}</span>
            </div>
            <p style="margin:.5rem 0;white-space:pre-wrap;">${escapeHtml(f.message)}</p>
            <p class="form__note">${new Date(f.created_at).toLocaleString('ru-RU')}</p>
          </article>
        `).join('');
      } catch (err) {
        box.innerHTML = `<p class="form__note" style="color:#c62828;">${escapeHtml(err.message)}</p>`;
      }
    }
  
    // ---------- журнал действий ----------
    async function loadActions() {
      const box = $('#actions-list');
      box.innerHTML = '<p class="form__note">Загрузка...</p>';
      try {
        const items = await API.get('/profile/actions?limit=20', { auth: true });
        if (!items.length) {
          box.innerHTML = '<p class="form__note">Действий пока нет.</p>';
          return;
        }
        box.innerHTML = `
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr class="table__head">
                  <th class="table__cell table__head">Дата</th>
                  <th class="table__cell table__head">Действие</th>
                  <th class="table__cell table__head">Страница</th>
                </tr>
              </thead>
              <tbody>
                ${items.map((a) => `
                  <tr>
                    <td class="table__cell">${new Date(a.created_at).toLocaleString('ru-RU')}</td>
                    <td class="table__cell"><code>${escapeHtml(a.action)}</code></td>
                    <td class="table__cell">${escapeHtml(a.page || '—')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      } catch (err) {
        box.innerHTML = `<p class="form__note" style="color:#c62828;">${escapeHtml(err.message)}</p>`;
      }
    }
  
    // ---------- утилиты ----------
    function escapeHtml(s) {
      if (s == null) return '';
      return String(s)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
    }
    function statusLabel(s) {
      return ({ new: 'Новое', in_progress: 'В работе', resolved: 'Решено' })[s] || s;
    }
  
    // ---------- init ----------
    async function init() {
      initTabs();
      bindProfileForm();
      bindPasswordForm();
      await loadProfile();
    }
  
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  })();