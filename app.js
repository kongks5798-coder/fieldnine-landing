function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  var k = 1024;
  var sizes = ['Bytes', 'KB', 'MB', 'GB'];
  var i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatTime(seconds) {
  var mins = Math.floor(seconds / 60);
  var secs = seconds % 60;
  return mins.toString().padStart(2, '0') + ':' + secs.toString().padStart(2, '0');
}

function getFileIcon(fileName) {
  var ext = fileName.split('.').pop().toLowerCase();
  var icons = {
    pdf: '📄', doc: '📝', docx: '📝', txt: '📝',
    xls: '📊', xlsx: '📊', csv: '📊',
    zip: '📦', rar: '📦', '7z': '📦',
    js: '💻', html: '🌐', css: '🎨', json: '⚙️',
    default: '📎'
  };
  return icons[ext] || icons.default;
}

function getMediaType(fileName) {
  var ext = fileName.split('.').pop().toLowerCase();
  if (APP_DATA.mediaTypes.image.includes(ext)) return 'image';
  if (APP_DATA.mediaTypes.video.includes(ext)) return 'video';
  if (APP_DATA.mediaTypes.audio.includes(ext)) return 'audio';
  return 'file';
}

function createMessage(type, content, media) {
  var message = document.createElement('div');
  message.className = 'message ' + type;
  
  var avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  avatar.textContent = type === 'user' ? '👤' : '🤖';
  
  var messageContent = document.createElement('div');
  messageContent.className = 'message-content';
  
  if (media && media.length > 0) {
    var mediaContainer = document.createElement('div');
    mediaContainer.className = 'message-media';
    
    media.forEach(function(item) {
      var mediaItem = document.createElement('div');
      mediaItem.className = 'media-item';
      
      if (item.type === 'image') {
        var img = document.createElement('img');
        img.src = item.url;
        img.alt = item.name;
        mediaItem.appendChild(img);
      } else if (item.type === 'video') {
        var video = document.createElement('video');
        video.src = item.url;
        video.controls = true;
        video.muted = true;
        mediaItem.appendChild(video);
      } else if (item.type === 'audio') {
        var audio = document.createElement('audio');
        audio.src = item.url;
        audio.controls = true;
        mediaItem.appendChild(audio);
      }
      
      var overlay = document.createElement('div');
      overlay.className = 'media-overlay';
      overlay.textContent = '🔍';
      mediaItem.appendChild(overlay);
      
      mediaItem.addEventListener('click', function() {
        showMediaViewer(item);
      });
      
      mediaContainer.appendChild(mediaItem);
    });
    
    messageContent.appendChild(mediaContainer);
  }
  
  if (content) {
    var messageText = document.createElement('div');
    messageText.className = 'message-text';
    messageText.textContent = content;
    messageContent.appendChild(messageText);
  }
  
  var messageTime = document.createElement('div');
  messageTime.className = 'message-time';
  messageTime.textContent = new Date().toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit'
  });
  messageContent.appendChild(messageTime);
  
  message.appendChild(avatar);
  message.appendChild(messageContent);
  
  return message;
}

function createTypingIndicator() {
  var typing = document.createElement('div');
  typing.className = 'typing-indicator';
  typing.id = 'typingIndicator';
  
  var avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  avatar.textContent = '🤖';
  
  var content = document.createElement('div');
  content.className = 'typing-content';
  content.innerHTML = 
    '<span>AI가 입력 중</span>' +
    '<div class="typing-dots">' +
      '<div class="typing-dot"></div>' +
      '<div class="typing-dot"></div>' +
      '<div class="typing-dot"></div>' +
    '</div>';
  
  typing.appendChild(avatar);
  typing.appendChild(content);
  
  return typing;
}

function createPreviewItem(file, url) {
  var preview = document.createElement('div');
  preview.className = 'preview-item';
  preview.dataset.fileName = file.name;
  
  var mediaType = getMediaType(file.name);
  
  if (mediaType === 'image') {
    var img = document.createElement('img');
    img.src = url;
    img.alt = file.name;
    preview.appendChild(img);
  } else if (mediaType === 'video') {
    var video = document.createElement('video');
    video.src = url;
    video.muted = true;
    preview.appendChild(video);
  } else {
    preview.classList.add('file');
    var icon = document.createElement('div');
    icon.className = 'file-icon';
    icon.textContent = getFileIcon(file.name);
    
    var name = document.createElement('div');
    name.className = 'file-name';
    name.textContent = file.name;
    
    preview.appendChild(icon);
    preview.appendChild(name);
  }
  
  var removeBtn = document.createElement('button');
  removeBtn.className = 'preview-remove';
  removeBtn.textContent = '×';
  removeBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    preview.remove();
    updateMediaPreview();
  });
  
  preview.appendChild(removeBtn);
  return preview;
}

function showMediaViewer(mediaItem) {
  var viewer = document.getElementById('mediaViewer');
  var title = document.getElementById('viewerTitle');
  var content = document.getElementById('viewerContent');
  
  if (!viewer || !title || !content) return;
  
  title.textContent = mediaItem.name || '미디어 보기';
  content.innerHTML = '';
  
  if (mediaItem.type === 'image') {
    var img = document.createElement('img');
    img.src = mediaItem.url;
    img.alt = mediaItem.name;
    content.appendChild(img);
  } else if (mediaItem.type === 'video') {
    var video = document.createElement('video');
    video.src = mediaItem.url;
    video.controls = true;
    video.autoplay = true;
    content.appendChild(video);
  }
  
  viewer.classList.add('show');
}

function hideMediaViewer() {
  var viewer = document.getElementById('mediaViewer');
  if (viewer) {
    viewer.classList.remove('show');
  }
}

function updateMediaPreview() {
  var preview = document.getElementById('mediaPreview');
  if (!preview) return;
  
  var items = preview.querySelectorAll('.preview-item');
  if (items.length > 0) {
    preview.classList.add('show');
  } else {
    preview.classList.remove('show');
  }
}

function showNotification(type, message) {
  var container = document.getElementById('notificationContainer');
  if (!container) return;
  
  var notification = document.createElement('div');
  notification.className = 'notification ' + type;
  notification.textContent = message;
  
  container.appendChild(notification);
  
  setTimeout(function() {
    if (notification.parentNode) {
      notification.style.animation = 'slideOutRight 0.3s ease-out forwards';
      setTimeout(function() {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }
  }, 3000);
}

function scrollToBottom() {
  var messages = document.getElementById('chatMessages');
  if (messages) {
    setTimeout(function() {
      messages.scrollTop = messages.scrollHeight;
    }, 100);
  }
}

function updateSendButton() {
  var input = document.getElementById('messageInput');
  var button = document.getElementById('sendBtn');
  var preview = document.getElementById('mediaPreview');
  
  if (!input || !button) return;
  
  var hasText = input.value.trim().length > 0;
  var hasMedia = preview && preview.querySelectorAll('.preview-item').length > 0;
  
  button.disabled = !hasText && !hasMedia;
}