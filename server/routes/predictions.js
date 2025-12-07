const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../utils/database');
const { authenticateToken, requireTeacher, canViewStudent } = require('../middleware/auth');
const { calculateAndSavePrediction } = require('../utils/predictionCalculator');

const router = express.Router();

// Получение прогноза для студента
router.get('/student/:studentId', authenticateToken, canViewStudent, async (req, res) => {
    try {
        const studentId = req.params.studentId;

        // Получение последнего прогноза
        const predictionResult = await query(
            `SELECT predicted_exam_grade, predicted_credit_pass_rate, 
                    overall_performance_score, prediction_date, created_at
             FROM performance_predictions
             WHERE student_id = $1
             ORDER BY prediction_date DESC
             LIMIT 1`,
            [studentId]
        );

        if (predictionResult.rows.length === 0) {
            return res.status(404).json({
                error: 'No prediction found',
                message: 'Прогноз не найден'
            });
        }

        res.json({
            prediction: predictionResult.rows[0]
        });

    } catch (error) {
        console.error('Get prediction error:', error);
        res.status(500).json({
            error: 'Failed to get prediction',
            message: 'Ошибка при получении прогноза'
        });
    }
});

// Расчет прогноза для студента (только для преподавателей)
router.post('/calculate/:studentId', authenticateToken, requireTeacher, async (req, res) => {
    try {
        const studentId = req.params.studentId;

        // Проверка существования студента
        const studentResult = await query(
            'SELECT id FROM students WHERE id = $1',
            [studentId]
        );

        if (studentResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Student not found',
                message: 'Студент не найден'
            });
        }

        // Используем функцию автоматического расчета прогноза
        const prediction = await calculateAndSavePrediction(studentId);

        if (!prediction) {
            return res.status(400).json({
                error: 'Insufficient data',
                message: 'Недостаточно данных для расчета прогноза'
            });
        }

        res.status(201).json({
            message: 'Прогноз успешно рассчитан',
            prediction: prediction
        });

    } catch (error) {
        console.error('Calculate prediction error:', error);
        res.status(500).json({
            error: 'Failed to calculate prediction',
            message: 'Ошибка при расчете прогноза'
        });
    }
});

// Получение всех прогнозов (только для преподавателей)
router.get('/', authenticateToken, requireTeacher, async (req, res) => {
    try {
        const { group, minScore, maxScore } = req.query;
        
        let sqlQuery = `
            SELECT pp.id, pp.student_id, s.full_name, g.group_name,
                   pp.predicted_exam_grade, pp.predicted_credit_pass_rate,
                   pp.overall_performance_score, pp.prediction_date
            FROM performance_predictions pp
            JOIN students s ON pp.student_id = s.id
            JOIN groups g ON s.group_id = g.id
        `;
        
        const whereConditions = [];
        const queryParams = [];
        let paramIndex = 1;

        if (group) {
            whereConditions.push(`g.group_name = $${paramIndex++}`);
            queryParams.push(group);
        }

        if (minScore) {
            whereConditions.push(`pp.overall_performance_score >= $${paramIndex++}`);
            queryParams.push(parseFloat(minScore));
        }

        if (maxScore) {
            whereConditions.push(`pp.overall_performance_score <= $${paramIndex++}`);
            queryParams.push(parseFloat(maxScore));
        }

        if (whereConditions.length > 0) {
            sqlQuery += ` WHERE ${whereConditions.join(' AND ')}`;
        }

        sqlQuery += ` ORDER BY pp.prediction_date DESC`;

        const result = await query(sqlQuery, queryParams);

        res.json({
            predictions: result.rows,
            total: result.rows.length
        });

    } catch (error) {
        console.error('Get predictions error:', error);
        res.status(500).json({
            error: 'Failed to get predictions',
            message: 'Ошибка при получении прогнозов'
        });
    }
});

// Получение статистики по группам (только для преподавателей)
router.get('/statistics/groups', authenticateToken, requireTeacher, async (req, res) => {
    try {
        const statisticsResult = await query(
            `SELECT g.group_name,
                    COUNT(DISTINCT s.id) as total_students,
                    COUNT(pp.id) as students_with_predictions,
                    AVG(pp.overall_performance_score) as avg_performance_score,
                    AVG(pp.predicted_exam_grade) as avg_exam_grade,
                    AVG(pp.predicted_credit_pass_rate) as avg_credit_pass_rate
             FROM groups g
             LEFT JOIN students s ON g.id = s.group_id
             LEFT JOIN performance_predictions pp ON s.id = pp.student_id
             GROUP BY g.id, g.group_name
             ORDER BY g.group_name`,
            []
        );

        res.json({
            statistics: statisticsResult.rows
        });

    } catch (error) {
        console.error('Get statistics error:', error);
        res.status(500).json({
            error: 'Failed to get statistics',
            message: 'Ошибка при получении статистики'
        });
    }
});

// Получение истории прогнозов для студента
router.get('/history/:studentId', authenticateToken, canViewStudent, async (req, res) => {
    try {
        const studentId = req.params.studentId;

        const historyResult = await query(
            `SELECT predicted_exam_grade, predicted_credit_pass_rate,
                    overall_performance_score, prediction_date
             FROM performance_predictions
             WHERE student_id = $1
             ORDER BY prediction_date DESC`,
            [studentId]
        );

        res.json({
            history: historyResult.rows
        });

    } catch (error) {
        console.error('Get prediction history error:', error);
        res.status(500).json({
            error: 'Failed to get prediction history',
            message: 'Ошибка при получении истории прогнозов'
        });
    }
});

// Удаление прогноза (только для преподавателей)
router.delete('/:id', authenticateToken, requireTeacher, async (req, res) => {
    try {
        const predictionId = req.params.id;

        // Проверка существования прогноза
        const existingPrediction = await query(
            'SELECT id FROM performance_predictions WHERE id = $1',
            [predictionId]
        );

        if (existingPrediction.rows.length === 0) {
            return res.status(404).json({
                error: 'Prediction not found',
                message: 'Прогноз не найден'
            });
        }

        // Удаление прогноза
        await query('DELETE FROM performance_predictions WHERE id = $1', [predictionId]);

        res.json({
            message: 'Прогноз успешно удален'
        });

    } catch (error) {
        console.error('Delete prediction error:', error);
        res.status(500).json({
            error: 'Failed to delete prediction',
            message: 'Ошибка при удалении прогноза'
        });
    }
});

module.exports = router; 