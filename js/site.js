(() => {
  const body = document.body;
  const toggle = document.querySelector('[data-theme-toggle]');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const stored = localStorage.getItem('cfop-theme');
  let theme = stored || (prefersDark ? 'dark' : 'light');

  const applyTheme = (next) => {
    body.classList.toggle('theme-dark', next === 'dark');
    toggle?.setAttribute('aria-pressed', next === 'dark');
    const label = toggle?.querySelector('[data-theme-label]');
    if (label) label.textContent = next === 'dark' ? 'Light mode' : 'Dark mode';
    localStorage.setItem('cfop-theme', next);
  };

  applyTheme(theme);

  toggle?.addEventListener('click', () => {
    theme = theme === 'dark' ? 'light' : 'dark';
    applyTheme(theme);
  });

  const current = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
  document.querySelectorAll('[data-nav-link]').forEach((link) => {
    const target = (link.getAttribute('href') || '').toLowerCase();
    if (target === current) link.classList.add('active');
  });

  const loader = document.getElementById('page-loader');
  const loaderCube = document.getElementById('loader-cube');
  const loaderLid = document.getElementById('loader-lid');
  const loaderBase = document.getElementById('loader-base');

  const minLoaderDuration = 1500; // ms
  let loaderShownAt = null;

  const showLoader = () => {
    if (!loader) return;
    if (!loader.classList.contains('is-active')) {
      loader.classList.add('is-active');
      loaderShownAt = performance.now();
    } else if (!loaderShownAt) {
      loaderShownAt = performance.now();
    }
  };

  const hideLoader = () => {
    if (!loader) return;
    const now = performance.now();
    const shownAt = loaderShownAt || 0;
    const elapsed = Math.max(0, now - shownAt);
    const remaining = Math.max(0, minLoaderDuration - elapsed);
    if (remaining > 16) {
      setTimeout(() => {
        loader.classList.remove('is-active');
        loaderShownAt = null;
      }, remaining);
    } else {
      loader.classList.remove('is-active');
      loaderShownAt = null;
    }
  };

  if (loader && loaderCube && loaderLid && loaderBase) {
    const lidCoordinates = [
      [[-3, 3, 3], [-3, -3, 3], [3, -3, 3], [3, 3, 3], [-3, 3, 3], [-3, 3, 1], [-3, -3, 1], [3, -3, 1], [3, -3, 3]],
      [[3, 1, 3], [-3, 1, 3], [-3, 1, 1]],
      [[3, -1, 3], [-3, -1, 3], [-3, -1, 1]],
      [[-3, -3, 3], [-3, -3, 1]],
      [[-1, -3, 1], [-1, -3, 3], [-1, 3, 3]],
      [[1, -3, 1], [1, -3, 3], [1, 3, 3]],
    ];

    const baseCoordinates = [
      [[-3, 3, 1], [3, 3, 1], [3, -3, 1], [-3, -3, 1], [-3, 3, 1], [-3, 3, -3], [-3, -3, -3], [3, -3, -3], [3, -3, 1]],
      [[1, -3, -3], [1, -3, 1], [1, 1, 1], [-3, 1, 1], [-3, 1, -3]],
      [[-1, -3, -3], [-1, -3, 1], [-1, -1, 1], [-3, -1, 1], [-3, -1, -3]],
      [[-3, -3, -3], [-3, -3, 1]],
      [[-3, 3, -1], [-3, -3, -1], [3, -3, -1]],
    ];

    const unit = 4;
    let time = 0;

    const project = (coordinatesGroup, theta) => coordinatesGroup.map((subGroup) => subGroup.map((coordinates) => {
      const [x, y, z] = coordinates;
      return [
        (x * Math.cos(theta) - y * Math.sin(theta)) * unit + 30,
        (x * -Math.sin(theta) - y * Math.cos(theta) - z * Math.sqrt(2)) * unit / Math.sqrt(3) + 30,
      ];
    }));

    const toPath = (coordinates) => 'M'
      + JSON.stringify(coordinates)
        .replace(/]],\[\[/g, 'M')
        .replace(/],\[/g, 'L')
        .slice(3, -3);

    const easing = (value) => (2 - Math.cos(Math.PI * value)) % 2 * Math.PI / 4;

    const tick = () => {
      time = (time + 1 / 30) % 3;
      loaderCube.style.transform = `rotate(${Math.floor(time) * 120}deg)`;
      loaderLid.setAttribute('d', toPath(project(lidCoordinates, easing(time))));
      requestAnimationFrame(tick);
    };

    loaderBase.setAttribute('d', toPath(project(baseCoordinates, Math.PI / 4)));
    tick();

    // Ensure loader remains visible for at least `minLoaderDuration` on first paint.
    if (loader.classList.contains('is-active')) loaderShownAt = performance.now();
    window.addEventListener('load', () => {
      // call hideLoader which will enforce minimum duration
      hideLoader();
    });

    const loaderLinks = document.querySelectorAll('[data-nav-link], [data-loader-link]');
    loaderLinks.forEach((link) => {
      link.addEventListener('click', (event) => {
        const href = link.getAttribute('href');
        if (!href) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        if (link.target === '_blank') return;
        const targetUrl = new URL(href, window.location.href);
        if (targetUrl.href === window.location.href) return;
        event.preventDefault();
        showLoader();
        setTimeout(() => {
          window.location.href = targetUrl.href;
        }, 160);
      });
    });
  }

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js')
        .then((registration) => {
          console.log('ServiceWorker registration successful with scope: ', registration.scope);
        }, (err) => {
          console.log('ServiceWorker registration failed: ', err);
        });
    });
  }
})();
