// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', () => {
    checkLoginStatus();
    loadArticles();
    loadComments();
    bindEvents();
});

// 检查登录状态
async function checkLoginStatus() {
    try {
        const response = await fetch('/api/user/status');
        const data = await response.json();
        
        if (data.code === 0 && data.data) {
            document.querySelector('.username').textContent = data.data.username;
            // 管理后台权限
            const adminLink = document.querySelector('.admin-link');
            if (adminLink) {
                if (data.data.role === '文判') {
                    adminLink.classList.remove('hidden');
                } else {
                    adminLink.classList.add('hidden');
                }
            }
        } else {
            window.location.href = '/login';
        }
    } catch (error) {
        console.error('检查登录状态失败:', error);
        window.location.href = '/login';
    }
}

// 加载文章列表
async function loadArticles() {
    try {
        const response = await fetch('/api/articles');
        const data = await response.json();
        
        if (data.code === 0) {
            const articleFilter = document.getElementById('article-filter');
            
            data.data.items.forEach(article => {
                const option = document.createElement('option');
                option.value = article.id;
                option.textContent = article.title;
                articleFilter.appendChild(option);
            });
        }
    } catch (error) {
        console.error('加载文章列表失败:', error);
    }
}

// 加载评论列表
async function loadComments(page = 1, append = false) {
    try {
        const searchInput = document.getElementById('search-input').value;
        const articleFilter = document.getElementById('article-filter').value;
        const statusFilter = document.getElementById('status-filter').value;
        const sortBy = document.getElementById('sort-by').value;
        
        const params = new URLSearchParams({
            page,
            search: searchInput,
            article: articleFilter,
            status: statusFilter,
            sort_by: sortBy
        });
        
        const response = await fetch(`/api/comments?${params}`);
        const data = await response.json();
        
        if (data.code === 0) {
            const commentsList = document.querySelector('.comments-list');
            
            if (!append) {
                commentsList.innerHTML = '';
            }
            
            data.data.items.forEach(comment => {
                commentsList.appendChild(createCommentCard(comment));
            });
            
            // 更新加载更多按钮状态
            const loadMoreBtn = document.getElementById('load-more-btn');
            loadMoreBtn.style.display = data.data.has_more ? 'block' : 'none';
            
            // 保存当前页码
            loadMoreBtn.dataset.page = page;
        }
    } catch (error) {
        console.error('加载评论失败:', error);
    }
}

// 创建评论卡片
function createCommentCard(comment) {
    const card = document.createElement('div');
    card.className = 'comment-card';
    card.innerHTML = `
        <div class="comment-header">
            <div class="comment-author">
                <img src="${comment.author_avatar || '/static/images/default-avatar.png'}" alt="用户头像" class="avatar">
                <div class="author-info">
                    <span class="username">${comment.author_name}</span>
                    <span class="time">${formatDate(comment.created_at)}</span>
                </div>
            </div>
            <div class="comment-status ${comment.status}">${getStatusText(comment.status)}</div>
        </div>
        <div class="comment-content">${comment.content}</div>
        <div class="comment-article">
            <h3>评论文章</h3>
            <a href="/articles/${comment.article_id}">${comment.article_title}</a>
        </div>
        <div class="comment-footer">
            <div class="comment-stats">
                <span>点赞: ${comment.likes}</span>
            </div>
            <div class="comment-actions">
                <button class="btn btn-primary view-btn" data-id="${comment.id}">查看</button>
                <button class="btn btn-danger delete-btn" data-id="${comment.id}">删除</button>
            </div>
        </div>
    `;
    
    // 绑定查看和删除按钮事件
    card.querySelector('.view-btn').addEventListener('click', () => showCommentDetail(comment.id));
    card.querySelector('.delete-btn').addEventListener('click', () => showDeleteModal(comment.id));
    
    return card;
}

// 获取状态文本
function getStatusText(status) {
    const statusMap = {
        pending: '待审核',
        approved: '已通过',
        rejected: '已拒绝'
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

// 绑定事件
function bindEvents() {
    // 关闭模态框
    document.getElementById('close-modal').addEventListener('click', () => {
        hideCommentModal();
    });
    
    // 搜索按钮
    document.getElementById('search-btn').addEventListener('click', () => {
        loadComments(1);
    });
    
    // 筛选条件变化
    document.getElementById('article-filter').addEventListener('change', () => {
        loadComments(1);
    });
    
    document.getElementById('status-filter').addEventListener('change', () => {
        loadComments(1);
    });
    
    document.getElementById('sort-by').addEventListener('change', () => {
        loadComments(1);
    });
    
    // 加载更多按钮
    document.getElementById('load-more-btn').addEventListener('click', () => {
        const page = parseInt(document.getElementById('load-more-btn').dataset.page) + 1;
        loadComments(page, true);
    });
    
    // 评论操作按钮
    document.getElementById('approve-btn').addEventListener('click', () => {
        const commentId = document.getElementById('approve-btn').dataset.commentId;
        updateCommentStatus(commentId, 'approved');
    });
    
    document.getElementById('reject-btn').addEventListener('click', () => {
        const commentId = document.getElementById('reject-btn').dataset.commentId;
        updateCommentStatus(commentId, 'rejected');
    });
    
    document.getElementById('delete-btn').addEventListener('click', () => {
        const commentId = document.getElementById('delete-btn').dataset.commentId;
        showDeleteModal(commentId);
    });
    
    // 删除确认按钮
    document.getElementById('confirm-delete').addEventListener('click', () => {
        const commentId = document.getElementById('confirm-delete').dataset.commentId;
        deleteComment(commentId);
    });
    
    // 取消删除按钮
    document.getElementById('cancel-delete').addEventListener('click', () => {
        hideDeleteModal();
    });
    
    // 退出登录按钮
    document.getElementById('logout-btn').addEventListener('click', () => {
        logout();
    });
}

// 显示评论详情
async function showCommentDetail(commentId) {
    try {
        const response = await fetch(`/api/comments/${commentId}`);
        const data = await response.json();
        
        if (data.code === 0) {
            const comment = data.data;
            
            // 更新模态框内容
            document.getElementById('comment-avatar').src = comment.author_avatar || '/static/images/default-avatar.png';
            document.getElementById('comment-username').textContent = comment.author_name;
            document.getElementById('comment-time').textContent = formatDate(comment.created_at);
            document.getElementById('comment-status').textContent = getStatusText(comment.status);
            document.getElementById('comment-status').className = `comment-status ${comment.status}`;
            document.getElementById('comment-content').textContent = comment.content;
            document.getElementById('article-link').textContent = comment.article_title;
            document.getElementById('article-link').href = `/articles/${comment.article_id}`;
            
            // 保存评论ID用于操作
            document.getElementById('approve-btn').dataset.commentId = commentId;
            document.getElementById('reject-btn').dataset.commentId = commentId;
            document.getElementById('delete-btn').dataset.commentId = commentId;
            
            // 根据评论状态显示/隐藏按钮
            const approveBtn = document.getElementById('approve-btn');
            const rejectBtn = document.getElementById('reject-btn');
            
            if (comment.status === 'pending') {
                approveBtn.style.display = 'block';
                rejectBtn.style.display = 'block';
            } else {
                approveBtn.style.display = 'none';
                rejectBtn.style.display = 'none';
            }
            
            // 显示模态框
            document.getElementById('comment-modal').classList.add('active');
        }
    } catch (error) {
        console.error('加载评论详情失败:', error);
    }
}

// 隐藏评论详情模态框
function hideCommentModal() {
    document.getElementById('comment-modal').classList.remove('active');
}

// 更新评论状态
async function updateCommentStatus(commentId, status) {
    try {
        const response = await fetch(`/api/comments/${commentId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status })
        });
        
        const data = await response.json();
        
        if (data.code === 0) {
            hideCommentModal();
            loadComments(1);
            alert('评论状态更新成功');
        } else {
            alert(data.message || '操作失败');
        }
    } catch (error) {
        console.error('更新评论状态失败:', error);
        alert('操作失败，请重试');
    }
}

// 显示删除确认对话框
function showDeleteModal(commentId) {
    const modal = document.getElementById('delete-modal');
    document.getElementById('confirm-delete').dataset.commentId = commentId;
    modal.classList.add('active');
}

// 隐藏删除确认对话框
function hideDeleteModal() {
    const modal = document.getElementById('delete-modal');
    modal.classList.remove('active');
}

// 删除评论
async function deleteComment(commentId) {
    try {
        const response = await fetch(`/api/comments/${commentId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.code === 0) {
            hideDeleteModal();
            loadComments(1);
            alert('评论删除成功');
        } else {
            alert(data.message || '删除失败');
        }
    } catch (error) {
        console.error('删除评论失败:', error);
        alert('删除失败，请重试');
    }
}

// 退出登录
async function logout() {
    try {
        const response = await fetch('/api/auth/logout', {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.code === 0) {
            window.location.href = '/login';
        }
    } catch (error) {
        console.error('退出登录失败:', error);
    }
} 