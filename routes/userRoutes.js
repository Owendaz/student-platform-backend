// routes/userRoutes.js

const express = require('express');
const router = express.Router();
const { protect,admin } = require('../middleware/authMiddleware'); // 引入我们的保护中间件
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
//  API 端点: GET /api/users/me
//  功能: 获取当前登录用户的信息
//  访问权限: 必须是已登录用户
router.get('/me', protect, (req, res) => {
  // 因为请求已经通过了 protect 中间件，
  // 所以我们可以安全地从 req.user 中获取用户信息
  res.status(200).json(req.user);
});
//  API 端点: GET /api/users/pending
//  功能: 获取所有待审批的用户列表
//  访问权限: 仅限管理员
// 在 routes/userRoutes.js 文件中

//  API 端点: GET /api/users/pending
//  功能: 获取所有待审批的用户列表
//  访问权限: 仅限管理员
router.get('/pending', protect, admin, async (req, res) => {
  try {
    const pendingUsers = await prisma.user.findMany({
      where: { isApproved: false },
      // 确保这里的 select 语句包含了前端需要的所有信息
      select: {
        id: true,
        name: true,
        studentId: true,
        college: true,
        major: true,
        department: { // 必须包含 department
          select: {
            name: true,
            parent: { // 并且包含 parent
              select: {
                name: true,
              },
            },
          },
        },
      },
    });
    res.status(200).json(pendingUsers);
  } catch (error) {
    console.error("!!! 获取待审批用户失败，详细错误:", error);
    res.status(500).json({ error: '获取待审批用户列表失败' });
  }
});

//  API 端点: PUT /api/users/:id/approve
//  功能: 管理员批准一个用户
//  访问权限: 仅限管理员
router.put('/:id/approve', protect, admin, async (req, res) => {
  try {
    const userId = req.params.id;
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isApproved: true },
    });
    res.status(200).json({ message: `用户 ${updatedUser.name} 已被批准`, user: updatedUser });
  } catch (error) {
    res.status(404).json({ error: '用户不存在或批准失败' });
  }
});
//  API 端点: GET /api/users
//  功能: 获取所有用户列表
//  访问权限: 仅限管理员
router.get('/', protect, admin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      // 为了安全，不返回密码字段
      where: { isApproved: true }, // <-- 新增此行，只查询已被批准的用户
      select: { 
    id: true, name: true, studentId: true, role: true, isApproved: true, college: true, major: true, grade: true, position: true,
    department: { select: { name: true, parent: { select: { name: true } } } } // <-- 新增这一行来包含部门名称
  },
 orderBy: { // 添加排序，让新用户在前面
    createdAt: 'desc',
  },});
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: '获取用户列表失败' });
  }
});
// 在文件中的任意路由定义位置添加
//  API 端点: PUT /api/users/:id/role
//  功能: 超级管理员修改用户角色
//  访问权限: 仅限超级管理员
router.put('/:id/role', protect, admin, async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  // 验证传入的 role 是否是有效的枚举值
  if (!Object.values(prisma.Role).includes(role)) {
    return res.status(400).json({ error: '无效的角色值' });
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id: id },
      data: { role: role },
    });
    const { password, ...userWithoutPassword } = updatedUser;
    res.status(200).json(userWithoutPassword);
  } catch (error) {
    res.status(404).json({ error: '用户不存在或更新失败' });
  }
});
// 在文件中的任意路由定义位置添加
//  API 端点: DELETE /api/users/:id
//  功能: 超级管理员删除用户
//  访问权限: 仅限超级管理员

router.delete('/:id', protect, admin, async (req, res) => {
    const { id } = req.params;
    try {
        // 使用事务确保原子性：先删除关联的指派记录，再删除用户
        await prisma.$transaction([
            prisma.projectAssignment.deleteMany({
                where: { userId: id },
            }),
            prisma.user.delete({
                where: { id: id },
            }),
        ]);
        res.status(204).send(); // 成功，无内容返回
    } catch (error) {
        res.status(404).json({ error: '用户不存在或删除失败' });
    }
});
module.exports = router;