'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Wish } from '@/types';
import { normalizeUrl, extractUrlAndTitle } from '@/lib/scraper';
import { compressImage } from '@/lib/imageCompressor';
import confetti from 'canvas-confetti';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  IconButton,
  Box,
  Typography,
  Tabs,
  Tab,
  CircularProgress,
  InputAdornment,
  Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LinkIcon from '@mui/icons-material/Link';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';

interface AddWishModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddWish: (wish: Omit<Wish, 'id' | 'created_at'>) => void;
  userId: string;
}

export const AddWishModal: React.FC<AddWishModalProps> = ({
  isOpen,
  onClose,
  onAddWish,
  userId,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [price, setPrice] = useState('');

  const [compressing, setCompressing] = useState(false);
  const [imageTab, setImageTab] = useState<'upload' | 'url'>('upload');
  const [errorMsg, setErrorMsg] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setTitle('');
      setDescription('');
      setLinkUrl('');
      setImageUrl('');
      setPrice('');
      setErrorMsg('');
      setCompressing(false);
    }
  }, [isOpen]);

  const handleUrlChange = (val: string) => {
    const { url: extractedUrl, extractedTitle } = extractUrlAndTitle(val);

    if (extractedUrl) {
      setLinkUrl(extractedUrl);
      if (!title.trim() && extractedTitle) {
        setTitle(extractedTitle);
      }
      return;
    }

    setLinkUrl(val);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCompressing(true);
    try {
      const compressedDataUrl = await compressImage(file, 960, 0.78);
      setImageUrl(compressedDataUrl);
    } catch (err) {
      console.error('Image compression error:', err);
    } finally {
      setCompressing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Пожалуйста, введите название подарка');
      return;
    }

    const cleanPrice = parseFloat(price.replace(/[^\d.]/g, ''));
    const finalCleanUrl = normalizeUrl(linkUrl);
    const validLink =
      finalCleanUrl.startsWith('http://') || finalCleanUrl.startsWith('https://')
        ? finalCleanUrl
        : undefined;

    onAddWish({
      user_id: userId,
      title: title.trim(),
      description: description.trim() || undefined,
      link_url: validLink,
      image_url: imageUrl.trim() || undefined,
      price: !isNaN(cleanPrice) && cleanPrice > 0 ? cleanPrice : undefined,
      currency: '₽',
      priority: 'nice_to_have',
      event_tag: 'Без повода',
    });

    try {
      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#6366f1', '#ec4899', '#10b981'],
      });
    } catch {
      /* noop */
    }

    onClose();
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        backdrop: {
          sx: { backdropFilter: 'blur(6px)' },
        },
      }}
    >
      <DialogTitle
        sx={{
          m: 0,
          p: 2.5,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontWeight: 700,
        }}
      >
        Новое желание
        <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent dividers sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {errorMsg && (
            <Alert severity="error" onClose={() => setErrorMsg('')}>
              {errorMsg}
            </Alert>
          )}

          {/* Link Input with URL extraction */}
          <TextField
            label="Ссылка на товар"
            placeholder="Вставьте ссылку на товар или текст из магазина"
            value={linkUrl}
            onChange={(e) => handleUrlChange(e.target.value)}
            onPaste={(e) => {
              const pastedText = e.clipboardData.getData('text');
              if (pastedText) {
                const { url: extractedUrl, extractedTitle } = extractUrlAndTitle(pastedText);
                if (extractedUrl) {
                  e.preventDefault();
                  setLinkUrl(extractedUrl);
                  if (!title.trim() && extractedTitle) {
                    setTitle(extractedTitle);
                  }
                }
              }
            }}
            fullWidth
            size="small"
            helperText="Поддерживаются любые ссылки (включая сообщения с названиями из Ozon, Wildberries и др.)"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <LinkIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              },
            }}
          />

          {/* Image Upload / URL Tabs */}
          <Box
            sx={{
              p: 2,
              borderRadius: 3,
              backgroundColor: (theme) =>
                theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
              border: (theme) =>
                theme.palette.mode === 'dark'
                  ? '1px dashed rgba(255,255,255,0.12)'
                  : '1px dashed rgba(0,0,0,0.12)',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary' }}>
                Фотография
              </Typography>
              <Tabs
                value={imageTab}
                onChange={(_, val) => setImageTab(val)}
                sx={{ minHeight: 28 }}
              >
                <Tab label="Галерея / Камера" value="upload" sx={{ minHeight: 28, py: 0, px: 1.5, fontSize: '0.75rem' }} />
                <Tab label="Ссылка на фото" value="url" sx={{ minHeight: 28, py: 0, px: 1.5, fontSize: '0.75rem' }} />
              </Tabs>
            </Box>

            {imageUrl ? (
              <Box sx={{ position: 'relative', width: '100%', height: 160, borderRadius: 2, overflow: 'hidden' }}>
                <Box
                  component="img"
                  src={imageUrl}
                  alt="Предпросмотр"
                  sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <IconButton
                  size="small"
                  onClick={() => setImageUrl('')}
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    color: '#ffffff',
                    '&:hover': { backgroundColor: 'rgba(0,0,0,0.8)' },
                  }}
                >
                  <DeleteOutlinedIcon fontSize="small" />
                </IconButton>
              </Box>
            ) : imageTab === 'upload' ? (
              <Box
                onClick={() => fileInputRef.current?.click()}
                sx={{
                  py: 3,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1,
                  cursor: 'pointer',
                  borderRadius: 2,
                  '&:hover': { backgroundColor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)') },
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
                {compressing ? (
                  <CircularProgress size={32} />
                ) : (
                  <>
                    <PhotoCameraIcon sx={{ fontSize: 36, color: 'text.secondary' }} />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Нажмите, чтобы выбрать фото
                    </Typography>
                  </>
                )}
              </Box>
            ) : (
              <TextField
                placeholder="https://example.com/photo.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                fullWidth
                size="small"
              />
            )}
          </Box>

          {/* Title */}
          <TextField
            label="Название подарка"
            placeholder="Например: Беспроводные наушники Sony"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
            required
            size="small"
          />

          {/* Price */}
          <TextField
            label="Примерная стоимость"
            placeholder="3500"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            fullWidth
            size="small"
            slotProps={{
              input: {
                endAdornment: <InputAdornment position="end">₽</InputAdornment>,
              },
            }}
          />

          {/* Description */}
          <TextField
            label="Заметки или пожелания"
            placeholder="Цвет черный, размер M, или артикул"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            rows={2}
            fullWidth
            size="small"
          />
        </DialogContent>

        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={onClose} color="inherit">
            Отмена
          </Button>
          <Button type="submit" variant="contained" color="primary" disabled={compressing}>
            Добавить подарок
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
