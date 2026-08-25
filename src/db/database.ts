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
import { ALL_WILD_MONSTERS } from '../game/wildMonsters';

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

    this.version(6).stores({
      monsters: '++id, trainerId, name, element, createdBy, createdAt',
      trainers: '++id, name, createdAt',
      adventures: '++id, trainerId, continentId, completedAt',
      continents: '++id, name, element, completed',
      inventory: '++id, trainerId',
      encounters: '++id, trainerId, monsterName, encounteredAt',
      badges: '++id, trainerId, continentId, earnedAt',
      stickers: '++id, trainerId, stickerId, continentId, earnedAt',
      diaryEntries: '++id, trainerId, continentId, createdAt',
    });
  }
}

export const db = new PokemonDatabase();

/**
 * Versions before 1.1.2 stored monsters in one shared list. A monster can be
 * safely adopted only when exactly one existing trainer already references it.
 * Anything ambiguous stays unowned and is hidden instead of leaking data.
 */
export async function migrateLegacyMonsterOwnership() {
  await db.transaction('rw', db.trainers, db.monsters, db.encounters, async () => {
    const [trainers, monsters, encounters] = await Promise.all([
      db.trainers.toArray(),
      db.monsters.toArray(),
      db.encounters.toArray(),
    ]);

    const knownDualElements = new Map(
      ALL_WILD_MONSTERS
        .filter((config) => (config.monster.elements?.length ?? 0) > 1)
        .map((config) => [config.monster.name, config.monster.elements!])
    );

    for (const monster of monsters) {
      if (monster.id === undefined) continue;
      const update: Partial<Monster> = {};
      if (monster.trainerId === undefined) {
        const owners = trainers.filter(
          (trainer) => trainer.id !== undefined && trainer.monsterIds.includes(monster.id!)
        );
        if (owners.length === 1 && owners[0].id !== undefined) {
          update.trainerId = owners[0].id;
        }
      }
      const elements = knownDualElements.get(monster.name);
      if (elements && (monster.elements?.length ?? 0) < 2) {
        update.elements = elements;
      }
      if (Object.keys(update).length > 0) {
        await db.monsters.update(monster.id, update);
      }
    }

    for (const encounter of encounters) {
      if (encounter.id === undefined || (encounter.monsterElements?.length ?? 0) >= 2) continue;
      const elements = knownDualElements.get(encounter.monsterName);
      if (elements) await db.encounters.update(encounter.id, { monsterElements: elements });
    }
  });
}
