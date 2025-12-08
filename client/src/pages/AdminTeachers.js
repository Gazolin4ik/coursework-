import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Users, BookOpen, Link as LinkIcon, X, Search, Eye, CheckSquare, Square } from 'lucide-react';
import api from '../services/authService';
import toast from 'react-hot-toast';

const AdminTeachers = () => {
  const [teachers, setTeachers] = useState([]);
  const [exams, setExams] = useState([]);
  const [credits, setCredits] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [teacherDisciplines, setTeacherDisciplines] = useState({ exams: [], credits: [] });
  const [teacherGroups, setTeacherGroups] = useState([]);
  const [loadingViewData, setLoadingViewData] = useState(false);
  const [linkType, setLinkType] = useState('exam'); // 'exam', 'credit', 'group'
  const [formData, setFormData] = useState({ username: '', fullName: '' });
  const [editFormData, setEditFormData] = useState({ username: '', fullName: '' });
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [linkSearchTerm, setLinkSearchTerm] = useState('');

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

  const handleViewTeacher = async (teacher) => {
    setSelectedTeacher(teacher);
    setShowViewModal(true);
    setLoadingViewData(true);
    setTeacherDisciplines({ exams: [], credits: [] });
    setTeacherGroups([]);
    
    try {
      const [disciplinesData, groupsData] = await Promise.all([
        fetchTeacherDisciplines(teacher.id),
        fetchTeacherGroups(teacher.id)
      ]);
      setTeacherDisciplines(disciplinesData);
      setTeacherGroups(groupsData);
    } catch (error) {
      toast.error('Ошибка при загрузке данных');
    } finally {
      setLoadingViewData(false);
    }
  };

  const handleUnlinkFromView = async (type, itemId) => {
    if (!selectedTeacher) return;
    
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
      
      // Обновляем данные в модальном окне
      const [disciplinesData, groupsData] = await Promise.all([
        fetchTeacherDisciplines(selectedTeacher.id),
        fetchTeacherGroups(selectedTeacher.id)
      ]);
      setTeacherDisciplines(disciplinesData);
      setTeacherGroups(groupsData);
      
      // Обновляем общий список преподавателей
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Ошибка при удалении связи');
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

  const toggleItemSelection = (itemId) => {
    setSelectedItems(prevSelected => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(itemId)) {
        newSelected.delete(itemId);
      } else {
        newSelected.add(itemId);
      }
      return newSelected;
    });
  };

  const toggleSelectAll = () => {
    const currentItems = linkType === 'exam' ? exams : linkType === 'credit' ? credits : groups;
    const filteredItems = currentItems.filter(item => {
      const name = linkType === 'exam' ? item.exam_name : linkType === 'credit' ? item.credit_name : item.group_name;
      return name.toLowerCase().includes(linkSearchTerm.toLowerCase());
    });
    
    const allSelected = filteredItems.every(item => selectedItems.has(item.id));
    
    if (allSelected) {
      // Снять выделение со всех отфильтрованных элементов
      setSelectedItems(prevSelected => {
        const newSelected = new Set(prevSelected);
        filteredItems.forEach(item => newSelected.delete(item.id));
        return newSelected;
      });
    } else {
      // Выделить все отфильтрованные элементы
      setSelectedItems(prevSelected => {
        const newSelected = new Set(prevSelected);
        filteredItems.forEach(item => newSelected.add(item.id));
        return newSelected;
      });
    }
  };

  const handleLink = async () => {
    try {
      if (selectedItems.size === 0) {
        toast.error('Выберите элементы для закрепления');
        return;
      }

      const promises = Array.from(selectedItems).map(itemId => {
        let endpoint;
        if (linkType === 'exam') {
          endpoint = `/admin/teachers/${selectedTeacher.id}/exams/${itemId}`;
        } else if (linkType === 'credit') {
          endpoint = `/admin/teachers/${selectedTeacher.id}/credits/${itemId}`;
        } else {
          endpoint = `/admin/teachers/${selectedTeacher.id}/groups/${itemId}`;
        }
        return api.post(endpoint);
      });

      await Promise.all(promises);
      toast.success(`Успешно закреплено элементов: ${selectedItems.size}`);
      setSelectedItems(new Set());
      setLinkSearchTerm('');
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

      {/* Фильтр поиска */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Поиск по ФИО или username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Преподаватели ({teachers.filter(t => 
              t.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              (t.username && t.username.toLowerCase().includes(searchTerm.toLowerCase()))
            ).length})
          </h3>
        </div>
        
        {teachers.filter(t => 
          t.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (t.username && t.username.toLowerCase().includes(searchTerm.toLowerCase()))
        ).length === 0 ? (
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
                {teachers.filter(t => 
                  t.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  (t.username && t.username.toLowerCase().includes(searchTerm.toLowerCase()))
                ).map((teacher) => (
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
                          onClick={() => handleViewTeacher(teacher)}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Просмотр дисциплин и групп"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
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
                            setSelectedItems(new Set());
                            setLinkSearchTerm('');
                            setLinkType('exam');
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
                  setSelectedItems(new Set());
                  setLinkSearchTerm('');
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
                      setSelectedItems(new Set());
                      setLinkSearchTerm('');
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

            {/* Поиск */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={`Поиск ${linkType === 'exam' ? 'экзаменов' : linkType === 'credit' ? 'зачетов' : 'групп'}...`}
                  value={linkSearchTerm}
                  onChange={(e) => setLinkSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full"
                />
              </div>
            </div>

            {/* Список элементов для выбора */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm text-gray-600">
                  Выбрано: <span className="font-semibold text-blue-600">{selectedItems.size}</span>
                </div>
                <button
                  onClick={toggleSelectAll}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  {(() => {
                    const currentItems = linkType === 'exam' ? exams : linkType === 'credit' ? credits : groups;
                    const filteredItems = currentItems.filter(item => {
                      const name = linkType === 'exam' ? item.exam_name : linkType === 'credit' ? item.credit_name : item.group_name;
                      return name.toLowerCase().includes(linkSearchTerm.toLowerCase());
                    });
                    const allSelected = filteredItems.length > 0 && filteredItems.every(item => selectedItems.has(item.id));
                    return allSelected ? 'Снять выделение' : 'Выбрать все';
                  })()}
                </button>
              </div>
              
              <div className="space-y-2 max-h-96 overflow-y-auto border border-gray-200 rounded-md p-2">
                {(() => {
                  const currentItems = linkType === 'exam' ? exams : linkType === 'credit' ? credits : groups;
                  const filteredItems = currentItems.filter(item => {
                    const name = linkType === 'exam' ? item.exam_name : linkType === 'credit' ? item.credit_name : item.group_name;
                    return name.toLowerCase().includes(linkSearchTerm.toLowerCase());
                  });

                  if (filteredItems.length === 0) {
                    return (
                      <p className="text-sm text-gray-500 text-center py-4">
                        {linkSearchTerm ? 'Ничего не найдено' : `Нет доступных ${linkType === 'exam' ? 'экзаменов' : linkType === 'credit' ? 'зачетов' : 'групп'}`}
                      </p>
                    );
                  }

                  return filteredItems.map((item) => {
                    const itemName = linkType === 'exam' ? item.exam_name : linkType === 'credit' ? item.credit_name : item.group_name;
                    const isSelected = selectedItems.has(item.id);
                    
                    return (
                      <div
                        key={item.id}
                        onClick={() => toggleItemSelection(item.id)}
                        className={`flex items-center justify-between p-3 rounded-md transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-100 border-2 border-blue-500'
                            : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                        }`}
                      >
                        <div className="flex items-center flex-1">
                          <div className="mr-3">
                            {isSelected ? (
                              <CheckSquare className="h-5 w-5 text-blue-600" />
                            ) : (
                              <Square className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                          <span className={`text-sm font-medium ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                            {itemName}
                          </span>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Кнопка закрепления */}
            <div className="flex justify-end">
              <button
                onClick={handleLink}
                disabled={selectedItems.size === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Закрепить выбранные ({selectedItems.size})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно просмотра дисциплин и групп */}
      {showViewModal && selectedTeacher && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Дисциплины и группы: {selectedTeacher.full_name}
              </h3>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedTeacher(null);
                  setTeacherDisciplines({ exams: [], credits: [] });
                  setTeacherGroups([]);
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {loadingViewData ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Экзамены */}
                <div>
                  <div className="flex items-center mb-3">
                    <BookOpen className="h-5 w-5 text-blue-600 mr-2" />
                    <h4 className="text-md font-medium text-gray-900">Экзамены</h4>
                    <span className="ml-2 px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {teacherDisciplines.exams.length}
                    </span>
                  </div>
                  {teacherDisciplines.exams.length === 0 ? (
                    <p className="text-sm text-gray-500 pl-7">Нет закрепленных экзаменов</p>
                  ) : (
                    <div className="pl-7 space-y-2">
                      {teacherDisciplines.exams.map((exam) => (
                        <div key={exam.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md hover:bg-gray-100">
                          <span className="text-sm text-gray-900">{exam.exam_name}</span>
                          <button
                            onClick={() => handleUnlinkFromView('exam', exam.id)}
                            className="text-red-600 hover:text-red-900 ml-2"
                            title="Открепить экзамен"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Зачеты */}
                <div>
                  <div className="flex items-center mb-3">
                    <BookOpen className="h-5 w-5 text-green-600 mr-2" />
                    <h4 className="text-md font-medium text-gray-900">Зачеты</h4>
                    <span className="ml-2 px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      {teacherDisciplines.credits.length}
                    </span>
                  </div>
                  {teacherDisciplines.credits.length === 0 ? (
                    <p className="text-sm text-gray-500 pl-7">Нет закрепленных зачетов</p>
                  ) : (
                    <div className="pl-7 space-y-2">
                      {teacherDisciplines.credits.map((credit) => (
                        <div key={credit.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md hover:bg-gray-100">
                          <span className="text-sm text-gray-900">{credit.credit_name}</span>
                          <button
                            onClick={() => handleUnlinkFromView('credit', credit.id)}
                            className="text-red-600 hover:text-red-900 ml-2"
                            title="Открепить зачет"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Группы */}
                <div>
                  <div className="flex items-center mb-3">
                    <Users className="h-5 w-5 text-purple-600 mr-2" />
                    <h4 className="text-md font-medium text-gray-900">Группы</h4>
                    <span className="ml-2 px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                      {teacherGroups.length}
                    </span>
                  </div>
                  {teacherGroups.length === 0 ? (
                    <p className="text-sm text-gray-500 pl-7">Нет закрепленных групп</p>
                  ) : (
                    <div className="pl-7 space-y-2">
                      {teacherGroups.map((group) => (
                        <div key={group.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md hover:bg-gray-100">
                          <span className="text-sm text-gray-900">{group.group_name}</span>
                          <button
                            onClick={() => handleUnlinkFromView('group', group.id)}
                            className="text-red-600 hover:text-red-900 ml-2"
                            title="Открепить группу"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTeachers;

