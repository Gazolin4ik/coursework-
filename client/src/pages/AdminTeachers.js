import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Users, BookOpen, Link as LinkIcon, X } from 'lucide-react';
import api from '../services/authService';
import toast from 'react-hot-toast';

const AdminTeachers = () => {
  const [teachers, setTeachers] = useState([]);
  const [exams, setExams] = useState([]);
  const [credits, setCredits] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [linkType, setLinkType] = useState('exam'); // 'exam', 'credit', 'group'
  const [formData, setFormData] = useState({ username: '', fullName: '' });
  const [editFormData, setEditFormData] = useState({ username: '', fullName: '' });
  const [selectedItemId, setSelectedItemId] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [teachersRes, examsRes, creditsRes, groupsRes] = await Promise.all([
        api.get('/admin/teachers'),
        api.get('/admin/exams'),
        api.get('/admin/credits'),
        api.get('/admin/groups')
      ]);
      setTeachers(teachersRes.data.teachers || []);
      setExams(examsRes.data.exams || []);
      setCredits(creditsRes.data.credits || []);
      setGroups(groupsRes.data.groups || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Ошибка при загрузке данных');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeacherDisciplines = async (teacherId) => {
    try {
      const response = await api.get(`/admin/teachers/${teacherId}/disciplines`);
      return response.data;
    } catch (error) {
      console.error('Error fetching teacher disciplines:', error);
      return { exams: [], credits: [] };
    }
  };

  const fetchTeacherGroups = async (teacherId) => {
    try {
      const response = await api.get(`/admin/teachers/${teacherId}/groups`);
      return response.data.groups || [];
    } catch (error) {
      console.error('Error fetching teacher groups:', error);
      return [];
    }
  };

  const handleAddTeacher = async (e) => {
    e.preventDefault();
    try {
      if (!formData.fullName) {
        toast.error('Заполните ФИО');
        return;
      }

      await api.post('/admin/teachers', { fullName: formData.fullName });
      toast.success('Преподаватель успешно добавлен');
      setShowAddModal(false);
      setFormData({ username: '', fullName: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Ошибка при добавлении преподавателя');
    }
  };

  const handleLink = async () => {
    try {
      if (!selectedItemId) {
        toast.error('Выберите элемент для закрепления');
        return;
      }

      let endpoint;
      if (linkType === 'exam') {
        endpoint = `/admin/teachers/${selectedTeacher.id}/exams/${selectedItemId}`;
      } else if (linkType === 'credit') {
        endpoint = `/admin/teachers/${selectedTeacher.id}/credits/${selectedItemId}`;
      } else {
        endpoint = `/admin/teachers/${selectedTeacher.id}/groups/${selectedItemId}`;
      }

      await api.post(endpoint);
      toast.success('Связь успешно создана');
      setShowLinkModal(false);
      setSelectedItemId('');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Ошибка при создании связи');
    }
  };

  const handleUnlink = async (type, itemId) => {
    try {
      let endpoint;
      if (type === 'exam') {
        endpoint = `/admin/teachers/${selectedTeacher.id}/exams/${itemId}`;
      } else if (type === 'credit') {
        endpoint = `/admin/teachers/${selectedTeacher.id}/credits/${itemId}`;
      } else {
        endpoint = `/admin/teachers/${selectedTeacher.id}/groups/${itemId}`;
      }

      await api.delete(endpoint);
      toast.success('Связь успешно удалена');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Ошибка при удалении связи');
    }
  };

  const handleEditTeacher = (teacher) => {
    setSelectedTeacher(teacher);
    setEditFormData({
      username: teacher.username || '',
      fullName: teacher.full_name || ''
    });
    setShowEditModal(true);
  };

  const handleUpdateTeacher = async (e) => {
    e.preventDefault();
    try {
      if (!editFormData.fullName) {
        toast.error('Заполните ФИО');
        return;
      }

      await api.put(`/admin/teachers/${selectedTeacher.id}`, { fullName: editFormData.fullName });
      toast.success('Преподаватель успешно обновлен');
      setShowEditModal(false);
      setSelectedTeacher(null);
      setEditFormData({ username: '', fullName: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Ошибка при обновлении преподавателя');
    }
  };

  const handleDeleteTeacher = async (teacherId) => {
    try {
      await api.delete(`/admin/teachers/${teacherId}`);
      toast.success('Преподаватель успешно удален');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Ошибка при удалении преподавателя');
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Управление преподавателями</h1>
          <p className="text-gray-600 mt-1">Добавление преподавателей и закрепление дисциплин и групп</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Добавить преподавателя
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Преподаватели ({teachers.length})</h3>
        </div>
        
        {teachers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Преподаватели не найдены</h3>
            <p className="mt-1 text-sm text-gray-500">Добавьте первого преподавателя</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ФИО</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Имя пользователя</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Действия</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {teachers.map((teacher) => (
                  <tr key={teacher.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{teacher.full_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {teacher.username}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditTeacher(teacher)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Редактировать"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedTeacher(teacher);
                            setShowLinkModal(true);
                          }}
                          className="text-green-600 hover:text-green-900"
                          title="Закрепить дисциплины/группы"
                        >
                          <LinkIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTeacher(teacher.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Удалить"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Модальное окно добавления преподавателя */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Добавить преподавателя</h3>
            <form onSubmit={handleAddTeacher}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ФИО</label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Иванов Иван Иванович"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Имя пользователя будет задано при регистрации преподавателем
                  </p>
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

      {/* Модальное окно редактирования преподавателя */}
      {showEditModal && selectedTeacher && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Редактировать преподавателя</h3>
            <form onSubmit={handleUpdateTeacher}>
              <div className="space-y-4">
                {selectedTeacher.username && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Имя пользователя</label>
                    <input
                      type="text"
                      value={editFormData.username}
                      disabled
                      className="block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50 text-gray-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Имя пользователя нельзя изменить
                    </p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ФИО</label>
                  <input
                    type="text"
                    required
                    value={editFormData.fullName}
                    onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedTeacher(null);
                    setEditFormData({ username: '', fullName: '' });
                  }}
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

      {/* Модальное окно закрепления */}
      {showLinkModal && selectedTeacher && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Закрепление за {selectedTeacher.full_name}
              </h3>
              <button
                onClick={() => {
                  setShowLinkModal(false);
                  setSelectedTeacher(null);
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Вкладки */}
            <div className="border-b border-gray-200 mb-4">
              <nav className="-mb-px flex space-x-8">
                {['exam', 'credit', 'group'].map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      setLinkType(type);
                      setSelectedItemId('');
                    }}
                    className={`${
                      linkType === type
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
                  >
                    {type === 'exam' ? 'Экзамены' : type === 'credit' ? 'Зачеты' : 'Группы'}
                  </button>
                ))}
              </nav>
            </div>

            {/* Добавление связи */}
            <div className="mb-6">
              <div className="flex space-x-2">
                <select
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">Выберите {linkType === 'exam' ? 'экзамен' : linkType === 'credit' ? 'зачет' : 'группу'}</option>
                  {(linkType === 'exam' ? exams : linkType === 'credit' ? credits : groups).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item[linkType === 'exam' ? 'exam_name' : linkType === 'credit' ? 'credit_name' : 'group_name']}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleLink}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Закрепить
                </button>
              </div>
            </div>

            {/* Список закрепленных элементов будет загружаться динамически */}
            <div className="text-sm text-gray-500">
              <p>Закрепленные элементы будут отображаться здесь после загрузки</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTeachers;

