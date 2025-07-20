const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { protect, admin } = require('../middleware/authMiddleware');

//  API 端点: POST /api/projects
//  功能: 管理员创建一个新项目
router.post('/', protect, admin, async (req, res) => {
  const { name, description, deadline, assignedUserIds } = req.body;

  if (!name || !assignedUserIds || assignedUserIds.length === 0) {
    return res.status(400).json({ error: '项目名称和指派用户为必填项' });
  }

  try {
    const newProject = await prisma.project.create({
      data: {
        name,
        description,
        deadline: deadline ? new Date(deadline) : null,
        assignedTo: {
          create: assignedUserIds.map(userId => ({
            userId: userId,
          })),
        },
      },
      include: {
        assignedTo: {
          select: { user: { select: { id: true, name: true } } },
        },
      },
    });
    res.status(201).json(newProject);
  } catch (error) {
    console.error("创建项目失败:", error);
    res.status(500).json({ error: '创建项目失败' });
  }
});


// ========================================================================
//  vvv 这是我们恢复并修正的部分 vvv

//  API 端点: GET /api/projects
//  功能: 获取所有项目列表
router.get('/', protect, async (req, res) => {
    try {
        const projects = await prisma.project.findMany({
          include: {
            assignedTo: {
              select: {
                user: {
                  select: { id: true, name: true, email: true },
                },
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        });
        res.status(200).json(projects);
      } catch (error) {
        console.error("获取项目列表失败:", error);
        res.status(500).json({ error: '获取项目列表失败' });
      }
});

//  ^^^ 这是我们恢复并修正的部分 ^^^
// ========================================================================


//  API 端点: GET /api/projects/:id
//  功能: 获取单个项目的详细信息
router.get('/:id', protect, async (req, res) => {
  const { id } = req.params;
  try {
    const project = await prisma.project.findUnique({
      where: { id: id },
      include: {
        assignedTo: {
          select: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    if (!project) {
      return res.status(404).json({ error: '项目未找到' });
    }

    res.status(200).json(project);
  } catch (error) {
    console.error("获取项目详情失败:", error);
    res.status(500).json({ error: '获取项目详情失败' });
  }
});

//  API 端点: PUT /api/projects/:id/status
//  功能: 学生更新自己被指派项目的状态
router.put('/:id/status', protect, async (req, res) => {
  const projectId = req.params.id;
  const userId = req.user.id;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: '项目状态为必填项' });
  }

  try {
    const assignment = await prisma.projectAssignment.findUnique({
      where: {
        userId_projectId: { userId, projectId },
      },
    });

    if (!assignment && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: '你未被指派到此项目，无法更新状态' });
    }
    
    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: { status },
    });

    res.status(200).json(updatedProject);
  } catch (error) {
    console.error("更新项目状态失败:", error);
    res.status(500).json({ error: '更新项目状态失败' });
  }
});

//  API 端点: DELETE /api/projects/:id
//  功能: 管理员删除一个项目
router.delete('/:id', protect, admin, async (req, res) => {
  const projectId = req.params.id;
  try {
    await prisma.$transaction([
      prisma.projectAssignment.deleteMany({
        where: { projectId: projectId },
      }),
      prisma.project.delete({
        where: { id: projectId },
      }),
    ]);
    res.status(204).send();
  } catch (error) {
    console.error("删除项目失败:", error);
    res.status(404).json({ error: '项目不存在或删除失败' });
  }
});

// routes/projectRoutes.js

// ... (其他路由) ...

//  API 端点: PUT /api/projects/:id
//  功能: 管理员更新项目基本信息
//  访问权限: 仅限管理员
router.put('/:id', protect, admin, async (req, res) => {
  const { id } = req.params;
  const { name, description, deadline } = req.body;

  try {
    const updatedProject = await prisma.project.update({
      where: { id: id },
      data: {
        name,
        description,
        deadline: deadline ? new Date(deadline) : undefined, // 如果 deadline 存在则更新
      },
    });
    res.status(200).json(updatedProject);
  } catch (error) {
    console.error("更新项目失败:", error);
    res.status(404).json({ error: '项目不存在或更新失败' });
  }
});

//  API 端点: PUT /api/projects/:id/status
//  ... (已有的状态更新路由) ...

module.exports = router;