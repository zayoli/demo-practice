if (!customElements.get('product-recommendations')) {
  class ProductRecommendations extends HTMLElement {
    connectedCallback() {
      if (!this.dataset.url || this.firstElementChild) return;
      this.observer = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting) return;
        this.observer.disconnect();
        this.loadRecommendations();
      }, { rootMargin: '240px 0px' });
      this.observer.observe(this);
    }

    async loadRecommendations() {
      const controller = new AbortController();
      this.controller = controller;

      try {
        const response = await fetch(this.dataset.url, { signal: controller.signal });
        if (!response.ok) return;
        const page = new DOMParser().parseFromString(await response.text(), 'text/html');
        const content = page.querySelector('[data-recommendation-content]');
        if (content && !controller.signal.aborted) this.replaceChildren(content);
      } catch {
        return;
      }
    }

    disconnectedCallback() {
      this.observer?.disconnect();
      this.controller?.abort();
    }
  }

  customElements.define('product-recommendations', ProductRecommendations);
}
