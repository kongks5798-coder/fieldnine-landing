// === Field Nine App — Main Entry Point ===
document.addEventListener('DOMContentLoaded', function() {
  var clickCount = 0;
  var cardCount = 0;

  var countEl = document.getElementById('count');
  var cardCountEl = document.getElementById('cardCount');
  var container = document.getElementById('cardContainer');
  var startBtn = document.getElementById('startBtn');
  var addCardBtn = document.getElementById('addCardBtn');

  function handleStart() {
    clickCount++;
    if (countEl) { countEl.textContent = clickCount; }
    var hue = (clickCount * 15) % 360;
    document.body.style.background =
      'linear-gradient(135deg, hsl(' + hue + ',20%,4%) 0%, hsl(' + (hue + 30) + ',15%,8%) 100%)';
  }

  function addCard() {
    cardCount++;
    if (cardCountEl) { cardCountEl.textContent = cardCount; }
    if (!container) { return; }

    var card = createCard(
      pickRandom(APP_DATA.emojis),
      pickRandom(APP_DATA.titles),
      pickRandom(APP_DATA.descs)
    );

    card.addEventListener('click', function() {
      card.style.transform = 'scale(0.95)';
      setTimeout(function() { card.style.transform = ''; }, 150);
    });

    container.prepend(card);
  }

  if (startBtn) { startBtn.addEventListener('click', handleStart); }
  if (addCardBtn) { addCardBtn.addEventListener('click', addCard); }

  // 초기 카드 3개
  for (var i = 0; i < 3; i++) {
    setTimeout(addCard, i * 200);
  }

  console.log('Field Nine App loaded!');
});
