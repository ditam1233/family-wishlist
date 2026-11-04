'use client';

import React, { useState } from 'react';
import { Wish } from '@/types';
import { formatPrice } from '@/lib/utils';
import {
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Typography,
  Box,
  Chip,
  Button,
  IconButton,
  Tooltip,
  Skeleton,
} from '@mui/material';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

interface WishCardProps {
  wish: Wish & { is_reserved?: boolean; reserved_by_me?: boolean };
  isOwner: boolean;
  onToggleReserve: (wishId: string) => void;
  onDeleteWish: (wishId: string) => void;
  onEditWish?: (wish: Wish) => void;
}

export const WishCard: React.FC<WishCardProps> = React.memo(function WishCard({
  wish,
  isOwner,
  onToggleReserve,
  onDeleteWish,
  onEditWish,
}) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleReserve = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!wish.is_reserved) {
      try {
        const confetti = (await import('canvas-confetti')).default;
        confetti({
          particleCount: 35,
          spread: 60,
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
    <Card
      className="glass-card"
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '22px',
        transition: 'all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)',
      }}
    >
      <Box>
        {/* Card Media / Image Header */}
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            paddingTop: '62%', // 16:10 aspect ratio
            backgroundColor: (theme) =>
              theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
            overflow: 'hidden',
          }}
        >
          {wish.image_url && !imageError ? (
            <>
              {!imageLoaded && (
                <Skeleton
                  variant="rectangular"
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                  }}
                  animation="wave"
                />
              )}
              <CardMedia
                component="img"
                image={wish.image_url}
                alt={wish.title}
                loading="lazy"
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transition: 'transform 0.3s ease',
                  '&:hover': {
                    transform: 'scale(1.04)',
                  },
                }}
              />
            </>
          ) : (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CardGiftcardIcon
                sx={{
                  fontSize: 48,
                  color: (theme) =>
                    theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
                }}
              />
            </Box>
          )}

          {/* Badges Over Image */}
          <Box
            sx={{
              position: 'absolute',
              top: 10,
              left: 10,
              right: 10,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              pointerEvents: 'none',
            }}
          >
            <Box />

            {wish.price && wish.price > 0 && (
              <Chip
                label={formatPrice(wish.price, wish.currency)}
                size="small"
                sx={{
                  backgroundColor: 'rgba(15, 23, 42, 0.85)',
                  color: '#ffffff',
                  backdropFilter: 'blur(8px)',
                  fontWeight: 700,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  pointerEvents: 'auto',
                }}
              />
            )}
          </Box>
        </Box>

        {/* Content */}
        <CardContent sx={{ p: 2, pb: 1 }}>
          <Typography
            variant="subtitle1"
            component="h3"
            sx={{
              fontWeight: 700,
              lineHeight: 1.3,
              mb: 0.5,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {wish.title}
          </Typography>

          {wish.description && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                lineHeight: 1.4,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                mb: 1,
              }}
            >
              {wish.description}
            </Typography>
          )}

          {/* Event Tag or Store Domain */}
          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mt: 1 }}>
            {domain && (
              <Chip
                component="a"
                href={wish.link_url}
                target="_blank"
                rel="noopener noreferrer"
                clickable
                icon={<OpenInNewIcon sx={{ fontSize: '13px !important' }} />}
                label={domain}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.72rem', height: 22 }}
              />
            )}
          </Box>
        </CardContent>
      </Box>

      {/* Action Bottom Bar */}
      <CardActions
        sx={{
          p: 2,
          pt: 0,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        {isOwner ? (
          <Box sx={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              Ваше желание
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {onEditWish && (
                <Tooltip title="Редактировать">
                  <IconButton
                    size="small"
                    onClick={() => onEditWish(wish)}
                    sx={{ color: 'text.secondary' }}
                  >
                    <EditOutlinedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip title="Удалить">
                <IconButton
                  size="small"
                  onClick={() => onDeleteWish(wish.id)}
                  sx={{ color: 'error.main' }}
                >
                  <DeleteOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        ) : (
          <Box sx={{ width: '100%' }}>
            {wish.is_reserved ? (
              wish.reserved_by_me ? (
                <Button
                  fullWidth
                  variant="outlined"
                  color="success"
                  startIcon={<CheckCircleOutlinedIcon />}
                  onClick={handleReserve}
                  sx={{
                    fontWeight: 700,
                    minHeight: 44,
                    borderRadius: 2.5,
                    borderWidth: 1.5,
                    fontSize: '0.86rem',
                  }}
                >
                  Вы дарите (Отменить)
                </Button>
              ) : (
                <Button
                  fullWidth
                  variant="contained"
                  disabled
                  startIcon={<LockOutlinedIcon />}
                  sx={{
                    opacity: 0.7,
                    minHeight: 44,
                    borderRadius: 2.5,
                    fontSize: '0.86rem',
                  }}
                >
                  Уже забронировано
                </Button>
              )
            ) : (
              <Button
                fullWidth
                variant="contained"
                color="primary"
                startIcon={<CardGiftcardIcon />}
                onClick={handleReserve}
                sx={{
                  fontWeight: 700,
                  letterSpacing: '0.01em',
                  minHeight: 44,
                  borderRadius: 2.5,
                  fontSize: '0.88rem',
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
                  '&:hover': {
                    boxShadow: '0 6px 20px rgba(37, 99, 235, 0.45)',
                  },
                }}
              >
                Подарю я!
              </Button>
            )}
          </Box>
        )}
      </CardActions>
    </Card>
  );
});

WishCard.displayName = 'WishCard';
