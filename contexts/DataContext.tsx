import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { SeedEntry, Field, InventoryItem, InventoryUsage } from '@/types';

const STORAGE_KEYS = {
  ENTRIES: 'farmseed_entries',
  FIELDS: 'farmseed_fields',
  INVENTORY: 'farmseed_inventory',
  INVENTORY_USAGE: 'farmseed_inventory_usage',
};

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export const [DataProvider, useData] = createContextHook(() => {
  const [entries, setEntries] = useState<SeedEntry[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [inventoryUsage, setInventoryUsage] = useState<InventoryUsage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      console.log('Loading data from AsyncStorage...');
      const [entriesData, fieldsData, inventoryData, usageData] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.ENTRIES),
        AsyncStorage.getItem(STORAGE_KEYS.FIELDS),
        AsyncStorage.getItem(STORAGE_KEYS.INVENTORY),
        AsyncStorage.getItem(STORAGE_KEYS.INVENTORY_USAGE),
      ]);

      if (entriesData) setEntries(JSON.parse(entriesData));
      if (fieldsData) setFields(JSON.parse(fieldsData));
      if (inventoryData) setInventory(JSON.parse(inventoryData));
      if (usageData) setInventoryUsage(JSON.parse(usageData));
      
      console.log('Data loaded successfully');
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveEntries = async (newEntries: SeedEntry[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(newEntries));
      setEntries(newEntries);
    } catch (error) {
      console.error('Error saving entries:', error);
    }
  };

  const saveFields = async (newFields: Field[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.FIELDS, JSON.stringify(newFields));
      setFields(newFields);
    } catch (error) {
      console.error('Error saving fields:', error);
    }
  };

  const addEntry = useCallback((entry: Omit<SeedEntry, 'id' | 'createdAt' | 'updatedAt' | 'entryDate' | 'entryTime'>) => {
    const now = new Date();
    const nowISO = now.toISOString();
    const entryDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const entryTime = now.toTimeString().split(' ')[0]; // HH:MM:SS
    const newEntry: SeedEntry = {
      ...entry,
      id: generateId(),
      entryDate,
      entryTime,
      createdAt: nowISO,
      updatedAt: nowISO,
    };
    const newEntries = [...entries, newEntry];
    saveEntries(newEntries);
    console.log('Entry added:', newEntry.id);
    return newEntry;
  }, [entries]);

  const updateEntry = useCallback((id: string, updates: Partial<SeedEntry>) => {
    const newEntries = entries.map(entry =>
      entry.id === id
        ? { ...entry, ...updates, updatedAt: new Date().toISOString() }
        : entry
    );
    saveEntries(newEntries);
    console.log('Entry updated:', id);
  }, [entries]);

  const deleteEntry = useCallback((id: string) => {
    const newEntries = entries.filter(entry => entry.id !== id);
    saveEntries(newEntries);
    console.log('Entry deleted:', id);
  }, [entries]);

  const addField = useCallback((field: Omit<Field, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newField: Field = {
      ...field,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };
    const newFields = [...fields, newField];
    saveFields(newFields);
    console.log('Field added:', newField.id);
    return newField;
  }, [fields]);

  const addMultipleFields = useCallback((fieldList: Omit<Field, 'id' | 'createdAt' | 'updatedAt'>[]) => {
    const now = new Date().toISOString();
    const newFieldsList: Field[] = fieldList.map(field => ({
      ...field,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    }));
    const newFields = [...fields, ...newFieldsList];
    saveFields(newFields);
    console.log('Multiple fields added:', newFieldsList.length);
    return newFieldsList;
  }, [fields]);

  const updateField = useCallback((id: string, updates: Partial<Field>) => {
    const newFields = fields.map(field =>
      field.id === id
        ? { ...field, ...updates, updatedAt: new Date().toISOString() }
        : field
    );
    saveFields(newFields);
    console.log('Field updated:', id);
  }, [fields]);

  const deleteField = useCallback((id: string) => {
    const newFields = fields.filter(field => field.id !== id);
    saveFields(newFields);
    console.log('Field deleted:', id);
  }, [fields]);

  const getEntryById = useCallback((id: string) => {
    return entries.find(entry => entry.id === id);
  }, [entries]);

  const getFieldById = useCallback((id: string) => {
    return fields.find(field => field.id === id);
  }, [fields]);

  const saveInventory = async (newInventory: InventoryItem[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(newInventory));
      setInventory(newInventory);
    } catch (error) {
      console.error('Error saving inventory:', error);
    }
  };

  const saveInventoryUsage = async (newUsage: InventoryUsage[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.INVENTORY_USAGE, JSON.stringify(newUsage));
      setInventoryUsage(newUsage);
    } catch (error) {
      console.error('Error saving inventory usage:', error);
    }
  };

  const addInventoryItem = useCallback((item: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newItem: InventoryItem = {
      ...item,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };
    const newInventory = [...inventory, newItem];
    saveInventory(newInventory);
    console.log('Inventory item added:', newItem.id);
    return newItem;
  }, [inventory]);

  const addMultipleInventoryItems = useCallback((items: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>[]) => {
    const now = new Date().toISOString();
    const newItems: InventoryItem[] = items.map(item => ({
      ...item,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    }));
    const newInventory = [...inventory, ...newItems];
    saveInventory(newInventory);
    console.log('Multiple inventory items added:', newItems.length);
    return newItems;
  }, [inventory]);

  const updateInventoryItem = useCallback((id: string, updates: Partial<InventoryItem>) => {
    const newInventory = inventory.map(item =>
      item.id === id
        ? { ...item, ...updates, updatedAt: new Date().toISOString() }
        : item
    );
    saveInventory(newInventory);
    console.log('Inventory item updated:', id);
  }, [inventory]);

  const deleteInventoryItem = useCallback((id: string) => {
    const newInventory = inventory.filter(item => item.id !== id);
    saveInventory(newInventory);
    console.log('Inventory item deleted:', id);
  }, [inventory]);

  const getInventoryItemById = useCallback((id: string) => {
    return inventory.find(item => item.id === id);
  }, [inventory]);

  const consumeInventory = useCallback((inventoryItemId: string, entryId: string, quantityUsed: number) => {
    const item = inventory.find(i => i.id === inventoryItemId);
    if (!item) {
      console.error('Inventory item not found:', inventoryItemId);
      return false;
    }

    if (item.quantity < quantityUsed) {
      console.error('Insufficient inventory:', item.quantity, 'available,', quantityUsed, 'requested');
      return false;
    }

    const newQuantity = item.quantity - quantityUsed;
    updateInventoryItem(inventoryItemId, { quantity: newQuantity });

    const usage: InventoryUsage = {
      id: generateId(),
      inventoryItemId,
      entryId,
      quantityUsed,
      usedAt: new Date().toISOString(),
    };
    const newUsage = [...inventoryUsage, usage];
    saveInventoryUsage(newUsage);
    console.log('Inventory used:', quantityUsed, item.unit, 'of', item.name);
    return true;
  }, [inventory, inventoryUsage, updateInventoryItem]);

  const getUsageForItem = useCallback((inventoryItemId: string) => {
    return inventoryUsage.filter(u => u.inventoryItemId === inventoryItemId);
  }, [inventoryUsage]);

  const getTotalUsedForItem = useCallback((inventoryItemId: string) => {
    return inventoryUsage
      .filter(u => u.inventoryItemId === inventoryItemId)
      .reduce((sum, u) => sum + u.quantityUsed, 0);
  }, [inventoryUsage]);

  return {
    entries,
    fields,
    inventory,
    inventoryUsage,
    isLoading,
    addEntry,
    updateEntry,
    deleteEntry,
    addField,
    addMultipleFields,
    updateField,
    deleteField,
    getEntryById,
    getFieldById,
    addInventoryItem,
    addMultipleInventoryItems,
    updateInventoryItem,
    deleteInventoryItem,
    getInventoryItemById,
    consumeInventory,
    getUsageForItem,
    getTotalUsedForItem,
  };
});

export function useFilteredEntries(search: string) {
  const { entries } = useData();
  return useMemo(() => {
    if (!search.trim()) return entries;
    const lower = search.toLowerCase();
    return entries.filter(
      entry =>
        entry.varietyName.toLowerCase().includes(lower) ||
        entry.producer.toLowerCase().includes(lower) ||
        entry.fieldName.toLowerCase().includes(lower) ||
        (entry.mapLabel && entry.mapLabel.toLowerCase().includes(lower))
    );
  }, [entries, search]);
}
