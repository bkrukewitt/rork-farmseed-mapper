export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface SeedEntry {
  id: string;
  photos: string[];
  coordinates: Coordinates;
  producer: string;
  varietyName: string;
  lotNumber: string;
  plantingDate: string;
  rate: string;
  traits: string[];
  treatments: string[];
  germinationPercent: string;
  notes: string;
  fieldName: string;
  mapLabel: string;
  entryDate?: string; // Date when entry was created (YYYY-MM-DD) - optional for backward compatibility
  entryTime?: string; // Time when entry was created (HH:MM:SS) - optional for backward compatibility
  createdAt: string;
  updatedAt: string;
}

export interface Field {
  id: string;
  name: string;
  coordinates: Coordinates;
  acreage: string;
  cropType: string;
  notes: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export type TraitOption = 
  | 'Roundup Ready'
  | 'Liberty Link'
  | 'Enlist'
  | 'Xtend'
  | 'XtendFlex'
  | 'GT27'
  | 'Trecepta'
  | 'VT Double Pro'
  | 'SmartStax'
  | 'Viptera'
  | 'Other';

export type TreatmentOption =
  | 'Cruiser'
  | 'Poncho'
  | 'Gaucho'
  | 'Acceleron'
  | 'Lumisena'
  | 'Saltro'
  | 'ILeVO'
  | 'Other';

export const TRAIT_OPTIONS: TraitOption[] = [
  'Roundup Ready',
  'Liberty Link',
  'Enlist',
  'Xtend',
  'XtendFlex',
  'GT27',
  'Trecepta',
  'VT Double Pro',
  'SmartStax',
  'Viptera',
  'Other',
];

export const TREATMENT_OPTIONS: TreatmentOption[] = [
  'Cruiser',
  'Poncho',
  'Gaucho',
  'Acceleron',
  'Lumisena',
  'Saltro',
  'ILeVO',
  'Other',
];

export const PRODUCER_OPTIONS = [
  'Pioneer',
  'Bayer/DeKalb',
  'Asgrow',
  'Beck\'s',
  'Channel',
  'Golden Harvest',
  'NK',
  'LG Seeds',
  'Stine',
  'Wyffels',
  'Other',
];

export type InventoryUnit = 'bags' | 'boxes' | 'units';

export const INVENTORY_UNIT_OPTIONS: InventoryUnit[] = ['bags', 'boxes', 'units'];

export interface InventoryItem {
  id: string;
  name: string;
  producer: string;
  varietyName: string;
  lotNumber: string;
  traits: string[];
  treatments: string[];
  quantity: number;
  unit: InventoryUnit;
  seedsPerUnit: number;
  germinationPercent: string;
  purchaseDate: string;
  expirationDate: string;
  notes: string;
  imageUri?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryUsage {
  id: string;
  inventoryItemId: string;
  entryId: string;
  quantityUsed: number;
  usedAt: string;
}
