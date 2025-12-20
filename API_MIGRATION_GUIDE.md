# Hướng dẫn chuyển đổi từ localStorage sang API

## So sánh Pattern

### ❌ KHÔNG DÙNG ĐƯỢC với API:

```typescript
// ❌ SAI - useMemo không thể dùng với async
const courses = useMemo(() => getCourses(), []); // localStorage - OK
const courses = useMemo(() => fetchCourses(), []); // API - SAI! fetchCourses() trả về Promise
```

```typescript
// ❌ SAI - useState initializer không thể dùng với async
const [courses] = useState(() => getCourses()); // localStorage - OK
const [courses] = useState(() => fetchCourses()); // API - SAI! fetchCourses() trả về Promise
```

### ✅ ĐÚNG - Pattern cho API:

#### Pattern 1: useState + useEffect (Cơ bản)

```typescript
// ✅ ĐÚNG - Pattern cơ bản cho API
export default function Dashboard() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch data từ API
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/courses');
        const data = await response.json();
        setCourses(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []); // Chỉ chạy 1 lần khi mount

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    // Render courses...
  );
}
```

**Khi nào dùng:**
- Fetch data một lần khi component mount
- Không cần cache hoặc refetch tự động
- Đơn giản, dễ hiểu

#### Pattern 2: Custom Hook (Tái sử dụng)

```typescript
// hooks/useCourses.ts
export function useCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/courses');
        const data = await response.json();
        setCourses(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { courses, loading, error };
}

// Dashboard.tsx
export default function Dashboard() {
  const { courses, loading, error } = useCourses();

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    // Render courses...
  );
}
```

**Khi nào dùng:**
- Cần tái sử dụng logic fetch ở nhiều component
- Muốn tách biệt logic và UI

#### Pattern 3: React Query / TanStack Query (Khuyến nghị)

```typescript
// ✅ TỐT NHẤT - React Query
import { useQuery } from '@tanstack/react-query';

export default function Dashboard() {
  const { data: courses, isLoading, error } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const response = await fetch('/api/courses');
      if (!response.ok) throw new Error('Failed to fetch');
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // Cache 5 phút
  });

  if (isLoading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error.message}</Alert>;

  return (
    // Render courses...
  );
}
```

**Ưu điểm:**
- ✅ Tự động cache
- ✅ Tự động refetch khi cần
- ✅ Loading và error states tự động
- ✅ Optimistic updates
- ✅ Background refetching

**Khi nào dùng:**
- Dự án lớn, cần cache và sync data
- Cần real-time updates
- Muốn code ngắn gọn, ít boilerplate

#### Pattern 4: SWR (Alternative)

```typescript
// ✅ TỐT - SWR
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function Dashboard() {
  const { data: courses, error, isLoading } = useSWR('/api/courses', fetcher);

  if (isLoading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error.message}</Alert>;

  return (
    // Render courses...
  );
}
```

## Mapping từ localStorage sang API

### Dashboard.tsx

**Trước (localStorage):**
```typescript
const courses = useMemo(() => getCourses(), []);
const progress = useMemo(() => {
  if (user?.role === 'student' && user.id) {
    return getAllStudentProgress(user.id);
  }
  return [];
}, [user]);
```

**Sau (API với React Query):**
```typescript
const { data: courses } = useQuery({
  queryKey: ['courses'],
  queryFn: () => api.getCourses(),
});

const { data: progress } = useQuery({
  queryKey: ['progress', user?.id],
  queryFn: () => api.getStudentProgress(user!.id),
  enabled: !!user?.id && user.role === 'student',
});
```

### Exercises.tsx

**Trước (localStorage):**
```typescript
const [exercises] = useState<Exercise[]>(() => getExercises());
const [courses] = useState(() => 
  getCourses().map(c => ({ id: c.id, name: c.name }))
);
```

**Sau (API):**
```typescript
const { data: exercises } = useQuery({
  queryKey: ['exercises'],
  queryFn: () => api.getExercises(),
});

const { data: courses } = useQuery({
  queryKey: ['courses'],
  queryFn: () => api.getCourses(),
  select: (data) => data.map(c => ({ id: c.id, name: c.name })),
});
```

### Materials.tsx

**Trước (localStorage):**
```typescript
const [courses] = useState<Course[]>(() => getCourses());
useEffect(() => {
  if (courseId) {
    const course = getCourse(courseId);
    if (course) {
      setSelectedCourse(course);
    }
  }
}, [courseId]);
```

**Sau (API):**
```typescript
const { data: courses } = useQuery({
  queryKey: ['courses'],
  queryFn: () => api.getCourses(),
});

const { data: selectedCourse } = useQuery({
  queryKey: ['course', courseId],
  queryFn: () => api.getCourse(courseId!),
  enabled: !!courseId,
});
```

## Checklist khi chuyển sang API

- [ ] Thay `useMemo` → `useQuery` (React Query) hoặc `useSWR`
- [ ] Thay `useState` với initializer → `useQuery` với `enabled`
- [ ] Thêm loading states (`isLoading`, `isFetching`)
- [ ] Thêm error handling (`error`, `isError`)
- [ ] Thêm loading UI (Spinner, Skeleton)
- [ ] Thêm error UI (Alert, Error message)
- [ ] Xử lý empty states
- [ ] Thêm retry logic (nếu cần)
- [ ] Thêm cache configuration
- [ ] Thêm refetch on focus/window focus (nếu cần)

## Ví dụ Service Layer

```typescript
// services/api.ts
export const api = {
  getCourses: async (): Promise<Course[]> => {
    const response = await fetch('/api/courses');
    if (!response.ok) throw new Error('Failed to fetch courses');
    return response.json();
  },

  getCourse: async (id: string): Promise<Course> => {
    const response = await fetch(`/api/courses/${id}`);
    if (!response.ok) throw new Error('Failed to fetch course');
    return response.json();
  },

  getExercises: async (): Promise<Exercise[]> => {
    const response = await fetch('/api/exercises');
    if (!response.ok) throw new Error('Failed to fetch exercises');
    return response.json();
  },

  // ... các API khác
};
```

## Kết luận

**Hiện tại (localStorage):**
- ✅ `useMemo` - OK vì đồng bộ
- ✅ `useState` với initializer - OK vì đồng bộ
- ✅ `useEffect` - Chỉ khi sync với URL params

**Khi chuyển sang API:**
- ❌ `useMemo` - KHÔNG dùng được (async)
- ❌ `useState` với initializer - KHÔNG dùng được (async)
- ✅ `useEffect` + `useState` - Dùng được (pattern cơ bản)
- ✅ **React Query / SWR** - KHUYẾN NGHỊ (tốt nhất)

