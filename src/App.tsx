import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { theme } from './theme/theme';
import MainLayout from './components/Layout/MainLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Materials from './pages/Materials';
import Exercises from './pages/Exercises';
import ExerciseDetail from './pages/ExerciseDetail';
import Quizzes from './pages/Quizzes';
import QuizDetail from './pages/QuizDetail';
import Progress from './pages/Progress';
import Statistics from './pages/Statistics';
import Profile from './pages/Profile';
import { getUser } from './services/storage';
import { initializeMockData } from './services/mockData';

// Protected Route component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = getUser();
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

function App() {
  useEffect(() => {
    // Initialize mock data on first load
    const courses = localStorage.getItem('english_learning_courses');
    if (!courses) {
      initializeMockData();
    }
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
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
            <Route path="statistics" element={<Statistics />} />
            <Route path="profile" element={<Profile />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
