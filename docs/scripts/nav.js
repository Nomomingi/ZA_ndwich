(function () {
  function setupNav(nav, index) {
    const links = nav.querySelector('.nav-links');
    if (!links) return;

    const navId = links.id || `site-nav-links-${index + 1}`;
    links.id = navId;

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'nav-toggle';
    toggle.setAttribute('aria-label', 'Toggle navigation menu');
    toggle.setAttribute('aria-controls', navId);
    toggle.setAttribute('aria-expanded', 'false');
    toggle.innerHTML = '<span></span><span></span><span></span>';

    nav.classList.add('nav-mobile-ready');
    nav.insertBefore(toggle, nav.firstChild);

    function closeNav() {
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    }

    toggle.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    links.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', closeNav);
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth >= 768) closeNav();
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const navs = document.querySelectorAll('nav.site-nav');
    navs.forEach(setupNav);
  });
})();
