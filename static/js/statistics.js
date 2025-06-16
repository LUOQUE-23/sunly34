// 全局变量
let startDate = '';
let endDate = '';

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', () => {
    checkLoginStatus();
    initDateRange();
    loadStatistics();
    bindEvents();
});

// 检查登录状态
async function checkLoginStatus() {
    try {
        const response = await fetch('/api/user/current');
        const data = await response.json();
        
        if (!data.success) {
            window.location.href = '/login';
            return;
        }
        
        if (data.user.role !== '文判') {
            window.location.href = '/';
            return;
        }
    } catch (error) {
        console.error('检查登录状态失败:', error);
        window.location.href = '/login';
    }
}

// 初始化日期范围
function initDateRange() {
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
    
    startDate = formatDate(lastMonth);
    endDate = formatDate(today);
    
    document.getElementById('start-date').value = startDate;
    document.getElementById('end-date').value = endDate;
}

// 格式化日期
function formatDate(date) {
    return date.toISOString().split('T')[0];
}

// 绑定事件
function bindEvents() {
    // 日期范围变化
    document.getElementById('start-date').addEventListener('change', (e) => {
        startDate = e.target.value;
        loadStatistics();
    });
    
    document.getElementById('end-date').addEventListener('change', (e) => {
        endDate = e.target.value;
        loadStatistics();
    });
    
    // 查询按钮点击
    document.getElementById('query-btn').addEventListener('click', loadStatistics);
}

// 加载统计数据
async function loadStatistics() {
    try {
        const response = await fetch(`/api/statistics?start_date=${startDate}&end_date=${endDate}`);
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message);
        }
        
        updateOverviewStats(data.overview);
        updateArticleStats(data.articles);
        updateCommentStats(data.comments);
        updateUserStats(data.users);
        updateCategoryStats(data.categories);
        updateTrendStats(data.trends);
    } catch (error) {
        console.error('加载统计数据失败:', error);
        alert('加载统计数据失败，请稍后重试');
    }
}

// 更新概览统计
function updateOverviewStats(stats) {
    document.getElementById('total-articles').textContent = stats.total_articles;
    document.getElementById('total-comments').textContent = stats.total_comments;
    document.getElementById('total-users').textContent = stats.total_users;
    document.getElementById('total-likes').textContent = stats.total_likes;
}

// 更新文章统计
function updateArticleStats(stats) {
    document.getElementById('published-articles').textContent = stats.published;
    document.getElementById('draft-articles').textContent = stats.draft;
    document.getElementById('hidden-articles').textContent = stats.hidden;
    
    // 更新文章趋势图表
    const chart = echarts.init(document.getElementById('article-trend-chart'));
    const option = {
        title: {
            text: '文章发布趋势'
        },
        tooltip: {
            trigger: 'axis'
        },
        xAxis: {
            type: 'category',
            data: stats.trend.dates
        },
        yAxis: {
            type: 'value'
        },
        series: [{
            name: '发布数量',
            type: 'line',
            data: stats.trend.counts,
            smooth: true,
            areaStyle: {}
        }]
    };
    chart.setOption(option);
}

// 更新评论统计
function updateCommentStats(stats) {
    document.getElementById('approved-comments').textContent = stats.approved;
    document.getElementById('pending-comments').textContent = stats.pending;
    document.getElementById('rejected-comments').textContent = stats.rejected;
    
    // 更新评论趋势图表
    const chart = echarts.init(document.getElementById('comment-trend-chart'));
    const option = {
        title: {
            text: '评论趋势'
        },
        tooltip: {
            trigger: 'axis'
        },
        xAxis: {
            type: 'category',
            data: stats.trend.dates
        },
        yAxis: {
            type: 'value'
        },
        series: [{
            name: '评论数量',
            type: 'line',
            data: stats.trend.counts,
            smooth: true,
            areaStyle: {}
        }]
    };
    chart.setOption(option);
}

// 更新用户统计
function updateUserStats(stats) {
    document.getElementById('active-users').textContent = stats.active;
    document.getElementById('new-users').textContent = stats.new;
    document.getElementById('inactive-users').textContent = stats.inactive;
    
    // 更新用户趋势图表
    const chart = echarts.init(document.getElementById('user-trend-chart'));
    const option = {
        title: {
            text: '用户增长趋势'
        },
        tooltip: {
            trigger: 'axis'
        },
        xAxis: {
            type: 'category',
            data: stats.trend.dates
        },
        yAxis: {
            type: 'value'
        },
        series: [{
            name: '新增用户',
            type: 'line',
            data: stats.trend.counts,
            smooth: true,
            areaStyle: {}
        }]
    };
    chart.setOption(option);
}

// 更新分类统计
function updateCategoryStats(stats) {
    document.getElementById('total-categories').textContent = stats.total;
    document.getElementById('active-categories').textContent = stats.active;
    document.getElementById('disabled-categories').textContent = stats.disabled;
    
    // 更新分类分布图表
    const chart = echarts.init(document.getElementById('category-dist-chart'));
    const option = {
        title: {
            text: '分类文章分布'
        },
        tooltip: {
            trigger: 'item'
        },
        series: [{
            name: '文章数量',
            type: 'pie',
            radius: '50%',
            data: stats.distribution.map(item => ({
                name: item.name,
                value: item.count
            }))
        }]
    };
    chart.setOption(option);
}

// 更新趋势统计
function updateTrendStats(stats) {
    document.getElementById('article-growth').textContent = `${stats.article_growth}%`;
    document.getElementById('comment-growth').textContent = `${stats.comment_growth}%`;
    document.getElementById('user-growth').textContent = `${stats.user_growth}%`;
}

// 退出登录
function logout() {
    fetch('/api/auth/logout', {
        method: 'POST'
    }).then(() => {
        window.location.href = '/login';
    }).catch(error => {
        console.error('退出登录失败:', error);
    });
} 