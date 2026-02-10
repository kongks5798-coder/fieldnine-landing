function animateCounter(elementId, targetValue, duration, unit) {
  var element = document.getElementById(elementId);
  if (!element) return;
  
  var startValue = 0;
  var increment = targetValue / (duration / 50);
  var current = startValue;
  
  var timer = setInterval(function() {
    current += increment;
    if (current >= targetValue) {
      current = targetValue;
      clearInterval(timer);
    }
    
    var displayValue;
    if (unit === '%') {
      displayValue = current.toFixed(1) + unit;
    } else if (unit === '시간') {
      displayValue = Math.floor(current) + unit;
    } else {
      displayValue = Math.floor(current).toLocaleString();
    }
    
    element.textContent = displayValue;
  }, 50);
}

function createFloatingAnimation() {
  var cards = document.querySelectorAll('.floating-card');
  cards.forEach(function(card, index) {
    card.style.animationDelay = (index * 2) + 's';
    card.style.opacity = '0';
    
    setTimeout(function() {
      card.style.opacity = '1';
      card.style.transition = 'opacity 0.5s ease';
    }, (index + 1) * 500);
  });
}

function initializeCounters() {
  var stats = FIELD_NINE_DATA.stats;
  
  setTimeout(function() {
    animateCounter('projectCount', stats.projects.current, 2000, stats.projects.unit);
  }, 800);
  
  setTimeout(function() {
    animateCounter('timesSaved', stats.timeSaved.current, 1800, stats.timeSaved.unit);
  }, 1200);
  
  setTimeout(function() {
    animateCounter('satisfaction', stats.satisfaction.current, 1500, stats.satisfaction.unit);
  }, 1600);
}

function handleScrollNavigation() {
  var nav = document.querySelector('.nav');
  if (!nav) return;
  
  window.addEventListener('scroll', function() {
    var scrolled = window.scrollY > 50;
    nav.style.background = scrolled ? 'rgba(0, 0, 0, 0.95)' : 'rgba(0, 0, 0, 0.8)';
    nav.style.borderBottomColor = scrolled ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)';
  });
}