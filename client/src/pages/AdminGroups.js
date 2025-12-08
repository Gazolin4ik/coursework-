import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Users, Search, CheckSquare, Square } from 'lucide-react';
import api from '../services/authService';
import toast from 'react-hot-toast';

const AdminGroups = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [formData, setFormData] = useState({ groupName: '' });
  const [selectedItems, setSelectedItems] = useState(new Set());

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const response = await api.get('/admin/groups');
      setGroups(response.data.groups || []);
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast.error('Ошибка при загрузке групп');
    } finally {
      setLoading(false);
    }
  };

  const handleAddGroup = async (e) => {
    e.preventDefault();
    try {
      if (!formData.groupName || formData.groupName.trim().length === 0) {
        toast.error('Введите название группы');
        return;
      }

      await api.post('/admin/groups', { groupName: formData.groupName.trim() });
      toast.success('Группа успешно добавлена');
      setShowAddModal(false);
      setFormData({ groupName: '' });
      fetchGroups();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Ошибка при добавлении группы');
    }
  };

  const handleUpdateGroup = async (e) => {
    e.preventDefault();
    try {
      if (!formData.groupName || formData.groupName.trim().length === 0) {
        toast.error('Введите название группы');
        return;
      }

      await api.put(`/admin/groups/${selectedGroup.id}`, { groupName: formData.groupName.trim() });
      toast.success('Группа успешно обновлена');
      setShowEditModal(false);
      setSelectedGroup(null);
      setFormData({ groupName: '' });
      fetchGroups();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Ошибка при обновлении группы');
    }
  };

  const handleDeleteGroup = async () => {
    try {
      await api.delete(`/admin/groups/${selectedGroup.id}`);
      toast.success('Группа успешно удалена');
      setShowDeleteModal(false);
      setSelectedGroup(null);
      setSelectedItems(new Set());
      fetchGroups();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Ошибка при удалении группы');
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
    const filteredGroups = groups.filter(g => g.group_name.toLowerCase().includes(searchTerm.toLowerCase()));
    const allSelected = filteredGroups.every(group => selectedItems.has(group.id));
    
    if (allSelected) {
      setSelectedItems(prevSelected => {
        const newSelected = new Set(prevSelected);
        filteredGroups.forEach(group => newSelected.delete(group.id));
        return newSelected;
      });
    } else {
      setSelectedItems(prevSelected => {
        const newSelected = new Set(prevSelected);
        filteredGroups.forEach(group => newSelected.add(group.id));
        return newSelected;
      });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) {
      toast.error('Выберите группы для удаления');
      return;
    }

    try {
      const promises = Array.from(selectedItems).map(groupId => 
        api.delete(`/admin/groups/${groupId}`)
      );

      await Promise.all(promises);
      toast.success(`Успешно удалено групп: ${selectedItems.size}`);
      setSelectedItems(new Set());
      fetchGroups();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Ошибка при удалении групп');
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
          <h1 className="text-2xl font-bold text-gray-900">Управление группами</h1>
          <p className="text-gray-600 mt-1">Добавление, редактирование и удаление групп</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Добавить группу
        </button>
      </div>

      {/* Фильтр поиска */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Поиск по названию группы..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">
            Группы ({groups.filter(g => g.group_name.toLowerCase().includes(searchTerm.toLowerCase())).length})
          </h3>
          {selectedItems.size > 0 && (
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-600">
                Выбрано: <span className="font-semibold text-blue-600">{selectedItems.size}</span>
              </span>
              <button
                onClick={toggleSelectAll}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                {groups.filter(g => g.group_name.toLowerCase().includes(searchTerm.toLowerCase())).every(g => selectedItems.has(g.id)) ? 'Снять выделение' : 'Выбрать все'}
              </button>
              <button
                onClick={handleBulkDelete}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Удалить выбранные
              </button>
            </div>
          )}
        </div>
        
        {groups.filter(g => g.group_name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 ? (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Группы не найдены</h3>
            <p className="mt-1 text-sm text-gray-500">Добавьте первую группу</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-12"></th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Название</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Дата создания</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Действия</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {groups.filter(g => g.group_name.toLowerCase().includes(searchTerm.toLowerCase())).map((group) => {
                  const isSelected = selectedItems.has(group.id);
                  return (
                    <tr key={group.id} className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => toggleItemSelection(group.id)}
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
                        <div className="text-sm font-medium text-gray-900">{group.group_name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(group.created_at).toLocaleDateString('ru-RU')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setSelectedGroup(group);
                              setFormData({ groupName: group.group_name });
                              setShowEditModal(true);
                            }}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedGroup(group);
                              setShowDeleteModal(true);
                            }}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
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

      {/* Модальное окно добавления */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Добавить группу</h3>
            <form onSubmit={handleAddGroup}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Название группы</label>
                <input
                  type="text"
                  required
                  value={formData.groupName}
                  onChange={(e) => setFormData({ groupName: e.target.value })}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Например: АБс-322"
                />
              </div>
              <div className="flex justify-end space-x-3">
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

      {/* Модальное окно редактирования */}
      {showEditModal && selectedGroup && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Редактировать группу</h3>
            <form onSubmit={handleUpdateGroup}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Название группы</label>
                <input
                  type="text"
                  required
                  value={formData.groupName}
                  onChange={(e) => setFormData({ groupName: e.target.value })}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex justify-end space-x-3">
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

      {/* Модальное окно удаления */}
      {showDeleteModal && selectedGroup && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Удалить группу</h3>
            <p className="text-sm text-gray-500 mb-4">
              Вы уверены, что хотите удалить группу "{selectedGroup.group_name}"? 
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
                onClick={handleDeleteGroup}
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

export default AdminGroups;

