document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chat-form');
    const userInput = document.getElementById('user-input');
    const chatHistory = document.getElementById('chat-history');
    const typingIndicator = document.getElementById('typing-indicator');

    const API_ENDPOINT = 'http://localhost:5000/api/chat';

    // Handle form submission
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const messageText = userInput.value.trim();
        if (!messageText) return;

        // 1. Append User Message immediately
        appendMessage(messageText, 'user');
        userInput.value = '';
        
        // Auto-scroll to bottom
        scrollToBottom();

        // 3. Show loading/typing indicator
        showTypingIndicator();

        try {
            // 2. Make async POST request using fetch()
            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message: messageText })
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.statusText}`);
            }

            const data = await response.json();

            // 4. Hide typing indicator & parse/append AI response
            hideTypingIndicator();
            appendAiResponse(data);

        } catch (error) {
            console.error('Network Error:', error);
            hideTypingIndicator();
            // 6. Handle network errors gracefully
            appendMessage('⚠️ Oops! Unable to connect to the backend server. Please verify if your local API is running on localhost:5000.', 'ai', true);
        }

        scrollToBottom();
    });

    // Helper function to append regular text messages (User or simple Error/Text)
    function appendMessage(text, sender, isError = false) {
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

    // Helper function to parse advanced backend payloads (Text + Optional SQL + Optional Table Results)
    function appendAiResponse(data) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', 'ai-message');

        const avatarDiv = document.createElement('div');
        avatarDiv.classList.add('avatar', 'ai-avatar');
        avatarDiv.innerHTML = '<i class="fa-solid fa-robot"></i>';

        const contentDiv = document.createElement('div');
        contentDiv.classList.add('message-content');

        // Response Text
        const textP = document.createElement('p');
        textP.textContent = data.response_text || "Here are the results from your request:";
        contentDiv.appendChild(textP);

        // Optional SQL Query Rendering
        if (data.sql_query) {
            const sqlBox = document.createElement('div');
            sqlBox.classList.add('sql-box');
            sqlBox.innerHTML = `<strong>Generated SQL:</strong><br><code>${escapeHtml(data.sql_query)}</code>`;
            contentDiv.appendChild(sqlBox);
        }

        // Optional Database Results Table Rendering
        if (data.results && Array.isArray(data.results) && data.results.length > 0) {
            const tableWrapper = document.createElement('div');
            tableWrapper.classList.add('results-table-wrapper');
            
            const table = document.createElement('table');
            table.classList.add('results-table');

            // Table Header Construction
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

            // Table Body Construction
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
            tableWrapper.appendChild(table);
            contentDiv.appendChild(tableWrapper);
        }

        // Timestamp
        const timestampSpan = document.createElement('span');
        timestampSpan.classList.add('timestamp');
        timestampSpan.textContent = getCurrentTime();
        contentDiv.appendChild(timestampSpan);

        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);
        chatHistory.appendChild(messageDiv);
    }

    // Typing Indicator control functions
    function showTypingIndicator() {
        typingIndicator.classList.remove('typing-hidden');
        scrollToBottom();
    }

    function hideTypingIndicator() {
        typingIndicator.classList.add('typing-hidden');
    }

    // Auto-scroll handler
    function scrollToBottom() {
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    // Time generator helper
    function getCurrentTime() {
        const now = new Date();
        return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // Basic HTML escaping utility for safe query displays
    function escapeHtml(text) {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
});
          
