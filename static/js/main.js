// 全局变量
let currentUser = null;
let currentPage = 1;
let isLoading = false;
const perPage = 10;

// DOM元素
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const loginModal = document.getElementById('loginModal');
const registerModal = document.getElementById('registerModal');
const publishModal = document.getElementById('publishModal');
const fabBtn = document.getElementById('fabBtn');
const articlesGrid = document.getElementById('articlesGrid');
const loadMoreBtn = document.getElementById('loadMoreBtn');

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    let currentUser = null;
    let currentPage = 1;
    const perPage = 10;

    // 检查用户登录状态
    function checkLoginStatus() {
        fetch('/api/user/status')
            .then(response => response.json())
            .then(data => {
                if (data.code === 0 && data.data) {
                    currentUser = data.data;
                    updateUIForLoggedInUser();
                }
            });
    }

    // 更新已登录用户的UI
    function updateUIForLoggedInUser() {
        document.querySelector('.auth-buttons').style.display = 'none';
        const userMenu = document.createElement('div');
        userMenu.className = 'user-menu';
        userMenu.innerHTML = `
            <span class="username">${currentUser.username}</span>
            <div class="dropdown-content">
                <a href="/profile">个人中心</a>
                <a href="/favorites">我的收藏</a>
                ${currentUser.role === '文判' || currentUser.role === '笔官' ? '<a href="/admin">管理后台</a>' : ''}
                <a href="#" id="logoutBtn">退出登录</a>
            </div>
        `;
        document.querySelector('.nav-menu').appendChild(userMenu);
        document.getElementById('fabBtn').style.display = 'flex';
    }

    // 加载文章列表
    function loadArticles(page = 1) {
        fetch(`/api/articles?page=${page}&per_page=${perPage}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('API Response:', data); // 调试日志
                if (data.code === 0) {
                    const articlesGrid = document.getElementById('articlesGrid');
                    if (page === 1) {
                        articlesGrid.innerHTML = '';
                    }
                    
                    data.data.items.forEach(article => {
                        const articleCard = createArticleCard(article);
                        articlesGrid.appendChild(articleCard);
                    });

                    // 更新加载更多按钮状态
                    const loadMoreBtn = document.getElementById('loadMoreBtn');
                    if (data.data.items.length < perPage) {
                        loadMoreBtn.style.display = 'none';
                    } else {
                        loadMoreBtn.style.display = 'block';
                    }
                } else {
                    console.error('API Error:', data.message); // 调试日志
                }
            })
            .catch(error => {
                console.error('Fetch Error:', error); // 调试日志
            });
    }

    // 创建文章卡片
    function createArticleCard(article) {
        const card = document.createElement('div');
        card.className = 'article-card';
        card.innerHTML = `
            <div class="article-header">
                <h3 class="article-title">
                    <a href="/article/${article.article_id}" class="article-title-link">${article.title}</a>
                </h3>
                <span class="article-category">${article.category && article.category.name ? article.category.name : ''}</span>
            </div>
            <div class="article-meta">
                <span class="article-author">作者：${article.author && article.author.username ? article.author.username : '匿名'}</span>
                <span class="article-date">${article.created_at ? new Date(article.created_at).toLocaleDateString() : ''}</span>
            </div>
            <div class="article-stats">
                <span class="stat-item">
                    <i class="icon">❤</i>
                    <span>${article.likes_count !== undefined ? article.likes_count : 0}</span>
                </span>
                <span class="stat-item">
                    <i class="icon">💬</i>
                    <span>${Array.isArray(article.comments) ? article.comments.length : (article.comments_count || 0)}</span>
                </span>
                <span class="stat-item">
                    <i class="icon">★</i>
                    <span>${article.favorites_count !== undefined ? article.favorites_count : 0}</span>
                </span>
            </div>
        `;
        return card;
    }

    // 加载每日一句
    function loadDailyQuote() {
        fetch('/api/daily-quote')
            .then(response => response.json())
            .then(data => {
                const quoteText = document.getElementById('quoteText');
                const quoteAuthor = document.getElementById('quoteAuthor');
                if (quoteText && quoteAuthor) {
                    quoteText.textContent = data.quote || '暂无每日一句';
                    quoteAuthor.textContent = data.author || '';
                }
            })
            .catch(error => {
                console.error('Error loading daily quote:', error);
            });
    }

    // 登录表单提交
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    username: username.trim(),
                    password: password
                })
            });

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('服务器返回了非JSON格式的响应');
            }

            const data = await response.json();
            
            if (data.success) {
                document.getElementById('loginModal').style.display = 'none';
                document.getElementById('loginForm').reset();
                currentUser = data.user;
                updateUIForLoggedInUser();
                loadArticles();
                showNotification('登录成功！', 'success');
            } else {
                showNotification(data.message || '登录失败', 'error');
            }
        } catch (error) {
            console.error('登录错误:', error);
            showNotification(error.message || '登录失败，请稍后重试', 'error');
        }
    });

    // 注册表单提交
    document.getElementById('registerForm').addEventListener('submit', (e) => {
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
            if (data.code === 0) {
                document.getElementById('registerModal').style.display = 'none';
                alert('注册成功，请登录');
                document.getElementById('loginModal').style.display = 'block';
            } else {
                alert(data.message);
            }
        });
    });

    // 发布文章表单提交
    document.getElementById('publishForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const title = document.getElementById('articleTitle').value;
        const category_id = document.getElementById('articleCategory').value;
        const content = document.getElementById('articleContent').value;

        if (!title || !category_id || !content) {
            alert('请填写完整信息');
            return;
        }

        fetch('/api/articles', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ title, category_id, content })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('网络响应不正常');
            }
            return response.json();
        })
        .then(data => {
            if (data.code === 0) {
                document.getElementById('publishModal').style.display = 'none';
                document.getElementById('publishForm').reset();
                showNotification('发布成功', 'success');
                loadArticles(1);
            } else {
                showNotification(data.message || '发布失败', 'error');
            }
        })
        .catch(error => {
            console.error('发布文章失败:', error);
            showNotification('发布失败，请稍后重试', 'error');
        });
    });

    // 加载更多按钮点击事件
    document.getElementById('loadMoreBtn').addEventListener('click', () => {
        currentPage++;
        loadArticles(currentPage);
    });

    // 模态框关闭按钮
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            closeBtn.closest('.modal').style.display = 'none';
        });
    });

    // 登录按钮点击事件
    document.getElementById('loginBtn').addEventListener('click', () => {
        document.getElementById('loginModal').style.display = 'block';
    });

    // 注册按钮点击事件
    document.getElementById('registerBtn').addEventListener('click', () => {
        document.getElementById('registerModal').style.display = 'block';
    });

    // 写文章按钮点击事件
    document.getElementById('fabBtn').addEventListener('click', () => {
        if (!currentUser) {
            alert('请先登录');
            return;
        }
        document.getElementById('publishModal').style.display = 'block';
    });

    // 获取CSRF Token
    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
    }

    // 退出登录
    document.addEventListener('click', (e) => {
        if (e.target.id === 'logoutBtn') {
            e.preventDefault();
            const csrfToken = getCookie('csrf_token');
            fetch('/api/logout', {
                method: 'POST',
                headers: {
                    'X-CSRFToken': csrfToken
                },
                credentials: 'include'
            })
            .then(response => response.json())
            .then(data => {
                if (data.success || data.code === 0) {
                    window.location.reload();
                }
            });
        }
    });

    // 用户菜单下拉点击展开/收起
    const userMenu = document.querySelector('.user-menu');
    const userMenuBtn = userMenu?.querySelector('.username');
    const dropdown = userMenu?.querySelector('.dropdown-content');

    if (userMenu && userMenuBtn && dropdown) {
        // 点击用户名切换 open 状态
        userMenuBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            userMenu.classList.toggle('open');
        });

        // 点击其他地方关闭
        document.addEventListener('click', function() {
            userMenu.classList.remove('open');
        });

        // 防止点击菜单内容时关闭
        dropdown.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }

    // 加载分类列表
    async function loadCategories() {
        try {
            const response = await fetch('/api/categories');
            const data = await response.json();
            
            if (data.code === 0) {
                const categorySelect = document.getElementById('articleCategory');
                data.data.items.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.id;
                    option.textContent = category.name;
                    categorySelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('加载分类失败:', error);
            showNotification('加载分类失败，请刷新页面重试', 'error');
        }
    }

    // 初始化
    checkLoginStatus();
    loadDailyQuote();
    loadArticles();
    loadCategories();
});

function logout() {
    localStorage.removeItem('token');
    currentUser = null;
    loginBtn.textContent = '登录';
    loginBtn.onclick = () => loginModal.style.display = 'block';
    registerBtn.style.display = 'inline-flex';
    fabBtn.style.display = 'none';
    location.reload();
}

function bindEvents() {
    // 模态框事件
    loginBtn.onclick = () => loginModal.style.display = 'block';
    registerBtn.onclick = () => registerModal.style.display = 'block';
    fabBtn.onclick = () => publishModal.style.display = 'block';
    
    // 关闭模态框
    document.getElementById('loginClose').onclick = () => loginModal.style.display = 'none';
    document.getElementById('registerClose').onclick = () => registerModal.style.display = 'none';
    document.getElementById('publishClose').onclick = () => publishModal.style.display = 'none';
    
    // 点击模态框外部关闭
    window.onclick = (event) => {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    };
    
    // 表单提交事件
    document.getElementById('loginForm').onsubmit = handleLogin;
    document.getElementById('registerForm').onsubmit = handleRegister;
    document.getElementById('publishForm').onsubmit = handlePublish;
    
    // 加载更多
    loadMoreBtn.onclick = loadMoreArticles;
    
    // 导航链接
    document.querySelectorAll('.nav-link').forEach(link => {
        link.onclick = (e) => {
            e.preventDefault();
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            const target = link.getAttribute('href');
            if (target === '#daily-quote') {
                document.getElementById('daily-quote').scrollIntoView({ behavior: 'smooth' });
            } else if (target === '#articles') {
                document.getElementById('articles').scrollIntoView({ behavior: 'smooth' });
            }
        };
    });
}

// 登录处理
async function handleLogin(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            document.getElementById('loginModal').style.display = 'none';
            checkLoginStatus();
            loadArticles();
            showNotification('登录成功！', 'success');
        } else {
            showNotification(result.message || '登录失败', 'error');
        }
    } catch (error) {
        showNotification('网络错误，请重试', 'error');
    }
}

// 注册处理
async function handleRegister(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            registerModal.style.display = 'none';
            showNotification('注册成功！请登录', 'success');
            loginModal.style.display = 'block';
        } else {
            showNotification(result.error || '注册失败', 'error');
        }
    } catch (error) {
        showNotification('网络错误，请重试', 'error');
    }
}

// 发布文章处理
async function handlePublish(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    try {
        const response = await fetch('/api/articles', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            publishModal.style.display = 'none';
            document.getElementById('publishForm').reset();
            showNotification('文章发布成功，等待审核', 'success');
        } else {
            showNotification(result.error || '发布失败', 'error');
        }
    } catch (error) {
        showNotification('网络错误，请重试', 'error');
    }
}

// 加载更多文章
function loadMoreArticles() {
    currentPage++;
    loadArticles(currentPage);
}

// 显示通知
function showNotification(message, type = 'info') {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // 添加样式
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 10px;
        color: white;
        font-weight: 500;
        z-index: 3000;
        animation: slideIn 0.3s ease-out;
        max-width: 300px;
        word-wrap: break-word;
    `;
    
    // 根据类型设置背景色
    switch (type) {
        case 'success':
            notification.style.background = 'linear-gradient(135deg, #52c41a, #73d13d)';
            break;
        case 'error':
            notification.style.background = 'linear-gradient(135deg, #ff4d4f, #ff7875)';
            break;
        case 'warning':
            notification.style.background = 'linear-gradient(135deg, #faad14, #ffc53d)';
            break;
        default:
            notification.style.background = 'linear-gradient(135deg, #1890ff, #40a9ff)';
    }
    
    document.body.appendChild(notification);
    
    // 3秒后自动消失
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// 格式化日期
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
        return '今天';
    } else if (days === 1) {
        return '昨天';
    } else if (days < 7) {
        return `${days}天前`;
    } else {
        return date.toLocaleDateString('zh-CN');
    }
}

// 添加动画样式
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateX(100%);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    @keyframes slideOut {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100%);
        }
    }
`;
document.head.appendChild(style); 