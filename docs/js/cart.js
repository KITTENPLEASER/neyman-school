/* ==========================================================================
   Neyman School — корзина
   - гость: localStorage
   - авторизован: сервер + локальный кэш
   ========================================================================== */

   const CART_KEY = 'neyman.cart';

   function readCart() {
     try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); }
     catch { return []; }
   }
   function writeCart(items) {
     localStorage.setItem(CART_KEY, JSON.stringify(items));
     updateCartBadge();
     window.dispatchEvent(new CustomEvent('cart:updated'));
   }
   
   function totalLocalQty() {
     return readCart().reduce((s, i) => s + (i.quantity || 0), 0);
   }
   
   // ---------- бейдж в хедере ----------
   function updateCartBadge() {
     const badge = document.querySelector('.cart-badge');
     if (!badge) return;
     const qty = totalLocalQty();
     badge.textContent = qty;
     badge.hidden = qty === 0;
   }
   
   // ---------- синк с сервером ----------
   async function syncLocalToServer() {
     if (!API.isLoggedIn()) return;
     const items = readCart();
     if (!items.length) return;
     try {
       await API.post('/basket/sync', { items }, { auth: true });
       // после синка — можно очистить localStorage, потому что теперь источник правды — сервер
       localStorage.removeItem(CART_KEY);
       updateCartBadge();
     } catch (err) {
       console.warn('Не удалось синхронизировать корзину:', err.message);
     }
   }
   
   // ---------- получить корзину для отображения ----------
   async function fetchCart() {
     // авторизован — с сервера
     if (API.isLoggedIn()) {
       try {
         const data = await API.get('/basket', { auth: true });
         // обновим localStorage на случай оффлайна
         const localItems = data.items.map((i) => ({ product_id: i.product_id, quantity: i.quantity }));
         localStorage.setItem(CART_KEY, JSON.stringify(localItems));
         updateCartBadge();
         return data;
       } catch (err) {
         console.warn('Не удалось получить корзину с сервера:', err.message);
       }
     }
   
     // гость — из localStorage, но нужны детали продуктов
     const local = readCart();
     if (!local.length) return { items: [], total_quantity: 0, total_price: 0 };
   
     // подтягиваем продукты
     const productIds = local.map((i) => i.product_id);
     const products = await Promise.all(
       productIds.map((id) =>
         API.get(`/products`).then((arr) => arr.find((p) => p.id === id)).catch(() => null)
       )
     );
   
     const items = local
       .map((i, idx) => {
         const p = products[idx];
         if (!p) return null;
         return {
           id: null,
           product_id: p.id,
           quantity: i.quantity,
           product_name: p.name,
           product_alias: p.alias,
           product_price: Number(p.price),
           product_image: p.image,
         };
       })
       .filter(Boolean);
   
     return {
       items,
       total_quantity: items.reduce((s, i) => s + i.quantity, 0),
       total_price: items.reduce((s, i) => s + i.product_price * i.quantity, 0),
     };
   }
   
   // ---------- операции ----------
   async function setQuantity(productId, quantity) {
     if (quantity < 1) quantity = 1;
     if (quantity > 99) quantity = 99;
   
     if (API.isLoggedIn()) {
       // найдём item_id: fetch свежий список с сервера
       const fresh = await API.get('/basket', { auth: true });
       const item = fresh.items.find((i) => i.product_id === productId);
       if (!item) throw new Error('Позиция не найдена');
       await API.put(`/basket/${item.id}`, { quantity }, { auth: true });
     } else {
       const items = readCart();
       const it = items.find((i) => i.product_id === productId);
       if (it) it.quantity = quantity;
       writeCart(items);
     }
   }
   
   async function removeFromCart(productId) {
     if (API.isLoggedIn()) {
       const fresh = await API.get('/basket', { auth: true });
       const item = fresh.items.find((i) => i.product_id === productId);
       if (item) {
         await API.del(`/basket/${item.id}`, { auth: true });
       }
     } else {
       const items = readCart().filter((i) => i.product_id !== productId);
       writeCart(items);
     }
   }
   
   async function clearCart() {
     if (API.isLoggedIn()) {
       await API.del('/basket', { auth: true });
     }
     writeCart([]);
   }
   
   // ---------- рендер страницы cart.html ----------
   async function renderCartPage() {
     const root = document.getElementById('cart-root');
     if (!root) return;
   
     root.innerHTML = '<p class="form__note">Загрузка корзины...</p>';
   
     try {
       const cart = await fetchCart();
       if (!cart.items.length) {
         root.innerHTML = `
           <p class="form__note">Корзина пуста.</p>
           <a class="button button_theme_primary" href="courses.html">Перейти к курсам</a>
         `;
         return;
       }
   
       const fmt = (n) => Number(n).toLocaleString('ru-RU') + ' ₽';
   
       root.innerHTML = `
         <div class="table-wrap">
           <table class="table">
             <thead>
               <tr class="table__head">
                 <th class="table__cell table__head">Курс</th>
                 <th class="table__cell table__head">Цена</th>
                 <th class="table__cell table__head">Кол-во</th>
                 <th class="table__cell table__head">Сумма</th>
                 <th class="table__cell table__head"></th>
               </tr>
             </thead>
             <tbody>
               ${cart.items.map((i) => `
                 <tr data-product-id="${i.product_id}">
                   <td class="table__cell">
                     <a href="course.html?alias=${encodeURIComponent(i.product_alias)}"
                        style="color:var(--blue);text-decoration:none;">${escapeHtml(i.product_name)}</a>
                   </td>
                   <td class="table__cell">${fmt(i.product_price)}</td>
                   <td class="table__cell">
                     <input type="number" min="1" max="99" value="${i.quantity}"
                            class="js-qty form__input" style="max-width:80px;"
                            data-product-id="${i.product_id}">
                   </td>
                   <td class="table__cell">${fmt(i.product_price * i.quantity)}</td>
                   <td class="table__cell">
                     <button class="button button_size_s js-remove"
                             data-product-id="${i.product_id}"
                             style="background:#fdecea;color:#c62828;">Удалить</button>
                   </td>
                 </tr>
               `).join('')}
             </tbody>
             <tfoot>
               <tr>
                 <th class="table__cell" colspan="3" style="text-align:right;">Итого:</th>
                 <td class="table__cell"><strong>${fmt(cart.total_price)}</strong></td>
                 <td class="table__cell"></td>
               </tr>
             </tfoot>
           </table>
         </div>
         <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:1.5rem;">
           <a class="button button_theme_primary" href="contacts.html#feedback">Оформить заявку</a>
           <button class="button button_size_s js-clear"
                   style="background:transparent;color:#c62828;border:1px solid #f5c6cb;">Очистить корзину</button>
         </div>
       `;
     } catch (err) {
       root.innerHTML = `<p class="form__note" style="color:#c62828;">Ошибка: ${escapeHtml(err.message)}</p>`;
     }
   }
   
   function escapeHtml(s) {
     if (s == null) return '';
     return String(s)
       .replaceAll('&', '&amp;')
       .replaceAll('<', '&lt;')
       .replaceAll('>', '&gt;')
       .replaceAll('"', '&quot;')
       .replaceAll("'", '&#039;');
   }
   
   // ---------- делегирование событий на cart.html ----------
   function bindCartPage() {
     const root = document.getElementById('cart-root');
     if (!root) return;
   
     root.addEventListener('change', async (e) => {
       const qty = e.target.closest('.js-qty');
       if (!qty) return;
       const pid = Number(qty.dataset.productId);
       const val = Number(qty.value);
       try {
         await setQuantity(pid, val);
         await renderCartPage();
       } catch (err) { alert(err.message); }
     });
   
     root.addEventListener('click', async (e) => {
       const rm = e.target.closest('.js-remove');
       if (rm) {
         await removeFromCart(Number(rm.dataset.productId));
         await renderCartPage();
         return;
       }
       if (e.target.closest('.js-clear')) {
         if (confirm('Очистить корзину?')) {
           await clearCart();
           await renderCartPage();
         }
       }
     });
   }
   
   // ---------- init ----------
   function initCart() {
     updateCartBadge();
     bindCartPage();
     renderCartPage();
     window.addEventListener('cart:updated', updateCartBadge);
     window.addEventListener('auth:login', () => { syncLocalToServer().finally(renderCartPage); });
     window.addEventListener('auth:logout', () => { updateCartBadge(); renderCartPage(); });
   }
   
   if (document.readyState === 'loading') {
     document.addEventListener('DOMContentLoaded', initCart);
   } else {
     initCart();
   }