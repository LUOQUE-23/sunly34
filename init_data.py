#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from app import app, db
from models import User, Category, Article, Comment, Setting
from datetime import datetime

def init_database():
    """初始化数据库和基础数据"""
    with app.app_context():
        # 创建所有表
        db.create_all()
        print("数据库表创建完成")
        
        # 创建超级管理员账户
        admin_user = User.query.filter_by(username='admin').first()
        if not admin_user:
            admin_user = User(
                username='admin',
                email='admin@example.com',
                role='文判',
                status='active',
                bio='系统管理员'
            )
            admin_user.set_password('admin123')
            db.session.add(admin_user)
            print("超级管理员账户创建完成: admin / admin123")
        
        # 创建示例管理员账户
        mod_user = User.query.filter_by(username='moderator').first()
        if not mod_user:
            mod_user = User(
                username='moderator',
                email='mod@example.com',
                role='笔官',
                status='active',
                bio='内容管理员'
            )
            mod_user.set_password('mod123')
            db.session.add(mod_user)
            print("管理员账户创建完成: moderator / mod123")
        
        # 创建示例用户账户
        demo_user = User.query.filter_by(username='demo').first()
        if not demo_user:
            demo_user = User(
                username='demo',
                email='demo@example.com',
                role='墨客',
                status='active',
                bio='示例用户'
            )
            demo_user.set_password('demo123')
            db.session.add(demo_user)
            print("示例用户账户创建完成: demo / demo123")

        # 创建文章分类
        categories = [
            {
                'name': '诗词歌赋',
                'description': '古典诗词、现代诗歌、歌词创作等'
            },
            {
                'name': '散文随笔',
                'description': '生活感悟、旅行见闻、心情随笔等'
            },
            {
                'name': '小说故事',
                'description': '短篇小说、长篇小说、故事创作等'
            },
            {
                'name': '文学评论',
                'description': '书评、影评、文学理论探讨等'
            }
        ]

        for cat_data in categories:
            category = Category.query.filter_by(name=cat_data['name']).first()
            if not category:
                category = Category(**cat_data)
                db.session.add(category)
                print(f"分类创建完成: {cat_data['name']}")

        # 创建示例文章
        articles = [
            {
                'title': '春日随笔',
                'content': '春天来了，万物复苏。阳光温暖，微风轻拂。这是一个充满希望的季节，让我们用文字记录下这美好的时光。',
                'category_id': 2,  # 散文随笔
                'author_id': 3,    # demo用户
                'status': 'published'
            },
            {
                'title': '静夜思',
                'content': '床前明月光，疑是地上霜。举头望明月，低头思故乡。',
                'category_id': 1,  # 诗词歌赋
                'author_id': 2,    # moderator用户
                'status': 'published'
            }
        ]

        for article_data in articles:
            article = Article(**article_data)
            db.session.add(article)
            print(f"文章创建完成: {article_data['title']}")

        # 创建示例评论
        comments = [
            {
                'content': '写得真好，很有意境！',
                'article_id': 1,
                'user_id': 2,
                'status': 'approved'
            },
            {
                'content': '这首诗让我想起了家乡的月亮。',
                'article_id': 2,
                'user_id': 3,
                'status': 'approved'
            }
        ]

        for comment_data in comments:
            comment = Comment(**comment_data)
            db.session.add(comment)
            print(f"评论创建完成")

        # 创建系统设置
        settings = [
            {'key': 'site_name', 'value': '文学创作平台'},
            {'key': 'site_description', 'value': '一个专注于文学创作的交流平台'},
            {'key': 'allow_registration', 'value': 'true'},
            {'key': 'require_email_verification', 'value': 'false'}
        ]

        for setting_data in settings:
            setting = Setting.query.filter_by(key=setting_data['key']).first()
            if not setting:
                setting = Setting(**setting_data)
                db.session.add(setting)
                print(f"系统设置创建完成: {setting_data['key']}")
        
        try:
            # 提交所有更改
            db.session.commit()
            print("\n=== 数据库初始化完成！===")
            print("\n=== 登录信息 ===")
            print("超级管理员: admin / admin123")
            print("管理员: moderator / mod123")
            print("普通用户: demo / demo123")
            print("\n请访问 http://localhost:5000 开始使用系统")
        except Exception as e:
            db.session.rollback()
            print(f"初始化过程中出现错误: {str(e)}")
            raise

if __name__ == '__main__':
    init_database() 