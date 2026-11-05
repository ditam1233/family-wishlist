'use client';

import React, { useState, useEffect } from 'react';
import { dataStore } from '@/lib/data';
import { User } from '@/types';
import { getInitials } from '@/lib/avatar';
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
  Avatar,
  Chip,
  List,
  ListItem,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
} from '@mui/material';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import KeyIcon from '@mui/icons-material/Key';
import MailOutlinedIcon from '@mui/icons-material/MailOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import GroupsIcon from '@mui/icons-material/Groups';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';

interface AuthScreenProps {
  onSuccess: (user: User) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccess }) => {
  const { mode, toggleColorMode } = useColorMode();
  const [tab, setTab] = useState<'code' | 'email'>('code');

  // Code auth
  const [inviteCode, setInviteCode] = useState('');
  const [relativeName, setRelativeName] = useState('');
  const [foundFamily, setFoundFamily] = useState<{ name: string; id: string } | null>(null);
  const [familyMembers, setFamilyMembers] = useState<User[]>([]);
  const [isCheckingFamily, setIsCheckingFamily] = useState(false);
  const [isNewMemberMode, setIsNewMemberMode] = useState(false);

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

  // Check family members by code on typing (debounced)
  useEffect(() => {
    const clean = inviteCode.trim();
    if (clean.length < 4) {
      setFoundFamily(null);
      setFamilyMembers([]);
      setIsNewMemberMode(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingFamily(true);
      try {
        const info = await dataStore.getFamilyInfoByCode(clean);
        if (info.group) {
          setFoundFamily({ name: info.group.name, id: info.group.id });
          setFamilyMembers(info.members);
          if (info.members.length === 0) {
            setIsNewMemberMode(true);
          }
        } else {
          setFoundFamily(null);
          setFamilyMembers([]);
        }
      } catch {
        setFoundFamily(null);
        setFamilyMembers([]);
      } finally {
        setIsCheckingFamily(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [inviteCode]);

  // Click on existing member in the list
  const handleSelectExistingMember = async (member: User) => {
    setLoading(true);
    setError(null);
    try {
      const res = await dataStore.joinByCode(inviteCode.trim(), member.name);
      if (res.success && res.user) {
        onSuccess(res.user);
      } else {
        setError(res.error || 'Не удалось войти');
      }
    } catch {
      setError('Не удалось войти в аккаунт');
    } finally {
      setLoading(false);
    }
  };

  // Submit code with custom name (new relative)
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
        setError(res.error || 'Семья с таким кодом не найдена. Проверьте код и попробуйте снова.');
      }
    } catch {
      setError('Не удалось подключиться к семье. Попробуйте еще раз.');
    } finally {
      setLoading(false);
    }
  };

  // Submit email auth
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
        ? await dataStore.register(email.trim(), password, name.trim())
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
    <Box className="apple-glass-bg" sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 2 }}>
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
      <Box sx={{ width: '100%', maxWidth: 460 }}>
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
            Делитесь подарками и радуйте близких
          </Typography>
        </Box>

        <Card className="glass-panel" elevation={0}>
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
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                {/* Invite Code Input */}
                <TextField
                  label="Код семьи"
                  placeholder="АБВ-1234"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  fullWidth
                  required
                  size="small"
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <KeyIcon fontSize="small" color="action" />
                        </InputAdornment>
                      ),
                      endAdornment: isCheckingFamily ? (
                        <InputAdornment position="end">
                          <CircularProgress size={18} />
                        </InputAdornment>
                      ) : undefined,
                    },
                    htmlInput: {
                      style: { fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.1em' },
                    },
                  }}
                />

                {/* Found Family Banner */}
                {foundFamily && (
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 2.5,
                      backgroundColor: (theme) =>
                        theme.palette.mode === 'dark' ? 'rgba(99, 102, 241, 0.12)' : 'rgba(79, 70, 229, 0.08)',
                      border: (theme) =>
                        theme.palette.mode === 'dark'
                          ? '1px solid rgba(99, 102, 241, 0.3)'
                          : '1px solid rgba(79, 70, 229, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                    }}
                  >
                    <GroupsIcon color="primary" />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        Семья найдена
                      </Typography>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                        {foundFamily.name}
                      </Typography>
                    </Box>
                  </Box>
                )}

                {/* Existing Family Members Selection */}
                {foundFamily && familyMembers.length > 0 && !isNewMemberMode && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary', letterSpacing: '0.05em' }}>
                      Выберите себя из списка членов семьи:
                    </Typography>

                    <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {familyMembers.map((member) => (
                        <ListItem
                          key={member.id}
                          disablePadding
                          sx={{
                            border: (theme) =>
                              theme.palette.mode === 'dark'
                                ? '1px solid rgba(255, 255, 255, 0.08)'
                                : '1px solid rgba(0, 0, 0, 0.06)',
                            borderRadius: 2.5,
                            overflow: 'hidden',
                            backgroundColor: 'background.paper',
                            '&:hover': {
                              borderColor: 'primary.main',
                            },
                          }}
                        >
                          <ListItemButton
                            onClick={() => handleSelectExistingMember(member)}
                            disabled={loading}
                          >
                            <ListItemAvatar>
                              <Avatar sx={{ bgcolor: 'primary.main', fontWeight: 700, fontSize: '0.85rem' }}>
                                {getInitials(member.name)}
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={
                                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                  {member.name}
                                </Typography>
                              }
                              secondary="Нажмите, чтобы войти в аккаунт"
                            />
                            <ArrowForwardIcon fontSize="small" color="action" />
                          </ListItemButton>
                        </ListItem>
                      ))}
                    </List>

                    <Box sx={{ textAlign: 'center', pt: 1 }}>
                      <Button
                        size="small"
                        startIcon={<PersonAddAlt1Icon fontSize="small" />}
                        onClick={() => setIsNewMemberMode(true)}
                        sx={{ textTransform: 'none' }}
                      >
                        Меня нет в списке (Создать новый профиль)
                      </Button>
                    </Box>
                  </Box>
                )}

                {/* Manual Name Input (for new members or if toggled) */}
                {(!foundFamily || familyMembers.length === 0 || isNewMemberMode) && (
                  <Box component="form" onSubmit={handleCodeSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      Введите ваше имя, чтобы присоединиться к семье:
                    </Typography>

                    <TextField
                      label="Ваше имя"
                      value={relativeName}
                      onChange={(e) => setRelativeName(e.target.value)}
                      fullWidth
                      required
                      size="small"
                      slotProps={{
                        input: {
                          startAdornment: (
                            <InputAdornment position="start">
                              <PersonOutlinedIcon fontSize="small" color="action" />
                            </InputAdornment>
                          ),
                        },
                      }}
                    />

                    <Button
                      type="submit"
                      variant="contained"
                      size="large"
                      fullWidth
                      disabled={loading || !inviteCode.trim() || !relativeName.trim()}
                      endIcon={loading ? <CircularProgress size={20} color="inherit" /> : <ArrowForwardIcon />}
                    >
                      Присоединиться к семье
                    </Button>

                    {foundFamily && familyMembers.length > 0 && (
                      <Button
                        size="small"
                        variant="text"
                        onClick={() => setIsNewMemberMode(false)}
                        sx={{ textTransform: 'none' }}
                      >
                        ← Вернуться к выбору из списка
                      </Button>
                    )}
                  </Box>
                )}
              </Box>
            ) : (
              <Box component="form" onSubmit={handleEmailSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {isRegister && (
                  <TextField
                    label="Ваше имя"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    fullWidth
                    required
                    size="small"
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <PersonOutlinedIcon fontSize="small" color="action" />
                          </InputAdornment>
                        ),
                      },
                    }}
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
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <MailOutlinedIcon fontSize="small" color="action" />
                        </InputAdornment>
                      ),
                    },
                  }}
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
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockOutlinedIcon fontSize="small" color="action" />
                        </InputAdornment>
                      ),
                    },
                  }}
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
