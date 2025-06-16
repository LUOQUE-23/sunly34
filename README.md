# 墨韵文苑 - 文学分享与每日一句推送系统

一个优雅的文学分享平台，采用水墨风格设计，支持用户分享文字、评论、点赞、收藏等功能，并包含每日一句推送功能。

## ✨ 特色功能

### 🖋️ 用户角色系统
- **墨客（普通用户）**：阅读、分享、评论、点赞、收藏文章
- **笔官（管理员）**：审核文章、举报违规用户、拥有墨客所有权限
- **文判（超级管理员）**：查看操作日志、管理用户、管理每日一句、拥有笔官所有权限

### 📝 核心功能
- **文章分享**：支持散文、诗歌、小说、随笔等多种文学形式
- **内容审核**：所有文章需经管理员审核后发布
- **互动功能**：点赞、评论、收藏文章
- **自动升级**：当用户获得足够点赞时自动升级为管理员
- **每日一句**：精选古诗词名句，每日更新
- **操作日志**：完整记录系统操作历史

### 🎨 设计特色
- **水墨风格**：采用中国传统水墨画风格设计
- **优雅界面**：简洁典雅的用户界面
- **响应式设计**：完美适配桌面和移动设备
- **流畅动画**：丰富的CSS动画效果

## 🛠️ 技术栈

### 后端
- **Flask** - Python Web框架
- **SQLAlchemy** - ORM数据库操作
- **MySQL** - 数据库存储
- **Flask-Login** - 用户认证管理

### 前端
- **HTML5** - 页面结构
- **CSS3** - 样式设计（水墨风格）
- **JavaScript ES6+** - 交互逻辑
- **Google Fonts** - 中文字体支持

## 📦 安装步骤

### 1. 环境准备
```bash
# 确保已安装 Python 3.7+
python --version

# 确保已安装 MySQL 5.7+
mysql --version
```

### 2. 克隆项目
```bash
git clone [项目地址]
cd literature-sharing-system
```

### 3. 创建虚拟环境
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Linux/Mac
python3 -m venv venv
source venv/bin/activate
```

### 4. 安装依赖
```bash
pip install -r requirements.txt
```

### 5. 配置数据库
```bash
# 登录MySQL
mysql -u root -p

# 创建数据库
CREATE DATABASE db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 导入数据库结构
mysql -u root -p db < database.sql
```

### 6. 配置环境变量
创建 `.env` 文件（可选）：
```
SECRET_KEY=你的密钥
DATABASE_URL=mysql+pymysql://用户名:密码@localhost/db
FLASK_ENV=development
```

### 7. 初始化数据
```bash
python init_data.py
```

### 8. 启动应用
```bash
python run.py
```

## 🚀 快速开始

1. **访问系统**：打开浏览器访问 `http://localhost:5000`

2. **使用测试账户**：
   - 超级管理员：`admin` / `admin123`
   - 管理员：`moderator` / `mod123`
   - 普通用户：`demo` / `demo123`

3. **管理后台**：访问 `http://localhost:5000/admin`

## 📚 API 文档

### 用户相关
- `POST /api/register` - 用户注册
- `POST /api/login` - 用户登录
- `GET /api/user/profile` - 获取用户信息

### 文章相关
- `POST /api/articles` - 发布文章
- `GET /api/articles` - 获取文章列表
- `POST /api/articles/<id>/like` - 点赞文章
- `POST /api/articles/<id>/favorite` - 收藏文章
- `POST /api/articles/<id>/comments` - 评论文章

### 管理员相关
- `GET /api/admin/pending-articles` - 获取待审核文章
- `POST /api/admin/articles/<id>/review` - 审核文章
- `POST /api/admin/report` - 举报用户
- `GET /api/admin/logs` - 查看操作日志（仅超级管理员）
- `PUT /api/admin/users/<id>` - 管理用户（仅超级管理员）
- `POST /api/admin/daily-quote` - 管理每日一句（仅超级管理员）

### 每日一句
- `GET /api/daily-quote` - 获取当前每日一句

## 📁 项目结构

```
literature-sharing-system/
├── app.py                 # Flask主应用
├── admin_routes.py        # 管理员路由
├── run.py                 # 启动脚本
├── init_data.py          # 数据初始化脚本
├── database.sql          # 数据库结构
├── requirements.txt      # Python依赖
├── README.md            # 项目说明
├── templates/           # HTML模板
│   ├── index.html       # 主页面
│   └── admin.html       # 管理后台
└── static/              # 静态资源
    ├── css/
    │   ├── style.css    # 主样式
    │   └── admin.css    # 管理后台样式
    └── js/
        ├── main.js      # 主页面脚本
        └── admin.js     # 管理后台脚本
```

## 🗄️ 数据库设计

### 主要数据表
- `users` - 用户表
- `articles` - 文章表
- `comments` - 评论表
- `likes` - 点赞表
- `favorites` - 收藏表
- `reports` - 举报表
- `operation_logs` - 操作日志表
- `daily_quotes` - 每日一句表

### 用户权限升级机制
- 当用户获得100个点赞时，系统自动将其升级为"笔官"
- 升级过程通过数据库触发器实现，确保实时性

## 🔧 开发说明

### 添加新功能
1. 在 `app.py` 中添加新的路由
2. 在 `templates/` 中添加或修改HTML模板
3. 在 `static/` 中添加相应的CSS和JavaScript

### 自定义样式
- 主要CSS变量定义在 `static/css/style.css` 开头
- 水墨风格相关样式在 `.ink-` 类中
- 响应式断点：768px（移动端）、1024px（平板端）

### 扩展建议
- 添加文章搜索功能
- 实现文章标签系统
- 添加用户个人主页
- 实现文章分类筛选
- 添加邮件通知功能

## 🐛 常见问题

### 1. 数据库连接失败
- 检查MySQL服务是否启动
- 确认数据库连接配置是否正确
- 验证数据库用户权限

### 2. 样式显示异常
- 检查静态文件路径是否正确
- 确认浏览器缓存是否需要清理
- 验证CSS文件是否完整加载

### 3. 登录功能异常
- 检查SESSION配置
- 确认用户密码加密是否正确
- 验证数据库用户表结构

## 📄 许可证

MIT License - 详见 LICENSE 文件

## 🤝 贡献指南

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 📞 联系方式

- 项目维护者：孙钰林
- 邮箱：yulinsun547@gmail.com
- 项目地址：[GitHub链接]

---

**墨韵文苑** - 让文字如墨，情深如海 ✨ 
