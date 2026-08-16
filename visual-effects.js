/* FAST TRAVEL VISUAL LAYER — STABLE VERSION
   Presentation-only layer. It does not alter cart, checkout, pricing,
   localization, API calls, menu data, or existing ordering functions.

   Important stability rules:
   - Never hide an element again after it has been revealed.
   - Never recreate/re-observe the whole page on every DOM mutation.
   - Dynamic menu cards are revealed when they are inserted and remain visible.
   - Elements already visible at page load are made visible immediately.
*/
(function () {
  'use strict';

  const SELECTOR = '.section-header, .card, .sidebar-panel, .loading-state, .empty-state, main > *, aside > *';
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let observer = null;
  let mutationObserver = null;
  let initialized = false;

  function isInViewport(el) {
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const vw = window.innerWidth || document.documentElement.clientWidth;
    return r.bottom > 0 && r.right > 0 && r.top < vh && r.left < vw;
  }

  function prepare(elements) {
    elements.forEach((el, i) => {
      if (!(el instanceof HTMLElement)) return;
      if (el.dataset.ftRevealBound === '1') return;

      el.dataset.ftRevealBound = '1';
      el.classList.add('ft-reveal');

      if (el.classList.contains('card')) {
        el.style.setProperty('--ft-delay', Math.min((i % 6) * 55, 275) + 'ms');
      }

      // Never leave above-the-fold content invisible while the page is loading.
      if (isInViewport(el)) {
        el.classList.add('is-visible');
      }
    });

    if (!observer && !reduceMotion) {
      observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Reveal once. We intentionally NEVER remove this class on exit.
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      }, {
        threshold: 0.02,
        rootMargin: '120px 0px 120px 0px'
      });
    }

    document.querySelectorAll('.ft-reveal:not(.is-visible)').forEach((el) => {
      if (reduceMotion) {
        el.classList.add('is-visible');
      } else if (observer) {
        observer.observe(el);
      }
    });
  }

  function revealExisting() {
    prepare(Array.from(document.querySelectorAll(SELECTOR)));
  }

  function watchDynamicContent() {
    if (mutationObserver) return;

    mutationObserver = new MutationObserver((mutations) => {
      const added = [];

      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;

          if (node.matches && node.matches(SELECTOR)) added.push(node);
          if (node.querySelectorAll) {
            node.querySelectorAll(SELECTOR).forEach((el) => added.push(el));
          }
        });
      });

      if (added.length) prepare(added);
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  function initParallax() {
    if (reduceMotion) return;

    let ticking = false;

    function update() {
      document.documentElement.style.setProperty('--ft-scroll', String(window.scrollY || 0));
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    }, { passive: true });

    update();
  }

  function init() {
    if (initialized) return;
    initialized = true;

    // First pass: make currently visible content available immediately.
    revealExisting();

    // Watch only for newly-created menu/card elements.
    watchDynamicContent();

    // Keep the subtle cinematic scroll variable without touching layout/content.
    initParallax();

    // A second pass after the first layout/render ensures asynchronously
    // generated menu cards are visible immediately too.
    requestAnimationFrame(revealExisting);
    setTimeout(revealExisting, 250);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
