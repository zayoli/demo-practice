if (!customElements.get('top-picks-card')) {
  class TopPicksCard extends HTMLElement {
    connectedCallback() {
      this.controller = new AbortController();
      const initialize = () => this.initialize();
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize, { once: true, signal: this.controller.signal });
      } else initialize();
    }

    initialize() {
      if (!this.isConnected || this.initialized) return;
      this.initialized = true;
      this.swatches = [...this.querySelectorAll('.picks-card__swatch')];
      this.swatches.forEach((swatch) => {
        const color = swatch.dataset.swatchColor;
        if (!swatch.querySelector('.picks-card__swatch-image') && CSS.supports('color', color)) {
          swatch.style.setProperty('--swatch-color', color);
          swatch.setAttribute('data-color-mapped', '');
        }
        swatch.addEventListener('click', (event) => {
          if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
          if (!swatch.dataset.cardVariant) return;
          event.preventDefault();
          this.select(swatch);
        }, { signal: this.controller.signal });
        swatch.addEventListener('keydown', (event) => {
          if (event.key !== ' ') return;
          event.preventDefault();
          swatch.click();
        }, { signal: this.controller.signal });
      });
    }

    select(swatch) {
      if (swatch.getAttribute('aria-pressed') === 'true') return;
      this.swatches.forEach((item) => item.setAttribute('aria-pressed', String(item === swatch)));
      const image = swatch.querySelector('[data-card-image]').content.firstElementChild;
      this.querySelector('.picks-card__media').replaceChildren(image.cloneNode(true));
      this.querySelectorAll('[data-card-link]').forEach((link) => link.setAttribute('href', swatch.getAttribute('href')));
      this.querySelector('[data-card-price]').textContent = swatch.dataset.price;
      const comparePrice = this.querySelector('[data-card-compare-price]');
      comparePrice.textContent = swatch.dataset.comparePrice;
      comparePrice.hidden = !swatch.dataset.comparePrice;
      const form = this.querySelector('[data-cart-add]');
      if (form) {
        form.querySelector('[name="id"]').value = swatch.dataset.cardVariant;
        form.dataset.variantAvailable = swatch.dataset.available;
        const button = form.querySelector('[type="submit"]');
        const available = swatch.dataset.available === 'true';
        button.disabled = !available || form.getAttribute('aria-busy') === 'true';
        form.querySelector('[data-card-submit-text]').textContent = available ? button.dataset.addLabel : button.dataset.soldOutLabel;
        form.querySelector('[data-cart-error]').hidden = true;
      }
    }

    disconnectedCallback() {
      this.controller?.abort();
      this.initialized = false;
    }
  }
  customElements.define('top-picks-card', TopPicksCard);
}
