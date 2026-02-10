document.addEventListener('DOMContentLoaded', function() {
  var attachedFiles = [];
  var isRecording = false;
  var recordingTimer = null;
  var recordingStartTime = null;

  // DOM 요소들
  var messageInput = document.getElementById('messageInput');
  var sendBtn = document.getElementById('sendBtn');
  var chatMessages = document.getElementById('chatMessages');
  var mediaPreview = document.getElementById('mediaPreview');
  var voiceRecording = document.getElementById('voiceRecording');
  
  // 버튼들
  var attachImageBtn = document.getElementById('attachImageBtn');
  var attachVideoBtn = document.getElementById('attachVideoBtn');
  var attachFileBtn = document.getElementById('attachFileBtn');
  var voiceBtn = document.getElementById('voiceBtn');
  var clearChatBtn = document.getElementById('clearChatBtn');
  
  // 파일 입력들
  var imageInput = document.getElementById('imageInput');
  var videoInput = document.getElementById('videoInput');
  var fileInput = document.getElementById('fileInput');
  
  // 모달 관련
  var mediaViewer = document.getElementById('mediaViewer');
  var viewerBackdrop = document.getElementById('viewerBackdrop');
  var viewerClose = document.getElementById('viewerClose');
  var permissionModal = document.getElementById('permissionModal');

  // 텍스트 입력 이벤트
  if (messageInput) {
    messageInput.addEventListener('input', function() {
      updateSendButton();
      autoResize();
    });

    messageInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }

  function autoResize() {
    if (messageInput) {
      messageInput.style.height = 'auto';
      messageInput.style.height = messageInput.scrollHeight + 'px';
    }
  }

  // 전송 버튼 이벤트
  if (sendBtn) {
    sendBtn.addEventListener('click', sendMessage);
  }

  // 파일 첨부 이벤트들
  if (attachImageBtn && imageInput) {
    attachImageBtn.addEventListener('click', function() {
      imageInput.click();
    });
    imageInput.addEventListener('change', handleFileSelect);
  }

  if (attachVideoBtn && videoInput) {
    attachVideoBtn.addEventListener('click', function() {
      videoInput.click();
    });
    videoInput.addEventListener('change', handleFileSelect);
  }

  if (attachFileBtn && fileInput) {
    attachFileBtn.addEventListener('click', function() {
      fileInput.click();
    });
    fileInput.addEventListener('change', handleFileSelect);
  }

  // 음성 버튼 이벤트
  if (voiceBtn) {
    voiceBtn.addEventListener('click', toggleVoiceRecording);
  }

  // 채팅 지우기
  if (clearChatBtn) {
    clearChatBtn.addEventListener('click', function() {
      if (confirm('모든 채팅을 삭제하시겠습니까?')) {
        clearChat();
      }
    });
  }

  // 모달 이벤트들
  if (viewerBackdrop) {
    viewerBackdrop.addEventListener('click', hideMediaViewer);
  }
  if (viewerClose) {
    viewerClose.addEventListener('click', hideMediaViewer);
  }

  // ESC 키로 모달 닫기
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      hideMediaViewer();
    }
  });

  // 드래그 앤 드롭
  document.addEventListener('dragover', function(e) {
    e.preventDefault();
  });

  document.addEventListener('drop', function(e) {
    e.preventDefault();
    var files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  });

  function handleFileSelect(e) {
    var files = Array.from(e.target.files);
    handleFiles(files);
    e.target.value = ''; // 같은 파일 다시 선택 가능하도록
  }

  function handleFiles(files) {
    files.forEach(function(file) {
      if (attachedFiles.length >= APP_DATA.maxFiles) {
        showNotification('error', '최대 ' + APP_DATA.maxFiles + '개 파일까지 첨부할 수 있습니다.');
        return;
      }

      if (file.size > APP_DATA.maxFileSize) {
        showNotification('error', '파일 크기는 50MB를 초과할 수 없습니다.');
        return;
      }

      var reader = new FileReader();
      reader.onload = function(e) {
        var fileData = {
          file: file,
          url: e.target.result,
          type: getMediaType(file.name),
          name: file.name,
          size: file.size
        };

        attachedFiles.push(fileData);
        var previewItem = createPreviewItem(file, e.target.result);
        mediaPreview.appendChild(previewItem);
        updateMediaPreview();
        updateSendButton();
      };

      reader.readAsDataURL(file);
    });
  }

  function sendMessage() {
    var text = messageInput ? messageInput.value.trim() : '';
    var hasMedia = attachedFiles.length > 0;

    if (!text && !hasMedia) return;

    // 사용자 메시지 추가
    var userMessage = createMessage('user', text, attachedFiles);
    chatMessages.appendChild(userMessage);

    // 입력 초기화
    if (messageInput) {
      messageInput.value = '';
      messageInput.style.height = 'auto';
    }
    attachedFiles = [];
    if (mediaPreview) {
      mediaPreview.innerHTML = '';
      updateMediaPreview();
    }
    updateSendButton();

    scrollToBottom();

    // AI 응답 시뮬레이션
    setTimeout(function() {
      showTypingIndicator();
      
      setTimeout(function() {
        hideTypingIndicator();
        
        var responseText;
        if (hasMedia) {
          responseText = pickRandom(APP_DATA.aiResponses);
        } else {
          responseText = pickRandom(APP_DATA.textResponses);
        }
        
        var aiMessage = createMessage('ai', responseText);
        chatMessages.appendChild(aiMessage);
        scrollToBottom();
      }, 1000 + Math.random() * 2000);
    }, 500);
  }

  function showTypingIndicator() {
    var existing = document.getElementById('typingIndicator');
    if (existing) return;

    var typing = createTypingIndicator();
    chatMessages.appendChild(typing);
    scrollToBottom();
  }

  function hideTypingIndicator() {
    var typing = document.getElementById('typingIndicator');
    if (typing) {
      typing.remove();
    }
  }

  function toggleVoiceRecording() {
    if (!isRecording) {
      startVoiceRecording();
    } else {
      stopVoiceRecording();
    }
  }

  function startVoiceRecording() {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(function(stream) {
        isRecording = true;
        recordingStartTime = Date.now();
        
        voiceBtn.classList.add('recording');
        voiceRecording.classList.add('show');
        
        var mediaRecorder = new MediaRecorder(stream);
        var audioChunks = [];
        
        mediaRecorder.ondataavailable = function(event) {
          audioChunks.push(event.data);
        };
        
        mediaRecorder.onstop = function() {
          var audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
          var audioUrl = URL.createObjectURL(audioBlob);
          
          var audioFile = {
            file: new File([audioBlob], '음성메시지.wav', { type: 'audio/wav' }),
            url: audioUrl,
            type: 'audio',
            name: '음성메시지.wav',
            size: audioBlob.size
          };
          
          attachedFiles.push(audioFile);
          updateSendButton();
          
          stream.getTracks().forEach(function(track) {
            track.stop();
          });
        };
        
        mediaRecorder.start();
        APP_DATA.recordingState.mediaRecorder = mediaRecorder;
        
        // 녹음 시간 업데이트
        recordingTimer = setInterval(updateRecordingTime, 1000);
        
        showNotification('info', '음성 녹음이 시작되었습니다.');
      })
      .catch(function(error) {
        showNotification('error', '마이크 권한이 필요합니다.');
        console.error('음성 녹음 오류:', error);
      });
  }

  function stopVoiceRecording() {
    if (APP_DATA.recordingState.mediaRecorder) {
      APP_DATA.recordingState.mediaRecorder.stop();
    }
    
    isRecording = false;
    voiceBtn.classList.remove('recording');
    voiceRecording.classList.remove('show');
    
    if (recordingTimer) {
      clearInterval(recordingTimer);
      recordingTimer = null;
    }
    
    showNotification('success', '음성 녹음이 완료되었습니다.');
  }

  function updateRecordingTime() {
    var timeEl = document.getElementById('recordingTime');
    if (timeEl && recordingStartTime) {
      var elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
      timeEl.textContent = formatTime(elapsed);
    }
  }

  // 녹음 취소/전송 버튼
  var cancelRecording = document.getElementById('cancelRecording');
  var sendRecording = document.getElementById('sendRecording');

  if (cancelRecording) {
    cancelRecording.addEventListener('click', function() {
      if (APP_DATA.recordingState.mediaRecorder) {
        APP_DATA.recordingState.mediaRecorder.stop();
      }
      
      isRecording = false;
      voiceBtn.classList.remove('recording');
      voiceRecording.classList.remove('show');
      
      if (recordingTimer) {
        clearInterval(recordingTimer);
        recordingTimer = null;
      }
      
      showNotification('info', '음성 녹음이 취소되었습니다.');
    });
  }

  if (sendRecording) {
    sendRecording.addEventListener('click', function() {
      stopVoiceRecording();
      setTimeout(sendMessage, 500);
    });
  }

  function clearChat() {
    if (chatMessages) {
      var welcomeMsg = chatMessages.querySelector('.welcome-message');
      chatMessages.innerHTML = '';
      if (welcomeMsg) {
        chatMessages.appendChild(welcomeMsg.cloneNode(true));
      }
      showNotification('success', '채팅이 초기화되었습니다.');
    }
  }

  // 초기화
  updateSendButton();
  scrollToBottom();

  console.log('🤖 Field Nine AI Chat 시스템 로드 완료');
  console.log('📱 지원 기능: 텍스트, 이미지, 영상, 음성, 파일');
  console.log('🎯 멀티모달 AI 채팅 준비 완료');
});