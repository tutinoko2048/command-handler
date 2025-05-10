import { CustomCommandResult, CustomCommandStatus } from '@minecraft/server';

export const success: (message?: string) => CustomCommandResult = (message) => ({ status: CustomCommandStatus.Success, message });
export const failure: (message?: string) => CustomCommandResult = (message) => ({ status: CustomCommandStatus.Failure, message });
