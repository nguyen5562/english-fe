import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { Box, Typography } from '@mui/material';

interface RichEditorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: boolean;
}

const modules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ color: [] }, { background: [] }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['clean'],
  ],
};

const formats = [
  'header',
  'bold', 'italic', 'underline', 'strike',
  'color', 'background',
  'list',
];

export function RichEditor({ label, value, onChange, placeholder, error }: RichEditorProps) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography
        variant="caption"
        color={error ? 'error' : 'textSecondary'}
        sx={{ mb: 1, display: 'block' }}
      >
        {label}
      </Typography>
      <Box
        sx={{
          '.ql-container': {
            borderBottomLeftRadius: 4,
            borderBottomRightRadius: 4,
            fontSize: '1rem',
            fontFamily: 'inherit',
            borderColor: error ? 'red' : 'rgba(0, 0, 0, 0.23)',
          },
          '.ql-toolbar': {
            borderTopLeftRadius: 4,
            borderTopRightRadius: 4,
            borderColor: error ? 'red' : 'rgba(0, 0, 0, 0.23)',
            backgroundColor: '#fafafa',
          },
          '.ql-editor': {
            minHeight: '100px',
          },
        }}
      >
        <ReactQuill
          theme="snow"
          value={value}
          onChange={onChange}
          modules={modules}
          formats={formats}
          placeholder={placeholder}
        />
      </Box>
    </Box>
  );
}
