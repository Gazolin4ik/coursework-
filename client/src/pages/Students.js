import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye,
  Filter,
  Users,
  BookOpen,
  CheckCircle,
  XCircle,
  CheckSquare,
  Square
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/authService';
import toast from 'react-hot-toast';

const Students = () => {
  const { isTeacher, isStudent, isAdmin } = useAuth();
  const [students, setStudents] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [formData, setFormData] = useState({
    fullName: '',
    groupId: '',
    userId: ''
  });
  // Для студентов: оценки и зачеты
  const [examGrades, setExamGrades] = useState([]);
  const [creditResults, setCreditResults] = useState([]);
  const [studentId, setStudentId] = useState(null);
  const [studentGroup, setStudentGroup] = useState('');
  const [disciplineType, setDisciplineType] = useState('exam'); // 'exam' or 'credit'
  const [selectedStudents, setSelectedStudents] = useState(new Set());

  useEffect(() => {
    fetchStudents();
    fetchGroups();
  }, []);

  const fetchStudents = async () => {
    try {
      if (isTeacher || isAdmin) {
        const response = await api.get('/students');
        setStudents(response.data.students || []);
      } else if (isStudent) {
        // Для студентов получаем их оценки и зачеты, НЕ загружаем данные в students
        setStudents([]); // Явно очищаем массив студентов
        const profileRes = await api.get('/auth/profile');
        const me = profileRes.data.user?.studentInfo;
        if (me) {
          setStudentId(me.id);
          setStudentGroup(me.group_name || '');
          // Загружаем оценки и зачеты
          const gradesRes = await api.get(`/grades/student/${me.id}`);
          setExamGrades(gradesRes.data.examGrades || []);
          setCreditResults(gradesRes.data.creditResults || []);
        } else {
          setExamGrades([]);
          setCreditResults([]);
          setStudentGroup('');
        }
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Ошибка при загрузке данных');
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      if (isTeacher || isAdmin) {
        const response = await api.get('/students/groups/list');
        setGroups(response.data.groups || []);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    try {
      if (!formData.fullName || String(formData.fullName).trim().length < 2) {
        toast.error('Введите корректное ФИО (не менее 2 символов)');
        return;
      }
      if (!formData.groupId || isNaN(Number(formData.groupId))) {
        toast.error('Выберите группу');
        return;
      }

      const payload = {
        fullName: String(formData.fullName).trim(),
        groupId: parseInt(formData.groupId, 10)
      };
      if (formData.userId && String(formData.userId).trim() !== '') {
        payload.userId = parseInt(formData.userId, 10);
      }

      const res = await api.post('/students', payload);
      toast.success('Студент успешно добавлен');
      setShowAddModal(false);
      setFormData({ fullName: '', groupId: '', userId: '' });
      fetchStudents();
      return res;
    } catch (error) {
      const serverMessage = error.response?.data?.message || error.response?.data?.error;
      toast.error(serverMessage || 'Ошибка при добавлении студента');
    }
  };

  const handleDeleteStudent = async () => {
    try {
      await api.delete(`/students/${selectedStudent.id}`);
      toast.success('Студент успешно удален');
      setShowDeleteModal(false);
      setSelectedStudent(null);
      setSelectedStudents(new Set());
      fetchStudents();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Ошибка при удалении студента');
    }
  };

  const toggleStudentSelection = (studentId) => {
    setSelectedStudents(prevSelected => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(studentId)) {
        newSelected.delete(studentId);
      } else {
        newSelected.add(studentId);
      }
      return newSelected;
    });
  };

  const toggleSelectAllStudents = () => {
    const filteredStudents = students.filter(s => {
      const matchesSearch = s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.group_name && s.group_name.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesGroup = !selectedGroup || s.group_id === parseInt(selectedGroup);
      return matchesSearch && matchesGroup;
    });
    const allSelected = filteredStudents.every(student => selectedStudents.has(student.id));
    
    if (allSelected) {
      setSelectedStudents(prevSelected => {
        const newSelected = new Set(prevSelected);
        filteredStudents.forEach(student => newSelected.delete(student.id));
        return newSelected;
      });
    } else {
      setSelectedStudents(prevSelected => {
        const newSelected = new Set(prevSelected);
        filteredStudents.forEach(student => newSelected.add(student.id));
        return newSelected;
      });
    }
  };

  const handleBulkDeleteStudents = async () => {
    if (selectedStudents.size === 0) {
      toast.error('Выберите студентов для удаления');
      return;
    }

    try {
      const promises = Array.from(selectedStudents).map(studentId => 
        api.delete(`/students/${studentId}`)
      );

      await Promise.all(promises);
      toast.success(`Успешно удалено студентов: ${selectedStudents.size}`);
      setSelectedStudents(new Set());
      fetchStudents();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Ошибка при удалении студентов');
    }
  };

  const handleUpdateStudent = async (e) => {
    e.preventDefault();
    try {
      if (!formData.fullName || String(formData.fullName).trim().length < 2) {
        toast.error('Введите корректное ФИО (не менее 2 символов)');
        return;
      }
      if (!formData.groupId || isNaN(Number(formData.groupId))) {
        toast.error('Выберите группу');
        return;
      }
      const payload = {
        fullName: String(formData.fullName).trim(),
        groupId: parseInt(formData.groupId, 10)
      };
      await api.put(`/students/${selectedStudent.id}`, payload);
      toast.success('Данные студента обновлены');
      setShowEditModal(false);
      setSelectedStudent(null);
      setFormData({ fullName: '', groupId: '', userId: '' });
      fetchStudents();
    } catch (error) {
      const serverMessage = error.response?.data?.message || error.response?.data?.error;
      toast.error(serverMessage || 'Ошибка при обновлении студента');
    }
  };

  const filteredStudents = (isTeacher || isAdmin) ? students.filter(student => {
    const matchesSearch = student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.group_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGroup = !selectedGroup || student.group_name === selectedGroup;
    return matchesSearch && matchesGroup;
  }) : [];

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
            {isAdmin ? 'Управление студентами' : isTeacher ? 'Управление студентами' : 'Мои результаты'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isAdmin || isTeacher
              ? 'Добавление, редактирование и просмотр данных студентов'
              : isStudent && studentGroup
              ? `Группа: ${studentGroup}`
              : 'Просмотр ваших оценок и результатов'
            }
          </p>
        </div>
        {(isTeacher || isAdmin) && (
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Добавить студента
          </button>
        )}
      </div>

      {/* Фильтры */}
      {(isTeacher || isAdmin) && (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Поиск
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск по имени или группе..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full"
              />
            </div>
          </div>
          
          {isTeacher && (
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
                {groups.map(group => (
                  <option key={group.id} value={group.group_name}>
                    {group.group_name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Для студентов: показываем ТОЛЬКО оценки и зачеты, БЕЗ таблицы с данными */}
      {isStudent ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Переключатель между экзаменами и зачетами */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                {disciplineType === 'exam' ? (
                  <BookOpen className="h-5 w-5 text-blue-600 mr-2" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                )}
                <h3 className="text-lg font-medium text-gray-900">
                  {disciplineType === 'exam' ? 'Экзамены' : 'Зачеты'}
                </h3>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setDisciplineType('exam')}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  disciplineType === 'exam'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Экзамены
              </button>
              <button
                onClick={() => setDisciplineType('credit')}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  disciplineType === 'credit'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Зачеты
              </button>
            </div>
          </div>

          {/* Список экзаменов */}
          {disciplineType === 'exam' ? (
            examGrades.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  Нет оценок по экзаменам
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Оценки по экзаменам еще не проставлены
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Дисциплина
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Оценка
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Дата
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {examGrades.map((exam, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {exam.exam_name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                            exam.grade >= 4 ? 'bg-green-100 text-green-800' :
                            exam.grade === 3 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {exam.grade}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(exam.created_at).toLocaleDateString('ru-RU')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            /* Список зачетов */
            creditResults.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  Нет результатов по зачетам
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Результаты по зачетам еще не проставлены
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Дисциплина
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Результат
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Дата
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {creditResults.map((credit, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {credit.credit_name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-3 py-1 text-sm font-semibold rounded-full ${
                            credit.is_passed 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {credit.is_passed ? (
                              <>
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Сдан
                              </>
                            ) : (
                              <>
                                <XCircle className="h-4 w-4 mr-1" />
                                Не сдан
                              </>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(credit.created_at).toLocaleDateString('ru-RU')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      ) : null}

      {/* Для преподавателей и администраторов: таблица студентов - НЕ показывать для студентов! */}
      {!isStudent && (isTeacher || isAdmin) && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">
              Студенты ({filteredStudents.length})
            </h3>
            {selectedStudents.size > 0 && (
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-600">
                  Выбрано: <span className="font-semibold text-blue-600">{selectedStudents.size}</span>
                </span>
                <button
                  onClick={toggleSelectAllStudents}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  {filteredStudents.every(s => selectedStudents.has(s.id)) ? 'Снять выделение' : 'Выбрать все'}
                </button>
                <button
                  onClick={handleBulkDeleteStudents}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Удалить выбранные
                </button>
              </div>
            )}
          </div>
          
          {filteredStudents.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {isTeacher ? 'Студенты не найдены' : 'Данные не найдены'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {isTeacher 
                  ? 'Попробуйте изменить параметры поиска или добавьте нового студента.'
                  : 'Обратитесь к преподавателю для добавления ваших данных.'
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12"></th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ФИО
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Группа
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Дата добавления
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredStudents.map((student) => {
                    const isSelected = selectedStudents.has(student.id);
                    return (
                      <tr key={student.id} className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => toggleStudentSelection(student.id)}
                            className="cursor-pointer"
                          >
                            {isSelected ? (
                              <CheckSquare className="h-5 w-5 text-blue-600" />
                            ) : (
                              <Square className="h-5 w-5 text-gray-400" />
                            )}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {student.full_name}
                          </div>
                        </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {student.group_name}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(student.created_at).toLocaleDateString('ru-RU')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <Link
                            to={`/students/${student.id}`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          {(isTeacher || isAdmin) && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedStudent(student);
                                  setFormData({
                                    fullName: student.full_name,
                                    groupId: student.group_id,
                                    userId: ''
                                  });
                                  setShowEditModal(true);
                                }}
                                className="text-indigo-600 hover:text-indigo-900"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedStudent(student);
                                  setShowDeleteModal(true);
                                }}
                                className="text-red-600 hover:text-red-900"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Модальное окно добавления студента */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Добавить студента
            </h3>
            <form onSubmit={handleAddStudent}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    ФИО
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Группа
                  </label>
                  <select
                    required
                    value={formData.groupId}
                    onChange={(e) => setFormData({...formData, groupId: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Выберите группу</option>
                    {groups.map(group => (
                      <option key={group.id} value={group.id}>
                        {group.group_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  Добавить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно удаления */}
      {showDeleteModal && selectedStudent && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Удалить студента
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Вы уверены, что хотите удалить студента "{selectedStudent.full_name}"? 
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
                onClick={handleDeleteStudent}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно редактирования студента */}
      {showEditModal && selectedStudent && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Редактировать студента
            </h3>
            <form onSubmit={handleUpdateStudent}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    ФИО
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Группа
                  </label>
                  <select
                    required
                    value={formData.groupId}
                    onChange={(e) => setFormData({...formData, groupId: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Выберите группу</option>
                    {groups.map(group => (
                      <option key={group.id} value={group.id}>
                        {group.group_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Students; 