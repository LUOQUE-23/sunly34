document.addEventListener('DOMContentLoaded', function() {
    // 检查登录状态
    checkLoginStatus();
    
    // 绑定导航按钮事件
    bindNavEvents();
    
    // 绑定表单提交事件
    bindFormEvents();
    
    // 加载设置
    loadSettings();
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

// 加载设置
async function loadSettings() {
    try {
        const response = await fetch('/api/settings');
        const data = await response.json();

        if (data.code === 0) {
            const settings = data.data;
            
            // 基本设置
            document.getElementById('siteName').value = settings.site_name || '';
            document.getElementById('siteDescription').value = settings.site_description || '';
            document.getElementById('siteKeywords').value = settings.site_keywords || '';
            if (settings.site_logo) {
                document.getElementById('logoPreview').innerHTML = `<img src="${settings.site_logo}" alt="Logo">`;
            }
            if (settings.site_favicon) {
                document.getElementById('faviconPreview').innerHTML = `<img src="${settings.site_favicon}" alt="Favicon">`;
            }

            // 文章设置
            document.getElementById('articlePageSize').value = settings.article_page_size || 10;
            document.getElementById('commentPageSize').value = settings.comment_page_size || 20;
            document.getElementById('defaultArticleStatus').value = settings.default_article_status || 'draft';
            document.getElementById('defaultCommentStatus').value = settings.default_comment_status || 'pending';

            // 用户设置
            document.getElementById('allowRegistration').value = settings.allow_registration ? '1' : '0';
            document.getElementById('defaultUserRole').value = settings.default_user_role || 'user';
            document.getElementById('defaultUserStatus').value = settings.default_user_status || 'active';

            // 邮件设置
            document.getElementById('smtpServer').value = settings.smtp_server || '';
            document.getElementById('smtpPort').value = settings.smtp_port || '';
            document.getElementById('smtpUsername').value = settings.smtp_username || '';
            document.getElementById('smtpPassword').value = settings.smtp_password || '';
            document.getElementById('smtpFrom').value = settings.smtp_from || '';
            document.getElementById('smtpFromName').value = settings.smtp_from_name || '';
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('加载设置失败:', error);
        alert('加载设置失败，请稍后重试');
    }
}

// 更新用户信息显示
function updateUserInfo(user) {
    // 更新头像
    const avatarSpan = document.querySelector('.avatar span');
    avatarSpan.textContent = user.username.charAt(0).toUpperCase();
    
    // 更新用户名和角色
    const usernameEl = document.querySelector('.user-info h2');
    const roleEl = document.querySelector('.user-info p');
    usernameEl.textContent = user.username;
    roleEl.textContent = user.role;
    
    // 填充个人资料表单
    document.getElementById('nickname').value = user.nickname || '';
    document.getElementById('email').value = user.email || '';
    document.getElementById('bio').value = user.bio || '';
    
    // 填充通知设置
    document.getElementById('email_notifications').checked = user.email_notifications || false;
    document.getElementById('comment_notifications').checked = user.comment_notifications || false;
    document.getElementById('system_notifications').checked = user.system_notifications || false;
    
    // 填充隐私设置
    document.getElementById('show_email').checked = user.show_email || false;
    document.getElementById('show_activity').checked = user.show_activity || false;
}

// 绑定导航按钮事件
function bindNavEvents() {
    const navButtons = document.querySelectorAll('.nav-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            // 移除所有按钮的active类
            navButtons.forEach(btn => btn.classList.remove('active'));
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

// 绑定表单提交事件
function bindFormEvents() {
    // 个人资料表单
    document.getElementById('profile-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await updateProfile();
    });
    
    // 密码修改表单
    document.getElementById('password-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await updatePassword();
    });
    
    // 通知设置表单
    document.getElementById('notification-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await updateNotificationSettings();
    });
    
    // 隐私设置表单
    document.getElementById('privacy-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await updatePrivacySettings();
    });
}

// 更新个人资料
async function updateProfile() {
    const formData = {
        nickname: document.getElementById('nickname').value,
        email: document.getElementById('email').value,
        bio: document.getElementById('bio').value
    };
    
    try {
        const response = await fetch('/api/user/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        if (data.code === 0) {
            alert('个人资料更新成功');
        } else {
            alert(data.message || '更新失败');
        }
    } catch (error) {
        console.error('更新个人资料失败:', error);
        alert('更新失败，请重试');
    }
}

// 更新密码
async function updatePassword() {
    const oldPassword = document.getElementById('old_password').value;
    const newPassword = document.getElementById('new_password').value;
    const confirmPassword = document.getElementById('confirm_password').value;
    
    if (newPassword !== confirmPassword) {
        alert('两次输入的新密码不一致');
        return;
    }
    
    try {
        const response = await fetch('/api/user/password', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                old_password: oldPassword,
                new_password: newPassword
            })
        });
        
        const data = await response.json();
        if (data.code === 0) {
            alert('密码修改成功');
            document.getElementById('password-form').reset();
        } else {
            alert(data.message || '修改失败');
        }
    } catch (error) {
        console.error('修改密码失败:', error);
        alert('修改失败，请重试');
    }
}

// 更新通知设置
async function updateNotificationSettings() {
    const formData = {
        email_notifications: document.getElementById('email_notifications').checked,
        comment_notifications: document.getElementById('comment_notifications').checked,
        system_notifications: document.getElementById('system_notifications').checked
    };
    
    try {
        const response = await fetch('/api/user/notifications', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        if (data.code === 0) {
            alert('通知设置更新成功');
        } else {
            alert(data.message || '更新失败');
        }
    } catch (error) {
        console.error('更新通知设置失败:', error);
        alert('更新失败，请重试');
    }
}

// 更新隐私设置
async function updatePrivacySettings() {
    const formData = {
        show_email: document.getElementById('show_email').checked,
        show_activity: document.getElementById('show_activity').checked
    };
    
    try {
        const response = await fetch('/api/user/privacy', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        if (data.code === 0) {
            alert('隐私设置更新成功');
        } else {
            alert(data.message || '更新失败');
        }
    } catch (error) {
        console.error('更新隐私设置失败:', error);
        alert('更新失败，请重试');
    }
}

// 绑定事件
function bindEvents() {
    // 基本设置表单提交
    document.getElementById('basicSettingsForm').addEventListener('submit', function(e) {
        e.preventDefault();
        saveBasicSettings();
    });

    // 文章设置表单提交
    document.getElementById('articleSettingsForm').addEventListener('submit', function(e) {
        e.preventDefault();
        saveArticleSettings();
    });

    // 用户设置表单提交
    document.getElementById('userSettingsForm').addEventListener('submit', function(e) {
        e.preventDefault();
        saveUserSettings();
    });

    // 邮件设置表单提交
    document.getElementById('emailSettingsForm').addEventListener('submit', function(e) {
        e.preventDefault();
        saveEmailSettings();
    });

    // Logo预览
    document.getElementById('siteLogo').addEventListener('change', function(e) {
        previewImage(e.target.files[0], 'logoPreview');
    });

    // Favicon预览
    document.getElementById('siteFavicon').addEventListener('change', function(e) {
        previewImage(e.target.files[0], 'faviconPreview');
    });
}

// 预览图片
function previewImage(file, previewId) {
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById(previewId).innerHTML = `<img src="${e.target.result}" alt="Preview">`;
        };
        reader.readAsDataURL(file);
    }
}

// 保存基本设置
async function saveBasicSettings() {
    const formData = new FormData();
    formData.append('site_name', document.getElementById('siteName').value);
    formData.append('site_description', document.getElementById('siteDescription').value);
    formData.append('site_keywords', document.getElementById('siteKeywords').value);
    
    const logoFile = document.getElementById('siteLogo').files[0];
    if (logoFile) {
        formData.append('site_logo', logoFile);
    }
    
    const faviconFile = document.getElementById('siteFavicon').files[0];
    if (faviconFile) {
        formData.append('site_favicon', faviconFile);
    }

    try {
        const response = await fetch('/api/settings/basic', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        if (data.code === 0) {
            alert('保存基本设置成功');
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('保存基本设置失败:', error);
        alert('保存基本设置失败，请稍后重试');
    }
}

// 保存文章设置
async function saveArticleSettings() {
    const formData = {
        article_page_size: parseInt(document.getElementById('articlePageSize').value),
        comment_page_size: parseInt(document.getElementById('commentPageSize').value),
        default_article_status: document.getElementById('defaultArticleStatus').value,
        default_comment_status: document.getElementById('defaultCommentStatus').value
    };

    try {
        const response = await fetch('/api/settings/article', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();
        if (data.code === 0) {
            alert('保存文章设置成功');
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('保存文章设置失败:', error);
        alert('保存文章设置失败，请稍后重试');
    }
}

// 保存用户设置
async function saveUserSettings() {
    const formData = {
        allow_registration: document.getElementById('allowRegistration').value === '1',
        default_user_role: document.getElementById('defaultUserRole').value,
        default_user_status: document.getElementById('defaultUserStatus').value
    };

    try {
        const response = await fetch('/api/settings/user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();
        if (data.code === 0) {
            alert('保存用户设置成功');
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('保存用户设置失败:', error);
        alert('保存用户设置失败，请稍后重试');
    }
}

// 保存邮件设置
async function saveEmailSettings() {
    const formData = {
        smtp_server: document.getElementById('smtpServer').value,
        smtp_port: parseInt(document.getElementById('smtpPort').value),
        smtp_username: document.getElementById('smtpUsername').value,
        smtp_password: document.getElementById('smtpPassword').value,
        smtp_from: document.getElementById('smtpFrom').value,
        smtp_from_name: document.getElementById('smtpFromName').value
    };

    try {
        const response = await fetch('/api/settings/email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();
        if (data.code === 0) {
            alert('保存邮件设置成功');
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('保存邮件设置失败:', error);
        alert('保存邮件设置失败，请稍后重试');
    }
}

// 测试邮件设置
async function testEmailSettings() {
    try {
        const response = await fetch('/api/settings/email/test', {
            method: 'POST'
        });

        const data = await response.json();
        if (data.code === 0) {
            alert('测试邮件发送成功');
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('测试邮件设置失败:', error);
        alert('测试邮件设置失败，请稍后重试');
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