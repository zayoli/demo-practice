(() => {
  if (customElements.get('product-video')) return;

  let vidstackModule;

  class ProductVideo extends HTMLElement {
    connectedCallback() {
      this.target = this.querySelector('[data-video-player]');
      this.loading = this.querySelector('[data-video-loading]');
      this.error = this.querySelector('[data-video-error]');
      this.videoId = this.getYouTubeId(this.dataset.videoUrl);

      if (!this.videoId) {
        this.showError();
        return;
      }

      this.observer = new IntersectionObserver((entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        this.observer.disconnect();
        this.initializePlayer();
      });
      this.observer.observe(this);
    }

    disconnectedCallback() {
      this.observer?.disconnect();
      clearTimeout(this.playbackTimeout);
      this.player?.destroy();
      this.player?.remove();
      this.player = null;
      this.initializing = false;
    }

    getYouTubeId(value) {
      try {
        const url = new URL(value);
        if (url.protocol !== 'https:') return null;

        const host = url.hostname.toLowerCase();
        let id;

        if (host === 'youtu.be') {
          id = url.pathname.split('/')[1];
        } else if (
          [
            'youtube.com',
            'www.youtube.com',
            'm.youtube.com',
            'www.youtube-nocookie.com',
            'youtube-nocookie.com'
          ].includes(host)
        ) {
          const path = url.pathname.split('/').filter(Boolean);
          id = url.pathname === '/watch' ? url.searchParams.get('v') : null;
          if (['embed', 'shorts', 'live'].includes(path[0])) id = path[1];
        }

        return /^[\w-]{11}$/.test(id || '') ? id : null;
      } catch {
        return null;
      }
    }

    async initializePlayer() {
      if (this.player || this.initializing) return;
      this.initializing = true;

      try {
        vidstackModule ||= import('https://cdn.vidstack.io/player@1.15.7');
        const { VidstackPlayer, VidstackPlayerLayout } = await vidstackModule;
        if (!this.isConnected) return;

        const player = await VidstackPlayer.create({
          target: this.target,
          title: this.dataset.videoTitle,
          src: `youtube/${this.videoId}`,
          poster: `https://i.ytimg.com/vi/${this.videoId}/hqdefault.jpg`,
          posterLoad: 'visible',
          load: 'visible',
          playsInline: true,
          layout: new VidstackPlayerLayout()
        });

        if (!this.isConnected) {
          player.destroy();
          player.remove();
          return;
        }

        this.player = player;
        this.loading.hidden = true;
        this.dataset.ready = '';
        player.addEventListener('error', () => this.showError());
        player.addEventListener('play-fail', () => this.showError());
        player.addEventListener('media-play-request', () => {
          clearTimeout(this.playbackTimeout);
          this.playbackTimeout = setTimeout(() => this.showError(), 20000);
        });
        player.addEventListener('playing', () => {
          clearTimeout(this.playbackTimeout);
          this.error.hidden = true;
          delete this.dataset.error;
        });
        player.addEventListener('pause', () =>
          clearTimeout(this.playbackTimeout)
        );
      } catch {
        this.showError();
      } finally {
        this.initializing = false;
      }
    }

    showError() {
      clearTimeout(this.playbackTimeout);
      this.loading.hidden = true;
      this.error.hidden = false;
      this.dataset.error = '';
    }
  }

  customElements.define('product-video', ProductVideo);
})();
