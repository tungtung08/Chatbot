document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chat-form');
    const userInput = document.getElementById('user-input');
    const chatHistory = document.getElementById('chat-history');
    const typingIndicator = document.getElementById('typing-indicator');
    const newChatBtn = document.getElementById('new-chat-btn');
    const clearChatBtn = document.getElementById('clear-chat-btn');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');
    const historyList = document.getElementById('history-list');

    // Aapka exact Backend API Endpoint (Chat Buddy)
    const API_ENDPOINT = 'https://6122bce7-18de-4f2e-ab34-92f2081b32e6-00-c54akmfi8y9p.sisko.replit.dev/api/chat';

    // Application State for History Storage
    let currentSessionId = Date.now().toString();
    let chatSessions = JSON.parse(localStorage.getItem('chat_buddy_sessions')) || {};

    // Initialize UI history items
    renderHistoryList();

    // Toggle Sidebar for mobile view
    sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });

    // Start New Chat session
    newChatBtn.addEventListener('click', () => {
        currentSessionId = Date.now().toString();
        chatHistory.innerHTML = `
            <div class="message ai-message animate-fade-in">
                <div class="avatar ai-avatar"><i class="fa-solid fa-robot"></i></div>
                <div class="message-content">
                    <p>New chat session started with <strong>Chat Buddy</strong>! How can I help you today?</p>
                    <span class="timestamp">${getCurrentTime()}</span>
                </div>
            </div>
        `;
        if(window.innerWidth <= 768) sidebar.classList.remove('open');
    });

    // Clear current chat session
    clearChatBtn.addEventListener('click', () => {
        if (confirm("Are you sure you want to clear this conversation?")) {
            delete chatSessions[currentSessionId];
            localStorage.setItem('chat_buddy_sessions', JSON.stringify(chatSessions));
            chatHistory.innerHTML = `
                <div class="message ai-message animate-fade-in">
                    <div class="avatar ai-avatar"><i class="fa-solid fa-robot"></i></div>
                    <div class="message-content">
                        <p>Conversation cleared. What would you like to chat about next?</p>
                        <span class="timestamp">${getCurrentTime()}</span>
                    </div>
                </div>
            `;
            renderHistoryList();
        }
    });

    // Handle Form Submit Event
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const messageText = userInput.value.trim();
        if (!messageText) return;

        // 1. Append User Message to UI & Save State
        appendMessageToUI(messageText, 'user');
        userInput.value = '';
        scrollToBottom();

        // Save session label if it's the first message
        saveSessionState(messageText, 'user');

        // 2. Show Animated Typing Indicator
        showTypingIndicator();

        // 3. Connect to your Backend API via Async Fetch
        await sendMessageToAI(messageText);
    });

    // Core Backend API Request Function
    async function sendMessageToAI(userMessage) {
        try {
            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message: userMessage })
            });

            if (!response.ok) {
                throw new Error(`Server returned status: ${response.statusText}`);
            }

            const data = await response.json();
            
            // Hide indicator
            hideTypingIndicator();

            // 4. Handle Response format dynamically
            if (data.reply && typeof data.reply === 'string' && !data.sql_query && !data.results) {
                appendMessageToUI(data.reply, 'ai');
                saveSessionState(data.reply, 'ai');
            } else {
                appendStructuredAiResponse(data);
                saveSessionState(data.response_text || data.reply || "Results", 'ai');
            }

        } catch (error) {
            console.error("API Error:", error);
            hideTypingIndicator();
            appendMessageToUI('⚠️ Connection error: Unable to reach the backend server. Please verify your Replit instance status.', 'ai', true);
        }

        scrollToBottom();
    }

    // Append Standard Messages (User / Simple AI)
    function appendMessageToUI(text, sender, isError = false) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', sender === 'user' ? 'user-message' : 'ai-message');

        const avatarDiv = document.createElement('div');
        avatarDiv.classList.add('avatar', sender === 'user' ? 'user-avatar' : 'ai-avatar');
        avatarDiv.innerHTML = sender === 'user' ? '<i class="fa-solid fa-user"></i>' : '<i class="fa-solid fa-robot"></i>';

        const contentDiv = document.createElement('div');
        contentDiv.classList.add('message-content');
        if (isError) {
            contentDiv.style.borderColor = '#ef4444';
        }

        const textP = document.createElement('p');
        textP.textContent = text;
        contentDiv.appendChild(textP);

        const timestampSpan = document.createElement('span');
        timestampSpan.classList.add('timestamp');
        timestampSpan.textContent = getCurrentTime();
        contentDiv.appendChild(timestampSpan);

        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);
        chatHistory.appendChild(messageDiv);
    }

    // Append Advanced Structured Responses (SQL Query & Result Tables)
    function appendStructuredAiResponse(data) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', 'ai-message');

        const avatarDiv = document.createElement('div');
        avatarDiv.classList.add('avatar', 'ai-avatar');
        avatarDiv.innerHTML = '<i class="fa-solid fa-robot"></i>';

        const contentDiv = document.createElement('div');
        contentDiv.classList.add('message-content');

        const mainText = data.response_text || data.reply || "Here are the results from Chat Buddy:";
        const textP = document.createElement('p');
        textP.textContent = mainText;
        contentDiv.appendChild(textP);

        // Render SQL Query Block if returned
        if (data.sql_query) {
            const sqlBox = document.createElement('div');
            sqlBox.classList.add('sql-query-box');
            sqlBox.innerHTML = `<strong>Generated SQL Query:</strong><br><code>${escapeHtml(data.sql_query)}</code>`;
            contentDiv.appendChild(sqlBox);
        }

        // Render Database Results Data Table if returned
        if (data.results && Array.isArray(data.results) && data.results.length > 0) {
            const tableContainer = document.createElement('div');
            tableContainer.classList.add('results-table-container');
            
            const table = document.createElement('table');
            table.classList.add('results-table');

            const headers = Object.keys(data.results[0]);
            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');
            
            headers.forEach(header => {
                const th = document.createElement('th');
                th.textContent = header;
                headerRow.appendChild(th);
            });
            thead.appendChild(headerRow);
            table.appendChild(thead);

            const tbody = document.createElement('tbody');
            data.results.forEach(row => {
                const tr = document.createElement('tr');
                headers.forEach(header => {
                    const td = document.createElement('td');
                    td.textContent = row[header] !== null ? row[header] : 'NULL';
                    tr.appendChild(td);
                });
                tbody.appendChild(tr);
            });
            table.appendChild(tbody);
            tableContainer.appendChild(table);
            contentDiv.appendChild(tableContainer);
        }

        const timestampSpan = document.createElement('span');
        timestampSpan.classList.add('timestamp');
        timestampSpan.textContent = getCurrentTime();
        contentDiv.appendChild(timestampSpan);

        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);
        chatHistory.appendChild(messageDiv);
    }

    // Local Storage Session Management
    function saveSessionState(messageText, sender) {
        if (!chatSessions[currentSessionId]) {
            chatSessions[currentSessionId] = {
                title: sender === 'user' ? messageText : 'New Conversation',
                messages: []
            };
        }
        chatSessions[currentSessionId].messages.push({ text: messageText, sender });
        localStorage.setItem('chat_buddy_sessions', JSON.stringify(chatSessions));
        renderHistoryList();
    }

    // Render Sidebar History list
    function renderHistoryList() {
        historyList.innerHTML = '';
        const sessionIds = Object.keys(chatSessions).reverse();
        
        sessionIds.forEach(id => {
            const session = chatSessions[id];
            const item = document.createElement('div');
            item.classList.add('history-item');
            if (id === currentSessionId) item.classList.add('active');
            item.textContent = session.title;
            
            item.addEventListener('click', () => {
                currentSessionId = id;
                loadSessionChat(id);
                if(window.innerWidth <= 768) sidebar.classList.remove('open');
            });

            historyList.appendChild(item);
        });
    }

    // Load past session into view
    function loadSessionChat(id) {
        const session = chatSessions[id];
        if (!session) return;
        
        chatHistory.innerHTML = '';
        session.messages.forEach(msg => {
            appendMessageToUI(msg.text, msg.sender);
        });
        scrollToBottom();
        renderHistoryList();
    }

    // Utility Helpers
    function showTypingIndicator() {
        typingIndicator.classList.remove('typing-hidden');
        scrollToBottom();
    }

    function hideTypingIndicator() {
        typingIndicator.classList.add('typing-hidden');
    }

    function scrollToBottom() {
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    function getCurrentTime() {
        const now = new Date();
        return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    function escapeHtml(text) {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
});
                            
