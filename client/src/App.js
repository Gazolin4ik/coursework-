import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import StudentDetail from './pages/StudentDetail';
import Predictions from './pages/Predictions';
import Profile from './pages/Profile';
import AdminGroups from './pages/AdminGroups';
import AdminDisciplines from './pages/AdminDisciplines';
import AdminTeachers from './pages/AdminTeachers';
import Groups from './pages/Groups';
import GroupDisciplines from './pages/GroupDisciplines';
import GroupStudents from './pages/GroupStudents';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
            }}
          />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="students" element={<Students />} />
              <Route path="students/:id" element={<StudentDetail />} />
              <Route path="groups" element={<Groups />} />
              <Route path="groups/:groupId/disciplines" element={<GroupDisciplines />} />
              <Route path="groups/:groupId/disciplines/:disciplineType/:disciplineId/students" element={<GroupStudents />} />
              <Route path="predictions" element={<Predictions />} />
              <Route path="profile" element={<Profile />} />
              <Route path="admin/groups" element={<AdminGroups />} />
              <Route path="admin/disciplines" element={<AdminDisciplines />} />
              <Route path="admin/teachers" element={<AdminTeachers />} />
              <Route path="admin/students" element={<Students />} />
            </Route>
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App; 