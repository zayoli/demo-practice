if (!customElements.get('storefront-filters')) {
  class StorefrontFilters extends HTMLElement {
    connectedCallback() {
      this.controller?.abort();
      this.controller = new AbortController();
      const options = { signal: this.controller.signal };
      const panel = this.querySelector('[data-filter-panel]');
      const form = this.querySelector('form');
      if (!form) return;

      panel.open = !window.matchMedia('(max-width: 749px)').matches;

      this.querySelectorAll('[data-price-range]').forEach((range) => {
        const minimum = range.querySelector('[data-price-min]');
        const maximum = range.querySelector('[data-price-max]');
        const validateRange = () => {
          const invalid =
            minimum.value !== '' &&
            maximum.value !== '' &&
            minimum.valueAsNumber > maximum.valueAsNumber;
          maximum.setCustomValidity(invalid ? this.dataset.priceError : '');
        };
        range.addEventListener('input', validateRange, options);
        validateRange();
      });

      form.addEventListener(
        'formdata',
        (event) => {
          for (const [name, value] of [...event.formData.entries()]) {
            if (value === '') event.formData.delete(name);
          }
          event.formData.delete('page');
        },
        options
      );
    }

    disconnectedCallback() {
      this.controller?.abort();
    }
  }

  customElements.define('storefront-filters', StorefrontFilters);
}
