import Dexie, { type EntityTable } from 'dexie';
import type {
  Adventure,
  AdventureDiaryEntry,
  Badge,
  Continent,
  EncounterRecord,
  Monster,
  PlayerInventory,
  Sticker,
  Trainer,
} from '../types';

class PokemonDatabase extends Dexie {
  monsters!: EntityTable<Monster, 'id'>;
  trainers!: EntityTable<Trainer, 'id'>;
  adventures!: EntityTable<Adventure, 'id'>;
  continents!: EntityTable<Continent, 'id'>;
  inventory!: EntityTable<PlayerInventory, 'id'>;
  encounters!: EntityTable<EncounterRecord, 'id'>;
  badges!: EntityTable<Badge, 'id'>;
  stickers!: EntityTable<Sticker, 'id'>;
  diaryEntries!: EntityTable<AdventureDiaryEntry, 'id'>;

  constructor() {
    super('PokemonAdventureDB');

    this.version(4).stores({
      monsters: '++id, name, element, createdBy, createdAt',
      trainers: '++id, name, createdAt',
      adventures: '++id, continentId, completedAt',
      continents: '++id, name, element, completed',
      inventory: '++id, trainerId',
      encounters: '++id, monsterName, encounteredAt',
    });

    this.version(5).stores({
      monsters: '++id, name, element, createdBy, createdAt',
      trainers: '++id, name, createdAt',
      adventures: '++id, continentId, completedAt',
      continents: '++id, name, element, completed',
      inventory: '++id, trainerId',
      encounters: '++id, monsterName, encounteredAt',
      badges: '++id, trainerId, continentId, earnedAt',
      stickers: '++id, trainerId, stickerId, continentId, earnedAt',
      diaryEntries: '++id, trainerId, continentId, createdAt',
    });
  }
}

export const db = new PokemonDatabase();
