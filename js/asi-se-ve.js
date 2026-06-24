// ============================================
// ASÍ SE VE — asi-se-ve.js
// Carrusel + Videos + Tarjetas
// ============================================

// ===== CARRUSEL =====
(function() {
  const carousel = document.getElementById('asvHeroCarousel');
  if (!carousel) return;

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

  // Click en dots
  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      stopAuto();
      goTo(parseInt(dot.dataset.index));
      startAuto();
    });
  });

  // Hover desktop
  carousel.addEventListener('mouseenter', () => { isPaused = true; stopAuto(); });
  carousel.addEventListener('mouseleave', () => { isPaused = false; startAuto(); });

  // Touch mobile — pausar cuando el dedo está encima
  carousel.addEventListener('touchstart', () => { isPaused = true; stopAuto(); });
  carousel.addEventListener('touchend', () => { isPaused = false; startAuto(); });

  startAuto();
})();

// ===== VIDEOS — Autoplay en todas las plataformas =====
(function() {
  const videos = document.querySelectorAll('.asv-video-card video');
  
  videos.forEach(video => {
    video.autoplay = true;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.play().catch(err => {
      console.log('Autoplay bloqueado:', err);
    });
  });
})();

// ===== TARJETAS — Flip 3D + Auto-rotate =====
(function() {
  const containers = document.querySelectorAll('.asv-tarjeta-flip-container');
  if (!containers.length) return;

  const ROTATION_INTERVAL = 5000;
  const rotationTimers = {};

  function toggleFlip(container) {
    container.classList.toggle('flipped');
  }

  function startAutoRotate(container) {
    const id = container.dataset.tarjeta;
    
    if (rotationTimers[id]) {
      clearInterval(rotationTimers[id]);
    }

    rotationTimers[id] = setInterval(() => {
      toggleFlip(container);
    }, ROTATION_INTERVAL);
  }

  function resetAutoRotate(container) {
    const id = container.dataset.tarjeta;
    
    if (rotationTimers[id]) {
      clearInterval(rotationTimers[id]);
    }

    setTimeout(() => {
      startAutoRotate(container);
    }, 2000);
  }

  containers.forEach(container => {
    container.addEventListener('click', () => {
      toggleFlip(container);
      resetAutoRotate(container);
    });

    startAutoRotate(container);
  });
})();