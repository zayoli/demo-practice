if (!customElements.get('top-picks')) {
  class TopPicks extends HTMLElement {
    connectedCallback() {
      this.controller = new AbortController();
      const options = { once: true, signal: this.controller.signal };
      const initialize = () => this.initialize();
      document.getElementById('SwiperScript')?.addEventListener('load', initialize, options);
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, options);
      else initialize();
    }

    initialize() {
      if (this.hasAttribute('data-enhanced') || !this.isConnected || !window.Swiper || document.readyState === 'loading') return;
      this.tabs = [...this.querySelectorAll('[role="tab"]')];
      this.panels = [...this.querySelectorAll('[role="tabpanel"]')];
      if (!this.tabs.length) return;
      this.instances = new Map();
      this.setAttribute('data-enhanced', '');
      const options = { signal: this.controller.signal };

      this.tabs.forEach((tab, index) => {
        tab.addEventListener('click', (event) => {
          event.preventDefault();
          this.select(index);
        }, options);
        tab.addEventListener('keydown', (event) => {
          if (event.key === ' ' || event.key === 'Enter') {
            event.preventDefault();
            this.select(index);
            return;
          }
          let target = index;
          if (event.key === 'ArrowRight') target = (index + 1) % this.tabs.length;
          else if (event.key === 'ArrowLeft') target = (index - 1 + this.tabs.length) % this.tabs.length;
          else if (event.key === 'Home') target = 0;
          else if (event.key === 'End') target = this.tabs.length - 1;
          else return;
          event.preventDefault();
          this.select(target);
          this.tabs[target].focus();
        }, options);
      });
      this.addEventListener('shopify:block:select', (event) => {
        const index = this.tabs.findIndex((tab) => tab.dataset.blockId === event.detail.blockId);
        if (index >= 0) this.select(index);
      }, options);
      this.select(0);
    }

    select(index) {
      this.tabs.forEach((tab, tabIndex) => {
        tab.setAttribute('aria-selected', String(tabIndex === index));
        tab.tabIndex = tabIndex === index ? 0 : -1;
        this.panels[tabIndex].hidden = tabIndex !== index;
      });
      const panel = this.panels[index];
      if (!window.Swiper || !panel.querySelector('.swiper-slide')) return;
      if (this.instances.has(panel)) {
        this.instances.get(panel).update();
        return;
      }
      const previous = panel.querySelector('.top-picks__arrow--previous');
      const next = panel.querySelector('.top-picks__arrow--next');
      const swiper = new Swiper(panel.querySelector('.top-picks__viewport'), {
        slidesPerView: 1.2,
        slidesPerGroup: 1,
        spaceBetween: 20,
        speed: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 450,
        watchOverflow: true,
        navigation: { prevEl: previous, nextEl: next },
        pagination: { el: panel.querySelector('.top-picks__pagination'), clickable: true },
        breakpoints: {
          750: { slidesPerView: 2, slidesPerGroup: 2, spaceBetween: 24 },
          990: { slidesPerView: 3, slidesPerGroup: 3, spaceBetween: 24 },
          1440: { slidesPerView: 4, slidesPerGroup: 4, spaceBetween: 24 }
        },
        a11y: {
          prevSlideMessage: previous.getAttribute('aria-label'),
          nextSlideMessage: next.getAttribute('aria-label'),
          paginationBulletMessage: this.dataset.pageLabel
        }
      });
      this.instances.set(panel, swiper);
      panel.querySelector('.top-picks__controls').hidden = false;
    }

    disconnectedCallback() {
      this.controller?.abort();
      this.instances?.forEach((swiper) => swiper.destroy(true, true));
      this.removeAttribute('data-enhanced');
      this.panels?.forEach((panel) => {
        panel.hidden = false;
        panel.querySelector('.top-picks__controls').hidden = true;
      });
    }
  }
  customElements.define('top-picks', TopPicks);
}
