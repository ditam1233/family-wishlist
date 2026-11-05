'use client';

import React, { useState } from 'react';
import { Wish } from '@/types';
import { extractUrlAndTitle } from '@/lib/scraper';
import confetti from 'canvas-confetti';
import {
  Paper,
  InputBase,
  IconButton,
  Button,
  Box,
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import TuneIcon from '@mui/icons-material/Tune';

interface InlineAddWishProps {
  currentUserId: string;
  onAddWish: (wish: Omit<Wish, 'id' | 'created_at'>) => void;
  onOpenFullModal: () => void;
}

export const InlineAddWish: React.FC<InlineAddWishProps> = ({
  currentUserId,
  onAddWish,
  onOpenFullModal,
}) => {
  const [inputVal, setInputVal] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputVal.trim();
    if (!clean) return;

    const { url: detectedUrl, extractedTitle } = extractUrlAndTitle(clean);
    const hasUrl = Boolean(
      detectedUrl &&
        (detectedUrl.startsWith('http://') || detectedUrl.startsWith('https://'))
    );

    if (hasUrl) {
      onAddWish({
        user_id: currentUserId,
        title: extractedTitle || 'Подарок по ссылке',
        link_url: detectedUrl,
        currency: '₽',
        priority: 'nice_to_have',
      });
    } else {
      onAddWish({
        user_id: currentUserId,
        title: clean,
        currency: '₽',
        priority: 'nice_to_have',
      });
    }

    try {
      confetti({
        particleCount: 25,
        spread: 45,
        origin: { y: 0.7 },
        colors: ['#6366f1', '#ec4899', '#10b981'],
      });
    } catch {
      /* noop */
    }

    setInputVal('');
  };

  return (
    <Paper
      component="form"
      onSubmit={handleSubmit}
      elevation={0}
      sx={{
        p: '4px 8px',
        display: 'flex',
        alignItems: 'center',
        borderRadius: 3,
        border: (theme) =>
          theme.palette.mode === 'dark'
            ? '1px solid rgba(255, 255, 255, 0.1)'
            : '1px solid rgba(0, 0, 0, 0.08)',
        backgroundColor: 'background.paper',
        boxShadow: (theme) =>
          theme.palette.mode === 'dark'
            ? '0 2px 10px rgba(0,0,0,0.3)'
            : '0 2px 10px rgba(15,23,42,0.04)',
        transition: 'all 0.2s ease',
        '&:focus-within': {
          borderColor: 'primary.main',
          boxShadow: (theme) =>
            theme.palette.mode === 'dark'
              ? '0 0 0 2px rgba(99, 102, 241, 0.25)'
              : '0 0 0 2px rgba(79, 70, 229, 0.15)',
        },
      }}
    >
      <Box sx={{ p: 1, color: 'text.secondary', display: 'flex', alignItems: 'center' }}>
        <AddIcon fontSize="small" />
      </Box>

      <InputBase
        sx={{ ml: 1, flex: 1, fontSize: '0.9rem' }}
        placeholder="Вставьте ссылку на товар или напишите название..."
        value={inputVal}
        onChange={(e) => setInputVal(e.target.value)}
      />

      {inputVal.trim() && (
        <Button
          type="submit"
          variant="contained"
          size="small"
          sx={{ borderRadius: 2, mr: 0.5, fontSize: '0.8rem', py: 0.5 }}
        >
          Добавить
        </Button>
      )}

      <Tooltip title="Подробные параметры (фото, приоритет, цена)">
        <IconButton
          size="small"
          onClick={onOpenFullModal}
          sx={{
            color: 'text.secondary',
            '&:hover': { color: 'primary.main' },
          }}
        >
          <TuneIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Paper>
  );
};
