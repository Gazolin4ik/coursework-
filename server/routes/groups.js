const express = require('express');
const { query } = require('../utils/database');
const { authenticateToken, requireTeacher } = require('../middleware/auth');

const router = express.Router();

// Получение групп преподавателя
router.get('/teacher', authenticateToken, requireTeacher, async (req, res) => {
    try {
        // Получаем teachers.id по user_id
        const teacherRecord = await query(
            'SELECT id FROM teachers WHERE user_id = $1',
            [req.user.id]
        );

        if (teacherRecord.rows.length === 0) {
            return res.json({ groups: [] });
        }

        const teacherId = teacherRecord.rows[0].id;

        // Получаем закрепленные группы
        const groupsResult = await query(
            `SELECT g.id, g.group_name
             FROM groups g
             JOIN teacher_groups tg ON g.id = tg.group_id
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
            error: 'Failed to get groups',
            message: 'Ошибка при получении групп'
        });
    }
});

// Получение студентов группы с оценками по выбранной дисциплине
router.get('/:groupId/students', authenticateToken, requireTeacher, async (req, res) => {
    try {
        const { groupId } = req.params;
        const { disciplineType, disciplineId } = req.query; // 'exam' or 'credit'

        // Получаем teachers.id по user_id
        const teacherRecord = await query(
            'SELECT id FROM teachers WHERE user_id = $1',
            [req.user.id]
        );

        if (teacherRecord.rows.length === 0) {
            return res.status(403).json({
                error: 'Access denied',
                message: 'Преподаватель не найден'
            });
        }

        const teacherId = teacherRecord.rows[0].id;

        // Проверка, что группа закреплена за преподавателем
        const groupCheck = await query(
            'SELECT id FROM teacher_groups WHERE teacher_id = $1 AND group_id = $2',
            [teacherId, groupId]
        );

        if (groupCheck.rows.length === 0) {
            return res.status(403).json({
                error: 'Access denied',
                message: 'Группа не закреплена за вами'
            });
        }

        // Проверка, что дисциплина закреплена за преподавателем
        if (disciplineType === 'exam') {
            const examCheck = await query(
                'SELECT id FROM teacher_exams WHERE teacher_id = $1 AND exam_id = $2',
                [teacherId, disciplineId]
            );

            if (examCheck.rows.length === 0) {
                return res.status(403).json({
                    error: 'Access denied',
                    message: 'Экзамен не закреплен за вами'
                });
            }
        } else if (disciplineType === 'credit') {
            const creditCheck = await query(
                'SELECT id FROM teacher_credits WHERE teacher_id = $1 AND credit_id = $2',
                [teacherId, disciplineId]
            );

            if (creditCheck.rows.length === 0) {
                return res.status(403).json({
                    error: 'Access denied',
                    message: 'Зачет не закреплен за вами'
                });
            }
        }

        // Получаем студентов группы с оценками по выбранной дисциплине
        let studentsResult;
        
        if (disciplineType === 'exam') {
            studentsResult = await query(
                `SELECT s.id, s.full_name, eg.grade as exam_grade, eg.id as exam_grade_id
                 FROM students s
                 LEFT JOIN exam_grades eg ON s.id = eg.student_id AND eg.exam_id = $1
                 WHERE s.group_id = $2
                 ORDER BY s.full_name`,
                [disciplineId, groupId]
            );
        } else {
            studentsResult = await query(
                `SELECT s.id, s.full_name, cr.is_passed as credit_passed, cr.id as credit_result_id
                 FROM students s
                 LEFT JOIN credit_results cr ON s.id = cr.student_id AND cr.credit_id = $1
                 WHERE s.group_id = $2
                 ORDER BY s.full_name`,
                [disciplineId, groupId]
            );
        }

        res.json({
            students: studentsResult.rows
        });
    } catch (error) {
        console.error('Get group students error:', error);
        res.status(500).json({
            error: 'Failed to get students',
            message: 'Ошибка при получении студентов'
        });
    }
});

module.exports = router;

