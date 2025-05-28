import { Dimension } from '@minecraft/server';
import { CustomCommandSource } from '@minecraft/server';
import { Block, Player, Vector3 } from '@minecraft/server';
import { CustomCommandOrigin, Entity } from '@minecraft/server';

export abstract class CommandOrigin {
  constructor(
    protected readonly origin: CustomCommandOrigin
  ) {}

  abstract getName(): string;

  getEntity(throwIfInvalid: true): Entity;
  getEntity(throwIfInvalid?: false): Entity | undefined;
  getEntity(throwIfInvalid = false): Entity | undefined {
    const entity = this.origin.sourceEntity;
    if (throwIfInvalid && !entity) {
      throw new Error('Failed to get entity from command origin');
    }
    return entity;
  }

  getPlayer(throwIfInvalid: true): Player;
  getPlayer(throwIfInvalid?: false): Player | undefined;
  getPlayer(throwIfInvalid = false): Player | undefined {
    const player = this.getEntity(throwIfInvalid as any);
    if (player instanceof Player) {
      return player;
    } else {
      if (throwIfInvalid) {
        throw new Error('Failed to get player from command origin');
      } else {
        return undefined;
      }
    }
  }

  getBlock(throwIfInvalid: true): Block;
  getBlock(throwIfInvalid?: false): Block | undefined;
  getBlock(throwIfInvalid = false): Block | undefined {
    const block = this.origin.sourceBlock;
    if (throwIfInvalid && !block) {
      throw new Error('Failed to get block from command origin');
    }
    return block;
  }

  getInitiator(throwIfInvalid: true): Entity;
  getInitiator(throwIfInvalid?: false): Entity | undefined;
  getInitiator(throwIfInvalid = false): Entity | undefined {
    const entity = this.origin.initiator;
    if (throwIfInvalid && !entity) {
      throw new Error('Failed to get initiator from command origin');
    }
    return entity;
  }

  isServer(): this is ServerCommandOrigin {
    return this.origin.sourceType === CustomCommandSource.Server;
  }

  isPlayer(): this is PlayerCommandOrigin {
    return !!this.getPlayer();
  }

  isSendable(): this is SendableOrigin {
    return this.isServer() || this.isPlayer();
  }

  isLocatable(): this is LocatableOrigin {
    return !!this.getEntity() || !!this.getBlock();
  }
}

interface SendableOrigin {
  sendMessage(message: string): void;
}

interface LocatableOrigin {
  getLocation(throwIfInvalid: boolean): Vector3 | undefined;
  getDimension(throwIfInvalid: boolean): Dimension | undefined;
}

export class ServerCommandOrigin extends CommandOrigin implements SendableOrigin {
  getName(): string {
    return 'Server';
  }
  
  sendMessage(message: string): void {
    console.log(message);
  }
}

export class BlockCommandOrigin extends CommandOrigin implements LocatableOrigin {
  getName(): string {
    return 'Block'
  }
  
  getLocation(): Vector3 {
    return this.getBlock(true).location;
  }

  getDimension(): Dimension {
    return this.getBlock(true).dimension;
  }
}

export class EntityCommandOrigin extends CommandOrigin implements LocatableOrigin {
  getName(): string {
    return this.getEntity(true).nameTag || 'Entity';
  }

  getLocation(): Vector3 {
    return this.getEntity(true).location;
  }

  getDimension(): Dimension {
    return this.getEntity(true).dimension;
  }
}

export class NPCCommandOrigin extends EntityCommandOrigin {
  getName(): string {
    return this.getEntity(true).nameTag || 'NPC';
  }
}

export class PlayerCommandOrigin extends EntityCommandOrigin implements SendableOrigin {
  getName(): string {
    return this.getPlayer(true).name;
  }
  
  sendMessage(message: string): void {
    const player = this.getPlayer(true);
    player.sendMessage(message);
  }
}