if (!customElements.get('product-detail')) {
  class ProductDetail extends HTMLElement {
    connectedCallback() {
      this.controller = new AbortController();
      const initialize = () => this.initialize();
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize, {
          once: true,
          signal: this.controller.signal
        });
      } else initialize();
    }

    initialize() {
      if (!this.isConnected || this.initialized) return;
      this.initialized = true;
      this.track = this.querySelector('[data-gallery-track]');
      this.slides = [...this.querySelectorAll('.product-gallery__slide')];
      this.thumbnails = [...this.querySelectorAll('[data-gallery-thumbnail]')];
      this.activeIndex = 0;
      this.status = this.querySelector('[data-product-status]');
      this.retry = this.querySelector('[data-product-retry]');
      this.dialog = this.querySelector('[data-product-image-dialog]');
      const options = { signal: this.controller.signal };

      this.addEventListener(
        'click',
        (event) => {
          const option = event.target.closest('[data-product-option]');
          if (option) {
            if (
              event.button !== 0 ||
              event.ctrlKey ||
              event.metaKey ||
              event.shiftKey ||
              event.altKey
            )
              return;
            event.preventDefault();
            if (
              this.querySelector('form[data-cart-add]')?.getAttribute(
                'aria-busy'
              ) === 'true'
            )
              return;
            if (option.getAttribute('aria-pressed') === 'true' && !this.pending)
              return;
            this.selectOption(option);
          }
          const thumbnail = event.target.closest('[data-gallery-thumbnail]');
          if (thumbnail) this.goToMedia(thumbnail.dataset.galleryThumbnail);
          if (event.target.closest('[data-gallery-previous]'))
            this.goToIndex(this.activeIndex - 1);
          if (event.target.closest('[data-gallery-next]'))
            this.goToIndex(this.activeIndex + 1);
          const quantityButton = event.target.closest(
            '[data-product-quantity]'
          );
          if (quantityButton) {
            const input = this.querySelector('[name="quantity"]');
            this.normalizeQuantity();
            if (quantityButton.dataset.productQuantity === 'increase')
              input.stepUp();
            else input.stepDown();
            this.updateQuantityButtons();
          }
          const zoom = event.target.closest('[data-product-zoom]');
          if (
            zoom &&
            !event.ctrlKey &&
            !event.metaKey &&
            !event.shiftKey &&
            !event.altKey &&
            event.button === 0
          ) {
            event.preventDefault();
            const image = zoom.querySelector('img').cloneNode();
            image.removeAttribute('srcset');
            image.removeAttribute('sizes');
            image.src = zoom.href;
            this.querySelector('[data-product-zoom-content]').replaceChildren(
              image
            );
            this.dialog.showModal();
          }
          if (event.target.closest('[data-product-zoom-close]'))
            this.dialog.close();
        },
        options
      );

      this.addEventListener(
        'keydown',
        (event) => {
          if (
            event.target.matches('[data-product-option]') &&
            event.key === ' '
          ) {
            event.preventDefault();
            event.target.click();
          }
          if (
            event.target === this.track &&
            ['ArrowLeft', 'ArrowRight'].includes(event.key)
          ) {
            event.preventDefault();
            this.goToIndex(
              this.activeIndex + (event.key === 'ArrowRight' ? 1 : -1)
            );
          }
        },
        options
      );
      this.addEventListener(
        'change',
        (event) => {
          if (event.target.matches('[name="quantity"]')) {
            this.normalizeQuantity();
            this.updateQuantityButtons();
          }
        },
        options
      );
      this.addEventListener(
        'submit',
        (event) => {
          if (this.pending) {
            event.preventDefault();
            event.stopPropagation();
          }
        },
        options
      );
      this.track?.addEventListener(
        'scroll',
        () => {
          if (this.scrollFrame) return;
          this.scrollFrame = requestAnimationFrame(() => {
            this.scrollFrame = null;
            this.updateGallery(
              Math.round(this.track.scrollLeft / this.track.clientWidth)
            );
          });
        },
        { ...options, passive: true }
      );
      if (this.track) {
        this.resizeObserver = new ResizeObserver(() =>
          this.goToIndex(this.activeIndex, 'instant')
        );
        this.resizeObserver.observe(this.track);
        this.querySelectorAll(
          '[data-gallery-previous], [data-gallery-next]'
        ).forEach((button) => {
          button.hidden = false;
        });
        this.updateGallery(0);
      }
      this.dialog?.addEventListener(
        'click',
        (event) => {
          if (event.target !== this.dialog) return;
          const bounds = this.dialog.getBoundingClientRect();
          if (
            event.clientX < bounds.left ||
            event.clientX > bounds.right ||
            event.clientY < bounds.top ||
            event.clientY > bounds.bottom
          )
            this.dialog.close();
        },
        options
      );
      this.enhanceInfo();
      this.querySelectorAll('[data-product-description] img').forEach(
        (image) => {
          image.loading = 'lazy';
        }
      );
    }

    enhanceInfo() {
      this.querySelectorAll('[data-swatch-color]').forEach((option) => {
        if (CSS.supports('color', option.dataset.swatchColor))
          option.style.setProperty(
            '--swatch-color',
            option.dataset.swatchColor
          );
      });
      this.updateQuantityButtons();
    }

    normalizeQuantity(value) {
      const input = this.querySelector('[name="quantity"]');
      const minimum = Number(input.min) || 1;
      const step = Number(input.step) || 1;
      const maximum = input.max
        ? minimum + Math.floor((Number(input.max) - minimum) / step) * step
        : Infinity;
      let quantity = Number(value ?? input.value);
      if (!Number.isSafeInteger(quantity)) quantity = minimum;
      quantity =
        minimum + Math.max(0, Math.ceil((quantity - minimum) / step)) * step;
      input.value = Math.min(quantity, maximum);
    }

    updateQuantityButtons() {
      const input = this.querySelector('[name="quantity"]');
      if (!input) return;
      const decrease = this.querySelector('[data-product-quantity="decrease"]');
      const increase = this.querySelector('[data-product-quantity="increase"]');
      decrease.disabled =
        input.disabled || Number(input.value) <= Number(input.min);
      increase.disabled =
        input.disabled ||
        Boolean(input.max && Number(input.value) >= Number(input.max));
    }

    goToMedia(id) {
      const index = this.slides.findIndex(
        (slide) => slide.dataset.mediaId === id
      );
      if (index >= 0) this.goToIndex(index);
    }

    goToIndex(index, behavior) {
      if (!this.track || !this.slides.length) return;
      index = Math.max(0, Math.min(index, this.slides.length - 1));
      this.track.scrollTo({
        left: index * this.track.clientWidth,
        behavior:
          behavior ||
          (matchMedia('(prefers-reduced-motion: reduce)').matches
            ? 'instant'
            : 'smooth')
      });
      this.updateGallery(index);
    }

    updateGallery(index) {
      this.activeIndex = Math.max(0, Math.min(index, this.slides.length - 1));
      this.thumbnails.forEach((thumbnail, thumbnailIndex) =>
        thumbnail.setAttribute(
          'aria-pressed',
          String(thumbnailIndex === this.activeIndex)
        )
      );
      this.slides.forEach((slide, slideIndex) => {
        slide.inert = slideIndex !== this.activeIndex;
        if (slideIndex !== this.activeIndex)
          slide.querySelectorAll('video').forEach((video) => video.pause());
      });
      const previous = this.querySelector('[data-gallery-previous]');
      const next = this.querySelector('[data-gallery-next]');
      if (previous) previous.disabled = this.activeIndex === 0;
      if (next) next.disabled = this.activeIndex === this.slides.length - 1;
      const count = this.querySelector('[data-gallery-count]');
      if (count)
        count.textContent = `${this.activeIndex + 1} / ${this.slides.length}`;
      const thumbnail = this.thumbnails[this.activeIndex];
      if (thumbnail) {
        const strip = thumbnail.parentElement;
        if (
          thumbnail.offsetLeft < strip.scrollLeft ||
          thumbnail.offsetLeft + thumbnail.offsetWidth >
            strip.scrollLeft + strip.clientWidth
        ) {
          strip.scrollTo({
            left:
              thumbnail.offsetLeft -
              (strip.clientWidth - thumbnail.offsetWidth) / 2,
            behavior: 'instant'
          });
        }
      }
    }

    setSelectionBusy(busy) {
      this.pending = busy;
      this.setAttribute('aria-busy', String(busy));
      const form = this.querySelector('form[data-cart-add]');
      form.querySelector('[type="submit"]').disabled =
        busy || form.dataset.variantAvailable !== 'true';
      const checkout = form.querySelector('.product-info__checkout');
      if (checkout) checkout.hidden = busy;
    }

    async selectOption(option) {
      this.selectionController?.abort();
      const requestController = new AbortController();
      this.selectionController = requestController;
      const url = new URL(option.href);
      url.searchParams.set('section_id', this.dataset.sectionId);
      const selectedOptionId = option.dataset.optionId;
      this.retry.hidden = true;
      this.status.textContent = this.dataset.loadingMessage;
      this.status.hidden = false;
      this.setSelectionBusy(true);
      try {
        const response = await fetch(url, {
          signal: requestController.signal,
          headers: { Accept: 'text/html' }
        });
        if (!response.ok) throw new Error('Product section unavailable');
        const documentFragment = new DOMParser().parseFromString(
          await response.text(),
          'text/html'
        );
        const updatedInfo = documentFragment.querySelector(
          '[data-product-info]'
        );
        if (!updatedInfo || !updatedInfo.querySelector('form[data-cart-add]'))
          throw new Error('Product section missing');
        if (requestController.signal.aborted || !this.isConnected) return;
        const quantity = this.querySelector('[name="quantity"]').value;
        this.querySelector('[data-product-info]').replaceWith(updatedInfo);
        this.normalizeQuantity(quantity);
        this.enhanceInfo();
        if (updatedInfo.dataset.mediaId)
          this.goToMedia(updatedInfo.dataset.mediaId);
        const pageUrl = new URL(window.location.href);
        pageUrl.searchParams.delete('option_values');
        pageUrl.searchParams.delete('variant');
        if (updatedInfo.dataset.variantId)
          pageUrl.searchParams.set('variant', updatedInfo.dataset.variantId);
        else
          pageUrl.searchParams.set(
            'option_values',
            url.searchParams.get('option_values')
          );
        window.history.replaceState(window.history.state, '', pageUrl);
        this.querySelector(
          `[data-option-id="${CSS.escape(selectedOptionId)}"]`
        )?.focus({ preventScroll: true });
        window.Shopify?.PaymentButton?.init();
        this.status.hidden = true;
      } catch (error) {
        if (error.name === 'AbortError') return;
        this.status.textContent = this.dataset.errorMessage;
        this.retry.href = option.href;
        this.retry.hidden = false;
      } finally {
        if (this.selectionController === requestController && this.isConnected)
          this.setSelectionBusy(false);
      }
    }

    disconnectedCallback() {
      this.controller?.abort();
      this.selectionController?.abort();
      this.resizeObserver?.disconnect();
      cancelAnimationFrame(this.scrollFrame);
      this.initialized = false;
    }
  }
  customElements.define('product-detail', ProductDetail);
}
