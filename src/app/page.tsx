'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { User, Wish, FamilyGroup, Priority } from '@/types';
import { dataStore } from '@/lib/data';
import { getInitials } from '@/lib/avatar';
import { useColorMode } from '@/components/ThemeRegistry/MuiThemeProvider';
import { WishCard } from '@/components/WishCard';
import { WishRow } from '@/components/WishRow';
import { InlineAddWish } from '@/components/InlineAddWish';
import { AddWishModal } from '@/components/AddWishModal';
import { FamilyGroupModal } from '@/components/FamilyGroupModal';
import { AuthScreen } from '@/components/AuthScreen';

import {
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
import SearchIcon from '@mui/icons-material/Search';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | Priority>('all');

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

  // Complete user and family data loader
  const loadInitialData = useCallback(async (user: User) => {
    try {
      const groups = await dataStore.getUserGroups(user.id);
      setUserGroups(groups);

      const activeGroup = groups[0];
      const activeGroupId = activeGroup?.id || 'all';
      setSelectedGroupId(activeGroupId);

      const members = await dataStore.getFamilyMembers(user.id, activeGroupId);
      setFamilyMembers(members);
      setSelectedUserId(user.id);

      await Promise.all([
        fetchWishes(user.id, user.id),
        fetchReservations(user.id),
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
      const cachedGroups = dataStore.getCachedGroups();
      if (cachedGroups && cachedGroups.length > 0) {
        setUserGroups(cachedGroups);
        setSelectedGroupId(cachedGroups[0].id);
      }
      const cachedMembers = dataStore.getCachedMembers();
      if (cachedMembers && cachedMembers.length > 0) {
        setFamilyMembers(cachedMembers);
        setSelectedUserId(cachedUser.id);
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
  const handleAddWish = async (wishData: Omit<Wish, 'id' | 'created_at'>) => {
    if (!currentUser) return;

    const newWish = await dataStore.addWish(wishData);
    if (newWish) {
      if (selectedUserId === currentUser.id) {
        setWishes((prev) => [
          { ...newWish, is_reserved: false, reserved_by_me: false },
          ...prev,
        ]);
      }
      showNotification('Подарок успешно добавлен в список!');
    }
  };

  // Toggle reserve
  const handleToggleReserve = async (wishId: string) => {
    if (!currentUser) return;

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
      await dataStore.toggleReservation(wishId, currentUser.id);
      await fetchReservations(currentUser.id);
      showNotification(
        wasReservedByMe
          ? 'Бронь снята'
          : 'Подарок забронирован! Именинник об этом не узнает 😉'
      );
    } catch {
      showNotification('Не удалось обновить статус брони', 'error');
      await fetchWishes(selectedUserId, currentUser.id);
    }
  };

  // Delete wish
  const handleDeleteWish = async (wishId: string) => {
    if (!currentUser) return;
    if (!confirm('Вы уверены, что хотите удалить этот подарок?')) return;

    setWishes((prev) => prev.filter((w) => w.id !== wishId));

    try {
      await dataStore.deleteWish(wishId, currentUser.id);
      showNotification('Подарок удален из списка');
    } catch {
      showNotification('Ошибка при удалении', 'error');
      await fetchWishes(selectedUserId, currentUser.id);
    }
  };

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

  // Filtered wishes
  const displayedWishes = useMemo(() => {
    const source = activeTab === 'reservations' ? myReservations : wishes;

    return source.filter((wish) => {
      const matchesSearch =
        searchQuery === '' ||
        wish.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (wish.description && wish.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (wish.event_tag && wish.event_tag.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesPriority =
        priorityFilter === 'all' || wish.priority === priorityFilter;

      return matchesSearch && matchesPriority;
    });
  }, [activeTab, wishes, myReservations, searchQuery, priorityFilter]);

  const activeGroup = userGroups.find((g) => g.id === selectedGroupId) || userGroups[0];
  const targetMember = familyMembers.find((m) => m.id === selectedUserId) || currentUser;
  const isOwner = currentUser?.id === selectedUserId;

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
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default', pb: 10 }}>
      {/* Top Navigation Bar */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          backdropFilter: 'blur(16px)',
          backgroundColor: (theme) =>
            theme.palette.mode === 'dark'
              ? 'rgba(9, 9, 11, 0.85)'
              : 'rgba(255, 255, 255, 0.85)',
          borderBottom: (theme) =>
            theme.palette.mode === 'dark'
              ? '1px solid rgba(255, 255, 255, 0.08)'
              : '1px solid rgba(0, 0, 0, 0.06)',
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
                background: (theme) =>
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
        {/* Family Members Selector Bar */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            overflowX: 'auto',
            pb: 1.5,
            mb: 2,
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
          }}
        >
          {familyMembers.map((member) => {
            const isSelected = selectedUserId === member.id && activeTab === 'wishes';
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

        {/* Section Header with Actions */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'stretch', sm: 'center' },
            gap: 2,
            mb: 2.5,
          }}
        >
          <Box>
            <Typography variant="h5" component="h2" sx={{ fontWeight: 800 }}>
              {activeTab === 'reservations'
                ? 'Подарки, которые вы дарите'
                : isOwner
                ? 'Ваш список желаний'
                : `Желания: ${targetMember?.name}`}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {activeTab === 'reservations'
                ? 'Тайный список подарков, которые вы пообещали подарить близким'
                : isOwner
                ? 'Добавляйте то, что хотите получить в подарок'
                : 'Выберите подарок и нажмите «Подарю я!», чтобы другие не купили то же самое'}
            </Typography>
          </Box>

          {isOwner && activeTab === 'wishes' && (
            <Button
              variant="contained"
              size="medium"
              startIcon={<AddIcon />}
              onClick={() => setIsAddModalOpen(true)}
              sx={{ borderRadius: 2.5, px: 2.5, fontWeight: 700, whiteSpace: 'nowrap' }}
            >
              Добавить подарок
            </Button>
          )}
        </Box>

        {/* Quick Add Bar (Only visible when viewing own wishlist) */}
        {isOwner && activeTab === 'wishes' && (
          <Box sx={{ mb: 3 }}>
            <InlineAddWish
              currentUserId={currentUser.id}
              onAddWish={handleAddWish}
              onOpenFullModal={() => setIsAddModalOpen(true)}
            />
          </Box>
        )}

        {/* Search & Filter Toolbar */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: 1.5,
            alignItems: { xs: 'stretch', md: 'center' },
            mb: 2.5,
          }}
        >
          {/* Search Field */}
          <TextField
            size="small"
            placeholder="Поиск по названию или заметкам..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ flex: 1 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              },
            }}
          />

          {/* Priority Filter Tabs */}
          <Tabs
            value={priorityFilter}
            onChange={(_, val) => setPriorityFilter(val)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ minHeight: 38 }}
          >
            <Tab label="Все" value="all" sx={{ minHeight: 38, py: 0.5, px: 1.5, fontSize: '0.8rem' }} />
            <Tab label="Очень хочу" value="must_have" sx={{ minHeight: 38, py: 0.5, px: 1.5, fontSize: '0.8rem' }} />
            <Tab label="Хочу" value="nice_to_have" sx={{ minHeight: 38, py: 0.5, px: 1.5, fontSize: '0.8rem' }} />
            <Tab label="Мечта" value="dream" sx={{ minHeight: 38, py: 0.5, px: 1.5, fontSize: '0.8rem' }} />
          </Tabs>
        </Box>

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
        {displayedWishes.length === 0 && !isRefreshing ? (
          <Box
            sx={{
              py: 8,
              px: 2,
              textAlign: 'center',
              backgroundColor: 'background.paper',
              borderRadius: 4,
              border: (theme) =>
                theme.palette.mode === 'dark'
                  ? '1px dashed rgba(255,255,255,0.12)'
                  : '1px dashed rgba(0,0,0,0.12)',
            }}
          >
            <CardGiftcardIcon sx={{ fontSize: 56, color: 'text.secondary', mb: 1, opacity: 0.5 }} />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {activeTab === 'reservations'
                ? 'Вы еще не забронировали ни одного подарка'
                : searchQuery
                ? 'Ничего не найдено'
                : isOwner
                ? 'Ваш вишлист пока пуст'
                : 'У этого человека пока нет желаний'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2.5 }}>
              {activeTab === 'reservations'
                ? 'Зайдите в список родственника и нажмите кнопку «Подарю я!», чтобы подарок появился здесь.'
                : isOwner
                ? 'Добавьте ваше первое желание по ссылке или напишите текстом!'
                : 'Попросите близкого добавить свои желания или зайдите позже.'}
            </Typography>
            {isOwner && activeTab === 'wishes' && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setIsAddModalOpen(true)}
              >
                Добавить подарок
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

      {/* Mobile Floating Action Button */}
      {isOwner && activeTab === 'wishes' && (
        <Fab
          color="primary"
          aria-label="add"
          onClick={() => setIsAddModalOpen(true)}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            display: { sm: 'none' },
            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)',
          }}
        >
          <AddIcon />
        </Fab>
      )}

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
