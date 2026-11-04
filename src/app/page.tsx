'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { User, Wish, FamilyGroup } from '@/types';
import { dataStore } from '@/lib/data';
import { getInitials } from '@/lib/avatar';
import { useColorMode } from '@/components/ThemeRegistry/MuiThemeProvider';
import { WishCard } from '@/components/WishCard';
import { WishRow } from '@/components/WishRow';
import dynamic from 'next/dynamic';

const AddWishModal = dynamic(
  () => import('@/components/AddWishModal').then((m) => m.AddWishModal),
  { ssr: false }
);

const FamilyGroupModal = dynamic(
  () => import('@/components/FamilyGroupModal').then((m) => m.FamilyGroupModal),
  { ssr: false }
);
import { AuthScreen } from '@/components/AuthScreen';

import {
  Card,
  AppBar,
  Toolbar,
  Typography,
  Box,
  Container,
  Button,
  IconButton,
  Avatar,
  Chip,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  ToggleButtonGroup,
  ToggleButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Snackbar,
  Alert,
  Skeleton,
  LinearProgress,
  Fab,
  Tooltip,
} from '@mui/material';

import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import AddIcon from '@mui/icons-material/Add';




import GridViewIcon from '@mui/icons-material/GridView';
import ViewListIcon from '@mui/icons-material/ViewList';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import GroupsIcon from '@mui/icons-material/Groups';
import LogoutIcon from '@mui/icons-material/Logout';

export default function HomePage() {
  const { mode, toggleColorMode } = useColorMode();

  // Authentication & Groups
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userGroups, setUserGroups] = useState<FamilyGroup[]>([]);
  const [familyMembers, setFamilyMembers] = useState<User[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  // View state
  const [activeTab, setActiveTab] = useState<'wishes' | 'reservations'>('wishes');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Wishes data
  const [wishes, setWishes] = useState<(Wish & { is_reserved?: boolean; reserved_by_me?: boolean })[]>([]);
  const [myReservations, setMyReservations] = useState<(Wish & { is_reserved?: boolean; reserved_by_me?: boolean })[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isFamilyModalOpen, setIsFamilyModalOpen] = useState(false);

  // User Profile Menu
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);

  // Notifications
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'info' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const showNotification = useCallback((message: string, severity: 'success' | 'info' | 'error' = 'success') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  // Keep a ref to currentUser for async callbacks without triggering re-renders
  const currentUserRef = useRef<User | null>(null);
  currentUserRef.current = currentUser;

  // Load wishes: first show local cache instantly, then sync remote in background
  const fetchWishes = useCallback(async (targetId: string, viewerId: string) => {
    // 1. Instant local render (0ms)
    const local = dataStore.getLocalWishes(targetId, viewerId);
    if (local.length > 0) {
      setWishes(local);
    }

    // 2. Background remote sync
    setIsRefreshing(true);
    try {
      const items = await dataStore.getWishesForUser(targetId, viewerId);
      setWishes(items);
    } catch (err) {
      console.error('Error fetching wishes:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Load reservations
  const fetchReservations = useCallback(async (viewerId: string) => {
    try {
      const items = await dataStore.getMyReservations(viewerId);
      setMyReservations(items);
    } catch (err) {
      console.error('Error loading reservations:', err);
    }
  }, []);

  // Complete user and family data loader (parallelized without waterfalls)
  const loadInitialData = useCallback(async (user: User) => {
    // Immediately set selected user to self so ownership is locked instantly
    setSelectedUserId(user.id);

    try {
      // Parallelize: start fetching user's reservations immediately without waiting for groups/members
      const reservationsPromise = fetchReservations(user.id);

      const groups = await dataStore.getUserGroups(user.id);
      setUserGroups(groups);

      const activeGroup = groups[0];
      const activeGroupId = activeGroup?.id || 'all';
      setSelectedGroupId(activeGroupId);

      const members = await dataStore.getFamilyMembers(user.id, activeGroupId);
      setFamilyMembers(members);

      await Promise.all([
        fetchWishes(user.id, user.id),
        reservationsPromise,
      ]);
    } catch (err) {
      console.error('Initial data load error:', err);
    } finally {
      setIsInitialLoading(false);
    }
  }, [fetchWishes, fetchReservations]);

  // Run ONCE on mount
  useEffect(() => {
    const cachedUser = dataStore.getCachedUser();
    if (cachedUser) {
      setCurrentUser(cachedUser);
      setSelectedUserId(cachedUser.id);
      const cachedGroups = dataStore.getCachedGroups();
      if (cachedGroups && cachedGroups.length > 0) {
        setUserGroups(cachedGroups);
        setSelectedGroupId(cachedGroups[0].id);
      }
      const cachedMembers = dataStore.getCachedMembers();
      if (cachedMembers && cachedMembers.length > 0) {
        setFamilyMembers(cachedMembers);
      }
      const cachedWishes = dataStore.getLocalWishes(cachedUser.id, cachedUser.id);
      if (cachedWishes.length > 0) {
        setWishes(cachedWishes);
      }
      setIsInitialLoading(false);
    }

    // Remote sync
    (async () => {
      try {
        const user = await dataStore.getCurrentUser();
        if (user) {
          setCurrentUser(user);
          setSelectedUserId(user.id);
          await loadInitialData(user);
        } else {
          setCurrentUser(null);
          setIsInitialLoading(false);
        }
      } catch (err) {
        console.error('Mount init error:', err);
        setIsInitialLoading(false);
      }
    })();
  }, [loadInitialData]);

  // Smooth switch target user: zero twitching, instant local cache, stable scroll
  const handleSwitchUser = useCallback(async (targetId: string) => {
    const user = currentUserRef.current;
    if (!user) return;

    setSelectedUserId(targetId);
    setActiveTab('wishes');

    await fetchWishes(targetId, user.id);
  }, [fetchWishes]);

  // Smooth switch family group
  const handleSwitchGroup = useCallback(async (groupId: string) => {
    const user = currentUserRef.current;
    if (!user) return;

    setSelectedGroupId(groupId);
    setIsRefreshing(true);

    try {
      const members = await dataStore.getFamilyMembers(user.id, groupId);
      setFamilyMembers(members);

      // Select self if member, otherwise first member
      const nextTargetId = members.some((m) => m.id === user.id)
        ? user.id
        : members[0]?.id || user.id;

      setSelectedUserId(nextTargetId);
      await fetchWishes(nextTargetId, user.id);
    } catch (err) {
      console.error('Error switching group:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchWishes]);

  // Add wish
  const handleAddWish = useCallback(async (wishData: Omit<Wish, 'id' | 'created_at'>) => {
    const user = currentUserRef.current;
    if (!user) return;

    const newWish = await dataStore.addWish(wishData);
    if (newWish) {
      if (selectedUserId === user.id) {
        setWishes((prev) => [
          { ...newWish, is_reserved: false, reserved_by_me: false },
          ...prev,
        ]);
      }
      showNotification('Подарок успешно добавлен в список!');
    }
  }, [selectedUserId, showNotification]);

  // Toggle reserve
  const handleToggleReserve = useCallback(async (wishId: string) => {
    const user = currentUserRef.current;
    if (!user) return;

    const wish = wishes.find((w) => w.id === wishId);
    const wasReservedByMe = wish?.reserved_by_me;

    // Optimistic instant update
    setWishes((prev) =>
      prev.map((w) => {
        if (w.id === wishId) {
          const nextReserved = !w.reserved_by_me;
          return {
            ...w,
            is_reserved: nextReserved,
            reserved_by_me: nextReserved,
          };
        }
        return w;
      })
    );

    try {
      await dataStore.toggleReservation(wishId, user.id);
      await fetchReservations(user.id);
      showNotification(
        wasReservedByMe
          ? 'Бронь снята'
          : 'Подарок забронирован! Именинник об этом не узнает 😉'
      );
    } catch {
      showNotification('Не удалось обновить статус брони', 'error');
      await fetchWishes(selectedUserId, user.id);
    }
  }, [wishes, fetchReservations, fetchWishes, selectedUserId, showNotification]);

  // Delete wish
  const handleDeleteWish = useCallback(async (wishId: string) => {
    const user = currentUserRef.current;
    if (!user) return;
    if (!confirm('Вы уверены, что хотите удалить этот подарок?')) return;

    setWishes((prev) => prev.filter((w) => w.id !== wishId));

    try {
      await dataStore.deleteWish(wishId, user.id);
      showNotification('Подарок удален из списка');
    } catch {
      showNotification('Ошибка при удалении', 'error');
      await fetchWishes(selectedUserId, user.id);
    }
  }, [fetchWishes, selectedUserId, showNotification]);

  // Logout
  const handleLogout = async () => {
    setUserMenuAnchor(null);
    await dataStore.logout();
    setCurrentUser(null);
    setUserGroups([]);
    setFamilyMembers([]);
    setWishes([]);
    setMyReservations([]);
  };

  // Wishes for active tab
  const displayedWishes = useMemo(() => {
    return activeTab === 'reservations' ? myReservations : wishes;
  }, [activeTab, wishes, myReservations]);

  // User is owner if selectedUserId is empty or explicitly matches currentUser.id
  const isOwner = Boolean(
    currentUser &&
    (!selectedUserId || selectedUserId === currentUser.id)
  );

  const effectiveTargetUserId = isOwner
    ? (currentUser?.id || '')
    : (selectedUserId || currentUser?.id || '');

  const activeGroup = userGroups.find((g) => g.id === selectedGroupId) || userGroups[0];
  const targetMember = isOwner
    ? currentUser
    : (familyMembers.find((m) => m.id === effectiveTargetUserId) || currentUser);

  if (isInitialLoading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
        }}
      >
        <CardGiftcardIcon sx={{ fontSize: 48, color: 'primary.main' }} />
        <Typography variant="body2" color="text.secondary">
          Загрузка вишлиста...
        </Typography>
      </Box>
    );
  }

  if (!currentUser) {
    return (
      <AuthScreen
        onSuccess={(user) => {
          setCurrentUser(user);
          loadInitialData(user);
        }}
      />
    );
  }

  return (
    <Box className="apple-glass-bg" sx={{ minHeight: '100vh', pb: 10 }}>
      {/* Top Navigation Bar */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          backgroundColor: (theme: any) =>
            theme.palette.mode === 'dark'
              ? 'rgba(11, 17, 30, 0.72)'
              : 'rgba(255, 255, 255, 0.75)',
          borderBottom: (theme: any) =>
            theme.palette.mode === 'dark'
              ? '1px solid rgba(255, 255, 255, 0.09)'
              : '1px solid rgba(255, 255, 255, 0.7)',
          boxShadow: (theme: any) =>
            theme.palette.mode === 'dark'
              ? '0 4px 20px rgba(0, 0, 0, 0.4)'
              : '0 4px 20px rgba(15, 23, 42, 0.04)',
          color: 'text.primary',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, md: 3 } }}>
          {/* Brand & Family Selector */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: 2.5,
                background: (theme: any) =>
                  theme.palette.mode === 'dark'
                    ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)'
                    : 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
              }}
            >
              <CardGiftcardIcon sx={{ fontSize: 22 }} />
            </Box>

            <Box>
              <Typography variant="subtitle1" component="div" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                Вишлист
              </Typography>
              {activeGroup && (
                <Chip
                  icon={<GroupsIcon sx={{ fontSize: '14px !important' }} />}
                  label={activeGroup.name}
                  size="small"
                  onClick={() => setIsFamilyModalOpen(true)}
                  sx={{
                    height: 20,
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                />
              )}
            </Box>
          </Box>

          {/* Right Header Controls */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* View Mode Toggle */}
            <ToggleButtonGroup
              size="small"
              value={viewMode}
              exclusive
              onChange={(_, val) => val && setViewMode(val)}
              sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
            >
              <ToggleButton value="grid" aria-label="Сетка">
                <GridViewIcon fontSize="small" />
              </ToggleButton>
              <ToggleButton value="list" aria-label="Список">
                <ViewListIcon fontSize="small" />
              </ToggleButton>
            </ToggleButtonGroup>

            {/* Theme Toggle */}
            <Tooltip title={mode === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'}>
              <IconButton onClick={toggleColorMode} size="small" color="inherit">
                {mode === 'dark' ? <LightModeOutlinedIcon fontSize="small" /> : <DarkModeOutlinedIcon fontSize="small" />}
              </IconButton>
            </Tooltip>

            {/* User Profile Avatar & Menu */}
            <Tooltip title="Меню профиля">
              <IconButton
                onClick={(e) => setUserMenuAnchor(e.currentTarget)}
                size="small"
                sx={{ ml: 0.5 }}
              >
                <Avatar
                  sx={{
                    width: 36,
                    height: 36,
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    bgcolor: 'primary.main',
                  }}
                >
                  {getInitials(currentUser.name)}
                </Avatar>
              </IconButton>
            </Tooltip>

            <Menu
              anchorEl={userMenuAnchor}
              open={Boolean(userMenuAnchor)}
              onClose={() => setUserMenuAnchor(null)}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              slotProps={{
                paper: {
                  sx: { minWidth: 200, mt: 1 },
                },
              }}
            >
              <Box sx={{ px: 2, py: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {currentUser.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {currentUser.email || 'Вход по коду'}
                </Typography>
              </Box>
              <Divider />
              <MenuItem
                onClick={() => {
                  setUserMenuAnchor(null);
                  setActiveTab('reservations');
                }}
              >
                <ListItemIcon>
                  <BookmarkBorderIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary="Мои брони"
                  secondary={`${myReservations.length} подарков`}
                />
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setUserMenuAnchor(null);
                  setIsFamilyModalOpen(true);
                }}
              >
                <ListItemIcon>
                  <GroupsIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Управление семьями" />
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
                <ListItemIcon sx={{ color: 'error.main' }}>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Выйти" />
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main Container */}
      <Container maxWidth="lg" sx={{ pt: 3 }}>
        {/* Family Members Selector Bar (Liquid Glass Island) */}
        <Box
          className="glass-panel"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            overflowX: 'auto',
            p: 1.25,
            borderRadius: 4,
            mb: 3,
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
          }}
        >
          {familyMembers.map((member) => {
            const isSelected = effectiveTargetUserId === member.id && activeTab === 'wishes';
            const isMe = member.id === currentUser.id;

            return (
              <Chip
                key={member.id}
                avatar={
                  <Avatar
                    sx={{
                      bgcolor: isSelected ? '#ffffff' : 'primary.main',
                      color: isSelected ? 'primary.main' : '#ffffff',
                    }}
                  >
                    {getInitials(member.name)}
                  </Avatar>
                }
                label={isMe ? `${member.name} (Я)` : member.name}
                clickable
                color={isSelected ? 'primary' : 'default'}
                variant={isSelected ? 'filled' : 'outlined'}
                onClick={() => handleSwitchUser(member.id)}
                sx={{
                  py: 2.2,
                  px: 0.5,
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  borderRadius: 3,
                }}
              />
            );
          })}

          {/* Tab: My Reservations */}
          <Chip
            icon={<BookmarkBorderIcon sx={{ fontSize: '18px !important' }} />}
            label="Мои брони"
            clickable
            color={activeTab === 'reservations' ? 'secondary' : 'default'}
            variant={activeTab === 'reservations' ? 'filled' : 'outlined'}
            onClick={() => setActiveTab('reservations')}
            avatar={
              myReservations.length > 0 ? (
                <Avatar sx={{ bgcolor: 'secondary.main', color: '#ffffff', width: 22, height: 22, fontSize: '0.72rem' }}>
                  {myReservations.length}
                </Avatar>
              ) : undefined
            }
            sx={{
              py: 2.2,
              px: 0.5,
              fontWeight: 700,
              fontSize: '0.85rem',
              borderRadius: 3,
            }}
          />
        </Box>

        {/* Apple Bento Hero Header & Member Card */}
        <Card
          className="glass-panel"
          sx={{
            p: { xs: 2.5, sm: 3 },
            mb: 3,
            borderRadius: 4,
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', md: 'center' },
            gap: 2.5,
            border: (theme: any) =>
              theme.palette.mode === 'dark'
                ? '1px solid rgba(255, 255, 255, 0.12)'
                : '1px solid rgba(255, 255, 255, 0.85)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar
              sx={{
                width: { xs: 52, sm: 60 },
                height: { xs: 52, sm: 60 },
                fontWeight: 800,
                fontSize: { xs: '1.2rem', sm: '1.4rem' },
                background: (theme: any) =>
                  theme.palette.mode === 'dark'
                    ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'
                    : 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                color: '#ffffff',
                boxShadow: '0 8px 24px rgba(37, 99, 235, 0.3)',
              }}
            >
              {activeTab === 'reservations' ? '🎁' : getInitials(targetMember?.name || currentUser.name)}
            </Avatar>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, flexWrap: 'wrap' }}>
                <Typography variant="h5" component="h2" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
                  {activeTab === 'reservations'
                    ? 'Подарки, которые вы дарите'
                    : isOwner
                    ? `${currentUser.name} (Мой список)`
                    : `Список желаний: ${targetMember?.name}`}
                </Typography>
                <Chip
                  size="small"
                  label={
                    activeTab === 'reservations'
                      ? `${displayedWishes.length} забронировано`
                      : `${displayedWishes.length} ${
                          displayedWishes.length === 1
                            ? 'желание'
                            : displayedWishes.length >= 2 && displayedWishes.length <= 4
                            ? 'желания'
                            : 'желаний'
                        }`
                  }
                  sx={{
                    fontWeight: 700,
                    height: 24,
                    fontSize: '0.75rem',
                    backgroundColor: (theme: any) =>
                      theme.palette.mode === 'dark' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(37, 99, 235, 0.1)',
                    color: 'primary.main',
                  }}
                />
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 640, lineHeight: 1.5 }}>
                {activeTab === 'reservations'
                  ? 'Тайный список подарков, которые вы пообещали подарить близким. Они не знают, что вы это выбрали!'
                  : isOwner
                  ? 'Добавляйте любые желанные подарки со ссылками на маркетплейсы, чтобы близким было легко порадовать вас.'
                  : '🤫 Секретная бронь: нажмите «Подарю я!», чтобы застолбить подарок. Другие родственники увидят, что подарок занят'}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: { xs: '100%', md: 'auto' } }}>
            {isOwner && activeTab === 'wishes' && (
              <Button
                variant="contained"
                size="large"
                fullWidth
                startIcon={<AddIcon />}
                onClick={() => setIsAddModalOpen(true)}
                sx={{
                  borderRadius: 3,
                  py: 1.2,
                  px: 3,
                  fontWeight: 700,
                  fontSize: '0.92rem',
                  boxShadow: '0 8px 24px rgba(37, 99, 235, 0.35)',
                  whiteSpace: 'nowrap',
                }}
              >
                Добавить подарок
              </Button>
            )}
          </Box>
        </Card>

        {/* Non-intrusive subtle background loading indicator (never jumps or unmounts the list!) */}
        {isRefreshing && (
          <LinearProgress
            sx={{
              height: 3,
              borderRadius: 1.5,
              mb: 2,
              backgroundColor: 'transparent',
            }}
          />
        )}

        {/* Wishes Content List / Grid */}
        {displayedWishes.length === 0 && isRefreshing ? (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(3, 1fr)',
              },
              gap: 2.5,
            }}
          >
            {[1, 2, 3].map((k) => (
              <Box
                key={k}
                className="glass-card"
                sx={{
                  p: 2,
                  borderRadius: 4,
                  minHeight: 240,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1.5,
                }}
              >
                <Skeleton variant="rounded" height={130} sx={{ borderRadius: 3 }} animation="wave" />
                <Skeleton variant="text" width="70%" height={26} animation="wave" />
                <Skeleton variant="text" width="40%" height={18} animation="wave" />
              </Box>
            ))}
          </Box>
        ) : displayedWishes.length === 0 && !isRefreshing ? (
          <Box
            className="glass-panel"
            sx={{
              py: { xs: 6, sm: 8 },
              px: { xs: 3, sm: 4 },
              textAlign: 'center',
              borderRadius: 4,
              maxWidth: 600,
              mx: 'auto',
              border: (theme: any) =>
                theme.palette.mode === 'dark'
                  ? '1.5px dashed rgba(59, 130, 246, 0.3)'
                  : '1.5px dashed rgba(37, 99, 235, 0.3)',
            }}
          >
            <Box
              sx={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: (theme: any) =>
                  theme.palette.mode === 'dark' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(37, 99, 235, 0.08)',
                color: 'primary.main',
                mb: 2,
              }}
            >
              <CardGiftcardIcon sx={{ fontSize: 36 }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 1, letterSpacing: '-0.01em' }}>
              {activeTab === 'reservations'
                ? 'Вы еще не выбрали подарки'
                : isOwner
                ? 'Ваш список пока пуст'
                : `${targetMember?.name || 'Родственник'} еще не составил список`}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420, mx: 'auto', mb: 3, lineHeight: 1.6 }}>
              {activeTab === 'reservations'
                ? 'Перейдите в список любого члена семьи сверху и нажмите «Подарю я!». Забронированные подарки будут видны только вам.'
                : isOwner
                ? 'Добавьте первое желание — просто вставьте ссылку на Ozon, Wildberries, Яндекс.Маркет или напишите текстом!'
                : 'Напомните близкому человеку добавить желания, чтобы сделать идеальный сюрприз к празднику.'}
            </Typography>
            {isOwner && activeTab === 'wishes' && (
              <Button
                variant="contained"
                size="large"
                startIcon={<AddIcon />}
                onClick={() => setIsAddModalOpen(true)}
                sx={{
                  borderRadius: 3,
                  py: 1.2,
                  px: 3.5,
                  fontWeight: 700,
                  boxShadow: '0 8px 24px rgba(37, 99, 235, 0.35)',
                }}
              >
                Добавить первое желание
              </Button>
            )}
          </Box>
        ) : viewMode === 'grid' ? (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(3, 1fr)',
              },
              gap: 2.5,
              opacity: isRefreshing ? 0.8 : 1,
              transition: 'opacity 0.2s ease',
            }}
          >
            {displayedWishes.map((wish) => (
              <WishCard
                key={wish.id}
                wish={wish}
                isOwner={isOwner}
                onToggleReserve={handleToggleReserve}
                onDeleteWish={handleDeleteWish}
              />
            ))}
          </Box>
        ) : (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5,
              opacity: isRefreshing ? 0.8 : 1,
              transition: 'opacity 0.2s ease',
            }}
          >
            {displayedWishes.map((wish) => (
              <WishRow
                key={wish.id}
                wish={wish}
                isOwner={isOwner}
                onToggleReserve={handleToggleReserve}
                onDeleteWish={handleDeleteWish}
              />
            ))}
          </Box>
        )}
      </Container>

      {/* Add Wish Modal */}
      <AddWishModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddWish={handleAddWish}
        userId={currentUser.id}
      />

      {/* Family Groups Manager Modal */}
      <FamilyGroupModal
        isOpen={isFamilyModalOpen}
        currentUser={currentUser}
        selectedGroupId={selectedGroupId}
        onSelectGroup={handleSwitchGroup}
        onClose={() => setIsFamilyModalOpen(false)}
        onUpdate={() => {
          if (currentUser) {
            handleSwitchGroup(selectedGroupId);
          }
        }}
      />

      {/* Global Toast Notification */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3500}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%', borderRadius: 3 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
