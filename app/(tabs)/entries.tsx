import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Search, Plus, MapPin, Calendar, ChevronRight } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useData, useFilteredEntries } from '@/contexts/DataContext';
import { SeedEntry } from '@/types';

export default function EntriesScreen() {
  const router = useRouter();
  useData();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const filteredEntries = useFilteredEntries(search);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setRefreshing(false);
  }, []);

  const handleEntryPress = (id: string) => {
    router.push(`/entry/${id}` as never);
  };

  const handleAddEntry = () => {
    router.push('/add-entry' as never);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const renderEntry = ({ item }: { item: SeedEntry }) => (
    <TouchableOpacity
      style={styles.entryCard}
      onPress={() => handleEntryPress(item.id)}
      activeOpacity={0.7}
    >
      <View style={styles.entryContent}>
        {item.photos.length > 0 ? (
          <Image
            source={{ uri: item.photos[0] }}
            style={styles.entryImage}
            contentFit="cover"
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <MapPin size={24} color={Colors.textLight} />
          </View>
        )}
        
        <View style={styles.entryInfo}>
          <Text style={styles.varietyName} numberOfLines={1}>
            {item.varietyName || 'Unnamed Variety'}
          </Text>
          <Text style={styles.producerName} numberOfLines={1}>
            {item.producer || 'Unknown Producer'}
          </Text>
          
          <View style={styles.entryMeta}>
            {item.fieldName && (
              <View style={styles.metaItem}>
                <MapPin size={12} color={Colors.textLight} />
                <Text style={styles.metaText}>{item.fieldName}</Text>
              </View>
            )}
            <View style={styles.metaItem}>
              <Calendar size={12} color={Colors.textLight} />
              <Text style={styles.metaText}>{formatDate(item.createdAt)}</Text>
            </View>
          </View>
          
          {item.traits.length > 0 && (
            <View style={styles.traitsContainer}>
              {item.traits.slice(0, 2).map((trait, index) => (
                <View key={index} style={styles.traitBadge}>
                  <Text style={styles.traitText}>{trait}</Text>
                </View>
              ))}
              {item.traits.length > 2 && (
                <Text style={styles.moreTraits}>+{item.traits.length - 2}</Text>
              )}
            </View>
          )}
        </View>
        
        <ChevronRight size={20} color={Colors.textLight} />
      </View>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <MapPin size={64} color={Colors.borderLight} />
      <Text style={styles.emptyTitle}>No Entries Found</Text>
      <Text style={styles.emptyText}>
        {search
          ? 'Try adjusting your search terms'
          : 'Start by adding your first seed entry'}
      </Text>
      {!search && (
        <TouchableOpacity style={styles.emptyButton} onPress={handleAddEntry}>
          <Plus size={20} color={Colors.textInverse} />
          <Text style={styles.emptyButtonText}>Add Entry</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Search size={20} color={Colors.textLight} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search varieties, producers..."
            placeholderTextColor={Colors.textLight}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <FlatList
        data={filteredEntries}
        renderItem={renderEntry}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity style={styles.fab} onPress={handleAddEntry}>
        <Plus size={26} color={Colors.textInverse} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 0,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: Colors.text,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
    flexGrow: 1,
  },
  entryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  entryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  entryImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: Colors.backgroundDark,
  },
  imagePlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: Colors.backgroundDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  entryInfo: {
    flex: 1,
    marginLeft: 14,
    marginRight: 8,
  },
  varietyName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  producerName: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  entryMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: Colors.textLight,
  },
  traitsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  traitBadge: {
    backgroundColor: Colors.primaryLight + '20',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  traitText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '500' as const,
  },
  moreTraits: {
    fontSize: 11,
    color: Colors.textLight,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: Colors.text,
    marginTop: 20,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 24,
    gap: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.textInverse,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    backgroundColor: Colors.primary,
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
});
