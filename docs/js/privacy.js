/* ==========================================================================
   Neyman School — политика конфиденциальности (скачивание, печать)
   ========================================================================== */

   (function () {
    const $ = (sel, root = document) => root.querySelector(sel);
  
    function getPolicyText() {
      const article = $('#policy-text');
      if (!article) return '';
  
      // Получаем текст статьи и добавляем заголовки
      let text = 'ПОЛИТИКА КОНФИДЕНЦИАЛЬНОСТИ\nОнлайн-школа Neyman School\n';
      text += 'Дата последнего обновления: 14 октября 2026 г.\n\n';
      text += '='.repeat(60) + '\n\n';
  
      article.querySelectorAll('h2, p, li').forEach((el) => {
        if (el.tagName === 'H2') {
          text += '\n' + el.textContent.trim().toUpperCase() + '\n';
          text += '-'.repeat(el.textContent.length) + '\n';
        } else if (el.tagName === 'LI') {
          text += '  • ' + el.textContent.trim() + '\n';
        } else {
          text += el.textContent.trim() + '\n\n';
        }
      });
      return text;
    }
  
    function download() {
      const text = getPolicyText();
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Neyman_School_Политика_конфиденциальности.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  
    function init() {
      $('#download-policy')?.addEventListener('click', download);
      $('#print-policy')?.addEventListener('click', () => window.print());
    }
  
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  })();