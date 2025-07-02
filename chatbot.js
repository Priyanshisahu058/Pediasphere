// Pediasphere Chatbot with Groq API Integration - Complete Version
class PediasphereChatbot {
    constructor() {
        this.apiKey = 'process.env.GROQ_API_KEY';
        this.apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
        this.chatHistory = this.loadChatHistory();
        this.isListening = false;
        this.recognition = null;
        
        this.initializeElements();
        this.initializeEventListeners();
        this.initializeSpeechRecognition();
        this.setupSystemPrompt();
    }

    initializeElements() {
        this.chatbotToggle = document.getElementById('chatbotToggle');
        this.chatbotContainer = document.getElementById('chatbotContainer');
        this.closeChatbot = document.getElementById('closeChatbot');
        this.chatbotMessages = document.getElementById('chatbotMessages');
        this.chatInput = document.getElementById('chatInput');
        this.sendChat = document.getElementById('sendChat');
        
        // Create voice button
        this.createVoiceButton();
    }

    createVoiceButton() {
        const voiceButton = document.createElement('button');
        voiceButton.id = 'voiceButton';
        voiceButton.innerHTML = '<i class="fas fa-microphone"></i>';
        voiceButton.className = 'voice-button';
        voiceButton.title = 'Click to speak';
        
        // Insert voice button before send button
        this.sendChat.parentNode.insertBefore(voiceButton, this.sendChat);
        this.voiceButton = voiceButton;
    }

    initializeEventListeners() {
        // Toggle chatbot
        this.chatbotToggle.addEventListener('click', () => {
            this.toggleChatbot();
        });

        // Close chatbot
        this.closeChatbot.addEventListener('click', () => {
            this.closeChatbotWindow();
        });

        // Send message
        this.sendChat.addEventListener('click', () => {
            this.sendMessage();
        });

        // Enter key to send
        this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });

        // Voice button
        this.voiceButton.addEventListener('click', () => {
            this.toggleVoiceRecognition();
        });

        // Scroll event listener for auto-scroll behavior
        this.chatbotMessages.addEventListener('scroll', () => {
            this.handleScrollBehavior();
        });

        // Load chat history on page load
        this.loadAndDisplayHistory();
    }

    initializeSpeechRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.lang = 'en-US';

            this.recognition.onstart = () => {
                this.isListening = true;
                this.voiceButton.classList.add('listening');
                this.voiceButton.innerHTML = '<i class="fas fa-stop"></i>';
                this.chatInput.placeholder = 'Listening...';
            };

            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                this.chatInput.value = transcript;
                this.stopListening();
            };

            this.recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                this.stopListening();
                this.showError('Voice recognition error. Please try again.');
            };

            this.recognition.onend = () => {
                this.stopListening();
            };
        } else {
            this.voiceButton.style.display = 'none';
            console.warn('Speech recognition not supported in this browser');
        }
    }

    setupSystemPrompt() {
        this.systemPrompt = `You are MediBot, a specialized AI assistant for Pediasphere, a pediatric healthcare platform. Your primary focus is on child nutrition and immunization guidance.

Key Guidelines:
1. Provide accurate, evidence-based information about child nutrition and immunization
2. Always recommend consulting healthcare professionals for serious concerns
3. Be empathetic and supportive to parents and caregivers
4. Use simple, clear language that parents can understand
5. Focus on preventive care and healthy lifestyle choices
6. Provide age-appropriate recommendations when possible
7. Never provide emergency medical advice - always direct to emergency services if needed

Your expertise covers:
- Child nutrition guidelines and recommendations
- Immunization schedules and vaccine information
- Common pediatric health concerns
- Growth and development milestones
- Feeding practices for different age groups
- Food allergies and dietary restrictions

Always maintain a caring, professional tone and prioritize child safety.`;
    }

    toggleChatbot() {
        this.chatbotContainer.classList.toggle('active');
        if (this.chatbotContainer.classList.contains('active')) {
            this.chatInput.focus();
            setTimeout(() => this.updateScrollIndicators(), 100);
        }
    }

    closeChatbotWindow() {
        this.chatbotContainer.classList.remove('active');
    }

    toggleVoiceRecognition() {
        if (!this.recognition) {
            this.showError('Voice recognition not supported in your browser');
            return;
        }

        if (this.isListening) {
            this.recognition.stop();
        } else {
            this.recognition.start();
        }
    }

    stopListening() {
        this.isListening = false;
        this.voiceButton.classList.remove('listening');
        this.voiceButton.innerHTML = '<i class="fas fa-microphone"></i>';
        this.chatInput.placeholder = 'Type your question...';
    }

    async sendMessage() {
        const message = this.chatInput.value.trim();
        if (!message) return;

        // Clear input
        this.chatInput.value = '';

        // Add user message to chat
        this.addMessage(message, 'user');

        // Show typing indicator
        this.showTypingIndicator();

        try {
            // Get bot response
            const response = await this.getBotResponse(message);
            
            // Remove typing indicator
            this.hideTypingIndicator();
            
            // Add bot response with typing effect
            await this.addBotMessageWithTyping(response);
            
            // Save to history
            this.saveChatHistory();
            
        } catch (error) {
            console.error('Error getting bot response:', error);
            this.hideTypingIndicator();
            this.addMessage('Sorry, I encountered an error. Please try again.', 'bot');
        }
    }

    addMessage(message, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `${sender}-message message-fade-in`;

        if (sender === 'bot') {
            messageDiv.innerHTML = `
                <div class="message-avatar">
                    <i class="fas fa-robot"></i>
                </div>
                <div class="message-content">${message}</div>
            `;
        } else {
            messageDiv.innerHTML = `
                <div class="message-content">${message}</div>
            `;
        }

        this.chatbotMessages.appendChild(messageDiv);
        this.scrollToBottom();

        // Add to chat history
        this.chatHistory.push({
            message: message,
            sender: sender,
            timestamp: new Date().toISOString()
        });

        // Update scroll indicators after adding message
        setTimeout(() => this.updateScrollIndicators(), 100);
    }

    async addBotMessageWithTyping(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'bot-message message-fade-in';
        messageDiv.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-content"></div>
        `;

        this.chatbotMessages.appendChild(messageDiv);
        const contentDiv = messageDiv.querySelector('.message-content');

        // Typing effect
        let i = 0;
        const typeSpeed = 30; // milliseconds per character

        return new Promise((resolve) => {
            const typeInterval = setInterval(() => {
                if (i < message.length) {
                    contentDiv.textContent += message.charAt(i);
                    i++;
                    this.scrollToBottom();
                } else {
                    clearInterval(typeInterval);
                    
                    // Add to chat history
                    this.chatHistory.push({
                        message: message,
                        sender: 'bot',
                        timestamp: new Date().toISOString()
                    });
                    
                    // Update scroll indicators
                    setTimeout(() => this.updateScrollIndicators(), 100);
                    
                    resolve();
                }
            }, typeSpeed);
        });
    }

    showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'bot-message typing-indicator';
        typingDiv.id = 'typingIndicator';
        typingDiv.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-content">
                <div class="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;

        this.chatbotMessages.appendChild(typingDiv);
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    async getBotResponse(userMessage) {
        // Prepare conversation context
        const messages = [
            { role: 'system', content: this.systemPrompt }
        ];

        // Add recent chat history for context (last 10 messages)
        const recentHistory = this.chatHistory.slice(-10);
        recentHistory.forEach(item => {
            messages.push({
                role: item.sender === 'user' ? 'user' : 'assistant',
                content: item.message
            });
        });

        // Add current user message
        messages.push({ role: 'user', content: userMessage });

        const response = await fetch(this.apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama3-8b-8192', // Using Groq's Llama model
                messages: messages,
                max_tokens: 1000,
                temperature: 0.7,
                stream: false
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    // Enhanced scrolling methods
    scrollToBottom(smooth = true) {
        if (smooth) {
            this.chatbotMessages.scrollTo({
                top: this.chatbotMessages.scrollHeight,
                behavior: 'smooth'
            });
        } else {
            this.chatbotMessages.scrollTop = this.chatbotMessages.scrollHeight;
        }
    }

    handleScrollBehavior() {
        const { scrollTop, scrollHeight, clientHeight } = this.chatbotMessages;
        const isNearBottom = scrollTop + clientHeight >= scrollHeight - 50;
        
        if (isNearBottom) {
            this.hideScrollToBottomButton();
        } else {
            this.showScrollToBottomButton();
        }
        
        // Show/hide scroll indicators
        this.updateScrollIndicators();
    }

    updateScrollIndicators() {
        // Check if content is scrollable
        const isScrollable = this.chatbotMessages.scrollHeight > this.chatbotMessages.clientHeight;
        
        if (isScrollable) {
            this.chatbotMessages.classList.add('scrollable');
        } else {
            this.chatbotMessages.classList.remove('scrollable');
        }
    }

    showScrollToBottomButton() {
        if (!this.scrollButton) {
            this.createScrollToBottomButton();
        }
        this.scrollButton.style.display = 'flex';
    }

    hideScrollToBottomButton() {
        if (this.scrollButton) {
            this.scrollButton.style.display = 'none';
        }
    }

    createScrollToBottomButton() {
        this.scrollButton = document.createElement('button');
        this.scrollButton.className = 'scroll-to-bottom-btn';
        this.scrollButton.innerHTML = '<i class="fas fa-chevron-down"></i>';
        this.scrollButton.title = 'Scroll to bottom';
        
        // Insert before chatbot input
        this.chatbotContainer.insertBefore(this.scrollButton, this.chatbotContainer.lastElementChild);
        
        this.scrollButton.addEventListener('click', () => {
            this.scrollToBottom(true);
            this.hideScrollToBottomButton();
        });
    }

    // Manual scroll controls
    scrollToTop(smooth = true) {
        if (smooth) {
            this.chatbotMessages.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        } else {
            this.chatbotMessages.scrollTop = 0;
        }
    }

    scrollToMessage(messageIndex) {
        const messages = this.chatbotMessages.querySelectorAll('.user-message, .bot-message');
        if (messages[messageIndex]) {
            messages[messageIndex].scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }
    }

    // Chat history methods
    loadChatHistory() {
        try {
            const history = localStorage.getItem('pediasphere_chat_history');
            return history ? JSON.parse(history) : [];
        } catch (error) {
            console.error('Error loading chat history:', error);
            return [];
        }
    }

    saveChatHistory() {
        try {
            // Keep only last 100 messages to prevent localStorage overflow
            const historyToSave = this.chatHistory.slice(-100);
            localStorage.setItem('pediasphere_chat_history', JSON.stringify(historyToSave));
        } catch (error) {
            console.error('Error saving chat history:', error);
        }
    }

    loadAndDisplayHistory() {
        // Clear existing messages except welcome message
        const welcomeMessage = this.chatbotMessages.querySelector('.bot-message');
        this.chatbotMessages.innerHTML = '';
        if (welcomeMessage) {
            this.chatbotMessages.appendChild(welcomeMessage);
        }

        // Display saved history
        this.chatHistory.forEach(item => {
            if (item.sender === 'bot') {
                const messageDiv = document.createElement('div');
                messageDiv.className = 'bot-message';
                messageDiv.innerHTML = `
                    <div class="message-avatar">
                        <i class="fas fa-robot"></i>
                    </div>
                    <div class="message-content">${item.message}</div>
                `;
                this.chatbotMessages.appendChild(messageDiv);
            } else {
                const messageDiv = document.createElement('div');
                messageDiv.className = 'user-message';
                messageDiv.innerHTML = `
                    <div class="message-content">${item.message}</div>
                `;
                this.chatbotMessages.appendChild(messageDiv);
            }
        });

        this.scrollToBottom();
        setTimeout(() => this.updateScrollIndicators(), 100);
    }

    showError(message) {
        this.addMessage(message, 'bot');
    }

    // Method to clear chat history
    clearChatHistory() {
        this.chatHistory = [];
        localStorage.removeItem('pediasphere_chat_history');
        this.loadAndDisplayHistory();
    }

    // Export chat history
    exportChatHistory() {
        const dataStr = JSON.stringify(this.chatHistory, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `pediasphere_chat_history_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
    }

    // Search in chat history
    searchChatHistory(query) {
        const results = this.chatHistory.filter(item => 
            item.message.toLowerCase().includes(query.toLowerCase())
        );
        return results;
    }
}

// Complete CSS for the chatbot (add this to your CSS file)
const completeChatbotCSS = `
/* Voice Button Styles */
.voice-button {
    background: #4CAF50;
    border: none;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    color: white;
    cursor: pointer;
    margin-right: 8px;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
}

.voice-button:hover {
    background: #45a049;
    transform: scale(1.05);
}

.voice-button.listening {
    background: #f44336;
    animation: pulse 1s infinite;
}

@keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); }
}

/* Typing Indicator Styles */
.typing-indicator .message-content {
    padding: 12px 16px;
}

.typing-dots {
    display: flex;
    gap: 4px;
}

.typing-dots span {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: #999;
    animation: typing 1.4s infinite ease-in-out;
}

.typing-dots span:nth-child(1) { animation-delay: -0.32s; }
.typing-dots span:nth-child(2) { animation-delay: -0.16s; }

@keyframes typing {
    0%, 80%, 100% { 
        transform: scale(0.8);
        opacity: 0.5;
    }
    40% { 
        transform: scale(1);
        opacity: 1;
    }
}

/* Input Area Styles */
.chatbot-input {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
    border-top: 1px solid #eee;
    background: white;
}

/* Message Styles */
.user-message {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 12px;
}

.user-message .message-content {
    background: #007bff;
    color: white;
    padding: 12px 16px;
    border-radius: 18px 18px 4px 18px;
    max-width: 80%;
    word-wrap: break-word;
    box-shadow: 0 1px 2px rgba(0,0,0,0.1);
}

.bot-message {
    display: flex;
    align-items: flex-start;
    margin-bottom: 12px;
    gap: 8px;
}

.bot-message .message-avatar {
    width: 32px;
    height: 32px;
    background: #f0f0f0;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: #666;
}

.bot-message .message-content {
    background: #f1f1f1;
    padding: 12px 16px;
    border-radius: 4px 18px 18px 18px;
    max-width: 80%;
    word-wrap: break-word;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

/* Enhanced Scrolling Styles */
.chatbot-messages {
    overflow-y: auto;
    overflow-x: hidden;
    scroll-behavior: smooth;
    position: relative;
    flex: 1;
    padding: 16px;
    /* Improve scrolling performance */
    will-change: scroll-position;
    /* Improve touch scrolling on mobile */
    -webkit-overflow-scrolling: touch;
}

/* Custom Scrollbar */
.chatbot-messages::-webkit-scrollbar {
    width: 6px;
}

.chatbot-messages::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 3px;
}

.chatbot-messages::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 3px;
}

.chatbot-messages::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
}

/* Scroll to bottom button */
.scroll-to-bottom-btn {
    position: absolute;
    bottom: 70px;
    right: 20px;
    width: 40px;
    height: 40px;
    border: none;
    border-radius: 50%;
    background: #007bff;
    color: white;
    cursor: pointer;
    display: none;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    transition: all 0.3s ease;
    z-index: 10;
}

.scroll-to-bottom-btn:hover {
    background: #0056b3;
    transform: scale(1.1);
}

.scroll-to-bottom-btn i {
    font-size: 16px;
}

/* Scroll indicators for overflow content */
.chatbot-messages.scrollable::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 20px;
    background: linear-gradient(to bottom, rgba(255,255,255,0.9), transparent);
    pointer-events: none;
    z-index: 5;
}

.chatbot-messages.scrollable::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 20px;
    background: linear-gradient(to top, rgba(255,255,255,0.9), transparent);
    pointer-events: none;
    z-index: 5;
}

/* Message animations */
.message-fade-in {
    animation: fadeInUp 0.3s ease-out;
}

@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* Smooth scrolling animation */
@keyframes scrollHint {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
}

.scroll-hint {
    animation: scrollHint 2s infinite;
}

/* Mobile responsive scroll improvements */
@media (max-width: 768px) {
    .chatbot-container {
        width: 100%;
        height: 100%;
        right: 0;
        bottom: 0;
        border-radius: 0;
    }
    
    .voice-button {
        width: 35px;
        height: 35px;
    }
    
    .scroll-to-bottom-btn {
        bottom: 80px;
        right: 15px;
        width: 35px;
        height: 35px;
    }
    
    .chatbot-messages::-webkit-scrollbar {
        width: 4px;
    }
    
    .chatbot-messages {
        padding: 12px;
    }
    
    .user-message .message-content,
    .bot-message .message-content {
        max-width: 85%;
        font-size: 14px;
    }
}

/* Additional responsive improvements */
@media (max-width: 480px) {
    .chatbot-messages {
        padding: 8px;
    }
    
    .user-message .message-content,
    .bot-message .message-content {
        max-width: 90%;
        padding: 10px 14px;
        font-size: 13px;
    }
    
    .bot-message .message-avatar {
        width: 28px;
        height: 28px;
    }
}
`;

// Initialize the chatbot when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Add complete CSS
    const style = document.createElement('style');
    style.textContent = completeChatbotCSS;
    document.head.appendChild(style);
    
    // Initialize chatbot
    window.pediasphereChatbot = new PediasphereChatbot();
    
    console.log('Pediasphere Chatbot initialized successfully!');
});

// Global utility functions for manual control
window.scrollChatToTop = function() {
    if (window.pediasphereChatbot) {
        window.pediasphereChatbot.scrollToTop(true);
    }
};


window.clearChatHistory = function() {
    if (window.pediasphereChatbot) {
        window.pediasphereChatbot.clearChatHistory();
        console.log('Chat history cleared!');
    }
};

window.exportChatHistory = function() {
    if (window.pediasphereChatbot) {
        window.pediasphereChatbot.exportChatHistory();
        console.log('Chat history exported!');
    }
};

window.searchChat = function(query) {
    if (window.pediasphereChatbot) {
        const results = window.pediasphereChatbot.searchChatHistory(query);
        console.log('Search results:', results);
        return results;
    }
};
