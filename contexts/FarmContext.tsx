import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { supabase } from '@/lib/supabase';
import { useData } from '@/contexts/DataContext';
import { SeedEntry, Field, InventoryItem, InventoryUsage, FarmMember } from '@/types';

const FARM_KEYS = {
  FARM_ID: 'farmseed_farm_id',
  FARM_NAME: 'farmseed_farm_name',
  USER_NAME: 'farmseed_user_name',
  DEVICE_ID: 'farmseed_device_id',
  IS_ADMIN: 'farmseed_is_admin',
  LAST_SYNC: 'farmseed_last_sync',
};

const SYNC_INTERVAL_MS = 2 * 60 * 1000;

function generateDeviceId(): string {
  return `dev-${Date.now()}-${Math.random().toString(36).substr(2, 12)}`;
}

export const [FarmProvider, useFarm] = createContextHook(() => {
  const data = useData();

  const [farmId, setFarmId] = useState<string | null>(null);
  const [farmName, setFarmName] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [deviceId, setDeviceId] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [members, setMembers] = useState<FarmMember[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isSyncingRef = useRef(false);
  const farmIdRef = useRef<string | null>(null);

  useEffect(() => {
    farmIdRef.current = farmId;
  }, [farmId]);

  useEffect(() => {
    loadFarmState();
  }, []);

  useEffect(() => {
    if (farmId && isLoaded) {
      console.log('Farm connected, starting sync cycle for:', farmId);
      performSync();

      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = setInterval(() => {
        if (farmIdRef.current) performSync();
      }, SYNC_INTERVAL_MS);

      const sub = AppState.addEventListener('change', (state) => {
        if (state === 'active' && farmIdRef.current) {
          console.log('App foregrounded, triggering sync');
          performSync();
        }
      });

      return () => {
        if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
        sub.remove();
      };
    }
    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    };
  }, [farmId, isLoaded]);

  const loadFarmState = async () => {
    try {
      const [storedFarmId, storedFarmName, storedUserName, storedDeviceId, storedIsAdmin, storedLastSync] = await Promise.all([
        AsyncStorage.getItem(FARM_KEYS.FARM_ID),
        AsyncStorage.getItem(FARM_KEYS.FARM_NAME),
        AsyncStorage.getItem(FARM_KEYS.USER_NAME),
        AsyncStorage.getItem(FARM_KEYS.DEVICE_ID),
        AsyncStorage.getItem(FARM_KEYS.IS_ADMIN),
        AsyncStorage.getItem(FARM_KEYS.LAST_SYNC),
      ]);

      let devId = storedDeviceId;
      if (!devId) {
        devId = generateDeviceId();
        await AsyncStorage.setItem(FARM_KEYS.DEVICE_ID, devId);
      }
      setDeviceId(devId);

      if (storedUserName) setUserName(storedUserName);
      if (storedLastSync) setLastSyncAt(storedLastSync);

      if (storedFarmId) {
        setFarmId(storedFarmId);
        setFarmName(storedFarmName || '');
        setIsAdmin(storedIsAdmin === 'true');

        try {
          const { data: farm } = await supabase
            .from('farms')
            .select('name')
            .eq('id', storedFarmId)
            .single();
          if (farm) setFarmName(farm.name);

          await refreshMembers(storedFarmId);
        } catch (err) {
          console.log('Could not fetch farm info on load:', err);
        }
      }

      console.log('Farm state loaded - farmId:', storedFarmId, 'userName:', storedUserName, 'deviceId:', devId);
    } catch (error) {
      console.error('Error loading farm state:', error);
    } finally {
      setIsLoaded(true);
    }
  };

  const refreshMembers = async (fId: string) => {
    try {
      const { data: memberData, error } = await supabase
        .from('farm_members')
        .select('*')
        .eq('farm_id', fId)
        .order('joined_at', { ascending: true });
      if (error) throw error;
      setMembers((memberData as FarmMember[]) || []);
    } catch (error) {
      console.error('Error loading members:', error);
    }
  };

  const saveUserName = useCallback(async (name: string) => {
    setUserName(name);
    await AsyncStorage.setItem(FARM_KEYS.USER_NAME, name);
    if (farmIdRef.current && deviceId) {
      try {
        await supabase
          .from('farm_members')
          .update({ user_name: name })
          .eq('farm_id', farmIdRef.current)
          .eq('device_id', deviceId);
      } catch (err) {
        console.log('Could not update user name on server:', err);
      }
    }
  }, [deviceId]);

  const createFarm = useCallback(async (id: string, name: string, uName: string, password?: string) => {
    console.log('Creating farm:', id, name);

    const { data: existing } = await supabase
      .from('farms')
      .select('id')
      .eq('id', id)
      .single();
    if (existing) throw new Error('A farm with this ID already exists');

    const { error: farmError } = await supabase
      .from('farms')
      .insert({ id, name, password: password || null });
    if (farmError) throw farmError;

    const devId = deviceId;
    const { error: memberError } = await supabase
      .from('farm_members')
      .insert({
        farm_id: id,
        user_name: uName,
        device_id: devId,
        is_admin: true,
      });
    if (memberError) throw memberError;

    setFarmId(id);
    setFarmName(name);
    setUserName(uName);
    setIsAdmin(true);

    await Promise.all([
      AsyncStorage.setItem(FARM_KEYS.FARM_ID, id),
      AsyncStorage.setItem(FARM_KEYS.FARM_NAME, name),
      AsyncStorage.setItem(FARM_KEYS.USER_NAME, uName),
      AsyncStorage.setItem(FARM_KEYS.IS_ADMIN, 'true'),
    ]);

    await uploadAllData(id);
    await refreshMembers(id);
    console.log('Farm created successfully:', id);
  }, [deviceId, data.entries, data.fields, data.inventory, data.inventoryUsage]);

  const joinFarm = useCallback(async (id: string, uName: string, password?: string) => {
    console.log('Joining farm:', id);

    const { data: farm, error: farmError } = await supabase
      .from('farms')
      .select('*')
      .eq('id', id)
      .single();
    if (farmError || !farm) throw new Error('Farm not found. Check the Farm ID.');

    if (farm.password && farm.password !== (password || '')) {
      throw new Error('Incorrect password');
    }

    const devId = deviceId;
    const { error: memberError } = await supabase
      .from('farm_members')
      .upsert({
        farm_id: id,
        user_name: uName,
        device_id: devId,
        is_admin: false,
      }, { onConflict: 'farm_id,device_id' });
    if (memberError) throw memberError;

    setFarmId(id);
    setFarmName(farm.name);
    setUserName(uName);
    setIsAdmin(false);

    await Promise.all([
      AsyncStorage.setItem(FARM_KEYS.FARM_ID, id),
      AsyncStorage.setItem(FARM_KEYS.FARM_NAME, farm.name),
      AsyncStorage.setItem(FARM_KEYS.USER_NAME, uName),
      AsyncStorage.setItem(FARM_KEYS.IS_ADMIN, 'false'),
    ]);

    await uploadAllData(id);
    await pullAndMerge(id);
    await refreshMembers(id);
    console.log('Joined farm successfully:', id);
  }, [deviceId, data.entries, data.fields, data.inventory, data.inventoryUsage]);

  const leaveFarm = useCallback(async () => {
    if (!farmIdRef.current) return;
    const fId = farmIdRef.current;

    try {
      await supabase
        .from('farm_members')
        .delete()
        .eq('farm_id', fId)
        .eq('device_id', deviceId);
    } catch (err) {
      console.log('Error removing self from farm:', err);
    }

    setFarmId(null);
    setFarmName('');
    setIsAdmin(false);
    setMembers([]);
    setLastSyncAt(null);
    setSyncError(null);

    await Promise.all([
      AsyncStorage.removeItem(FARM_KEYS.FARM_ID),
      AsyncStorage.removeItem(FARM_KEYS.FARM_NAME),
      AsyncStorage.removeItem(FARM_KEYS.IS_ADMIN),
      AsyncStorage.removeItem(FARM_KEYS.LAST_SYNC),
    ]);

    console.log('Left farm:', fId);
  }, [deviceId]);

  const removeMember = useCallback(async (memberId: string) => {
    if (!isAdmin || !farmIdRef.current) return;

    const { error } = await supabase
      .from('farm_members')
      .delete()
      .eq('id', memberId);
    if (error) throw error;

    await refreshMembers(farmIdRef.current);
    console.log('Member removed:', memberId);
  }, [isAdmin]);

  const uploadAllData = async (fId: string) => {
    const { entries, fields, inventory, inventoryUsage } = data;
    const rows: Array<{
      id: string;
      farm_id: string;
      data_type: string;
      data: Record<string, unknown>;
      updated_at: string;
    }> = [];

    entries.forEach(entry => {
      rows.push({
        id: entry.id,
        farm_id: fId,
        data_type: 'entry',
        data: entry as unknown as Record<string, unknown>,
        updated_at: entry.updatedAt,
      });
    });

    fields.forEach(field => {
      rows.push({
        id: field.id,
        farm_id: fId,
        data_type: 'field',
        data: field as unknown as Record<string, unknown>,
        updated_at: field.updatedAt,
      });
    });

    inventory.forEach(item => {
      rows.push({
        id: item.id,
        farm_id: fId,
        data_type: 'inventory',
        data: item as unknown as Record<string, unknown>,
        updated_at: item.updatedAt,
      });
    });

    inventoryUsage.forEach(usage => {
      rows.push({
        id: usage.id,
        farm_id: fId,
        data_type: 'inventory_usage',
        data: usage as unknown as Record<string, unknown>,
        updated_at: usage.usedAt,
      });
    });

    if (rows.length > 0) {
      const batchSize = 500;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const { error } = await supabase
          .from('farm_data')
          .upsert(batch, { onConflict: 'id,farm_id' });
        if (error) {
          console.error('Upload batch error:', error);
          throw error;
        }
      }
      console.log('Uploaded', rows.length, 'items to farm:', fId);
    }
  };

  const pullAndMerge = async (fId: string) => {
    const { data: remoteRows, error } = await supabase
      .from('farm_data')
      .select('*')
      .eq('farm_id', fId);

    if (error) throw error;
    if (!remoteRows || remoteRows.length === 0) return;

    const remoteEntries: SeedEntry[] = [];
    const remoteFields: Field[] = [];
    const remoteInventory: InventoryItem[] = [];
    const remoteUsage: InventoryUsage[] = [];

    remoteRows.forEach((row: { data_type: string; data: unknown }) => {
      const item = row.data as Record<string, unknown>;
      switch (row.data_type) {
        case 'entry':
          remoteEntries.push(item as unknown as SeedEntry);
          break;
        case 'field':
          remoteFields.push(item as unknown as Field);
          break;
        case 'inventory':
          remoteInventory.push(item as unknown as InventoryItem);
          break;
        case 'inventory_usage':
          remoteUsage.push(item as unknown as InventoryUsage);
          break;
      }
    });

    const mergedEntries = mergeById(data.entries, remoteEntries);
    const mergedFields = mergeById(data.fields, remoteFields);
    const mergedInventory = mergeById(data.inventory, remoteInventory);
    const mergedUsage = mergeUsageById(data.inventoryUsage, remoteUsage);

    await data.replaceAllData(mergedEntries, mergedFields, mergedInventory, mergedUsage);
    console.log('Pulled and merged data from farm:', fId);
  };

  function mergeById<T extends { id: string; updatedAt: string }>(local: T[], remote: T[]): T[] {
    const map = new Map<string, T>();
    local.forEach(item => map.set(item.id, item));
    remote.forEach(item => {
      const existing = map.get(item.id);
      if (!existing || new Date(item.updatedAt) >= new Date(existing.updatedAt)) {
        map.set(item.id, item);
      }
    });
    return Array.from(map.values());
  }

  function mergeUsageById(local: InventoryUsage[], remote: InventoryUsage[]): InventoryUsage[] {
    const map = new Map<string, InventoryUsage>();
    local.forEach(item => map.set(item.id, item));
    remote.forEach(item => {
      if (!map.has(item.id)) {
        map.set(item.id, item);
      }
    });
    return Array.from(map.values());
  }

  const performSync = useCallback(async () => {
    if (isSyncingRef.current || !farmIdRef.current) return;
    isSyncingRef.current = true;
    setIsSyncing(true);
    setSyncError(null);

    const fId = farmIdRef.current;
    try {
      const pendingDels = data.pendingDeletes;
      if (pendingDels.length > 0) {
        for (const delId of pendingDels) {
          await supabase
            .from('farm_data')
            .delete()
            .eq('id', delId)
            .eq('farm_id', fId);
        }
        await data.clearPendingDeletes();
        console.log('Processed', pendingDels.length, 'pending deletes');
      }

      await uploadAllData(fId);
      await pullAndMerge(fId);

      const now = new Date().toISOString();
      setLastSyncAt(now);
      await AsyncStorage.setItem(FARM_KEYS.LAST_SYNC, now);

      console.log('Sync completed at:', now);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Sync failed';
      console.error('Sync error:', msg);
      setSyncError(msg);
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, [data.entries, data.fields, data.inventory, data.inventoryUsage, data.pendingDeletes]);

  const deleteFarmById = useCallback(async (targetFarmId: string) => {
    const { error } = await supabase
      .from('farms')
      .delete()
      .eq('id', targetFarmId);
    if (error) throw error;

    if (targetFarmId === farmIdRef.current) {
      setFarmId(null);
      setFarmName('');
      setIsAdmin(false);
      setMembers([]);
      setLastSyncAt(null);
      await Promise.all([
        AsyncStorage.removeItem(FARM_KEYS.FARM_ID),
        AsyncStorage.removeItem(FARM_KEYS.FARM_NAME),
        AsyncStorage.removeItem(FARM_KEYS.IS_ADMIN),
        AsyncStorage.removeItem(FARM_KEYS.LAST_SYNC),
      ]);
    }
    console.log('Farm deleted:', targetFarmId);
  }, []);

  const forceDeleteAllInventory = useCallback(async () => {
    if (!farmIdRef.current) return;
    const fId = farmIdRef.current;

    await supabase
      .from('farm_data')
      .delete()
      .eq('farm_id', fId)
      .eq('data_type', 'inventory');

    await supabase
      .from('farm_data')
      .delete()
      .eq('farm_id', fId)
      .eq('data_type', 'inventory_usage');

    await data.replaceAllData(data.entries, data.fields, [], []);
    console.log('All inventory force deleted for farm:', fId);
  }, [data.entries, data.fields]);

  const purgeLocalAndResync = useCallback(async () => {
    if (!farmIdRef.current) return;
    const fId = farmIdRef.current;

    await data.replaceAllData([], [], [], []);
    await data.clearPendingDeletes();

    const { data: remoteRows, error } = await supabase
      .from('farm_data')
      .select('*')
      .eq('farm_id', fId);

    if (error) throw error;

    const entries: SeedEntry[] = [];
    const fields: Field[] = [];
    const inv: InventoryItem[] = [];
    const usage: InventoryUsage[] = [];

    (remoteRows || []).forEach((row: { data_type: string; data: unknown }) => {
      switch (row.data_type) {
        case 'entry': entries.push(row.data as unknown as SeedEntry); break;
        case 'field': fields.push(row.data as unknown as Field); break;
        case 'inventory': inv.push(row.data as unknown as InventoryItem); break;
        case 'inventory_usage': usage.push(row.data as unknown as InventoryUsage); break;
      }
    });

    await data.replaceAllData(entries, fields, inv, usage);

    const now = new Date().toISOString();
    setLastSyncAt(now);
    await AsyncStorage.setItem(FARM_KEYS.LAST_SYNC, now);

    console.log('Purged local and resynced from server');
  }, []);

  const getDebugInfo = useCallback(() => {
    return {
      farmId: farmIdRef.current,
      farmName,
      userName,
      deviceId,
      isAdmin,
      memberCount: members.length,
      lastSyncAt,
      syncError,
      entriesCount: data.entries.length,
      fieldsCount: data.fields.length,
      inventoryCount: data.inventory.length,
      usageCount: data.inventoryUsage.length,
      pendingDeletesCount: data.pendingDeletes.length,
      platform: Platform.OS,
      appVersion: '1.0.1',
    };
  }, [farmName, userName, deviceId, isAdmin, members.length, lastSyncAt, syncError, data.entries.length, data.fields.length, data.inventory.length, data.inventoryUsage.length, data.pendingDeletes.length]);

  return {
    farmId,
    farmName,
    userName,
    deviceId,
    isAdmin,
    members,
    isSyncing,
    lastSyncAt,
    syncError,
    isLoaded,
    createFarm,
    joinFarm,
    leaveFarm,
    removeMember,
    performSync,
    saveUserName,
    deleteFarmById,
    forceDeleteAllInventory,
    purgeLocalAndResync,
    getDebugInfo,
    refreshMembers,
  };
});
