import { describe, expect, it, vi } from "vitest";
import {
  saveHomeContent,
  type HomeContentDeps,
} from "@/lib/admin/home/service";
import { DEFAULT_HOME_CONTENT } from "@/lib/home/content";

describe("saveHomeContent", () => {
  it("hace upsert del singleton con el contenido", async () => {
    const upsert = vi.fn().mockResolvedValue({});
    const deps = {
      db: { homeContent: { upsert } },
    } as unknown as HomeContentDeps;
    await saveHomeContent(DEFAULT_HOME_CONTENT, deps);
    expect(upsert).toHaveBeenCalledWith({
      where: { id: "default" },
      create: { id: "default", content: DEFAULT_HOME_CONTENT },
      update: { content: DEFAULT_HOME_CONTENT },
    });
  });
});
