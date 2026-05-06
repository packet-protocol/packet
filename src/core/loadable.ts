export type LoadState = "idle" | "loading" | "loaded" | "error";

export abstract class LoadableClient<T> {
    protected data?: T;
    protected loadState: LoadState = "idle";
    protected lastError?: unknown;

    get Loaded(): boolean {
        return this.loadState === "loaded";
    }

    get Loading(): boolean {
        return this.loadState === "loading";
    }

    get State(): LoadState {
        return this.loadState;
    }

    get Data(): T {
        if (!this.data) {
            throw new Error(`${this.constructor.name} is not loaded`);
        }

        return this.data;
    }

    async load(force = false): Promise<this> {
        if (this.loadState === "loaded" && !force) {
            return this;
        }

        this.loadState = "loading";

        try {
            this.data = await this.fetch();
            this.loadState = "loaded";
            this.lastError = undefined;
            return this;
        } catch (err) {
            this.loadState = "error";
            this.lastError = err;
            throw err;
        }
    }

    async refresh(): Promise<this> {
        return this.load(true);
    }

    async ensureLoaded(): Promise<T> {
        await this.load();
        return this.Data;
    }

    protected abstract fetch(): Promise<T>;
}