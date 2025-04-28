type ExtractArray<T> = T extends (infer U)[] ? U : never;

export class CommandEnum<T extends string | number = string | number> {
  constructor(
    public readonly name: string,
    public readonly values: Record<string, T>,
  ) {}

  getValue(name: string) {
    const parsedValue = this.values[name];
    if (parsedValue === undefined) {
      throw new Error(`Invalid value "${name}" passed for enum "${this.name}"`);
    }
    return parsedValue;
  }

  static createEnum<const T extends string[]>(
    name: `${string}:${string}`,
    values: T,
  ): CommandEnum<ExtractArray<T>>;
  static createEnum<T extends Record<string, string | number>>(
    name: `${string}:${string}`,
    values: T,
  ): CommandEnum<T[keyof T]>;
  static createEnum(
    name: `${string}:${string}`,
    values: string | Record<string, string | number>,
  ): CommandEnum {
    if (Array.isArray(values)) {
      return new CommandEnum(name, Object.fromEntries(values.map((v) => [v, v])));
    } else {
      return new CommandEnum(name, values as Record<string, string | number>);
    }
  }
}

export const createEnum = CommandEnum.createEnum;
