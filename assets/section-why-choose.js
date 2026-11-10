if (!customElements.get('why-choose')) {
  class WhyChoose extends HTMLElement {
    connectedCallback() {
      this.controller = new AbortController();
      const options = { once: true, signal: this.controller.signal };
      const initialize = () => this.initialize();
      document.getElementById('SwiperScript')?.addEventListener('load', initialize, options);
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, options);
      else initialize();
    }

    initialize() {
      if (this.media || !this.isConnected || !window.Swiper || document.readyState === 'loading') return;
      this.media = window.matchMedia('(max-width: 749px)');
      this.pagination = this.querySelector('.why-choose__pagination');
      const options = { signal: this.controller.signal };
      this.media.addEventListener('change', () => this.updateLayout(), options);
      this.addEventListener('shopify:block:select', (event) => {
        const index = [...this.querySelectorAll('.why-choose__card')].findIndex((card) => card.dataset.blockId === event.detail.blockId);
        if (index >= 0) this.swiper?.slideTo(index, 0);
      }, options);
      this.updateLayout();
    }

    updateLayout() {
      if (!this.media.matches) {
        this.swiper?.destroy(true, true);
        this.swiper = undefined;
        this.pagination.hidden = true;
        return;
      }
      if (this.swiper || this.querySelectorAll('.why-choose__card').length < 2) return;
      this.swiper = new Swiper(this.querySelector('.why-choose__viewport'), {
        slidesPerView: 2,
        spaceBetween: 16,
        speed: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 400,
        watchOverflow: true,
        pagination: { el: this.pagination, clickable: true },
        a11y: { paginationBulletMessage: this.dataset.pageLabel }
      });
      this.pagination.hidden = false;
    }

    disconnectedCallback() {
      this.controller?.abort();
      this.swiper?.destroy(true, true);
      this.swiper = undefined;
      this.media = undefined;
      if (this.pagination) this.pagination.hidden = true;
    }
  }
  customElements.define('why-choose', WhyChoose);
}
