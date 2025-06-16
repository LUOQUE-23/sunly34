from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

# 点赞关联表
likes = db.Table('likes',
    db.Column('user_id', db.Integer, db.ForeignKey('users.user_id'), primary_key=True),
    db.Column('article_id', db.Integer, db.ForeignKey('articles.article_id'), primary_key=True),
    db.Column('created_at', db.DateTime, nullable=False, default=datetime.utcnow)
)

# 收藏关联表
favorites = db.Table('favorites',
    db.Column('user_id', db.Integer, db.ForeignKey('users.user_id'), primary_key=True),
    db.Column('article_id', db.Integer, db.ForeignKey('articles.article_id'), primary_key=True),
    db.Column('created_at', db.DateTime, nullable=False, default=datetime.utcnow)
)

# 文章标签关联表
article_tags = db.Table('article_tags',
    db.Column('article_id', db.Integer, db.ForeignKey('articles.article_id'), primary_key=True),
    db.Column('tag_id', db.Integer, db.ForeignKey('tags.id'), primary_key=True),
    db.Column('created_at', db.DateTime, nullable=False, default=datetime.utcnow)
)

# 分类关注关联表
category_followers = db.Table('category_followers',
    db.Column('user_id', db.Integer, db.ForeignKey('users.user_id'), primary_key=True),
    db.Column('category_id', db.Integer, db.ForeignKey('categories.id'), primary_key=True),
    db.Column('created_at', db.DateTime, nullable=False, default=datetime.utcnow)
)

class User(UserMixin, db.Model):
    __tablename__ = 'users'
    
    user_id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128))
    role = db.Column(db.String(20), nullable=False, default='读者')  # 读者、作者、文判
    status = db.Column(db.String(20), nullable=False, default='active')  # active, inactive
    avatar = db.Column(db.String(200))
    bio = db.Column(db.Text)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 统计字段
    articles_count = db.Column(db.Integer, default=0)
    comments_count = db.Column(db.Integer, default=0)
    likes_count = db.Column(db.Integer, default=0)
    
    # 关系
    articles = db.relationship('Article', back_populates='author')
    comments = db.relationship('Comment', back_populates='user')
    liked_articles = db.relationship('Article', secondary=likes, backref=db.backref('liked_by', lazy='dynamic'))
    favorite_articles = db.relationship('Article', secondary=favorites, backref=db.backref('favorited_by', lazy='dynamic'))
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def get_id(self):
        return str(self.user_id)
    
    def to_dict(self):
        return {
            'user_id': self.user_id,
            'username': self.username,
            'email': self.email,
            'role': self.role,
            'status': self.status,
            'avatar': self.avatar,
            'bio': self.bio,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'articles_count': self.articles_count,
            'comments_count': self.comments_count,
            'likes_count': self.likes_count
        }

class Tag(db.Model):
    __tablename__ = 'tags'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)
    description = db.Column(db.String(200))
    color = db.Column(db.String(20), default='#007bff')  # 标签颜色
    usage_count = db.Column(db.Integer, default=0)  # 使用次数统计
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'color': self.color,
            'usage_count': self.usage_count,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class Article(db.Model):
    __tablename__ = 'articles'
    
    article_id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    category_id = db.Column(db.Integer, db.ForeignKey('categories.id'))
    author_id = db.Column(db.Integer, db.ForeignKey('users.user_id'))
    status = db.Column(db.String(20), nullable=False, default='draft')  # draft, published, hidden
    views_count = db.Column(db.Integer, default=0)
    likes_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    category = db.relationship('Category', back_populates='articles')
    author = db.relationship('User', back_populates='articles')
    comments = db.relationship('Comment', back_populates='article')
    tags = db.relationship('Tag', secondary=article_tags, backref=db.backref('articles', lazy='dynamic'))
    
    def to_dict(self):
        return {
            'article_id': self.article_id,
            'title': self.title,
            'content': self.content,
            'category_id': self.category_id,
            'author_id': self.author_id,
            'status': self.status,
            'views_count': self.views_count,
            'likes_count': self.likes_count,
            'favorites_count': len(self.favorited_by.all()) if hasattr(self.favorited_by, 'all') else 0,
            'comments_count': len(self.comments) if self.comments else 0,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'category': self.category.to_dict() if self.category else None,
            'author': {
                'user_id': self.author.user_id,
                'username': self.author.username,
                'avatar': self.author.avatar
            } if self.author else None,
            'tags': [tag.to_dict() for tag in self.tags] if self.tags else []
        }

class Comment(db.Model):
    __tablename__ = 'comments'
    
    comment_id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    article_id = db.Column(db.Integer, db.ForeignKey('articles.article_id'))
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'))
    status = db.Column(db.String(20), nullable=False, default='pending')  # pending, approved, rejected
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    article = db.relationship('Article', back_populates='comments')
    user = db.relationship('User', back_populates='comments')
    
    def to_dict(self):
        return {
            'comment_id': self.comment_id,
            'content': self.content,
            'article_id': self.article_id,
            'user_id': self.user_id,
            'status': self.status,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'user': self.user.to_dict() if self.user else None
        }

class Category(db.Model):
    __tablename__ = 'categories'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)
    description = db.Column(db.String(200))
    status = db.Column(db.String(20), nullable=False, default='active')  # active, disabled
    articles_count = db.Column(db.Integer, default=0)
    followers_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    articles = db.relationship('Article', back_populates='category')
    followers = db.relationship('User', secondary=category_followers,
                              backref=db.backref('followed_categories', lazy='dynamic'))

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'status': self.status,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

class Setting(db.Model):
    __tablename__ = 'settings'
    
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(50), unique=True, nullable=False)
    value = db.Column(db.Text)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    @staticmethod
    def get(key, default=None):
        setting = Setting.query.filter_by(key=key).first()
        return setting.value if setting else default
    
    @staticmethod
    def set(key, value):
        setting = Setting.query.filter_by(key=key).first()
        if setting:
            setting.value = value
        else:
            setting = Setting(key=key, value=value)
            db.session.add(setting)
        db.session.commit()

# 创建文章统计视图
class ArticleStats(db.Model):
    __tablename__ = 'article_stats'
    
    id = db.Column(db.Integer, primary_key=True)
    total_articles = db.Column(db.Integer, default=0)
    published_articles = db.Column(db.Integer, default=0)
    total_comments = db.Column(db.Integer, default=0)
    total_likes = db.Column(db.Integer, default=0)
    last_updated = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

# 创建用户活跃度视图
class UserActivity(db.Model):
    __tablename__ = 'user_activity'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'))
    articles_count = db.Column(db.Integer, default=0)
    comments_count = db.Column(db.Integer, default=0)
    likes_count = db.Column(db.Integer, default=0)
    last_active = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    user = db.relationship('User')

# 创建系统日志表
class SystemLog(db.Model):
    __tablename__ = 'system_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'))
    action = db.Column(db.String(50), nullable=False)  # create, update, delete
    target_type = db.Column(db.String(50), nullable=False)  # article, comment, user
    target_id = db.Column(db.Integer, nullable=False)
    details = db.Column(db.Text)
    ip_address = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    
    # 关系
    user = db.relationship('User')

# 创建数据库事件
def create_database_events():
    # 创建文章统计更新触发器
    db.session.execute("""
    CREATE OR REPLACE FUNCTION update_article_stats()
    RETURNS TRIGGER AS $$
    BEGIN
        IF TG_OP = 'INSERT' THEN
            UPDATE article_stats
            SET total_articles = total_articles + 1,
                published_articles = published_articles + CASE WHEN NEW.status = 'published' THEN 1 ELSE 0 END,
                last_updated = NOW()
            WHERE category_id = NEW.category_id;
        ELSIF TG_OP = 'UPDATE' THEN
            IF OLD.category_id != NEW.category_id THEN
                -- 更新旧分类统计
                UPDATE article_stats
                SET total_articles = total_articles - 1,
                    published_articles = published_articles - CASE WHEN OLD.status = 'published' THEN 1 ELSE 0 END,
                    last_updated = NOW()
                WHERE category_id = OLD.category_id;
                
                -- 更新新分类统计
                UPDATE article_stats
                SET total_articles = total_articles + 1,
                    published_articles = published_articles + CASE WHEN NEW.status = 'published' THEN 1 ELSE 0 END,
                    last_updated = NOW()
                WHERE category_id = NEW.category_id;
            ELSIF OLD.status != NEW.status THEN
                -- 更新发布状态统计
                UPDATE article_stats
                SET published_articles = published_articles + 
                    CASE WHEN NEW.status = 'published' THEN 1 ELSE -1 END,
                    last_updated = NOW()
                WHERE category_id = NEW.category_id;
            END IF;
        ELSIF TG_OP = 'DELETE' THEN
            UPDATE article_stats
            SET total_articles = total_articles - 1,
                published_articles = published_articles - CASE WHEN OLD.status = 'published' THEN 1 ELSE 0 END,
                last_updated = NOW()
            WHERE category_id = OLD.category_id;
        END IF;
        RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;
    """)
    
    # 创建用户活跃度更新触发器
    db.session.execute("""
    CREATE OR REPLACE FUNCTION update_user_activity()
    RETURNS TRIGGER AS $$
    BEGIN
        IF TG_OP = 'INSERT' THEN
            IF TG_TABLE_NAME = 'article' THEN
                UPDATE user_activity
                SET articles_count = articles_count + 1,
                    last_active = NOW()
                WHERE user_id = NEW.author_id;
            ELSIF TG_TABLE_NAME = 'comment' THEN
                UPDATE user_activity
                SET comments_count = comments_count + 1,
                    last_active = NOW()
                WHERE user_id = NEW.user_id;
            END IF;
        ELSIF TG_OP = 'DELETE' THEN
            IF TG_TABLE_NAME = 'article' THEN
                UPDATE user_activity
                SET articles_count = articles_count - 1
                WHERE user_id = OLD.author_id;
            ELSIF TG_TABLE_NAME = 'comment' THEN
                UPDATE user_activity
                SET comments_count = comments_count - 1
                WHERE user_id = OLD.user_id;
            END IF;
        END IF;
        RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;
    """)
    
    # 创建系统日志触发器
    db.session.execute("""
    CREATE OR REPLACE FUNCTION log_system_action()
    RETURNS TRIGGER AS $$
    BEGIN
        INSERT INTO system_log (user_id, action, target_type, target_id, details, ip_address)
        VALUES (
            CASE 
                WHEN TG_TABLE_NAME = 'user' THEN NEW.id
                ELSE current_setting('app.current_user_id', true)::integer
            END,
            TG_OP,
            TG_TABLE_NAME,
            CASE 
                WHEN TG_OP = 'DELETE' THEN OLD.id
                ELSE NEW.id
            END,
            CASE 
                WHEN TG_OP = 'INSERT' THEN row_to_json(NEW)::text
                WHEN TG_OP = 'UPDATE' THEN json_build_object('old', row_to_json(OLD), 'new', row_to_json(NEW))::text
                WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)::text
            END,
            current_setting('app.client_ip', true)
        );
        RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;
    """)
    
    # 创建触发器
    db.session.execute("""
    DROP TRIGGER IF EXISTS article_stats_trigger ON article;
    CREATE TRIGGER article_stats_trigger
    AFTER INSERT OR UPDATE OR DELETE ON article
    FOR EACH ROW EXECUTE FUNCTION update_article_stats();
    
    DROP TRIGGER IF EXISTS user_activity_article_trigger ON article;
    CREATE TRIGGER user_activity_article_trigger
    AFTER INSERT OR DELETE ON article
    FOR EACH ROW EXECUTE FUNCTION update_user_activity();
    
    DROP TRIGGER IF EXISTS user_activity_comment_trigger ON comment;
    CREATE TRIGGER user_activity_comment_trigger
    AFTER INSERT OR DELETE ON comment
    FOR EACH ROW EXECUTE FUNCTION update_user_activity();
    
    DROP TRIGGER IF EXISTS system_log_trigger ON article;
    CREATE TRIGGER system_log_trigger
    AFTER INSERT OR UPDATE OR DELETE ON article
    FOR EACH ROW EXECUTE FUNCTION log_system_action();
    
    DROP TRIGGER IF EXISTS system_log_trigger ON comment;
    CREATE TRIGGER system_log_trigger
    AFTER INSERT OR UPDATE OR DELETE ON comment
    FOR EACH ROW EXECUTE FUNCTION log_system_action();
    
    DROP TRIGGER IF EXISTS system_log_trigger ON user;
    CREATE TRIGGER system_log_trigger
    AFTER INSERT OR UPDATE OR DELETE ON user
    FOR EACH ROW EXECUTE FUNCTION log_system_action();
    """)

# 在应用启动时创建数据库事件
def init_db():
    db.create_all()
    create_database_events()

class Report(db.Model):
    __tablename__ = 'reports'
    report_id = db.Column(db.Integer, primary_key=True)
    reporter_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    reported_user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    article_id = db.Column(db.Integer, db.ForeignKey('articles.article_id'))
    reason = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), nullable=False, default='pending')  # pending, resolved, dismissed
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    reporter = db.relationship('User', foreign_keys=[reporter_id], backref='reports_made')
    reported_user = db.relationship('User', foreign_keys=[reported_user_id], backref='reports_received')
    article = db.relationship('Article', backref='reports')

    def to_dict(self):
        return {
            'report_id': self.report_id,
            'reporter_id': self.reporter_id,
            'reported_user_id': self.reported_user_id,
            'article_id': self.article_id,
            'reason': self.reason,
            'status': self.status,
            'created_at': self.created_at.isoformat(),
            'reporter': self.reporter.username if self.reporter else None,
            'reported_user': self.reported_user.username if self.reported_user else None
        }

class DailyQuote(db.Model):
    __tablename__ = 'daily_quotes'
    
    quote_id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    author = db.Column(db.String(100))
    source = db.Column(db.String(200))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=False)

    def __repr__(self):
        return f'<DailyQuote {self.quote_id}: {self.content[:20]}...>' 