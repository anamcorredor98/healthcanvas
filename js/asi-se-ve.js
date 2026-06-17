// ============================================
// ASÍ SE VE — asi-se-ve.js
// Carrusel copiado de Garritas, namespaced
// ============================================
(function() {
  const carousel = document.getElementById('asvHeroCarousel');
  if (!carousel) return; // solo corre si la sección existe en esta página

  const slides = carousel.querySelectorAll('.asv-carousel-slide');
  const dots   = carousel.querySelectorAll('.asv-carousel-dot');
  if (!slides.length) return;

  let current  = 0;
  let timer    = null;
  let isPaused = false;
  const DELAY  = 4000;

  function goTo(index) {
    slides[current].classList.remove('active');
    dots[current].classList.remove('active');
    current = index;
    slides[current].classList.add('active');
    dots[current].classList.add('active');
  }

  function next() {
    if (!isPaused) {
      goTo((current + 1) % slides.length);
    }
  }

  function startAuto() { timer = setInterval(next, DELAY); }
  function stopAuto()  { clearInterval(timer); }

  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      stopAuto();
      goTo(parseInt(dot.dataset.index));
      startAuto();
    });
  });

  carousel.addEventListener('mouseenter', () => { isPaused = true; stopAuto(); });
  carousel.addEventListener('mouseleave', () => { isPaused = false; startAuto(); });

  startAuto();
})();