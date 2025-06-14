import {
  world,
  BlockType,
  CommandPermissionLevel,
  CustomCommandOrigin,
  CustomCommandParameter,
  CustomCommandParamType,
  CustomCommandResult,
  CustomCommandSource,
  CustomCommandStatus,
  Entity,
  ItemType,
  Player,
  StartupEvent,
  system,
  Vector3,
} from '@minecraft/server';
import { BlockCommandOrigin, CommandOrigin, EntityCommandOrigin, NPCCommandOrigin, PlayerCommandOrigin, ServerCommandOrigin } from './origin';
import { CommandEnum } from './enum';
import { failure } from './utils';

type NamespacedString = `${string}:${string}`;

export type CustomPermission = CustomPermissionCallback | {
  permissionLevel?: CommandPermissionLevel;
  onVerify: CustomPermissionCallback;
}
export type CustomPermissionCallback = (origin: CommandOrigin) => boolean | { error: string };

export type Command = {
  name: NamespacedString;
  description: string;
  permissionLevel: CommandPermissionLevel;
  aliases?: string[];
} | {
  name: NamespacedString;
  description: string;
  permission: CustomPermission;
  aliases?: string[];
}

export interface ParamTypeMap {
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

export type CommandCallback<PARAMS extends CommandParams> = (
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
) => CustomCommandResult | CustomCommandStatus;

export interface CommandRegistrationData {
  command: Command;
  callback: CommandCallback<CommandParams>;
  params: CommandParams;
}

export class CommandHandler {
  public readonly commands = new Set<CommandRegistrationData>();
  public readonly enums = new Map<string, CommandEnum>();

  public readonly options = {
    /** Show output message even if `sendcommandfeedback` is set false */
    alwaysShowMessage: true,

    customPermissionError: 'You do not have permission to execute this command.',
  }

  constructor() {
    system.beforeEvents.startup.subscribe(this.onStartup.bind(this));
  }
  
  private onStartup(event: StartupEvent) {
    const registry = event.customCommandRegistry;

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
      
      // コマンドコールバック関数
      const commandCallback = (_origin: CustomCommandOrigin, ...params: any[]) => {
        let origin: CommandOrigin;
        switch (_origin.sourceType) {
          case CustomCommandSource.Server: origin = new ServerCommandOrigin(_origin); break;
          case CustomCommandSource.Entity:
            if (_origin.sourceEntity instanceof Player) {
              origin = new PlayerCommandOrigin(_origin);
            } else {
              origin = new EntityCommandOrigin(_origin);
            }
            break;
          case CustomCommandSource.Block:
            origin = new BlockCommandOrigin(_origin);
            break;
          case CustomCommandSource.NPCDialogue:
            origin = new NPCCommandOrigin(_origin);
            break;
          default:
            throw new Error(`Unknown command origin type: ${_origin.sourceType}`);
        }

        // permission check
        if ('permission' in command) {
          const onVerify = typeof command.permission === 'function'
            ? command.permission
            : command.permission.onVerify;
          const verifiedResult = onVerify(origin);
          if (verifiedResult !== true) {
            return failure(typeof verifiedResult === 'boolean' ? this.options.customPermissionError : verifiedResult.error);
          }
        }

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
        
        const result = callback(parsedParams as any, origin);

        const onResult = (r: CustomCommandResult) => {
          // send output message if `sendCommandFeedback` is set to false to always show the message to the player
          if (
            r.status === CustomCommandStatus.Success &&
            r.message &&
            this.options.alwaysShowMessage &&
            !world.gameRules.sendCommandFeedback &&
            origin instanceof PlayerCommandOrigin
          ) {
            origin.sendMessage('§r§f' + r.message);
          }
          
          return r;
        }

        return onResult(
          typeof result === 'number' ? { status: result } : result,
        );
      };

      let permissionLevel: CommandPermissionLevel;
      if ('permission' in command) { // CustomPermission
        if (typeof command.permission === 'function') {
          permissionLevel = CommandPermissionLevel.Any; // Custom callback permissions always use Any level
        } else {
          permissionLevel = command.permission.permissionLevel ?? CommandPermissionLevel.Any;
        }
      } else { // CommandPermissionLevel (vanilla)
        permissionLevel = command.permissionLevel;
      }
      
      // main command
      registry.registerCommand({
        name: command.name,
        description: command.description,
        permissionLevel,
        mandatoryParameters: mandatoryParams,
        optionalParameters: optionalParams,
      }, commandCallback);
      
      for (const alias of command.aliases ?? []) {
        registry.registerCommand({
          name: alias.includes(':') ? alias : `${command.name.split(':')[0]}:${alias}`,
          description: command.description,
          permissionLevel,
          mandatoryParameters: mandatoryParams,
          optionalParameters: optionalParams,
        }, commandCallback);
      }
    }
  }
  
  register<PARAMS extends CommandParams>(
    command: Command,
    callback: CommandCallback<PARAMS>,
    params: PARAMS,
  ): CommandRegistrationData {
    const data: CommandRegistrationData = { command, callback: callback as any, params };
    this.commands.add(data);
    return data;
  }

  createEnum<const T extends string[]>(
    name: NamespacedString,
    values: T,
  ): CommandEnum<T[number]>;
  createEnum<T extends Record<string, string | number>>(
    name: NamespacedString,
    values: T,
  ): CommandEnum<T[keyof T]>;
  createEnum(
    name: NamespacedString,
    values: string[] | Record<string, string | number>,
  ): CommandEnum {
    if (this.enums.has(name)) throw new Error(`Enum ${name} is already registered`);
    
    const enumValues = Array.isArray(values)
      ? Object.fromEntries(values.map((v) => [v, v]))
      : values;
    const commandEnum = new CommandEnum(name, enumValues);
    this.enums.set(name, commandEnum);
    
    return commandEnum;
  }
}

function enumKeys<T extends Record<string, string | number>>(e: T): (keyof T)[] {
  return Object.keys(e).filter((k) => isNaN(Number(k))) as (keyof T)[];
}

export const commandHandler = new CommandHandler();

export const createEnum = commandHandler.createEnum.bind(commandHandler);