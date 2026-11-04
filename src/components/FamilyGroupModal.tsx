'use client';

import React, { useState, useEffect } from 'react';
import { User, FamilyGroup } from '@/types';
import { dataStore } from '@/lib/data';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Chip,
  Alert,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import GroupsIcon from '@mui/icons-material/Groups';
import KeyIcon from '@mui/icons-material/Key';

interface FamilyGroupModalProps {
  isOpen: boolean;
  currentUser: User;
  selectedGroupId?: string;
  onSelectGroup?: (id: string) => void;
  onClose: () => void;
  onUpdate: () => void;
}

export const FamilyGroupModal: React.FC<FamilyGroupModalProps> = ({
  isOpen,
  currentUser,
  selectedGroupId,
  onSelectGroup,
  onClose,
  onUpdate,
}) => {
  const [tab, setTab] = useState<'list' | 'create' | 'join'>('list');
  const [userGroups, setUserGroups] = useState<FamilyGroup[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadGroups();
    }
  }, [isOpen, currentUser.id]);

  const loadGroups = async () => {
    const groups = await dataStore.getUserGroups(currentUser.id);
    setUserGroups(groups);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await dataStore.createGroup(newGroupName.trim(), currentUser.id);
      if (res.success && res.group) {
        setNewGroupName('');
        await loadGroups();
        onUpdate();
        if (onSelectGroup) onSelectGroup(res.group.id);
        setTab('list');
      } else {
        setError(res.error || 'Не удалось создать семью.');
      }
    } catch {
      setError('Не удалось создать семью. Попробуйте снова.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await dataStore.joinGroup(inviteCode.trim(), currentUser.id);
      if (res.success && res.group) {
        setInviteCode('');
        await loadGroups();
        onUpdate();
        if (onSelectGroup) onSelectGroup(res.group.id);
        setTab('list');
      } else {
        setError(res.error || 'Семья с таким кодом не найдена. Проверьте код и попробуйте снова.');
      }
    } catch {
      setError('Ошибка при подключении. Проверьте соединение.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        backdrop: { sx: { backdropFilter: 'blur(6px)' } },
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
        Управление семьями
        <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2.5 }}>
        <Tabs
          value={tab}
          onChange={(_, val) => {
            setTab(val);
            setError(null);
          }}
          variant="fullWidth"
        >
          <Tab icon={<GroupsIcon fontSize="small" />} iconPosition="start" label="Мои семьи" value="list" />
          <Tab icon={<GroupAddIcon fontSize="small" />} iconPosition="start" label="Создать" value="create" />
          <Tab icon={<KeyIcon fontSize="small" />} iconPosition="start" label="По коду" value="join" />
        </Tabs>
      </Box>

      <DialogContent sx={{ p: 2.5 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {tab === 'list' && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Вы можете состоять в нескольких семьях одновременно (семья родителей, своя семья, друзья).
            </Typography>

            <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {userGroups.map((group) => {
                const isSelected = selectedGroupId === group.id;
                return (
                  <ListItem
                    key={group.id}
                    disablePadding
                    sx={{
                      border: (theme) =>
                        isSelected
                          ? `2px solid ${theme.palette.primary.main}`
                          : theme.palette.mode === 'dark'
                          ? '1px solid rgba(255, 255, 255, 0.08)'
                          : '1px solid rgba(0, 0, 0, 0.06)',
                      borderRadius: 2.5,
                      overflow: 'hidden',
                      backgroundColor: 'background.paper',
                    }}
                    secondaryAction={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 1 }}>
                        <Chip
                          label={group.invite_code}
                          size="small"
                          variant="outlined"
                          sx={{ fontFamily: 'monospace', fontWeight: 700 }}
                        />
                        <Tooltip title="Скопировать код">
                          <IconButton
                            size="small"
                            onClick={() => handleCopyCode(group.invite_code)}
                            color={copiedCode === group.invite_code ? 'success' : 'default'}
                          >
                            {copiedCode === group.invite_code ? (
                              <CheckIcon fontSize="small" />
                            ) : (
                              <ContentCopyIcon fontSize="small" />
                            )}
                          </IconButton>
                        </Tooltip>
                      </Box>
                    }
                  >
                    <ListItemButton
                      onClick={() => {
                        if (onSelectGroup) onSelectGroup(group.id);
                        onClose();
                      }}
                    >
                      <ListItemText
                        primary={
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {group.name}
                          </Typography>
                        }
                        secondary={isSelected ? 'Текущая выбранная семья' : 'Нажмите, чтобы переключить'}
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          </Box>
        )}

        {tab === 'create' && (
          <Box component="form" onSubmit={handleCreateGroup} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Придумайте название для новой семейной группы. Вы получите персональный код для приглашения близких.
            </Typography>

            <TextField
              label="Название семьи"
              placeholder="Например: Семья Ивановых"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              fullWidth
              required
              autoFocus
            />

            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={loading || !newGroupName.trim()}
              startIcon={loading ? <CircularProgress size={20} /> : <GroupAddIcon />}
            >
              Создать семью
            </Button>
          </Box>
        )}

        {tab === 'join' && (
          <Box component="form" onSubmit={handleJoinGroup} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Введите код приглашения, который вам прислал создатель семьи (например: <code>ФЭМ-3031</code>).
            </Typography>

            <TextField
              label="Код приглашения"
              placeholder="ФЭМ-3031"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              fullWidth
              required
              autoFocus
              slotProps={{
                htmlInput: {
                  style: { textTransform: 'uppercase', fontFamily: 'monospace', letterSpacing: '0.1em' },
                },
              }}
            />

            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={loading || !inviteCode.trim()}
              startIcon={loading ? <CircularProgress size={20} /> : <KeyIcon />}
            >
              Подключиться к семье
            </Button>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">
          Закрыть
        </Button>
      </DialogActions>
    </Dialog>
  );
};
