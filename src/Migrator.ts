import { DatabaseConnection } from "./DatabaseConnection";

export interface Kit {
  Name: string;
  Items: Item[];
  Cooldown: number;
  Cost: number;
}

interface Item {
  Id?: number;
  Vehicle?: number;
  Xp?: number;
  Amount?: number;
  FireMode?: "SAFETY" | "SEMI" | "AUTO" | "BURST";
  Ammo?: number;
  Barrel?: Attachment;
  Sight?: Attachment;
  Grip?: Attachment;
  Tactical?: Attachment;
  Magazine?: Attachment;
}

interface Attachment {
  AttachmentId: number;
}

export class Migrator {
  firemodeMap: { [key: string]: number } = {
    "SAFETY": 0,
    "SEMI": 1,
    "AUTO": 2,
    "BURST": 3
  };

  constructor(readonly db: DatabaseConnection, readonly kitsTable: string, readonly kitsModifiedTable: string) { }

  async migrate({ Name: name, Items: items, Cooldown: cooldown, Cost: cost }: Kit) {
    const content = new Map<string, number>();

    for (const item of items) {
      const { key, value = 1 } = await this.migrateItem(name, item);
      const newValue = content.has(key) ? content.get(key)! + value : value;

      content.set(key, newValue);
    }

    await this.db.query(
      `INSERT IGNORE INTO ${this.kitsTable} VALUES(?, NULL, ?, DEFAULT, ?, ?);`, 
      name, 
      Array.from(content).map(([k, v]) => v === 1 ? k : `${k}/${v}`).join(" "), 
      cost ?? 0, 
      cooldown ?? 0
    );
  }

  async migrateItem(kitName: string, item: Item): Promise<{ key: string, value?: number }> {
    const { Id: id, Vehicle: vehicle, Xp: xp, Amount: amount, FireMode: firemode, Ammo: ammo } = item;

    if (vehicle !== undefined)
      return { key: `v.${vehicle}` };
    
    if (xp !== undefined)
      return { key: `xp.${xp}` };
    
    if (firemode !== undefined || ammo !== undefined) {
      const name = `m.${await this.migrateModifiedItem(kitName, item)}`;
      return { key: name, value: amount };
    }
    
    return { key: String(id), value: amount };
  }

  async migrateModifiedItem(kitName: string, item: Item) {
    const { Id: id, FireMode: firemode, Ammo: ammo, Barrel: barrel, Sight: sight, Grip: grip, Tactical: tactical, Magazine: magazine } = item;
    const key = `${kitName}-${id}`;

    await this.db.query(
      `INSERT IGNORE INTO ${this.kitsModifiedTable} VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?);`, 
      key, 
      id, 
      ammo, 
      sight?.AttachmentId ?? 0, 
      tactical?.AttachmentId ?? 0, 
      grip?.AttachmentId ?? 0, 
      barrel?.AttachmentId ?? 0, 
      magazine?.AttachmentId ?? 0, 
      firemode ? this.firemodeMap[firemode] : 0
    );

    return key;
  }
}