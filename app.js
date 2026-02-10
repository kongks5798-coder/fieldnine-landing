document.addEventListener('DOMContentLoaded', function() {
  var exploreBtn = document.getElementById('exploreBtn');
  var watchDemoBtn = document.getElementById('watchDemoBtn');
  var getStartedBtn = document.getElementById('getStartedBtn');
  var isExploring = false;

  function handleExplore() {
    if (isExploring) return;
    isExploring = true;
    
    if (exploreBtn) {
      exploreBtn.innerHTML = '<span>Exploring...</span><span class="btn-arrow">⚡</span>';
      exploreBtn.style.transform = 'translateY(-4px)';
    }
    
    setTimeout(function() {
      var features = document.getElementById('features');
      if (features) {
        features.scrollIntoView({ behavior: 'smooth' });
      }
      
      setTimeout(function() {
        if (exploreBtn) {
          exploreBtn.innerHTML = '<span>Explore Platform</span><span class="btn-arrow">→</span>';
          exploreBtn.style.transform = '';
        }
        isExploring = false;
      }, 2000);
    }, 800);
  }

  function handleDemo() {
    if (watchDemoBtn) {
      watchDemoBtn.innerHTML = '<span class="play-icon">⏸</span>Loading Demo...';
      watchDemoBtn.style.opacity = '0.7';
    }
    
    setTimeout(function() {
      alert('Demo coming soon! 🚀\n\nExperience the future of development with Field Nine.');
      if (watchDemoBtn) {
        watchDemoBtn.innerHTML = '<span class="play-icon">▶</span>Watch Demo';
        watchDemoBtn.style.opacity = '';
      }
    }, 1500);
  }

  function handleGetStarted() {
    if (getStartedBtn) {
      getStartedBtn.textContent = 'Launching...';
      getStartedBtn.style.transform = 'scale(0.95)';
    }
    
    setTimeout(function() {
      window.location.href = '#features';
      if (getStartedBtn) {
        getStartedBtn.textContent = 'Get Started';
        getStartedBtn.style.transform = '';
      }
    }, 1000);
  }

  if (exploreBtn) exploreBtn.addEventListener('click', handleExplore);
  if (watchDemoBtn) watchDemoBtn.addEventListener('click', handleDemo);
  if (getStartedBtn) getStartedBtn.addEventListener('click', handleGetStarted);

  initializeVisualEffects();
  handleNavScroll();
  
  setTimeout(function() {
    document.body.style.opacity = '1';
    document.body.style.transition = 'opacity 0.5s ease';
  }, 100);
});