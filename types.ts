export enum AssetStatus {
  PENDING = 'PENDING',
  FOUND = 'FOUND',
  EXTRA = 'EXTRA', // Found but not in original list
}

export interface Asset {
  id: string;
  name: string;
  barcode: string;
  serialNumber?: string;
  location?: string;
  status: AssetStatus;
  photoUrl?: string; // Base64 data URI
  scanTimestamp?: number;
  notes?: string;
}

export interface InventoryStats {
  total: number;
  found: number;
  pending: number;
  extra: number;
  completionRate: number;
}

export type AppStep = 'IMPORT' | 'AUDIT' | 'EXPORT';
