if (!customElements.get('cart-drawer')) {
  class CartDrawer extends HTMLElement {
    connectedCallback() {
      this.controller = new AbortController();
      this.queue = Promise.resolve();
      const initialize = () => this.initialize();
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize, { once: true, signal: this.controller.signal });
      } else initialize();
    }

    initialize() {
      if (!this.isConnected || this.initialized) return;
      this.initialized = true;
      this.dialog = this.querySelector('dialog');
      this.content = this.querySelector('[data-cart-content]');
      this.error = this.querySelector('[data-cart-drawer-error]');
      this.status = this.querySelector('[data-cart-status]');
      const options = { signal: this.controller.signal };
      document.addEventListener('click', (event) => {
        const trigger = event.target.closest('[data-cart-open]');
        if (!trigger || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
        event.preventDefault();
        this.open(trigger);
        this.enqueue(async () => {
          try { await this.render(); }
          catch { this.showError(this.dataset.errorMessage); }
        });
      }, options);
      document.addEventListener('submit', (event) => {
        if (!event.target.matches('form[data-cart-add]')) return;
        event.preventDefault();
        this.add(event.target, event.submitter);
      }, options);
      this.addEventListener('click', (event) => {
        if (event.target.closest('[data-cart-close]')) this.dialog.close();
        const action = event.target.closest('[data-cart-action]');
        if (!action || this.busy) return;
        const row = action.closest('[data-cart-key]');
        const quantity = Number(row.querySelector('[data-cart-quantity]').dataset.currentQuantity);
        this.change(row, action.dataset.cartAction === 'remove' ? 0 : quantity + (action.dataset.cartAction === 'increase' ? 1 : -1), action.dataset.cartAction);
      }, options);
      this.addEventListener('change', (event) => {
        if (!event.target.matches('[data-cart-quantity]') || this.busy) return;
        const input = event.target;
        const quantity = Number(input.value);
        if (!input.value.trim() || !Number.isSafeInteger(quantity) || quantity < 0) {
          input.value = input.dataset.currentQuantity;
          this.showError(this.dataset.quantityError);
          return;
        }
        if (quantity !== Number(input.dataset.currentQuantity)) this.change(input.closest('[data-cart-key]'), quantity);
      }, options);
      this.dialog.addEventListener('click', (event) => {
        if (event.target !== this.dialog) return;
        const bounds = this.dialog.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) this.dialog.close();
      }, options);
      this.dialog.addEventListener('close', () => {
        document.querySelectorAll('[data-cart-open]').forEach((trigger) => trigger.setAttribute('aria-expanded', 'false'));
        if (this.opener?.isConnected) this.opener.focus({ preventScroll: true });
      }, options);
      this.updateCount();
    }

    open(trigger) {
      this.error.hidden = true;
      if (this.dialog.open) return;
      this.opener = trigger || document.activeElement;
      this.dialog.showModal();
      document.querySelectorAll('[data-cart-open]').forEach((item) => item.setAttribute('aria-expanded', 'true'));
    }

    enqueue(action) {
      const run = async () => {
        this.setBusy(true);
        this.error.hidden = true;
        this.status.textContent = '';
        try { await action(); }
        finally { this.setBusy(false); }
      };
      this.queue = this.queue.then(run, run);
      return this.queue;
    }

    async request(url, options) {
      const response = await fetch(url, { ...options, headers: { Accept: 'application/json', ...options.headers }, signal: this.controller.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.description === 'string' ? data.description : this.dataset.errorMessage);
      return data;
    }

    add(form, submitter) {
      if (form.getAttribute('aria-busy') === 'true') return;
      const button = submitter || form.querySelector('[type="submit"]');
      const formError = form.querySelector('[data-cart-error]');
      const data = new FormData(form);
      data.set('sections', this.dataset.sectionId);
      data.set('sections_url', window.location.pathname);
      if (formError) formError.hidden = true;
      form.setAttribute('aria-busy', 'true');
      if (button) button.disabled = true;
      this.enqueue(async () => {
        let added = false;
        try {
          const result = await this.request(`${this.dataset.addUrl}.js`, { method: 'POST', body: data });
          added = true;
          await this.render(result);
          this.open(button);
        } catch (error) {
          if (added) {
            this.open(button);
            this.showError(this.dataset.refreshError);
          } else if (formError) {
            formError.textContent = error.message || this.dataset.errorMessage;
            formError.hidden = false;
          }
        } finally {
          form.removeAttribute('aria-busy');
          if (button) button.disabled = form.dataset.variantAvailable === 'false';
        }
      });
    }

    change(row, quantity, action) {
      const key = row.dataset.cartKey;
      const index = [...this.querySelectorAll('[data-cart-key]')].indexOf(row);
      this.enqueue(async () => {
        let changed = false;
        try {
          const result = await this.request(`${this.dataset.changeUrl}.js`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: key, quantity, sections: this.dataset.sectionId, sections_url: window.location.pathname })
          });
          changed = true;
          await this.render(result);
        } catch (error) {
          const input = row.querySelector('[data-cart-quantity]');
          if (input.isConnected) input.value = input.dataset.currentQuantity;
          this.showError(changed ? this.dataset.refreshError : error.message || this.dataset.errorMessage);
        }
      }).then(() => {
        if (!this.dialog.open) return;
        const rows = [...this.querySelectorAll('[data-cart-key]')];
        const next = rows.find((item) => item.dataset.cartKey === key) || rows[Math.min(index, rows.length - 1)];
        const selector = action && action !== 'remove' ? `[data-cart-action="${action}"]` : '[data-cart-quantity]';
        (next?.querySelector(selector) || this.querySelector('[data-cart-close]')).focus({ preventScroll: true });
      });
    }

    async render(data) {
      let html = data?.sections?.[this.dataset.sectionId];
      if (!html) {
        const url = new URL(this.dataset.rootUrl, window.location.origin);
        url.searchParams.set('section_id', this.dataset.sectionId);
        const response = await fetch(url, { signal: this.controller.signal });
        if (!response.ok) throw new Error(this.dataset.errorMessage);
        html = await response.text();
      }
      const document = new DOMParser().parseFromString(html, 'text/html');
      const content = document.querySelector('[data-cart-content]');
      if (!content) throw new Error(this.dataset.errorMessage);
      this.content.replaceChildren(...content.childNodes);
      this.content.dataset.itemCount = content.dataset.itemCount;
      this.updateCount();
      this.setBusy(this.busy);
      this.status.textContent = this.dataset.updatedLabel;
    }

    updateCount() {
      const count = Number(this.content.dataset.itemCount);
      document.querySelectorAll('[data-cart-count]').forEach((badge) => {
        badge.textContent = String(count);
        badge.hidden = count === 0;
      });
      document.querySelectorAll('[data-cart-open]').forEach((trigger) => trigger.setAttribute('aria-label', this.dataset.countLabel.replace('[count]', String(count))));
    }

    setBusy(value) {
      this.busy = value;
      this.content.setAttribute('aria-busy', String(value));
      this.querySelectorAll('[data-cart-control]').forEach((control) => { control.disabled = value; });
    }

    showError(message) {
      this.error.textContent = message;
      this.error.hidden = false;
    }

    disconnectedCallback() {
      if (this.dialog?.open) this.dialog.close();
      this.controller?.abort();
      this.initialized = false;
    }
  }
  customElements.define('cart-drawer', CartDrawer);
}
