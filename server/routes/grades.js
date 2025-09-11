const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../utils/database');
const { authenticateToken, requireTeacher, canViewStudent } = require('../middleware/auth');

const router = express.Router();

// Получение оценок студента
router.get('/student/:studentId', authenticateToken, canViewStudent, async (req, res) => {
    try {
        const studentId = req.params.studentId;

        // Получение оценок по экзаменам
        const examGradesResult = await query(
            `SELECT e.id as exam_id, e.exam_name, eg.grade, eg.created_at, eg.updated_at
             FROM exam_grades eg
             JOIN exams e ON eg.exam_id = e.id
             WHERE eg.student_id = $1
             ORDER BY e.exam_name`,
            [studentId]
        );

        // Получение результатов зачетов
        const creditResultsResult = await query(
            `SELECT c.id as credit_id, c.credit_name, cr.is_passed, cr.created_at, cr.updated_at
             FROM credit_results cr
             JOIN credits c ON cr.credit_id = c.id
             WHERE cr.student_id = $1
             ORDER BY c.credit_name`,
            [studentId]
        );

        res.json({
            examGrades: examGradesResult.rows,
            creditResults: creditResultsResult.rows
        });

    } catch (error) {
        console.error('Get grades error:', error);
        res.status(500).json({
            error: 'Failed to get grades',
            message: 'Ошибка при получении оценок'
        });
    }
});

// Добавление оценки по экзамену (только для преподавателей)
router.post('/exam', authenticateToken, requireTeacher, [
    body('studentId')
        .isInt({ min: 1 })
        .withMessage('ID студента должен быть положительным числом'),
    body('examId')
        .isInt({ min: 1 })
        .withMessage('ID экзамена должен быть положительным числом'),
    body('grade')
        .isInt({ min: 2, max: 5 })
        .withMessage('Оценка должна быть от 2 до 5')
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

        const { studentId, examId, grade } = req.body;

        // Проверка существования студента
        const studentResult = await query(
            'SELECT id FROM students WHERE id = $1',
            [studentId]
        );

        if (studentResult.rows.length === 0) {
            return res.status(400).json({
                error: 'Student not found',
                message: 'Студент не найден'
            });
        }

        // Проверка существования экзамена
        const examResult = await query(
            'SELECT id FROM exams WHERE id = $1',
            [examId]
        );

        if (examResult.rows.length === 0) {
            return res.status(400).json({
                error: 'Exam not found',
                message: 'Экзамен не найден'
            });
        }

        // Проверка существования оценки
        const existingGrade = await query(
            'SELECT id FROM exam_grades WHERE student_id = $1 AND exam_id = $2',
            [studentId, examId]
        );

        if (existingGrade.rows.length > 0) {
            return res.status(400).json({
                error: 'Grade already exists',
                message: 'Оценка по этому экзамену уже существует'
            });
        }

        // Добавление оценки
        const newGrade = await query(
            `INSERT INTO exam_grades (student_id, exam_id, grade) 
             VALUES ($1, $2, $3) 
             RETURNING id, student_id, exam_id, grade, created_at`,
            [studentId, examId, grade]
        );

        // Получение информации об экзамене для ответа
        const examInfoResult = await query(
            'SELECT exam_name FROM exams WHERE id = $1',
            [examId]
        );

        res.status(201).json({
            message: 'Оценка успешно добавлена',
            grade: {
                id: newGrade.rows[0].id,
                studentId: newGrade.rows[0].student_id,
                examId: newGrade.rows[0].exam_id,
                examName: examInfoResult.rows[0].exam_name,
                grade: newGrade.rows[0].grade,
                createdAt: newGrade.rows[0].created_at
            }
        });

    } catch (error) {
        console.error('Add exam grade error:', error);
        res.status(500).json({
            error: 'Failed to add exam grade',
            message: 'Ошибка при добавлении оценки'
        });
    }
});

// Обновление оценки по экзамену (только для преподавателей)
router.put('/exam/:id', authenticateToken, requireTeacher, [
    body('grade')
        .isInt({ min: 2, max: 5 })
        .withMessage('Оценка должна быть от 2 до 5')
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

        const gradeId = req.params.id;
        const { grade } = req.body;

        // Проверка существования оценки
        const existingGrade = await query(
            'SELECT id FROM exam_grades WHERE id = $1',
            [gradeId]
        );

        if (existingGrade.rows.length === 0) {
            return res.status(404).json({
                error: 'Grade not found',
                message: 'Оценка не найдена'
            });
        }

        // Обновление оценки
        const updateResult = await query(
            `UPDATE exam_grades 
             SET grade = $1, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $2 
             RETURNING id, student_id, exam_id, grade, updated_at`,
            [grade, gradeId]
        );

        // Получение информации об экзамене для ответа
        const examInfoResult = await query(
            'SELECT exam_name FROM exams WHERE id = $1',
            [updateResult.rows[0].exam_id]
        );

        res.json({
            message: 'Оценка успешно обновлена',
            grade: {
                id: updateResult.rows[0].id,
                studentId: updateResult.rows[0].student_id,
                examId: updateResult.rows[0].exam_id,
                examName: examInfoResult.rows[0].exam_name,
                grade: updateResult.rows[0].grade,
                updatedAt: updateResult.rows[0].updated_at
            }
        });

    } catch (error) {
        console.error('Update exam grade error:', error);
        res.status(500).json({
            error: 'Failed to update exam grade',
            message: 'Ошибка при обновлении оценки'
        });
    }
});

// Добавление результата зачета (только для преподавателей)
router.post('/credit', authenticateToken, requireTeacher, [
    body('studentId')
        .isInt({ min: 1 })
        .withMessage('ID студента должен быть положительным числом'),
    body('creditId')
        .isInt({ min: 1 })
        .withMessage('ID зачета должен быть положительным числом'),
    body('isPassed')
        .isBoolean()
        .withMessage('Результат зачета должен быть true или false')
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

        const { studentId, creditId, isPassed } = req.body;

        // Проверка существования студента
        const studentResult = await query(
            'SELECT id FROM students WHERE id = $1',
            [studentId]
        );

        if (studentResult.rows.length === 0) {
            return res.status(400).json({
                error: 'Student not found',
                message: 'Студент не найден'
            });
        }

        // Проверка существования зачета
        const creditResult = await query(
            'SELECT id FROM credits WHERE id = $1',
            [creditId]
        );

        if (creditResult.rows.length === 0) {
            return res.status(400).json({
                error: 'Credit not found',
                message: 'Зачет не найден'
            });
        }

        // Проверка существования результата
        const existingResult = await query(
            'SELECT id FROM credit_results WHERE student_id = $1 AND credit_id = $2',
            [studentId, creditId]
        );

        if (existingResult.rows.length > 0) {
            return res.status(400).json({
                error: 'Credit result already exists',
                message: 'Результат по этому зачету уже существует'
            });
        }

        // Добавление результата
        const newResult = await query(
            `INSERT INTO credit_results (student_id, credit_id, is_passed) 
             VALUES ($1, $2, $3) 
             RETURNING id, student_id, credit_id, is_passed, created_at`,
            [studentId, creditId, isPassed]
        );

        // Получение информации о зачете для ответа
        const creditInfoResult = await query(
            'SELECT credit_name FROM credits WHERE id = $1',
            [creditId]
        );

        res.status(201).json({
            message: 'Результат зачета успешно добавлен',
            creditResult: {
                id: newResult.rows[0].id,
                studentId: newResult.rows[0].student_id,
                creditId: newResult.rows[0].credit_id,
                creditName: creditInfoResult.rows[0].credit_name,
                isPassed: newResult.rows[0].is_passed,
                createdAt: newResult.rows[0].created_at
            }
        });

    } catch (error) {
        console.error('Add credit result error:', error);
        res.status(500).json({
            error: 'Failed to add credit result',
            message: 'Ошибка при добавлении результата зачета'
        });
    }
});

// Обновление результата зачета (только для преподавателей)
router.put('/credit/:id', authenticateToken, requireTeacher, [
    body('isPassed')
        .isBoolean()
        .withMessage('Результат зачета должен быть true или false')
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

        const resultId = req.params.id;
        const { isPassed } = req.body;

        // Проверка существования результата
        const existingResult = await query(
            'SELECT id FROM credit_results WHERE id = $1',
            [resultId]
        );

        if (existingResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Credit result not found',
                message: 'Результат зачета не найден'
            });
        }

        // Обновление результата
        const updateResult = await query(
            `UPDATE credit_results 
             SET is_passed = $1, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $2 
             RETURNING id, student_id, credit_id, is_passed, updated_at`,
            [isPassed, resultId]
        );

        // Получение информации о зачете для ответа
        const creditInfoResult = await query(
            'SELECT credit_name FROM credits WHERE id = $1',
            [updateResult.rows[0].credit_id]
        );

        res.json({
            message: 'Результат зачета успешно обновлен',
            creditResult: {
                id: updateResult.rows[0].id,
                studentId: updateResult.rows[0].student_id,
                creditId: updateResult.rows[0].credit_id,
                creditName: creditInfoResult.rows[0].credit_name,
                isPassed: updateResult.rows[0].is_passed,
                updatedAt: updateResult.rows[0].updated_at
            }
        });

    } catch (error) {
        console.error('Update credit result error:', error);
        res.status(500).json({
            error: 'Failed to update credit result',
            message: 'Ошибка при обновлении результата зачета'
        });
    }
});

// Получение списка экзаменов
router.get('/exams/list', authenticateToken, async (req, res) => {
    try {
        const examsResult = await query(
            'SELECT id, exam_name FROM exams ORDER BY exam_name',
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

// Получение списка зачетов
router.get('/credits/list', authenticateToken, async (req, res) => {
    try {
        const creditsResult = await query(
            'SELECT id, credit_name FROM credits ORDER BY credit_name',
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

// Удаление оценки по экзамену (только для преподавателей)
router.delete('/exam/:id', authenticateToken, requireTeacher, async (req, res) => {
    try {
        const gradeId = req.params.id;

        // Проверка существования оценки
        const existingGrade = await query(
            'SELECT id FROM exam_grades WHERE id = $1',
            [gradeId]
        );

        if (existingGrade.rows.length === 0) {
            return res.status(404).json({
                error: 'Grade not found',
                message: 'Оценка не найдена'
            });
        }

        // Удаление оценки
        await query('DELETE FROM exam_grades WHERE id = $1', [gradeId]);

        res.json({
            message: 'Оценка успешно удалена'
        });

    } catch (error) {
        console.error('Delete exam grade error:', error);
        res.status(500).json({
            error: 'Failed to delete exam grade',
            message: 'Ошибка при удалении оценки'
        });
    }
});

// Удаление результата зачета (только для преподавателей)
router.delete('/credit/:id', authenticateToken, requireTeacher, async (req, res) => {
    try {
        const resultId = req.params.id;

        // Проверка существования результата
        const existingResult = await query(
            'SELECT id FROM credit_results WHERE id = $1',
            [resultId]
        );

        if (existingResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Credit result not found',
                message: 'Результат зачета не найден'
            });
        }

        // Удаление результата
        await query('DELETE FROM credit_results WHERE id = $1', [resultId]);

        res.json({
            message: 'Результат зачета успешно удален'
        });

    } catch (error) {
        console.error('Delete credit result error:', error);
        res.status(500).json({
            error: 'Failed to delete credit result',
            message: 'Ошибка при удалении результата зачета'
        });
    }
});

module.exports = router; 