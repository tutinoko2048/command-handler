import {
  CustomCommandParamType,
  CommandPermissionLevel,
  CustomCommandStatus,
} from '@minecraft/server';
import { commandHandler, createEnum } from './src';

enum NumberEnum {
  A = 1,
  B = 2,
  C = 3,
}

commandHandler.register({
  name: 'tn:a',
  description: 'desc',
  permissionLevel: CommandPermissionLevel.Any,
}, (params, origin) => {
  const player = origin.getPlayer(true);
  params.n // number
  params.aaa // "a" | "b"
  params.bbb // NumberEnum (1 | 2 | 3)
  params.text // string | undefined
  params.location // Vector3 | undefined

  return {
    status: CustomCommandStatus.Success,
  }
}, {
  n: CustomCommandParamType.Integer,
  aaa: createEnum('test:enum1', ['a', 'b']),
  bbb: createEnum('test:enum2', NumberEnum),
  text: [CustomCommandParamType.String],
  location: [CustomCommandParamType.Location],
});
