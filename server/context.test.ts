import { beforeEach, describe, expect, it, vi } from "vitest";
import { SCHEDULE_PROFILE_HEADER } from "../shared/const";

const {
  getUserByOpenIdMock,
  upsertUserMock,
  verifySessionMock,
  authenticateRequestMock,
} = vi.hoisted(() => ({
  getUserByOpenIdMock: vi.fn(),
  upsertUserMock: vi.fn(),
  verifySessionMock: vi.fn(),
  authenticateRequestMock: vi.fn(),
}));

vi.mock("./db", () => ({
  getUserByOpenId: getUserByOpenIdMock,
  upsertUser: upsertUserMock,
}));

vi.mock("./_core/env", () => ({
  ENV: {
    oAuthServerUrl: "",
    isProduction: false,
    ownerOpenId: "",
    localLoginUsername: "admin",
    localLoginPassword: "sonhen",
    localSessionAppId: "local-auth",
  },
}));

vi.mock("./_core/sdk", () => ({
  sdk: {
    authenticateRequest: authenticateRequestMock,
    verifySession: verifySessionMock,
  },
}));

import { createContext } from "./_core/context";

describe("createContext", () => {
  beforeEach(() => {
    getUserByOpenIdMock.mockReset();
    upsertUserMock.mockReset();
    verifySessionMock.mockReset();
    authenticateRequestMock.mockReset();
    upsertUserMock.mockResolvedValue(undefined);
    getUserByOpenIdMock.mockResolvedValue(null);
    verifySessionMock.mockResolvedValue(null);
  });

  it("requires login before exposing the local admin user", async () => {
    const context = await createContext({
      req: { headers: {} },
      res: {},
    } as any);

    expect(context.scheduleProfileId).toBe(1);
    expect(context.user).toBeNull();
  });

  it("keeps the explicit schedule profile header when it is provided", async () => {
    const context = await createContext({
      req: {
        headers: {
          [SCHEDULE_PROFILE_HEADER]: "7",
        },
      },
      res: {},
    } as any);

    expect(context.scheduleProfileId).toBe(7);
  });

  it("restores the local admin user when the local session cookie is valid", async () => {
    verifySessionMock.mockResolvedValue({
      openId: "__local_dev_admin__",
      appId: "local-auth",
      name: "Administrador",
    });

    const context = await createContext({
      req: {
        headers: {
          cookie: "app_session_id=valid-token",
        },
      },
      res: {},
    } as any);

    expect(context.user?.name).toBe("Administrador");
    expect(context.user?.email).toBe("admin@local");
    expect(context.scheduleProfileId).toBe(1);
  });
});
