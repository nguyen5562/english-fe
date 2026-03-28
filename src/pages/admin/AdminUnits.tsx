import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
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
  Grid,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Folder as FolderIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { unitService } from '../../services/unit.service';
import { courseService } from '../../services/course.service';
import { useConfirm } from '../../components/ConfirmDialog';
import { toast } from '../../utils/toast';

import type { Unit, Course } from '../../types';
import type { CreateUnitDto, UpdateUnitDto } from '../../types/dto';

export default function AdminUnits() {
  const { confirm, ConfirmDialog } = useConfirm();
  const [units, setUnits] = useState<Unit[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterCourseId, setFilterCourseId] = useState<string>('all');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);

  const [formData, setFormData] = useState<{
    courseId: string;
    title: string;
    description: string;
    order: number;
  }>({
    courseId: '',
    title: '',
    description: '',
    order: 0,
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [unData, coData] = await Promise.all([
        unitService.getAllUnits(),
        courseService.getAllCourse(),
      ]);
      // Sort globally by course then by order
      unData.sort((a, b) => (a.order || 0) - (b.order || 0));
      setUnits(unData);
      setCourses(coData);
    } catch (e: unknown) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddUnit = () => {
    setSelectedUnit(null);
    setFormData({
      courseId: filterCourseId !== 'all' ? filterCourseId : (courses[0]?._id ?? ''),
      title: '',
      description: '',
      order: 0,
    });
    setDialogOpen(true);
  };

  const handleEditUnit = (unit: Unit) => {
    setSelectedUnit(unit);
    setFormData({
      courseId: unit.courseId,
      title: unit.title,
      description: unit.description || '',
      order: unit.order || 0,
    });
    setDialogOpen(true);
  };

  const handleDeleteUnit = async (id: string) => {
    const ok = await confirm({
      title: 'Confirm delete unit',
      message: 'Are you sure you want to delete this unit? Exercises in this unit will become unassigned.',
      confirmText: 'Delete',
      confirmColor: 'error',
    });
    if (!ok) return;
    try {
      await unitService.deleteUnit(id);
      toast.success('Deleted unit successfully');
      fetchData();
    } catch (e: unknown) {
      toast.error('Failed to delete unit');
    }
  };

  const handleSaveUnit = async () => {
    if (!formData.courseId || !formData.title.trim()) {
      toast.error('Please select a course and enter a title');
      return;
    }
    try {
      setSaving(true);
      if (selectedUnit) {
        const dto: UpdateUnitDto = {
          courseId: formData.courseId,
          title: formData.title.trim(),
          description: formData.description.trim() || undefined,
          order: Number(formData.order) || 0,
        };
        await unitService.updateUnit(selectedUnit._id, dto);
        toast.success('Updated unit successfully');
      } else {
        const dto: CreateUnitDto = {
          courseId: formData.courseId,
          title: formData.title.trim(),
          description: formData.description.trim() || undefined,
          order: Number(formData.order) || 0,
        };
        await unitService.createUnit(dto);
        toast.success('Added unit successfully');
      }
      setDialogOpen(false);
      fetchData();
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        const msg = (e.response?.data as { message?: string })?.message ?? 'Action failed';
        toast.error(String(msg));
      } else {
        toast.error('Action failed');
      }
    } finally {
      setSaving(false);
    }
  };

  const filteredUnits = filterCourseId === 'all' 
    ? units 
    : units.filter(u => u.courseId === filterCourseId);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <FolderIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2.5 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 600, color: 'text.primary', mb: 0.5 }}>
              Unit Management
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
              Create and manage units to organize exercises
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl sx={{ minWidth: 200 }} size="small">
            <InputLabel>Filter by course</InputLabel>
            <Select
              value={filterCourseId}
              label="Filter by course"
              onChange={(e) => setFilterCourseId(e.target.value)}
            >
              <MenuItem value="all">All Courses</MenuItem>
              {courses.map((course) => (
                <MenuItem key={course._id} value={course._id}>{course.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddUnit}
            sx={{ borderRadius: 2.5, px: 3, textTransform: 'none', boxShadow: 3 }}
          >
            Add Unit
          </Button>
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
      ) : filteredUnits.length === 0 ? (
        <Card>
          <CardContent>
            <Typography color="text.secondary" align="center">No units found. Please add a new unit!</Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {filteredUnits.map((unit) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={unit._id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', transition: 'all 0.2s', border: '1px solid', borderColor: 'divider', '&:hover': { transform: 'translateY(-4px)', boxShadow: 4, borderColor: 'primary.main' }, borderRadius: 3 }}>
                <CardContent sx={{ flexGrow: 1, p: 3, display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
                    <FolderIcon sx={{ fontSize: 28, color: 'primary.main', mr: 1.5 }} />
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                        {unit.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, display: 'block' }}>
                        {courses.find((c) => c._id === unit.courseId)?.name ?? 'N/A'} (Order: {unit.order})
                      </Typography>
                    </Box>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {unit.description || 'No description.'}
                  </Typography>
                </CardContent>
                <Box sx={{ p: 1.5, px: 2, bgcolor: 'background.default', borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                  <IconButton size="small" color="primary" sx={{ bgcolor: 'white', '&:hover': { bgcolor: 'primary.light' } }} onClick={() => handleEditUnit(unit)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" color="error" sx={{ bgcolor: 'white', '&:hover': { bgcolor: 'error.light' } }} onClick={() => handleDeleteUnit(unit._id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{selectedUnit ? 'Edit Unit' : 'Add New Unit'}</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel>Course</InputLabel>
            <Select value={formData.courseId} label="Course" onChange={(e) => setFormData((f) => ({ ...f, courseId: e.target.value }))}>
              {courses.map((c) => (<MenuItem key={c._id} value={c._id}>{c.name}</MenuItem>))}
            </Select>
          </FormControl>
          <TextField fullWidth label="Unit Title" value={formData.title} onChange={(e) => setFormData((f) => ({ ...f, title: e.target.value }))} sx={{ mt: 2 }} required />
          <TextField fullWidth label="Description" value={formData.description} onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))} multiline rows={2} sx={{ mt: 2 }} />
          <TextField fullWidth label="Display Order" type="number" value={formData.order} onChange={(e) => setFormData((f) => ({ ...f, order: parseInt(e.target.value) }))} sx={{ mt: 2 }} helperText="Lower numbers appear first" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveUnit} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
        </DialogActions>
      </Dialog>
      {ConfirmDialog}
    </Box>
  );
}
