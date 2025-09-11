import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  ArrowLeft, 
  Edit, 
  BookOpen, 
  CheckCircle, 
  XCircle,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import api from '../services/authService';
import toast from 'react-hot-toast';

const StudentDetail = () => {
  const { id } = useParams();
  const { isTeacher } = useAuth();
  const [student, setStudent] = useState(null);
  const [examGrades, setExamGrades] = useState([]);
  const [creditResults, setCreditResults] = useState([]);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState([]);
  const [credits, setCredits] = useState([]);
  const [gradeForm, setGradeForm] = useState({ examId: '', grade: '' });
  const [creditForm, setCreditForm] = useState({ creditId: '', isPassed: 'true' });

  useEffect(() => {
    fetchStudentData();
    if (isTeacher) {
      fetchDictionaries();
    }
  }, [id]);

  const fetchStudentData = async () => {
    try {
      const response = await api.get(`/students/${id}`);
      const data = response.data;
      
      setStudent(data.student);
      setExamGrades(data.examGrades || []);
      setCreditResults(data.creditResults || []);
      setPrediction(data.prediction);
    } catch (error) {
      console.error('Error fetching student data:', error);
      toast.error('Ошибка при загрузке данных студента');
    } finally {
      setLoading(false);
    }
  };

  const fetchDictionaries = async () => {
    try {
      const [exRes, crRes] = await Promise.all([
        api.get('/grades/exams/list'),
        api.get('/grades/credits/list')
      ]);
      setExams(exRes.data.exams || []);
      setCredits(crRes.data.credits || []);
    } catch (error) {
      console.error('Error fetching dictionaries:', error);
    }
  };

  const calculatePrediction = async () => {
    try {
      const response = await api.post(`/predictions/calculate/${id}`);
      setPrediction(response.data.prediction);
      toast.success('Прогноз успешно рассчитан');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Ошибка при расчете прогноза');
    }
  };

  const addExamGrade = async (e) => {
    e.preventDefault();
    try {
      if (!gradeForm.examId || !gradeForm.grade) {
        toast.error('Выберите экзамен и оценку');
        return;
      }
      await api.post('/grades/exam', {
        studentId: parseInt(id, 10),
        examId: parseInt(gradeForm.examId, 10),
        grade: parseInt(gradeForm.grade, 10)
      });
      toast.success('Оценка добавлена');
      setGradeForm({ examId: '', grade: '' });
      fetchStudentData();
    } catch (error) {
      const message = error.response?.data?.message || error.response?.data?.error;
      toast.error(message || 'Ошибка при добавлении оценки');
    }
  };

  const addCreditResult = async (e) => {
    e.preventDefault();
    try {
      if (!creditForm.creditId) {
        toast.error('Выберите зачет');
        return;
      }
      await api.post('/grades/credit', {
        studentId: parseInt(id, 10),
        creditId: parseInt(creditForm.creditId, 10),
        isPassed: creditForm.isPassed === 'true'
      });
      toast.success('Результат зачета добавлен');
      setCreditForm({ creditId: '', isPassed: 'true' });
      fetchStudentData();
    } catch (error) {
      const message = error.response?.data?.message || error.response?.data?.error;
      toast.error(message || 'Ошибка при добавлении результата зачета');
    }
  };

  const getGradeColor = (grade) => {
    if (grade >= 4) return 'text-green-600 bg-green-100';
    if (grade === 3) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getPassStatusColor = (isPassed) => {
    return isPassed 
      ? 'text-green-600 bg-green-100' 
      : 'text-red-600 bg-red-100';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">Студент не найден</h3>
        <p className="text-gray-500 mt-2">Запрашиваемый студент не существует или у вас нет доступа.</p>
        <Link to="/students" className="mt-4 inline-flex items-center text-blue-600 hover:text-blue-500">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Вернуться к списку
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Link
            to="/students"
            className="inline-flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {student.fullName}
            </h1>
            <p className="text-gray-600">
              Группа: {student.groupName}
            </p>
          </div>
        </div>
        {isTeacher && (
          <div className="flex space-x-2">
            <button
              onClick={calculatePrediction}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Рассчитать прогноз
            </button>
          </div>
        )}
      </div>

      {/* Прогноз успеваемости */}
      {prediction && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <BarChart3 className="h-6 w-6 text-blue-600 mr-2" />
            <h2 className="text-lg font-medium text-gray-900">
              Прогноз успеваемости
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {prediction.predicted_exam_grade || 'N/A'}
              </div>
              <div className="text-sm text-gray-500">Средняя оценка по экзаменам</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {prediction.predicted_credit_pass_rate || 'N/A'}%
              </div>
              <div className="text-sm text-gray-500">Процент сданных зачетов</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {prediction.overall_performance_score || 'N/A'}
              </div>
              <div className="text-sm text-gray-500">Общий показатель успеваемости</div>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-500">
            Дата расчета: {new Date(prediction.prediction_date).toLocaleDateString('ru-RU')}
          </div>
        </div>
      )}

      {/* Оценки по экзаменам */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <BookOpen className="h-5 w-5 text-blue-600 mr-2" />
              <h2 className="text-lg font-medium text-gray-900">
                Оценки по экзаменам
              </h2>
            </div>
            {isTeacher && (
              <form onSubmit={addExamGrade} className="flex items-center space-x-2">
                <select
                  value={gradeForm.examId}
                  onChange={(e) => setGradeForm({ ...gradeForm, examId: e.target.value })}
                  className="py-2 px-3 border border-gray-300 rounded-md"
                >
                  <option value="">Экзамен</option>
                  {exams.map((ex) => (
                    <option key={ex.id} value={ex.id}>{ex.exam_name}</option>
                  ))}
                </select>
                <select
                  value={gradeForm.grade}
                  onChange={(e) => setGradeForm({ ...gradeForm, grade: e.target.value })}
                  className="py-2 px-3 border border-gray-300 rounded-md"
                >
                  <option value="">Оценка</option>
                  <option value="5">5</option>
                  <option value="4">4</option>
                  <option value="3">3</option>
                  <option value="2">2</option>
                </select>
                <button type="submit" className="px-3 py-2 bg-blue-600 text-white rounded-md">Добавить</button>
              </form>
            )}
          </div>
        </div>
        <div className="p-6">
          {examGrades.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              Оценки по экзаменам не найдены
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {examGrades.map((grade, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {grade.exam_name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {new Date(grade.created_at).toLocaleDateString('ru-RU')}
                      </p>
                    </div>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getGradeColor(grade.grade)}`}>
                      {grade.grade}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Результаты зачетов */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              <h2 className="text-lg font-medium text-gray-900">
                Результаты зачетов
              </h2>
            </div>
            {isTeacher && (
              <form onSubmit={addCreditResult} className="flex items-center space-x-2">
                <select
                  value={creditForm.creditId}
                  onChange={(e) => setCreditForm({ ...creditForm, creditId: e.target.value })}
                  className="py-2 px-3 border border-gray-300 rounded-md"
                >
                  <option value="">Зачет</option>
                  {credits.map((cr) => (
                    <option key={cr.id} value={cr.id}>{cr.credit_name}</option>
                  ))}
                </select>
                <select
                  value={creditForm.isPassed}
                  onChange={(e) => setCreditForm({ ...creditForm, isPassed: e.target.value })}
                  className="py-2 px-3 border border-gray-300 rounded-md"
                >
                  <option value="true">Сдан</option>
                  <option value="false">Не сдан</option>
                </select>
                <button type="submit" className="px-3 py-2 bg-green-600 text-white rounded-md">Добавить</button>
              </form>
            )}
          </div>
        </div>
        <div className="p-6">
          {creditResults.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              Результаты зачетов не найдены
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {creditResults.map((credit, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {credit.credit_name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {new Date(credit.created_at).toLocaleDateString('ru-RU')}
                      </p>
                    </div>
                    <div className="flex items-center">
                      {credit.is_passed ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                      <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPassStatusColor(credit.is_passed)}`}>
                        {credit.is_passed ? 'Сдан' : 'Не сдан'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {examGrades.length}
            </div>
            <div className="text-sm text-gray-500">Экзаменов</div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {creditResults.length}
            </div>
            <div className="text-sm text-gray-500">Зачетов</div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {examGrades.length > 0 
                ? (examGrades.reduce((sum, grade) => sum + grade.grade, 0) / examGrades.length).toFixed(1)
                : '0'
              }
            </div>
            <div className="text-sm text-gray-500">Средний балл</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDetail; 