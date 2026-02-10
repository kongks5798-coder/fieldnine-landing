document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 NeoSpace App loaded!');

  // State management
  let clickCount = 0;
  let projectCount = 0;
  let energyLevel = 100;
  let currentTheme = 'dark';

  // DOM elements
  const clickCountEl = document.getElementById('clickCount');
  const projectCountEl = document.getElementById('projectCount');
  const energyLevelEl = document.getElementById('energyLevel');
  const projectsGrid = document.getElementById('projectsGrid');
  const launchBtn = document.getElementById('launchBtn');
  const exploreBtn = document.getElementById('exploreBtn');
  const addProjectBtn = document.getElementById('addProjectBtn');
  const floatingBtn = document.getElementById('floatingBtn');
  const themeToggle = document.getElementById('themeToggle');
  const heroBadge = document.getElementById('heroBadge');
  const typingText = document.getElementById('typingText');

  // Project templates
  const projectTemplates = [
    { icon: '🚀', title: 'Space Explorer', desc: '우주 탐험 시뮬레이터를 만들어보세요', status: 'active' },
    { icon: '🎨', title: 'AI Art Generator', desc: 'AI로 예술 작품을 생성하는 도구', status: 'active' },
    { icon: '🎮', title: 'Retro Game', desc: '레트로 스타일의 아케이드 게임', status: 'active' },
    { icon: '🌈', title: 'Color Palette', desc: '트렌디한 컬러 팔레트 생성기', status: 'active' },
    { icon: '⚡', title: 'Speed Test', desc: '인터넷 속도 측정 애플리케이션', status: 'active' },
    { icon: '🔮', title: 'Future Predictor', desc: 'AI 기반 미래 예측 시스템', status: 'active' },
    { icon: '🎵', title: 'Music Visualizer', desc: '음악을 시각화하는 인터랙티브 도구', status: 'active' },
    { icon: '🌟', title: 'Star Map', desc: '실시간 별자리 지도 애플리케이션', status: 'active' }
  ];

  const typingWords = ['Future', 'Dreams', 'Innovation', 'Magic', 'Tomorrow'];
  let currentWordIndex = 0;

  // Typing animation
  function startTypingAnimation() {
    if (!typingText) return;
    
    setInterval(() => {
      currentWordIndex = (currentWordIndex + 1) % typingWords.length;
      typingText.textContent = typingWords[currentWordIndex];
    }, 3000);
  }

  // Update stats with animation
  function updateStats() {
    if (clickCountEl) {
      animateNumber(clickCountEl, clickCount);
    }
    if (projectCountEl) {
      animateNumber(projectCountEl, projectCount);
    }
    if (energyLevelEl) {
      animateNumber(energyLevelEl, energyLevel);
    }
  }

  function animateNumber(element, targetValue) {
    const startValue = parseInt(element.textContent) || 0;
    const duration = 500;
    const startTime = Date.now();

    function update() {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const currentValue = Math.floor(startValue + (targetValue - startValue) * progress);
      element.textContent = currentValue;

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }
    update();
  }

  // Create project card
  function createProjectCard(template, index) {
    const card = document.createElement('div');
    card.className = 'project-card';
    card.style.animationDelay = `${index * 0.1}s`;
    
    const now = new Date();
    const timeStr = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    
    card.innerHTML = `
      <div class="project-icon">${template.icon}</div>
      <div class="project-title">${template.title}</div>
      <div class="project-description">${template.desc}</div>
      <div class="project-meta">
        <span>${timeStr}</span>
        <span class="project-status status-${template.status}">Active</span>
      </div>
    `;

    // Add click handler for project cards
    card.addEventListener('click', () => {
      clickCount++;
      energyLevel = Math.max(0, energyLevel - 5);
      updateStats();
      
      // Add ripple effect
      const ripple = document.createElement('div');
      ripple.style.cssText = `
        position: absolute;
        border-radius: 50%;
        background: rgba(99, 102, 241, 0.3);
        transform: scale(0);
        animation: ripple 0.6s linear;
        pointer-events: none;
      `;
      
      const rect = card.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = (rect.width / 2 - size / 2) + 'px';
      ripple.style.top = (rect.height / 2 - size / 2) + 'px';
      
      card.style.position = 'relative';
      card.appendChild(ripple);
      
      setTimeout(() => ripple.remove(), 600);
    });

    return card;
  }

  // Add new project
  function addProject() {
    if (!projectsGrid) return;
    
    const template = projectTemplates[Math.floor(Math.random() * projectTemplates.length)];
    const card = createProjectCard(template, projectCount);
    projectsGrid.appendChild(card);
    
    projectCount++;
    clickCount++;
    energyLevel = Math.min(100, energyLevel + 10);
    updateStats();

    // Animate card entrance
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    
    requestAnimationFrame(() => {
      card.style.transition = 'all 0.5s ease';
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    });
  }

  // Theme toggle
  function toggleTheme() {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
    
    if (themeToggle) {
      themeToggle.textContent = currentTheme === 'dark' ? '🌙' : '☀️';
    }
    
    clickCount++;
    updateStats();
  }

  // Launch button handler
  function handleLaunch() {
    clickCount++;
    energyLevel = Math.max(0, energyLevel - 10);
    updateStats();

    // Create explosion effect
    const btn = launchBtn;
    if (!btn) return;

    for (let i = 0; i < 12; i++) {
      const particle = document.createElement('div');
      particle.style.cssText = `
        position: absolute;
        width: 6px;
        height: 6px;
        background: linear-gradient(45deg, #6366f1, #8b5cf6);
        border-radius: 50%;
        pointer-events: none;
        animation: explode 1s ease-out forwards;
      `;
      
      const angle = (i / 12) * Math.PI * 2;
      particle.style.setProperty('--dx', Math.cos(angle) * 100 + 'px');
      particle.style.setProperty('--dy', Math.sin(angle) * 100 + 'px');
      
      btn.appendChild(particle);
      setTimeout(() => particle.remove(), 1000);
    }

    // Change background gradient
    const hue = (clickCount * 30) % 360;
    document.body.style.background = `
      radial-gradient(circle at 20% 50%, hsl(${hue}, 60%, 5%) 0%, transparent 50%),
      radial-gradient(circle at 80% 20%, hsl(${hue + 60}, 60%, 5%) 0%, transparent 50%),
      radial-gradient(circle at 40% 80%, hsl(${hue + 120}, 60%, 5%) 0%, transparent 50%),
      var(--bg-primary)
    `;
  }

  // Explore button handler
  function handleExplore() {
    clickCount++;
    updateStats();
    
    // Auto-add random projects
    const numProjects = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < numProjects; i++) {
      setTimeout(() => addProject(), i * 200);
    }
  }

  // Floating button handler
  function handleFloatingBtn() {
    clickCount++;
    energyLevel = Math.min(100, energyLevel + 20);
    updateStats();

    // Create energy burst effect
    if (floatingBtn) {
      floatingBtn.style.transform = 'scale(1.5) rotate(720deg)';
      setTimeout(() => {
        floatingBtn.style.transform = 'scale(1) rotate(0deg)';
      }, 300);
    }
  }

  // Navigation handlers
  function handleNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Remove active class from all links
        navLinks.forEach(l => l.classList.remove('active'));
        
        // Add active class to clicked link
        link.classList.add('active');
        
        clickCount++;
        updateStats();
      });
    });
  }

  // Badge click handler
  function handleBadgeClick() {
    if (!heroBadge) return;
    
    clickCount++;
    updateStats();
    
    const badges = [
      { icon: '✨', text: 'AI-Powered Next Gen' },
      { icon: '🚀', text: 'Launching Innovation' },
      { icon: '⚡', text: 'Lightning Fast' },
      { icon: '🌟', text: 'Star Quality' },
      { icon: '🔮', text: 'Future Ready' }
    ];
    
    const randomBadge = badges[Math.floor(Math.random() * badges.length)];
    const icon = heroBadge.querySelector('.badge-icon');
    const text = heroBadge.querySelector('.badge-text');
    
    if (icon && text) {
      icon.textContent = randomBadge.icon;
      text.textContent = randomBadge.text;
    }
  }

  // Event listeners
  if (launchBtn) {
    launchBtn.addEventListener('click', handleLaunch);
  }

  if (exploreBtn) {
    exploreBtn.addEventListener('click', handleExplore);
  }

  if (addProjectBtn) {
    addProjectBtn.addEventListener('click', addProject);
  }

  if (floatingBtn) {
    floatingBtn.addEventListener('click', handleFloatingBtn);
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }

  if (heroBadge) {
    heroBadge.addEventListener('click', handleBadgeClick);
  }

  // Initialize
  handleNavigation();
  startTypingAnimation();
  updateStats();

  // Add CSS animations
  const style = document.createElement('style');
  style.textContent = `
    @keyframes ripple {
      to { transform: scale(4); opacity: 0; }
    }
    @keyframes explode {
      to { transform: translate(var(--dx), var(--dy)); opacity: 0; }
    }
  `;
  document.head.appendChild(style);

  // Auto energy regeneration
  setInterval(() => {
    if (energyLevel < 100) {
      energyLevel = Math.min(100, energyLevel + 1);
      updateStats();
    }
  }, 2000);

  console.log('✨ All interactions connected and ready!');
});