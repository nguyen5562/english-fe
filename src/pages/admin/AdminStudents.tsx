import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
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
} from "@mui/material";
import {
  People as PeopleIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import axios from "axios";
import { userService } from "../../services/user.service";
import { useConfirm } from "../../components/ConfirmDialog";
import { toast } from "../../utils/toast";
import type { User } from "../../types";
import type { CreateUserDto, UpdateUserDto } from "../../types/dto";

const ROLE_OPTIONS = [
  { value: "student", label: "Sinh viên" },
  { value: "teacher", label: "Giáo viên" },
];

export default function AdminStudents() {
  const { confirm, ConfirmDialog } = useConfirm();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [addForm, setAddForm] = useState<CreateUserDto>({
    username: "",
    email: "",
    password: "",
    role: "student",
  });
  const [editForm, setEditForm] = useState<{
    username: string;
    email: string;
    role: string;
  }>({
    username: "",
    email: "",
    role: "student",
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
          "Không thể tải danh sách người dùng";
        toast.error(String(msg));
      } else {
        toast.error("Không thể tải danh sách người dùng");
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
      username: "",
      email: "",
      password: "",
      role: "student",
    });
    setOpenAdd(true);
  };

  const handleSaveAdd = async () => {
    if (!addForm.username.trim() || !addForm.email.trim() || !addForm.password.trim()) {
      toast.error("Vui lòng nhập đủ username, email và mật khẩu");
      return;
    }
    try {
      setSaving(true);
      await userService.createUser(addForm);
      toast.success("Đã thêm tài khoản");
      setOpenAdd(false);
      fetchUsers();
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        const msg =
          (e.response?.data as { message?: string })?.message ??
          e.response?.statusText ??
          "Không thể thêm tài khoản";
        toast.error(String(msg));
      } else {
        toast.error("Không thể thêm tài khoản");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEdit = (u: User) => {
    setEditingUser(u);
    setEditForm({
      username: u.username ?? "",
      email: u.email ?? "",
      role: u.role ?? "student",
    });
    setOpenEdit(true);
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    if (!editForm.username.trim() || !editForm.email.trim()) {
      toast.error("Vui lòng nhập username và email");
      return;
    }
    try {
      setSaving(true);
      const dto: UpdateUserDto = {
        username: editForm.username.trim(),
        email: editForm.email.trim(),
        role: editForm.role,
      };
      await userService.updateUser(editingUser._id, dto);
      toast.success("Đã cập nhật tài khoản");
      setOpenEdit(false);
      setEditingUser(null);
      fetchUsers();
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        const msg =
          (e.response?.data as { message?: string })?.message ??
          e.response?.statusText ??
          "Không thể cập nhật tài khoản";
        toast.error(String(msg));
      } else {
        toast.error("Không thể cập nhật tài khoản");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (u: User) => {
    const ok = await confirm({
      title: "Xác nhận xóa tài khoản",
      message: `Bạn có chắc muốn xóa tài khoản "${u.username}" (${u.email})?`,
      confirmText: "Xóa",
      confirmColor: "error",
    });
    if (!ok) return;
    try {
      setSaving(true);
      await userService.deleteUser(u._id);
      toast.success("Đã xóa tài khoản");
      fetchUsers();
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        const msg =
          (e.response?.data as { message?: string })?.message ??
          e.response?.statusText ??
          "Không thể xóa tài khoản";
        toast.error(String(msg));
      } else {
        toast.error("Không thể xóa tài khoản");
      }
    } finally {
      setSaving(false);
    }
  };

  const roleLabel = (role: string) =>
    ROLE_OPTIONS.find((r) => r.value === role)?.label ?? role;

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <PeopleIcon sx={{ fontSize: 40, color: "primary.main", mr: 2 }} />
          <Box>
            <Typography variant="h4">Quản lý người dùng</Typography>
            <Typography variant="body2" color="text.secondary">
              Thêm, sửa, xóa tài khoản người dùng
            </Typography>
          </Box>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAdd}>
          Thêm tài khoản
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Card>
          <CardContent>
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>STT</TableCell>
                    <TableCell>Username</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Vai trò</TableCell>
                    <TableCell align="right">Thao tác</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                        Chưa có người dùng nào
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((u, index) => (
                      <TableRow key={u._id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{u.username}</TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>{roleLabel(u.role)}</TableCell>
                        <TableCell align="right">
                          <IconButton size="small" onClick={() => handleOpenEdit(u)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(u)}
                            disabled={saving}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      <Dialog open={openAdd} onClose={() => setOpenAdd(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Thêm tài khoản</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Username"
            value={addForm.username}
            onChange={(e) => setAddForm((f) => ({ ...f, username: e.target.value }))}
            sx={{ mt: 1 }}
          />
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={addForm.email}
            onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
            sx={{ mt: 2 }}
          />
          <TextField
            fullWidth
            label="Mật khẩu"
            type="password"
            value={addForm.password}
            onChange={(e) => setAddForm((f) => ({ ...f, password: e.target.value }))}
            sx={{ mt: 2 }}
          />
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Vai trò</InputLabel>
            <Select
              value={addForm.role}
              label="Vai trò"
              onChange={(e) => setAddForm((f) => ({ ...f, role: e.target.value }))}
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
            {saving ? "Đang lưu..." : "Thêm"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openEdit} onClose={() => { setOpenEdit(false); setEditingUser(null); }} maxWidth="sm" fullWidth>
        <DialogTitle>Sửa tài khoản</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Username"
            value={editForm.username}
            onChange={(e) => setEditForm((f) => ({ ...f, username: e.target.value }))}
            sx={{ mt: 1 }}
          />
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={editForm.email}
            onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
            sx={{ mt: 2 }}
          />
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Vai trò</InputLabel>
            <Select
              value={editForm.role}
              label="Vai trò"
              onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
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
          <Button onClick={() => { setOpenEdit(false); setEditingUser(null); }}>Hủy</Button>
          <Button variant="contained" onClick={handleSaveEdit} disabled={saving}>
            {saving ? "Đang lưu..." : "Lưu"}
          </Button>
        </DialogActions>
      </Dialog>

      {ConfirmDialog}
    </Box>
  );
}
