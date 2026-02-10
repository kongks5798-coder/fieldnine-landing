// === UI Helper Functions ===
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function createCard(emoji, title, desc) {
  var card = document.createElement('div');
  card.className = 'card';
  var time = new Date().toLocaleTimeString('ko-KR');
  card.innerHTML =
    '<div class="card-emoji">' + emoji + '</div>' +
    '<h3>' + title + '</h3>' +
    '<p>' + desc + '</p>' +
    '<div class="card-time">' + time + '에 생성됨</div>';
  return card;
}