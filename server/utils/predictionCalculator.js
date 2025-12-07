const { query } = require('./database');

/**
 * Автоматически рассчитывает и сохраняет прогноз для студента
 * Удаляет старый прогноз перед созданием нового
 * @param {number} studentId - ID студента
 * @returns {Promise<Object>} - Объект с данными прогноза или null если недостаточно данных
 */
async function calculateAndSavePrediction(studentId) {
    try {
        // Получение оценок по экзаменам
        const examGradesResult = await query(
            `SELECT eg.grade
             FROM exam_grades eg
             WHERE eg.student_id = $1`,
            [studentId]
        );

        // Получение результатов зачетов
        const creditResultsResult = await query(
            `SELECT cr.is_passed
             FROM credit_results cr
             WHERE cr.student_id = $1`,
            [studentId]
        );

        // Проверка наличия данных для прогноза
        if (examGradesResult.rows.length === 0 && creditResultsResult.rows.length === 0) {
            // Если нет данных, удаляем старый прогноз если он есть
            await query(
                'DELETE FROM performance_predictions WHERE student_id = $1',
                [studentId]
            );
            return null;
        }

        // Расчет прогноза
        let predictedExamGrade = null;
        let predictedCreditPassRate = null;
        let overallPerformanceScore = null;

        // Расчет средней оценки по экзаменам
        if (examGradesResult.rows.length > 0) {
            const totalGrade = examGradesResult.rows.reduce((sum, row) => sum + row.grade, 0);
            predictedExamGrade = parseFloat((totalGrade / examGradesResult.rows.length).toFixed(2));
        }

        // Расчет процента сданных зачетов
        if (creditResultsResult.rows.length > 0) {
            const passedCredits = creditResultsResult.rows.filter(row => row.is_passed).length;
            predictedCreditPassRate = parseFloat(((passedCredits / creditResultsResult.rows.length) * 100).toFixed(2));
        }

        // Расчет общего показателя успеваемости
        if (predictedExamGrade !== null && predictedCreditPassRate !== null) {
            // Взвешенная формула: 70% экзамены + 30% зачеты
            const examWeight = 0.7;
            const creditWeight = 0.3;
            
            // Нормализация оценки экзамена (2-5 -> 0-100)
            const normalizedExamScore = ((predictedExamGrade - 2) / 3) * 100;
            
            overallPerformanceScore = parseFloat(
                (normalizedExamScore * examWeight + predictedCreditPassRate * creditWeight).toFixed(2)
            );
        } else if (predictedExamGrade !== null) {
            // Если есть только экзамены
            const normalizedExamScore = ((predictedExamGrade - 2) / 3) * 100;
            overallPerformanceScore = parseFloat(normalizedExamScore.toFixed(2));
        } else if (predictedCreditPassRate !== null) {
            // Если есть только зачеты
            overallPerformanceScore = predictedCreditPassRate;
        }

        // Удаление старого прогноза для этого студента
        await query(
            'DELETE FROM performance_predictions WHERE student_id = $1',
            [studentId]
        );

        // Сохранение нового прогноза в базу данных
        const newPrediction = await query(
            `INSERT INTO performance_predictions 
             (student_id, predicted_exam_grade, predicted_credit_pass_rate, overall_performance_score) 
             VALUES ($1, $2, $3, $4) 
             RETURNING id, predicted_exam_grade, predicted_credit_pass_rate, 
                       overall_performance_score, prediction_date, created_at`,
            [studentId, predictedExamGrade, predictedCreditPassRate, overallPerformanceScore]
        );

        return newPrediction.rows[0];
    } catch (error) {
        console.error('Calculate prediction error:', error);
        throw error;
    }
}

module.exports = {
    calculateAndSavePrediction
};

