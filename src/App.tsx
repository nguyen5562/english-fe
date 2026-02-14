import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Toaster } from 'sonner';
import { theme } from './theme/theme';
import MainLayout from './components/Layout/MainLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Materials from './pages/Materials';
import Exercises from './pages/Exercises';
import ExerciseDetail from './pages/ExerciseDetail';
import Quizzes from './pages/Quizzes';
import QuizDetail from './pages/QuizDetail';
import Progress from './pages/Progress';
import Statistics from './pages/Statistics';
import AdminLayout from './components/Layout/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminContent from './pages/admin/AdminContent';
import AdminExercises from './pages/admin/AdminExercises';
import AdminExerciseEdit from './pages/admin/AdminExerciseEdit';
import AdminSectionEdit from './pages/admin/AdminSectionEdit';
import AdminQuizzes from './pages/admin/AdminQuizzes';
import AdminQuizEdit from './pages/admin/AdminQuizEdit';
import AdminQuizSectionEdit from './pages/admin/AdminQuizSectionEdit';
import AdminStudents from './pages/admin/AdminStudents';
import { useAuthStore } from './store/auth.store';
import FileManagerPopup from './pages/FileManagerPopup';

// Protected Route component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

// Admin Protected Route - chỉ cho phép teacher
function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (user.role !== 'teacher') {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Toaster position="top-right" richColors />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/file-manager-popup"
            element={
              <ProtectedRoute>
                <FileManagerPopup />
              </ProtectedRoute>
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="materials" element={<Materials />} />
            <Route path="exercises" element={<Exercises />} />
            <Route path="exercises/:id" element={<ExerciseDetail />} />
            <Route path="quizzes" element={<Quizzes />} />
            <Route path="quizzes/:id" element={<QuizDetail />} />
            <Route path="progress" element={<Progress />} />
            {/* <Route path="statistics" element={<Statistics />} /> */}
          </Route>
          <Route
            path="/admin"
            element={
              <AdminProtectedRoute>
                <AdminLayout />
              </AdminProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="content" element={<AdminContent />} />
            <Route path="exercises" element={<AdminExercises />} />
            <Route path="exercises/:id" element={<AdminExerciseEdit />} />
            <Route
              path="exercises/:exerciseId/sections/:sectionId"
              element={<AdminSectionEdit />}
            />
            <Route path="quizzes" element={<AdminQuizzes />} />
            <Route path="quizzes/:id" element={<AdminQuizEdit />} />
            <Route
              path="quizzes/:quizId/sections/:sectionId"
              element={<AdminQuizSectionEdit />}
            />
            <Route path="students" element={<AdminStudents />} />
            {/* <Route path="statistics" element={<Statistics />} /> */}
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
