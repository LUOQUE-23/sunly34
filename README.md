# 墨韵文苑 - 文章分享系统功能文档

  

## 📖 系统概述

  

墨韵文苑是一个基于Flask的文学创作与分享平台，提供文章发布、评论互动、点赞收藏等核心功能，并具备完善的用户管理和内容审核机制。

  

### 技术栈

- **后端**: Python Flask + SQLAlchemy

- **前端**: HTML5 + CSS3 + JavaScript (ES6+)

- **数据库**: MySQL 8.0

- **认证**: Flask-Login (Session-based)

- **安全**: Flask-WTF CSRF保护

  

---

  

## 🏗️ 系统架构

  

### 目录结构

```

system/

├── app.py                 # 主应用文件

├── models.py              # 数据模型定义

├── database.sql           # 数据库结构

├── init_data.py          # 初始化数据脚本

├── requirements.txt      # 依赖包列表

├── static/               # 静态文件

│   ├── css/             # 样式文件

│   ├── js/              # JavaScript文件

│   └── images/          # 图片资源

└── templates/           # HTML模板

```

  

### 核心模块

1. **用户管理模块** - 注册、登录、权限控制

2. **文章管理模块** - 发布、编辑、审核、展示

3. **互动模块** - 评论、点赞、收藏

4. **管理后台模块** - 内容审核、用户管理、系统日志

  

---

  

## 👥 用户角色体系

  

### 权限等级

读者 :阅读、评论、点赞、收藏、发布文章。
文判 :文章审核、举报处理 + 读者所有权限 用户管理、系统日志、完整管理权限。
读者点赞数超过100自动升级为管理员。
  

### 自动升级机制

  

**代码实现** (`database.sql`):

```sql

-- 创建触发器：当用户获得足够点赞时自动升级为笔官

DELIMITER //

CREATE TRIGGER upgrade_to_admin

AFTER UPDATE ON articles

FOR EACH ROW

BEGIN

    DECLARE total_likes INT;

    -- 只有当点赞数发生变化时才检查

    IF NEW.likes_count != OLD.likes_count THEN

        -- 计算该作者所有文章的总点赞数

        SELECT COALESCE(SUM(likes_count), 0) INTO total_likes

        FROM articles

        WHERE author_id = NEW.author_id;

        -- 如果总点赞数达到100且当前角色为读者，则升级为笔官

        IF total_likes >= 100 THEN

            UPDATE users

            SET role = '笔官'

            WHERE user_id = NEW.author_id

            AND role = '读者';

        END IF;

    END IF;

END //

DELIMITER ;

```

  

---

  

## 📝 核心功能模块

  

### 1. 用户管理模块

  

#### 用户注册与登录

  

**用户模型** (`models.py`):

```python

class User(UserMixin, db.Model):

    __tablename__ = 'users'

    user_id = db.Column(db.Integer, primary_key=True)

    username = db.Column(db.String(80), unique=True, nullable=False)

    email = db.Column(db.String(120), unique=True, nullable=False)

    password_hash = db.Column(db.String(128))

    role = db.Column(db.String(20), nullable=False, default='读者')

    status = db.Column(db.String(20), nullable=False, default='active')

    # 统计字段

    articles_count = db.Column(db.Integer, default=0)

    comments_count = db.Column(db.Integer, default=0)

    likes_count = db.Column(db.Integer, default=0)

```

  

**注册API** (`app.py`):

```python

@app.route('/api/register', methods=['POST'])

@csrf.exempt

def register():

    data = request.get_json()

    username = data.get('username')

    email = data.get('email')

    password = data.get('password')

    # 验证用户名和邮箱唯一性

    if User.query.filter_by(username=username).first():

        return jsonify({'success': False, 'message': '用户名已存在'}), 400

    user = User(

        username=username,

        email=email,

        role='读者',

        status='active'

    )

    user.set_password(password)

    db.session.add(user)

    db.session.commit()

    return jsonify({'success': True, 'message': '注册成功'})

```

  

#### 权限控制

  

**权限装饰器应用**:

```python

@app.route('/api/admin/users')

@login_required

def admin_users():

    if current_user.role != '文判':

        return jsonify({'success': False, 'message': '无权限'}), 403

    # 管理员功能实现

```

  

### 2. 文章管理模块

  

#### 文章发布与审核

  

**文章模型** (`models.py`):

```python

class Article(db.Model):

    __tablename__ = 'articles'

    article_id = db.Column(db.Integer, primary_key=True)

    title = db.Column(db.String(200), nullable=False)

    content = db.Column(db.Text, nullable=False)

    category_id = db.Column(db.Integer, db.ForeignKey('categories.id'))

    author_id = db.Column(db.Integer, db.ForeignKey('users.user_id'))

    status = db.Column(db.String(20), nullable=False, default='draft')

    views_count = db.Column(db.Integer, default=0)

    likes_count = db.Column(db.Integer, default=0)

```

  

**文章发布API** (`app.py`):

```python

@app.route('/api/articles', methods=['POST'])

@csrf.exempt

@login_required

@transactional

def create_article():

    data = request.get_json()

    article = Article(

        title=data.get('title'),

        content=data.get('content'),

        category_id=data.get('category_id'),

        author_id=current_user.user_id,

        status='pending'  # 默认设置为待审核状态

    )

    db.session.add(article)

    db.session.commit()

    return jsonify({

        'success': True,

        'message': '文章创建成功，等待审核',

        'article': article.to_dict()

    })

```

  

#### 权限控制策略

  

**文章访问权限** (`app.py`):

```python

@app.route('/api/articles')

def get_articles():

    query = Article.query

    # 根据用户角色过滤文章

    if current_user.is_authenticated:

        if current_user.role in ['文判', '笔官']:

            # 管理员可以看到所有文章

            pass

        else:

            # 读者只能看到自己的文章

            query = query.filter(Article.author_id == current_user.user_id)

    else:

        # 未登录用户只能看到已发布的文章

        query = query.filter_by(status='published')

```

  

### 3. 互动功能模块

  

#### 点赞系统

  

**点赞表结构**:

```sql

CREATE TABLE likes (

    like_id INT PRIMARY KEY AUTO_INCREMENT,

    article_id INT NOT NULL,

    user_id INT NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY unique_like (article_id, user_id)

);

```

  

**点赞API实现** (`app.py`):

```python

@app.route('/api/articles/<int:article_id>/like', methods=['POST'])

@login_required

@transactional

def like_article(article_id):

    article = Article.query.get_or_404(article_id)

    user = current_user

    # 判断是否已点赞

    liked = article.liked_by.filter_by(user_id=user.user_id).first()

    if liked:

        # 取消点赞

        article.liked_by.remove(user)

        article.likes_count = max(0, article.likes_count - 1)

        return jsonify({'code': 0, 'data': {'is_liked': False, 'likes_count': article.likes_count}})

    else:

        # 点赞

        article.liked_by.append(user)

        article.likes_count += 1

        return jsonify({'code': 0, 'data': {'is_liked': True, 'likes_count': article.likes_count}})

```

  

#### 评论系统

  

**评论模型** (`models.py`):

```python

class Comment(db.Model):

    __tablename__ = 'comments'

    comment_id = db.Column(db.Integer, primary_key=True)

    article_id = db.Column(db.Integer, db.ForeignKey('articles.article_id'), nullable=False)

    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)

    content = db.Column(db.Text, nullable=False)

    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

```

  

### 4. 管理后台模块

  

#### 文章审核

  

**审核API** (`app.py`):

```python

@app.route('/api/admin/articles/<int:article_id>/review', methods=['POST'])

@csrf.exempt

@login_required

def admin_review_article(article_id):

    if current_user.role not in ['文判', '笔官']:

        return jsonify({'success': False, 'message': '无权限'}), 403

  

    article = Article.query.get_or_404(article_id)

    data = request.get_json()

    action = data.get('status')

  

    if action == 'approved':

        article.status = 'published'

        db.session.commit()

        return jsonify({'success': True, 'message': '文章已发布'})

    elif action == 'rejected':

        db.session.delete(article)

        db.session.commit()

        return jsonify({'success': True, 'message': '文章已删除'})

```

  

#### 用户管理

  

**用户封禁功能** (`app.py`):

```python

@app.route('/api/admin/users/<int:user_id>', methods=['PUT'])

@csrf.exempt

@login_required

def admin_update_user(user_id):

    if current_user.role != '文判':

        return jsonify({'success': False, 'message': '无权限'}), 403

    data = request.get_json()

    action = data.get('action')

    if action == 'ban':

        user = User.query.get(user_id)

        if user:

            username = user.username

            db.session.delete(user)

            # 记录操作日志

            log = SystemLog(

                user_id=current_user.user_id,

                action='封禁用户',

                target_type='user',

                target_id=user_id,

                details=f'封禁并删除了用户 {username} (ID: {user_id})',

                ip_address=request.remote_addr

            )

            db.session.add(log)

            db.session.commit()

```

  

#### 系统日志

  

**日志模型** (`models.py`):

```python

class SystemLog(db.Model):

    __tablename__ = 'system_logs'

    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'))

    action = db.Column(db.String(50), nullable=False)

    target_type = db.Column(db.String(50), nullable=False)

    target_id = db.Column(db.Integer, nullable=False)

    details = db.Column(db.Text)

    ip_address = db.Column(db.String(50))

    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

```

  

---

  

## 🔌 API接口文档

  

### 用户相关接口

  

| 方法 | 路径 | 描述 | 权限要求 |

|------|------|------|----------|

| POST | `/api/register` | 用户注册 | 无 |

| POST | `/api/login` | 用户登录 | 无 |

| GET | `/api/user/current` | 获取当前用户信息 | 登录 |

| GET | `/api/user/profile` | 获取用户详细资料 | 登录 |

  

### 文章相关接口

  

| 方法 | 路径 | 描述 | 权限要求 |

|------|------|------|----------|

| GET | `/api/articles` | 获取文章列表 | 无 |

| POST | `/api/articles` | 发布文章 | 登录 |

| GET | `/api/articles/<id>` | 获取文章详情 | 无 |

| PUT | `/api/articles/<id>` | 编辑文章 | 作者/管理员 |

| DELETE | `/api/articles/<id>` | 删除文章 | 作者/管理员 |

  

### 互动相关接口

  

| 方法 | 路径 | 描述 | 权限要求 |

|------|------|------|----------|

| POST | `/api/articles/<id>/like` | 点赞/取消点赞 | 登录 |

| POST | `/api/articles/<id>/favorite` | 收藏/取消收藏 | 登录 |

| GET | `/api/articles/<id>/comments` | 获取评论列表 | 无 |

| POST | `/api/articles/<id>/comments` | 发表评论 | 登录 |

  

### 管理员接口

  

| 方法 | 路径 | 描述 | 权限要求 |

|------|------|------|----------|

| GET | `/api/admin/pending-articles` | 获取待审核文章 | 笔官+ |

| POST | `/api/admin/articles/<id>/review` | 审核文章 | 笔官+ |

| GET | `/api/admin/users` | 获取用户列表 | 文判 |

| PUT | `/api/admin/users/<id>` | 管理用户 | 文判 |

| GET | `/api/admin/logs` | 查看系统日志 | 文判 |

  

---

  

## 🎨 前端实现

  

### 核心JavaScript模块

  

#### 文章管理 (`static/js/articles.js`)

  

**用户身份识别**:

```javascript

// 全局变量存储当前用户信息

let currentUser = null;

  

// 检查登录状态

async function checkLoginStatus() {

    const response = await fetch('/api/user/current');

    const data = await response.json();

    if (data.success && data.user) {

        currentUser = data.user;

        updateUIForUser();

    }

}

  

// 创建文章卡片时判断权限

function createArticleCard(article) {

    const isMyArticle = currentUser && article.author_id === currentUser.user_id;

    const isAdmin = currentUser && (currentUser.role === '文判' || currentUser.role === '笔官');

    const displayTitle = (isMyArticle || !isAdmin) ?

        article.title : `${authorName}的${article.title}`;

}

```

  

#### 管理后台 (`static/js/admin.js`)

  

**标签页切换管理**:

```javascript

function switchTab(tabName) {

    // 更新活跃标签

    document.querySelectorAll('.nav-link').forEach(link => {

        link.classList.remove('active');

    });

    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // 根据标签加载相应内容

    switch (tabName) {

        case 'pending-articles':

            await loadPendingArticles();

            break;

        case 'users':

            await loadUsers();

            break;

        case 'logs':

            await loadLogs();

            break;

    }

}

```

  

### 响应式设计

  

**CSS模块化结构**:

```css

/* 主样式 (static/css/style.css) */

:root {

    --primary-color: #2c3e50;

    --secondary-color: #3498db;

    --accent-color: #e74c3c;

    --text-color: #333;

    --bg-color: #f8f9fa;

}

  

/* 文章管理样式 (static/css/articles.css) */

.article-card {

    background: #fff;

    border-radius: 8px;

    padding: 1.5rem;

    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

    transition: transform 0.3s ease;

}

  

.article-card:hover {

    transform: translateY(-4px);

}

```

  

---

  

## 🔧 部署与配置

  

### 环境要求

- Python 3.8+

- MySQL 8.0+

- Flask 2.0+

  

### 安装步骤

  

1. **克隆项目**:

```bash

git clone <repository-url>

cd system

```

  

2. **安装依赖**:

```bash

pip install -r requirements.txt

```

  

3. **配置数据库**:

```bash

mysql -u root -p

CREATE DATABASE db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

mysql -u root -p db < database.sql

```

  

4. **初始化数据**:

```bash

python init_data.py

```

  

5. **启动应用**:

```bash

python app.py

```

  

### 默认账户

- **超级管理员**: `admin` / `admin123`

- **管理员**: `moderator` / `mod123`

- **示例用户**: `demo` / `demo123`

  

---

  

## 🛡️ 安全特性

  

### CSRF保护

```python

from flask_wtf.csrf import CSRFProtect

csrf = CSRFProtect(app)

  

@app.route('/api/articles', methods=['POST'])

@csrf.exempt  # API接口需要显式豁免或处理CSRF

@login_required

def create_article():

    # 实现逻辑

```

  

### 数据库事务

```python

def transactional(f):

    @wraps(f)

    def decorated_function(*args, **kwargs):

        try:

            result = f(*args, **kwargs)

            db.session.commit()

            return result

        except Exception as e:

            db.session.rollback()

            raise e

    return decorated_function

```

  

### 权限验证

```python

def with_lock(model, id_field='id'):

    def decorator(f):

        def decorated_function(*args, **kwargs):

            # 获取记录并加锁

            record = model.query.filter(

                getattr(model, id_field) == kwargs[id_field]

            ).with_for_update().first_or_404()

            return f(*args, **kwargs, record=record)

        return decorated_function

    return decorator

```

  

---

  

## 📊 性能优化

  

### 数据库优化

- 关键字段建立索引

- 使用数据库触发器自动更新统计数据

- 实现分页查询减少数据传输

  

### 前端优化

- CSS/JS文件压缩

- 图片懒加载

- 异步请求减少页面刷新

  

---

  

## 🔮 扩展建议

  

### 功能扩展

1. **文件上传**: 支持图片、附件上传

2. **搜索功能**: 全文搜索、标签筛选

3. **社交功能**: 用户关注、私信系统

4. **统计分析**: 用户行为分析、热门内容推荐

  

### 技术升级

1. **缓存机制**: Redis缓存热点数据

2. **消息队列**: 异步处理耗时任务

3. **API版本控制**: RESTful API规范化

4. **容器化部署**: Docker + Kubernetes

  

---

  
