/**
 * DIPDoc Chatbot
 * AI Health Chat interface powered by Gemini Advisor.
 */
const Chatbot = (() => {
  let messagesEl, inputEl, sendBtn, quickRepliesEl;
  let isProcessing = false;

  // AI response bank for mock mode
  const responses = {
    vitals: [
      "Based on your current readings, your vitals are looking good! Heart rate is steady, SpO₂ is within normal range, and hydration levels are adequate. Keep it up! 💚",
      "Your vitals summary: Heart rate is stable, blood pressure is within expected range, and oxygen saturation is healthy. No concerns at this time.",
      "Looking at your data — everything appears normal. Your body is doing well today. Remember to stay hydrated!"
    ],
    hydration: [
      "Great question! Here are some tips for better hydration:\n\n🥤 Drink water every hour, even if you're not thirsty\n🍉 Eat water-rich fruits like watermelon and cucumber\n☕ Limit caffeine which can dehydrate you\n🍵 Herbal teas count towards your daily intake!",
      "For better hydration, try keeping a water bottle nearby at all times. Coconut water is also excellent — it replenishes electrolytes naturally. Aim for 6-8 glasses daily!"
    ],
    heartRate: [
      "Your heart rate is currently in a healthy range. A normal resting heart rate for adults is between 60-100 beats per minute. Yours is right on track! ❤️",
      "Your heart rate looks perfectly normal! To keep it healthy, try gentle walking, deep breathing exercises, and reducing stress throughout your day."
    ],
    breathing: [
      "Here's a simple breathing exercise:\n\n1️⃣ Breathe in slowly through your nose for 4 seconds\n2️⃣ Hold your breath for 4 seconds\n3️⃣ Exhale slowly through your mouth for 6 seconds\n4️⃣ Repeat 5-10 times\n\nThis can help reduce stress and improve oxygen levels!",
      "Try the 4-7-8 technique:\n\n🌬️ Inhale for 4 seconds\n⏸️ Hold for 7 seconds\n💨 Exhale for 8 seconds\n\nDo this 3-4 times. It's wonderful for relaxation and sleep!"
    ],
    general: [
      "I'm here to help with your health questions! You can ask me about your vitals, hydration tips, breathing exercises, medication reminders, or general wellness advice. 😊",
      "That's a great question! Based on your current health data, I'd recommend maintaining your regular routine, staying hydrated, and keeping up with gentle exercise. Let me know if you have specific concerns!",
      "I'd be happy to help! Your current health metrics suggest you're doing well. Is there anything specific about your readings you'd like me to explain?",
      "Your health is my priority! I can see your latest vitals are looking stable. Would you like detailed advice on any particular metric?"
    ]
  };

  function init() {
    messagesEl = document.getElementById('chat-messages');
    inputEl = document.getElementById('chat-input');
    sendBtn = document.getElementById('chat-send-btn');
    quickRepliesEl = document.getElementById('quick-replies');

    if (sendBtn) {
      sendBtn.addEventListener('click', handleSend);
    }
    if (inputEl) {
      inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleSend();
        }
      });
    }

    // Quick replies
    if (quickRepliesEl) {
      quickRepliesEl.addEventListener('click', (e) => {
        const btn = e.target.closest('.qr-btn');
        if (btn) {
          const msg = btn.dataset.msg;
          if (msg) {
            inputEl.value = msg;
            handleSend();
          }
        }
      });
    }
  }

  function handleSend() {
    if (isProcessing) return;
    const text = inputEl.value.trim();
    if (!text) return;

    // Add user message
    addMessage('user', text);
    inputEl.value = '';

    // Show typing indicator
    isProcessing = true;
    showTyping();

    // Generate response after delay
    setTimeout(() => {
      removeTyping();
      const response = generateResponse(text);
      addMessage('bot', response);
      isProcessing = false;
    }, 1000 + Math.random() * 1500);
  }

  function generateResponse(userMsg) {
    const msg = userMsg.toLowerCase();

    if (msg.includes('vital') || msg.includes('reading') || msg.includes('status') || msg.includes('how am i')) {
      return pickRandom(responses.vitals);
    }
    if (msg.includes('hydrat') || msg.includes('water') || msg.includes('drink') || msg.includes('thirst')) {
      return pickRandom(responses.hydration);
    }
    if (msg.includes('heart') || msg.includes('pulse') || msg.includes('bpm') || msg.includes('heart rate')) {
      return pickRandom(responses.heartRate);
    }
    if (msg.includes('breath') || msg.includes('lung') || msg.includes('exercise') || msg.includes('oxygen')) {
      return pickRandom(responses.breathing);
    }
    return pickRandom(responses.general);
  }

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function addMessage(type, text) {
    if (!messagesEl) return;
    const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-msg ${type}`;

    const avatar = type === 'bot' ? '🤖' : '👤';
    const lines = text.split('\n').map(l => `<p>${l}</p>`).join('');

    msgDiv.innerHTML = `
      <div class="chat-avatar">${avatar}</div>
      <div class="chat-bubble">
        ${lines}
        <span class="chat-time">${now}</span>
      </div>
    `;

    messagesEl.appendChild(msgDiv);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function showTyping() {
    if (!messagesEl) return;
    const typing = document.createElement('div');
    typing.className = 'chat-msg bot';
    typing.id = 'typing-indicator';
    typing.innerHTML = `
      <div class="chat-avatar">🤖</div>
      <div class="chat-bubble">
        <div class="typing-indicator">
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
        </div>
      </div>
    `;
    messagesEl.appendChild(typing);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function removeTyping() {
    const typing = document.getElementById('typing-indicator');
    if (typing) typing.remove();
  }

  return { init };
})();
