import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { BookOpen, ArrowRight, ArrowLeft } from 'lucide-react';
import api from '../services/authService';
import toast from 'react-hot-toast';

const GroupDisciplines = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { isTeacher } = useAuth();
  const [group, setGroup] = useState(null);
  const [exams, setExams] = useState([]);
  const [credits, setCredits] = useState([]);
  const [disciplineType, setDisciplineType] = useState('exam');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isTeacher && groupId) {
      fetchData();
    }
  }, [isTeacher, groupId]);

  const fetchData = async () => {
    try {
      const [groupsRes, examsRes, creditsRes] = await Promise.all([
        api.get('/groups/teacher'),
        api.get('/grades/exams/list'),
        api.get('/grades/credits/list')
      ]);
      
      const selectedGroup = groupsRes.data.groups?.find(g => g.id === parseInt(groupId));
      setGroup(selectedGroup);
      setExams(examsRes.data.exams || []);
      setCredits(creditsRes.data.credits || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Ошибка при загрузке данных');
    } finally {
      setLoading(false);
    }
  };

  const handleDisciplineSelect = (disciplineId) => {
    navigate(`/groups/${groupId}/disciplines/${disciplineType}/${disciplineId}/students`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-gray-500">Группа не найдена</p>
        <button
          onClick={() => navigate('/groups')}
          className="mt-4 text-blue-600 hover:text-blue-800"
        >
          Вернуться к списку групп
        </button>
      </div>
    );
  }

  const disciplines = disciplineType === 'exam' ? exams : credits;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate('/groups')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад к группам
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Дисциплины</h1>
          <p className="text-gray-600 mt-1">Группа: {group.group_name}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-6">
          <div className="flex space-x-2">
            <button
              onClick={() => setDisciplineType('exam')}
              className={`flex-1 px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                disciplineType === 'exam'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Экзамены
            </button>
            <button
              onClick={() => setDisciplineType('credit')}
              className={`flex-1 px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                disciplineType === 'credit'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Зачеты
            </button>
          </div>
        </div>

        {disciplines.length === 0 ? (
          <div className="text-center py-8">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              Нет закрепленных {disciplineType === 'exam' ? 'экзаменов' : 'зачетов'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {disciplines.map((discipline) => (
              <button
                key={discipline.id}
                onClick={() => handleDisciplineSelect(discipline.id)}
                className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors text-left group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="bg-green-100 rounded-full p-2 mr-3">
                      <BookOpen className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">
                        {disciplineType === 'exam' ? discipline.exam_name : discipline.credit_name}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">Нажмите для выбора</p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-green-600 transition-colors" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupDisciplines;

