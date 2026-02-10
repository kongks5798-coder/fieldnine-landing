// === Field Nine OS Logic ===
document.addEventListener('DOMContentLoaded', function() {
  // --- Legacy Counter Logic ---
  var cardCount = 0;
  var container = document.getElementById('cardContainer');
  var addCardBtn = document.getElementById('addCardBtn');

  function addCard() {
    cardCount++;
    if (!container) return;
    
    // Using window.APP_DATA and window.createCard to ensure scope safety
    var card = window.createCard(
      window.pickRandom(window.APP_DATA.emojis),
      window.pickRandom(window.APP_DATA.titles),
      window.pickRandom(window.APP_DATA.descs)
    );
    container.prepend(card);
  }

  if (addCardBtn) addCardBtn.addEventListener('click', addCard);

  // --- Gemini-style AI Control ---
  const attachBtn = document.getElementById('attachBtn');
  const micBtn = document.getElementById('micBtn');
  const sendBtn = document.getElementById('sendBtn');
  const chatInput = document.getElementById('chatInput');
  const mediaPreview = document.getElementById('mediaPreview');
  const analysisLog = document.getElementById('analysisLog');
  const logContent = document.getElementById('logContent');

  // Simulate Media Attachment
  if (attachBtn) {
    attachBtn.addEventListener('click', () => {
      // Show mock preview
      mediaPreview.innerHTML = `
        <img src="https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=200&q=80" alt="Chipset" />
        <div class="media-info">
          <div>system_arch.png</div>
          <div style="color:#64748b">2.4 MB • PNG Image</div>
        </div>
      `;
      mediaPreview.classList.remove('hidden');
      chatInput.placeholder = "Image attached. Ask for analysis...";
    });
  }

  // Simulate Voice Command
  if (micBtn) {
    micBtn.addEventListener('click', () => {
      micBtn.style.color = '#ef4444'; // Recording red
      chatInput.placeholder = "Listening...";
      setTimeout(() => {
        chatInput.value = "Analyze this system architecture for bottlenecks.";
        micBtn.style.color = '';
        chatInput.placeholder = "Ask Field Nine AI...";
      }, 1500);
    });
  }

  // Handle Send / Analysis
  if (sendBtn) {
    sendBtn.addEventListener('click', () => {
      const query = chatInput.value;
      if (!query && mediaPreview.classList.contains('hidden')) return;

      // Clear input
      chatInput.value = '';
      mediaPreview.classList.add('hidden');
      
      // Show Analysis Log
      analysisLog.classList.remove('hidden');
      logContent.innerHTML = '<span style="color:#58a6ff">System</span>: Processing input stream...';

      // Simulate Analysis Steps
      setTimeout(() => {
        logContent.innerHTML += '\n<span style="color:#238636">✔</span> Image recognized: Integrated Circuit / CPU Architecture';
      }, 800);

      setTimeout(() => {
        logContent.innerHTML += '\n<span style="color:#238636">✔</span> Object Detection: Logic Gates, Memory Bus detected';
      }, 1600);

      setTimeout(() => {
        logContent.innerHTML += '\n<span style="color:#d29922">⚠</span> <strong style="color:white">Analysis Result:</strong>\nFound potential thermal bottleneck in the north bridge sector. Suggest rerouting data lanes or increasing cooling capacity.';
        addCard(); // Add a card as a result
      }, 2500);
    });
  }

  console.log('🚀 Field Nine OS: AI Core Online');
  console.log('✅ Integrated Control Environment Ready');
});