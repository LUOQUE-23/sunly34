// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', () => {
    checkLoginStatus();
    loadCategories();
    loadArticles();
    bindEvents();
    bindFormSubmitEvent();
    checkEditButtons();

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

    // 文章状态切换事件委托
    document.querySelector('.articles-list').addEventListener('click', async function(e) {
        if (e.target.classList.contains('btn-publish') || e.target.classList.contains('btn-draft')) {
            const articleId = e.target.dataset.id;
            const newStatus = e.target.classList.contains('btn-publish') ? 'published' : 'draft';
            // 获取CSRF Token
            function getCookie(name) {
                const value = `; ${document.cookie}`;
                const parts = value.split(`; ${name}=`);
                if (parts.length === 2) return parts.pop().split(';').shift();
            }
            const csrfToken = getCookie('csrf_token');
            try {
                const res = await fetch(`/api/articles/${articleId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': csrfToken
                    },
                    body: JSON.stringify({ status: newStatus })
                });
                const data = await res.json();
                if (data.success || data.code === 0) {
                    // 实时更新卡片UI
                    const card = e.target.closest('.article-card');
                    const statusSpan = card.querySelector('.article-status');
                    if (newStatus === 'published') {
                        statusSpan.textContent = '已发布';
                        statusSpan.className = 'article-status published';
                        e.target.style.display = 'none';
                        // 显示"设为草稿"按钮
                        let draftBtn = card.querySelector('.btn-draft');
                        if (!draftBtn) {
                            draftBtn = document.createElement('button');
                            draftBtn.className = 'btn btn-warning btn-draft';
                            draftBtn.dataset.id = articleId;
                            draftBtn.textContent = '设为草稿';
                            statusSpan.after(draftBtn);
                        } else {
                            draftBtn.style.display = '';
                        }
                    } else {
                        statusSpan.textContent = '草稿';
                        statusSpan.className = 'article-status draft';
                        e.target.style.display = 'none';
                        // 显示"发布"按钮
                        let publishBtn = card.querySelector('.btn-publish');
                        if (!publishBtn) {
                            publishBtn = document.createElement('button');
                            publishBtn.className = 'btn btn-success btn-publish';
                            publishBtn.dataset.id = articleId;
                            publishBtn.textContent = '发布';
                            statusSpan.after(publishBtn);
                        } else {
                            publishBtn.style.display = '';
                        }
                    }
                    showNotification(newStatus === 'published' ? '已发布' : '已设为草稿', 'success');
                } else {
                    showNotification(data.message || '操作失败', 'error');
                }
            } catch (error) {
                showNotification('操作失败，请稍后重试', 'error');
            }
        }
    });
});

// 检查登录状态
async function checkLoginStatus() {
    try {
        const response = await fetch('/api/user/current');
        const data = await response.json();
        
        if (data.success && data.user) {
            // 保存当前用户信息到全局变量
            currentUser = data.user;
            
            // 显示用户菜单
            document.querySelector('.auth-buttons').classList.add('hidden');
            const userMenu = document.querySelector('.user-menu');
            userMenu.classList.remove('hidden');
            userMenu.querySelector('.username').textContent = data.user.username;
            
            // 如果是管理员，显示管理后台链接
            if (data.user.role === '文判' || data.user.role === '笔官') {
                const adminLink = userMenu.querySelector('.admin-link');
                if (adminLink) {
                    adminLink.classList.remove('hidden');
                }
            }
            
            // 显示写文章按钮
            const newArticleBtn = document.getElementById('new-article-btn');
            if (newArticleBtn) {
                newArticleBtn.classList.remove('hidden');
            }
        } else {
            // 清空当前用户信息
            currentUser = null;
            
            // 显示登录注册按钮
            document.querySelector('.auth-buttons').classList.remove('hidden');
            document.querySelector('.user-menu').classList.add('hidden');
            const newArticleBtn = document.getElementById('new-article-btn');
            if (newArticleBtn) {
                newArticleBtn.classList.add('hidden');
            }
        }
    } catch (error) {
        console.error('检查登录状态失败:', error);
        // 清空当前用户信息
        currentUser = null;
        
        // 显示登录注册按钮
        document.querySelector('.auth-buttons').classList.remove('hidden');
        document.querySelector('.user-menu').classList.add('hidden');
        const newArticleBtn = document.getElementById('new-article-btn');
        if (newArticleBtn) {
            newArticleBtn.classList.add('hidden');
        }
    }
}

// 加载分类列表
async function loadCategories() {
    try {
        const response = await fetch('/api/categories');
        const data = await response.json();
        console.log('分类数据:', data); // 调试日志
        
        if (data.code === 0) {
            const categoryFilter = document.getElementById('category-filter');
            const categorySelect = document.getElementById('category');
            
            if (!categoryFilter || !categorySelect) {
                console.error('未找到分类下拉框元素');
                return;
            }
            
            // 清空现有选项
            categoryFilter.innerHTML = '<option value="">全部分类</option>';
            categorySelect.innerHTML = '<option value="">请选择分类</option>';
            
            // 添加分类选项
            data.data.items.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                
                categoryFilter.appendChild(option.cloneNode(true));
                categorySelect.appendChild(option);
            });
        } else {
            console.error('加载分类失败:', data.message);
            showNotification('加载分类失败，请刷新页面重试', 'error');
        }
    } catch (error) {
        console.error('加载分类失败:', error);
        showNotification('加载分类失败，请刷新页面重试', 'error');
    }
}

// 加载文章列表
async function loadArticles(page = 1, append = false) {
    try {
        // 确保先获取用户信息
        if (!currentUser) {
            await checkLoginStatus();
        }
        
        const searchInput = document.getElementById('search-input').value;
        const categoryFilter = document.getElementById('category-filter').value;
        const statusFilter = document.getElementById('status-filter').value;
        const sortBy = document.getElementById('sort-by').value;
        
        const params = new URLSearchParams({
            page,
            per_page: 10,
            search: searchInput,
            category_id: categoryFilter,
            status: statusFilter,
            sort_by: sortBy
        });
        
        const response = await fetch(`/api/articles?${params}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('API Response:', data); // 调试日志
        
        if (data.code === 0 && data.data) {
            const articlesList = document.querySelector('.articles-list');
            
            if (!append) {
                articlesList.innerHTML = '';
            }
            
            if (data.data.items && Array.isArray(data.data.items)) {
                data.data.items.forEach(article => {
                    articlesList.appendChild(createArticleCard(article));
                });
            }
            
            // 更新加载更多按钮状态
            const loadMoreBtn = document.getElementById('load-more-btn');
            if (loadMoreBtn) {
                loadMoreBtn.style.display = data.data.has_more ? 'block' : 'none';
                loadMoreBtn.dataset.page = page;
            }
        } else {
            console.error('API Error:', data.message);
            showNotification('加载文章失败', 'error');
        }
    } catch (error) {
        console.error('加载文章失败:', error);
        showNotification('加载文章失败，请稍后重试', 'error');
    }
}

// 全局变量存储当前用户信息
let currentUser = null;

// 创建文章卡片
function createArticleCard(article) {
    const categoryName = article.category && article.category.name ? article.category.name : '无分类';
    const authorName = article.author && article.author.username ? article.author.username : '匿名';
    const likes = article.likes_count !== undefined ? article.likes_count : 0;
    const comments = Array.isArray(article.comments) ? article.comments.length : (article.comments_count || 0);
    const createdAt = article.created_at ? new Date(article.created_at).toLocaleString() : '';
    
    // 更完整的状态处理
    let statusText, statusClass;
    switch(article.status) {
        case 'pending':
            statusText = '待审核';
            statusClass = 'pending';
            break;
        case 'published':
            statusText = '已发布';
            statusClass = 'published';
            break;
        case 'draft':
            statusText = '草稿';
            statusClass = 'draft';
            break;
        default:
            statusText = article.status || '未知';
            statusClass = '';
    }

    // 判断是否是当前用户的文章或者是否为管理员
    const isMyArticle = currentUser && article.author_id === currentUser.user_id;
    const isAdmin = currentUser && (currentUser.role === '文判' || currentUser.role === '笔官');
    const displayTitle = (isMyArticle || !isAdmin) ? article.title : `${authorName}的${article.title}`;

    const card = document.createElement('div');
    card.className = 'article-card';
    card.innerHTML = `
        <div class="article-header">
            <div class="article-header-left">
                <input type="checkbox" class="article-checkbox" data-id="${article.article_id}">
                <h3 class="article-title">${displayTitle}</h3>
            </div>
            <div class="article-meta-row">
                <span class="article-category">${categoryName}</span>
                <span class="article-status ${statusClass}">${statusText}</span>
            </div>
        </div>
        <div class="article-content">${article.content}</div>
        <div class="article-footer">
            <div class="article-stats">
                <span>👍 ${likes}</span>
                <span>💬 ${comments}</span>
                <span>📅 ${createdAt}</span>
                ${(isAdmin && !isMyArticle) ? `<span>✍️ ${authorName}</span>` : ''}
            </div>
            <div class="article-actions">
            <button class="btn btn-secondary edit-btn" data-id="${article.article_id}">编辑</button>
            <button class="btn btn-danger delete-btn" data-id="${article.article_id}">删除</button>
            </div>
        </div>
    `;
    // 绑定编辑和删除按钮事件
    card.querySelector('.edit-btn').addEventListener('click', () => editArticle(article.article_id));
    card.querySelector('.delete-btn').addEventListener('click', () => showDeleteModal(article.article_id));
    return card;
}

// 获取状态文本
function getStatusText(status) {
    const statusMap = {
        pending: '待审核',
        published: '已发布',
        draft: '草稿'
    };
    return statusMap[status] || status;
}

// 格式化日期
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

let editStatus = 'published'; // 默认发布

// 绑定弹窗按钮
function bindEditModalButtons() {
    const saveDraftBtn = document.getElementById('saveDraftBtn');
    const publishBtn = document.getElementById('publishBtn');
    console.log('绑定按钮事件');
    if (saveDraftBtn) {
        saveDraftBtn.onclick = null;
        saveDraftBtn.onclick = function(e) {
            e.preventDefault();
            console.log('点击了保存为草稿');
            editStatus = 'draft';
            document.getElementById('article-form').dispatchEvent(new Event('submit'));
        };
    }
    if (publishBtn) {
        publishBtn.onclick = null;
        publishBtn.onclick = function(e) {
            e.preventDefault();
            console.log('点击了发布');
            editStatus = 'published';
            document.getElementById('article-form').dispatchEvent(new Event('submit'));
        };
    }
}

// 绑定事件
function bindEvents() {
    // 加载分类数据
    loadCategories();
    
    // 写文章按钮
    const newArticleBtn = document.getElementById('new-article-btn');
    if (newArticleBtn) {
        newArticleBtn.addEventListener('click', () => {
            document.getElementById('article-modal').classList.add('active');
            editStatus = 'published'; // 新建默认发布
            bindEditModalButtons();
        });
    }
    
    // 关闭模态框
    const closeModalBtn = document.getElementById('close-modal');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            hideArticleModal();
        });
    }
    
    // 文章表单提交
    bindFormSubmitEvent();
    
    // 搜索按钮
    document.getElementById('search-btn').addEventListener('click', () => {
        loadArticles(1);
    });
    
    // 筛选条件变化
    document.getElementById('category-filter').addEventListener('change', () => {
        loadArticles(1);
    });
    
    document.getElementById('status-filter').addEventListener('change', () => {
        loadArticles(1);
    });
    
    document.getElementById('sort-by').addEventListener('change', () => {
        loadArticles(1);
    });
    
    // 加载更多按钮
    document.getElementById('load-more-btn').addEventListener('click', () => {
        const page = parseInt(document.getElementById('load-more-btn').dataset.page) + 1;
        loadArticles(page, true);
    });
    
    // 批量删除按钮
    const batchDeleteBtn = document.getElementById('batch-delete-btn');
    if (batchDeleteBtn) {
        batchDeleteBtn.addEventListener('click', () => {
            const selectedArticles = getSelectedArticles();
            if (selectedArticles.length === 0) {
                showNotification('请选择要删除的文章', 'warning');
                return;
            }
            showBatchDeleteModal(selectedArticles);
        });
    }
    
    // 文章列表复选框变化事件
    document.querySelector('.articles-list').addEventListener('change', (e) => {
        if (e.target.classList.contains('article-checkbox')) {
            updateBatchDeleteButton();
        }
    });
    
    // 删除确认按钮
    document.getElementById('confirm-delete').addEventListener('click', () => {
        const articleIds = document.getElementById('confirm-delete').dataset.articleIds;
        if (articleIds) {
            batchDeleteArticles(JSON.parse(articleIds));
        } else {
            const articleId = document.getElementById('confirm-delete').dataset.articleId;
            if (articleId) {
                deleteArticle(articleId);
            }
        }
    });
    
    // 取消删除按钮
    document.getElementById('cancel-delete').addEventListener('click', () => {
        hideDeleteModal();
    });
    
    // 退出登录按钮
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            // 获取CSRF Token
            function getCookie(name) {
                const value = `; ${document.cookie}`;
                const parts = value.split(`; ${name}=`);
                if (parts.length === 2) return parts.pop().split(';').shift();
            }
            const csrfToken = getCookie('csrf_token');
            fetch('/api/logout', {
                method: 'POST',
                headers: {
                    'X-CSRFToken': csrfToken
                }
            }).then(() => window.location.href = '/');
        });
    }
}

// 显示文章模态框
function showArticleModal(articleId = null) {
    const modal = document.getElementById('article-modal');
    const form = document.getElementById('article-form');
    form.reset();
    if (articleId) {
        loadArticleData(articleId);
    } else {
        bindEditModalButtons(); // 新建时也绑定
    }
    modal.classList.add('active');
}

// 隐藏文章模态框
function hideArticleModal() {
    const modal = document.getElementById('article-modal');
    modal.classList.remove('active');
    const articleForm = document.getElementById('article-form');
    articleForm.reset();
    delete articleForm.dataset.articleId;
}

// 加载文章数据
async function loadArticleData(articleId) {
    try {
        const response = await fetch(`/api/articles/${articleId}`);
        const data = await response.json();
        if ((data.success && data.article) || (data.code === 0 && data.data)) {
            const article = data.article || data.data;
            document.getElementById('title').value = article.title;
            document.getElementById('category').value = article.category_id;
            document.getElementById('content').value = article.content;
            document.getElementById('article-form').dataset.articleId = articleId;
            // 不回显状态，不处理editStatus
        } else {
            alert(data.message || '获取文章详情失败');
        }
    } catch (error) {
        alert('获取文章详情失败');
    }
}

// 显示删除确认对话框
function showDeleteModal(articleId) {
    const modal = document.getElementById('delete-modal');
    document.getElementById('confirm-delete').dataset.articleId = articleId;
    modal.classList.add('active');
}

// 隐藏删除确认对话框
function hideDeleteModal() {
    const modal = document.getElementById('delete-modal');
    modal.classList.remove('active');
}

// 删除文章
async function deleteArticle(articleId) {
    try {
        const response = await fetch(`/api/articles/${articleId}`, {
            method: 'DELETE'
        });
        const data = await response.json();
        console.log('删除返回数据:', data);
        if (data.code === 0 || data.success) {
            hideDeleteModal();
            showNotification('文章删除成功', 'success');
            console.log('即将刷新页面');
            window.location.reload();
        } else {
            showNotification(data.message || '删除失败', 'error');
        }
    } catch (error) {
        showNotification('删除失败，请重试', 'error');
    }
}

// 显示通知
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // 添加样式
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 4px;
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
            notification.style.background = '#52c41a';
            break;
        case 'error':
            notification.style.background = '#ff4d4f';
            break;
        case 'warning':
            notification.style.background = '#faad14';
            break;
        default:
            notification.style.background = '#1890ff';
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

// 编辑文章
async function editArticle(articleId) {
    console.log('尝试编辑文章，ID:', articleId);
    try {
        const response = await fetch(`/api/articles/${articleId}`);
        console.log('获取文章详情响应状态:', response.status);
        const data = await response.json();
        console.log('获取文章详情响应数据:', data);
        if ((data.success && data.article) || (data.code === 0 && data.data)) {
            const article = data.article || data.data;
            document.getElementById('title').value = article.title;
            document.getElementById('category').value = article.category_id;
            document.getElementById('content').value = article.content;
            document.getElementById('article-form').dataset.articleId = articleId;
            document.getElementById('article-modal').classList.add('active');
            console.log('成功加载文章数据并显示模态框');
        } else {
            console.error('获取文章详情失败，响应数据:', data);
            alert(data.message || '获取文章详情失败');
        }
    } catch (error) {
        console.error('获取文章详情时发生错误:', error);
        alert('获取文章详情失败');
    }
}

function bindFormSubmitEvent() {
    let tryCount = 0;
    function tryBind() {
        const articleForm = document.getElementById('article-form');
        if (articleForm) {
            if (!articleForm._submitBound) {
                articleForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    console.log('表单提交', editStatus);
                    const title = document.getElementById('title').value;
                    const category = document.getElementById('category').value;
                    const content = document.getElementById('content').value;
                    const articleId = articleForm.dataset.articleId;
                    const body = JSON.stringify({ title, category_id: category, content, status: editStatus });
                    if (articleId) {
                        // 编辑
                        try {
                            const response = await fetch(`/api/articles/${articleId}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body
                            });
                            const data = await response.json();
                            if (data.success || data.code === 0) {
                                hideArticleModal();
                                showNotification('编辑成功', 'success');
                                window.location.reload();
                            } else {
                                showNotification(data.message || '编辑失败', 'error');
                            }
                        } catch (error) {
                            showNotification('编辑失败', 'error');
                        }
                    } else {
                        // 新建
                        fetch('/api/articles', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body
                        })
                        .then(response => response.json())
                        .then(data => {
                            if (data.code === 0 || data.success) {
                                hideArticleModal();
                                showNotification('发布成功', 'success');
                                window.location.reload();
                            } else {
                                showNotification(data.message, 'error');
                            }
                        });
                    }
                });
                articleForm._submitBound = true;
            }
        } else {
            tryCount++;
            if (tryCount < 20) {
                setTimeout(tryBind, 100);
            } else {
                console.log('未找到表单');
            }
        }
    }
    tryBind();
}

// 检查编辑按钮是否存在并绑定事件
function checkEditButtons() {
    console.log('检查编辑按钮...');
    const editButtons = document.querySelectorAll('.btn-edit');
    console.log('找到的编辑按钮数量:', editButtons.length);
    editButtons.forEach(button => {
        console.log('为按钮添加事件监听，ID:', button.dataset.articleId);
        button.addEventListener('click', function(e) {
            console.log('编辑按钮被点击，文章ID:', this.dataset.articleId);
            editArticle(this.dataset.articleId);
            e.preventDefault();
        });
    });
}

// 获取选中的文章ID
function getSelectedArticles() {
    const checkboxes = document.querySelectorAll('.article-checkbox:checked');
    return Array.from(checkboxes).map(checkbox => checkbox.dataset.id);
}

// 更新批量删除按钮显示状态
function updateBatchDeleteButton() {
    const batchDeleteBtn = document.getElementById('batch-delete-btn');
    const selectedCount = getSelectedArticles().length;
    batchDeleteBtn.style.display = selectedCount > 0 ? 'block' : 'none';
}

// 显示批量删除确认对话框
function showBatchDeleteModal(articleIds) {
    const modal = document.getElementById('delete-modal');
    const confirmBtn = document.getElementById('confirm-delete');
    const modalTitle = modal.querySelector('h3');
    const modalContent = modal.querySelector('p');
    
    modalTitle.textContent = '确认批量删除';
    modalContent.textContent = `您确定要删除选中的 ${articleIds.length} 篇文章吗？此操作不可恢复。`;
    confirmBtn.dataset.articleIds = JSON.stringify(articleIds);
    
    modal.classList.add('active');
}

// 批量删除文章
async function batchDeleteArticles(articleIds) {
    try {
        const response = await fetch('/api/articles/batch-delete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ article_ids: articleIds })
        });
        const data = await response.json();
        if (data.code === 0 || data.success) {
            hideDeleteModal();
            showNotification(`成功删除 ${articleIds.length} 篇文章`, 'success');
            window.location.reload();
        } else {
            showNotification(data.message || '批量删除失败', 'error');
        }
    } catch (error) {
        showNotification('批量删除失败，请重试', 'error');
    }
} 