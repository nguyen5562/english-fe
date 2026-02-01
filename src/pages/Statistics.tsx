import { useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
} from '@mui/material';
import {
  BarChart as BarChartIcon,
  People as PeopleIcon,
  Assignment as AssignmentIcon,
  Quiz as QuizIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { getStatistics, getUser } from '../types old/storage';
import type { Statistics as StatisticsType } from '../types old';

export default function Statistics() {
  const user = getUser();
  const stats = useMemo<StatisticsType | null>(
    () => (user?.role === 'teacher' ? getStatistics() : null),
    [user],
  );

  if (user?.role !== 'teacher') {
    return (
      <Box>
        <Alert severity="error">
          Bạn không có quyền truy cập trang này. Chỉ dành cho giảng viên.
        </Alert>
      </Box>
    );
  }

  if (!stats) {
    return (
      <Box>
        <Typography>Đang tải...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Thống kê và Báo cáo
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Theo dõi tình hình học tập của sinh viên
      </Typography>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        {/* @ts-expect-error - MUI v7 Grid still works with item prop */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <PeopleIcon
                  sx={{ fontSize: 40, color: 'primary.main', mr: 2 }}
                />
                <Box>
                  <Typography variant="h4">{stats.totalStudents}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Tổng sinh viên
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* @ts-expect-error - MUI v7 Grid still works with item prop */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <AssignmentIcon
                  sx={{ fontSize: 40, color: 'secondary.main', mr: 2 }}
                />
                <Box>
                  <Typography variant="h4">{stats.totalExercises}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Tổng bài tập
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* @ts-expect-error - MUI v7 Grid still works with item prop */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <QuizIcon sx={{ fontSize: 40, color: 'success.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4">{stats.totalQuizzes}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Tổng quiz
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* @ts-expect-error - MUI v7 Grid still works with item prop */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TrendingUpIcon
                  sx={{ fontSize: 40, color: 'warning.main', mr: 2 }}
                />
                <Box>
                  <Typography variant="h4">
                    {stats.averageScore.toFixed(1)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Điểm TB chung
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {stats.courseStats.map((courseStat) => (
          // @ts-expect-error - MUI v7 Grid still works with item prop
          <Grid item xs={12} key={courseStat.courseId}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <BarChartIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                  {courseStat.courseName}
                </Typography>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  {/* @ts-expect-error - MUI v7 Grid still works with item prop */}
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2" color="text.secondary">
                      Số sinh viên đăng ký
                    </Typography>
                    <Typography variant="h5">
                      {courseStat.enrolledStudents}
                    </Typography>
                  </Grid>
                  {/* @ts-expect-error - MUI v7 Grid still works with item prop */}
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2" color="text.secondary">
                      Điểm trung bình
                    </Typography>
                    <Typography variant="h5">
                      {courseStat.averageScore.toFixed(1)}%
                    </Typography>
                  </Grid>
                  {/* @ts-expect-error - MUI v7 Grid still works with item prop */}
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2" color="text.secondary">
                      Tỷ lệ hoàn thành
                    </Typography>
                    <Typography variant="h5">
                      {courseStat.completionRate.toFixed(1)}%
                    </Typography>
                  </Grid>
                </Grid>

                {courseStat.topPerformers.length > 0 && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Top 5 sinh viên xuất sắc
                    </Typography>
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>STT</TableCell>
                            <TableCell>Tên sinh viên</TableCell>
                            <TableCell align="right">Điểm trung bình</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {courseStat.topPerformers.map((performer, index) => (
                            <TableRow key={performer.studentId}>
                              <TableCell>{index + 1}</TableCell>
                              <TableCell>{performer.name}</TableCell>
                              <TableCell align="right">
                                <Chip
                                  label={`${performer.score.toFixed(1)}%`}
                                  color={
                                    performer.score >= 80
                                      ? 'success'
                                      : performer.score >= 60
                                        ? 'warning'
                                        : 'default'
                                  }
                                  size="small"
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
