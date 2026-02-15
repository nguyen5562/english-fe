import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  Grid,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Avatar,
  InputAdornment,
  Chip,
  Tooltip,
} from '@mui/material';
import {
  People as PeopleIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  School as SchoolIcon,
  Person as PersonIcon,
  FilterList as FilterListIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { userService } from '../../services/user.service';
import { useConfirm } from '../../components/ConfirmDialog';
import { toast } from '../../utils/toast';
import { useAuthStore } from '../../store/auth.store';
import type { User } from '../../types';
import type { CreateUserDto, UpdateUserDto } from '../../types/dto';

const ROLE_OPTIONS = [
  { value: 'student', label: 'Sinh viên' },
  { value: 'teacher', label: 'Giáo viên' },
];

export default function AdminStudents() {
  const { user: currentUser, updateUser: updateAuthUser } = useAuthStore();
  const { confirm, ConfirmDialog } = useConfirm();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [searchTerm, setSearchTerm] = useState('');

  const [addForm, setAddForm] = useState<CreateUserDto>({
    username: '',
    email: '',
    password: '',
    role: 'student',
  });
  const [editForm, setEditForm] = useState<{
    username: string;
    email: string;
    role: string;
  }>({
    username: '',
    email: '',
    role: 'student',
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await userService.getAllUser();
      setUsers(data);
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        const msg =
          (e.response?.data as { message?: string })?.message ??
          e.response?.statusText ??
          'Không thể tải danh sách người dùng';
        toast.error(String(msg));
      } else {
        toast.error('Không thể tải danh sách người dùng');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenAdd = () => {
    setAddForm({
      username: '',
      email: '',
      password: '',
      role: 'student',
    });
    setOpenAdd(true);
  };

  const handleSaveAdd = async () => {
    if (
      !addForm.username.trim() ||
      !addForm.email.trim() ||
      !addForm.password.trim()
    ) {
      toast.error('Vui lòng nhập đủ username, email và mật khẩu');
      return;
    }
    try {
      setSaving(true);
      await userService.createUser(addForm);
      toast.success('Đã thêm tài khoản');
      setOpenAdd(false);
      fetchUsers();
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        const msg =
          (e.response?.data as { message?: string })?.message ??
          e.response?.statusText ??
          'Không thể thêm tài khoản';
        toast.error(String(msg));
      } else {
        toast.error('Không thể thêm tài khoản');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEdit = (u: User) => {
    setEditingUser(u);
    setEditForm({
      username: u.username ?? '',
      email: u.email ?? '',
      role: u.role ?? 'student',
    });
    setOpenEdit(true);
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    if (!editForm.username.trim() || !editForm.email.trim()) {
      toast.error('Vui lòng nhập username và email');
      return;
    }
    try {
      setSaving(true);
      const dto: UpdateUserDto = {
        username: editForm.username.trim(),
        email: editForm.email.trim(),
        role: editForm.role,
      };
      const updated = await userService.updateUser(editingUser._id, dto);

      // Update store if modifying current user
      if (currentUser && currentUser._id === updated._id) {
        updateAuthUser(updated);
      }

      toast.success('Đã cập nhật tài khoản');
      setOpenEdit(false);
      setEditingUser(null);
      fetchUsers();
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        const msg =
          (e.response?.data as { message?: string })?.message ??
          e.response?.statusText ??
          'Không thể cập nhật tài khoản';
        toast.error(String(msg));
      } else {
        toast.error('Không thể cập nhật tài khoản');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (u: User) => {
    const ok = await confirm({
      title: 'Xác nhận xóa tài khoản',
      message: `Bạn có chắc muốn xóa tài khoản "${u.username}" (${u.email})?`,
      confirmText: 'Xóa',
      confirmColor: 'error',
    });
    if (!ok) return;
    try {
      setSaving(true);
      await userService.deleteUser(u._id);
      toast.success('Đã xóa tài khoản');
      fetchUsers();
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        const msg =
          (e.response?.data as { message?: string })?.message ??
          e.response?.statusText ??
          'Không thể xóa tài khoản';
        toast.error(String(msg));
      } else {
        toast.error('Không thể xóa tài khoản');
      }
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      (u.username?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (u.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (u.role?.toLowerCase() || '').includes(searchTerm.toLowerCase()),
  );

  const stats = {
    total: users.length,
    students: users.filter((u) => u.role === 'student').length,
    teachers: users.filter((u) => u.role === 'teacher').length,
  };

  const roleLabel = (role: string) =>
    ROLE_OPTIONS.find((r) => r.value === role)?.label ?? role;

  return (
    <Box sx={{ pb: 4 }}>
      {/* Header Section */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          mb: 4,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box
            sx={{
              mr: 2,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <PeopleIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          </Box>
          <Box>
            <Typography
              variant="h4"
              sx={{ fontWeight: 600, color: 'text.primary', mb: 0.5 }}
            >
              Người dùng
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontWeight: 500 }}
            >
              Quản lý danh sách sinh viên & giáo viên trong hệ thống
            </Typography>
          </Box>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenAdd}
          sx={{
            borderRadius: 2.5,
            px: 3,
            py: 1.2,
            textTransform: 'none',
            fontWeight: 700,
            boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
            '&:hover': { boxShadow: '0 6px 16px rgba(25, 118, 210, 0.4)' },
          }}
        >
          Thêm người dùng mới
        </Button>
      </Box>

      {/* Stats Section */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {[
          {
            label: 'Tổng số tài khoản',
            value: stats.total,
            icon: <PeopleIcon />,
            color: 'primary.main',
          },
          {
            label: 'Sinh viên',
            value: stats.students,
            icon: <SchoolIcon />,
            color: 'info.main',
          },
          {
            label: 'Giáo viên',
            value: stats.teachers,
            icon: <PersonIcon />,
            color: 'secondary.main',
          },
        ].map((item) => (
          <Grid size={{ xs: 12, sm: 4 }} key={item.label}>
            <Card
              sx={{
                borderRadius: 4,
                border: '1px solid',
                borderColor: 'divider',
                boxShadow: 'none',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.05)',
                  borderColor: item.color,
                },
              }}
            >
              <CardContent sx={{ p: 3, display: 'flex', alignItems: 'center' }}>
                <Box
                  sx={{
                    mr: 2,
                    display: 'flex',
                    alignItems: 'center',
                    color: item.color,
                  }}
                >
                  {item.icon}
                </Box>
                <Box>
                  <Typography
                    variant="h4"
                    sx={{ fontWeight: 800, lineHeight: 1 }}
                  >
                    {item.value}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                    }}
                  >
                    {item.label}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Card
          sx={{
            borderRadius: 4,
            overflow: 'hidden',
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
          }}
        >
          <Box
            sx={{
              p: 3,
              borderBottom: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              gap: 2,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <TextField
              placeholder="Tìm kiếm theo tên, email hoặc vai trò..."
              size="small"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{
                flexGrow: 1,
                maxWidth: 400,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2.5,
                  bgcolor: 'action.hover',
                  '& fieldset': { borderColor: 'transparent' },
                  '&:hover fieldset': { borderColor: 'transparent' },
                  '&.Mui-focused fieldset': {
                    borderColor: 'primary.main',
                    borderWidth: 1,
                  },
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />
            <Button
              startIcon={<FilterListIcon />}
              sx={{
                borderRadius: 2,
                color: 'text.secondary',
                fontWeight: 600,
                textTransform: 'none',
              }}
            >
              Bộ lọc
            </Button>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ ml: 'auto', fontWeight: 600 }}
            >
              Đang hiển thị {filteredUsers.length} kết quả
            </Typography>
          </Box>
          <TableContainer>
            <Table sx={{ minWidth: 800 }}>
              <TableHead sx={{ bgcolor: 'action.hover' }}>
                <TableRow>
                  <TableCell
                    sx={{ fontWeight: 700, color: 'text.secondary', pl: 3 }}
                  >
                    NGƯỜI DÙNG
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>
                    EMAIL
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>
                    VAI TRÒ
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ fontWeight: 700, color: 'text.secondary', pr: 3 }}
                  >
                    THAO TÁC
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 10 }}>
                      <Box sx={{ opacity: 0.5, textAlign: 'center' }}>
                        <PeopleIcon sx={{ fontSize: 48, mb: 1 }} />
                        <Typography variant="body1">
                          Không tìm thấy người dùng nào
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((u) => (
                    <TableRow
                      key={u._id}
                      sx={{
                        '&:hover': { bgcolor: 'rgba(25, 118, 210, 0.02)' },
                        transition: 'background-color 0.2s',
                      }}
                    >
                      <TableCell sx={{ pl: 3 }}>
                        <Box
                          sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
                        >
                          <Avatar
                            sx={{
                              width: 40,
                              height: 40,
                              bgcolor:
                                u.role === 'teacher'
                                  ? 'secondary.main'
                                  : 'primary.main',
                              fontWeight: 700,
                              fontSize: 16,
                            }}
                          >
                            {(u.username ?? 'U')[0].toUpperCase()}
                          </Avatar>
                          <Box>
                            <Typography
                              variant="subtitle2"
                              sx={{ fontWeight: 700 }}
                            >
                              {u.username}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              ID: {u._id.slice(-6).toUpperCase()}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>{u.email}</TableCell>
                      <TableCell>
                        <Chip
                          label={roleLabel(u.role)}
                          size="small"
                          color={u.role === 'teacher' ? 'secondary' : 'primary'}
                          variant="outlined"
                          sx={{
                            fontWeight: 700,
                            borderRadius: 1.5,
                            textTransform: 'uppercase',
                            fontSize: '0.65rem',
                            bgcolor:
                              u.role === 'teacher'
                                ? 'secondary.light'
                                : 'primary.light',
                            borderColor: 'transparent',
                          }}
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ pr: 3 }}>
                        <Tooltip title="Chỉnh sửa">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenEdit(u)}
                            sx={{
                              color: 'primary.main',
                              '&:hover': { bgcolor: 'primary.light' },
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Xóa tài khoản">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(u)}
                            disabled={saving}
                            sx={{
                              '&:hover': { bgcolor: 'error.light' },
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      <Dialog
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Thêm tài khoản</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Username"
            value={addForm.username}
            onChange={(e) =>
              setAddForm((f) => ({ ...f, username: e.target.value }))
            }
            sx={{ mt: 1 }}
          />
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={addForm.email}
            onChange={(e) =>
              setAddForm((f) => ({ ...f, email: e.target.value }))
            }
            sx={{ mt: 2 }}
          />
          <TextField
            fullWidth
            label="Mật khẩu"
            type="password"
            value={addForm.password}
            onChange={(e) =>
              setAddForm((f) => ({ ...f, password: e.target.value }))
            }
            sx={{ mt: 2 }}
          />
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Vai trò</InputLabel>
            <Select
              value={addForm.role}
              label="Vai trò"
              onChange={(e) =>
                setAddForm((f) => ({ ...f, role: e.target.value }))
              }
            >
              {ROLE_OPTIONS.map((r) => (
                <MenuItem key={r.value} value={r.value}>
                  {r.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAdd(false)}>Hủy</Button>
          <Button variant="contained" onClick={handleSaveAdd} disabled={saving}>
            {saving ? 'Đang lưu...' : 'Thêm'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openEdit}
        onClose={() => {
          setOpenEdit(false);
          setEditingUser(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Sửa tài khoản</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Username"
            value={editForm.username}
            onChange={(e) =>
              setEditForm((f) => ({ ...f, username: e.target.value }))
            }
            sx={{ mt: 1 }}
          />
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={editForm.email}
            onChange={(e) =>
              setEditForm((f) => ({ ...f, email: e.target.value }))
            }
            sx={{ mt: 2 }}
          />
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Vai trò</InputLabel>
            <Select
              value={editForm.role}
              label="Vai trò"
              onChange={(e) =>
                setEditForm((f) => ({ ...f, role: e.target.value }))
              }
            >
              {ROLE_OPTIONS.map((r) => (
                <MenuItem key={r.value} value={r.value}>
                  {r.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setOpenEdit(false);
              setEditingUser(null);
            }}
          >
            Hủy
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveEdit}
            disabled={saving}
          >
            {saving ? 'Đang lưu...' : 'Lưu'}
          </Button>
        </DialogActions>
      </Dialog>

      {ConfirmDialog}
    </Box>
  );
}
