/* ==========================================================================
   Neyman School — поиск по курсам
   ========================================================================== */

   (function () {
    const $ = (sel, root = document) => root.querySelector(sel);
  
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
  
    // ---------- отрисовка результатов ----------
    function renderResults(query, items) {
      const box = $('#search-results');
      if (!box) return;
      if (!items.length) {
        box.innerHTML = `<p class="form__note">По запросу «${escapeHtml(query)}» ничего не найдено.</p>`;
        return;
      }
      box.innerHTML = `
        <h2>Результаты поиска: «${escapeHtml(query)}»</h2>
        <div class="grid">
          ${items.map((p) => `
            <section class="card">
              <h3><a href="course.html?alias=${encodeURIComponent(p.alias)}"
                     style="color:inherit;text-decoration:none;">${escapeHtml(p.name)}</a></h3>
              <p class="card__price">${priceFmt(p.price)}</p>
              ${p.short_description ? `<p class="form__note" style="margin:0;">${escapeHtml(p.short_description)}</p>` : ''}
              <a class="button button_theme_primary button_size_s" style="margin-top:.75rem;"
                 href="course.html?alias=${encodeURIComponent(p.alias)}">Подробнее</a>
            </section>
          `).join('')}
        </div>
      `;
    }
  
    function openSearchPanel() {
      const panel = $('#search-panel');
      if (!panel) return;
      panel.hidden = false;
      panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    function closeSearchPanel() {
      const panel = $('#search-panel');
      if (panel) panel.hidden = true;
    }
  
    // ---------- обработка сабмита ----------
    async function runSearch(query) {
      const box = $('#search-results');
      if (!box) return;
      box.innerHTML = '<p class="form__note">Ищем...</p>';
      openSearchPanel();
      try {
        const items = await API.get(`/search?q=${encodeURIComponent(query)}`);
        renderResults(query, items);
      } catch (err) {
        box.innerHTML = `<p class="form__note" style="color:#c62828;">Ошибка: ${escapeHtml(err.message)}</p>`;
      }
    }
  
    function bind() {
      // поле поиска в хедере
      document.addEventListener('submit', (e) => {
        const form = e.target.closest('.js-search-form');
        if (!form) return;
        e.preventDefault();
        const q = (form.querySelector('input[name="q"]').value || '').trim();
        if (!q) return;
        runSearch(q);
      });
  
      // кнопка «закрыть» в панели результатов
      document.addEventListener('click', (e) => {
        if (e.target.closest('#search-close')) {
          closeSearchPanel();
        }
      });
  
      // Esc закрывает панель
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeSearchPanel();
      });
  
      // при загрузке со ?q=... сразу ищем
      const params = new URLSearchParams(location.search);
      const q = params.get('q');
      if (q) runSearch(q);
    }
  
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', bind);
    } else {
      bind();
    }
  })();