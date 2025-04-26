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
}