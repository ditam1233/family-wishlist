'use client';

import React, { useState, useEffect } from 'react';
import { dataStore } from '@/lib/data';
import { User } from '@/types';
import { useColorMode } from '@/components/ThemeRegistry/MuiThemeProvider';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  TextField,
  Button,
  IconButton,
  Alert,
  CircularProgress,
  InputAdornment,
  Divider,
} from '@mui/material';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import KeyIcon from '@mui/icons-material/Key';
import MailOutlinedIcon from '@mui/icons-material/MailOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

interface AuthScreenProps {
  onSuccess: (user: User) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccess }) => {
  const { mode, toggleColorMode } = useColorMode();
  const [tab, setTab] = useState<'code' | 'email'>('code');

  // Code auth
  const [inviteCode, setInviteCode] = useState('');
  const [relativeName, setRelativeName] = useState('');

  // Email auth
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-fill code from URL: ?code=STE-1234
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const codeFromUrl = params.get('code');
      if (codeFromUrl) {
        setInviteCode(codeFromUrl.toUpperCase());
        setTab('code');
      }
    }
  }, []);

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim() || !relativeName.trim()) {
      setError('Пожалуйста, введите код семьи и ваше имя');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await dataStore.joinByCode(inviteCode.trim(), relativeName.trim());
      if (res.success && res.user) {
        onSuccess(res.user);
      } else {
        setError('Семья с таким кодом не найдена. Проверьте код и попробуйте снова.');
      }
    } catch {
      setError('Не удалось подключиться к семье. Попробуйте еще раз.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Заполните все обязательные поля');
      return;
    }
    if (isRegister && !name.trim()) {
      setError('Введите ваше имя');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = isRegister
        ? await dataStore.register(name.trim(), email.trim(), password)
        : await dataStore.login(email.trim(), password);

      if (res.success && res.user) {
        onSuccess(res.user);
      } else {
        setError(res.error || (isRegister ? 'Не удалось зарегистрироваться.' : 'Неверная почта или пароль.'));
      }
    } catch {
      setError('Ошибка авторизации. Проверьте соединение.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        backgroundColor: 'background.default',
      }}
    >
      {/* Top Bar with Theme Toggle */}
      <Box
        sx={{
          position: 'fixed',
          top: 16,
          right: 16,
          zIndex: 10,
        }}
      >
        <IconButton onClick={toggleColorMode} color="inherit" size="small">
          {mode === 'dark' ? <LightModeOutlinedIcon /> : <DarkModeOutlinedIcon />}
        </IconButton>
      </Box>

      {/* Main Container */}
      <Box sx={{ width: '100%', maxWidth: 420 }}>
        {/* App Logo & Title */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 3,
              background: (theme) =>
                theme.palette.mode === 'dark'
                  ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)'
                  : 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
              color: '#ffffff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(99, 102, 241, 0.35)',
              mb: 1.5,
            }}
          >
            <CardGiftcardIcon sx={{ fontSize: 30 }} />
          </Box>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 800 }}>
            Семейный Вишлист
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Делитесь подарками и радуйте близких без спойлеров
          </Typography>
        </Box>

        <Card elevation={2}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={tab}
              onChange={(_, val) => {
                setTab(val);
                setError(null);
              }}
              variant="fullWidth"
            >
              <Tab icon={<KeyIcon fontSize="small" />} iconPosition="start" label="По коду семьи" value="code" />
              <Tab icon={<MailOutlinedIcon fontSize="small" />} iconPosition="start" label="Email" value="email" />
            </Tabs>
          </Box>

          <CardContent sx={{ p: 3 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            {tab === 'code' ? (
              <Box component="form" onSubmit={handleCodeSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Если вас пригласили в семью, введите код приглашения и ваше имя для мгновенного входа:
                </Typography>

                <TextField
                  label="Код семьи"
                  placeholder="ФЭМ-3031"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  fullWidth
                  required
                  size="small"
                  
                  slotProps={{ input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <KeyIcon fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                  }}}
                />

                <TextField
                  label="Ваше имя"
                  placeholder="Например: Степан, Мама, Аня"
                  value={relativeName}
                  onChange={(e) => setRelativeName(e.target.value)}
                  fullWidth
                  required
                  size="small"
                  slotProps={{ input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonOutlinedIcon fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                  }}}
                />

                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={loading}
                  endIcon={loading ? <CircularProgress size={20} color="inherit" /> : <ArrowForwardIcon />}
                  sx={{ mt: 1 }}
                >
                  Войти в семью
                </Button>
              </Box>
            ) : (
              <Box component="form" onSubmit={handleEmailSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {isRegister && (
                  <TextField
                    label="Ваше имя"
                    placeholder="Степан"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    fullWidth
                    required
                    size="small"
                    slotProps={{ input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonOutlinedIcon fontSize="small" color="action" />
                        </InputAdornment>
                      ),
                    }}}
                  />
                )}

                <TextField
                  label="Почта"
                  placeholder="name@example.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  fullWidth
                  required
                  size="small"
                  slotProps={{ input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <MailOutlinedIcon fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                  }}}
                />

                <TextField
                  label="Пароль"
                  placeholder="••••••••"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  fullWidth
                  required
                  size="small"
                  slotProps={{ input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockOutlinedIcon fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                  }}}
                />

                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={loading}
                  endIcon={loading ? <CircularProgress size={20} color="inherit" /> : <ArrowForwardIcon />}
                  sx={{ mt: 1 }}
                >
                  {isRegister ? 'Зарегистрироваться' : 'Войти'}
                </Button>

                <Divider sx={{ my: 1 }} />

                <Box sx={{ textAlign: 'center' }}>
                  <Button
                    variant="text"
                    size="small"
                    onClick={() => {
                      setIsRegister(!isRegister);
                      setError(null);
                    }}
                  >
                    {isRegister ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться'}
                  </Button>
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};
