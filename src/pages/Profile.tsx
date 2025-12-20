import { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Grid,
  Avatar,
  Divider,
} from '@mui/material';
import { AccountCircle as AccountCircleIcon, Edit as EditIcon } from '@mui/icons-material';
import { getUser, setUser } from '../services/storage';
import type { User } from '../types';

export default function Profile() {
  const currentUser = getUser();
  const [user, setUserState] = useState<User | null>(currentUser);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(() => {
    const u = getUser();
    return {
      name: u?.name || '',
      email: u?.email || '',
      studentId: u?.studentId || '',
    };
  });

  const handleSave = () => {
    if (user) {
      const updatedUser: User = {
        ...user,
        name: formData.name,
        email: formData.email,
        ...(user.role === 'student' && { studentId: formData.studentId }),
      };
      setUser(updatedUser);
      setUserState(updatedUser);
      setIsEditing(false);
    }
  };

  if (!user) {
    return (
      <Box>
        <Typography>Đang tải...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Thông tin tài khoản
      </Typography>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        {/* @ts-expect-error - MUI v7 Grid still works with item prop */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Avatar sx={{ width: 100, height: 100, mb: 2, bgcolor: 'primary.main' }}>
                  <AccountCircleIcon sx={{ fontSize: 80 }} />
                </Avatar>
                <Typography variant="h6">{user.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {user.role === 'teacher' ? 'Giảng viên' : 'Sinh viên'}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* @ts-expect-error - MUI v7 Grid still works with item prop */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Thông tin cá nhân</Typography>
                <Button
                  startIcon={<EditIcon />}
                  variant="outlined"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  {isEditing ? 'Hủy' : 'Chỉnh sửa'}
                </Button>
              </Box>
              <Divider sx={{ mb: 3 }} />

              <Grid container spacing={2}>
                {/* @ts-expect-error - MUI v7 Grid still works with item prop */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Họ và tên"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    disabled={!isEditing}
                  />
                </Grid>
                {/* @ts-expect-error - MUI v7 Grid still works with item prop */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={!isEditing}
                  />
                </Grid>
                {user.role === 'student' && (
                  // @ts-expect-error - MUI v7 Grid still works with item prop
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Mã sinh viên"
                      value={formData.studentId}
                      onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                      disabled={!isEditing}
                    />
                  </Grid>
                )}
                {/* @ts-expect-error - MUI v7 Grid still works with item prop */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Vai trò"
                    value={user.role === 'teacher' ? 'Giảng viên' : 'Sinh viên'}
                    disabled
                  />
                </Grid>
                {isEditing && (
                  // @ts-expect-error - MUI v7 Grid still works with item prop
                  <Grid item xs={12}>
                    <Button variant="contained" onClick={handleSave}>
                      Lưu thay đổi
                    </Button>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

