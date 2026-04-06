import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createBaseContext(user: AuthenticatedUser | null): TrpcContext {
  return {
    user,
    scheduleProfileId: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      cookie: () => undefined,
      clearCookie: () => undefined,
    } as TrpcContext["res"],
  };
}

function createAdminUser(): AuthenticatedUser {
  const now = new Date();
  return {
    id: 99,
    openId: "offline-admin-users",
    email: "admin@example.test",
    name: "Admin",
    loginMethod: "password",
    role: "admin",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
  };
}

describe("local user management", () => {
  it("creates and lists managed local users in offline mode", async () => {
    const caller = appRouter.createCaller(createBaseContext(createAdminUser()));

    await caller.adminUsers.create({
      name: "Secretaria",
      email: "secretaria@example.test",
      username: "secretaria.ortopedia",
      password: "senha123",
      role: "viewer",
    });

    const users = await caller.adminUsers.list();

    expect(users.some((user) => user.username === "admin")).toBe(true);
    expect(
      users.some(
        (user) =>
          user.username === "secretaria.ortopedia" &&
          user.name === "Secretaria" &&
          user.active === true
      )
    ).toBe(true);
  });

  it("authenticates a created local user and blocks it after deactivation", async () => {
    const adminCaller = appRouter.createCaller(createBaseContext(createAdminUser()));

    const created = await adminCaller.adminUsers.create({
      name: "Coordenacao",
      email: "coord@example.test",
      username: "coordenacao",
      password: "senha456",
      role: "coordinator",
    });

    const publicCaller = appRouter.createCaller(createBaseContext(null));
    const loginResult = await publicCaller.auth.localLogin({
      username: "coordenacao",
      password: "senha456",
    });

    expect(loginResult.success).toBe(true);
    expect(loginResult.user.name).toBe("Coordenacao");

    await adminCaller.adminUsers.setActive({
      userId: created.userId,
      active: false,
    });

    await expect(
      publicCaller.auth.localLogin({
        username: "coordenacao",
        password: "senha456",
      })
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Este usuario esta desativado",
    } satisfies Partial<TRPCError>);
  });

  it("deletes a managed local user and removes its credential", async () => {
    const adminCaller = appRouter.createCaller(createBaseContext(createAdminUser()));

    const created = await adminCaller.adminUsers.create({
      name: "Secretaria Apagavel",
      email: "apagavel@example.test",
      username: "secretaria.apagavel",
      password: "senha789",
      role: "viewer",
    });

    const usersBeforeDelete = await adminCaller.adminUsers.list();
    expect(
      usersBeforeDelete.some((user) => user.username === "secretaria.apagavel")
    ).toBe(true);

    await adminCaller.adminUsers.delete({
      userId: created.userId,
    });

    const usersAfterDelete = await adminCaller.adminUsers.list();
    expect(
      usersAfterDelete.some((user) => user.username === "secretaria.apagavel")
    ).toBe(false);

    const publicCaller = appRouter.createCaller(createBaseContext(null));
    await expect(
      publicCaller.auth.localLogin({
        username: "secretaria.apagavel",
        password: "senha789",
      })
    ).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      message: "Login ou senha invalidos",
    } satisfies Partial<TRPCError>);
  });

  it("does not allow deleting the built-in admin user", async () => {
    const adminCaller = appRouter.createCaller(createBaseContext(createAdminUser()));
    const users = await adminCaller.adminUsers.list();
    const builtInAdmin = users.find((user) => user.username === "admin");

    expect(builtInAdmin?.isBuiltIn).toBe(true);

    await expect(
      adminCaller.adminUsers.delete({
        userId: builtInAdmin!.userId,
      })
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "O administrador padrao do sistema nao pode ser excluido",
    } satisfies Partial<TRPCError>);
  });
});
