if (!customElements.get('hero-slideshow')) {
  class HeroSlideshow extends HTMLElement {
    connectedCallback() {
      this.controller = new AbortController();
      const options = { once: true, signal: this.controller.signal };
      const initialize = () => this.initialize();
      document.getElementById('SwiperScript')?.addEventListener('load', initialize, options);
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, options);
      else initialize();
    }

    initialize() {
      if (this.swiper || !this.isConnected || !window.Swiper) return;
      if (document.readyState === 'loading' || this.querySelectorAll('.slideshow__slide').length < 2) return;

      this.motion = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.controls = this.querySelector('.slideshow__controls');
      const previous = this.querySelector('.slideshow__arrow--previous');
      const next = this.querySelector('.slideshow__arrow--next');

      this.swiper = new Swiper(this.querySelector('.slideshow__viewport'), {
        slidesPerView: 1,
        speed: this.motion.matches ? 0 : Number(this.dataset.speed),
        watchOverflow: true,
        navigation: { prevEl: previous, nextEl: next },
        pagination: { el: this.querySelector('.slideshow__pagination'), clickable: true },
        keyboard: { enabled: false, onlyInViewport: true, pageUpDown: false },
        autoplay: this.dataset.autoplay === 'true' ? {
          delay: Number(this.dataset.interval),
          disableOnInteraction: false,
          pauseOnMouseEnter: true
        } : false,
        a11y: {
          enabled: true,
          prevSlideMessage: previous.getAttribute('aria-label'),
          nextSlideMessage: next.getAttribute('aria-label'),
          firstSlideMessage: this.dataset.firstLabel,
          lastSlideMessage: this.dataset.lastLabel,
          paginationBulletMessage: this.dataset.goToLabel,
          slideLabelMessage: ''
        },
        on: {
          'init slideChange': (swiper) => {
            swiper.slides.forEach((slide, index) => {
              slide.inert = index !== swiper.activeIndex;
              slide.setAttribute('aria-hidden', String(slide.inert));
            });
          },
          'autoplayStart autoplayStop': (swiper) => {
            swiper.wrapperEl.setAttribute('aria-live', swiper.autoplay.running ? 'off' : 'polite');
          }
        }
      });

      this.controls.hidden = false;
      if (this.motion.matches) this.swiper.autoplay.stop();
      const options = { signal: this.controller.signal };

      this.addEventListener('focusin', () => this.swiper.keyboard.enable(), options);

      this.addEventListener('focusout', (event) => {
        if (!this.contains(event.relatedTarget)) this.swiper.keyboard.disable();
      }, options);

      this.addEventListener('shopify:block:select', (event) => {
        this.swiper.autoplay.stop();
        const index = this.swiper.slides.findIndex((slide) => slide.dataset.blockId === event.detail.blockId);
        if (index >= 0) this.swiper.slideTo(index, 0);
      }, options);

      this.addEventListener('shopify:block:deselect', () => {
        if (this.dataset.autoplay === 'true' && !this.motion.matches) this.swiper.autoplay.start();
      }, options);

      this.motion.addEventListener('change', () => {
        this.swiper.params.speed = this.motion.matches ? 0 : Number(this.dataset.speed);
        if (this.motion.matches) this.swiper.autoplay.stop();
      }, options);
    }

    disconnectedCallback() {
      this.controller?.abort();
      this.swiper?.destroy(true, true);
      this.swiper = undefined;
      if (this.controls) this.controls.hidden = true;
    }
  }

  customElements.define('hero-slideshow', HeroSlideshow);
}
