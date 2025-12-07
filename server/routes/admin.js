const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { query } = require('../utils/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// ========== УПРАВЛЕНИЕ ГРУППАМИ ==========

// Получение списка всех групп
router.get('/groups', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const groupsResult = await query(
            'SELECT id, group_name, created_at FROM groups ORDER BY group_name',
            []
        );

        res.json({
            groups: groupsResult.rows
        });
    } catch (error) {
        console.error('Get groups error:', error);
        res.status(500).json({
            error: 'Failed to get groups',
            message: 'Ошибка при получении списка групп'
        });
    }
});

// Добавление новой группы
router.post('/groups', authenticateToken, requireAdmin, [
    body('groupName')
        .isLength({ min: 1, max: 50 })
        .withMessage('Название группы должно быть от 1 до 50 символов')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation Error',
                details: errors.array()
            });
        }

        const { groupName } = req.body;

        // Проверка существования группы
        const existingGroup = await query(
            'SELECT id FROM groups WHERE group_name = $1',
            [groupName]
        );

        if (existingGroup.rows.length > 0) {
            return res.status(400).json({
                error: 'Group already exists',
                message: 'Группа с таким названием уже существует'
            });
        }

        const newGroup = await query(
            `INSERT INTO groups (group_name) 
             VALUES ($1) 
             RETURNING id, group_name, created_at`,
            [groupName]
        );

        res.status(201).json({
            message: 'Группа успешно добавлена',
            group: newGroup.rows[0]
        });
    } catch (error) {
        console.error('Add group error:', error);
        res.status(500).json({
            error: 'Failed to add group',
            message: 'Ошибка при добавлении группы'
        });
    }
});

// Обновление группы
router.put('/groups/:id', authenticateToken, requireAdmin, [
    body('groupName')
        .isLength({ min: 1, max: 50 })
        .withMessage('Название группы должно быть от 1 до 50 символов')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation Error',
                details: errors.array()
            });
        }

        const { id } = req.params;
        const { groupName } = req.body;

        // Проверка существования группы
        const existingGroup = await query(
            'SELECT id FROM groups WHERE id = $1',
            [id]
        );

        if (existingGroup.rows.length === 0) {
            return res.status(404).json({
                error: 'Group not found',
                message: 'Группа не найдена'
            });
        }

        // Проверка уникальности нового названия
        const duplicateGroup = await query(
            'SELECT id FROM groups WHERE group_name = $1 AND id != $2',
            [groupName, id]
        );

        if (duplicateGroup.rows.length > 0) {
            return res.status(400).json({
                error: 'Group name already exists',
                message: 'Группа с таким названием уже существует'
            });
        }

        const updatedGroup = await query(
            `UPDATE groups 
             SET group_name = $1 
             WHERE id = $2 
             RETURNING id, group_name, created_at`,
            [groupName, id]
        );

        res.json({
            message: 'Группа успешно обновлена',
            group: updatedGroup.rows[0]
        });
    } catch (error) {
        console.error('Update group error:', error);
        res.status(500).json({
            error: 'Failed to update group',
            message: 'Ошибка при обновлении группы'
        });
    }
});

// Удаление группы
router.delete('/groups/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // Проверка существования группы
        const existingGroup = await query(
            'SELECT id FROM groups WHERE id = $1',
            [id]
        );

        if (existingGroup.rows.length === 0) {
            return res.status(404).json({
                error: 'Group not found',
                message: 'Группа не найдена'
            });
        }

        // Проверка наличия студентов в группе
        const studentsInGroup = await query(
            'SELECT COUNT(*) as count FROM students WHERE group_id = $1',
            [id]
        );

        if (parseInt(studentsInGroup.rows[0].count) > 0) {
            return res.status(400).json({
                error: 'Group has students',
                message: 'Невозможно удалить группу, в которой есть студенты'
            });
        }

        await query('DELETE FROM groups WHERE id = $1', [id]);

        res.json({
            message: 'Группа успешно удалена'
        });
    } catch (error) {
        console.error('Delete group error:', error);
        res.status(500).json({
            error: 'Failed to delete group',
            message: 'Ошибка при удалении группы'
        });
    }
});

// ========== УПРАВЛЕНИЕ ЭКЗАМЕНАМИ ==========

// Получение списка всех экзаменов
router.get('/exams', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const examsResult = await query(
            'SELECT id, exam_name, created_at FROM exams ORDER BY exam_name',
            []
        );

        res.json({
            exams: examsResult.rows
        });
    } catch (error) {
        console.error('Get exams error:', error);
        res.status(500).json({
            error: 'Failed to get exams',
            message: 'Ошибка при получении списка экзаменов'
        });
    }
});

// Добавление нового экзамена
router.post('/exams', authenticateToken, requireAdmin, [
    body('examName')
        .isLength({ min: 1, max: 100 })
        .withMessage('Название экзамена должно быть от 1 до 100 символов')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation Error',
                details: errors.array()
            });
        }

        const { examName } = req.body;

        // Проверка существования экзамена
        const existingExam = await query(
            'SELECT id FROM exams WHERE exam_name = $1',
            [examName]
        );

        if (existingExam.rows.length > 0) {
            return res.status(400).json({
                error: 'Exam already exists',
                message: 'Экзамен с таким названием уже существует'
            });
        }

        const newExam = await query(
            `INSERT INTO exams (exam_name) 
             VALUES ($1) 
             RETURNING id, exam_name, created_at`,
            [examName]
        );

        res.status(201).json({
            message: 'Экзамен успешно добавлен',
            exam: newExam.rows[0]
        });
    } catch (error) {
        console.error('Add exam error:', error);
        res.status(500).json({
            error: 'Failed to add exam',
            message: 'Ошибка при добавлении экзамена'
        });
    }
});

// Обновление экзамена
router.put('/exams/:id', authenticateToken, requireAdmin, [
    body('examName')
        .isLength({ min: 1, max: 100 })
        .withMessage('Название экзамена должно быть от 1 до 100 символов')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation Error',
                details: errors.array()
            });
        }

        const { id } = req.params;
        const { examName } = req.body;

        // Проверка существования экзамена
        const existingExam = await query(
            'SELECT id FROM exams WHERE id = $1',
            [id]
        );

        if (existingExam.rows.length === 0) {
            return res.status(404).json({
                error: 'Exam not found',
                message: 'Экзамен не найден'
            });
        }

        // Проверка уникальности нового названия
        const duplicateExam = await query(
            'SELECT id FROM exams WHERE exam_name = $1 AND id != $2',
            [examName, id]
        );

        if (duplicateExam.rows.length > 0) {
            return res.status(400).json({
                error: 'Exam name already exists',
                message: 'Экзамен с таким названием уже существует'
            });
        }

        const updatedExam = await query(
            `UPDATE exams 
             SET exam_name = $1 
             WHERE id = $2 
             RETURNING id, exam_name, created_at`,
            [examName, id]
        );

        res.json({
            message: 'Экзамен успешно обновлен',
            exam: updatedExam.rows[0]
        });
    } catch (error) {
        console.error('Update exam error:', error);
        res.status(500).json({
            error: 'Failed to update exam',
            message: 'Ошибка при обновлении экзамена'
        });
    }
});

// Удаление экзамена
router.delete('/exams/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // Проверка существования экзамена
        const existingExam = await query(
            'SELECT id FROM exams WHERE id = $1',
            [id]
        );

        if (existingExam.rows.length === 0) {
            return res.status(404).json({
                error: 'Exam not found',
                message: 'Экзамен не найден'
            });
        }

        // Проверка наличия оценок по экзамену
        const gradesCount = await query(
            'SELECT COUNT(*) as count FROM exam_grades WHERE exam_id = $1',
            [id]
        );

        if (parseInt(gradesCount.rows[0].count) > 0) {
            return res.status(400).json({
                error: 'Exam has grades',
                message: 'Невозможно удалить экзамен, по которому есть оценки'
            });
        }

        await query('DELETE FROM exams WHERE id = $1', [id]);

        res.json({
            message: 'Экзамен успешно удален'
        });
    } catch (error) {
        console.error('Delete exam error:', error);
        res.status(500).json({
            error: 'Failed to delete exam',
            message: 'Ошибка при удалении экзамена'
        });
    }
});

// ========== УПРАВЛЕНИЕ ЗАЧЕТАМИ ==========

// Получение списка всех зачетов
router.get('/credits', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const creditsResult = await query(
            'SELECT id, credit_name, created_at FROM credits ORDER BY credit_name',
            []
        );

        res.json({
            credits: creditsResult.rows
        });
    } catch (error) {
        console.error('Get credits error:', error);
        res.status(500).json({
            error: 'Failed to get credits',
            message: 'Ошибка при получении списка зачетов'
        });
    }
});

// Добавление нового зачета
router.post('/credits', authenticateToken, requireAdmin, [
    body('creditName')
        .isLength({ min: 1, max: 100 })
        .withMessage('Название зачета должно быть от 1 до 100 символов')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation Error',
                details: errors.array()
            });
        }

        const { creditName } = req.body;

        // Проверка существования зачета
        const existingCredit = await query(
            'SELECT id FROM credits WHERE credit_name = $1',
            [creditName]
        );

        if (existingCredit.rows.length > 0) {
            return res.status(400).json({
                error: 'Credit already exists',
                message: 'Зачет с таким названием уже существует'
            });
        }

        const newCredit = await query(
            `INSERT INTO credits (credit_name) 
             VALUES ($1) 
             RETURNING id, credit_name, created_at`,
            [creditName]
        );

        res.status(201).json({
            message: 'Зачет успешно добавлен',
            credit: newCredit.rows[0]
        });
    } catch (error) {
        console.error('Add credit error:', error);
        res.status(500).json({
            error: 'Failed to add credit',
            message: 'Ошибка при добавлении зачета'
        });
    }
});

// Обновление зачета
router.put('/credits/:id', authenticateToken, requireAdmin, [
    body('creditName')
        .isLength({ min: 1, max: 100 })
        .withMessage('Название зачета должно быть от 1 до 100 символов')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation Error',
                details: errors.array()
            });
        }

        const { id } = req.params;
        const { creditName } = req.body;

        // Проверка существования зачета
        const existingCredit = await query(
            'SELECT id FROM credits WHERE id = $1',
            [id]
        );

        if (existingCredit.rows.length === 0) {
            return res.status(404).json({
                error: 'Credit not found',
                message: 'Зачет не найден'
            });
        }

        // Проверка уникальности нового названия
        const duplicateCredit = await query(
            'SELECT id FROM credits WHERE credit_name = $1 AND id != $2',
            [creditName, id]
        );

        if (duplicateCredit.rows.length > 0) {
            return res.status(400).json({
                error: 'Credit name already exists',
                message: 'Зачет с таким названием уже существует'
            });
        }

        const updatedCredit = await query(
            `UPDATE credits 
             SET credit_name = $1 
             WHERE id = $2 
             RETURNING id, credit_name, created_at`,
            [creditName, id]
        );

        res.json({
            message: 'Зачет успешно обновлен',
            credit: updatedCredit.rows[0]
        });
    } catch (error) {
        console.error('Update credit error:', error);
        res.status(500).json({
            error: 'Failed to update credit',
            message: 'Ошибка при обновлении зачета'
        });
    }
});

// Удаление зачета
router.delete('/credits/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // Проверка существования зачета
        const existingCredit = await query(
            'SELECT id FROM credits WHERE id = $1',
            [id]
        );

        if (existingCredit.rows.length === 0) {
            return res.status(404).json({
                error: 'Credit not found',
                message: 'Зачет не найден'
            });
        }

        // Проверка наличия результатов по зачету
        const resultsCount = await query(
            'SELECT COUNT(*) as count FROM credit_results WHERE credit_id = $1',
            [id]
        );

        if (parseInt(resultsCount.rows[0].count) > 0) {
            return res.status(400).json({
                error: 'Credit has results',
                message: 'Невозможно удалить зачет, по которому есть результаты'
            });
        }

        await query('DELETE FROM credits WHERE id = $1', [id]);

        res.json({
            message: 'Зачет успешно удален'
        });
    } catch (error) {
        console.error('Delete credit error:', error);
        res.status(500).json({
            error: 'Failed to delete credit',
            message: 'Ошибка при удалении зачета'
        });
    }
});

// ========== УПРАВЛЕНИЕ ПРЕПОДАВАТЕЛЯМИ ==========

// Получение списка всех преподавателей
router.get('/teachers', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const teachersResult = await query(
            `SELECT t.id, t.full_name, t.created_at, t.updated_at, 
                    u.id as user_id, u.username
             FROM teachers t
             LEFT JOIN users u ON t.user_id = u.id
             ORDER BY t.full_name`,
            []
        );

        res.json({
            teachers: teachersResult.rows.map(row => ({
                id: row.id,
                full_name: row.full_name,
                username: row.username || null,
                user_id: row.user_id,
                created_at: row.created_at,
                updated_at: row.updated_at
            }))
        });
    } catch (error) {
        console.error('Get teachers error:', error);
        res.status(500).json({
            error: 'Failed to get teachers',
            message: 'Ошибка при получении списка преподавателей'
        });
    }
});

// Добавление нового преподавателя
router.post('/teachers', authenticateToken, requireAdmin, [
    body('fullName')
        .isLength({ min: 2, max: 100 })
        .withMessage('ФИО должно быть от 2 до 100 символов')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation Error',
                details: errors.array()
            });
        }

        const { fullName } = req.body;

        // Проверка существования преподавателя с таким ФИО
        const existingTeacher = await query(
            'SELECT id FROM teachers WHERE full_name = $1',
            [fullName]
        );

        if (existingTeacher.rows.length > 0) {
            return res.status(400).json({
                error: 'Teacher already exists',
                message: 'Преподаватель с таким ФИО уже существует'
            });
        }

        // Создание записи преподавателя в таблице teachers
        const newTeacher = await query(
            `INSERT INTO teachers (full_name) 
             VALUES ($1) 
             RETURNING id, full_name, created_at`,
            [fullName]
        );

        res.status(201).json({
            message: 'Преподаватель успешно добавлен',
            teacher: {
                id: newTeacher.rows[0].id,
                fullName: newTeacher.rows[0].full_name,
                createdAt: newTeacher.rows[0].created_at
            }
        });
    } catch (error) {
        console.error('Add teacher error:', error);
        res.status(500).json({
            error: 'Failed to add teacher',
            message: 'Ошибка при добавлении преподавателя'
        });
    }
});

// Обновление преподавателя
router.put('/teachers/:id', authenticateToken, requireAdmin, [
    body('fullName')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('ФИО должно быть от 2 до 100 символов'),
    body('username')
        .optional()
        .isLength({ min: 3, max: 50 })
        .withMessage('Имя пользователя должно быть от 3 до 50 символов')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Имя пользователя может содержать только буквы, цифры и подчеркивания')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation Error',
                details: errors.array()
            });
        }

        const { id } = req.params;
        const { fullName } = req.body;

        // Проверка существования преподавателя
        const existingTeacher = await query(
            'SELECT id, user_id FROM teachers WHERE id = $1',
            [id]
        );

        if (existingTeacher.rows.length === 0) {
            return res.status(404).json({
                error: 'Teacher not found',
                message: 'Преподаватель не найден'
            });
        }

        const teacher = existingTeacher.rows[0];

        // Проверка, что ФИО не занято другим преподавателем
        if (fullName) {
            const fullNameCheck = await query(
                'SELECT id FROM teachers WHERE full_name = $1 AND id != $2',
                [fullName, id]
            );

            if (fullNameCheck.rows.length > 0) {
                return res.status(400).json({
                    error: 'Full name already exists',
                    message: 'Преподаватель с таким ФИО уже существует'
                });
            }
        }

        if (!fullName) {
            return res.status(400).json({
                error: 'No fields to update',
                message: 'Нет полей для обновления'
            });
        }

        // Обновление ФИО преподавателя
        const updatedTeacher = await query(
            `UPDATE teachers 
             SET full_name = $1, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $2 
             RETURNING id, full_name, updated_at`,
            [fullName, id]
        );

        // Если преподаватель уже зарегистрирован, обновляем также ФИО в users
        if (teacher.user_id) {
            await query(
                `UPDATE users 
                 SET full_name = $1, updated_at = CURRENT_TIMESTAMP 
                 WHERE id = $2`,
                [fullName, teacher.user_id]
            );
        }

        res.json({
            message: 'Преподаватель успешно обновлен',
            teacher: updatedTeacher.rows[0]
        });
    } catch (error) {
        console.error('Update teacher error:', error);
        res.status(500).json({
            error: 'Failed to update teacher',
            message: 'Ошибка при обновлении преподавателя'
        });
    }
});

// Удаление преподавателя
router.delete('/teachers/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // Проверка существования преподавателя
        const existingTeacher = await query(
            'SELECT id, user_id FROM teachers WHERE id = $1',
            [id]
        );

        if (existingTeacher.rows.length === 0) {
            return res.status(404).json({
                error: 'Teacher not found',
                message: 'Преподаватель не найден'
            });
        }

        const teacher = existingTeacher.rows[0];

        // Удаление связей преподавателя с дисциплинами и группами
        await query('DELETE FROM teacher_exams WHERE teacher_id = $1', [id]);
        await query('DELETE FROM teacher_credits WHERE teacher_id = $1', [id]);
        await query('DELETE FROM teacher_groups WHERE teacher_id = $1', [id]);

        // Если преподаватель зарегистрирован, удаляем пользователя
        if (teacher.user_id) {
            await query('DELETE FROM users WHERE id = $1', [teacher.user_id]);
        }

        // Удаление записи преподавателя
        await query('DELETE FROM teachers WHERE id = $1', [id]);

        res.json({
            message: 'Преподаватель успешно удален'
        });
    } catch (error) {
        console.error('Delete teacher error:', error);
        res.status(500).json({
            error: 'Failed to delete teacher',
            message: 'Ошибка при удалении преподавателя'
        });
    }
});

// ========== ЗАКРЕПЛЕНИЕ ДИСЦИПЛИН ЗА ПРЕПОДАВАТЕЛЯМИ ==========

// Получение дисциплин преподавателя
router.get('/teachers/:teacherId/disciplines', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { teacherId } = req.params;

        // Проверка существования преподавателя и получение user_id
        const teacherResult = await query(
            'SELECT id, user_id FROM teachers WHERE id = $1',
            [teacherId]
        );

        if (teacherResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Teacher not found',
                message: 'Преподаватель не найден'
            });
        }

        const teacher = teacherResult.rows[0];

        // Получение закрепленных экзаменов
        const examsResult = await query(
            `SELECT e.id, e.exam_name
             FROM teacher_exams te
             JOIN exams e ON te.exam_id = e.id
             WHERE te.teacher_id = $1
             ORDER BY e.exam_name`,
            [teacherId]
        );

        // Получение закрепленных зачетов
        const creditsResult = await query(
            `SELECT c.id, c.credit_name
             FROM teacher_credits tc
             JOIN credits c ON tc.credit_id = c.id
             WHERE tc.teacher_id = $1
             ORDER BY c.credit_name`,
            [teacherId]
        );

        res.json({
            exams: examsResult.rows,
            credits: creditsResult.rows
        });
    } catch (error) {
        console.error('Get teacher disciplines error:', error);
        res.status(500).json({
            error: 'Failed to get teacher disciplines',
            message: 'Ошибка при получении дисциплин преподавателя'
        });
    }
});

// Закрепление экзамена за преподавателем
router.post('/teachers/:teacherId/exams/:examId', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { teacherId, examId } = req.params;

        // Проверка существования преподавателя и получение user_id
        const teacherResult = await query(
            'SELECT id, user_id FROM teachers WHERE id = $1',
            [teacherId]
        );

        if (teacherResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Teacher not found',
                message: 'Преподаватель не найден'
            });
        }

        const teacher = teacherResult.rows[0];

        // Проверка существования экзамена
        const examResult = await query(
            'SELECT id FROM exams WHERE id = $1',
            [examId]
        );

        if (examResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Exam not found',
                message: 'Экзамен не найден'
            });
        }

        // Проверка существования связи
        const existingLink = await query(
            'SELECT id FROM teacher_exams WHERE teacher_id = $1 AND exam_id = $2',
            [teacherId, examId]
        );

        if (existingLink.rows.length > 0) {
            return res.status(400).json({
                error: 'Link already exists',
                message: 'Экзамен уже закреплен за преподавателем'
            });
        }

        const newLink = await query(
            `INSERT INTO teacher_exams (teacher_id, exam_id) 
             VALUES ($1, $2) 
             RETURNING id, teacher_id, exam_id, created_at`,
            [teacherId, examId]
        );

        res.status(201).json({
            message: 'Экзамен успешно закреплен за преподавателем',
            link: newLink.rows[0]
        });
    } catch (error) {
        console.error('Link exam to teacher error:', error);
        res.status(500).json({
            error: 'Failed to link exam to teacher',
            message: 'Ошибка при закреплении экзамена за преподавателем'
        });
    }
});

// Открепление экзамена от преподавателя
router.delete('/teachers/:teacherId/exams/:examId', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { teacherId, examId } = req.params;

        // Проверка существования преподавателя
        const teacherResult = await query(
            'SELECT id FROM teachers WHERE id = $1',
            [teacherId]
        );

        if (teacherResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Teacher not found',
                message: 'Преподаватель не найден'
            });
        }

        await query(
            'DELETE FROM teacher_exams WHERE teacher_id = $1 AND exam_id = $2',
            [teacherId, examId]
        );

        res.json({
            message: 'Экзамен успешно откреплен от преподавателя'
        });
    } catch (error) {
        console.error('Unlink exam from teacher error:', error);
        res.status(500).json({
            error: 'Failed to unlink exam from teacher',
            message: 'Ошибка при откреплении экзамена от преподавателя'
        });
    }
});

// Закрепление зачета за преподавателем
router.post('/teachers/:teacherId/credits/:creditId', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { teacherId, creditId } = req.params;

        // Проверка существования преподавателя и получение user_id
        const teacherResult = await query(
            'SELECT id, user_id FROM teachers WHERE id = $1',
            [teacherId]
        );

        if (teacherResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Teacher not found',
                message: 'Преподаватель не найден'
            });
        }

        const teacher = teacherResult.rows[0];

        // Проверка существования зачета
        const creditResult = await query(
            'SELECT id FROM credits WHERE id = $1',
            [creditId]
        );

        if (creditResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Credit not found',
                message: 'Зачет не найден'
            });
        }

        // Проверка существования связи
        const existingLink = await query(
            'SELECT id FROM teacher_credits WHERE teacher_id = $1 AND credit_id = $2',
            [teacherId, creditId]
        );

        if (existingLink.rows.length > 0) {
            return res.status(400).json({
                error: 'Link already exists',
                message: 'Зачет уже закреплен за преподавателем'
            });
        }

        const newLink = await query(
            `INSERT INTO teacher_credits (teacher_id, credit_id) 
             VALUES ($1, $2) 
             RETURNING id, teacher_id, credit_id, created_at`,
            [teacherId, creditId]
        );

        res.status(201).json({
            message: 'Зачет успешно закреплен за преподавателем',
            link: newLink.rows[0]
        });
    } catch (error) {
        console.error('Link credit to teacher error:', error);
        res.status(500).json({
            error: 'Failed to link credit to teacher',
            message: 'Ошибка при закреплении зачета за преподавателем'
        });
    }
});

// Открепление зачета от преподавателя
router.delete('/teachers/:teacherId/credits/:creditId', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { teacherId, creditId } = req.params;

        // Проверка существования преподавателя
        const teacherResult = await query(
            'SELECT id FROM teachers WHERE id = $1',
            [teacherId]
        );

        if (teacherResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Teacher not found',
                message: 'Преподаватель не найден'
            });
        }

        await query(
            'DELETE FROM teacher_credits WHERE teacher_id = $1 AND credit_id = $2',
            [teacherId, creditId]
        );

        res.json({
            message: 'Зачет успешно откреплен от преподавателя'
        });
    } catch (error) {
        console.error('Unlink credit from teacher error:', error);
        res.status(500).json({
            error: 'Failed to unlink credit from teacher',
            message: 'Ошибка при откреплении зачета от преподавателя'
        });
    }
});

// ========== ЗАКРЕПЛЕНИЕ ГРУПП ЗА ПРЕПОДАВАТЕЛЯМИ ==========

// Получение групп преподавателя
router.get('/teachers/:teacherId/groups', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { teacherId } = req.params;

        // Проверка существования преподавателя и получение user_id
        const teacherResult = await query(
            'SELECT id, user_id FROM teachers WHERE id = $1',
            [teacherId]
        );

        if (teacherResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Teacher not found',
                message: 'Преподаватель не найден'
            });
        }

        const teacher = teacherResult.rows[0];

        // Получение закрепленных групп
        const groupsResult = await query(
            `SELECT g.id, g.group_name
             FROM teacher_groups tg
             JOIN groups g ON tg.group_id = g.id
             WHERE tg.teacher_id = $1
             ORDER BY g.group_name`,
            [teacherId]
        );

        res.json({
            groups: groupsResult.rows
        });
    } catch (error) {
        console.error('Get teacher groups error:', error);
        res.status(500).json({
            error: 'Failed to get teacher groups',
            message: 'Ошибка при получении групп преподавателя'
        });
    }
});

// Закрепление группы за преподавателем
router.post('/teachers/:teacherId/groups/:groupId', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { teacherId, groupId } = req.params;

        // Проверка существования преподавателя и получение user_id
        const teacherResult = await query(
            'SELECT id, user_id FROM teachers WHERE id = $1',
            [teacherId]
        );

        if (teacherResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Teacher not found',
                message: 'Преподаватель не найден'
            });
        }

        const teacher = teacherResult.rows[0];

        // Проверка существования группы
        const groupResult = await query(
            'SELECT id FROM groups WHERE id = $1',
            [groupId]
        );

        if (groupResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Group not found',
                message: 'Группа не найдена'
            });
        }

        // Проверка существования связи
        const existingLink = await query(
            'SELECT id FROM teacher_groups WHERE teacher_id = $1 AND group_id = $2',
            [teacherId, groupId]
        );

        if (existingLink.rows.length > 0) {
            return res.status(400).json({
                error: 'Link already exists',
                message: 'Группа уже закреплена за преподавателем'
            });
        }

        const newLink = await query(
            `INSERT INTO teacher_groups (teacher_id, group_id) 
             VALUES ($1, $2) 
             RETURNING id, teacher_id, group_id, created_at`,
            [teacherId, groupId]
        );

        res.status(201).json({
            message: 'Группа успешно закреплена за преподавателем',
            link: newLink.rows[0]
        });
    } catch (error) {
        console.error('Link group to teacher error:', error);
        res.status(500).json({
            error: 'Failed to link group to teacher',
            message: 'Ошибка при закреплении группы за преподавателем'
        });
    }
});

// Открепление группы от преподавателя
router.delete('/teachers/:teacherId/groups/:groupId', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { teacherId, groupId } = req.params;

        // Проверка существования преподавателя
        const teacherResult = await query(
            'SELECT id FROM teachers WHERE id = $1',
            [teacherId]
        );

        if (teacherResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Teacher not found',
                message: 'Преподаватель не найден'
            });
        }

        await query(
            'DELETE FROM teacher_groups WHERE teacher_id = $1 AND group_id = $2',
            [teacherId, groupId]
        );

        res.json({
            message: 'Группа успешно откреплена от преподавателя'
        });
    } catch (error) {
        console.error('Unlink group from teacher error:', error);
        res.status(500).json({
            error: 'Failed to unlink group from teacher',
            message: 'Ошибка при откреплении группы от преподавателя'
        });
    }
});

module.exports = router;

