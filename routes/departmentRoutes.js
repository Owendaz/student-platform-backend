// routes/departmentRoutes.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { protect, admin } = require('../middleware/authMiddleware');

// GET /api/departments (获取所有部门) - 我们之前已经创建
router.get('/', async (req, res) => {
  try {
    const departments = await prisma.department.findMany({
      orderBy: { name: 'asc' } // 按名称排序
    });
    res.status(200).json(departments);
  } catch (error) {
    res.status(500).json({ error: '获取部门列表失败' });
  }
});

// POST /api/departments (创建新部门) - [新增]
router.post('/', protect, admin, async (req, res) => {
  const { name, parentId } = req.body;
  if (!name) {
    return res.status(400).json({ error: '部门名称是必填项' });
  }
  try {
    const newDepartment = await prisma.department.create({
      data: {
        name,
        parentId: parentId || null,
      },
    });
    res.status(201).json(newDepartment);
  } catch (error) {
    res.status(500).json({ error: '创建部门失败' });
  }
});

// PUT /api/departments/:id (更新部门) - [新增]
router.put('/:id', protect, admin, async (req, res) => {
    const { id } = req.params;
    const { name, parentId } = req.body;
    if (!name) {
        return res.status(400).json({ error: '部门名称是必填项' });
    }
    try {
        const updatedDepartment = await prisma.department.update({
            where: { id },
            data: { name, parentId: parentId || null },
        });
        res.status(200).json(updatedDepartment);
    } catch (error) {
        res.status(404).json({ error: '部门不存在或更新失败' });
    }
});

// DELETE /api/departments/:id (删除部门) - [新增]
router.delete('/:id', protect, admin, async (req, res) => {
    const { id } = req.params;
    try {
        // 安全检查：在删除前，确认该部门没有子部门或关联用户
        const childCount = await prisma.department.count({ where: { parentId: id } });
        const userCount = await prisma.user.count({ where: { departmentId: id } });

        if (childCount > 0) {
            return res.status(400).json({ error: '无法删除：请先移除该部门下的所有子部门。' });
        }
        if (userCount > 0) {
            return res.status(400).json({ error: '无法删除：请先将该部门下的所有用户移出。' });
        }

        await prisma.department.delete({ where: { id } });
        res.status(204).send();
    } catch (error) {
        res.status(404).json({ error: '部门不存在或删除失败' });
    }
});

module.exports = router;