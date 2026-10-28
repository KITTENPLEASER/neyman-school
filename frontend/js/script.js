/* ==========================================================================
   Neyman School — общий UI (бургер, маска телефона, валидация паролей).
   API-логика вынесена в api.js / auth.js / feedback.js.
   ========================================================================== */

   const burger = document.querySelector('.burger');
   const list = document.querySelector('.nav__list');
   function setMenu(open) {
     if (!burger || !list) return;
     list.classList.toggle('active', open);
     burger.setAttribute('aria-expanded', open);
     burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
   }
   if (burger) {
     burger.addEventListener('click', () =>
       setMenu(burger.getAttribute('aria-expanded') !== 'true')
     );
     document.addEventListener('keydown', (e) => {
       if (e.key === 'Escape') setMenu(false);
     });
     document.addEventListener('click', (e) => {
       if (!e.target.closest('.header')) setMenu(false);
     });
   }
   
   // === Маска для телефона (регистрация) ===
   var phoneInput = document.getElementById('reg-phone');
   if (phoneInput && typeof IMask !== 'undefined') {
     IMask(phoneInput, { mask: '+7 (000) 000-00-00', lazy: false });
   }
   
   // === Проверка совпадения паролей ===
   var password = document.getElementById('reg-password');
   var passwordConfirm = document.getElementById('reg-password-confirm');
   if (password && passwordConfirm) {
     function checkPasswords() {
       if (passwordConfirm.value === '') {
         passwordConfirm.setCustomValidity('');
         return;
       }
       if (password.value !== passwordConfirm.value) {
         passwordConfirm.setCustomValidity('Пароли не совпадают');
       } else {
         passwordConfirm.setCustomValidity('');
       }
     }
     password.addEventListener('input', checkPasswords);
     passwordConfirm.addEventListener('input', checkPasswords);
   }
   
   // === Маска для телефона (feedback) ===
   var phoneFeedback = document.getElementById('fb-phone');
   if (phoneFeedback && typeof IMask !== 'undefined') {
     IMask(phoneFeedback, { mask: '+7 (000) 000-00-00', lazy: false });
   }