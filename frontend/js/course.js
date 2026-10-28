/* ==========================================================================
   Neyman School — детальная страница курса
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
    function isInCart(id) {
      return readCart().some((i) => i.product_id === id);
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
  
    async function loadCourse() {
      const root = $('#course-root');
      if (!root) return;
  
      const alias = new URLSearchParams(location.search).get('alias');
      if (!alias) {
        root.innerHTML = '<p class="form__note" style="color:#c62828;">Курс не указан.</p>';
        return;
      }
  
      try {
        const p = await API.get(`/products/${encodeURIComponent(alias)}`);
        document.title = `${p.name}: Neyman School`;
        const inCart = isInCart(p.id);
  
        root.innerHTML = `
          <a href="courses.html" style="color:var(--blue);text-decoration:none;">← Все курсы</a>
          <h1 style="margin-top:1rem;">${escapeHtml(p.name)}</h1>
          <p class="form__note">${escapeHtml(p.category?.name || '')}</p>
          <div class="split" style="margin-top:2rem;">
            <div class="split__text">
              <p class="card__price" style="font-size:2rem;">${priceFmt(p.price)}</p>
              ${p.short_description ? `<p>${escapeHtml(p.short_description)}</p>` : ''}
              ${p.description ? `<p>${escapeHtml(p.description)}</p>` : ''}
              <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:1rem;">
                <button class="button button_theme_primary" id="add-to-cart" data-id="${p.id}" ${inCart ? 'disabled' : ''}>
                  ${inCart ? 'В корзине' : 'В корзину'}
                </button>
                <a class="button button_size_s" style="background:var(--sky);color:var(--navy);"
                   href="contacts.html#feedback">Узнать подробнее</a>
              </div>
            </div>
            <div class="split__media">
              ${p.image ? `<img class="card__photo" src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" style="max-width:320px;">` : ''}
            </div>
          </div>
  
          ${p.properties && p.properties.length ? `
            <section class="section" style="padding-top:2rem;">
              <h2>Характеристики</h2>
              <div class="table-wrap">
                <table class="table">
                  <tbody>
                    ${p.properties.map((pp) => `
                      <tr>
                        <th class="table__cell" style="width:40%;">${escapeHtml(pp.property_name)}</th>
                        <td class="table__cell">${escapeHtml(pp.property_value)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </section>
          ` : ''}
        `;
  
        const btn = $('#add-to-cart');
        if (btn) {
          btn.addEventListener('click', async () => {
            await addToCart(p.id);
            btn.disabled = true;
            btn.textContent = 'В корзине';
          });
        }
      } catch (err) {
        root.innerHTML = `<p class="form__note" style="color:#c62828;">Курс не найден: ${escapeHtml(err.message)}</p>`;
      }
    }
  
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', loadCourse);
    } else {
      loadCourse();
    }
  })();