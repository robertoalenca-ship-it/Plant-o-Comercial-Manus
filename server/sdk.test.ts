import { beforeEach, describe, expect, it, vi } from "vitest";

const { getUserByOpenIdMock, upsertUserMock } = vi.hoisted(() => ({
  getUserByOpenIdMock: vi.fn(),
  upsertUserMock: vi.fn(),
}));

vi.mock("./db", () => ({
  getUserByOpenId: getUserByOpenIdMock,
  upsertUser: upsertUserMock,
}));

vi.mock("./_core/env", () => ({
  ENV: {
    appId: "google-client-id",
    cookieSecret: "test-secret",
    oAuthServerUrl: "",
    localSessionAppId: "local-auth",
    isProduction: true,
  },
}));

import { SDKServer } from "./_core/sdk";

describe("SDKServer.authenticateRequest", () => {
  beforeEach(() => {
    getUserByOpenIdMock.mockReset();
    upsertUserMock.mockReset();
    upsertUserMock.mockResolvedValue(undefined);
  });

  it("restores direct Google users from a trusted session without legacy OAuth", async () => {
    const sdk = new SDKServer({ post: vi.fn() } as any);
    const getUserInfoWithJwtSpy = vi.spyOn(sdk, "getUserInfoWithJwt");
    vi.spyOn(sdk, "verifySession").mockResolvedValue({
      openId: "google:123",
      appId: "google-client-id",
      name: "Roberto",
    });

    getUserByOpenIdMock
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({
        id: 7,
        openId: "google:123",
        name: "Roberto",
        email: null,
        loginMethod: "google",
        role: "user",
        isEmailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
        maxProfiles: 1,
        isPaid: false,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        subscriptionStatus: null,
      });

    const user = await sdk.authenticateRequest({
      headers: {
        cookie: "app_session_id=signed-cookie",
      },
    } as any);

    expect(getUserInfoWithJwtSpy).not.toHaveBeenCalled();
    expect(upsertUserMock).toHaveBeenCalledWith(
      expect.objectContaining({
        openId: "google:123",
        name: "Roberto",
        loginMethod: "google",
      })
    );
    expect(user.openId).toBe("google:123");
  });
});
