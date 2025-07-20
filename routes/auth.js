// routes/auth.js

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

//  API 端点: POST /api/auth/register
//  功能: 注册一个包含完整信息的新用户
router.post('/register', async (req, res) => {
  // 1. 从请求体中获取所有新字段
  const { 
    studentId, 
    name, 
    password, 
    college, 
    major, 
    grade, 
    position, 
    departmentId, // 前端需要提供一个部门的 ID
    email 
  } = req.body;

  try {
    // 2. 检查关键数据是否完整
    const requiredFields = { studentId, name, password, college, major, grade, position, departmentId };
    for (const [key, value] of Object.entries(requiredFields)) {
      if (!value) {
        return res.status(400).json({ error: `字段 '${key}' 是必填的` });
      }
    }

    // 3. 检查学号是否已经被注册
    const existingUser = await prisma.user.findUnique({
      where: { studentId: studentId },
    });

    if (existingUser) {
      return res.status(400).json({ error: '该学号已被注册' });
    }

    // 4. 对密码进行加密
    const hashedPassword = await bcrypt.hash(password, 10);

    // 5. 将包含所有新字段的用户信息存入数据库
    const newUser = await prisma.user.create({
      data: {
        studentId,
        name,
        password: hashedPassword,
        college,
        major,
        grade,
        position,
        departmentId,
        email: email || null, // email 是可选的
      },
    });

    // 6. 返回成功响应（不返回密码）
    const { password: _, ...userWithoutPassword } = newUser;
    res.status(201).json({ message: '用户注册成功，等待管理员批准', user: userWithoutPassword });

  } catch (error) {
    console.error("注册失败:", error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});


//  API 端点: POST /api/auth/login
//  功能: 用户通过学号和密码登录
router.post('/login', async (req, res) => {
  // 1. 从请求体中获取学号和密码
  const { studentId, password } = req.body;

  try {
    if (!studentId || !password) {
      return res.status(400).json({ error: '学号和密码是必填的' });
    }

    // 2. 这是最关键的改变：我们不再通过 email 查找用户，而是通过 studentId
    const user = await prisma.user.findUnique({
      where: { studentId: studentId },
    });

    if (!user) {
      return res.status(401).json({ error: '无效的凭据' });
    }

    // 3. 比较密码 (逻辑不变)
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: '无效的凭据' });
    }
    
    // 4. 检查账户是否已被批准 (逻辑不变)
    if (!user.isApproved) {
      return res.status(403).json({ error: '你的账户正在等待管理员批准' });
    }

    // 5. 生成 JWT Token (逻辑不变，但载荷里现在有更多信息)
    const token = jwt.sign(
      { userId: user.id, role: user.role, departmentId: user.departmentId },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // 6. 返回成功响应
    res.status(200).json({ message: '登录成功', token: token });

  } catch (error)
  {
    console.error("登录失败:", error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});


module.exports = router;