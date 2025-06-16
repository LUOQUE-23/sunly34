// 全局变量
let currentUser = null;
let currentTab = 'pending-articles';
let currentArticle = null;

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeAdminApp();
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
});

async function initializeAdminApp() {
    // 检查用户权限
    await checkUserPermissions();
    
    // 绑定事件
    bindAdminEvents();
    
    // 加载默认标签页
    loadTabContent('pending-articles');
}

async function checkUserPermissions() {
    try {
        const response = await fetch('/api/user/profile');
        if (!response.ok) {
            throw new Error('Unauthorized');
        }
        const user = await response.json();
        currentUser = user.data;
        if (!currentUser || (currentUser.role !== '笔官' && currentUser.role !== '文判')) {
            showNotification('您没有访问管理后台的权限', 'error');
            setTimeout(() => {
                window.location.href = '/';
            }, 2000);
            return;
        }
        document.getElementById('userRole').textContent = currentUser.role;
        if (currentUser.role === '文判') {
            document.body.classList.add('super-admin');
        }
    } catch (error) {
        window.location.href = '/';
    }
}

function bindAdminEvents() {
    // 标签页切换
    document.querySelectorAll('[data-tab]').forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            const tabName = tab.getAttribute('data-tab');
            switchTab(tabName);
        });
    });
    
    // 刷新按钮
    document.getElementById('refreshBtn').addEventListener('click', () => {
        loadTabContent(currentTab);
    });
    
    // 退出登录
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // 模态框关闭
    document.getElementById('reviewClose').addEventListener('click', () => {
        document.getElementById('reviewModal').style.display = 'none';
    });
    
    document.getElementById('addQuoteClose').addEventListener('click', () => {
        document.getElementById('addQuoteModal').style.display = 'none';
    });
    
    // 添加每日一句
    document.getElementById('addQuoteBtn').addEventListener('click', () => {
        document.getElementById('addQuoteModal').style.display = 'block';
    });
    
    // 每日一句表单提交
    document.getElementById('addQuoteForm').addEventListener('submit', handleAddQuote);

    // 批量封禁相关事件
    document.getElementById('batchBanBtn').addEventListener('click', showBatchBanModal);
    document.getElementById('batchBanClose').addEventListener('click', hideBatchBanModal);
    document.getElementById('cancelBatchBan').addEventListener('click', hideBatchBanModal);
    document.getElementById('confirmBatchBan').addEventListener('click', executeBatchBan);

    // 用户搜索功能
    const searchBtn = document.getElementById('searchBtn');
    const userSearch = document.getElementById('userSearch');
    if (searchBtn && userSearch) {
        searchBtn.addEventListener('click', () => {
            const keyword = userSearch.value.trim();
            loadUsers(keyword);
        });
        userSearch.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                searchBtn.click();
            }
        });
    }
}

function switchTab(tabName) {
    // 更新活跃标签
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // 更新标签页内容
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}-content`).classList.add('active');
    
    // 更新页面标题
    const titles = {
        'pending-articles': '待审核文章',
        'reports': '举报管理',
        'users': '用户管理',
        'logs': '操作日志',
        'daily-quote': '每日一句',
        'category-stats': '分类统计'
    };
    document.getElementById('pageTitle').textContent = titles[tabName];
    
    currentTab = tabName;
    loadTabContent(tabName);
}

async function loadTabContent(tabName) {
    try {
        switch (tabName) {
            case 'pending-articles':
                await loadPendingArticles();
                break;
            case 'reports':
                await loadReports();
                break;
            case 'users':
                await loadUsers();
                break;
            case 'logs':
                await loadLogs();
                break;
            case 'daily-quote':
                await loadDailyQuoteManagement();
                break;
            case 'category-stats':
                await loadCategoryStats();
                break;
        }
    } catch (error) {
        showNotification('加载数据失败', 'error');
    }
}

// 加载待审核文章
async function loadPendingArticles() {
    const response = await fetch('/api/admin/pending-articles', {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    });
    
    if (!response.ok) {
        throw new Error('Failed to load articles');
    }
    
    const articles = await response.json();
    renderPendingArticles(articles);
}

function renderPendingArticles(articles) {
    const container = document.getElementById('pendingArticlesList');
    
    if (articles.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📝</div>
                <div class="empty-state-message">暂无待审核文章</div>
                <div class="empty-state-description">所有文章都已审核完成</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = articles.map(article => `
        <div class="admin-article-card">
            <div class="admin-article-meta">
                <span class="article-category">${article.category}</span>
                <span class="status-badge status-${article.status}">${getStatusText(article.status)}</span>
                <span class="article-date">${formatDate(article.created_at)}</span>
            </div>
            <h3 class="admin-article-title">${article.title}</h3>
            <p class="admin-article-content">${article.content}</p>
            <div class="admin-article-actions">
                <div class="admin-article-info">
                    <span>作者: ${article.author}</span>
                </div>
                <div class="admin-action-buttons">
                    <button class="btn btn-outline" onclick="openReviewModal(${article.id})">
                        👁️ 审核
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// 打开审核模态框
async function openReviewModal(articleId) {
    try {
        const response = await fetch(`/api/admin/articles/${articleId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load article');
        }
        
        const article = await response.json();
        currentArticle = article;
        
        // 渲染文章预览
        document.getElementById('articlePreview').innerHTML = `
            <div class="preview-title">${article.title}</div>
            <div class="preview-meta">
                <span>作者: ${article.author}</span>
                <span>分类: ${article.category}</span>
                <span>时间: ${formatDate(article.created_at)}</span>
            </div>
            <div class="preview-content">${article.content}</div>
        `;
        
        // 设置分类选择
        document.getElementById('reviewCategory').value = article.category;
        
        // 显示模态框
        document.getElementById('reviewModal').style.display = 'block';
        
    } catch (error) {
        showNotification('加载文章失败', 'error');
    }
}

// 审核文章
async function reviewArticle(status) {
    if (!currentArticle) return;
    
    const category = document.getElementById('reviewCategory').value;
    
    try {
        const response = await fetch(`/api/admin/articles/${currentArticle.id}/review`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                status: status,
                category: category
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            document.getElementById('reviewModal').style.display = 'none';
            showNotification('审核完成', 'success');
            loadPendingArticles();
        } else {
            showNotification(result.error || '审核失败', 'error');
        }
    } catch (error) {
        showNotification('网络错误，请重试', 'error');
    }
}

// 加载举报列表
async function loadReports() {
    const response = await fetch('/api/admin/reports', {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    });
    
    if (!response.ok) {
        throw new Error('Failed to load reports');
    }
    
    const reports = await response.json();
    renderReports(reports);
}

function formatReportReason(reason) {
    // 如果是 JSON 字符串，尝试解析
    try {
        const data = JSON.parse(reason);
        if (data.type && data.content) {
            return `${data.type}: ${data.content}`;
        }
    } catch (e) {
        // 如果不是 JSON，直接返回原文本
    }
    return reason;
}

function renderReports(reports) {
    const reportsList = document.getElementById('reportsList');
    if (!reportsList) return;
    
    if (!reports || reports.length === 0) {
        reportsList.innerHTML = '<div class="empty-state">暂无举报记录</div>';
        return;
    }
    
    reportsList.innerHTML = reports.map(report => `
        <div class="admin-article-card">
            <div class="admin-article-meta">
                <span>举报人：${report.reporter}</span>
                <span>被举报人：${report.reported_user}</span>
                <span>时间：${formatDate(report.created_at)}</span>
                <span class="status-badge status-${report.status}">${getStatusText(report.status)}</span>
        </div>
            <div class="admin-article-content">
                <p>举报原因：${formatReportReason(report.reason)}</p>
            </div>
            <div class="admin-article-actions">
                ${report.status === 'pending' ? `
                    <button class="btn btn-primary" onclick="handleReport(${report.id}, 'accept')">接受举报</button>
                    <button class="btn btn-outline" onclick="handleReport(${report.id}, 'reject')">拒绝举报</button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// 处理举报
async function handleReport(reportId, action) {
    try {
        const response = await fetch(`/api/admin/reports/${reportId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ action: action })
        });
        
        if (response.ok) {
            showNotification('举报处理成功', 'success');
            await loadReports(); // 重新加载举报列表
        } else {
            const data = await response.json();
            showNotification(data.message || '处理失败', 'error');
        }
    } catch (error) {
        showNotification('网络错误，请重试', 'error');
    }
}

// 加载用户列表（仅超级管理员）
async function loadUsers(keyword = '') {
    if (currentUser.role !== '文判') {
        return;
    }
    let url = '/api/admin/users';
    if (keyword) {
        url += `?search=${encodeURIComponent(keyword)}`;
    }
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error('Failed to load users');
    }
    const users = await response.json();
    renderUsers(users);
}

function renderUsers(users) {
    const container = document.getElementById('usersList');
    
    container.innerHTML = `
        <div class="data-table">
            <table>
                <thead>
                    <tr>
                        <th>
                            <input type="checkbox" id="selectAllUsers" class="user-checkbox">
                        </th>
                        <th>用户名</th>
                        <th>邮箱</th>
                        <th>角色</th>
                        <th>总点赞数</th>
                        <th>状态</th>
                        <th>注册时间</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
                    ${users.map(user => `
                        <tr>
                            <td>
                                <input type="checkbox" class="user-checkbox user-select-checkbox" 
                                       data-user-id="${user.id}" 
                                       data-username="${user.username}" 
                                       data-email="${user.email}" 
                                       data-role="${user.role}">
                            </td>
                            <td>${user.username}</td>
                            <td>${user.email}</td>
                            <td><span class="role-badge role-${user.role}">${user.role}</span></td>
                            <td>${user.total_likes}</td>
                            <td><span class="status-badge status-${user.status}">${getStatusText(user.status)}</span></td>
                            <td>${formatDate(user.created_at)}</td>
                            <td>
                                <button class="btn btn-outline btn-sm" onclick="toggleUserStatus(${user.id}, '${user.status}', '${user.username}', '${user.email}')">
                                    ${user.status === 'active' ? '封禁' : '解封'}
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    // 绑定全选复选框事件
    const selectAllCheckbox = document.getElementById('selectAllUsers');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', handleSelectAllUsers);
    }
    
    // 绑定单个复选框事件
    const userCheckboxes = document.querySelectorAll('.user-select-checkbox');
    userCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', updateBatchBanButton);
    });
}

// 切换用户状态（物理删除/恢复）
async function toggleUserStatus(userId, currentStatus, username, email) {
    if (currentStatus === 'active') {
        // 封禁：物理删除
        if (!confirm('确定要封禁并删除该用户吗？此操作不可恢复！')) return;
        try {
            const response = await fetch(`/api/admin/users/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action: 'ban' })
            });
            const result = await response.json();
            if (response.ok && result.success) {
                showNotification('用户已封禁并删除', 'success');
                loadUsers();
            } else {
                showNotification(result.message || '封禁失败', 'error');
            }
        } catch (error) {
            showNotification('网络错误，请重试', 'error');
        }
    } else {
        // 解封：弹窗输入信息
        const newUsername = prompt('请输入要恢复的用户名', username || '');
        if (!newUsername) return;
        const newEmail = prompt('请输入要恢复的邮箱', email || '');
        if (!newEmail) return;
        const newPassword = prompt('请输入新密码（可选，默认123456）', '123456');
        try {
            const response = await fetch(`/api/admin/users/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action: 'unban', username: newUsername, email: newEmail, password: newPassword })
            });
            const result = await response.json();
            if (response.ok && result.success) {
                showNotification('用户已恢复', 'success');
                loadUsers();
            } else {
                showNotification(result.message || '恢复失败', 'error');
            }
        } catch (error) {
            showNotification('网络错误，请重试', 'error');
        }
    }
}

// 加载操作日志（仅超级管理员）
async function loadLogs() {
    if (currentUser.role !== '文判') {
        return;
    }
    
    const response = await fetch('/api/admin/logs', {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    });
    
    if (!response.ok) {
        throw new Error('Failed to load logs');
    }
    
    const logs = await response.json();
    renderLogs(logs);
}

function renderLogs(logs) {
    const container = document.getElementById('logsList');
    
    container.innerHTML = `
        <div class="data-table">
            <table>
                <thead>
                    <tr>
                        <th>用户</th>
                        <th>操作</th>
                        <th>详情</th>
                        <th>时间</th>
                    </tr>
                </thead>
                <tbody>
                    ${logs.logs.map(log => `
                        <tr>
                            <td>${log.user}</td>
                            <td>${log.action}</td>
                            <td>${log.details || '-'}</td>
                            <td>${formatDate(log.created_at)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// 加载每日一句管理
async function loadDailyQuoteManagement() {
    if (currentUser.role !== '文判') {
        return;
    }
    
    try {
        // 加载当前每日一句
        const currentResponse = await fetch('/api/daily-quote');
        if (currentResponse.ok) {
            const currentQuote = await currentResponse.json();
            renderCurrentQuote(currentQuote);
        }
        
        // 加载历史每日一句
        const historyResponse = await fetch('/api/admin/daily-quotes', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (historyResponse.ok) {
            const quotes = await historyResponse.json();
            renderQuotesHistory(quotes);
        }
    } catch (error) {
        showNotification('加载每日一句失败', 'error');
    }
}

function renderCurrentQuote(quote) {
    const container = document.getElementById('currentQuote');
    // 兼容 content 和 quote 字段
    const text = quote && (quote.content || quote.quote) ? `"${quote.content || quote.quote}"` : '暂无每日一句';
    const author = quote && quote.author ? `—— ${quote.author}` : '';
    const source = quote && quote.source ? ` 《${quote.source}》` : '';
    container.innerHTML = `
        <div class="quote-management-card">
            <div class="quote-card-header">
                <h3 class="quote-card-title">当前每日一句</h3>
            </div>
            <div class="quote-card-content">${text}</div>
            <div class="quote-card-meta">
                ${author}${source}
            </div>
        </div>
    `;
}

function renderQuotesHistory(quotes) {
    const container = document.getElementById('quotesHistory');
    
    if (quotes.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">✨</div>
                <div class="empty-state-message">暂无历史记录</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <h3>历史每日一句</h3>
        <div class="data-table">
            <table>
                <thead>
                    <tr>
                        <th>内容</th>
                        <th>作者</th>
                        <th>出处</th>
                        <th>创建时间</th>
                        <th>状态</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
                    ${quotes.map(quote => `
                        <tr>
                            <td>${quote.content}</td>
                            <td>${quote.author || '-'}</td>
                            <td>${quote.source || '-'}</td>
                            <td>${formatDate(quote.created_at)}</td>
                            <td>
                                <span class="status-badge ${quote.is_active ? 'status-active' : 'status-pending'}">
                                    ${quote.is_active ? '活跃' : '历史'}
                                </span>
                            </td>
                            <td>
                                <button class="btn btn-outline btn-sm" onclick="deleteQuote(${quote.id}, event)">
                                    删除
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// 删除每日一句
function deleteQuote(quoteId, event) {
    event.preventDefault();
    if (!confirm('确定要删除这条每日一句吗？此操作不可恢复！')) return;
    
    fetch(`/api/admin/daily-quote/${quoteId}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('删除成功', 'success');
            loadDailyQuoteManagement();
        } else {
            showNotification(data.message || '删除失败', 'error');
        }
    })
    .catch(error => {
        showNotification('网络错误，请重试', 'error');
    });
}

// 添加每日一句
async function handleAddQuote(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    try {
        const response = await fetch('/api/admin/daily-quote', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            document.getElementById('addQuoteModal').style.display = 'none';
            document.getElementById('addQuoteForm').reset();
            showNotification('每日一句更新成功', 'success');
            loadDailyQuoteManagement();
        } else {
            showNotification(result.error || '更新失败', 'error');
        }
    } catch (error) {
        showNotification('网络错误，请重试', 'error');
    }
}

// 工具函数
function getStatusText(status) {
    switch (status) {
        case 'pending': return '待处理';
        case 'resolved': return '已接受';
        case 'dismissed': return '已拒绝';
        default: return status;
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN');
}

function logout() {
    localStorage.removeItem('token');
    window.location.href = '/';
}

// 显示通知（复用主页面的函数）
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
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
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

document.addEventListener('DOMContentLoaded', () => {
    // 加载分类文章统计
    fetch('/api/admin/category_article_count')
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                const tbody = document.querySelector('#categoryArticleTable tbody');
                tbody.innerHTML = '';
                data.data.forEach(row => {
                    tbody.innerHTML += `<tr>
                        <td>${row.category_id}</td>
                        <td>${row.category_name}</td>
                        <td>${row.article_count}</td>
                    </tr>`;
                });
            }
        });

    // 查询用户总获赞数
    document.getElementById('getUserLikesBtn').onclick = function() {
        const userId = document.getElementById('userIdInput').value;
        if (!userId) return;
        fetch(`/api/admin/user_total_likes/${userId}`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    document.getElementById('userLikesResult').textContent =
                        `用户${userId}总获赞数：${data.total_likes}`;
                } else {
                    document.getElementById('userLikesResult').textContent = data.message;
                }
            });
    };
}); 

// 分类统计Tab加载逻辑
async function loadCategoryStats() {
    try {
        const res = await fetch('/api/admin/category_article_count');
        const data = await res.json();
        const tbody = document.querySelector('#categoryArticleTable tbody');
        tbody.innerHTML = '';
        if (data.success && Array.isArray(data.data)) {
            data.data.forEach(row => {
                tbody.innerHTML += `<tr>
                    <td>${row.category_id}</td>
                    <td>${row.category_name}</td>
                    <td>${row.article_count}</td>
                </tr>`;
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="3">暂无数据</td></tr>';
        }
    } catch (error) {
        const tbody = document.querySelector('#categoryArticleTable tbody');
        tbody.innerHTML = '<tr><td colspan="3">加载失败</td></tr>';
    }
}

// 批量封禁相关函数
function handleSelectAllUsers(event) {
    const isChecked = event.target.checked;
    const userCheckboxes = document.querySelectorAll('.user-select-checkbox');
    userCheckboxes.forEach(checkbox => {
        checkbox.checked = isChecked;
    });
    updateBatchBanButton();
}

function updateBatchBanButton() {
    const selectedUsers = getSelectedUsers();
    const batchBanBtn = document.getElementById('batchBanBtn');
    if (selectedUsers.length > 0) {
        batchBanBtn.style.display = 'block';
        batchBanBtn.textContent = `批量封禁 (${selectedUsers.length})`;
    } else {
        batchBanBtn.style.display = 'none';
    }
}

function getSelectedUsers() {
    const checkboxes = document.querySelectorAll('.user-select-checkbox:checked');
    return Array.from(checkboxes).map(checkbox => ({
        id: parseInt(checkbox.dataset.userId),
        username: checkbox.dataset.username,
        email: checkbox.dataset.email,
        role: checkbox.dataset.role
    }));
}

function showBatchBanModal() {
    const selectedUsers = getSelectedUsers();
    if (selectedUsers.length === 0) {
        showNotification('请选择要封禁的用户', 'warning');
        return;
    }
    
    // 更新确认消息
    const message = document.getElementById('batchBanMessage');
    message.textContent = `您确定要封禁选中的 ${selectedUsers.length} 个用户吗？此操作将删除用户账户且不可恢复。`;
    
    // 渲染选中的用户列表
    const usersList = document.getElementById('selectedUsersList');
    usersList.innerHTML = selectedUsers.map(user => `
        <div class="selected-user-item">
            <div class="selected-user-info">
                <div class="selected-user-name">${user.username}</div>
                <div class="selected-user-email">${user.email}</div>
            </div>
            <span class="selected-user-role">${user.role}</span>
        </div>
    `).join('');
    
    // 显示模态框
    document.getElementById('batchBanModal').style.display = 'block';
}

function hideBatchBanModal() {
    document.getElementById('batchBanModal').style.display = 'none';
}

async function executeBatchBan() {
    const selectedUsers = getSelectedUsers();
    if (selectedUsers.length === 0) {
        showNotification('没有选中的用户', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/admin/users/batch-ban', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_ids: selectedUsers.map(user => user.id)
            })
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            hideBatchBanModal();
            showNotification(`成功封禁 ${result.banned_count} 个用户`, 'success');
            // 重新加载用户列表
            loadUsers();
            // 隐藏批量封禁按钮
            document.getElementById('batchBanBtn').style.display = 'none';
        } else {
            showNotification(result.message || '批量封禁失败', 'error');
        }
    } catch (error) {
        showNotification('网络错误，请重试', 'error');
    }
} 