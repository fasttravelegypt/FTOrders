/* FAST TRAVEL VISUAL LAYER
   Presentation-only layer. It does not alter cart, checkout, pricing,
   localization, API calls, menu data, or any existing ordering functions.
*/
(function(){
  'use strict';
  const reveal = () => {
    const els = document.querySelectorAll('.section-header, .card, .sidebar-panel, .loading-state, .empty-state, main > *, aside > *');
    els.forEach((el, i) => {
      if (el.dataset.ftRevealBound) return;
      el.dataset.ftRevealBound = '1';
      el.classList.add('ft-reveal');
      if (el.classList.contains('card')) el.style.setProperty('--ft-delay', Math.min((i % 6) * 55, 275) + 'ms');
    });
    if (!window.__ftRevealObserver) {
      window.__ftRevealObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) entry.target.classList.add('is-visible');
          else entry.target.classList.remove('is-visible');
        });
      }, { threshold: 0.08, rootMargin: '0px 0px -8% 0px' });
    }
    document.querySelectorAll('.ft-reveal').forEach(el => window.__ftRevealObserver.observe(el));
  };
  const parallax = () => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let ticking = false;
    const update = () => {
      const y = window.scrollY || 0;
      document.documentElement.style.setProperty('--ft-scroll', y);
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, {passive:true});
  };
  const init = () => { reveal(); parallax(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  new MutationObserver(() => reveal()).observe(document.body, {childList:true, subtree:true});
})();
