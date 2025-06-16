// 全局变量
let currentPage = 1;
let hasMore = true;
let currentFilters = {
    search: '',
    status: '',
    sortBy: 'name'
};

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    // 检查登录状态
    checkLoginStatus();
    
    // 加载分类列表
    loadCategories();
    
    // 绑定事件监听器
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

// 加载分类列表
async function loadCategories(append = false) {
    try {
        const queryParams = new URLSearchParams({
            page: currentPage,
            per_page: 12,
            ...currentFilters
        });

        const response = await fetch(`/api/categories?${queryParams}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('分类数据:', data); // 调试日志

        if (data.code === 0) {
            const categoriesList = document.getElementById('categoriesList');
            
            if (!append) {
                categoriesList.innerHTML = '';
            }

            data.data.items.forEach(category => {
                const card = createCategoryCard(category);
                categoriesList.appendChild(card);
            });

            hasMore = data.data.has_more;
            const loadMoreBtn = document.getElementById('loadMoreBtn');
            if (loadMoreBtn) {
                loadMoreBtn.style.display = hasMore ? 'block' : 'none';
            }
        } else {
            showNotification(data.message || '加载分类失败', 'error');
        }
    } catch (error) {
        console.error('加载分类列表失败:', error);
        showNotification('加载分类列表失败，请稍后重试', 'error');
    }
}

// 创建分类卡片
function createCategoryCard(category) {
    const card = document.createElement('div');
    card.className = 'category-card';
    card.innerHTML = `
        <div class="category-header">
            <h3 class="category-name">${category.name}</h3>
            <span class="category-status ${category.status}">${category.status === 'active' ? '正常' : '禁用'}</span>
        </div>
        <p class="category-description">${category.description || '暂无描述'}</p>
        <div class="category-footer">
            <span class="category-date">创建于 ${new Date(category.created_at).toLocaleDateString()}</span>
            <div class="category-actions">
                <button onclick="showEditCategoryModal(${category.id})" class="edit-btn">编辑</button>
                <button onclick="showDeleteModal(${category.id})" class="delete-btn">删除</button>
            </div>
        </div>
    `;
    return card;
}

// 绑定事件
function bindEvents() {
    // 搜索框回车事件
    document.getElementById('searchInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchCategories();
        }
    });
}

// 搜索分类
function searchCategories() {
    const searchInput = document.getElementById('searchInput');
    currentFilters.search = searchInput.value;
    currentPage = 1;
    loadCategories();
}

// 筛选分类
function filterCategories() {
    const statusFilter = document.getElementById('statusFilter');
    const sortBy = document.getElementById('sortBy');
    
    currentFilters = {
        status: statusFilter.value,
        sort_by: sortBy.value
    };
    
    currentPage = 1;
    loadCategories();
}

// 加载更多分类
function loadMoreCategories() {
    if (hasMore) {
        currentPage++;
        loadCategories(true);
    }
}

// 显示添加分类模态框
function showAddCategoryModal() {
    document.getElementById('modalTitle').textContent = '添加分类';
    document.getElementById('categoryForm').reset();
    document.getElementById('categoryId').value = '';
    document.getElementById('categoryModal').style.display = 'block';
}

// 显示编辑分类模态框
async function showEditCategoryModal(categoryId) {
    try {
        const response = await fetch(`/api/categories/${categoryId}`);
        const data = await response.json();

        if (data.code === 0) {
            const category = data.data;
            document.getElementById('modalTitle').textContent = '编辑分类';
            document.getElementById('categoryId').value = category.id;
            document.getElementById('name').value = category.name;
            document.getElementById('description').value = category.description || '';
            document.getElementById('status').value = category.status;
            document.getElementById('categoryModal').style.display = 'block';
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('获取分类信息失败:', error);
        alert('获取分类信息失败，请稍后重试');
    }
}

// 隐藏分类模态框
function hideCategoryModal() {
    document.getElementById('categoryModal').style.display = 'none';
}

// 保存分类
async function saveCategory(event) {
    event.preventDefault();

    const categoryId = document.getElementById('categoryId').value;
    const formData = {
        name: document.getElementById('name').value,
        description: document.getElementById('description').value,
        status: document.getElementById('status').value
    };

    try {
        const url = categoryId ? `/api/categories/${categoryId}` : '/api/categories';
        const method = categoryId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (data.code === 0) {
            alert(categoryId ? '更新分类成功' : '添加分类成功');
            hideCategoryModal();
            loadCategories();
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('保存分类失败:', error);
        alert('保存分类失败，请稍后重试');
    }
}

// 显示删除确认模态框
function showDeleteModal(categoryId) {
    document.getElementById('deleteModal').style.display = 'block';
    document.getElementById('deleteModal').dataset.categoryId = categoryId;
}

// 隐藏删除确认模态框
function hideDeleteModal() {
    document.getElementById('deleteModal').style.display = 'none';
}

// 确认删除分类
async function confirmDelete() {
    const categoryId = document.getElementById('deleteModal').dataset.categoryId;

    try {
        const response = await fetch(`/api/categories/${categoryId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.code === 0) {
            alert('删除分类成功');
            hideDeleteModal();
            loadCategories();
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('删除分类失败:', error);
        alert('删除分类失败，请稍后重试');
    }
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