/* ==========================================================================
   Neyman School — рендер курсов из API
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
  
    const CART_KEY = 'neyman.cart';
    function readCart() {
      try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); }
      catch { return []; }
    }
    function writeCart(items) {
      localStorage.setItem(CART_KEY, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent('cart:updated'));
    }
    function isInCart(productId) {
      return readCart().some((i) => i.product_id === productId);
    }
    async function addToCart(productId) {
      const items = readCart();
      const existing = items.find((i) => i.product_id === productId);
      if (existing) existing.quantity = Math.min(existing.quantity + 1, 99);
      else items.push({ product_id: productId, quantity: 1 });
      writeCart(items);
      if (API.isLoggedIn()) {
        try { await API.post('/basket', { product_id: productId, quantity: 1 }, { auth: true }); }
        catch (err) { console.warn(err.message); }
      }
    }
  
    function courseCardHtml(p) {
      const inCart = isInCart(p.id);
      return `
        <section class="card" data-product-id="${p.id}">
          <div class="card__head">
            <h3><a href="course.html?alias=${encodeURIComponent(p.alias)}"
                   style="color:inherit;text-decoration:none;">${escapeHtml(p.name)}</a></h3>
          </div>
          <p class="card__price">${priceFmt(p.price)}</p>
          ${p.short_description ? `<p class="form__note" style="margin:0;">${escapeHtml(p.short_description)}</p>` : ''}
          <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.75rem;">
            <a class="button button_theme_primary button_size_s"
               href="course.html?alias=${encodeURIComponent(p.alias)}">Подробнее</a>
            <button class="button button_size_s js-add-to-cart"
                    data-id="${p.id}"
                    style="background:var(--sky);color:var(--navy);"
                    ${inCart ? 'disabled' : ''}>
              ${inCart ? 'В корзине' : 'В корзину'}
            </button>
          </div>
        </section>
      `;
    }
  
    function bindAddToCart() {
      document.addEventListener('click', async (e) => {
        const btn = e.target.closest('.js-add-to-cart');
        if (!btn) return;
        e.preventDefault();
        const id = Number(btn.dataset.id);
        await addToCart(id);
        btn.disabled = true;
        btn.textContent = 'В корзине';
      });
    }
  
    async function renderCourses() {
      const root = $('#courses-root');
      if (!root) return;
  
      root.innerHTML = '<p class="form__note">Загрузка курсов...</p>';
      try {
        const [categories, products] = await Promise.all([
          API.get('/categories'),
          API.get('/products'),
        ]);
  
        if (!products.length) {
          root.innerHTML = '<p class="form__note">Курсы пока не добавлены.</p>';
          return;
        }
  
        const byCat = new Map();
        categories.forEach((c) => byCat.set(c.id, { ...c, products: [] }));
        products.forEach((p) => {
          if (byCat.has(p.category_id)) byCat.get(p.category_id).products.push(p);
        });
  
        let html = '';
        for (const cat of byCat.values()) {
          if (!cat.products.length) continue;
          html += `
            <section class="section">
              <h2>${escapeHtml(cat.name)}</h2>
              <div class="grid">
                ${cat.products.map(courseCardHtml).join('')}
              </div>
            </section>
          `;
        }
        root.innerHTML = html;
      } catch (err) {
        root.innerHTML = `<p class="form__note" style="color:#c62828;">Ошибка загрузки: ${escapeHtml(err.message)}</p>`;
      }
    }
  
    async function renderSchedule() {
      const tbody = $('#courses-schedule tbody');
      if (!tbody) return;
      try {
        const products = await API.get('/products?limit=3');
        if (!products.length) return;
        tbody.innerHTML = products.map((p, i) => `
          <tr>
            <th class="table__cell" scope="row">${escapeHtml(p.name)}</th>
            <td class="table__cell">${['6 октября', '13 октября', '20 октября'][i] || 'Скоро'}</td>
            <td class="table__cell">${['Вт, Чт', 'Пн, Ср', 'Вт, Пт'][i] || '—'}</td>
          </tr>
        `).join('');
      } catch (err) { console.warn(err.message); }
    }
  
    function init() {
      bindAddToCart();
      renderCourses();
      renderSchedule();
    }
  
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  })();