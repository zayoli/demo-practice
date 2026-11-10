if (!customElements.get('image-banner')) {
  customElements.define('image-banner', class extends HTMLElement {
    connectedCallback() {
      const height = Number(this.dataset.height);
      if (Number.isFinite(height) && height >= 320 && height <= 900) {
        this.style.setProperty('--banner-height', `${height}px`);
      }
      for (const name of ['background', 'foreground']) {
        const value = this.dataset[name];
        if (value && CSS.supports('color', value)) this.style.setProperty(`--banner-${name}`, value);
      }
    }
  });
}
