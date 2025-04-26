import {
  BlockType,
  CommandPermissionLevel,
  CustomCommandParameter,
  CustomCommandParamType,
  CustomCommandRegistry,
  CustomCommandResult,
  CustomCommandStatus,
  Entity,
  ItemType,
  Player,
  Vector3
} from '@minecraft/server';
import { CommandOrigin } from './origin';
import { CommandEnum } from './enum';

interface Command {
  name: `${string}:${string}`;
  description: string;
  permissionLevel: CommandPermissionLevel;
}

interface ParamTypeMap {
  [CustomCommandParamType.Boolean]: boolean;
  [CustomCommandParamType.Integer]: number;
  [CustomCommandParamType.Float]: number;
  [CustomCommandParamType.String]: string;
  [CustomCommandParamType.EntitySelector]: Entity[];
  [CustomCommandParamType.PlayerSelector]: Player[];
  [CustomCommandParamType.Location]: Vector3;
  [CustomCommandParamType.BlockType]: BlockType;
  [CustomCommandParamType.ItemType]: ItemType;
}

type ParamType = CommandEnum | keyof ParamTypeMap;

type CommandParams = Record<string, ParamType | [ParamType]>;

type GetParamValue<T extends ParamType> = T extends CommandEnum<infer V>
  ? V
  : T extends keyof ParamTypeMap
    ? ParamTypeMap[T]
    : never;

type CommandCallback<PARAMS extends CommandParams> = (
  params: {
    [K in keyof PARAMS]: PARAMS[K] extends [infer T]
      ? T extends ParamType
        ? GetParamValue<T> | undefined
        : never
      : PARAMS[K] extends ParamType
        ? GetParamValue<PARAMS[K]>
        : never;
  },
  origin: CommandOrigin,
) => CustomCommandResult;

interface CommandRegistrationData {
  command: Command;
  callback: CommandCallback<CommandParams>;
  params: CommandParams;
}

export class CommandHandler {
  private readonly commands = new Set<CommandRegistrationData>();
  private readonly enums = new Map<string, CommandEnum>();
  
  onStartup(registry: CustomCommandRegistry) {
    // Register all enums first
    for (const { name, values } of this.enums.values()) {
      registry.registerEnum(name, enumKeys(values));
    }
    
    // Register all commands
    for (const { command, callback, params } of this.commands) {
      const paramEntries = Object.entries(params);
      const mandatoryParams: CustomCommandParameter[] = [];
      const optionalParams: CustomCommandParameter[] = [];

      let optionalRegistered = false;

      for (const [key, paramType] of paramEntries) {
        const isOptional = Array.isArray(paramType);
        const param = isOptional ? paramType[0] : paramType;
        const paramList = isOptional ? optionalParams : mandatoryParams;

        if (param instanceof CommandEnum) {
          if (this.enums.has(param.name)) throw new Error(`Enum ${param.name} is already registered`);
          this.enums.set(param.name, param);
          paramList.push({ name: param.name, type: CustomCommandParamType.Enum });
        } else {
          paramList.push({ name: key, type: param });
        }
        
        if (isOptional && !optionalRegistered) {
          optionalRegistered = true;
        } else if (!isOptional && optionalRegistered) {
          throw new Error(`Mandatory parameters must be registered before optional ones`);
        }
      }
      
      registry.registerCommand({
        name: command.name,
        description: command.description,
        permissionLevel: command.permissionLevel,
        mandatoryParameters: mandatoryParams,
        optionalParameters: optionalParams,
      }, (origin, ...params) => {
        const parsedParams: Record<string, any> = {};
        
        for (const [i, paramInput] of params.entries()) {
          const paramEntry = paramEntries[i];
          if (!paramEntry) throw new Error(`Invalid parameter provided at [${i}]: ${paramInput}`);

          const [key, paramType] = paramEntry;
          if (paramType instanceof CommandEnum) {
            parsedParams[key] = paramType.getValue(paramInput);
          } else {
            parsedParams[key] = paramInput;
          }
        }
        
        return callback(
          parsedParams as any, 
          new CommandOrigin(origin)
        );
      });
    }
  }
  
  register<PARAMS extends CommandParams>(
    command: Command,
    callback: CommandCallback<PARAMS>,
    params: PARAMS,
  ): CustomCommandResult | CustomCommandStatus {
    throw new Error('not implemented'); //TODO - implement this method
  }
}

function enumKeys<T extends Record<string, string | number>>(e: T): (keyof T)[] {
  return Object.keys(e).filter((k) => isNaN(Number(k))) as (keyof T)[];
}

type ExtractArray<T> = T extends (infer U)[] ? U : never;

export function createEnum<const T extends string[]>(
  name: `${string}:${string}`,
  values: T,
): CommandEnum<ExtractArray<T>>;
export function createEnum<T extends Record<string, string | number>>(
  name: `${string}:${string}`,
  values: T,
): CommandEnum<T[keyof T]>;
export function createEnum(
  name: `${string}:${string}`,
  values: string | Record<string, string | number>,
): CommandEnum {
  if (Array.isArray(values)) {
    return new CommandEnum(name, Object.fromEntries(values.map((v) => [v, v])));
  } else {
    return new CommandEnum(name, values as Record<string, string | number>);
  }
}

export const commandHandler = new CommandHandler();
