-- 一键初始化脚本，适合全新建库
-- 创建数据库
CREATE DATABASE IF NOT EXISTS db DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE db;


-- 用户表
CREATE TABLE users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(80) NOT NULL UNIQUE,
    email VARCHAR(120) NOT NULL UNIQUE,
    password_hash VARCHAR(128),
    role VARCHAR(20) NOT NULL DEFAULT '读者',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    avatar VARCHAR(200),
    bio TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    articles_count INT DEFAULT 0,
    comments_count INT DEFAULT 0,
    likes_count INT DEFAULT 0
);

-- 分类表
CREATE TABLE categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(200),
    status ENUM('active', 'disabled') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 文章表
CREATE TABLE articles (
    article_id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    category_id INT,
    author_id INT,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    views_count INT DEFAULT 0,
    likes_count INT DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (author_id) REFERENCES users(user_id)
);

-- 评论表
CREATE TABLE comments (
    comment_id INT PRIMARY KEY AUTO_INCREMENT,
    article_id INT NOT NULL,
    user_id INT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (article_id) REFERENCES articles(article_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- 点赞表
CREATE TABLE likes (
    like_id INT PRIMARY KEY AUTO_INCREMENT,
    article_id INT NOT NULL,
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (article_id) REFERENCES articles(article_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    UNIQUE KEY unique_like (article_id, user_id)
);

-- 收藏表
CREATE TABLE favorites (
    favorite_id INT PRIMARY KEY AUTO_INCREMENT,
    article_id INT NOT NULL,
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (article_id) REFERENCES articles(article_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    UNIQUE KEY unique_favorite (article_id, user_id)
);

-- 举报表
CREATE TABLE reports (
    report_id INT PRIMARY KEY AUTO_INCREMENT,
    reporter_id INT NOT NULL,
    reported_user_id INT NOT NULL,
    article_id INT,
    reason TEXT NOT NULL,
    status ENUM('pending', 'resolved', 'dismissed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reporter_id) REFERENCES users(user_id),
    FOREIGN KEY (reported_user_id) REFERENCES users(user_id),
    FOREIGN KEY (article_id) REFERENCES articles(article_id)
);

-- 操作日志表
CREATE TABLE operation_logs (
    log_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    action VARCHAR(100) NOT NULL,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- 每日一句表
CREATE TABLE daily_quotes (
    quote_id INT PRIMARY KEY AUTO_INCREMENT,
    content TEXT NOT NULL,
    author VARCHAR(100),
    source VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT FALSE
);

-- 分类关注表
CREATE TABLE category_followers (
    user_id INT NOT NULL,
    category_id INT NOT NULL,
    created_at DATETIME NOT NULL,
    PRIMARY KEY (user_id, category_id),
    FOREIGN KEY(user_id) REFERENCES users (user_id),
    FOREIGN KEY(category_id) REFERENCES categories (id)
);

-- 用户活跃度表
CREATE TABLE user_activity (
    id INTEGER NOT NULL AUTO_INCREMENT,
    user_id INTEGER,
    articles_count INTEGER,
    comments_count INTEGER,
    likes_count INTEGER,
    last_active DATETIME NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY(user_id) REFERENCES users (user_id)
);

-- 系统日志表
CREATE TABLE system_logs (
    id INTEGER NOT NULL AUTO_INCREMENT,
    user_id INTEGER,
    action VARCHAR(50) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id INTEGER NOT NULL,
    details TEXT,
    ip_address VARCHAR(50),
    created_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY(user_id) REFERENCES users (user_id)
);

-- 创建触发器：更新文章点赞数
DELIMITER //
CREATE TRIGGER update_article_likes_count
AFTER INSERT ON likes
FOR EACH ROW
BEGIN
    UPDATE articles 
    SET likes_count = (
        SELECT COUNT(*) 
        FROM likes 
        WHERE article_id = NEW.article_id
    )
    WHERE article_id = NEW.article_id;
END //
DELIMITER ;

-- 创建触发器：删除点赞时更新文章点赞数
DELIMITER //
CREATE TRIGGER update_article_likes_count_on_delete
AFTER DELETE ON likes
FOR EACH ROW
BEGIN
    UPDATE articles 
    SET likes_count = (
        SELECT COUNT(*) 
        FROM likes 
        WHERE article_id = OLD.article_id
    )
    WHERE article_id = OLD.article_id;
END //
DELIMITER ;

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

-- 创建视图：category_article_count
CREATE OR REPLACE VIEW category_article_count AS
SELECT
    c.id AS category_id,
    c.name AS category_name,
    COUNT(a.article_id) AS article_count
FROM
    categories c
LEFT JOIN
    articles a ON a.category_id = c.id
GROUP BY
    c.id, c.name
ORDER BY
    c.id; 