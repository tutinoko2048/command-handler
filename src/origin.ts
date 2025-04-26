import { Dimension } from '@minecraft/server';
import { CustomCommandSource } from '@minecraft/server';
import { Block, Player, Vector3 } from '@minecraft/server';
import { CustomCommandOrigin, Entity } from '@minecraft/server';

export class CommandOrigin {
  constructor(
    private readonly origin: CustomCommandOrigin
  ) {}

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

  isServer(): boolean {
    return this.origin.sourceType === CustomCommandSource.Server;
  }

  getLocation(throwIfInvalid: true): Vector3;
  getLocation(throwIfInvalid?: false): Vector3 | undefined;
  getLocation(throwIfInvalid = false): Vector3 | undefined {
    if (throwIfInvalid && this.isServer()) {
      throw new Error('Failed to get location from command origin');
    }
    const source = this.origin.initiator ?? this.origin.sourceEntity ?? this.origin.sourceBlock;
    return source?.location;
  }

  getDimension(throwIfInvalid: true): Dimension;
  getDimension(throwIfInvalid?: false): Dimension | undefined;
  getDimension(throwIfInvalid = false): Dimension | undefined {
    if (throwIfInvalid && this.isServer()) {
      throw new Error('Failed to get dimension from command origin');
    }
    const source = this.origin.initiator ?? this.origin.sourceEntity ?? this.origin.sourceBlock;
    return source?.dimension;
  }
}