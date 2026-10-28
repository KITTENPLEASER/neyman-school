/* ==========================================================================
   Neyman School — API client
   Обёртка над fetch с автоматическим JWT (access + refresh) и хранением в localStorage.
   ========================================================================== */

   const API_BASE = 'https://neyman-school.de1.netrun.io/api';

   const API = {
     // --- storage keys ---
     ACCESS_KEY: 'neyman.access_token',
     REFRESH_KEY: 'neyman.refresh_token',
     USER_KEY: 'neyman.user',
   
     // ---------- токены ----------
     getAccess() {
       return localStorage.getItem(this.ACCESS_KEY);
     },
     getRefresh() {
       return localStorage.getItem(this.REFRESH_KEY);
     },
     setTokens({ access_token, refresh_token }) {
       if (access_token) localStorage.setItem(this.ACCESS_KEY, access_token);
       if (refresh_token) localStorage.setItem(this.REFRESH_KEY, refresh_token);
     },
     clearTokens() {
       localStorage.removeItem(this.ACCESS_KEY);
       localStorage.removeItem(this.REFRESH_KEY);
       localStorage.removeItem(this.USER_KEY);
     },
   
     // ---------- юзер в кэше ----------
     getCachedUser() {
       const raw = localStorage.getItem(this.USER_KEY);
       try { return raw ? JSON.parse(raw) : null; } catch { return null; }
     },
     setCachedUser(user) {
       if (user) localStorage.setItem(this.USER_KEY, JSON.stringify(user));
       else localStorage.removeItem(this.USER_KEY);
     },
     isLoggedIn() {
       return !!this.getAccess();
     },
     isAdmin() {
       const u = this.getCachedUser();
       return u && u.role === 'admin';
     },
   
     // ---------- refresh ----------
     async refreshTokens() {
       const refresh = this.getRefresh();
       if (!refresh) return false;
       try {
         const res = await fetch(`${API_BASE}/auth/refresh`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ refresh_token: refresh }),
         });
         if (!res.ok) {
           this.clearTokens();
           return false;
         }
         const data = await res.json();
         this.setTokens(data);
         return true;
       } catch {
         return false;
       }
     },
   
     // ---------- базовый запрос ----------
     /**
      * @param {string} path — например '/auth/login' или '/products?category=design'
      * @param {object} options — { method, body, auth, headers, raw }
      *   auth: true  — добавлять Authorization из access-токена
      *   raw:  true  — вернуть Response целиком (для blob/скачивания)
      */
     async request(path, options = {}) {
       const { method = 'GET', body, auth = false, headers = {}, raw = false } = options;
   
       const finalHeaders = { ...headers };
       if (body && !(body instanceof FormData)) {
         finalHeaders['Content-Type'] = 'application/json';
       }
       if (auth && this.getAccess()) {
         finalHeaders['Authorization'] = `Bearer ${this.getAccess()}`;
       }
   
       const doFetch = () =>
         fetch(`${API_BASE}${path}`, {
           method,
           headers: finalHeaders,
           body: body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined),
         });
   
       let res = await doFetch();
   
       // авто-refresh при истёкшем access
       if (res.status === 401 && auth && this.getRefresh()) {
         const ok = await this.refreshTokens();
         if (ok) {
           finalHeaders['Authorization'] = `Bearer ${this.getAccess()}`;
           res = await doFetch();
         } else {
           this.clearTokens();
           window.dispatchEvent(new CustomEvent('auth:logout'));
         }
       }
   
       if (raw) return res;
   
       // --- парсим ответ ---
       const text = await res.text();
       let data = null;
       try { data = text ? JSON.parse(text) : null; } catch { data = text; }
   
       if (!res.ok) {
         const error = new Error(
           (data && (data.detail || data.message)) || `HTTP ${res.status}`
         );
         error.status = res.status;
         error.data = data;
         if (Array.isArray(data?.detail)) {
           error.message = data.detail
             .map((d) => `${d.loc?.slice(-1)[0] || ''}: ${d.msg}`)
             .join('; ');
         }
         throw error;
       }
       return data;
     },
   
     // ---------- shortcuts ----------
     get(path, opts = {})       { return this.request(path, { ...opts, method: 'GET' }); },
     post(path, body, opts = {}){ return this.request(path, { ...opts, method: 'POST', body }); },
     put(path, body, opts = {}) { return this.request(path, { ...opts, method: 'PUT', body }); },
     del(path, opts = {})       { return this.request(path, { ...opts, method: 'DELETE' }); },
   
     // ---------- конкретные эндпоинты ----------
     async register(payload) {
       const data = await this.post('/auth/register', payload);
       this.setTokens(data);
       await this.loadMe();
       return data;
     },
     async login(email, password) {
       const data = await this.post('/auth/login', { email, password });
       this.setTokens(data);
       await this.loadMe();
       return data;
     },
     async logout() {
       const refresh = this.getRefresh();
       try {
         if (refresh) await this.post('/auth/logout', { refresh_token: refresh }, { auth: true });
       } catch { /* игнорируем — токен мог истечь */ }
       this.clearTokens();
       window.dispatchEvent(new CustomEvent('auth:logout'));
     },
     async loadMe() {
       if (!this.getAccess()) { this.setCachedUser(null); return null; }
       try {
         const me = await this.get('/auth/me', { auth: true });
         this.setCachedUser(me);
         return me;
       } catch {
         this.setCachedUser(null);
         return null;
       }
     },
   };
   
   window.API = API;