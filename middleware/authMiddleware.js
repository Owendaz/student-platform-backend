// middleware/authMiddleware.js

const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const protect = async (req, res, next) => {
  let token;

  // 1. 从请求头中获取 Token
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // 从 'Bearer TOKEN_STRING' 中提取出 TOKEN_STRING
      token = req.headers.authorization.split(' ')[1];

      // 2. 验证 Token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // 3. 从 Token 中获取用户ID，并从数据库中查询用户信息（不包含密码）
      // 将用户信息附加到请求对象上
      req.user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isApproved: true,
        },
      });

      // 4. 调用 next()，将请求传递给下一个中间件或路由处理器
      next();

    } catch (error) {
      console.error(error);
      res.status(401).json({ error: '未授权，Token 验证失败' });
    }
  }

  if (!token) {
    res.status(401).json({ error: '未授权，没有提供 Token' });
  }
};
const admin = (req, res, next) => {
  // 这个中间件必须在 protect 之后使用，
  //因为它依赖 req.user 对象
  if (req.user && req.user.role === 'SUPER_ADMIN') {
    next(); // 用户是管理员，放行
  } else {
    res.status(403).json({ error: '访问被拒绝，需要超级管理员权限' }); // Forbidden
  }
};
module.exports = { protect, admin };