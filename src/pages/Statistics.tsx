import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  Autocomplete,
  TextField,
} from '@mui/material';
import {
  People as PeopleIcon,
  Assignment as AssignmentIcon,
  Quiz as QuizIcon,
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { userService } from '../services/user.service';
import { exerciseService } from '../services/exercise.service';
import { quizService } from '../services/quiz.service';
import { exerciseAttemptService } from '../services/exercise-attempt.service';
import { quizAttemptService } from '../services/quiz-attempt.service';
import { courseService } from '../services/course.service';
import { useAuthStore } from '../store/auth.store';
import { toast } from '../utils/toast';
import type {
  User,
  Exercise,
  Quiz,
  ExerciseAttempt,
  QuizAttempt,
  Course,
} from '../types';

type TabValue = 'exercises' | 'quizzes' | 'students';

export default function Statistics() {
  const currentUser = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabValue>('exercises');

  // Data
  const [students, setStudents] = useState<User[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [allExerciseAttempts, setAllExerciseAttempts] = useState<
    ExerciseAttempt[]
  >([]);
  const [allQuizAttempts, setAllQuizAttempts] = useState<QuizAttempt[]>([]);

  // Selected items
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('');
  const [selectedQuizId, setSelectedQuizId] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [studentsData, exercisesData, quizzesData, coursesData] =
          await Promise.all([
            userService.getAllUser(),
            exerciseService.getAllExercise(),
            quizService.getAllQuiz(),
            courseService.getAllCourse(),
          ]);

        // Filter only students
        const studentUsers = studentsData.filter((u) => u.role === 'student');
        setStudents(studentUsers);
        setExercises(exercisesData);
        setQuizzes(quizzesData);
        setCourses(coursesData);

        // Fetch all attempts for all students
        const exerciseAttemptsPromises = studentUsers.map((student) =>
          exerciseAttemptService
            .getExerciseAttemptByUserId(student._id)
            .catch(() => []),
        );
        const quizAttemptsPromises = studentUsers.map((student) =>
          quizAttemptService
            .getQuizAttemptByUserId(student._id)
            .catch(() => []),
        );

        const exerciseAttemptsResults = await Promise.all(
          exerciseAttemptsPromises,
        );
        const quizAttemptsResults = await Promise.all(quizAttemptsPromises);

        setAllExerciseAttempts(exerciseAttemptsResults.flat());
        setAllQuizAttempts(quizAttemptsResults.flat());
      } catch (e: unknown) {
        if (axios.isAxiosError(e)) {
          const msg =
            (e.response?.data as { message?: string })?.message ??
            e.response?.statusText ??
            'Không thể tải dữ liệu thống kê';
          toast.error(String(msg));
        } else {
          toast.error('Không thể tải dữ liệu thống kê');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calculate statistics
  const totalSections = exercises.reduce(
    (sum, ex) => sum + (ex.sections ?? []).length,
    0,
  );
  const totalQuizzes = quizzes.length;

  // Calculate average section completion rate per student
  let totalSectionCompletionRate = 0;
  students.forEach((student) => {
    const studentAttempts = allExerciseAttempts.filter(
      (a) => String(a.userId) === String(student._id),
    );
    const completedSections = new Set<string>();

    studentAttempts.forEach((attempt) => {
      (attempt.sectionAttempts ?? []).forEach((sectionAttempt) => {
        const attemptExerciseId =
          typeof attempt.exerciseId === 'object'
            ? (attempt.exerciseId as any)._id
            : attempt.exerciseId;
        const sectionId =
          typeof sectionAttempt.sectionId === 'object'
            ? (sectionAttempt.sectionId as any)._id
            : sectionAttempt.sectionId;
        completedSections.add(`${attemptExerciseId}-${sectionId}`);
      });
    });

    const completionRate =
      totalSections > 0 ? (completedSections.size / totalSections) * 100 : 0;
    totalSectionCompletionRate += completionRate;
  });

  const avgSectionCompletionRate =
    students.length > 0 ? totalSectionCompletionRate / students.length : 0;

  // Calculate average quiz completion rate per student
  let totalQuizCompletionRate = 0;
  students.forEach((student) => {
    const studentQuizAttempts = allQuizAttempts.filter(
      (a) => String(a.userId) === String(student._id) && a.submittedAt != null,
    );
    const completionRate =
      totalQuizzes > 0 ? (studentQuizAttempts.length / totalQuizzes) * 100 : 0;
    totalQuizCompletionRate += completionRate;
  });

  const avgQuizCompletionRate =
    students.length > 0 ? totalQuizCompletionRate / students.length : 0;

  // Calculate average score
  let totalScore = 0;
  let totalMaxScore = 0;

  allExerciseAttempts.forEach((attempt) => {
    (attempt.sectionAttempts ?? []).forEach((sectionAttempt) => {
      const attemptExerciseId =
        typeof attempt.exerciseId === 'object'
          ? (attempt.exerciseId as any)._id
          : attempt.exerciseId;
      const exercise = exercises.find(
        (e) => String(e._id) === String(attemptExerciseId),
      );
      const sectionId =
        typeof sectionAttempt.sectionId === 'object'
          ? (sectionAttempt.sectionId as any)._id
          : sectionAttempt.sectionId;
      const section = exercise?.sections.find(
        (s) => String(s._id) === String(sectionId),
      );

      if (
        section &&
        !['pronunciation', 'video-recording', 'writing'].includes(
          section.questionType,
        )
      ) {
        const maxScore = (section.questions ?? []).reduce(
          (sum, q) => sum + (q.point ?? 0),
          0,
        );
        totalScore += sectionAttempt.score || 0;
        totalMaxScore += maxScore;
      }
    });
  });

  allQuizAttempts.forEach((attempt) => {
    if (attempt.submittedAt) {
      const quiz = quizzes.find(
        (q) => String(q._id) === String(attempt.quizId),
      );
      if (quiz) {
        const maxScore = (quiz.sections ?? []).reduce((sum, section) => {
          if (
            ['pronunciation', 'video-recording', 'writing'].includes(
              section.questionType,
            )
          ) {
            return sum;
          }
          return (
            sum +
            (section.questions ?? []).reduce((s, q) => s + (q.point ?? 0), 0)
          );
        }, 0);
        totalScore += attempt.totalScore ?? 0;
        totalMaxScore += maxScore;
      }
    }
  });

  const averageScore =
    totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0;

  // Get students for selected exercise
  const getStudentsForExercise = (exerciseId: string) => {
    const exercise = exercises.find((e) => e._id === exerciseId);
    if (!exercise) return { completed: [], notStarted: [] };

    const studentsWithAttempts = students.map((student) => {
      const attempts = allExerciseAttempts.filter((attempt) => {
        const attemptExerciseId =
          typeof attempt.exerciseId === 'object'
            ? (attempt.exerciseId as any)._id
            : attempt.exerciseId;
        return (
          String(attemptExerciseId) === String(exerciseId) &&
          String(attempt.userId) === String(student._id)
        );
      });

      const sectionsCompleted = new Set<string>();
      attempts.forEach((attempt) => {
        (attempt.sectionAttempts ?? []).forEach((sa) => {
          const sectionId =
            typeof sa.sectionId === 'object'
              ? (sa.sectionId as any)._id
              : sa.sectionId;
          sectionsCompleted.add(String(sectionId));
        });
      });

      return {
        student,
        sectionsCompleted: sectionsCompleted.size,
        totalSections: exercise.sections.length,
        attempts,
      };
    });

    const completed = studentsWithAttempts.filter(
      (s) => s.sectionsCompleted > 0,
    );
    const notStarted = studentsWithAttempts.filter(
      (s) => s.sectionsCompleted === 0,
    );

    return { completed, notStarted };
  };

  // Get students for selected quiz
  const getStudentsForQuiz = (quizId: string) => {
    const studentsWithAttempts = students.map((student) => {
      const attempt = allQuizAttempts.find(
        (a) =>
          String(a.quizId) === String(quizId) &&
          String(a.userId) === String(student._id) &&
          a.submittedAt != null,
      );

      return {
        student,
        attempt,
      };
    });

    const completed = studentsWithAttempts.filter((s) => s.attempt != null);
    const notStarted = studentsWithAttempts.filter((s) => s.attempt == null);

    return { completed, notStarted };
  };

  // Get exercises and quizzes for selected student
  const getActivitiesForStudent = (studentId: string) => {
    const studentExerciseAttempts = allExerciseAttempts.filter(
      (a) => String(a.userId) === String(studentId),
    );
    const studentQuizAttempts = allQuizAttempts.filter(
      (a) => String(a.userId) === String(studentId) && a.submittedAt != null,
    );

    const exercisesWithProgress = exercises.map((exercise) => {
      const attempts = studentExerciseAttempts.filter((attempt) => {
        const attemptExerciseId =
          typeof attempt.exerciseId === 'object'
            ? (attempt.exerciseId as any)._id
            : attempt.exerciseId;
        return String(attemptExerciseId) === String(exercise._id);
      });

      const sectionsCompleted = new Set<string>();
      attempts.forEach((attempt) => {
        (attempt.sectionAttempts ?? []).forEach((sa) => {
          const sectionId =
            typeof sa.sectionId === 'object'
              ? (sa.sectionId as any)._id
              : sa.sectionId;
          sectionsCompleted.add(String(sectionId));
        });
      });

      return {
        exercise,
        sectionsCompleted: sectionsCompleted.size,
        totalSections: exercise.sections.length,
        attempts,
      };
    });

    const quizzesWithAttempts = quizzes.map((quiz) => {
      const attempt = studentQuizAttempts.find(
        (a) => String(a.quizId) === String(quiz._id),
      );
      return {
        quiz,
        attempt,
      };
    });

    return {
      exercises: exercisesWithProgress.filter((e) => e.sectionsCompleted > 0),
      quizzes: quizzesWithAttempts.filter((q) => q.attempt != null),
    };
  };

  if (currentUser?.role !== 'admin' && currentUser?.role !== 'teacher') {
    return (
      <Box>
        <Alert severity="error">
          Bạn không có quyền truy cập trang này. Chỉ dành cho giảng viên.
        </Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  const selectedExerciseData = selectedExerciseId
    ? getStudentsForExercise(selectedExerciseId)
    : null;
  const selectedQuizData = selectedQuizId
    ? getStudentsForQuiz(selectedQuizId)
    : null;
  const selectedStudentData = selectedStudentId
    ? getActivitiesForStudent(selectedStudentId)
    : null;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Thống kê và Báo cáo
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Theo dõi tình hình học tập của sinh viên
      </Typography>

      {/* Overview Statistics */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(4, 1fr)',
          },
          gap: 3,
          mb: 4,
        }}
      >
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <PeopleIcon sx={{ color: 'primary.main', mr: 1 }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Sinh viên
              </Typography>
            </Box>
            <Typography
              variant="h4"
              sx={{ fontWeight: 700, color: 'primary.main' }}
            >
              {students.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Tổng số sinh viên
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <AssignmentIcon sx={{ color: 'secondary.main', mr: 1 }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Bài tập
              </Typography>
            </Box>
            <Typography
              variant="h4"
              sx={{ fontWeight: 700, color: 'secondary.main' }}
            >
              {avgSectionCompletionRate.toFixed(1)}%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Tỷ lệ hoàn thành TB
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <QuizIcon sx={{ color: 'success.main', mr: 1 }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Quiz
              </Typography>
            </Box>
            <Typography
              variant="h4"
              sx={{ fontWeight: 700, color: 'success.main' }}
            >
              {avgQuizCompletionRate.toFixed(1)}%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Tỷ lệ hoàn thành TB
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <TrendingUpIcon sx={{ color: 'warning.main', mr: 1 }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Điểm TB
              </Typography>
            </Box>
            <Typography
              variant="h4"
              sx={{ fontWeight: 700, color: 'warning.main' }}
            >
              {averageScore.toFixed(1)}%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Điểm trung bình chung
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Tabs */}
      <Card>
        <Tabs
          value={tab}
          onChange={(_: React.SyntheticEvent, newValue: TabValue) => {
            setTab(newValue);
            setSelectedExerciseId('');
            setSelectedQuizId('');
            setSelectedStudentId('');
          }}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Theo Bài tập" value="exercises" />
          <Tab label="Theo Quiz" value="quizzes" />
          <Tab label="Theo Sinh viên" value="students" />
        </Tabs>

        <CardContent>
          {/* Exercise Tab */}
          {tab === 'exercises' && (
            <Box>
              <Autocomplete
                options={exercises}
                getOptionLabel={(option) => {
                  const course = courses.find((c) => c._id === option.courseId);
                  return `${option.title} (${course?.name || 'Unknown'})`;
                }}
                value={
                  exercises.find((ex) => ex._id === selectedExerciseId) || null
                }
                onChange={(_, newValue) => {
                  setSelectedExerciseId(newValue?._id || '');
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Chọn bài tập"
                    placeholder="Tìm kiếm bài tập..."
                  />
                )}
                sx={{ mb: 3 }}
                noOptionsText="Không tìm thấy bài tập"
              />

              {selectedExerciseData && (
                <Box>
                  <Typography
                    variant="h6"
                    gutterBottom
                    sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                  >
                    <CheckCircleIcon color="success" />
                    Đã làm ({selectedExerciseData.completed.length})
                  </Typography>
                  <TableContainer
                    component={Paper}
                    variant="outlined"
                    sx={{ mb: 3 }}
                  >
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600 }}>
                            Sinh viên
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>
                            Tiến độ
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>
                            Hành động
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedExerciseData.completed.map(
                          ({ student, sectionsCompleted, totalSections }) => (
                            <TableRow key={student._id} hover>
                              <TableCell>{student.username}</TableCell>
                              <TableCell>{student.email}</TableCell>
                              <TableCell>
                                <Chip
                                  label={`${sectionsCompleted}/${totalSections} phần`}
                                  color={
                                    sectionsCompleted === totalSections
                                      ? 'success'
                                      : 'warning'
                                  }
                                  size="small"
                                />
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label="Xem chi tiết"
                                  color="primary"
                                  size="small"
                                  onClick={() =>
                                    navigate(
                                      `/attempt/exercise/${selectedExerciseId}?studentId=${student._id}`,
                                    )
                                  }
                                  sx={{ cursor: 'pointer' }}
                                />
                              </TableCell>
                            </TableRow>
                          ),
                        )}
                        {selectedExerciseData.completed.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} align="center">
                              <Typography color="text.secondary">
                                Chưa có sinh viên nào làm bài
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <Typography
                    variant="h6"
                    gutterBottom
                    sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                  >
                    <CancelIcon color="error" />
                    Chưa làm ({selectedExerciseData.notStarted.length})
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600 }}>
                            Sinh viên
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedExerciseData.notStarted.map(({ student }) => (
                          <TableRow key={student._id}>
                            <TableCell>{student.username}</TableCell>
                            <TableCell>{student.email}</TableCell>
                          </TableRow>
                        ))}
                        {selectedExerciseData.notStarted.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={2} align="center">
                              <Typography color="text.secondary">
                                Tất cả sinh viên đã làm bài
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
            </Box>
          )}

          {/* Quiz Tab */}
          {tab === 'quizzes' && (
            <Box>
              <Autocomplete
                options={quizzes}
                getOptionLabel={(option) => {
                  const course = courses.find((c) => c._id === option.courseId);
                  return `${option.title} (${course?.name || 'Unknown'})`;
                }}
                value={quizzes.find((q) => q._id === selectedQuizId) || null}
                onChange={(_, newValue) => {
                  setSelectedQuizId(newValue?._id || '');
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Chọn quiz"
                    placeholder="Tìm kiếm quiz..."
                  />
                )}
                sx={{ mb: 3 }}
                noOptionsText="Không tìm thấy quiz"
              />

              {selectedQuizData && (
                <Box>
                  <Typography
                    variant="h6"
                    gutterBottom
                    sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                  >
                    <CheckCircleIcon color="success" />
                    Đã làm ({selectedQuizData.completed.length})
                  </Typography>
                  <TableContainer
                    component={Paper}
                    variant="outlined"
                    sx={{ mb: 3 }}
                  >
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600 }}>
                            Sinh viên
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Điểm</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>
                            Hành động
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedQuizData.completed.map(
                          ({ student, attempt }) => {
                            const quiz = quizzes.find(
                              (q) => q._id === selectedQuizId,
                            );
                            const maxScore = quiz
                              ? (quiz.sections ?? []).reduce((sum, section) => {
                                  if (
                                    [
                                      'pronunciation',
                                      'video-recording',
                                      'writing',
                                    ].includes(section.questionType)
                                  ) {
                                    return sum;
                                  }
                                  return (
                                    sum +
                                    (section.questions ?? []).reduce(
                                      (s, q) => s + (q.point ?? 0),
                                      0,
                                    )
                                  );
                                }, 0)
                              : 0;

                            return (
                              <TableRow key={student._id} hover>
                                <TableCell>{student.username}</TableCell>
                                <TableCell>{student.email}</TableCell>
                                <TableCell>
                                  {maxScore > 0 ? (
                                    <Chip
                                      label={`${attempt?.totalScore ?? 0}/${maxScore}`}
                                      color="primary"
                                      size="small"
                                    />
                                  ) : (
                                    <Chip
                                      label="Đã hoàn thành"
                                      color="success"
                                      size="small"
                                    />
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label="Xem chi tiết"
                                    color="primary"
                                    size="small"
                                    onClick={() =>
                                      navigate(
                                        `/attempt/quiz/${selectedQuizId}?studentId=${student._id}`,
                                      )
                                    }
                                    sx={{ cursor: 'pointer' }}
                                  />
                                </TableCell>
                              </TableRow>
                            );
                          },
                        )}
                        {selectedQuizData.completed.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} align="center">
                              <Typography color="text.secondary">
                                Chưa có sinh viên nào làm quiz
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <Typography
                    variant="h6"
                    gutterBottom
                    sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                  >
                    <CancelIcon color="error" />
                    Chưa làm ({selectedQuizData.notStarted.length})
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600 }}>
                            Sinh viên
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedQuizData.notStarted.map(({ student }) => (
                          <TableRow key={student._id}>
                            <TableCell>{student.username}</TableCell>
                            <TableCell>{student.email}</TableCell>
                          </TableRow>
                        ))}
                        {selectedQuizData.notStarted.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={2} align="center">
                              <Typography color="text.secondary">
                                Tất cả sinh viên đã làm quiz
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
            </Box>
          )}

          {/* Student Tab */}
          {tab === 'students' && (
            <Box>
              <Autocomplete
                options={students}
                getOptionLabel={(option) =>
                  `${option.username} (${option.email})`
                }
                value={
                  students.find((s) => s._id === selectedStudentId) || null
                }
                onChange={(_, newValue) => {
                  setSelectedStudentId(newValue?._id || '');
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Chọn sinh viên"
                    placeholder="Tìm kiếm sinh viên..."
                  />
                )}
                sx={{ mb: 3 }}
                noOptionsText="Không tìm thấy sinh viên"
              />

              {selectedStudentData && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Bài tập đã làm ({selectedStudentData.exercises.length})
                  </Typography>
                  <TableContainer
                    component={Paper}
                    variant="outlined"
                    sx={{ mb: 3 }}
                  >
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600 }}>
                            Bài tập
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>
                            Khóa học
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>
                            Tiến độ
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>
                            Hành động
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedStudentData.exercises.map(
                          ({ exercise, sectionsCompleted, totalSections }) => {
                            const course = courses.find(
                              (c) => c._id === exercise.courseId,
                            );
                            return (
                              <TableRow key={exercise._id} hover>
                                <TableCell>{exercise.title}</TableCell>
                                <TableCell>
                                  {course?.name || 'Unknown'}
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={`${sectionsCompleted}/${totalSections} phần`}
                                    color={
                                      sectionsCompleted === totalSections
                                        ? 'success'
                                        : 'warning'
                                    }
                                    size="small"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label="Xem chi tiết"
                                    color="primary"
                                    size="small"
                                    onClick={() =>
                                      navigate(
                                        `/attempt/exercise/${exercise._id}?studentId=${selectedStudentId}`,
                                      )
                                    }
                                    sx={{ cursor: 'pointer' }}
                                  />
                                </TableCell>
                              </TableRow>
                            );
                          },
                        )}
                        {selectedStudentData.exercises.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} align="center">
                              <Typography color="text.secondary">
                                Chưa làm bài tập nào
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <Typography variant="h6" gutterBottom>
                    Quiz đã làm ({selectedStudentData.quizzes.length})
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600 }}>Quiz</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>
                            Khóa học
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Điểm</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>
                            Hành động
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedStudentData.quizzes.map(
                          ({ quiz, attempt }) => {
                            const course = courses.find(
                              (c) => c._id === quiz.courseId,
                            );
                            const maxScore = (quiz.sections ?? []).reduce(
                              (sum, section) => {
                                if (
                                  [
                                    'pronunciation',
                                    'video-recording',
                                    'writing',
                                  ].includes(section.questionType)
                                ) {
                                  return sum;
                                }
                                return (
                                  sum +
                                  (section.questions ?? []).reduce(
                                    (s, q) => s + (q.point ?? 0),
                                    0,
                                  )
                                );
                              },
                              0,
                            );

                            return (
                              <TableRow key={quiz._id} hover>
                                <TableCell>{quiz.title}</TableCell>
                                <TableCell>
                                  {course?.name || 'Unknown'}
                                </TableCell>
                                <TableCell>
                                  {maxScore > 0 ? (
                                    <Chip
                                      label={`${attempt?.totalScore ?? 0}/${maxScore}`}
                                      color="primary"
                                      size="small"
                                    />
                                  ) : (
                                    <Chip
                                      label="Đã hoàn thành"
                                      color="success"
                                      size="small"
                                    />
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label="Xem chi tiết"
                                    color="primary"
                                    size="small"
                                    onClick={() =>
                                      navigate(
                                        `/attempt/quiz/${quiz._id}?studentId=${selectedStudentId}`,
                                      )
                                    }
                                    sx={{ cursor: 'pointer' }}
                                  />
                                </TableCell>
                              </TableRow>
                            );
                          },
                        )}
                        {selectedStudentData.quizzes.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} align="center">
                              <Typography color="text.secondary">
                                Chưa làm quiz nào
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
