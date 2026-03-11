import { useEffect, useRef } from 'react';
import { Box, Typography, TextField, Button } from '@mui/material';

type FilePickerProps = {
  value: string;
  onChange: (url: string) => void;
  label: string;
  disabled?: boolean;
  helperText?: string;
  required?: boolean;
};

export function FilePicker({
  value,
  onChange,
  label,
  disabled,
  helperText,
  required,
}: FilePickerProps) {
  const popupRef = useRef<Window | null>(null);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      // Only process message if it comes from the window we opened
      if (
        e.source === popupRef.current &&
        e.data?.type === 'FM_PICK' &&
        typeof e.data.url === 'string'
      ) {
        onChange(e.data.url);
        // Optionally close the popup after picking
        if (popupRef.current) {
          popupRef.current.close();
          popupRef.current = null;
        }
      }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [onChange]);

  const openPopup = () => {
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.focus();
      return;
    }
    popupRef.current = window.open(
      '/file-manager-popup',
      'FileManager',
      'width=1200,height=800',
    );
  };

  return (
    <Box>
      <Typography
        variant="body2"
        sx={{
          mb: 1,
          fontWeight: 500,
          color: 'text.primary',
        }}
      >
        {label}
        {required && <span style={{ color: 'red' }}> *</span>}
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
        <TextField
          fullWidth
          placeholder="Enter URL or select file"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          helperText={helperText}
          disabled={disabled}
          size="small"
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
            },
          }}
        />
        <Button
          variant="outlined"
          onClick={openPopup}
          disabled={disabled}
          sx={{
            height: '40px',
            minWidth: '100px',
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 500,
            borderColor: 'primary.main',
            color: 'primary.main',
            whiteSpace: 'nowrap',
            '&:hover': {
              borderColor: 'primary.dark',
              backgroundColor: 'primary.light',
              color: 'primary.dark',
            },
          }}
        >
          Select file
        </Button>
      </Box>
    </Box>
  );
}
