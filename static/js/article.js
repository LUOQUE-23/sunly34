// 举报相关变量声明在全局顶部，避免重复声明
let reportBtn, reportModal, reportClose, reportCancel, reportForm;
let articleId = window.articleId;
let authorId = window.authorId;

document.addEventListener('DOMContentLoaded', () => {
    const articleId = window.location.pathname.split('/').pop();
    let articleData = null;
    let currentUser = null;

    // 获取CSRF Token
    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
    }
    const csrfToken = getCookie('csrf_token');

    // 检查登录状态
    async function checkLoginStatus() {
        try {
            const response = await fetch('/api/user/status');
            const data = await response.json();
            if (data.code === 0 && data.data) {
                currentUser = data.data;
                // 登录后UI处理（如显示评论框、点赞等）
                document.querySelectorAll('.need-login').forEach(el => el.classList.remove('need-login'));
                updateNavbarForLogin();
            } else {
                currentUser = null;
                // 未登录时隐藏评论输入、点赞等
                document.querySelectorAll('.login-required').forEach(el => el.classList.add('need-login'));
                updateNavbarForLogin();
            }
        } catch (error) {
            console.error('检查登录状态失败:', error);
        }
    }

    // 动态切换导航栏按钮
    function updateNavbarForLogin() {
        const authButtons = document.querySelector('.auth-buttons');
        if (currentUser) {
            // 隐藏登录/注册按钮
            if (authButtons) authButtons.style.display = 'none';
            // 显示用户菜单
            let userMenu = document.querySelector('.user-menu');
            if (!userMenu) {
                userMenu = document.createElement('div');
                userMenu.className = 'user-menu';
                
                // 构建菜单HTML，根据用户角色决定是否显示管理后台
                let menuHtml = `
                    <span class="username">${currentUser.username}</span>
                    <div class="dropdown-content">
                        <a href="/profile">个人中心</a>
                        <a href="/favorites">我的收藏</a>`;
                
                // 如果是管理员或超级管理员，显示管理后台链接
                if (currentUser.role === '笔官' || currentUser.role === '文判') {
                    menuHtml += `<a href="/admin">管理后台</a>`;
                }
                
                menuHtml += `<a href="#" id="logoutBtn">退出登录</a>
                    </div>
                `;
                
                userMenu.innerHTML = menuHtml;
                document.querySelector('.nav-menu').appendChild(userMenu);
                // 绑定退出登录事件
                userMenu.querySelector('#logoutBtn').addEventListener('click', (e) => {
                    e.preventDefault();
                    fetch('/logout').then(() => window.location.reload());
                });
                // 用户菜单下拉
                const usernameBtn = userMenu.querySelector('.username');
                const dropdown = userMenu.querySelector('.dropdown-content');
                if (usernameBtn && dropdown) {
                    usernameBtn.addEventListener('click', function(e) {
                        e.stopPropagation();
                        userMenu.classList.toggle('open');
                    });
                    document.addEventListener('click', function() {
                        userMenu.classList.remove('open');
                    });
                    dropdown.addEventListener('click', function(e) {
                        e.stopPropagation();
                    });
                }
            }
        } else {
            // 显示登录/注册按钮
            if (authButtons) authButtons.style.display = '';
            // 隐藏用户菜单
            const userMenu = document.querySelector('.user-menu');
            if (userMenu) userMenu.remove();
        }
    }

    // 加载文章详情
    async function loadArticle() {
        try {
            const response = await fetch(`/api/articles/${articleId}`);
            const data = await response.json();
            
            if (data.code === 0 && data.data) {
                articleData = data.data;
                
                // 更新文章信息
                const elements = {
                    'articleTitle': articleData.title,
                    'authorName': articleData.author ? articleData.author.username : '匿名',
                    'articleDate': `发布时间：${new Date(articleData.created_at).toLocaleString()}`,
                    'articleCategory': articleData.category ? articleData.category.name : '未分类',
                    'articleContent': articleData.content,
                    'likeCount': articleData.likes_count || 0,
                    'favoriteCount': articleData.favorites_count || 0
                };

                // 更新DOM元素
                Object.entries(elements).forEach(([id, value]) => {
                    const element = document.getElementById(id);
                    if (element) {
                        if (id === 'articleContent') {
                            // 按换行符分段，过滤空段落，用<p>包裹实现缩进
                            const paragraphs = value.split(/(\r\n|\r|\n)+/)
                                .filter(p => p.trim().length > 0)
                                .map(p => `<p>${p.trim()}</p>`)
                                .join('');
                            element.innerHTML = paragraphs;
                        } else {
                        element.textContent = value;
                        }
                    }
                });

                // 更新作者头像
                const authorAvatar = document.getElementById('authorAvatar');
                if (authorAvatar && articleData.author && articleData.author.avatar) {
                    authorAvatar.src = articleData.author.avatar;
                }

                // 更新点赞和收藏按钮状态
                const likeBtn = document.getElementById('likeBtn');
                const favoriteBtn = document.getElementById('favoriteBtn');
                
                if (likeBtn && articleData.is_liked) {
                    likeBtn.classList.add('active');
                }
                if (favoriteBtn && articleData.is_favorited) {
                    favoriteBtn.classList.add('active');
                }

                // 如果是作者或管理员，显示编辑和删除按钮
                const editBtn = document.getElementById('editBtn');
                const deleteBtn = document.getElementById('deleteBtn');
                
                if (currentUser && (currentUser.user_id === articleData.author_id || currentUser.role === '文判')) {
                    if (editBtn) editBtn.classList.remove('hidden');
                    if (deleteBtn) deleteBtn.classList.remove('hidden');
                }

                // 新增：更新点赞行为展示区
                const likeCountBehavior = document.getElementById('likeCountBehavior');
                if (likeCountBehavior) {
                    likeCountBehavior.textContent = articleData.likes_count || 0;
                }

                // 新增：更新收藏行为展示区
                const favoriteCountBehavior = document.getElementById('favoriteCountBehavior');
                if (favoriteCountBehavior) {
                    favoriteCountBehavior.textContent = articleData.favorites_count || 0;
                }

                // 新增：更新评论行为展示区
                const commentCountBehavior = document.getElementById('commentCountBehavior');
                if (commentCountBehavior) {
                    commentCountBehavior.textContent = articleData.comments_count || 0;
                }

                // 加载评论
                loadComments();
            } else {
                // 友好提示
                const articleContent = document.querySelector('.article-content');
                if (articleContent) {
                    articleContent.innerHTML = '<p class="error-message">文章不存在或已被删除。</p>';
                }
                // 隐藏评论、操作区
                document.querySelectorAll('.login-required').forEach(el => el.style.display = 'none');
            }
        } catch (error) {
            console.error('加载文章失败:', error);
            const articleContent = document.querySelector('.article-content');
            if (articleContent) {
                articleContent.innerHTML = '<p class="error-message">加载文章失败，请稍后重试。</p>';
            }
            document.querySelectorAll('.login-required').forEach(el => el.style.display = 'none');
        }
    }

    // 加载评论列表
    async function loadComments() {
        try {
            const response = await fetch(`/api/articles/${articleId}/comments`);
            const data = await response.json();
            
            if (data.code === 0) {
                const commentsList = document.getElementById('commentsList');
                if (!commentsList) return;
                
                commentsList.innerHTML = '';
                
                if (data.data.items && data.data.items.length > 0) {
                    data.data.items.forEach(comment => {
                        const commentElement = createCommentElement(comment);
                        commentsList.appendChild(commentElement);
                    });
                } else {
                    commentsList.innerHTML = '<p class="no-comments">暂无评论，快来发表第一条评论吧！</p>';
                }
                // 更新评论数（使用实际加载的评论数）
                const commentCountBehavior = document.getElementById('commentCountBehavior');
                if (commentCountBehavior) {
                    commentCountBehavior.textContent = data.data.items ? data.data.items.length : 0;
                }
            }
        } catch (error) {
            console.error('加载评论失败:', error);
            showNotification('加载评论失败，请稍后重试', 'error');
        }
    }

    // 创建评论元素
    function createCommentElement(comment) {
        const div = document.createElement('div');
        div.className = 'comment';
        div.innerHTML = `
            <div class="comment-header">
                <div class="author-info">
                    <span class="username">${comment.user ? comment.user.username : '匿名'}</span>
                    <span class="time">${new Date(comment.created_at).toLocaleString()}</span>
                </div>
                ${currentUser && (currentUser.user_id === comment.user_id || currentUser.role === '文判') 
                    ? `<button class="delete-comment" data-id="${comment.comment_id}">删除</button>` 
                    : ''}
            </div>
            <div class="comment-content">${comment.content}</div>
        `;
        // 绑定删除按钮事件
        const deleteBtn = div.querySelector('.delete-comment');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => deleteComment(comment.comment_id));
        }
        return div;
    }

    // 提交评论
    async function submitComment(content) {
        if (!currentUser) {
            showNotification('请先登录后再评论', 'warning');
            return;
        }
        try {
            const response = await fetch(`/api/articles/${articleId}/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken
                },
                body: JSON.stringify({ content })
            });
            const data = await response.json();
            if (data.code === 0 || data.success) {
                const commentInput = document.getElementById('commentInput');
                if (commentInput) commentInput.value = '';
                showNotification('评论发布成功', 'success');
                loadComments();
                // 更新评论数
                const commentCountBehavior = document.getElementById('commentCountBehavior');
                if (commentCountBehavior) {
                    commentCountBehavior.textContent = parseInt(commentCountBehavior.textContent) + 1;
                }
            } else {
                showNotification(data.message || '评论发布失败', 'error');
            }
        } catch (error) {
            console.error('发布评论失败:', error);
            showNotification('评论发布失败，请稍后重试', 'error');
        }
    }

    // 删除评论
    async function deleteComment(commentId) {
        if (!confirm('确定要删除这条评论吗？')) {
            return;
        }
        try {
            const response = await fetch(`/api/comments/${commentId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken
                }
            });
            const data = await response.json();
            if (data.code === 0 || data.success) {
                showNotification('评论删除成功', 'success');
                loadComments();
                // 更新评论数
                const commentCountBehavior = document.getElementById('commentCountBehavior');
                if (commentCountBehavior) {
                    commentCountBehavior.textContent = Math.max(0, parseInt(commentCountBehavior.textContent) - 1);
                }
            } else {
                showNotification(data.message || '删除失败', 'error');
            }
        } catch (error) {
            console.error('删除评论失败:', error);
            showNotification('删除失败，请稍后重试', 'error');
        }
    }

    // 点赞文章
    async function likeArticle() {
        if (!currentUser) {
            showNotification('请先登录后再点赞', 'warning');
            return;
        }
        try {
            const response = await fetch(`/api/articles/${articleId}/like`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': csrfToken
                }
            });
            const data = await response.json();
            if (data.code === 0) {
                const likeBtn = document.getElementById('likeBtn');
                const likeCount = document.getElementById('likeCount');
                const likeCountBehavior = document.getElementById('likeCountBehavior');
                
                if (likeBtn && likeCount) {
                    if (data.data.is_liked) {
                        likeBtn.classList.add('active');
                        likeCount.textContent = parseInt(likeCount.textContent) + 1;
                        if (likeCountBehavior) {
                            likeCountBehavior.textContent = parseInt(likeCountBehavior.textContent) + 1;
                        }
                    } else {
                        likeBtn.classList.remove('active');
                        likeCount.textContent = parseInt(likeCount.textContent) - 1;
                        if (likeCountBehavior) {
                            likeCountBehavior.textContent = parseInt(likeCountBehavior.textContent) - 1;
                        }
                    }
                }
            }
        } catch (error) {
            console.error('点赞失败:', error);
            showNotification('操作失败，请稍后重试', 'error');
        }
    }

    // 收藏文章
    async function favoriteArticle() {
        if (!currentUser) {
            showNotification('请先登录后再收藏', 'warning');
            return;
        }
        try {
            const response = await fetch(`/api/articles/${articleId}/favorite`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': csrfToken
                }
            });
            const data = await response.json();
            if (data.code === 0) {
                const favoriteBtn = document.getElementById('favoriteBtn');
                const favoriteCount = document.getElementById('favoriteCount');
                const favoriteCountBehavior = document.getElementById('favoriteCountBehavior');
                
                if (favoriteBtn && favoriteCount) {
                    if (data.data.is_favorited) {
                        favoriteBtn.classList.add('active');
                        favoriteCount.textContent = parseInt(favoriteCount.textContent) + 1;
                        if (favoriteCountBehavior) {
                            favoriteCountBehavior.textContent = parseInt(favoriteCountBehavior.textContent) + 1;
                        }
                    } else {
                        favoriteBtn.classList.remove('active');
                        favoriteCount.textContent = parseInt(favoriteCount.textContent) - 1;
                        if (favoriteCountBehavior) {
                            favoriteCountBehavior.textContent = parseInt(favoriteCountBehavior.textContent) - 1;
                        }
                    }
                }
            }
        } catch (error) {
            console.error('收藏失败:', error);
            showNotification('操作失败，请稍后重试', 'error');
        }
    }

    // 举报文章
    async function reportArticle(reason, details) {
        if (!currentUser) {
            showNotification('请先登录后再举报', 'warning');
            return;
        }
        try {
            const response = await fetch(`/api/articles/${articleId}/report`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken
                },
                body: JSON.stringify({ reason, details })
            });
            const data = await response.json();
            if (data.code === 0) {
                showNotification('举报已提交，我们会尽快处理', 'success');
                document.getElementById('reportModal').classList.remove('active');
            } else {
                showNotification(data.message || '举报提交失败', 'error');
            }
        } catch (error) {
            console.error('提交举报失败:', error);
            showNotification('举报提交失败，请稍后重试', 'error');
        }
    }

    // 删除文章
    async function deleteArticle() {
        if (!confirm('确定要删除这篇文章吗？此操作不可恢复。')) {
            return;
        }
        try {
            const response = await fetch(`/api/articles/${articleId}`, {
                method: 'DELETE',
                headers: {
                    'X-CSRFToken': csrfToken
                }
            });
            const data = await response.json();
            if (data.code === 0) {
                showNotification('文章删除成功', 'success');
                window.location.href = '/';
            } else {
                showNotification(data.message || '删除失败', 'error');
            }
        } catch (error) {
            console.error('删除文章失败:', error);
            showNotification('删除失败，请稍后重试', 'error');
        }
    }

    // 复制文章链接
    function copyArticleLink() {
        const url = window.location.href;
        navigator.clipboard.writeText(url).then(() => {
            showNotification('链接已复制到剪贴板', 'success');
        }).catch(() => {
            showNotification('复制失败，请手动复制链接', 'error');
        });
    }

    // 显示通知
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }

    // 绑定事件监听器
    const submitCommentBtn = document.getElementById('submitComment');
    if (submitCommentBtn) {
        submitCommentBtn.addEventListener('click', () => {
            const commentInput = document.getElementById('commentInput');
            if (commentInput && commentInput.value.trim()) {
                submitComment(commentInput.value.trim());
            }
        });
    }

    const likeBtn = document.getElementById('likeBtn');
    if (likeBtn) {
        likeBtn.addEventListener('click', likeArticle);
    }

    const favoriteBtn = document.getElementById('favoriteBtn');
    if (favoriteBtn) {
        favoriteBtn.addEventListener('click', favoriteArticle);
    }

    const reportBtn = document.getElementById('reportBtn');
    if (reportBtn) {
        reportBtn.addEventListener('click', () => {
            const reportModal = document.getElementById('reportModal');
            if (reportModal) reportModal.classList.add('active');
        });
    }
    const editBtn = document.getElementById('editBtn');
    if (editBtn) {
        editBtn.addEventListener('click', () => {
            window.location.href = '/articles';
        });
    }
    const deleteBtn = document.getElementById('deleteBtn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            window.location.href = '/articles';
        });
    }
    const copyLink = document.getElementById('copyLink');
    if (copyLink) {
        copyLink.addEventListener('click', copyArticleLink);
    }

    // 关闭模态框
    document.querySelectorAll('.modal .close').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            closeBtn.closest('.modal').classList.remove('active');
        });
    });

    // 举报表单提交
    const reportForm = document.getElementById('reportForm');
    if (reportForm)
        reportForm.onsubmit = async function(e) {
            e.preventDefault();
            const reasonType = document.getElementById('reportReason').value;
            const reasonContent = document.getElementById('reportDetails').value.trim();
            const csrfToken = getCookie('csrf_token');
            if (!reasonType || !reasonContent) {
                alert('请填写举报原因和详细说明');
                return;
            }
            if (!articleId || !authorId) {
                alert('无法获取文章信息，请刷新页面重试');
                return;
            }
            try {
                const res = await fetch('/api/reports', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': csrfToken
                    },
                    body: JSON.stringify({
                        article_id: articleId,
                        reported_user_id: authorId,
                        reason_type: reasonType,
                        reason_content: reasonContent
                    })
                });
                const data = await res.json();
                alert(data.message || (data.success ? '举报成功' : '举报失败'));
                if (data.success) {
                    if (reportModal) reportModal.style.display = 'none';
                    reportForm.reset();
            }
            } catch (err) {
                alert('举报失败，请稍后重试');
    }
        };

    // 退出登录按钮逻辑
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

    // 初始化
    checkLoginStatus();
    loadArticle();
    // 评论自动同步，每10秒刷新一次
    setInterval(loadComments, 10000);

    // 如果没有全局变量，则在加载文章详情后赋值
    function setIdsFromData(articleData) {
        articleId = articleData.article_id;
        authorId = articleData.author && articleData.author.user_id;
    }
    // 如果页面有全局变量articleData，直接赋值
    if (window.articleData) {
        setIdsFromData(window.articleData);
    } else {
        // 尝试从页面加载文章详情后赋值
        const oldLoadArticle = window.loadArticle;
        window.loadArticle = async function() {
            const data = await oldLoadArticle.apply(this, arguments);
            if (data && data.data) setIdsFromData(data.data);
            return data;
        };
    }

    // 显示举报模态框
    if (reportBtn) {
        reportBtn.onclick = function() {
            if (reportModal) reportModal.style.display = 'block';
        };
    }
    // 关闭举报模态框
    if (reportClose) {
        reportClose.onclick = function() {
            if (reportModal) reportModal.style.display = 'none';
        };
    }
    if (reportCancel) {
        reportCancel.onclick = function() {
            if (reportModal) reportModal.style.display = 'none';
        };
    }
    // 提交举报
    if (reportForm) {
        reportForm.onsubmit = async function(e) {
            e.preventDefault();
            const reasonType = document.getElementById('reportReason').value;
            const reasonContent = document.getElementById('reportDetails').value.trim();
            const csrfToken = getCookie('csrf_token');
            if (!reasonType || !reasonContent) {
                alert('请填写举报原因和详细说明');
                return;
            }
            if (!articleId || !authorId) {
                alert('无法获取文章信息，请刷新页面重试');
                return;
            }
            try {
                const res = await fetch('/api/reports', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': csrfToken
                    },
                    body: JSON.stringify({
                        article_id: articleId,
                        reported_user_id: authorId,
                        reason_type: reasonType,
                        reason_content: reasonContent
                    })
                });
                const data = await res.json();
                alert(data.message || (data.success ? '举报成功' : '举报失败'));
                if (data.success) {
                    if (reportModal) reportModal.style.display = 'none';
                    reportForm.reset();
                }
            } catch (err) {
                alert('举报失败，请稍后重试');
            }
        };
    }

    // 事件绑定函数
    function bindReportButton() {
        const reportBtn = document.getElementById('reportBtn');
        const reportModal = document.getElementById('reportModal');
        const reportClose = document.getElementById('reportClose');
        const reportCancel = document.getElementById('reportCancel');
        const reportForm = document.getElementById('reportForm');

        // 文章ID和作者ID赋值
        function setIdsFromData(articleData) {
            articleId = articleData.article_id;
            authorId = articleData.author && articleData.author.user_id;
        }
        // 如果页面有全局变量articleData，直接赋值
        if (window.articleData) {
            setIdsFromData(window.articleData);
        }

        // 显示举报模态框
        if (reportBtn) {
            reportBtn.onclick = function() {
                if (reportModal) reportModal.style.display = 'block';
            };
        }
        // 关闭举报模态框
        if (reportClose) {
            reportClose.onclick = function() {
                if (reportModal) reportModal.style.display = 'none';
            };
        }
        if (reportCancel) {
            reportCancel.onclick = function() {
                if (reportModal) reportModal.style.display = 'none';
            };
        }
        // 提交举报
        if (reportForm) {
            reportForm.onsubmit = async function(e) {
                e.preventDefault();
                const reasonType = document.getElementById('reportReason').value;
                const reasonContent = document.getElementById('reportDetails').value.trim();
                const csrfToken = getCookie('csrf_token');
                if (!reasonType || !reasonContent) {
                    alert('请填写举报原因和详细说明');
                    return;
                }
                if (!articleId || !authorId) {
                    alert('无法获取文章信息，请刷新页面重试');
                    return;
                }
                try {
                    const res = await fetch('/api/reports', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRFToken': csrfToken
                        },
                        body: JSON.stringify({
                            article_id: articleId,
                            reported_user_id: authorId,
                            reason_type: reasonType,
                            reason_content: reasonContent
                        })
                    });
                    const data = await res.json();
                    alert(data.message || (data.success ? '举报成功' : '举报失败'));
                    if (data.success) {
                        if (reportModal) reportModal.style.display = 'none';
                        reportForm.reset();
                    }
                } catch (err) {
                    alert('举报失败，请稍后重试');
                }
            };
        }
    }

    // 延迟绑定，确保元素已渲染
    setTimeout(function() {
        // 如果authorId无效，禁用举报按钮
        if (!window.authorId) {
            const reportBtn = document.getElementById('reportBtn');
            if (reportBtn) {
                reportBtn.disabled = true;
                reportBtn.title = '该文章作者信息异常，无法举报';
            }
        }
        bindReportButton();
    }, 200);
}); 