function getAllPropertyNames(target: object): string[] {
  const names = new Set<string>();
  let cursor: object | null = target;

  while (cursor && cursor !== Object.prototype) {
    for (const name of Object.getOwnPropertyNames(cursor)) {
      if (name !== 'constructor') {
        names.add(name);
      }
    }
    cursor = Object.getPrototypeOf(cursor);
  }

  return [...names];
}

export function flattenActions<TAction>(instances: object[]): TAction {
  const merged: Record<string, unknown> = {};

  for (const instance of instances) {
    for (const name of getAllPropertyNames(instance)) {
      const descriptor = Object.getOwnPropertyDescriptor(instance, name)
        || Object.getOwnPropertyDescriptor(Object.getPrototypeOf(instance), name);
      if (!descriptor || typeof descriptor.value !== 'function') continue;
      merged[name] = descriptor.value.bind(instance);
    }
  }

  return merged as TAction;
}
