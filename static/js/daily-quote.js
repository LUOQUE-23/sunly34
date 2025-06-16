document.addEventListener('DOMContentLoaded', function() {
    checkLoginStatus();
    loadDailyQuote();
    loadDailyQuoteHistory();
    setupLoginModal();
    setupRegisterModal();
    setupShareModal();
    setupLogout();
});

async function checkLoginStatus() {
    try {
        const response = await fetch('/api/user/status');
        const data = await response.json();
        console.log('用户状态API响应:', data); // 调试日志
        console.log('响应状态码:', response.status); // 调试日志
        
        const authBtns = document.querySelector('.auth-buttons');
        const userMenu = document.querySelector('.user-menu');
        
        if (data.code === 0 && data.data) {
            // 已登录
            if (authBtns) authBtns.classList.add('hidden');
            if (userMenu) {
                userMenu.classList.remove('hidden');
                const usernameElement = userMenu.querySelector('.username');
                console.log('用户名元素:', usernameElement); // 调试日志
                console.log('设置用户名为:', data.data.username); // 调试日志
                if (usernameElement) {
                    usernameElement.textContent = data.data.username;
                }
                
                // 管理后台权限
                const adminLink = userMenu.querySelector('.admin-link');
                console.log('管理员链接元素:', adminLink); // 调试日志
                console.log('用户角色:', data.data.role); // 调试日志
                
                if (adminLink) {
                    if (data.data.role === '文判') {
                        adminLink.classList.remove('hidden');
                        console.log('显示管理后台链接'); // 调试日志
                    } else {
                        adminLink.classList.add('hidden');
                        console.log('隐藏管理后台链接'); // 调试日志
                    }
                }
            }
        } else {
            // 未登录
            console.log('用户未登录'); // 调试日志
            if (authBtns) authBtns.classList.remove('hidden');
            if (userMenu) userMenu.classList.add('hidden');
        }
    } catch (error) {
        console.error('检查登录状态失败:', error); // 调试日志
        // 网络异常时也视为未登录
        const authBtns = document.querySelector('.auth-buttons');
        const userMenu = document.querySelector('.user-menu');
        if (authBtns) authBtns.classList.remove('hidden');
        if (userMenu) userMenu.classList.add('hidden');
    }
}

function loadDailyQuote() {
    fetch('/api/daily-quote')
        .then(response => response.json())
        .then(data => {
            document.getElementById('quoteText').textContent = data.quote;
            document.getElementById('quoteAuthor').textContent = data.author;
        })
        .catch(error => {
            console.error('Error loading daily quote:', error);
            document.getElementById('quoteText').textContent = '加载失败，请稍后再试。';
        });
}

function loadDailyQuoteHistory() {
    fetch('/api/daily-quote/history')
        .then(response => response.json())
        .then(data => {
            const list = data.history || [];
            const historyList = document.getElementById('historyList');
            historyList.innerHTML = '';
            if (list.length === 0) {
                historyList.innerHTML = '<div style="color:#888;text-align:center;">暂无历史每日一句</div>';
                return;
            }
            list.forEach(item => {
                const div = document.createElement('div');
                div.className = 'history-item';
                div.innerHTML = `<div class="history-quote">${item.quote}</div><div class="history-author">${item.author}</div>`;
                historyList.appendChild(div);
            });
        })
        .catch(error => {
            console.error('Error loading daily quote history:', error);
        });
}

function setupLoginModal() {
    const loginBtn = document.getElementById('loginBtn');
    const loginModal = document.getElementById('loginModal');
    const loginClose = document.getElementById('loginClose');
    const loginForm = document.getElementById('loginForm');

    loginBtn.addEventListener('click', () => {
        loginModal.style.display = 'block';
    });

    loginClose.addEventListener('click', () => {
        loginModal.style.display = 'none';
    });

    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;
        fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                loginModal.style.display = 'none';  // 关闭登录模态框
                checkLoginStatus();  // 重新检查登录状态
                alert('登录成功！');
            } else {
                alert(data.message);  // 显示错误信息
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('登录失败，请重试');
        });
    });
}

function setupRegisterModal() {
    const registerBtn = document.getElementById('registerBtn');
    const registerModal = document.getElementById('registerModal');
    const registerClose = document.getElementById('registerClose');
    const registerForm = document.getElementById('registerForm');

    registerBtn.addEventListener('click', () => {
        registerModal.style.display = 'block';
    });

    registerClose.addEventListener('click', () => {
        registerModal.style.display = 'none';
    });

    registerForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const username = document.getElementById('registerUsername').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                registerModal.style.display = 'none';  // 关闭注册模态框
                checkLoginStatus();  // 重新检查登录状态
                alert('注册成功！');
            } else {
                alert(data.message);  // 显示错误信息
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('注册失败，请重试');
        });
    });
}

function setupShareModal() {
    const shareBtn = document.getElementById('shareBtn');
    const shareModal = document.getElementById('shareModal');
    const shareClose = document.getElementById('shareClose');

    shareBtn.addEventListener('click', () => {
        shareModal.style.display = 'block';
    });

    shareClose.addEventListener('click', () => {
        shareModal.style.display = 'none';
    });

    // 分享选项的点击事件
    const shareOptions = document.querySelectorAll('.share-option');
    shareOptions.forEach(option => {
        option.addEventListener('click', function() {
            const platform = this.classList[1];
            const quoteText = document.getElementById('quoteText').textContent;
            const quoteAuthor = document.getElementById('quoteAuthor').textContent;
            const shareText = `${quoteText} - ${quoteAuthor}`;
            const shareUrl = window.location.href;

            switch (platform) {
                case 'wechat':
                    alert('请使用微信扫描二维码分享');
                    break;
                case 'weibo':
                    window.open(`https://service.weibo.com/share/share.php?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareText)}`);
                    break;
                case 'qq':
                    window.open(`https://connect.qq.com/widget/shareqq/index.html?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareText)}`);
                    break;
                case 'link':
                    navigator.clipboard.writeText(shareUrl).then(() => {
                        alert('链接已复制到剪贴板');
                    }).catch(err => {
                        console.error('复制失败:', err);
                    });
                    break;
            }
        });
    });
}

function setupLogout() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            fetch('/api/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    checkLoginStatus();  // 重新检查登录状态
                    alert('已退出登录');
                } else {
                    alert('退出登录失败');
                }
            })
            .catch(error => {
                console.error('退出登录失败:', error);
                alert('退出登录失败');
            });
        });
    }
} 