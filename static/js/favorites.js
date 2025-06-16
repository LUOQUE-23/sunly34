document.addEventListener('DOMContentLoaded', function() {
    // 用户菜单逻辑
    fetch('/api/user/status')
        .then(res => res.json())
        .then(data => {
            if (data.code === 0 && data.data) {
                const userMenu = document.querySelector('.user-menu');
                const usernameSpan = userMenu.querySelector('.username');
                usernameSpan.textContent = data.data.username;
                userMenu.classList.remove('hidden');
                
                // 管理后台权限
                const adminLink = userMenu.querySelector('.admin-link');
                if (adminLink) {
                    if (data.data.role === '文判') {
                        adminLink.classList.remove('hidden');
                    } else {
                        adminLink.classList.add('hidden');
                    }
                }
                // 下拉菜单逻辑
                usernameSpan.addEventListener('click', function(e) {
                    e.stopPropagation();
                    userMenu.classList.toggle('open');
                });
                document.addEventListener('click', function() {
                    userMenu.classList.remove('open');
                });
                // 退出登录
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
        });

    function loadFavorites(page = 1) {
        fetch(`/api/user/favorites?page=${page}&per_page=10`)
            .then(res => res.json())
            .then(data => {
                const container = document.getElementById('favoritesList');
                container.innerHTML = '';
                if (data.code !== 0 || !data.data.items || data.data.items.length === 0) {
                    container.innerHTML = '<div style="color:#888;text-align:center;">暂无收藏</div>';
                    return;
                }
                data.data.items.forEach(article => {
                    const div = document.createElement('div');
                    div.className = 'article-card';
                    div.innerHTML = `
                        <h3 class="article-title"><a href="/article/${article.article_id}">${article.title}</a></h3>
                        <div class="article-meta">
                            <span class="article-author">作者：${article.author_name}</span>
                            <span class="article-date">${article.created_at}</span>
                            <span class="article-likes">👍 ${article.likes}</span>
                            <span class="article-comments">💬 ${article.comments}</span>
                        </div>
                    `;
                    container.appendChild(div);
                });
            });
    }
    loadFavorites();
}); 