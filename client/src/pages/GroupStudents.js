import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Users, CheckCircle, XCircle, Edit, ArrowLeft, Plus, X } from 'lucide-react';
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
  const [gradeForm, setGradeForm] = useState({ studentId: '', grade: '', isPassed: 'true' });
  const [showAddForm, setShowAddForm] = useState(false);
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
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Ошибка при загрузке студентов');
      setStudents([]);
    } finally {
      setStudentsLoading(false);
    }
  };

  const handleAddGrade = async (e) => {
    e.preventDefault();
    
    if (!gradeForm.studentId || (disciplineType === 'exam' && !gradeForm.grade) || (disciplineType === 'credit' && !gradeForm.isPassed)) {
      toast.error('Заполните все поля');
      return;
    }

    try {
      if (disciplineType === 'exam') {
        await api.post('/grades/exam', {
          studentId: parseInt(gradeForm.studentId),
          examId: parseInt(disciplineId),
          grade: parseInt(gradeForm.grade)
        });
        toast.success('Оценка успешно добавлена');
      } else {
        await api.post('/grades/credit', {
          studentId: parseInt(gradeForm.studentId),
          creditId: parseInt(disciplineId),
          isPassed: gradeForm.isPassed === 'true'
        });
        toast.success('Результат зачета успешно добавлен');
      }

      await fetchStudents();
      setGradeForm({ studentId: '', grade: '', isPassed: 'true' });
      setShowAddForm(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Ошибка при добавлении оценки');
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

  const studentsWithoutGrade = students.filter(s => {
    if (disciplineType === 'exam') {
      return s.exam_grade === null || s.exam_grade === undefined;
    } else {
      return s.credit_passed === null || s.credit_passed === undefined;
    }
  });

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

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Users className="h-5 w-5 text-purple-600 mr-2" />
            <h2 className="text-lg font-medium text-gray-900">
              Список студентов ({students.length})
            </h2>
          </div>
          {studentsWithoutGrade.length > 0 && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
            >
              <Plus className="h-4 w-4 mr-2" />
              {showAddForm ? 'Скрыть форму' : 'Добавить оценку'}
            </button>
          )}
        </div>

        {showAddForm && studentsWithoutGrade.length > 0 && (
          <form onSubmit={handleAddGrade} className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Студент
                </label>
                <select
                  value={gradeForm.studentId}
                  onChange={(e) => setGradeForm({ ...gradeForm, studentId: e.target.value })}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  required
                >
                  <option value="">Выберите студента</option>
                  {studentsWithoutGrade.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.full_name}
                    </option>
                  ))}
                </select>
              </div>

              {disciplineType === 'exam' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Оценка
                  </label>
                  <select
                    value={gradeForm.grade}
                    onChange={(e) => setGradeForm({ ...gradeForm, grade: e.target.value })}
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
                    Результат
                  </label>
                  <select
                    value={gradeForm.isPassed}
                    onChange={(e) => setGradeForm({ ...gradeForm, isPassed: e.target.value })}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    required
                  >
                    <option value="true">Сдан</option>
                    <option value="false">Не сдан</option>
                  </select>
                </div>
              )}

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
                >
                  Добавить
                </button>
              </div>
            </div>
          </form>
        )}

        {studentsLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : students.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">Нет студентов в группе</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {students.map((student) => {
              const grade = disciplineType === 'exam' 
                ? student.exam_grade 
                : student.credit_passed;
              const hasGrade = grade !== null && grade !== undefined;
              
              return (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{student.full_name}</p>
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
                  {hasGrade && (
                    <button
                      onClick={() => handleOpenEditModal(student, grade, grade)}
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

