/* ==========================================================================
   Neyman School — админка
   ========================================================================== */

   (function () {
    const $  = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  
    if (!API.isLoggedIn()) {
      window.location.href = 'contacts.html#login';
      return;
    }
    if (!API.isAdmin()) {
      alert('Доступ только для администратора');
      window.location.href = 'profile.html';
      return;
    }
  
    // ============================================================
    // УТИЛИТЫ
    // ============================================================
    function escapeHtml(s) {
      if (s == null) return '';
      return String(s)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
    }
    function priceFmt(n) {
      const num = Number(n);
      return Number.isNaN(num) ? '' : num.toLocaleString('ru-RU') + ' ₽';
    }
    function statusLabel(s) {
      return ({ new: 'Новое', in_progress: 'В работе', resolved: 'Решено' })[s] || s;
    }
  
    // ============================================================
    // МОДАЛКА
    // ============================================================
    let escHandler = null;
  
    function closeModal() {
      const modal = $('#modal');
      if (!modal) return;
      modal.hidden = true;
      modal.onclick = null;
      if (escHandler) {
        document.removeEventListener('keydown', escHandler);
        escHandler = null;
      }
    }
  
    /**
     * @param {string} title
     * @param {string} formHtml
     * @param {(fd: FormData, form: HTMLFormElement) => Promise<void>} onSubmit
     */
    function openModal(title, formHtml, onSubmit) {
      const modal = $('#modal');
      const form = $('#modal-form');
      if (!modal || !form) return;
  
      $('#modal-title').textContent = title;
      form.innerHTML = formHtml;
      modal.hidden = false;
  
      // Закрытие — делегированный клик по любому [data-close]
      modal.onclick = (e) => {
        if (e.target.closest('[data-close]')) closeModal();
      };
  
      // Esc — закрыть
      if (escHandler) document.removeEventListener('keydown', escHandler);
      escHandler = (e) => { if (e.key === 'Escape') closeModal(); };
      document.addEventListener('keydown', escHandler);
  
      // Submit
      form.onsubmit = async (e) => {
        e.preventDefault();
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.disabled = true;
        try {
          await onSubmit(new FormData(form), form);
          closeModal();
        } catch (err) {
          let b = form.querySelector('.form__banner');
          if (!b) {
            b = document.createElement('div');
            b.className = 'form__banner';
            form.prepend(b);
          }
          b.textContent = err.message || 'Ошибка';
          b.style.cssText = 'padding:.6rem .9rem;border-radius:8px;margin-bottom:1rem;font-size:.9rem;background:#fdecea;color:#c62828;border:1px solid #f5c6cb;';
        } finally {
          if (submitBtn) submitBtn.disabled = false;
        }
      };
    }
  
    // ============================================================
    // ВКЛАДКИ
    // ============================================================
    function initTabs() {
      $$('#admin-tabs .tabs__btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          $$('#admin-tabs .tabs__btn').forEach((b) => b.classList.remove('tabs__btn_active'));
          btn.classList.add('tabs__btn_active');
          $$('.tab-panel').forEach((p) => p.classList.remove('tab-panel_active'));
          const target = document.getElementById(btn.dataset.tab);
          if (target) target.classList.add('tab-panel_active');
  
          if (btn.dataset.tab === 'tab-products')   loadProducts();
          if (btn.dataset.tab === 'tab-categories') loadCategories();
          if (btn.dataset.tab === 'tab-users')      loadUsers();
          if (btn.dataset.tab === 'tab-feedback')   loadFeedback();
        });
      });
    }
  
    // ============================================================
    // ПРОДУКТЫ
    // ============================================================
    async function loadProducts() {
      const box = $('#products-admin');
      box.innerHTML = '<p class="form__note">Загрузка...</p>';
      try {
        const [products, categories] = await Promise.all([
          API.get('/admin/products', { auth: true }),
          API.get('/admin/categories', { auth: true }),
        ]);
        const cats = new Map(categories.map((c) => [c.id, c.name]));
  
        if (!products.length) {
          box.innerHTML = '<p class="form__note">Курсов нет.</p>';
          return;
        }
  
        box.innerHTML = `
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr class="table__head">
                  <th class="table__cell table__head">ID</th>
                  <th class="table__cell table__head">Название</th>
                  <th class="table__cell table__head">Alias</th>
                  <th class="table__cell table__head">Категория</th>
                  <th class="table__cell table__head">Цена</th>
                  <th class="table__cell table__head">Вкл.</th>
                  <th class="table__cell table__head">Действия</th>
                </tr>
              </thead>
              <tbody>
                ${products.map((p) => `
                  <tr>
                    <td class="table__cell">${p.id}</td>
                    <td class="table__cell">${escapeHtml(p.name)}</td>
                    <td class="table__cell"><code>${escapeHtml(p.alias)}</code></td>
                    <td class="table__cell">${escapeHtml(cats.get(p.category_id) || '—')}</td>
                    <td class="table__cell">${priceFmt(p.price)}</td>
                    <td class="table__cell">${p.available ? '✅' : '❌'}</td>
                    <td class="table__cell">
                      <div class="table__actions">
                        <button class="button button_size_s js-edit-prod" data-id="${p.id}">Ред.</button>
                        <button class="button button_size_s btn-danger js-del-prod" data-id="${p.id}">Удал.</button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
  
        box.querySelectorAll('.js-edit-prod').forEach((btn) =>
          btn.addEventListener('click', () => editProduct(Number(btn.dataset.id)))
        );
        box.querySelectorAll('.js-del-prod').forEach((btn) =>
          btn.addEventListener('click', () => delProduct(Number(btn.dataset.id)))
        );
      } catch (err) {
        box.innerHTML = `<p class="form__note" style="color:#c62828;">${escapeHtml(err.message)}</p>`;
      }
    }
  
    /**
     * Универсальная форма курса.
     * @param {number|null} id — null для создания
     */
    async function editProduct(id) {
      let categories = [];
      let product = null;
  
      try {
        categories = await API.get('/admin/categories', { auth: true });
        if (id) {
          const all = await API.get('/admin/products', { auth: true });
          product = all.find((p) => p.id === id) || null;
          if (!product) {
            alert('Курс не найден');
            return;
          }
        }
      } catch (err) {
        alert('Ошибка загрузки: ' + err.message);
        return;
      }
  
      const catOptions = categories.map((c) =>
        `<option value="${c.id}" ${product && product.category_id === c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`
      ).join('');
  
      const html = `
        <div class="form__field">
          <label class="form__label">Название *</label>
          <input class="form__input" name="name" required value="${product ? escapeHtml(product.name) : ''}">
        </div>
        <div class="form__field">
          <label class="form__label">Alias * (латиница, без пробелов)</label>
          <input class="form__input" name="alias" required value="${product ? escapeHtml(product.alias) : ''}">
        </div>
        <div class="form__field">
          <label class="form__label">Категория</label>
          <select class="form__input" name="category_id">
            <option value="">— без категории —</option>
            ${catOptions}
          </select>
        </div>
        <div class="form__field">
          <label class="form__label">Цена *</label>
          <input class="form__input" name="price" type="number" step="0.01" min="0" required
                 value="${product ? product.price : ''}">
        </div>
        <div class="form__field">
          <label class="form__label">Короткое описание</label>
          <input class="form__input" name="short_description"
                 value="${product ? escapeHtml(product.short_description || '') : ''}">
        </div>
        <div class="form__field">
          <label class="form__label">Описание</label>
          <textarea class="form__input" name="description" rows="4">${product ? escapeHtml(product.description || '') : ''}</textarea>
        </div>
        <div class="form__field">
          <label class="form__label">Картинка (путь)</label>
          <input class="form__input" name="image"
                 value="${product ? escapeHtml(product.image || '') : 'img/python.png'}">
        </div>
        <label class="form__check">
          <input type="checkbox" name="available" ${!product || product.available ? 'checked' : ''}>
          <span>Доступен для записи</span>
        </label>
        <button class="button button_theme_primary" type="submit">${product ? 'Сохранить' : 'Создать'}</button>
      `;
  
      openModal(
        product ? `Редактировать курс #${id}` : 'Новый курс',
        html,
        async (fd) => {
          const payload = {
            name: fd.get('name'),
            alias: fd.get('alias'),
            category_id: fd.get('category_id') ? Number(fd.get('category_id')) : null,
            price: fd.get('price'),
            short_description: fd.get('short_description') || null,
            description: fd.get('description') || null,
            image: fd.get('image') || null,
            available: !!fd.get('available'),
          };
          if (product) await API.put(`/admin/products/${id}`, payload, { auth: true });
          else         await API.post('/admin/products', payload, { auth: true });
          await loadProducts();
        }
      );
    }
  
    async function delProduct(id) {
      if (!confirm('Удалить курс?')) return;
      try {
        await API.del(`/admin/products/${id}`, { auth: true });
        await loadProducts();
      } catch (err) { alert(err.message); }
    }
  
    // ============================================================
    // КАТЕГОРИИ
    // ============================================================
    async function loadCategories() {
      const box = $('#categories-admin');
      box.innerHTML = '<p class="form__note">Загрузка...</p>';
      try {
        const items = await API.get('/admin/categories', { auth: true });
        if (!items.length) { box.innerHTML = '<p class="form__note">Категорий нет.</p>'; return; }
  
        box.innerHTML = `
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr class="table__head">
                  <th class="table__cell table__head">ID</th>
                  <th class="table__cell table__head">Название</th>
                  <th class="table__cell table__head">Alias</th>
                  <th class="table__cell table__head">Действия</th>
                </tr>
              </thead>
              <tbody>
                ${items.map((c) => `
                  <tr>
                    <td class="table__cell">${c.id}</td>
                    <td class="table__cell">${escapeHtml(c.name)}</td>
                    <td class="table__cell"><code>${escapeHtml(c.alias)}</code></td>
                    <td class="table__cell">
                      <div class="table__actions">
                        <button class="button button_size_s js-edit-cat" data-id="${c.id}">Ред.</button>
                        <button class="button button_size_s btn-danger js-del-cat" data-id="${c.id}">Удал.</button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
  
        box.querySelectorAll('.js-edit-cat').forEach((btn) =>
          btn.addEventListener('click', () => editCategory(Number(btn.dataset.id), items))
        );
        box.querySelectorAll('.js-del-cat').forEach((btn) =>
          btn.addEventListener('click', () => delCategory(Number(btn.dataset.id)))
        );
      } catch (err) {
        box.innerHTML = `<p class="form__note" style="color:#c62828;">${escapeHtml(err.message)}</p>`;
      }
    }
  
    function editCategory(id, list) {
      const cat = id ? list.find((c) => c.id === id) : null;
      const html = `
        <div class="form__field">
          <label class="form__label">Название *</label>
          <input class="form__input" name="name" required value="${cat ? escapeHtml(cat.name) : ''}">
        </div>
        <div class="form__field">
          <label class="form__label">Alias * (латиница, без пробелов)</label>
          <input class="form__input" name="alias" required value="${cat ? escapeHtml(cat.alias) : ''}">
        </div>
        <button class="button button_theme_primary" type="submit">${cat ? 'Сохранить' : 'Создать'}</button>
      `;
      openModal(cat ? `Категория #${id}` : 'Новая категория', html, async (fd) => {
        const payload = { name: fd.get('name'), alias: fd.get('alias') };
        if (cat) await API.put(`/admin/categories/${id}`, payload, { auth: true });
        else     await API.post('/admin/categories', payload, { auth: true });
        await loadCategories();
      });
    }
  
    async function delCategory(id) {
      if (!confirm('Удалить категорию? Курсы останутся без категории.')) return;
      try {
        await API.del(`/admin/categories/${id}`, { auth: true });
        await loadCategories();
      } catch (err) { alert(err.message); }
    }
  
    // ============================================================
    // ПОЛЬЗОВАТЕЛИ
    // ============================================================
    async function loadUsers() {
      const box = $('#users-admin');
      box.innerHTML = '<p class="form__note">Загрузка...</p>';
      try {
        const items = await API.get('/admin/users', { auth: true });
        box.innerHTML = `
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr class="table__head">
                  <th class="table__cell table__head">ID</th>
                  <th class="table__cell table__head">Имя</th>
                  <th class="table__cell table__head">Username</th>
                  <th class="table__cell table__head">Email</th>
                  <th class="table__cell table__head">Роль</th>
                  <th class="table__cell table__head">Действия</th>
                </tr>
              </thead>
              <tbody>
                ${items.map((u) => `
                  <tr>
                    <td class="table__cell">${u.id}</td>
                    <td class="table__cell">${escapeHtml(u.name)}</td>
                    <td class="table__cell">${escapeHtml(u.username)}</td>
                    <td class="table__cell">${escapeHtml(u.email)}</td>
                    <td class="table__cell">${u.role === 'admin' ? '🛡️ admin' : '👤 user'}</td>
                    <td class="table__cell">
                      <button class="button button_size_s ${u.role === 'admin' ? 'btn-warn' : 'btn-ok'} js-role"
                              data-id="${u.id}" data-role="${u.role}">
                        ${u.role === 'admin' ? 'Сделать user' : 'Сделать admin'}
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
  
        box.querySelectorAll('.js-role').forEach((btn) =>
          btn.addEventListener('click', async () => {
            const id = Number(btn.dataset.id);
            const newRole = btn.dataset.role === 'admin' ? 'user' : 'admin';
            if (!confirm(`Поменять роль на ${newRole}?`)) return;
            try {
              await API.put(`/admin/users/${id}/role`, { role: newRole }, { auth: true });
              await loadUsers();
            } catch (err) { alert(err.message); }
          })
        );
      } catch (err) {
        box.innerHTML = `<p class="form__note" style="color:#c62828;">${escapeHtml(err.message)}</p>`;
      }
    }
  
    // ============================================================
    // ОБРАТНАЯ СВЯЗЬ
    // ============================================================
    async function loadFeedback() {
      const box = $('#feedback-admin');
      const status = $('#fb-filter').value || '';
      box.innerHTML = '<p class="form__note">Загрузка...</p>';
      try {
        const q = status ? `?status=${encodeURIComponent(status)}` : '';
        const items = await API.get(`/admin/feedback${q}`, { auth: true });
  
        if (!items.length) { box.innerHTML = '<p class="form__note">Нет обращений.</p>'; return; }
  
        box.innerHTML = `
          <div class="stack">
            ${items.map((f) => `
              <article class="card" style="max-width:720px;">
                <div style="display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;">
                  <strong>#${f.id} · ${escapeHtml(f.subject)}</strong>
                  <span class="badge badge_${f.status}">${statusLabel(f.status)}</span>
                </div>
                <p class="form__note" style="margin:.25rem 0;">
                  ${escapeHtml(f.name)} &lt;${escapeHtml(f.email)}&gt; · ${escapeHtml(f.phone || '')}
                  · user_id: ${f.user_id ?? '—'}
                </p>
                <p style="margin:.5rem 0;white-space:pre-wrap;">${escapeHtml(f.message)}</p>
                <p class="form__note">${new Date(f.created_at).toLocaleString('ru-RU')}</p>
                <div class="table__actions">
                  <button class="button button_size_s btn-warn js-fb-new" data-id="${f.id}">Новое</button>
                  <button class="button button_size_s js-fb-progress" data-id="${f.id}">В работе</button>
                  <button class="button button_size_s btn-ok js-fb-resolved" data-id="${f.id}">Решено</button>
                </div>
              </article>
            `).join('')}
          </div>
        `;
  
        const setStatus = async (id, st) => {
          try {
            await API.put(`/admin/feedback/${id}`, { status: st }, { auth: true });
            await loadFeedback();
          } catch (err) { alert(err.message); }
        };
        box.querySelectorAll('.js-fb-new')     .forEach((b) => b.addEventListener('click', () => setStatus(Number(b.dataset.id), 'new')));
        box.querySelectorAll('.js-fb-progress').forEach((b) => b.addEventListener('click', () => setStatus(Number(b.dataset.id), 'in_progress')));
        box.querySelectorAll('.js-fb-resolved').forEach((b) => b.addEventListener('click', () => setStatus(Number(b.dataset.id), 'resolved')));
      } catch (err) {
        box.innerHTML = `<p class="form__note" style="color:#c62828;">${escapeHtml(err.message)}</p>`;
      }
    }
  
    // ============================================================
    // INIT
    // ============================================================
    async function init() {
      const me = API.getCachedUser();
      if (!me) {
        alert('Нет данных пользователя. Войдите заново.');
        window.location.href = 'contacts.html#login';
        return;
      }
      $('#admin-greeting').textContent =
        `Вы вошли как ${me.name} (${me.email}) — роль: администратор`;
  
      initTabs();
  
      // Кнопки создания
      $('#product-new')?.addEventListener('click', () => editProduct(null));
      $('#category-new')?.addEventListener('click', () => editCategory(null, []));
  
      // Фильтр feedback
      $('#fb-filter')?.addEventListener('change', loadFeedback);
  
      // Начальная вкладка
      await loadProducts();
    }
  
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  })();