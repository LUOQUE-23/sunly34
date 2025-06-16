document.addEventListener('DOMContentLoaded', function() {
    // 检查登录状态
    checkLoginStatus();
    // 加载用户信息
    loadUserProfile();
    // 加载我的文章
    loadUserArticles();
    // 绑定标签页切换事件
    bindTabEvents();
    // 绑定加载更多按钮事件
    bindLoadMoreEvents();
    // 绑定退出登录事件
    bindLogout();

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

// 检查登录状态
function checkLoginStatus() {
    fetch('/api/user/status')
        .then(res => res.json())
        .then(data => {
            const userMenu = document.querySelector('.user-menu');
            if (data.code === 0 && data.data) {
                // 已登录
                if (userMenu) {
                    userMenu.classList.remove('hidden');
                    userMenu.querySelector('.username').textContent = data.data.username;
                    // 管理后台权限
                    const adminLink = userMenu.querySelector('.admin-link');
                    if (adminLink) {
                        if (data.data.role === '文判') {
                            adminLink.classList.remove('hidden');
                        } else {
                            adminLink.classList.add('hidden');
                        }
                    }
                }
            } else {
                // 未登录
                if (userMenu) userMenu.classList.add('hidden');
                // 未登录时重定向到首页
                window.location.href = '/';
            }
        });
}

// 更新用户信息显示
function updateUserInfo(user) {
    // 更新头像
    const avatarSpan = document.querySelector('.avatar span');
    avatarSpan.textContent = user.username.charAt(0).toUpperCase();
    
    // 更新用户名和角色
    const usernameEl = document.querySelector('.user-info h2');
    const roleEl = document.querySelector('.user-info .role');
    const bioEl = document.querySelector('.user-info .bio');
    usernameEl.textContent = user.username;
    roleEl.textContent = user.role;
    bioEl.textContent = user.bio || '这个人很懒，什么都没写~';
    
    // 更新统计数据
    document.getElementById('articles-count').textContent = user.articles_count || 0;
    document.getElementById('likes-count').textContent = user.total_likes || 0;
    document.getElementById('favorites-count').textContent = user.favorites_count || 0;
    
    // 更新导航栏用户名
    document.querySelector('.header .username').textContent = user.username;
    
    // 如果是管理员，显示管理后台链接
    if (user.role === '文判') {
        const adminLink = document.querySelector('.admin-link');
        if (adminLink) {
            adminLink.classList.remove('hidden');
        }
    }
}

// 加载初始数据
function loadInitialData() {
    loadArticles();
    loadComments();
    loadLikes();
    loadFavorites();
}

// 绑定标签页切换事件
function bindTabEvents() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // 移除所有按钮的active类
            tabButtons.forEach(btn => btn.classList.remove('active'));
            // 添加当前按钮的active类
            button.classList.add('active');
            
            // 隐藏所有内容
            tabContents.forEach(content => content.classList.remove('active'));
            // 显示对应内容
            const targetId = button.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');
        });
    });
}

// 绑定加载更多按钮事件
function bindLoadMoreEvents() {
    const loadMoreBtn = document.getElementById('load-more-articles');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', loadMoreArticles);
    }
    // 如有其他加载更多按钮，按需添加
}

// 加载文章列表
let articlesPage = 1;
async function loadArticles() {
    try {
        const response = await fetch(`/api/user/articles?page=${articlesPage}&per_page=10`);
        const data = await response.json();
        
        if (data.code === 0) {
            const articlesList = document.querySelector('.articles-list');
            articlesList.innerHTML = ''; // 清空列表
            
            data.data.items.forEach(article => {
                const articleCard = createArticleCard(article);
                articlesList.appendChild(articleCard);
            });
            
            // 更新加载更多按钮状态
            document.getElementById('load-more-articles').style.display = 
                data.data.has_more ? 'block' : 'none';
        }
    } catch (error) {
        console.error('加载文章列表失败:', error);
        alert('加载文章列表失败，请重试');
    }
}

// 加载更多文章
async function loadMoreArticles() {
    articlesPage++;
    try {
        const response = await fetch(`/api/user/articles?page=${articlesPage}&per_page=10`);
        const data = await response.json();
        
        if (data.code === 0) {
            const articlesList = document.querySelector('.articles-list');
            
            data.data.items.forEach(article => {
                const articleCard = createArticleCard(article);
                articlesList.appendChild(articleCard);
            });
            
            // 更新加载更多按钮状态
            document.getElementById('load-more-articles').style.display = 
                data.data.has_more ? 'block' : 'none';
        }
    } catch (error) {
        console.error('加载更多文章失败:', error);
        alert('加载更多文章失败，请重试');
    }
}

// 创建文章卡片
function createArticleCard(article) {
    const card = document.createElement('div');
    card.className = 'article-card';
    card.innerHTML = `
        <h3><a href="/article/${article.article_id}">${article.title}</a></h3>
        <div class="article-meta">
            <span>${article.category}</span>
            <span>${article.created_at}</span>
            <span>${article.likes} 赞</span>
            <span>${article.comments} 评论</span>
        </div>
        <div class="article-content">${article.content.substring(0, 200)}...</div>
    `;
    return card;
}

// 加载评论列表
let commentsPage = 1;
async function loadComments() {
    try {
        const response = await fetch(`/api/user/comments?page=${commentsPage}&per_page=10`);
        const data = await response.json();
        
        if (data.code === 0) {
            const commentsList = document.querySelector('.comments-list');
            commentsList.innerHTML = ''; // 清空列表
            
            data.data.items.forEach(comment => {
                const commentCard = createCommentCard(comment);
                commentsList.appendChild(commentCard);
            });
            
            // 更新加载更多按钮状态
            document.getElementById('load-more-comments').style.display = 
                data.data.has_more ? 'block' : 'none';
        }
    } catch (error) {
        console.error('加载评论列表失败:', error);
        alert('加载评论列表失败，请重试');
    }
}

// 加载更多评论
async function loadMoreComments() {
    commentsPage++;
    try {
        const response = await fetch(`/api/user/comments?page=${commentsPage}&per_page=10`);
        const data = await response.json();
        
        if (data.code === 0) {
            const commentsList = document.querySelector('.comments-list');
            
            data.data.items.forEach(comment => {
                const commentCard = createCommentCard(comment);
                commentsList.appendChild(commentCard);
            });
            
            // 更新加载更多按钮状态
            document.getElementById('load-more-comments').style.display = 
                data.data.has_more ? 'block' : 'none';
        }
    } catch (error) {
        console.error('加载更多评论失败:', error);
        alert('加载更多评论失败，请重试');
    }
}

// 创建评论卡片
function createCommentCard(comment) {
    const card = document.createElement('div');
    card.className = 'comment-card';
    card.innerHTML = `
        <div class="comment-meta">
            <span>评论于 ${comment.created_at}</span>
            <span>文章：<a href="/article/${comment.article_id}">${comment.article_title}</a></span>
        </div>
        <div class="comment-content">${comment.content}</div>
    `;
    return card;
}

// 加载点赞列表
let likesPage = 1;
async function loadLikes() {
    try {
        const response = await fetch(`/api/user/likes?page=${likesPage}&per_page=10`);
        const data = await response.json();
        
        if (data.code === 0) {
            const likesList = document.querySelector('.likes-list');
            likesList.innerHTML = ''; // 清空列表
            
            data.data.items.forEach(like => {
                const likeCard = createLikeCard(like);
                likesList.appendChild(likeCard);
            });
            
            // 更新加载更多按钮状态
            document.getElementById('load-more-likes').style.display = 
                data.data.has_more ? 'block' : 'none';
        }
    } catch (error) {
        console.error('加载点赞列表失败:', error);
        alert('加载点赞列表失败，请重试');
    }
}

// 加载更多点赞
async function loadMoreLikes() {
    likesPage++;
    try {
        const response = await fetch(`/api/user/likes?page=${likesPage}&per_page=10`);
        const data = await response.json();
        
        if (data.code === 0) {
            const likesList = document.querySelector('.likes-list');
            
            data.data.items.forEach(like => {
                const likeCard = createLikeCard(like);
                likesList.appendChild(likeCard);
            });
            
            // 更新加载更多按钮状态
            document.getElementById('load-more-likes').style.display = 
                data.data.has_more ? 'block' : 'none';
        }
    } catch (error) {
        console.error('加载更多点赞失败:', error);
        alert('加载更多点赞失败，请重试');
    }
}

// 创建点赞卡片
function createLikeCard(like) {
    const card = document.createElement('div');
    card.className = 'like-card';
    card.innerHTML = `
        <h3><a href="/article/${like.article_id}">${like.article_title}</a></h3>
        <div class="like-meta">
            <span>点赞于 ${like.created_at}</span>
            <span>作者：${like.author_name}</span>
        </div>
    `;
    return card;
}

// 加载收藏列表
let favoritesPage = 1;
async function loadFavorites() {
    try {
        const response = await fetch(`/api/user/favorites?page=${favoritesPage}&per_page=10`);
        const data = await response.json();
        
        if (data.code === 0) {
            const favoritesList = document.querySelector('.favorites-list');
            favoritesList.innerHTML = ''; // 清空列表
            
            data.data.items.forEach(favorite => {
                const favoriteCard = createFavoriteCard(favorite);
                favoritesList.appendChild(favoriteCard);
            });
            
            // 更新加载更多按钮状态
            document.getElementById('load-more-favorites').style.display = 
                data.data.has_more ? 'block' : 'none';
        }
    } catch (error) {
        console.error('加载收藏列表失败:', error);
        alert('加载收藏列表失败，请重试');
    }
}

// 加载更多收藏
async function loadMoreFavorites() {
    favoritesPage++;
    try {
        const response = await fetch(`/api/user/favorites?page=${favoritesPage}&per_page=10`);
        const data = await response.json();
        
        if (data.code === 0) {
            const favoritesList = document.querySelector('.favorites-list');
            
            data.data.items.forEach(favorite => {
                const favoriteCard = createFavoriteCard(favorite);
                favoritesList.appendChild(favoriteCard);
            });
            
            // 更新加载更多按钮状态
            document.getElementById('load-more-favorites').style.display = 
                data.data.has_more ? 'block' : 'none';
        }
    } catch (error) {
        console.error('加载更多收藏失败:', error);
        alert('加载更多收藏失败，请重试');
    }
}

// 创建收藏卡片
function createFavoriteCard(favorite) {
    const card = document.createElement('div');
    card.className = 'favorite-card';
    card.innerHTML = `
        <h3><a href="/article/${favorite.article_id}">${favorite.article_title}</a></h3>
        <div class="favorite-meta">
            <span>收藏于 ${favorite.created_at}</span>
            <span>作者：${favorite.author_name}</span>
            <span>${favorite.likes} 赞</span>
            <span>${favorite.comments} 评论</span>
        </div>
    `;
    return card;
}

function bindLogout() {
    const logoutBtn = document.getElementById('logout-btn');
    const logoutModal = document.getElementById('logout-modal');
    const cancelLogout = document.getElementById('cancel-logout');
    const confirmLogout = document.getElementById('confirm-logout');
    
    // 如果有一个元素不存在，直接返回，不绑定事件
    if (!logoutBtn || !logoutModal || !cancelLogout || !confirmLogout) {
        console.log('退出登录相关元素未找到，跳过事件绑定');
        return;
    }

    logoutBtn.addEventListener('click', () => {
        logoutModal.classList.add('active');
    });
    
    cancelLogout.addEventListener('click', () => {
        logoutModal.classList.remove('active');
    });
    
    confirmLogout.addEventListener('click', async () => {
        try {
            const response = await fetch('/logout', {
                method: 'POST'
            });
            const data = await response.json();
            
            if (data.code === 0) {
                window.location.href = '/login';
            } else {
                alert(data.message || '退出失败');
            }
        } catch (error) {
            console.error('退出登录失败:', error);
            alert('退出失败，请重试');
        }
    });
}

function loadUserProfile() {
    fetch('/api/user/profile')
        .then(res => res.json())
        .then(data => {
            if (data.code === 0) {
                const user = data.data;
                // 用户名
                const usernameEl = document.getElementById('profileUsername');
                if (usernameEl) usernameEl.textContent = user.username;
                // 获赞数
                const likeCountEl = document.getElementById('likeCount');
                if (likeCountEl) likeCountEl.textContent = user.like_count || 0;
                // 评论数
                const commentCountEl = document.getElementById('commentCount');
                if (commentCountEl) commentCountEl.textContent = user.comment_count || 0;
                // 文章数
                const articleCountEl = document.getElementById('articleCount');
                if (articleCountEl) articleCountEl.textContent = user.article_count || 0;
                // 头像
                const avatarEl = document.getElementById('avatar');
                if (avatarEl && user.avatar) avatarEl.src = user.avatar;
            }
        });
}

function loadUserArticles(page = 1) {
    fetch(`/api/user/articles?page=${page}&per_page=10`)
        .then(res => res.json())
        .then(data => {
            if (data.code === 0) {
                const list = data.data.items;
                const container = document.getElementById('myArticlesList');
                container.innerHTML = '';
                if (list.length === 0) {
                    container.innerHTML = '<div style="color:#888;text-align:center;">暂无文章</div>';
                    return;
                }
                list.forEach(article => {
                    const div = document.createElement('div');
                    div.className = 'article-card';
                    div.innerHTML = `
                        <h3 class="article-title"><a href="/article/${article.article_id}">${article.title}</a></h3>
                        <div class="article-meta">
                            <span class="article-category">${article.category || '未分类'}</span>
                            <span class="article-date">${article.created_at}</span>
                            <span class="article-likes">👍 ${article.likes}</span>
                            <span class="article-comments">💬 ${article.comments}</span>
                        </div>
                        <div class="article-content">${article.content}...</div>
                    `;
                    container.appendChild(div);
                });
            }
        });
}

// 收藏Tab切换
const tabs = document.querySelectorAll('.profile-tabs .tab-item');
const tabContents = {
    articles: document.getElementById('articlesTab'),
    comments: document.getElementById('commentsTab'),
    favorites: document.getElementById('favoritesTab')
};
tabs.forEach(tab => {
    tab.addEventListener('click', function() {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        Object.values(tabContents).forEach(tc => tc.style.display = 'none');
        tabContents[tab.dataset.tab].style.display = '';
        if(tab.dataset.tab === 'favorites') loadFavorites();
    });
});

// 加载收藏列表
function loadFavorites(page = 1) {
    fetch(`/api/user/favorites?page=${page}&per_page=10`)
        .then(res => res.json())
        .then(data => {
            if (data.code === 0) {
                const list = data.data.items;
                const container = document.getElementById('myFavoritesList');
                container.innerHTML = '';
                if (list.length === 0) {
                    container.innerHTML = '<div style="color:#888;text-align:center;">暂无收藏</div>';
                    return;
                }
                list.forEach(article => {
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
            }
        });
}

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