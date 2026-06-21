import Dexie, { type EntityTable } from 'dexie';
import type { Monster, Trainer, Adventure, Continent, PlayerInventory, EncounterRecord } from '../types';

class PokemonDatabase extends Dexie {
  monsters!: EntityTable<Monster, 'id'>;
  trainers!: EntityTable<Trainer, 'id'>;
  adventures!: EntityTable<Adventure, 'id'>;
  continents!: EntityTable<Continent, 'id'>;
  inventory!: EntityTable<PlayerInventory, 'id'>;
  encounters!: EntityTable<EncounterRecord, 'id'>;

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
  }
}

export const db = new PokemonDatabase();
