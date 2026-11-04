'use client';

import React, { useState } from 'react';
import { Wish } from '@/types';
import { formatPrice } from '@/lib/utils';
import {
  Paper,
  Box,
  Typography,
  Button,
  IconButton,
  Avatar,
  Tooltip,
} from '@mui/material';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

interface WishRowProps {
  wish: Wish & { is_reserved?: boolean; reserved_by_me?: boolean };
  isOwner: boolean;
  onToggleReserve: (wishId: string) => void;
  onDeleteWish: (wishId: string) => void;
  onEditWish?: (wish: Wish) => void;
}

export const WishRow: React.FC<WishRowProps> = React.memo(function WishRow({
  wish,
  isOwner,
  onToggleReserve,
  onDeleteWish,
  onEditWish,
}) {
  const [imgError, setImgError] = useState(false);

  const handleReserve = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!wish.is_reserved) {
      try {
        const confetti = (await import('canvas-confetti')).default;
        confetti({
          particleCount: 30,
          spread: 55,
          origin: { y: 0.7 },
          colors: ['#6366f1', '#ec4899', '#10b981'],
        });
      } catch {
        /* noop */
      }
    }
    onToggleReserve(wish.id);
  };

  const getDomain = (url?: string) => {
    if (!url) return '';
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return '';
    }
  };

  const domain = getDomain(wish.link_url);

  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.5,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        border: (theme) =>
          theme.palette.mode === 'dark'
            ? '1px solid rgba(255, 255, 255, 0.08)'
            : '1px solid rgba(0, 0, 0, 0.06)',
        borderRadius: 3,
        backgroundColor: 'background.paper',
        transition: 'all 0.18s ease',
        '&:hover': {
          boxShadow: (theme) =>
            theme.palette.mode === 'dark'
              ? '0 4px 16px rgba(0,0,0,0.4)'
              : '0 4px 16px rgba(15,23,42,0.06)',
        },
      }}
    >
      {/* Avatar / Thumbnail */}
      <Avatar
        src={!imgError && wish.image_url ? wish.image_url : undefined}
        variant="rounded"
        onError={() => setImgError(true)}
        sx={{
          width: 56,
          height: 56,
          borderRadius: 2.5,
          backgroundColor: (theme) =>
            theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
          color: 'text.secondary',
        }}
      >
        <CardGiftcardIcon sx={{ fontSize: 26 }} />
      </Avatar>

      {/* Wish Info */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
          <Typography
            variant="subtitle2"
            component="h3"
            sx={{
              fontWeight: 700,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {wish.title}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          {wish.price && wish.price > 0 && (
            <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>
              {formatPrice(wish.price, wish.currency)}
            </Typography>
          )}

          {domain && (
            <Box
              component="a"
              href={wish.link_url}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                fontSize: '0.75rem',
                color: 'text.secondary',
                textDecoration: 'none',
                '&:hover': { color: 'primary.main', textDecoration: 'underline' },
              }}
            >
              {domain}
              <OpenInNewIcon sx={{ fontSize: 12 }} />
            </Box>
          )}
        </Box>
      </Box>

      {/* Actions */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {isOwner ? (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {onEditWish && (
              <Tooltip title="Редактировать">
                <IconButton size="small" onClick={() => onEditWish(wish)} sx={{ color: 'text.secondary' }}>
                  <EditOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Удалить">
              <IconButton size="small" onClick={() => onDeleteWish(wish.id)} sx={{ color: 'error.main' }}>
                <DeleteOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        ) : (
          <Box>
            {wish.is_reserved ? (
              wish.reserved_by_me ? (
                <Button
                  variant="outlined"
                  color="success"
                  size="small"
                  startIcon={<CheckCircleOutlinedIcon />}
                  onClick={handleReserve}
                  sx={{ whiteSpace: 'nowrap' }}
                >
                  Я подарю
                </Button>
              ) : (
                <Button
                  variant="contained"
                  disabled
                  size="small"
                  startIcon={<LockOutlinedIcon />}
                  sx={{ whiteSpace: 'nowrap', opacity: 0.7 }}
                >
                  Забронировано
                </Button>
              )
            ) : (
              <Button
                variant="contained"
                color="primary"
                size="small"
                startIcon={<CardGiftcardIcon />}
                onClick={handleReserve}
                sx={{ whiteSpace: 'nowrap', fontWeight: 700 }}
              >
                Подарю я!
              </Button>
            )}
          </Box>
        )}
      </Box>
    </Paper>
  );
});

WishRow.displayName = 'WishRow';
