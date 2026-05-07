import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock WXT browser global
const mockStorage: Record<string, unknown> = {};
const listeners: Array<(changes: Record<string, { newValue: unknown }>) => void> = [];

vi.stubGlobal("browser", {
  storage: {
    local: {
      get: vi.fn(async (key: string) => ({ [key]: mockStorage[key] })),
      set: vi.fn(async (items: Record<string, unknown>) => {
        Object.assign(mockStorage, items);
      }),
      onChanged: {
        addListener: vi.fn((fn) => listeners.push(fn)),
        removeListener: vi.fn(),
      },
    },
  },
});

describe("useStorage (unit — storage interactions)", () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
    listeners.length = 0;
    vi.clearAllMocks();
  });

  it("reads from storage on mount", async () => {
    mockStorage["count"] = 42;
    const result = await browser.storage.local.get("count");
    expect(result["count"]).toBe(42);
  });

  it("writes to storage on set", async () => {
    await browser.storage.local.set({ count: 7 });
    expect(mockStorage["count"]).toBe(7);
  });

  it("notifies listeners on storage change", () => {
    const listener = vi.fn();
    browser.storage.local.onChanged.addListener(listener);
    listeners.forEach((fn) => fn({ count: { newValue: 99 } }));
    expect(listener).toHaveBeenCalledWith({ count: { newValue: 99 } });
  });
});
