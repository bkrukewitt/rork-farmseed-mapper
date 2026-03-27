import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { User, Shield, Trash2, Users, RefreshCw } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useFarm } from '@/contexts/FarmContext';
import { FarmMember } from '@/types';

export default function FarmMembersScreen() {
  const { farmId, farmName, members, isAdmin, deviceId, removeMember, refreshMembers, isSyncing } = useFarm();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (farmId) await refreshMembers(farmId);
    } catch (err) {
      console.error('Refresh members error:', err);
    } finally {
      setRefreshing(false);
    }
  }, [farmId, refreshMembers]);

  const handleRemoveMember = (member: FarmMember) => {
    if (member.device_id === deviceId) {
      Alert.alert('Cannot Remove', 'You cannot remove yourself. Use "Leave Farm" instead.');
      return;
    }

    Alert.alert(
      'Remove Member',
      `Remove ${member.user_name} from this farm? They will need to rejoin.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeMember(member.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
              Alert.alert('Error', 'Failed to remove member');
            }
          },
        },
      ]
    );
  };

  const renderMember = ({ item }: { item: FarmMember }) => {
    const isMe = item.device_id === deviceId;

    return (
      <View style={styles.memberCard}>
        <View style={[styles.memberAvatar, item.is_admin && styles.adminAvatar]}>
          {item.is_admin ? (
            <Shield size={20} color={Colors.primary} />
          ) : (
            <User size={20} color={Colors.textSecondary} />
          )}
        </View>
        <View style={styles.memberInfo}>
          <View style={styles.memberNameRow}>
            <Text style={styles.memberName}>{item.user_name}</Text>
            {isMe && (
              <View style={styles.meBadge}>
                <Text style={styles.meBadgeText}>You</Text>
              </View>
            )}
          </View>
          <View style={styles.memberMeta}>
            {item.is_admin && <Text style={styles.adminLabel}>Admin</Text>}
            <Text style={styles.memberDate}>
              Joined {new Date(item.joined_at).toLocaleDateString()}
            </Text>
          </View>
        </View>
        {isAdmin && !isMe && (
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => handleRemoveMember(item)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Trash2 size={18} color={Colors.error} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Farm Members' }} />
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Users size={24} color={Colors.primary} />
        </View>
        <Text style={styles.headerTitle}>{farmName || farmId}</Text>
        <Text style={styles.headerSubtitle}>{members.length} member{members.length !== 1 ? 's' : ''}</Text>
      </View>

      <FlatList
        data={members}
        keyExtractor={(item) => item.id}
        renderItem={renderMember}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No members found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    alignItems: 'center' as const,
    paddingVertical: 20,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: Colors.primary + '12',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  memberCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.backgroundDark,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  adminAvatar: {
    backgroundColor: Colors.primary + '12',
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberNameRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  meBadge: {
    backgroundColor: Colors.primary + '18',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  meBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  memberMeta: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginTop: 3,
  },
  adminLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  memberDate: {
    fontSize: 12,
    color: Colors.textLight,
  },
  removeButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.error + '12',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  emptyState: {
    alignItems: 'center' as const,
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.textLight,
  },
});
