const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../utils/database');
const { authenticateToken, requireTeacher, requireAdmin, canViewStudent } = require('../middleware/auth');

const router = express.Router();

// Получение информации о текущем студенте (для авторизованного пользователя)
router.get('/me', authenticateToken, async (req, res) => {
    try {
        // Ищем запись студента, связанную с текущим пользователем
        const studentResult = await query(
            `SELECT s.id, s.full_name, s.group_id, g.group_name, s.created_at, s.updated_at
             FROM students s
             JOIN groups g ON s.group_id = g.id
             WHERE s.user_id = $1`,
            [req.user.id]
        );

        if (studentResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Student not found',
                message: 'Студент не найден для текущего пользователя'
            });
        }

        const student = studentResult.rows[0];

        // Возвращаем так же последние прогнозы (опционально)
        const predictionResult = await query(
            `SELECT predicted_exam_grade, predicted_credit_pass_rate, overall_performance_score, prediction_date
             FROM performance_predictions
             WHERE student_id = $1
             ORDER BY prediction_date DESC
             LIMIT 1`,
            [student.id]
        );

        res.json({
            student,
            prediction: predictionResult.rows[0] || null
        });

    } catch (error) {
        console.error('Get current student error:', error);
        res.status(500).json({
            error: 'Failed to get current student',
            message: 'Ошибка при получении данных текущего студента'
        });
    }
});

// Получение списка всех студентов (для преподавателей - только из закрепленных групп, для администраторов - все)
router.get('/', authenticateToken, async (req, res) => {
    // Проверка роли
    if (req.user.role_name !== 'teacher' && req.user.role_name !== 'admin') {
        return res.status(403).json({
            error: 'Access denied',
            message: 'Доступ запрещен'
        });
    }
    try {
        const { group, search } = req.query;
        
        let sqlQuery = `
            SELECT s.id, s.full_name, g.group_name, s.created_at,
                   COUNT(eg.id) as exam_count,
                   COUNT(cr.id) as credit_count
            FROM students s
            JOIN groups g ON s.group_id = g.id
            LEFT JOIN exam_grades eg ON s.id = eg.student_id
            LEFT JOIN credit_results cr ON s.id = cr.student_id
        `;
        
        const whereConditions = [];
        const queryParams = [];
        let paramIndex = 1;

        // Для преподавателей - только студенты из закрепленных групп
        if (req.user.role_name === 'teacher') {
            // Получаем teachers.id по user_id
            const teacherRecord = await query(
                'SELECT id FROM teachers WHERE user_id = $1',
                [req.user.id]
            );

            if (teacherRecord.rows.length === 0) {
                return res.json({ students: [], total: 0 });
            }

            whereConditions.push(`g.id IN (
                SELECT group_id FROM teacher_groups WHERE teacher_id = $${paramIndex++}
            )`);
            queryParams.push(teacherRecord.rows[0].id);
        }

        if (group) {
            whereConditions.push(`g.group_name = $${paramIndex++}`);
            queryParams.push(group);
        }

        if (search) {
            whereConditions.push(`s.full_name ILIKE $${paramIndex++}`);
            queryParams.push(`%${search}%`);
        }

        if (whereConditions.length > 0) {
            sqlQuery += ` WHERE ${whereConditions.join(' AND ')}`;
        }

        sqlQuery += ` GROUP BY s.id, s.full_name, g.group_name, s.created_at
                      ORDER BY g.group_name, s.full_name`;

        const result = await query(sqlQuery, queryParams);

        res.json({
            students: result.rows,
            total: result.rows.length
        });

    } catch (error) {
        console.error('Get students error:', error);
        res.status(500).json({
            error: 'Failed to get students',
            message: 'Ошибка при получении списка студентов'
        });
    }
});

// Получение информации о конкретном студенте
router.get('/:id', authenticateToken, canViewStudent, async (req, res) => {
    try {
        const studentId = req.params.id;

        // Получение основной информации о студенте
        const studentResult = await query(
            `SELECT s.id, s.full_name, g.group_name, s.created_at, s.updated_at
             FROM students s
             JOIN groups g ON s.group_id = g.id
             WHERE s.id = $1`,
            [studentId]
        );

        if (studentResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Student not found',
                message: 'Студент не найден'
            });
        }

        const student = studentResult.rows[0];

        // Получение оценок по экзаменам
        const examGradesResult = await query(
            `SELECT e.exam_name, eg.grade, eg.created_at
             FROM exam_grades eg
             JOIN exams e ON eg.exam_id = e.id
             WHERE eg.student_id = $1
             ORDER BY e.exam_name`,
            [studentId]
        );

        // Получение результатов зачетов
        const creditResultsResult = await query(
            `SELECT c.credit_name, cr.is_passed, cr.created_at
             FROM credit_results cr
             JOIN credits c ON cr.credit_id = c.id
             WHERE cr.student_id = $1
             ORDER BY c.credit_name`,
            [studentId]
        );

        // Получение прогнозов успеваемости
        const predictionsResult = await query(
            `SELECT predicted_exam_grade, predicted_credit_pass_rate, 
                    overall_performance_score, prediction_date
             FROM performance_predictions
             WHERE student_id = $1
             ORDER BY prediction_date DESC
             LIMIT 1`,
            [studentId]
        );

        res.json({
            student: {
                id: student.id,
                fullName: student.full_name,
                groupName: student.group_name,
                createdAt: student.created_at,
                updatedAt: student.updated_at
            },
            examGrades: examGradesResult.rows,
            creditResults: creditResultsResult.rows,
            prediction: predictionsResult.rows.length > 0 ? predictionsResult.rows[0] : null
        });

    } catch (error) {
        console.error('Get student error:', error);
        res.status(500).json({
            error: 'Failed to get student',
            message: 'Ошибка при получении информации о студенте'
        });
    }
});

// Добавление нового студента (только для администраторов)
router.post('/', authenticateToken, requireAdmin, [
    body('fullName')
        .isLength({ min: 2, max: 100 })
        .withMessage('ФИО должно быть от 2 до 100 символов'),
    body('groupId')
        .isInt({ min: 1 })
        .withMessage('ID группы должен быть положительным числом'),
    body('userId')
        .optional()
        .isInt({ min: 1 })
        .withMessage('ID пользователя должен быть положительным числом')
], async (req, res) => {
    try {
        // Проверка валидации
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation Error',
                details: errors.array()
            });
        }

        const { fullName, groupId, userId } = req.body;

        // Проверка существования группы
        const groupResult = await query(
            'SELECT id FROM groups WHERE id = $1',
            [groupId]
        );

        if (groupResult.rows.length === 0) {
            return res.status(400).json({
                error: 'Group not found',
                message: 'Группа не найдена'
            });
        }

        // Если указан userId, проверяем его существование
        if (userId) {
            const userResult = await query(
                'SELECT id FROM users WHERE id = $1',
                [userId]
            );

            if (userResult.rows.length === 0) {
                return res.status(400).json({
                    error: 'User not found',
                    message: 'Пользователь не найден'
                });
            }

            // Проверяем, что пользователь не является уже студентом
            const existingStudentResult = await query(
                'SELECT id FROM students WHERE user_id = $1',
                [userId]
            );

            if (existingStudentResult.rows.length > 0) {
                return res.status(400).json({
                    error: 'User already has student record',
                    message: 'Пользователь уже является студентом'
                });
            }
        }

        // Создание студента
        const newStudent = await query(
            `INSERT INTO students (full_name, group_id, user_id) 
             VALUES ($1, $2, $3) 
             RETURNING id, full_name, group_id, user_id, created_at`,
            [fullName, groupId, userId || null]
        );

        // Получение информации о группе для ответа
        const groupInfoResult = await query(
            'SELECT group_name FROM groups WHERE id = $1',
            [groupId]
        );

        res.status(201).json({
            message: 'Студент успешно добавлен',
            student: {
                id: newStudent.rows[0].id,
                fullName: newStudent.rows[0].full_name,
                groupId: newStudent.rows[0].group_id,
                groupName: groupInfoResult.rows[0].group_name,
                userId: newStudent.rows[0].user_id,
                createdAt: newStudent.rows[0].created_at
            }
        });

    } catch (error) {
        console.error('Add student error:', error);
        res.status(500).json({
            error: 'Failed to add student',
            message: 'Ошибка при добавлении студента'
        });
    }
});

// Обновление данных студента (только для администраторов)
router.put('/:id', authenticateToken, requireAdmin, [
    body('fullName')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('ФИО должно быть от 2 до 100 символов'),
    body('groupId')
        .optional()
        .isInt({ min: 1 })
        .withMessage('ID группы должен быть положительным числом')
], async (req, res) => {
    try {
        // Проверка валидации
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation Error',
                details: errors.array()
            });
        }

        const studentId = req.params.id;
        const { fullName, groupId } = req.body;

        // Проверка существования студента
        const existingStudent = await query(
            'SELECT id FROM students WHERE id = $1',
            [studentId]
        );

        if (existingStudent.rows.length === 0) {
            return res.status(404).json({
                error: 'Student not found',
                message: 'Студент не найден'
            });
        }

        // Подготовка данных для обновления
        let updateFields = [];
        let updateValues = [];
        let valueIndex = 1;

        if (fullName) {
            updateFields.push(`full_name = $${valueIndex++}`);
            updateValues.push(fullName);
        }

        if (groupId) {
            // Проверка существования группы
            const groupResult = await query(
                'SELECT id FROM groups WHERE id = $1',
                [groupId]
            );

            if (groupResult.rows.length === 0) {
                return res.status(400).json({
                    error: 'Group not found',
                    message: 'Группа не найдена'
                });
            }

            updateFields.push(`group_id = $${valueIndex++}`);
            updateValues.push(groupId);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                error: 'No fields to update',
                message: 'Нет полей для обновления'
            });
        }

        updateValues.push(studentId);

        // Обновление студента
        const updateResult = await query(
            `UPDATE students 
             SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $${valueIndex} 
             RETURNING id, full_name, group_id, updated_at`,
            updateValues
        );

        // Получение информации о группе для ответа
        const groupInfoResult = await query(
            'SELECT group_name FROM groups WHERE id = $1',
            [updateResult.rows[0].group_id]
        );

        res.json({
            message: 'Данные студента успешно обновлены',
            student: {
                id: updateResult.rows[0].id,
                fullName: updateResult.rows[0].full_name,
                groupId: updateResult.rows[0].group_id,
                groupName: groupInfoResult.rows[0].group_name,
                updatedAt: updateResult.rows[0].updated_at
            }
        });

    } catch (error) {
        console.error('Update student error:', error);
        res.status(500).json({
            error: 'Failed to update student',
            message: 'Ошибка при обновлении данных студента'
        });
    }
});

// Удаление студента (только для администраторов)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const studentId = req.params.id;

        // Проверка существования студента
        const existingStudent = await query(
            'SELECT id FROM students WHERE id = $1',
            [studentId]
        );

        if (existingStudent.rows.length === 0) {
            return res.status(404).json({
                error: 'Student not found',
                message: 'Студент не найден'
            });
        }

        // Удаление связанных данных (оценки, зачеты, прогнозы)
        await query('DELETE FROM performance_predictions WHERE student_id = $1', [studentId]);
        await query('DELETE FROM exam_grades WHERE student_id = $1', [studentId]);
        await query('DELETE FROM credit_results WHERE student_id = $1', [studentId]);
        
        // Удаление студента
        await query('DELETE FROM students WHERE id = $1', [studentId]);

        res.json({
            message: 'Студент успешно удален'
        });

    } catch (error) {
        console.error('Delete student error:', error);
        res.status(500).json({
            error: 'Failed to delete student',
            message: 'Ошибка при удалении студента'
        });
    }
});

// Получение списка групп (для преподавателей - только закрепленные, для админов - все)
router.get('/groups/list', authenticateToken, async (req, res) => {
    try {
        let groupsResult;
        
        if (req.user.role_name === 'admin') {
            // Администратор видит все группы
            groupsResult = await query(
                'SELECT id, group_name FROM groups ORDER BY group_name',
                []
            );
        } else if (req.user.role_name === 'teacher') {
            // Преподаватель видит только закрепленные за ним группы
            groupsResult = await query(
                `SELECT g.id, g.group_name 
                 FROM groups g
                 JOIN teacher_groups tg ON g.id = tg.group_id
                 WHERE tg.teacher_id = $1
                 ORDER BY g.group_name`,
                [req.user.id]
            );
        } else {
            return res.status(403).json({
                error: 'Access denied',
                message: 'Доступ запрещен'
            });
        }

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

module.exports = router; 