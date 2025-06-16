from flask import Flask, request, jsonify, render_template, redirect, url_for, flash, send_from_directory
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
from urllib.parse import quote_plus
from werkzeug.utils import secure_filename
from flask_mail import Message, Mail
from functools import wraps
import random
from flask_wtf.csrf import CSRFProtect, generate_csrf
from sqlalchemy import func, or_
import json

load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev')
app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://root:15366026719syl@localhost/db?charset=utf8mb4'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max-limit
app.config['REMEMBER_COOKIE_DURATION'] = timedelta(days=7)
app.config['SESSION_COOKIE_PATH'] = '/'
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_HTTPONLY'] = True

# 邮件配置
app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT', 587))
app.config['MAIL_USE_TLS'] = os.getenv('MAIL_USE_TLS', 'True').lower() == 'true'
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_DEFAULT_SENDER')

# 确保上传目录存在
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

from models import db, User, Article, Comment, Category, Setting, ArticleStats, UserActivity, SystemLog, Report, DailyQuote, Tag

db.init_app(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'
mail = Mail(app)
csrf = CSRFProtect(app)

# 初始化数据库
def init_db():
    with app.app_context():
        db.create_all()
        # 创建默认管理员账户
        admin = User.query.filter_by(username='admin').first()
        if not admin:
            admin = User(
                username='admin',
                email='admin@example.com',
                role='文判',
                status='active'
            )
            admin.set_password('admin123')
            db.session.add(admin)
            db.session.commit()

# 事务管理装饰器
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

# 并发控制装饰器
def with_lock(model, id_field='id'):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            id_value = kwargs.get(id_field)
            print('with_lock id_value:', id_value)
            if not id_value:
                print('with_lock: missing id_value')
                return jsonify({'success': False, 'message': f'Missing {id_field} parameter'}), 400
            record = model.query.with_for_update().filter_by(**{id_field: id_value}).first()
            print('with_lock record:', record)
            if not record:
                print('with_lock: record not found')
                return jsonify({'success': False, 'message': f'{model.__name__} not found'}), 404
            kwargs['record'] = record
            return f(*args, **kwargs)
        return decorated_function
    return decorator

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# 路由
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('index'))

# 用户相关路由
@app.route('/api/register', methods=['POST'])
@csrf.exempt
def register():
    if not request.is_json:
        return jsonify({'success': False, 'message': '请求必须为JSON格式'}), 400
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    if not username or not email or not password:
        return jsonify({'success': False, 'message': '用户名、邮箱和密码不能为空'}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({'success': False, 'message': '用户名已存在'}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'success': False, 'message': '邮箱已被注册'}), 400

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

@app.route('/api/user/current')
@login_required
def get_current_user():
    return jsonify({
        'success': True,
        'user': current_user.to_dict()
    })

@app.route('/api/user/status')
def get_user_status():
    if current_user.is_authenticated:
        return jsonify({
            'code': 0,
            'message': 'success',
            'data': {
                'user_id': current_user.user_id,
                'username': current_user.username,
                'role': current_user.role,
                'avatar': current_user.avatar
            }
        })
    return jsonify({
        'code': 0,
        'message': 'success',
        'data': None
    })

@app.route('/api/user/profile')
@login_required
def user_profile():
    user = current_user
    # 统计获赞数
    total_likes = db.session.query(db.func.sum(Article.likes_count)).filter_by(author_id=user.user_id).scalar() or 0
    # 统计评论数
    comment_count = db.session.query(db.func.count()).select_from(Comment).filter_by(user_id=user.user_id).scalar() or 0
    # 统计文章数
    article_count = db.session.query(db.func.count()).select_from(Article).filter_by(author_id=user.user_id).scalar() or 0
    return jsonify({
        'code': 0,
        'data': {
            'user_id': user.user_id,
            'username': user.username,
            'avatar': user.avatar,
            'bio': user.bio,
            'role': user.role,
            'like_count': total_likes,
            'comment_count': comment_count,
            'article_count': article_count
        }
    })

@app.route('/api/user/articles')
@login_required
def user_articles():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    query = Article.query.filter_by(author_id=current_user.user_id).order_by(Article.created_at.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    items = []
    for article in pagination.items:
        items.append({
            'article_id': article.article_id,
            'title': article.title,
            'content': article.content[:200],
            'category': article.category.name if article.category else '',
            'created_at': article.created_at.strftime('%Y-%m-%d'),
            'likes': article.likes_count,
            'comments': len(article.comments)
        })
    return jsonify({
        'code': 0,
        'data': {
            'items': items,
            'has_more': pagination.page < pagination.pages,
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page
        }
    })

@app.route('/api/user/comments')
@login_required
def user_comments():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    query = Comment.query.filter_by(user_id=current_user.user_id).order_by(Comment.created_at.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    items = []
    for comment in pagination.items:
        items.append({
            'comment_id': comment.comment_id,
            'article_id': comment.article_id,
            'article_title': comment.article.title if comment.article else '',
            'content': comment.content,
            'created_at': comment.created_at.strftime('%Y-%m-%d'),
        })
    return jsonify({
        'code': 0,
        'data': {
            'items': items,
            'has_more': pagination.page < pagination.pages,
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page
        }
    })

@app.route('/api/user/likes')
@login_required
def user_likes():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    # 查询用户点赞过的文章
    likes_query = db.session.query(Article).join(Article.liked_by).filter(User.user_id == current_user.user_id).order_by(Article.created_at.desc())
    pagination = likes_query.paginate(page=page, per_page=per_page, error_out=False)
    items = []
    for article in pagination.items:
        items.append({
            'article_id': article.article_id,
            'title': article.title,
            'created_at': article.created_at.strftime('%Y-%m-%d'),
            'author_name': article.author.username if article.author else '',
        })
    return jsonify({
        'code': 0,
        'data': {
            'items': items,
            'has_more': pagination.page < pagination.pages,
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page
        }
    })

@app.route('/api/user/favorites')
@login_required
def user_favorites():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    favorites_query = db.session.query(Article).join(Article.favorited_by).filter(User.user_id == current_user.user_id).order_by(Article.created_at.desc())
    pagination = favorites_query.paginate(page=page, per_page=per_page, error_out=False)
    items = []
    for article in pagination.items:
        items.append({
            'article_id': article.article_id,
            'title': article.title,
            'created_at': article.created_at.strftime('%Y-%m-%d'),
            'author_name': article.author.username if article.author else '',
            'likes': article.likes_count,
            'comments': len(article.comments)
        })
    return jsonify({
        'code': 0,
        'data': {
            'items': items,
            'has_more': pagination.page < pagination.pages,
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page
        }
    })

# 文章相关路由
@app.route('/articles')
def articles_page():
    return render_template('articles.html')

@app.route('/api/articles')
def get_articles():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    category_id = request.args.get('category_id', type=int)
    status = request.args.get('status')
    search = request.args.get('search')
    
    query = Article.query
    
    # 根据用户角色过滤文章
    if current_user.is_authenticated:
        if current_user.role in ['文判', '笔官']:
            # 管理员（文判和笔官）可以看到所有文章
            pass
        else:
            # 读者只能看到自己的文章
            query = query.filter(Article.author_id == current_user.user_id)
    else:
        # 未登录用户只能看到已发布的文章
        query = query.filter_by(status='published')
    
    if category_id:
        query = query.filter_by(category_id=category_id)
    if status:
        query = query.filter_by(status=status)
    if search:
        query = query.filter(Article.title.ilike(f'%{search}%'))
    
    pagination = query.order_by(Article.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    return jsonify({
        'code': 0,
        'data': {
            'items': [article.to_dict() for article in pagination.items],
            'has_more': pagination.page < pagination.pages,
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page
        }
    })

@app.route('/api/articles/<int:article_id>')
def get_article(article_id):
    article = Article.query.get_or_404(article_id)
    
    # 检查文章状态和用户权限
    if article.status != 'published':
        if not current_user.is_authenticated:
            return jsonify({
                'code': 1,
                'message': '文章不存在或已被删除'
            }), 404
        if current_user.role != '文判' and current_user.user_id != article.author_id:
            return jsonify({
                'code': 1,
                'message': '文章不存在或已被删除'
            }), 404
    
    # 增加浏览次数
    article.views_count = (article.views_count or 0) + 1
    db.session.commit()
    
    # 获取点赞和收藏状态
    is_liked = False
    is_favorited = False
    if current_user.is_authenticated:
        is_liked = article.liked_by.filter_by(user_id=current_user.user_id).first() is not None
        is_favorited = article.favorited_by.filter_by(user_id=current_user.user_id).first() is not None
    
    article_dict = article.to_dict()
    article_dict.update({
        'is_liked': is_liked,
        'is_favorited': is_favorited
    })
    
    return jsonify({
        'code': 0,
        'message': 'success',
        'data': article_dict
    })

@app.route('/api/articles', methods=['POST'])
@csrf.exempt
@login_required
@transactional
def create_article():
    try:
        data = request.get_json()
        print('收到数据:', data)
        article = Article(
            title=data.get('title'),
            content=data.get('content'),
            category_id=data.get('category_id'),
            author_id=current_user.user_id,
            status='pending'  # 默认设置为未审核状态
        )
        db.session.add(article)
        db.session.commit()
        return jsonify({
            'success': True,
            'message': '文章创建成功，等待审核',
            'article': article.to_dict()
        })
    except Exception as e:
        print('创建文章异常:', e)
        return jsonify({'success': False, 'message': str(e)}), 400

@app.route('/api/articles/<int:article_id>', methods=['PUT'])
@csrf.exempt
@login_required
@transactional
@with_lock(Article, id_field='article_id')
def update_article(article_id, record):
    if current_user.role != '文判' and current_user.user_id != record.author_id:
        return jsonify({'success': False, 'message': '无权限修改此文章'}), 403
    
    data = request.get_json()
    
    record.title = data.get('title', record.title)
    record.content = data.get('content', record.content)
    record.category_id = data.get('category_id', record.category_id)
    
    # 只有文判可以修改文章状态
    if current_user.role == '文判':
        record.status = data.get('status', record.status)
    else:
        # 非文判用户修改文章后，状态自动变为未审核
        record.status = 'pending'
    
    record.updated_at = datetime.utcnow()
    
    return jsonify({
        'success': True,
        'message': '文章更新成功，等待审核',
        'article': record.to_dict()
    })

@app.route('/api/articles/<int:article_id>', methods=['DELETE'])
@csrf.exempt
@login_required
@transactional
@with_lock(Article, id_field='article_id')
def delete_article(article_id, record):
    print('进入 delete_article 路由, article_id:', article_id)
    if current_user.role != '文判' and current_user.user_id != record.author_id:
        return jsonify({'success': False, 'message': '无权限删除此文章'}), 403
    
    db.session.delete(record)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': '文章删除成功'
    })

# 评论相关路由
@app.route('/api/articles/<int:article_id>/comments')
def get_comments(article_id):
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    pagination = Comment.query.filter_by(article_id=article_id).order_by(
        Comment.created_at.desc()
    ).paginate(page=page, per_page=per_page, error_out=False)
    return jsonify({
        'code': 0,
        'data': {
            'items': [comment.to_dict() for comment in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': page
        }
    })

@app.route('/api/articles/<int:article_id>/comments', methods=['POST'])
@login_required
@transactional
def create_comment(article_id):
    if not request.is_json:
        return jsonify({'success': False, 'message': '请求必须为JSON格式'}), 400
    data = request.get_json()
    if not data or 'content' not in data:
        return jsonify({'success': False, 'message': '评论内容不能为空'}), 400
    comment = Comment(
        content=data.get('content'),
        article_id=article_id,
        user_id=current_user.user_id,
        status='pending'
    )
    db.session.add(comment)
    db.session.commit()
    return jsonify({
        'success': True,
        'message': '评论发布成功',
        'comment': comment.to_dict()
    })

@app.route('/api/comments/<int:comment_id>', methods=['PUT'])
@login_required
@transactional
@with_lock(Comment, id_field='comment_id')
def update_comment(comment_id, record):
    if current_user.role != '文判' and current_user.user_id != record.user_id:
        return jsonify({'success': False, 'message': '无权限修改此评论'}), 403
    data = request.get_json()
    record.content = data.get('content', record.content)
    record.status = data.get('status', record.status)
    record.updated_at = datetime.utcnow()
    return jsonify({
        'success': True,
        'message': '评论更新成功',
        'comment': record.to_dict()
    })

@app.route('/api/comments/<int:comment_id>', methods=['DELETE'])
@login_required
@transactional
@with_lock(Comment, id_field='comment_id')
def delete_comment(comment_id, record):
    if current_user.role != '文判' and current_user.user_id != record.user_id:
        return jsonify({'success': False, 'message': '无权限删除此评论'}), 403
    db.session.delete(record)
    db.session.commit()
    return jsonify({
        'success': True,
        'message': '评论删除成功'
    })

# 分类相关路由
@app.route('/categories')
def categories_page():
    return render_template('categories.html')

@app.route('/api/categories')
def get_categories():
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 12, type=int)
        status = request.args.get('status')
        search = request.args.get('search')
        
        query = Category.query
        
        if status:
            query = query.filter_by(status=status)
        if search:
            query = query.filter(Category.name.ilike(f'%{search}%'))
        
        pagination = query.order_by(Category.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'code': 0,
            'data': {
                'items': [category.to_dict() for category in pagination.items],
                'has_more': pagination.page < pagination.pages,
                'total': pagination.total,
                'pages': pagination.pages,
                'current_page': page
            }
        })
    except Exception as e:
        app.logger.error(f'获取分类失败: {str(e)}')
        return jsonify({
            'code': 1,
            'message': '获取分类失败'
        }), 500

@app.route('/api/categories/<int:category_id>')
def get_category(category_id):
    category = Category.query.get_or_404(category_id)
    return jsonify({
        'success': True,
        'category': category.to_dict()
    })

@app.route('/api/categories', methods=['POST'])
@login_required
@transactional
def create_category():
    if current_user.role != '文判':
        return jsonify({'success': False, 'message': '无权限创建分类'}), 403
    
    data = request.get_json()
    
    if Category.query.filter_by(name=data.get('name')).first():
        return jsonify({'success': False, 'message': '分类名称已存在'}), 400
    
    category = Category(
        name=data.get('name'),
        description=data.get('description'),
        status=data.get('status', 'active')
    )
    
    db.session.add(category)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': '分类创建成功',
        'category': category.to_dict()
    })

@app.route('/api/categories/<int:category_id>', methods=['PUT'])
@login_required
@transactional
@with_lock(Category)
def update_category(category_id, record):
    if current_user.role != '文判':
        return jsonify({'success': False, 'message': '无权限修改分类'}), 403
    
    data = request.get_json()
    
    if data.get('name') != record.name and Category.query.filter_by(name=data.get('name')).first():
        return jsonify({'success': False, 'message': '分类名称已存在'}), 400
    
    record.name = data.get('name', record.name)
    record.description = data.get('description', record.description)
    record.status = data.get('status', record.status)
    
    return jsonify({
        'success': True,
        'message': '分类更新成功',
        'category': record.to_dict()
    })

@app.route('/api/categories/<int:category_id>', methods=['DELETE'])
@login_required
@transactional
@with_lock(Category)
def delete_category(category_id, record):
    if current_user.role != '文判':
        return jsonify({'success': False, 'message': '无权限删除分类'}), 403
    
    if Article.query.filter_by(category_id=category_id).first():
        return jsonify({'success': False, 'message': '该分类下还有文章，无法删除'}), 400
    
    db.session.delete(record)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': '分类删除成功'
    })

# 系统设置相关路由
@app.route('/settings')
def settings_page():
    if not current_user.is_authenticated or current_user.role != '文判':
        return redirect(url_for('login'))
    return render_template('settings.html')

@app.route('/api/settings')
def get_settings():
    if not current_user.is_authenticated or current_user.role != '文判':
        return jsonify({'success': False, 'message': '无权限访问'}), 403
    
    settings = {}
    for setting in Setting.query.all():
        settings[setting.key] = setting.value
    
    return jsonify({
        'success': True,
        'settings': settings
    })

@app.route('/api/settings/basic', methods=['POST'])
@login_required
@transactional
def save_basic_settings():
    if current_user.role != '文判':
        return jsonify({'success': False, 'message': '无权限修改设置'}), 403
    
    data = request.form
    
    if not data.get('site_name') or not data.get('site_description'):
        return jsonify({'success': False, 'message': '站点名称和描述不能为空'}), 400
    
    # 保存基本设置
    Setting.set('site_name', data.get('site_name'))
    Setting.set('site_description', data.get('site_description'))
    Setting.set('site_keywords', data.get('site_keywords'))
    
    # 处理logo上传
    if 'logo' in request.files:
        logo = request.files['logo']
        if logo.filename:
            filename = secure_filename(logo.filename)
            logo.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
            Setting.set('site_logo', filename)
    
    # 处理favicon上传
    if 'favicon' in request.files:
        favicon = request.files['favicon']
        if favicon.filename:
            filename = secure_filename(favicon.filename)
            favicon.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
            Setting.set('site_favicon', filename)
    
    return jsonify({
        'success': True,
        'message': '基本设置保存成功'
    })

@app.route('/api/settings/article', methods=['POST'])
@login_required
@transactional
def save_article_settings():
    if current_user.role != '文判':
        return jsonify({'success': False, 'message': '无权限修改设置'}), 403
    
    data = request.get_json()
    
    if not all(key in data for key in ['articles_per_page', 'comments_per_page', 'default_status']):
        return jsonify({'success': False, 'message': '请填写所有必填字段'}), 400
    
    Setting.set('articles_per_page', str(data.get('articles_per_page')))
    Setting.set('comments_per_page', str(data.get('comments_per_page')))
    Setting.set('default_article_status', data.get('default_status'))
    
    return jsonify({
        'success': True,
        'message': '文章设置保存成功'
    })

@app.route('/api/settings/user', methods=['POST'])
@login_required
@transactional
def save_user_settings():
    if current_user.role != '文判':
        return jsonify({'success': False, 'message': '无权限修改设置'}), 403
    
    data = request.get_json()
    
    if not all(key in data for key in ['allow_registration', 'default_role', 'default_status']):
        return jsonify({'success': False, 'message': '请填写所有必填字段'}), 400
    
    Setting.set('allow_registration', str(data.get('allow_registration')))
    Setting.set('default_user_role', data.get('default_role'))
    Setting.set('default_user_status', data.get('default_status'))
    
    return jsonify({
        'success': True,
        'message': '用户设置保存成功'
    })

@app.route('/api/settings/email', methods=['POST'])
@login_required
@transactional
def save_email_settings():
    if current_user.role != '文判':
        return jsonify({'success': False, 'message': '无权限修改设置'}), 403
    
    data = request.get_json()
    
    if not all(key in data for key in ['smtp_server', 'smtp_port', 'smtp_user', 'smtp_password', 'sender_email', 'sender_name']):
        return jsonify({'success': False, 'message': '请填写所有必填字段'}), 400
    
    Setting.set('smtp_server', data.get('smtp_server'))
    Setting.set('smtp_port', str(data.get('smtp_port')))
    Setting.set('smtp_user', data.get('smtp_user'))
    Setting.set('smtp_password', data.get('smtp_password'))
    Setting.set('sender_email', data.get('sender_email'))
    Setting.set('sender_name', data.get('sender_name'))
    
    return jsonify({
        'success': True,
        'message': '邮件设置保存成功'
    })

@app.route('/api/settings/email/test', methods=['POST'])
@login_required
def test_email_settings():
    if current_user.role != '文判':
        return jsonify({'success': False, 'message': '无权限测试邮件设置'}), 403
    
    try:
        msg = Message(
            '测试邮件',
            sender=(Setting.get('sender_name'), Setting.get('sender_email')),
            recipients=[current_user.email]
        )
        msg.body = '这是一封测试邮件，如果您收到这封邮件，说明邮件设置正确。'
        mail.send(msg)
        return jsonify({
            'success': True,
            'message': '测试邮件发送成功'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'测试邮件发送失败: {str(e)}'
        }), 500

# 数据统计相关路由
@app.route('/statistics')
def statistics_page():
    if not current_user.is_authenticated or current_user.role != '文判':
        return redirect(url_for('login'))
    return render_template('statistics.html')

@app.route('/api/statistics')
def get_statistics():
    if not current_user.is_authenticated or current_user.role != '文判':
        return jsonify({'success': False, 'message': '无权限访问'}), 403
    
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    if not start_date or not end_date:
        return jsonify({'success': False, 'message': '请提供日期范围'}), 400
    
    try:
        start_date = datetime.strptime(start_date, '%Y-%m-%d')
        end_date = datetime.strptime(end_date, '%Y-%m-%d')
    except ValueError:
        return jsonify({'success': False, 'message': '日期格式无效'}), 400
    
    # 获取概览统计
    overview = {
        'total_articles': Article.query.count(),
        'total_comments': Comment.query.count(),
        'total_users': User.query.count(),
        'total_likes': db.session.query(db.func.sum(Article.likes_count)).scalar() or 0
    }
    
    # 获取文章统计
    articles = {
        'published': Article.query.filter_by(status='published').count(),
        'draft': Article.query.filter_by(status='draft').count(),
        'hidden': Article.query.filter_by(status='hidden').count(),
        'trend': get_article_trend(start_date, end_date)
    }
    
    # 获取评论统计
    comments = {
        'approved': Comment.query.filter_by(status='approved').count(),
        'pending': Comment.query.filter_by(status='pending').count(),
        'rejected': Comment.query.filter_by(status='rejected').count(),
        'trend': get_comment_trend(start_date, end_date)
    }
    
    # 获取用户统计
    users = {
        'active': User.query.filter_by(status='active').count(),
        'new': User.query.filter(User.created_at >= start_date).count(),
        'inactive': User.query.filter_by(status='inactive').count(),
        'trend': get_user_trend(start_date, end_date)
    }
    
    # 获取分类统计
    categories = {
        'total': Category.query.count(),
        'active': Category.query.filter_by(status='active').count(),
        'disabled': Category.query.filter_by(status='disabled').count(),
        'distribution': get_category_distribution()
    }
    
    # 获取趋势统计
    trends = {
        'article_growth': calculate_growth_rate('article', start_date, end_date),
        'comment_growth': calculate_growth_rate('comment', start_date, end_date),
        'user_growth': calculate_growth_rate('user', start_date, end_date)
    }
    
    return jsonify({
        'success': True,
        'overview': overview,
        'articles': articles,
        'comments': comments,
        'users': users,
        'categories': categories,
        'trends': trends
    })

def get_article_trend(start_date, end_date):
    dates = []
    counts = []
    current_date = start_date
    
    while current_date <= end_date:
        next_date = current_date + timedelta(days=1)
        count = Article.query.filter(
            Article.created_at >= current_date,
            Article.created_at < next_date
        ).count()
        
        dates.append(current_date.strftime('%Y-%m-%d'))
        counts.append(count)
        current_date = next_date
    
    return {'dates': dates, 'counts': counts}

def get_comment_trend(start_date, end_date):
    dates = []
    counts = []
    current_date = start_date
    
    while current_date <= end_date:
        next_date = current_date + timedelta(days=1)
        count = Comment.query.filter(
            Comment.created_at >= current_date,
            Comment.created_at < next_date
        ).count()
        
        dates.append(current_date.strftime('%Y-%m-%d'))
        counts.append(count)
        current_date = next_date
    
    return {'dates': dates, 'counts': counts}

def get_user_trend(start_date, end_date):
    dates = []
    counts = []
    current_date = start_date
    
    while current_date <= end_date:
        next_date = current_date + timedelta(days=1)
        count = User.query.filter(
            User.created_at >= current_date,
            User.created_at < next_date
        ).count()
        
        dates.append(current_date.strftime('%Y-%m-%d'))
        counts.append(count)
        current_date = next_date
    
    return {'dates': dates, 'counts': counts}

def get_category_distribution():
    categories = Category.query.all()
    distribution = []
    
    for category in categories:
        count = Article.query.filter_by(category_id=category.id).count()
        distribution.append({
            'name': category.name,
            'count': count
        })
    
    return distribution

def calculate_growth_rate(type, start_date, end_date):
    if type == 'article':
        start_count = Article.query.filter(Article.created_at < start_date).count()
        end_count = Article.query.filter(Article.created_at <= end_date).count()
    elif type == 'comment':
        start_count = Comment.query.filter(Comment.created_at < start_date).count()
        end_count = Comment.query.filter(Comment.created_at <= end_date).count()
    elif type == 'user':
        start_count = User.query.filter(User.created_at < start_date).count()
        end_count = User.query.filter(User.created_at <= end_date).count()
    else:
        return 0
    
    if start_count == 0:
        return 100 if end_count > 0 else 0
    
    return round((end_count - start_count) / start_count * 100, 2)

@app.route('/api/login', methods=['POST'])
@csrf.exempt
def api_login():
    try:
        # 确保请求包含JSON数据
        if not request.is_json:
            return jsonify({
                'success': False,
                'message': '请求必须是JSON格式'
            }), 400
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        # 验证必要字段
        if not username or not password:
            return jsonify({
                'success': False,
                'message': '用户名和密码不能为空'
            }), 400
        # 查找用户并验证密码
        user = User.query.filter_by(username=username).first()
        if user and user.password_hash and user.check_password(password):
            login_user(user, remember=True)
            return jsonify({
                'success': True,
                'message': '登录成功',
                'user': {
                    'user_id': user.user_id,
                    'username': user.username,
                    'email': user.email,
                    'role': user.role
                }
            })
        return jsonify({
            'success': False,
            'message': '用户名或密码错误'
        }), 401
    except Exception as e:
        app.logger.error(f'登录错误: {str(e)}')
        return jsonify({
            'success': False,
            'message': '服务器错误，请稍后重试'
        }), 500

@app.route('/api/daily-quote')
def get_daily_quote():
    # 随机获取一条每日一句
    result = db.session.execute('SELECT content, author FROM daily_quotes ORDER BY RAND() LIMIT 1')
    quote = result.fetchone()
    if quote:
        return jsonify({'quote': quote[0], 'author': quote[1]})
    else:
        return jsonify({'quote': '暂无每日一句', 'author': ''})

@app.route('/api/daily-quote/history', methods=['GET'])
def get_daily_quote_history():
    result = db.session.execute('SELECT content, author FROM daily_quotes')
    history = [{'quote': row[0], 'author': row[1]} for row in result]
    return jsonify({'history': history})

@app.route('/login')
def login():
    return redirect(url_for('index'))

@app.route('/article/<int:article_id>')
def article_detail_page(article_id):
    article = Article.query.get_or_404(article_id)
    # 如果author_id无效，兜底为1
    author_id = article.author_id if article.author_id else 1
    return render_template('article.html', article_id=article_id, author_id=author_id)

@app.route('/daily-quote')
def daily_quote_page():
    return render_template('daily-quote.html')

@app.route('/profile')
def profile_page():
    return render_template('profile.html')

@app.route('/favorites')
@login_required
def favorites_page():
    return render_template('favorites.html')

@app.errorhandler(400)
def bad_request(error):
    return jsonify({'success': False, 'message': '请求无效', 'error': str(error)}), 400

@app.errorhandler(404)
def not_found(error):
    return jsonify({'success': False, 'message': '资源未找到', 'error': str(error)}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'success': False, 'message': '服务器内部错误', 'error': str(error)}), 500

@app.after_request
def set_csrf_cookie(response):
    response.set_cookie('csrf_token', generate_csrf())
    return response

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
        db.session.commit()
        return jsonify({'code': 0, 'data': {'is_liked': False, 'likes_count': article.likes_count}})
    else:
        # 点赞
        article.liked_by.append(user)
        article.likes_count += 1
        db.session.commit()
        return jsonify({'code': 0, 'data': {'is_liked': True, 'likes_count': article.likes_count}})

@app.route('/api/articles/<int:article_id>/favorite', methods=['POST'])
@login_required
@transactional
def favorite_article(article_id):
    article = Article.query.get_or_404(article_id)
    user = current_user
    # 判断是否已收藏
    favorited = article.favorited_by.filter_by(user_id=user.user_id).first()
    if favorited:
        # 取消收藏
        article.favorited_by.remove(user)
        db.session.commit()
        return jsonify({'code': 0, 'data': {'is_favorited': False}})
    else:
        # 收藏
        article.favorited_by.append(user)
        db.session.commit()
        return jsonify({'code': 0, 'data': {'is_favorited': True}})

@app.route('/api/logout', methods=['POST'])
@login_required
def api_logout():
    logout_user()
    return jsonify({'success': True, 'message': '已退出登录'})

@app.route('/admin')
@login_required
def admin_page():
    print('current_user:', current_user)
    print('current_user.role:', getattr(current_user, 'role', None))
    if current_user.role not in ['文判', '笔官']:
        return redirect(url_for('index'))
    return render_template('admin.html')

@app.route('/api/admin/category_article_count')
@login_required
def admin_category_article_count():
    if current_user.role != '文判':
        return jsonify({'success': False, 'message': '无权限'}), 403
    result = db.session.execute('SELECT * FROM category_article_count')
    data = [dict(row) for row in result]
    return jsonify({'success': True, 'data': data})

@app.route('/api/admin/user_total_likes/<int:user_id>')
@login_required
def admin_user_total_likes(user_id):
    if current_user.role != '文判':
        return jsonify({'success': False, 'message': '无权限'}), 403
    conn = db.session.connection()
    conn.execute('SET @total_likes = 0')
    conn.execute('CALL user_total_likes(:uid, @total_likes)', {'uid': user_id})
    total_likes = conn.execute('SELECT @total_likes').scalar()
    return jsonify({'success': True, 'user_id': user_id, 'total_likes': total_likes})

@app.route('/api/admin/pending-articles')
@login_required
def admin_pending_articles():
    if current_user.role not in ['文判', '笔官']:
        return jsonify({'success': False, 'message': '无权限'}), 403
    articles = Article.query.filter(Article.status.in_(['pending', 'draft'])).order_by(Article.created_at.desc()).all()
    data = []
    for a in articles:
        data.append({
            'id': a.article_id,
            'title': a.title,
            'content': a.content,
            'category': a.category.name if a.category else '',
            'author': a.author.username if a.author else '',
            'status': a.status,
            'created_at': a.created_at.strftime('%Y-%m-%d %H:%M:%S')
        })
    return jsonify(data)

@app.route('/api/admin/articles/<int:article_id>')
@login_required
def admin_article_detail(article_id):
    if current_user.role not in ['文判', '笔官']:
        return jsonify({'success': False, 'message': '无权限'}), 403
    a = Article.query.get_or_404(article_id)
    return jsonify({
        'id': a.article_id,
        'title': a.title,
        'content': a.content,
        'category': a.category.name if a.category else '',
        'author': a.author.username if a.author else '',
        'status': a.status,
        'created_at': a.created_at.strftime('%Y-%m-%d %H:%M:%S')
    })

@app.route('/api/admin/reports')
@login_required
def admin_reports():
    if current_user.role not in ['文判', '笔官']:
        return jsonify({'success': False, 'message': '无权限'}), 403
    reports = Report.query.order_by(Report.created_at.desc()).all()
    data = []
    for r in reports:
        data.append({
            'id': r.report_id,
            'reporter': r.reporter.username if r.reporter else '',
            'reported_user': r.reported_user.username if r.reported_user else '',
            'reason': r.reason,
            'status': r.status,
            'created_at': r.created_at.strftime('%Y-%m-%d %H:%M:%S')
        })
    return jsonify(data)

@app.route('/api/admin/reports/<int:report_id>', methods=['PUT'])
@csrf.exempt
@login_required
def admin_handle_report(report_id):
    if current_user.role not in ['文判', '笔官']:
        return jsonify({'success': False, 'message': '无权限'}), 403
    report = Report.query.get_or_404(report_id)
    data = request.get_json()
    action = data.get('action')  # 'accept' 或 'reject'
    
    if action == 'accept':
        report.status = 'resolved'
        # 删除被举报文章
        if report.article_id:
            article = Article.query.get(report.article_id)
            if article:
                db.session.delete(article)
    elif action == 'reject':
        report.status = 'dismissed'
    else:
        return jsonify({'success': False, 'message': '无效的操作'}), 400
        
    db.session.commit()
    return jsonify({'success': True, 'message': '举报处理完成'})

@app.route('/api/admin/users')
@login_required
def admin_users():
    if current_user.role != '文判':
        return jsonify({'success': False, 'message': '无权限'}), 403
    search = request.args.get('search', '').strip()
    query = User.query
    if search:
        query = query.filter(User.username.ilike(f'%{search}%'))
    users = query.order_by(User.created_at.desc()).all()
    data = []
    for u in users:
        total_likes = db.session.query(func.sum(Article.likes_count)).filter_by(author_id=u.user_id).scalar() or 0
        data.append({
            'id': u.user_id,
            'username': u.username,
            'email': u.email,
            'role': u.role,
            'total_likes': total_likes,
            'status': u.status,
            'created_at': u.created_at.strftime('%Y-%m-%d %H:%M:%S')
        })
    return jsonify(data)

@app.route('/api/admin/users/<int:user_id>', methods=['PUT'])
@csrf.exempt
@login_required
def admin_update_user(user_id):
    if current_user.role != '文判':
        return jsonify({'success': False, 'message': '无权限'}), 403
    user = User.query.get(user_id)
    data = request.get_json()
    action = data.get('action')  # 'ban' or 'unban'
    if action == 'ban':
        if user:
            username = user.username
            db.session.delete(user)
            # 记录日志
            log = SystemLog(
                user_id=current_user.user_id,
                action='封禁用户',
                target_type='user',
                target_id=user_id,
                details=f'封禁并删除了用户 {username} (ID: {user_id})',
                ip_address=request.remote_addr,
                created_at=datetime.now()
            )
            db.session.add(log)
            db.session.commit()
            return jsonify({'success': True, 'message': '用户已封禁并记录日志'})
        else:
            return jsonify({'success': False, 'message': '用户不存在'}), 404
    elif action == 'unban':
        # 恢复用户（简单实现：新建同名用户，密码需重置）
        username = data.get('username')
        email = data.get('email')
        password = data.get('password', '123456')
        if not username or not email:
            return jsonify({'success': False, 'message': '缺少恢复用户信息'}), 400
        # 检查是否已存在
        if User.query.filter_by(username=username).first():
            return jsonify({'success': False, 'message': '用户名已存在，无法恢复'}), 400
        new_user = User(
            username=username,
            email=email,
            role='墨客',
            status='active'
        )
        new_user.set_password(password)
        db.session.add(new_user)
        # 记录日志
        log = SystemLog(
            user_id=current_user.user_id,
            action='解封用户',
            target_type='user',
            target_id=None,
            details=f'恢复了用户 {username}',
            ip_address=request.remote_addr,
            created_at=datetime.now()
        )
        db.session.add(log)
        db.session.commit()
        return jsonify({'success': True, 'message': '用户已恢复并记录日志'})
    else:
        return jsonify({'success': False, 'message': '无效操作'}), 400

@app.route('/api/admin/logs')
@login_required
def admin_logs():
    if current_user.role != '文判':
        return jsonify({'success': False, 'message': '无权限'}), 403
    logs = SystemLog.query.order_by(SystemLog.created_at.desc()).limit(100).all()
    data = []
    for log in logs:
        data.append({
            'user': log.user.username if log.user else '',
            'action': log.action,
            'details': log.details,
            'created_at': log.created_at.strftime('%Y-%m-%d %H:%M:%S')
        })
    return jsonify({'logs': data})

@app.route('/api/admin/articles/<int:article_id>/review', methods=['POST'])
@csrf.exempt
@login_required
def admin_review_article(article_id):
    if current_user.role not in ['文判', '笔官']:
        return jsonify({'success': False, 'message': '无权限'}), 403

    article = Article.query.get_or_404(article_id)
    data = request.get_json()
    action = data.get('status')  # 'approved' 或 'rejected'
    category_name = data.get('category')

    if action == 'approved':
        # 修改分类
        if category_name:
            category = Category.query.filter_by(name=category_name).first()
            if category:
                article.category_id = category.id
        article.status = 'published'
        db.session.commit()
        return jsonify({'success': True, 'message': '文章已发布'})
    elif action == 'rejected':
        db.session.delete(article)
        db.session.commit()
        return jsonify({'success': True, 'message': '文章已删除'})
    else:
        return jsonify({'success': False, 'message': '无效操作'}), 400

@app.route('/api/admin/daily-quote', methods=['POST'])
@csrf.exempt
@login_required
def admin_add_daily_quote():
    if current_user.role != '文判':
        return jsonify({'success': False, 'message': '无权限'}), 403
    data = request.get_json()
    content = data.get('content')
    author = data.get('author')
    source = data.get('source')
    if not content:
        return jsonify({'success': False, 'message': '内容不能为空'}), 400
    # 先将原有 is_active 设为 False
    DailyQuote.query.update({DailyQuote.is_active: False})
    quote = DailyQuote(
        content=content,
        author=author,
        source=source,
        created_at=datetime.now(),
        is_active=True
    )
    db.session.add(quote)
    db.session.commit()
    return jsonify({'success': True, 'message': '每日一句添加成功'})

@app.route('/api/admin/daily-quotes', methods=['GET'])
@login_required
def admin_daily_quotes():
    if current_user.role != '文判':
        return jsonify({'success': False, 'message': '无权限'}), 403
    quotes = DailyQuote.query.order_by(DailyQuote.created_at.desc()).all()
    data = []
    for q in quotes:
        data.append({
            'id': q.quote_id,
            'content': q.content,
            'author': q.author,
            'source': q.source,
            'created_at': q.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'is_active': q.is_active
        })
    return jsonify(data)

@app.route('/api/admin/daily-quote/<int:quote_id>', methods=['DELETE'])
@csrf.exempt
@login_required
def admin_delete_daily_quote(quote_id):
    if current_user.role != '文判':
        return jsonify({'success': False, 'message': '无权限'}), 403
    quote = DailyQuote.query.get_or_404(quote_id)
    db.session.delete(quote)
    db.session.commit()
    return jsonify({'success': True, 'message': '每日一句删除成功'})

@app.route('/api/reports', methods=['POST'])
@login_required
def submit_report():
    data = request.get_json()
    reported_user_id = data.get('reported_user_id')
    article_id = data.get('article_id')
    reason_type = data.get('reason_type', '其他')  # 举报类型
    reason_content = data.get('reason_content', '')  # 举报内容
    
    if not reported_user_id or not reason_content:
        return jsonify({'success': False, 'message': '举报对象和理由不能为空'}), 400
        
    # 将举报原因格式化为 JSON 字符串
    reason = json.dumps({
        'type': reason_type,
        'content': reason_content
    })
    
    report = Report(
        reporter_id=current_user.user_id,
        reported_user_id=reported_user_id,
        article_id=article_id,
        reason=reason
    )
    db.session.add(report)
    db.session.commit()
    return jsonify({'success': True, 'message': '举报已提交'})

# === 搜索功能路由 ===

@app.route('/search')
def search_page():
    """搜索页面"""
    return render_template('search.html')

@app.route('/api/search')
def search_articles():
    """搜索文章API - 支持全文搜索和标签筛选"""
    try:
        # 获取搜索参数
        query = request.args.get('q', '').strip()  # 搜索关键词
        tags = request.args.get('tags', '')  # 标签ID列表，逗号分隔
        category_id = request.args.get('category_id', type=int)  # 分类ID
        author = request.args.get('author', '').strip()  # 作者名
        sort_by = request.args.get('sort_by', 'created_at')  # 排序方式：created_at, likes_count, views_count
        order = request.args.get('order', 'desc')  # 排序顺序：asc, desc
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        
        # 构建基础查询
        articles_query = Article.query.filter_by(status='published')
        
        # 全文搜索
        if query:
            # 搜索标题、内容和作者名
            search_filter = or_(
                Article.title.contains(query),
                Article.content.contains(query),
                Article.author.has(User.username.contains(query))
            )
            articles_query = articles_query.filter(search_filter)
        
        # 作者筛选
        if author:
            articles_query = articles_query.filter(
                Article.author.has(User.username.contains(author))
            )
        
        # 分类筛选
        if category_id:
            articles_query = articles_query.filter_by(category_id=category_id)
        
        # 标签筛选
        if tags:
            try:
                tag_ids = [int(tag_id.strip()) for tag_id in tags.split(',') if tag_id.strip()]
                if tag_ids:
                    # 查找包含指定标签的文章
                    articles_query = articles_query.filter(
                        Article.tags.any(Tag.id.in_(tag_ids))
                    )
            except ValueError:
                return jsonify({'success': False, 'message': '无效的标签ID'}), 400
        
        # 排序
        valid_sort_fields = ['created_at', 'likes_count', 'views_count', 'title']
        if sort_by not in valid_sort_fields:
            sort_by = 'created_at'
        
        if order == 'asc':
            articles_query = articles_query.order_by(getattr(Article, sort_by).asc())
        else:
            articles_query = articles_query.order_by(getattr(Article, sort_by).desc())
        
        # 分页
        pagination = articles_query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        # 格式化结果
        articles = []
        for article in pagination.items:
            article_dict = article.to_dict()
            # 添加摘要（内容前150字符）
            article_dict['summary'] = article.content[:150] + '...' if len(article.content) > 150 else article.content
            articles.append(article_dict)
        
        return jsonify({
            'success': True,
            'data': {
                'articles': articles,
                'pagination': {
                    'page': page,
                    'per_page': per_page,
                    'total': pagination.total,
                    'pages': pagination.pages,
                    'has_prev': pagination.has_prev,
                    'has_next': pagination.has_next
                },
                'search_params': {
                    'query': query,
                    'tags': tags,
                    'category_id': category_id,
                    'author': author,
                    'sort_by': sort_by,
                    'order': order
                }
            }
        })
        
    except Exception as e:
        print(f"搜索错误: {e}")
        return jsonify({'success': False, 'message': '搜索失败'}), 500

@app.route('/api/tags')
def get_tags():
    """获取所有标签"""
    try:
        # 获取参数
        popular = request.args.get('popular', type=bool, default=False)  # 是否只获取热门标签
        limit = request.args.get('limit', type=int, default=0)  # 限制数量
        
        # 构建查询
        tags_query = Tag.query
        
        if popular:
            # 只获取使用次数大于0的标签，按使用次数排序
            tags_query = tags_query.filter(Tag.usage_count > 0).order_by(Tag.usage_count.desc())
        else:
            # 按名称排序
            tags_query = tags_query.order_by(Tag.name.asc())
        
        if limit > 0:
            tags_query = tags_query.limit(limit)
        
        tags = tags_query.all()
        
        return jsonify({
            'success': True,
            'data': [tag.to_dict() for tag in tags]
        })
        
    except Exception as e:
        print(f"获取标签错误: {e}")
        return jsonify({'success': False, 'message': '获取标签失败'}), 500

@app.route('/api/tags', methods=['POST'])
@csrf.exempt
@login_required
def create_tag():
    """创建新标签（需要笔官以上权限）"""
    try:
        if current_user.role not in ['笔官', '文判']:
            return jsonify({'success': False, 'message': '权限不足'}), 403
        
        if not request.is_json:
            return jsonify({'success': False, 'message': '请求必须为JSON格式'}), 400
        
        data = request.get_json()
        name = data.get('name', '').strip()
        description = data.get('description', '').strip()
        color = data.get('color', '#007bff').strip()
        
        if not name:
            return jsonify({'success': False, 'message': '标签名称不能为空'}), 400
        
        # 检查标签是否已存在
        existing_tag = Tag.query.filter_by(name=name).first()
        if existing_tag:
            return jsonify({'success': False, 'message': '标签已存在'}), 400
        
        # 创建新标签
        new_tag = Tag(
            name=name,
            description=description,
            color=color
        )
        
        db.session.add(new_tag)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': '标签创建成功',
            'data': new_tag.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        print(f"创建标签错误: {e}")
        return jsonify({'success': False, 'message': '创建标签失败'}), 500

@app.route('/api/search/suggestions')
def search_suggestions():
    """搜索建议API"""
    try:
        query = request.args.get('q', '').strip()
        if not query or len(query) < 2:
            return jsonify({'success': True, 'data': []})
        
        suggestions = []
        
        # 文章标题建议
        title_suggestions = db.session.query(Article.title).filter(
            Article.title.contains(query),
            Article.status == 'published'
        ).limit(5).all()
        
        for title in title_suggestions:
            suggestions.append({
                'type': 'title',
                'text': title[0],
                'category': '文章标题'
            })
        
        # 作者建议
        author_suggestions = db.session.query(User.username).filter(
            User.username.contains(query),
            User.status == 'active'
        ).limit(3).all()
        
        for username in author_suggestions:
            suggestions.append({
                'type': 'author',
                'text': username[0],
                'category': '作者'
            })
        
        # 标签建议
        tag_suggestions = db.session.query(Tag.name).filter(
            Tag.name.contains(query)
        ).limit(3).all()
        
        for tag_name in tag_suggestions:
            suggestions.append({
                'type': 'tag',
                'text': tag_name[0],
                'category': '标签'
            })
        
        return jsonify({
            'success': True,
            'data': suggestions[:10]  # 最多返回10个建议
        })
        
    except Exception as e:
        print(f"搜索建议错误: {e}")
        return jsonify({'success': False, 'message': '获取搜索建议失败'}), 500

if __name__ == '__main__':
    init_db()
    # 获取端口环境变量，用于云平台部署
    port = int(os.environ.get('PORT', 5000))
    # 修改为0.0.0.0使其在网络中可访问
    app.run(host='0.0.0.0', port=port, debug=False) 