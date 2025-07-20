// index.js

const express = require('express');
require('dotenv').config();
const authRoutes = require('./routes/auth'); // <-- 引入 auth 路由
const userRoutes = require('./routes/userRoutes');
const projectRoutes = require('./routes/projectRoutes'); // <-- 1. 引入 project 路由
const cors = require('cors'); // 引入 CORS 中间件
const app = express();
const PORT = process.env.PORT || 3000;
const departmentRoutes = require('./routes/departmentRoutes'); // 1. 引入

app.use(cors()); // 2. 使用 CORS 中间件
app.use(express.json());

// 一个简单的测试路由
app.get('/api', (req, res) => {
  res.json({ message: "欢迎来到学生工作平台 API！" });
});

// 将所有 /api/auth 开头的请求都交给 authRoutes 文件处理
app.use('/api/auth', authRoutes); // <-- 挂载路由
app.use('/api/users', userRoutes);
app.use('/api/departments', departmentRoutes); // 2. 挂载
app.use('/api/projects', projectRoutes); // <-- 2. 挂载 project 路由
app.listen(PORT, () => {
  console.log(`服务器正在 http://localhost:${PORT} 上运行`);
});