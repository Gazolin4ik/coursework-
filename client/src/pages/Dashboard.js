import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Users, 
  TrendingUp, 
  BookOpen, 
  BarChart3, 
  Plus,
  Eye,
  Calculator
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/authService';

const Dashboard = () => {
  const { user, isTeacher, isStudent } = useAuth();
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalPredictions: 0,
    averageScore: 0,
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        if (isTeacher) {
          // Получаем статистику для преподавателя
          const [studentsRes, predictionsRes] = await Promise.all([
            api.get('/students'),
            api.get('/predictions')
          ]);

          const preds = Array.isArray(predictionsRes.data.predictions) ? predictionsRes.data.predictions : [];
          const scores = preds
            .map(p => Number(p.overall_performance_score))
            .filter(v => Number.isFinite(v));
          const avgScore = scores.length > 0
            ? scores.reduce((a, b) => a + b, 0) / scores.length
            : 0;

          setStats({
            totalStudents: studentsRes.data.total || 0,
            totalPredictions: predictionsRes.data.total || 0,
            averageScore: avgScore,
            recentActivity: []
          });
        } else if (isStudent) {
          // Получаем профиль и id студента
          const profileRes = await api.get('/auth/profile');
          const studentId = profileRes.data.user?.studentInfo?.id;
          let prediction = null;
          if (studentId) {
            const predRes = await api.get(`/predictions/student/${studentId}`);
            prediction = predRes.data.prediction || null;
          }
          setStats({
            totalStudents: 1,
            totalPredictions: prediction ? 1 : 0,
            averageScore: prediction?.overall_performance_score || 0,
            recentActivity: []
          });
        }
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [isTeacher, isStudent]);

  const quickActions = [
    ...(isTeacher ? [
      {
        title: 'Добавить студента',
        description: 'Создать нового студента в системе',
        icon: Plus,
        href: '/students',
        color: 'bg-blue-500'
      },
      {
        title: 'Просмотреть студентов',
        description: 'Управление списком студентов',
        icon: Users,
        href: '/students',
        color: 'bg-green-500'
      },
      {
        title: 'Рассчитать прогнозы',
        description: 'Создать прогнозы успеваемости',
        icon: Calculator,
        href: '/predictions',
        color: 'bg-purple-500'
      }
    ] : []),
    ...(isStudent ? [
      {
        title: 'Мои результаты',
        description: 'Просмотр оценок и зачетов',
        icon: BookOpen,
        href: '/students',
        color: 'bg-blue-500'
      },
      {
        title: 'Мой прогноз',
        description: 'Прогноз успеваемости',
        icon: BarChart3,
        href: '/predictions',
        color: 'bg-green-500'
      }
    ] : []),
    {
      title: 'Профиль',
      description: 'Управление личными данными',
      icon: Eye,
      href: '/profile',
      color: 'bg-gray-500'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const averageScoreText = Number.isFinite(Number(stats.averageScore))
    ? Number(stats.averageScore).toFixed(1)
    : 'N/A';

  return (
    <div className="space-y-6">
      {/* Приветствие */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Добро пожаловать, {user?.fullName}!
        </h1>
        <p className="text-gray-600 mt-2">
          {isTeacher 
            ? 'Панель управления системой прогнозирования успеваемости студентов'
            : 'Ваша персональная панель успеваемости'
          }
        </p>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Users className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">
                {isTeacher ? 'Всего студентов' : 'Мои данные'}
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats.totalStudents}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">
                {isTeacher ? 'Прогнозов создано' : 'Мой прогноз'}
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats.totalPredictions}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <BarChart3 className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">
                {isTeacher ? 'Средний балл' : 'Мой балл'}
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {averageScoreText}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Быстрые действия */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            Быстрые действия
          </h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <Link
                  key={index}
                  to={action.href}
                  className="group relative bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors duration-200"
                >
                  <div>
                    <span className={`inline-flex p-3 rounded-lg ${action.color} text-white`}>
                      <Icon className="h-6 w-6" />
                    </span>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-lg font-medium text-gray-900 group-hover:text-blue-600 transition-colors duration-200">
                      {action.title}
                    </h3>
                    <p className="mt-2 text-sm text-gray-500">
                      {action.description}
                    </p>
                  </div>
                  <span className="absolute top-6 right-6 text-gray-300 group-hover:text-gray-400 transition-colors duration-200">
                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20 4h1a1 1 0 00-1-1v1zm-1 12a1 1 0 102 0h-2zM8 3a1 1 0 000 2V3zM3.293 19.293a1 1 0 101.414 1.414l-1.414-1.414zM19 4v12h2V4h-2zm1-1H8v2h12V3zm-.707.293l-16 16 1.414 1.414 16-16-1.414-1.414z" />
                    </svg>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Информация о системе */}
      <div className="bg-blue-50 rounded-lg p-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <BookOpen className="h-6 w-6 text-blue-600" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              О системе прогнозирования
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                Система анализирует оценки по экзаменам и результаты зачетов для создания 
                прогноза успеваемости студентов. {isTeacher 
                  ? 'Вы можете добавлять данные студентов и рассчитывать прогнозы.' 
                  : 'Вы можете просматривать свои результаты и прогнозы успеваемости.'
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 