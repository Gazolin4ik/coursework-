import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, BookOpen, CheckCircle, Search } from 'lucide-react';
import api from '../services/authService';
import toast from 'react-hot-toast';

const AdminDisciplines = () => {
  const [exams, setExams] = useState([]);
  const [credits, setCredits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('exams');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({ name: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [examsRes, creditsRes] = await Promise.all([
        api.get('/admin/exams'),
        api.get('/admin/credits')
      ]);
      setExams(examsRes.data.exams || []);
      setCredits(creditsRes.data.credits || []);
    } catch (error) {
      console.error('Error fetching disciplines:', error);
      toast.error('Ошибка при загрузке дисциплин');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      if (!formData.name || formData.name.trim().length === 0) {
        toast.error('Введите название дисциплины');
        return;
      }

      const endpoint = activeTab === 'exams' ? '/admin/exams' : '/admin/credits';
      const fieldName = activeTab === 'exams' ? 'examName' : 'creditName';
      
      await api.post(endpoint, { [fieldName]: formData.name.trim() });
      toast.success(`${activeTab === 'exams' ? 'Экзамен' : 'Зачет'} успешно добавлен`);
      setShowAddModal(false);
      setFormData({ name: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Ошибка при добавлении');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      if (!formData.name || formData.name.trim().length === 0) {
        toast.error('Введите название дисциплины');
        return;
      }

      const endpoint = activeTab === 'exams' 
        ? `/admin/exams/${selectedItem.id}` 
        : `/admin/credits/${selectedItem.id}`;
      const fieldName = activeTab === 'exams' ? 'examName' : 'creditName';
      
      await api.put(endpoint, { [fieldName]: formData.name.trim() });
      toast.success(`${activeTab === 'exams' ? 'Экзамен' : 'Зачет'} успешно обновлен`);
      setShowEditModal(false);
      setSelectedItem(null);
      setFormData({ name: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Ошибка при обновлении');
    }
  };

  const handleDelete = async () => {
    try {
      const endpoint = activeTab === 'exams' 
        ? `/admin/exams/${selectedItem.id}` 
        : `/admin/credits/${selectedItem.id}`;
      
      await api.delete(endpoint);
      toast.success(`${activeTab === 'exams' ? 'Экзамен' : 'Зачет'} успешно удален`);
      setShowDeleteModal(false);
      setSelectedItem(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Ошибка при удалении');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const currentItems = activeTab === 'exams' ? exams : credits;
  const itemName = activeTab === 'exams' ? 'exam_name' : 'credit_name';
  const filteredItems = currentItems.filter(item => 
    item[itemName].toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Управление дисциплинами</h1>
          <p className="text-gray-600 mt-1">Добавление, редактирование и удаление экзаменов и зачетов</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Добавить {activeTab === 'exams' ? 'экзамен' : 'зачет'}
        </button>
      </div>

      {/* Фильтр поиска */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder={`Поиск по названию ${activeTab === 'exams' ? 'экзамена' : 'зачета'}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full"
          />
        </div>
      </div>

      {/* Вкладки */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => {
              setActiveTab('exams');
              setSearchTerm(''); // Сброс поиска при переключении
            }}
            className={`${
              activeTab === 'exams'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <BookOpen className="h-5 w-5 mr-2" />
            Экзамены ({exams.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('credits');
              setSearchTerm(''); // Сброс поиска при переключении
            }}
            className={`${
              activeTab === 'credits'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <CheckCircle className="h-5 w-5 mr-2" />
            Зачеты ({credits.length})
          </button>
        </nav>
      </div>

      {/* Таблица */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            {activeTab === 'exams' ? 'Экзамены' : 'Зачеты'} ({filteredItems.length})
          </h3>
        </div>
        
        {filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {activeTab === 'exams' ? 'Экзамены не найдены' : 'Зачеты не найдены'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">Добавьте первую дисциплину</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Название</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Дата создания</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Действия</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{item[itemName]}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(item.created_at).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setSelectedItem(item);
                            setFormData({ name: item[itemName] });
                            setShowEditModal(true);
                          }}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedItem(item);
                            setShowDeleteModal(true);
                          }}
                          className="text-red-600 hover:text-red-900"
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

      {/* Модальные окна */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Добавить {activeTab === 'exams' ? 'экзамен' : 'зачет'}
            </h3>
            <form onSubmit={handleAdd}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Название</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ name: e.target.value })}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder={`Название ${activeTab === 'exams' ? 'экзамена' : 'зачета'}`}
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

      {showEditModal && selectedItem && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Редактировать {activeTab === 'exams' ? 'экзамен' : 'зачет'}
            </h3>
            <form onSubmit={handleUpdate}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Название</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ name: e.target.value })}
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

      {showDeleteModal && selectedItem && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Удалить {activeTab === 'exams' ? 'экзамен' : 'зачет'}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Вы уверены, что хотите удалить "{selectedItem[itemName]}"? 
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
                onClick={handleDelete}
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

export default AdminDisciplines;

