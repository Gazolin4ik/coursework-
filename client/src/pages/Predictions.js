import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  TrendingUp, 
  BarChart3, 
  Filter,
  RefreshCw,
  Eye,
  Trash2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/authService';
import toast from 'react-hot-toast';

const Predictions = () => {
  const { isTeacher, isStudent } = useAuth();
  const [predictions, setPredictions] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [minScore, setMinScore] = useState('');
  const [maxScore, setMaxScore] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState(null);
  const [studentGroupName, setStudentGroupName] = useState('');

  useEffect(() => {
    fetchPredictions();
    if (isTeacher) {
      fetchStatistics();
    }
  }, [isTeacher]);

  const fetchPredictions = async () => {
    try {
      let response;
      if (isTeacher) {
        const params = {
          group: selectedGroup || undefined,
          minScore: minScore !== '' ? Number(minScore) : undefined,
          maxScore: maxScore !== '' ? Number(maxScore) : undefined,
        };
        response = await api.get('/predictions', { params });
        setPredictions(response.data.predictions || []);
      } else if (isStudent) {
        // Для студента получаем собственный studentId из профиля
        const profileRes = await api.get('/auth/profile');
        const studentId = profileRes.data.user?.studentInfo?.id;
        const groupName = profileRes.data.user?.studentInfo?.group_name || '';
        setStudentGroupName(groupName);
        if (!studentId) {
          setPredictions([]);
          return;
        }
        const predictionResponse = await api.get(`/predictions/student/${studentId}`);
        setPredictions(predictionResponse.data.prediction ? [predictionResponse.data.prediction] : []);
      }
    } catch (error) {
      console.error('Error fetching predictions:', error);
      toast.error('Ошибка при загрузке прогнозов');
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await api.get('/predictions/statistics/groups');
      setStatistics(response.data.statistics);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const handleFilter = () => {
    fetchPredictions();
  };

  const handleRefresh = () => {
    setSelectedGroup('');
    setMinScore('');
    setMaxScore('');
    fetchPredictions();
  };

  const getScoreColor = (score) => {
    const value = Number(score);
    if (!isFinite(value)) return 'text-gray-600 bg-gray-100';
    if (value >= 80) return 'text-green-600 bg-green-100';
    if (value >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const formatAvg = (v) => {
    const num = Number(v);
    return isFinite(num) ? num.toFixed(1) : 'N/A';
  };

  const handleDeletePrediction = async () => {
    if (!selectedPrediction) return;
    try {
      await api.delete(`/predictions/${selectedPrediction.id}`);
      toast.success('Прогноз удален');
      setShowDeleteModal(false);
      setSelectedPrediction(null);
      fetchPredictions();
      if (isTeacher) fetchStatistics();
    } catch (error) {
      const message = error.response?.data?.message || error.response?.data?.error;
      toast.error(message || 'Ошибка при удалении прогноза');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isTeacher ? 'Прогнозы успеваемости' : 'Мой прогноз'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isTeacher 
              ? 'Анализ и управление прогнозами успеваемости студентов'
              : 'Ваш персональный прогноз успеваемости'
            }
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Обновить
        </button>
      </div>

      {/* Фильтры для преподавателей */}
      {isTeacher && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <Filter className="h-5 w-5 text-gray-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Фильтры</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Группа
              </label>
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="block w-full py-2 px-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Все группы</option>
                <option value="АБс-322">АБс-322</option>
                <option value="АБс-323">АБс-323</option>
                <option value="АБс-324">АБс-324</option>
                <option value="АБ-321">АБ-321</option>
                <option value="АБ-322">АБ-322</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Минимальный балл
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={minScore}
                onChange={(e) => setMinScore(e.target.value)}
                className="block w-full py-2 px-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Максимальный балл
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={maxScore}
                onChange={(e) => setMaxScore(e.target.value)}
                className="block w-full py-2 px-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="100"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleFilter}
                className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                Применить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Статистика по группам */}
      {isTeacher && statistics && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              Статистика по группам
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {statistics.map((stat, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">
                    {stat.group_name}
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Студентов:</span>
                      <span className="font-medium">{stat.total_students}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">С прогнозами:</span>
                      <span className="font-medium">{stat.students_with_predictions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Средний балл:</span>
                      <span className="font-medium">{formatAvg(stat.avg_performance_score)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Список прогнозов */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <TrendingUp className="h-5 w-5 text-blue-600 mr-2" />
              <h2 className="text-lg font-medium text-gray-900">
                {isTeacher ? `Прогнозы (${predictions.length})` : 'Мой прогноз'}
              </h2>
            </div>
          </div>
        </div>
        
        {predictions.length === 0 ? (
          <div className="text-center py-12">
            <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              Прогнозы не найдены
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {isTeacher 
                ? 'Попробуйте изменить параметры фильтрации или рассчитайте прогнозы для студентов.'
                : 'Обратитесь к преподавателю для расчета вашего прогноза.'
              }
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {isTeacher && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Студент
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Группа
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Экзамены
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Зачеты
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Общий балл
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Дата
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {predictions.map((prediction) => (
                  <tr key={prediction.id} className="hover:bg-gray-50">
                    {isTeacher && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {prediction.full_name}
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {isTeacher ? prediction.group_name : studentGroupName}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {prediction.predicted_exam_grade || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {prediction.predicted_credit_pass_rate ? `${prediction.predicted_credit_pass_rate}%` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getScoreColor(prediction.overall_performance_score)}`}>
                        {prediction.overall_performance_score || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(prediction.prediction_date).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {isTeacher && (
                          <Link
                            to={`/students/${prediction.student_id}`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                        )}
                       {isTeacher && (
                         <button
                           onClick={() => { setSelectedPrediction(prediction); setShowDeleteModal(true); }}
                           className="text-red-600 hover:text-red-900"
                         >
                           <Trash2 className="h-4 w-4" />
                         </button>
                       )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
 
      {/* Модальное окно удаления прогноза */}
      {isTeacher && showDeleteModal && selectedPrediction && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Удалить прогноз</h3>
            <p className="text-sm text-gray-500 mb-4">
              Вы уверены, что хотите удалить прогноз для студента "{selectedPrediction.full_name || selectedPrediction.student_id}"?
              Это действие нельзя отменить.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Отмена
              </button>
              <button
                onClick={handleDeletePrediction}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Predictions; 