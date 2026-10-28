/* ==========================================================================
   Neyman School — слайдер на главной
   ========================================================================== */

   (function () {
    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  
    function init() {
      const track = $('#slider-track');
      const dotsBox = $('#slider-dots');
      if (!track || !dotsBox) return;
  
      const slides = $$('.slider__slide', track);
      if (slides.length < 2) return;
  
      let current = 0;
      let timer = null;
  
      // точки
      dotsBox.innerHTML = slides.map((_, i) =>
        `<button class="slider__dot ${i === 0 ? 'slider__dot_active' : ''}" type="button"
                 aria-label="Слайд ${i + 1}" data-index="${i}"></button>`
      ).join('');
  
      const dots = $$('.slider__dot', dotsBox);
  
      function render() {
        track.style.transform = `translateX(-${current * 100}%)`;
        dots.forEach((d, i) => d.classList.toggle('slider__dot_active', i === current));
      }
  
      function go(n) {
        current = (n + slides.length) % slides.length;
        render();
      }
  
      function next() { go(current + 1); }
      function prev() { go(current - 1); }
  
      function start() {
        stop();
        timer = setInterval(next, 6000);
      }
      function stop() {
        if (timer) { clearInterval(timer); timer = null; }
      }
  
      $('#slider-next')?.addEventListener('click', () => { next(); start(); });
      $('#slider-prev')?.addEventListener('click', () => { prev(); start(); });
      dotsBox.addEventListener('click', (e) => {
        const d = e.target.closest('.slider__dot');
        if (!d) return;
        go(Number(d.dataset.index));
        start();
      });
  
      // пауза при наведении
      const root = $('#slider');
      root?.addEventListener('mouseenter', stop);
      root?.addEventListener('mouseleave', start);
  
      // свайпы
      let startX = 0;
      root?.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
      root?.addEventListener('touchend', (e) => {
        const dx = e.changedTouches[0].clientX - startX;
        if (Math.abs(dx) > 40) {
          if (dx < 0) next(); else prev();
          start();
        }
      });
  
      render();
      start();
    }
  
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  })();