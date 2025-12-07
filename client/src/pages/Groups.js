import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Users, ArrowRight, Search } from 'lucide-react';
import api from '../services/authService';
import toast from 'react-hot-toast';

const Groups = () => {
  const { isTeacher } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isTeacher) {
      fetchGroups();
    }
  }, [isTeacher]);

  const fetchGroups = async () => {
    try {
      const response = await api.get('/groups/teacher');
      setGroups(response.data.groups || []);
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast.error('Ошибка при загрузке групп');
    } finally {
      setLoading(false);
    }
  };

  const handleGroupSelect = (groupId) => {
    navigate(`/groups/${groupId}/disciplines`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const filteredGroups = groups.filter(group => 
    group.group_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Группы</h1>
        <p className="text-gray-600 mt-1">Выберите группу для проставления оценок</p>
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

      {filteredGroups.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Нет закрепленных групп</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGroups.map((group) => (
            <button
              key={group.id}
              onClick={() => handleGroupSelect(group.id)}
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow text-left group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="bg-blue-100 rounded-full p-3 mr-4">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{group.group_name}</h3>
                    <p className="text-sm text-gray-500 mt-1">Нажмите для выбора</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Groups;
