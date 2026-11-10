if (!customElements.get('block-group')) {
  customElements.define('block-group', class extends HTMLElement {
    connectedCallback() {
      const padding = Number(this.dataset.padding);
      if (Number.isFinite(padding) && padding >= 0 && padding <= 200) {
        this.style.setProperty('--padding', `${padding}px`);
      }
    }
  });
}
