/* ==========================================================================
   Neyman School — обратная связь
   ========================================================================== */

   (function () {
    const $ = (sel, root = document) => root.querySelector(sel);
  
    function showBanner(form, message, type = 'error') {
      let banner = form.querySelector('.form__banner');
      if (!banner) {
        banner = document.createElement('div');
        banner.className = 'form__banner';
        banner.setAttribute('role', 'status');
        form.prepend(banner);
      }
      banner.textContent = message;
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
      try { return await fn(); }
      finally {
        button.classList.remove('button_loading');
        button.disabled = false;
        button.innerHTML = original;
      }
    }
  
    function bindFeedback() {
      const form = $('#feedback');
      if (!form) return;
  
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearBanner(form);
  
        const fd = new FormData(form);
        const payload = {
          name: (fd.get('name') || '').trim(),
          email: (fd.get('email') || '').trim(),
          phone: (fd.get('phone') || '').trim(),
          subject: (fd.get('subject') || '').trim(),
          message: (fd.get('message') || '').trim(),
          privacy: !!fd.get('privacy'),
        };
  
        if (!payload.privacy) {
          showBanner(form, 'Отметьте согласие на обработку персональных данных', 'error');
          return;
        }
  
        const btn = form.querySelector('button[type="submit"]');
        await withLoading(btn, async () => {
          try {
            await API.post('/feedback', payload, { auth: API.isLoggedIn() });
            form.reset();
            showBanner(form, 'Сообщение отправлено! Мы свяжемся с вами в ближайшее время.', 'success');
          } catch (err) {
            showBanner(form, err.message || 'Не удалось отправить сообщение', 'error');
          }
        });
      });
    }
  
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', bindFeedback);
    } else {
      bindFeedback();
    }
  })();