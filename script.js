document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chat-form');
    const userInput = document.getElementById('user-input');
    const chatHistory = document.getElementById('chat-history');
    const typingIndicator = document.getElementById('typing-indicator');

    // Aapka naya aur final Replit API endpoint
    const API_ENDPOINT = 'https://6122bce7-18de-4f2e-ab34-92f2081b32e6-00-c54akmfi8y9p.sisko.replit.dev/api/chat';

    // Handle form submission
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const messageText = userInput.value.trim();
        if (!messageText) return;

        // 1. User Message UI par turant dikhayein
        appendMessage(messageText, 'user');
        userInput.value = '';
        scrollToBottom();

        // 2. Typing indicator show karein
        showTypingIndicator();

        // 3. AI function ko call karein
        await sendMessageToAI(messageText);
    });

    // Async function to talk with Flask Backend
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
                throw new Error(`Server error: ${response.statusText}`);
            }

            const data = await response.json();
            
            // Typing indicator chupayein
            hideTypingIndicator();

            // Check what kind of data came back
            if (data.results && Array.isArray(data.results) && data.results.length > 0) {
                // If it has database table results, use structured renderer
                appendAiResponse(data);
            } else if (data.response_text) {
                // If it's a regular text response
                appendMessage(data.response_text, 'ai');
            } else if (data.reply) {
                appendMessage(data.reply, 'ai');
            }

        } catch (error) {
            console.error("Error:", error);
            hideTypingIndicator();
            // Network error handle karein
            appendMessage('⚠️ Oops! Backend server se connect nahi ho pa raha hai. Kripya connection check karein.', 'ai', true);
        }

        scrollToBottom();
    }

    // Helper function to append regular text messages (User/AI)
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

    // Helper function for Text-to-SQL results / structured responses
    function appendAiResponse(data) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', 'ai-message');

        const avatarDiv = document.createElement('div');
        avatarDiv.classList.add('avatar', 'ai-avatar');
        avatarDiv.innerHTML = '<i class="fa-solid fa-robot"></i>';

        const contentDiv = document.createElement('div');
        contentDiv.classList.add('message-content');

        const textP = document.createElement('p');
        textP.textContent = data.response_text || "Yeh lijiye aapke query ke results:";
        contentDiv.appendChild(textP);

        // Optional SQL Query Rendering
        if (data.sql_query) {
            const sqlBox = document.createElement('div');
            sqlBox.classList.add('sql-box');
            sqlBox.innerHTML = `<strong>Generated SQL:</strong><br><code>${escapeHtml(data.sql_query)}</code>`;
            contentDiv.appendChild(sqlBox);
        }

        // Optional Database Results Table
        if (data.results && Array.isArray(data.results) && data.results.length > 0) {
            const tableWrapper = document.createElement('div');
            tableWrapper.classList.add('results-table-wrapper');
            
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
            tableWrapper.appendChild(table);
            contentDiv.appendChild(tableWrapper);
        }

        const timestampSpan = document.createElement('span');
        timestampSpan.classList.add('timestamp');
        timestampSpan.textContent = getCurrentTime();
        contentDiv.appendChild(timestampSpan);

        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);
        chatHistory.appendChild(messageDiv);
    }

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
