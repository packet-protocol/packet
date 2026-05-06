export class ClientCache<TKey, TValue> {
    private readonly map = new Map<string, TValue>();

    constructor(
        private readonly keyToString: (key: TKey) => string = String,
    ) {}

    get(key: TKey): TValue | undefined {
        return this.map.get(this.keyToString(key));
    }

    set(key: TKey, value: TValue): TValue {
        this.map.set(this.keyToString(key), value);
        return value;
    }

    getOrCreate(key: TKey, factory: () => TValue): TValue {
        const existing = this.get(key);

        if (existing) {
            return existing;
        }

        return this.set(key, factory());
    }

    clear() {
        this.map.clear();
    }

    values(): TValue[] {
        return [...this.map.values()];
    }
}