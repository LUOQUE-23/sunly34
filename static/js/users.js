// 全局变量
let currentPage = 1;
let hasMore = true;
let currentFilters = {
    search: '',
    role: '',
    status: '',
    sortBy: 'created_at'
};

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    checkLoginStatus();
    loadUsers();
    bindEvents();
});

// 检查登录状态
async function checkLoginStatus() {
    try {
        const response = await fetch('/api/user');
        const data = await response.json();
        
        if (data.code === 0) {
            document.getElementById('username').textContent = data.data.username;
            if (data.data.role === '文判') {
                document.querySelector('a[href="/admin"]').style.display = 'block';
            }
        } else {
            window.location.href = '/login';
        }
    } catch (error) {
        console.error('检查登录状态失败:', error);
        window.location.href = '/login';
    }
}

// 加载用户列表
async function loadUsers(append = false) {
    try {
        const queryParams = new URLSearchParams({
            page: currentPage,
            per_page: 10,
            ...currentFilters
        });

        const response = await fetch(`/api/users?${queryParams}`);
        const data = await response.json();

        if (data.code === 0) {
            const usersList = document.getElementById('usersList');
            
            if (!append) {
                usersList.innerHTML = '';
            }

            data.data.items.forEach(user => {
                usersList.appendChild(createUserCard(user));
            });

            hasMore = data.data.has_more;
            document.getElementById('loadMoreBtn').style.display = hasMore ? 'block' : 'none';
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('加载用户列表失败:', error);
        alert('加载用户列表失败，请稍后重试');
    }
}

// 创建用户卡片
function createUserCard(user) {
    const card = document.createElement('div');
    card.className = 'user-card';
    card.innerHTML = `
        <div class="user-info">
            <img src="${user.avatar || '/static/images/default-avatar.png'}" alt="${user.username}" class="avatar">
            <div class="user-details">
                <div class="username">${user.username}</div>
                <div class="user-meta">
                    <span>${user.role}</span>
                    <span>${user.status === 'active' ? '正常' : '禁用'}</span>
                    <span>注册于 ${formatDate(user.created_at)}</span>
                </div>
            </div>
        </div>
        <div class="user-stats">
            <div class="stat-item">
                <span class="stat-value">${user.articles_count}</span>
                <span class="stat-label">文章</span>
            </div>
            <div class="stat-item">
                <span class="stat-value">${user.comments_count}</span>
                <span class="stat-label">评论</span>
            </div>
            <div class="stat-item">
                <span class="stat-value">${user.likes_count}</span>
                <span class="stat-label">获赞</span>
            </div>
        </div>
        <div class="user-actions">
            <button class="action-btn edit-btn" onclick="showEditUserModal(${user.id})">编辑</button>
            <button class="action-btn delete-btn" onclick="showDeleteModal(${user.id})">删除</button>
        </div>
    `;
    return card;
}

// 绑定事件
function bindEvents() {
    // 搜索框回车事件
    document.getElementById('searchInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchUsers();
        }
    });
}

// 搜索用户
function searchUsers() {
    currentFilters.search = document.getElementById('searchInput').value;
    currentPage = 1;
    loadUsers();
}

// 筛选用户
function filterUsers() {
    currentFilters.role = document.getElementById('roleFilter').value;
    currentFilters.status = document.getElementById('statusFilter').value;
    currentFilters.sortBy = document.getElementById('sortBy').value;
    currentPage = 1;
    loadUsers();
}

// 加载更多用户
function loadMoreUsers() {
    if (hasMore) {
        currentPage++;
        loadUsers(true);
    }
}

// 显示添加用户模态框
function showAddUserModal() {
    document.getElementById('modalTitle').textContent = '添加用户';
    document.getElementById('userForm').reset();
    document.getElementById('userId').value = '';
    document.getElementById('password').required = true;
    document.getElementById('userModal').style.display = 'block';
}

// 显示编辑用户模态框
async function showEditUserModal(userId) {
    try {
        const response = await fetch(`/api/users/${userId}`);
        const data = await response.json();

        if (data.code === 0) {
            const user = data.data;
            document.getElementById('modalTitle').textContent = '编辑用户';
            document.getElementById('userId').value = user.id;
            document.getElementById('username').value = user.username;
            document.getElementById('email').value = user.email;
            document.getElementById('role').value = user.role;
            document.getElementById('status').value = user.status;
            document.getElementById('password').required = false;
            document.getElementById('userModal').style.display = 'block';
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('获取用户信息失败:', error);
        alert('获取用户信息失败，请稍后重试');
    }
}

// 隐藏用户模态框
function hideUserModal() {
    document.getElementById('userModal').style.display = 'none';
}

// 保存用户
async function saveUser(event) {
    event.preventDefault();

    const userId = document.getElementById('userId').value;
    const formData = {
        username: document.getElementById('username').value,
        email: document.getElementById('email').value,
        role: document.getElementById('role').value,
        status: document.getElementById('status').value
    };

    const password = document.getElementById('password').value;
    if (password) {
        formData.password = password;
    }

    try {
        const url = userId ? `/api/users/${userId}` : '/api/users';
        const method = userId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (data.code === 0) {
            alert(userId ? '更新用户成功' : '添加用户成功');
            hideUserModal();
            loadUsers();
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('保存用户失败:', error);
        alert('保存用户失败，请稍后重试');
    }
}

// 显示删除确认模态框
function showDeleteModal(userId) {
    document.getElementById('deleteModal').style.display = 'block';
    document.getElementById('deleteModal').dataset.userId = userId;
}

// 隐藏删除确认模态框
function hideDeleteModal() {
    document.getElementById('deleteModal').style.display = 'none';
}

// 确认删除用户
async function confirmDelete() {
    const userId = document.getElementById('deleteModal').dataset.userId;

    try {
        const response = await fetch(`/api/users/${userId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.code === 0) {
            alert('删除用户成功');
            hideDeleteModal();
            loadUsers();
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('删除用户失败:', error);
        alert('删除用户失败，请稍后重试');
    }
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

// 退出登录
function logout() {
    fetch('/api/logout', {
        method: 'POST'
    }).then(() => {
        window.location.href = '/login';
    }).catch(error => {
        console.error('退出登录失败:', error);
        alert('退出登录失败，请稍后重试');
    });
} 