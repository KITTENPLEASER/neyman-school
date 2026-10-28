/* ==========================================================================
   Neyman School — auth
   Формы регистрации/входа, состояние логина, правка хедера.
   ========================================================================== */

   (function () {
    // ---------- утилиты ----------
    const $ = (sel, root = document) => root.querySelector(sel);
  
    function setError(field, message) {
      if (!field) return;
      field.setCustomValidity(message || '');
      if (message) {
        field.classList.add('form__input_error');
        field.reportValidity();
      } else {
        field.classList.remove('form__input_error');
      }
    }
  
    function clearFormErrors(form) {
      form.querySelectorAll('.form__input_error').forEach((el) => {
        el.classList.remove('form__input_error');
        el.setCustomValidity('');
      });
    }
  
    function showBanner(form, message, type = 'error') {
      let banner = form.querySelector('.form__banner');
      if (!banner) {
        banner = document.createElement('div');
        banner.className = 'form__banner';
        banner.setAttribute('role', 'status');
        form.prepend(banner);
      }
      banner.textContent = message;
      banner.dataset.type = type;
      banner.style.cssText = `
        padding: .75rem 1rem; border-radius: 8px; margin-bottom: 1rem;
        font-size: .9375rem;
        background: ${type === 'error' ? '#fdecea' : '#e8f5e9'};
        color: ${type === 'error' ? '#c62828' : '#1b5e20'};
        border: 1px solid ${type === 'error' ? '#f5c6cb' : '#c8e6c9'};
      `;
    }
  
    function clearBanner(form) {
      const b = form.querySelector('.form__banner');
      if (b) b.remove();
    }
  
    async function withLoading(button, fn) {
      const original = button.innerHTML;
      button.classList.add('button_loading');
      button.disabled = true;
      try {
        return await fn();
      } finally {
        button.classList.remove('button_loading');
        button.disabled = false;
        button.innerHTML = original;
      }
    }
  
    // ---------- регистрация ----------
    function bindRegister() {
      const form = $('#register');
      if (!form) return;
  
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearFormErrors(form);
        clearBanner(form);
  
        const fd = new FormData(form);
        const password = fd.get('password');
        const passwordConfirm = fd.get('password_confirm');
  
        if (password !== passwordConfirm) {
          setError($('#reg-password-confirm', form), 'Пароли не совпадают');
          return;
        }
  
        const payload = {
          name: (fd.get('name') || '').trim(),
          username: (fd.get('username') || '').trim(),
          email: (fd.get('email') || '').trim(),
          phone: (fd.get('phone') || '').trim(),
          password,
          password_confirm: passwordConfirm,
          consent_data: !!fd.get('consent_data'),
          consent_policy: !!fd.get('consent_policy'),
        };
  
        const btn = form.querySelector('button[type="submit"]');
        await withLoading(btn, async () => {
          try {
            await API.register(payload);
            showBanner(form, 'Регистрация прошла успешно!', 'success');
            setTimeout(() => {
              window.location.href = 'profile.html';
            }, 700);
          } catch (err) {
            showBanner(form, err.message || 'Ошибка регистрации', 'error');
          }
        });
      });
    }
  
    // ---------- логин ----------
    function bindLogin() {
      const form = $('#login');
      if (!form) return;
  
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearFormErrors(form);
        clearBanner(form);
  
        const fd = new FormData(form);
        const payload = {
          email: (fd.get('email') || '').trim(),
          password: fd.get('password') || '',
        };
  
        const btn = form.querySelector('button[type="submit"]');
        await withLoading(btn, async () => {
          try {
            await API.login(payload.email, payload.password);
            showBanner(form, 'Вход выполнен!', 'success');
            setTimeout(() => {
              window.location.href = 'profile.html';
            }, 500);
          } catch (err) {
            showBanner(form, err.message || 'Ошибка входа', 'error');
          }
        });
      });
    }
  
    // ---------- шапка: показать имя / кнопку выйти ----------
    function renderHeader() {
      const header = document.querySelector('.header');
      if (!header) return;
  
      const existing = header.querySelector('.header__cta');
      if (!existing) return;
  
      const user = API.getCachedUser();
      const logged = API.isLoggedIn() && !!user;
  
      let wrapper = existing.parentElement.querySelector('.header__user');
      if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.className = 'header__user';
        wrapper.style.cssText = 'display:flex;gap:.5rem;align-items:center;';
        existing.parentNode.insertBefore(wrapper, existing);
        wrapper.appendChild(existing);
      }
  
      if (logged) {
        existing.textContent = 'Личный кабинет';
        existing.href = 'profile.html';
        existing.style.display = '';
  
        let logoutBtn = wrapper.querySelector('.header__logout');
        if (!logoutBtn) {
          logoutBtn = document.createElement('button');
          logoutBtn.className = 'button button_size_s header__logout';
          logoutBtn.type = 'button';
          logoutBtn.textContent = 'Выйти';
          logoutBtn.style.cssText = 'background:transparent;color:#fff;border:1px solid rgba(255,255,255,.4);';
          logoutBtn.addEventListener('click', async () => {
            await API.logout();
            window.location.href = 'index.html';
          });
          wrapper.appendChild(logoutBtn);
        }
  
        let nameLink = wrapper.querySelector('.header__name');
        if (!nameLink) {
          nameLink = document.createElement('a');
          nameLink.className = 'header__name';
          nameLink.style.cssText = 'color:#c4defd;text-decoration:none;font-size:.9rem;';
          wrapper.insertBefore(nameLink, existing);
        }
        nameLink.href = user.role === 'admin' ? 'admin.html' : 'profile.html';
        nameLink.textContent = user.name || user.username;
  
        if (user.role === 'admin') {
          let adminLink = wrapper.querySelector('.header__admin');
          if (!adminLink) {
            adminLink = document.createElement('a');
            adminLink.className = 'button button_size_s header__admin';
            adminLink.href = 'admin.html';
            adminLink.textContent = 'Админка';
            adminLink.style.cssText = 'background:#4f9cf9;color:#fff;text-decoration:none;padding:.4rem .8rem;border-radius:6px;font-size:.85rem;';
            wrapper.insertBefore(adminLink, existing);
          }
        } else {
          const adminLink = wrapper.querySelector('.header__admin');
          if (adminLink) adminLink.remove();
        }
      } else {
        existing.textContent = 'Войти';
        existing.href = 'contacts.html#login';
        existing.style.display = '';
  
        const logoutBtn = wrapper.querySelector('.header__logout');
        if (logoutBtn) logoutBtn.remove();
        const nameLink = wrapper.querySelector('.header__name');
        if (nameLink) nameLink.remove();
        const adminLink = wrapper.querySelector('.header__admin');
        if (adminLink) adminLink.remove();
      }
    }
  
    // ---------- синк корзины с сервером после логина ----------
    async function syncCartIfNeeded() {
      if (!API.isLoggedIn()) return;
      let local = [];
      try {
        local = JSON.parse(localStorage.getItem('neyman.cart') || '[]');
      } catch {
        local = [];
        localStorage.removeItem('neyman.cart');
      }
      if (!local.length) return;
      try {
        await API.post('/basket/sync', { items: local }, { auth: true });
        localStorage.removeItem('neyman.cart');
        window.dispatchEvent(new CustomEvent('cart:updated'));
      } catch (err) {
        console.warn('Sync cart failed:', err.message);
      }
    }
  
    // ---------- инициализация ----------
    async function init() {
      // 1. Обновить данные о юзере (если токен есть)
      if (API.getAccess()) {
        await API.loadMe();
      }
  
      // 2. Нарисовать хедер (имя / войти-выйти)
      renderHeader();
  
      // 3. Синк локальной корзины (только если залогинен и что-то лежит в localStorage)
      await syncCartIfNeeded();
  
      // 4. Навесить обработчики форм
      bindRegister();
      bindLogin();
  
      // 5. Слушаем события для перерисовки хедера
      window.addEventListener('auth:logout', renderHeader);
      window.addEventListener('auth:login', renderHeader);
      window.addEventListener('storage', (e) => {
        if (e.key && e.key.startsWith('neyman.')) renderHeader();
      });
  
      // 6. Скролл к нужной форме по хэшу (#login / #register)
      if (location.hash === '#login') {
        const loginForm = document.getElementById('login');
        if (loginForm) loginForm.scrollIntoView({ behavior: 'smooth' });
      }
      if (location.hash === '#register') {
        const regForm = document.getElementById('register');
        if (regForm) regForm.scrollIntoView({ behavior: 'smooth' });
      }
    }
  
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  })();