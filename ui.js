// === UI Helper Functions ===
// Attaching to window to avoid ReferenceError in iframe
window.pickRandom = function(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
};

window.createCard = function(emoji, title, desc) {
  var card = document.createElement('div');
  card.className = 'card';
  var time = new Date().toLocaleTimeString('ko-KR');
  card.innerHTML =
    '<div class="card-emoji">' + emoji + '</div>' +
    '<h3>' + title + '</h3>' +
    '<p>' + desc + '</p>' +
    '<div class="card-time">' + time + '</div>';
  return card;
};