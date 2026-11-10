(() => {
  const root = document.documentElement;
  const config = root.dataset;
  const set = (name, value) => root.style.setProperty(name, value);
  const length = (name, value, min, max) => {
    const number = Number(value);
    if (value && Number.isFinite(number) && number >= min && number <= max) set(name, `${number}px`);
  };

  if (['90rem', '110rem'].includes(config.pageWidth)) set('--page-width', config.pageWidth);
  length('--page-margin', config.pageMargin, 10, 100);
  length('--style-border-radius-inputs', config.inputRadius, 0, 10);
  for (const name of ['Background', 'Foreground']) {
    const value = config[`color${name}`];
    if (value && CSS.supports('color', value)) set(`--color-${name.toLowerCase()}`, value);
  }

  if (!config.fontFamily) return;
  const family = JSON.stringify(config.fontFamily);
  set('--font-primary--family', `${family}, ${config.fontFallback || 'sans-serif'}`);
  if (!('FontFace' in window)) return;
  const variants = [
    [config.fontUrl, config.fontWeight, config.fontStyle],
    [config.fontBoldUrl, config.fontBoldWeight, config.fontStyle],
    [config.fontItalicUrl, config.fontWeight, 'italic'],
    [config.fontBoldItalicUrl, config.fontBoldWeight, 'italic']
  ];
  const registered = new Set();
  for (const [url, weight, style] of variants) {
    if (!url || registered.has(url)) continue;
    registered.add(url);
    const face = new FontFace(config.fontFamily, `url(${JSON.stringify(url)})`, {
      weight: weight || '400', style: style || 'normal', display: 'swap'
    });
    document.fonts.add(face);
  }
})();
