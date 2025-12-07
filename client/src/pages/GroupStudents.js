import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Users, CheckCircle, XCircle, Edit, ArrowLeft, Plus, X, Search, CheckSquare, Square } from 'lucide-react';
import api from '../services/authService';
import toast from 'react-hot-toast';

const GroupStudents = () => {
  const { groupId, disciplineType, disciplineId } = useParams();
  const navigate = useNavigate();
  const { isTeacher } = useAuth();
  const [group, setGroup] = useState(null);
  const [discipline, setDiscipline] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState(new Set());
  const [showAddForm, setShowAddForm] = useState(false);
  const [bulkGrade, setBulkGrade] = useState('');
  const [bulkIsPassed, setBulkIsPassed] = useState('true');
  const [searchTerm, setSearchTerm] = useState('');
  const [editModal, setEditModal] = useState({ isOpen: false, student: null, currentGrade: null, currentIsPassed: null });
  const [editForm, setEditForm] = useState({ grade: '', isPassed: 'true' });

  useEffect(() => {
    if (isTeacher && groupId && disciplineType && disciplineId) {
      fetchData();
    }
  }, [isTeacher, groupId, disciplineType, disciplineId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [groupsRes, examsRes, creditsRes] = await Promise.all([
        api.get('/groups/teacher'),
        api.get('/grades/exams/list'),
        api.get('/grades/credits/list')
      ]);
      
      const selectedGroup = groupsRes.data.groups?.find(g => g.id === parseInt(groupId));
      setGroup(selectedGroup);

      const disciplines = disciplineType === 'exam' ? examsRes.data.exams : creditsRes.data.credits;
      const selectedDiscipline = disciplines?.find(d => d.id === parseInt(disciplineId));
      setDiscipline(selectedDiscipline);

      await fetchStudents();
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Ошибка при загрузке данных');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    if (!groupId || !disciplineId) return;

    setStudentsLoading(true);
    try {
      const response = await api.get(`/groups/${groupId}/students`, {
        params: {
          disciplineType,
          disciplineId
        }
      });
      setStudents(response.data.students || []);
      setSelectedStudents(new Set()); // Сбрасываем выбор при загрузке
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Ошибка при загрузке студентов');
      setStudents([]);
    } finally {
      setStudentsLoading(false);
    }
  };

  const toggleStudentSelection = (studentId) => {
    const newSelection = new Set(selectedStudents);
    if (newSelection.has(studentId)) {
      newSelection.delete(studentId);
    } else {
      newSelection.add(studentId);
    }
    setSelectedStudents(newSelection);
  };

  const toggleSelectAll = () => {
    const filtered = filteredStudents;
    
    // Если выбраны все отфильтрованные студенты, снимаем выбор
    const allFilteredSelected = filtered.length > 0 && 
      filtered.every(s => selectedStudents.has(s.id));
    
    if (allFilteredSelected) {
      // Снимаем выбор только с отфильтрованных
      const newSelection = new Set(selectedStudents);
      filtered.forEach(s => newSelection.delete(s.id));
      setSelectedStudents(newSelection);
    } else {
      // Выбираем всех отфильтрованных студентов
      const newSelection = new Set(selectedStudents);
      filtered.forEach(s => newSelection.add(s.id));
      setSelectedStudents(newSelection);
    }
  };

  const getStudentsWithoutGrade = () => {
    return students.filter(s => {
      if (disciplineType === 'exam') {
        return s.exam_grade === null || s.exam_grade === undefined;
      } else {
        return s.credit_passed === null || s.credit_passed === undefined;
      }
    });
  };

  const handleBulkAddGrades = async () => {
    const selectedIds = Array.from(selectedStudents);

    if (selectedIds.length === 0) {
      toast.error('Выберите хотя бы одного студента');
      return;
    }

    if (disciplineType === 'exam') {
      if (!bulkGrade || isNaN(parseInt(bulkGrade)) || parseInt(bulkGrade) < 2 || parseInt(bulkGrade) > 5) {
        toast.error('Выберите корректную оценку от 2 до 5');
        return;
      }
    }

    try {
      const promises = selectedIds.map(studentId => {
        const student = students.find(s => s.id === parseInt(studentId));
        const hasGrade = disciplineType === 'exam' 
          ? student?.exam_grade_id 
          : student?.credit_result_id;

        if (disciplineType === 'exam') {
          if (hasGrade) {
            // Обновляем существующую оценку
            return api.put(`/grades/exam/${student.exam_grade_id}`, {
              grade: parseInt(bulkGrade)
            });
          } else {
            // Добавляем новую оценку
            return api.post('/grades/exam', {
              studentId: parseInt(studentId),
              examId: parseInt(disciplineId),
              grade: parseInt(bulkGrade)
            });
          }
        } else {
          if (hasGrade) {
            // Обновляем существующий результат
            return api.put(`/grades/credit/${student.credit_result_id}`, {
              isPassed: bulkIsPassed === 'true'
            });
          } else {
            // Добавляем новый результат
            return api.post('/grades/credit', {
              studentId: parseInt(studentId),
              creditId: parseInt(disciplineId),
              isPassed: bulkIsPassed === 'true'
            });
          }
        }
      });

      await Promise.all(promises);
      toast.success(`Оценки успешно проставлены для ${selectedIds.length} студент${selectedIds.length > 1 ? 'ов' : 'а'}`);
      setSelectedStudents(new Set());
      setBulkGrade('');
      setBulkIsPassed('true');
      setShowAddForm(false);
      await fetchStudents();
    } catch (error) {
      console.error('Error adding bulk grades:', error);
      toast.error(error.response?.data?.message || 'Ошибка при проставлении оценок');
    }
  };

  const handleOpenEditModal = (student, currentGrade, currentIsPassed) => {
    if (disciplineType === 'exam') {
      if (!student.exam_grade_id) {
        toast.error('Оценка еще не проставлена. Используйте форму добавления.');
        return;
      }
      setEditForm({ grade: currentGrade?.toString() || '' });
    } else {
      if (!student.credit_result_id) {
        toast.error('Результат еще не проставлен. Используйте форму добавления.');
        return;
      }
      setEditForm({ isPassed: currentIsPassed ? 'true' : 'false' });
    }
    setEditModal({ isOpen: true, student, currentGrade, currentIsPassed });
  };

  const handleCloseEditModal = () => {
    setEditModal({ isOpen: false, student: null, currentGrade: null, currentIsPassed: null });
    setEditForm({ grade: '', isPassed: 'true' });
  };

  const handleUpdateGrade = async (e) => {
    e.preventDefault();
    
    const { student } = editModal;
    
    try {
      if (disciplineType === 'exam') {
        const newGrade = parseInt(editForm.grade);
        if (!editForm.grade || isNaN(newGrade) || newGrade < 2 || newGrade > 5) {
          toast.error('Введите корректную оценку от 2 до 5');
          return;
        }
        await api.put(`/grades/exam/${student.exam_grade_id}`, {
          grade: newGrade
        });
        toast.success('Оценка успешно обновлена');
      } else {
        await api.put(`/grades/credit/${student.credit_result_id}`, {
          isPassed: editForm.isPassed === 'true'
        });
        toast.success('Результат зачета успешно обновлен');
      }

      handleCloseEditModal();
      await fetchStudents();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Ошибка при обновлении оценки');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!group || !discipline) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-gray-500">Данные не найдены</p>
        <button
          onClick={() => navigate('/groups')}
          className="mt-4 text-blue-600 hover:text-blue-800"
        >
          Вернуться к списку групп
        </button>
      </div>
    );
  }

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.full_name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const allSelected = filteredStudents.length > 0 && 
    filteredStudents.every(s => selectedStudents.has(s.id));

  return (
    <div className="space-y-6">
      <div>
        <button
          onClick={() => navigate(`/groups/${groupId}/disciplines`)}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Назад к дисциплинам
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Студенты</h1>
        <p className="text-gray-600 mt-1">
          Группа: {group.group_name} | Дисциплина: {disciplineType === 'exam' ? discipline.exam_name : discipline.credit_name}
        </p>
      </div>

      {/* Фильтр поиска */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Поиск по имени студента..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Users className="h-5 w-5 text-purple-600 mr-2" />
            <h2 className="text-lg font-medium text-gray-900">
              Список студентов ({filteredStudents.length})
            </h2>
          </div>
          {students.length > 0 && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
            >
              <Plus className="h-4 w-4 mr-2" />
              {showAddForm ? 'Скрыть форму' : 'Добавить оценку'}
            </button>
          )}
        </div>

        {/* Форма массового проставления */}
        {showAddForm && students.length > 0 && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center px-3 py-1 text-sm text-blue-600 hover:bg-blue-100 rounded-md"
                >
                  {allSelected ? (
                    <>
                      <CheckSquare className="h-4 w-4 mr-1" />
                      Снять все
                    </>
                  ) : (
                    <>
                      <Square className="h-4 w-4 mr-1" />
                      Выбрать всех ({filteredStudents.length})
                    </>
                  )}
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {disciplineType === 'exam' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Оценка для всех выбранных
                  </label>
                  <select
                    value={bulkGrade}
                    onChange={(e) => setBulkGrade(e.target.value)}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    required
                  >
                    <option value="">Выберите оценку</option>
                    <option value="5">5</option>
                    <option value="4">4</option>
                    <option value="3">3</option>
                    <option value="2">2</option>
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Результат для всех выбранных
                  </label>
                  <select
                    value={bulkIsPassed}
                    onChange={(e) => setBulkIsPassed(e.target.value)}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    required
                  >
                    <option value="true">Сдан</option>
                    <option value="false">Не сдан</option>
                  </select>
                </div>
              )}

              <div className="flex items-end">
                <div className="text-sm text-gray-600">
                  Выбрано: <span className="font-semibold text-blue-600">{selectedStudents.size}</span> из {filteredStudents.length}
                </div>
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleBulkAddGrades}
                  disabled={selectedStudents.size === 0 || (disciplineType === 'exam' && !bulkGrade)}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium"
                >
                  Проставить выбранным
                </button>
              </div>
            </div>
          </div>
        )}

        {studentsLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredStudents.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">Нет студентов в группе</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredStudents.map((student) => {
              const grade = disciplineType === 'exam' 
                ? student.exam_grade 
                : student.credit_passed;
              const hasGrade = grade !== null && grade !== undefined;
              const isSelected = selectedStudents.has(student.id);
              
              return (
                <div
                  key={student.id}
                  onClick={() => toggleStudentSelection(student.id)}
                  className={`flex items-center justify-between p-4 rounded-md transition-all cursor-pointer ${
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
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                        {student.full_name}
                      </p>
                      {hasGrade ? (
                        <div className="flex items-center mt-1">
                          {disciplineType === 'exam' ? (
                            <span className="text-sm text-gray-600">Оценка: <span className="font-semibold">{grade}</span></span>
                          ) : (
                            <span className="text-sm text-gray-600">
                              {grade ? (
                                <span className="flex items-center text-green-600">
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Сдан
                                </span>
                              ) : (
                                <span className="flex items-center text-red-600">
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Не сдан
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500 mt-1">Оценка не проставлена</p>
                      )}
                    </div>
                  </div>
                  {hasGrade && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEditModal(student, grade, grade);
                      }}
                      className="ml-4 p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      title="Изменить оценку"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Модальное окно редактирования оценки */}
      {editModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {disciplineType === 'exam' ? 'Изменить оценку' : 'Изменить результат зачета'}
              </h3>
              <button
                onClick={handleCloseEditModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateGrade} className="p-6">
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-medium">Студент:</span> {editModal.student?.full_name}
                </p>
                {disciplineType === 'exam' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Новая оценка
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[5, 4, 3, 2].map((gradeValue) => (
                        <button
                          key={gradeValue}
                          type="button"
                          onClick={() => setEditForm({ ...editForm, grade: gradeValue.toString() })}
                          className={`px-4 py-3 rounded-lg font-semibold text-lg transition-all ${
                            editForm.grade === gradeValue.toString()
                              ? 'bg-blue-600 text-white shadow-md scale-105'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {gradeValue}
                        </button>
                      ))}
                    </div>
                    <input
                      type="hidden"
                      value={editForm.grade}
                      required
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Результат зачета
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setEditForm({ ...editForm, isPassed: 'true' })}
                        className={`px-4 py-3 rounded-lg font-medium transition-all ${
                          editForm.isPassed === 'true'
                            ? 'bg-green-600 text-white shadow-md scale-105'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <CheckCircle className="h-5 w-5 inline-block mr-2" />
                        Сдан
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditForm({ ...editForm, isPassed: 'false' })}
                        className={`px-4 py-3 rounded-lg font-medium transition-all ${
                          editForm.isPassed === 'false'
                            ? 'bg-red-600 text-white shadow-md scale-105'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <XCircle className="h-5 w-5 inline-block mr-2" />
                        Не сдан
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium transition-colors"
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

export default GroupStudents;
