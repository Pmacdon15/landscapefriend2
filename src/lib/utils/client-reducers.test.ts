import { describe, expect, it } from "vitest";
import type { OneTimeService } from "@/types/types";
import { makeAddress, makeClient } from "../../../tests/helpers/fixtures";
import {
  type ClientOptimisticState,
  clientInfoReducer,
} from "./client-reducers";

function stateWith(...clients: ReturnType<typeof makeClient>[]) {
  return { clients, searchValue: "" } satisfies ClientOptimisticState;
}

describe("clientInfoReducer", () => {
  it("search-submitted: sets the query and the result list", () => {
    const a = makeClient({ name: "Alice" });
    const b = makeClient({ name: "Bob" });
    const next = clientInfoReducer(stateWith(a), {
      type: "search-submitted",
      query: "bo",
      clients: [b],
    });
    expect(next).toEqual({ clients: [b], searchValue: "bo" });
  });

  it("select-client / add-client: shows only that client", () => {
    const a = makeClient({ name: "Alice" });
    const b = makeClient({ name: "Bob" });
    for (const type of ["select-client", "add-client"] as const) {
      const next = clientInfoReducer(stateWith(a, b), { type, client: b });
      expect(next).toEqual({ clients: [b], searchValue: "Bob" });
    }
  });

  it("edit-client: replaces the matching client only", () => {
    const a = makeClient({ name: "Alice" });
    const b = makeClient({ name: "Bob" });
    const edited = { ...b, name: "Robert" };
    const next = clientInfoReducer(stateWith(a, b), {
      type: "edit-client",
      client: edited,
    });
    expect(next.clients.map((c) => c.name)).toEqual(["Alice", "Robert"]);
    expect(next.clients[0]).toBe(a);
  });

  describe("delete-client", () => {
    it("removes the client and keeps the search value", () => {
      const a = makeClient();
      const b = makeClient();
      const next = clientInfoReducer(
        { clients: [a, b], searchValue: "x" },
        { type: "delete-client", clientId: a.id },
      );
      expect(next).toEqual({ clients: [b], searchValue: "x" });
    });

    it("falls back to the default list when the last client is removed", () => {
      const a = makeClient();
      const defaults = [makeClient(), makeClient()];
      const next = clientInfoReducer(
        { clients: [a], searchValue: "x" },
        { type: "delete-client", clientId: a.id, defaultClients: defaults },
      );
      expect(next).toEqual({ clients: defaults, searchValue: "" });
    });

    it("clears the search when the list empties and there are no defaults", () => {
      const a = makeClient();
      const next = clientInfoReducer(
        { clients: [a], searchValue: "x" },
        { type: "delete-client", clientId: a.id },
      );
      expect(next).toEqual({ clients: [], searchValue: "" });
    });
  });

  describe("update-assignee", () => {
    it("assigns members to the matching address only", () => {
      const target = makeAddress();
      const other = makeAddress();
      const client = makeClient({
        org_id: "org_abc",
        addresses: [target, other],
      });
      const next = clientInfoReducer(stateWith(client), {
        type: "update-assignee",
        addressId: target.id,
        userIds: ["user_1", "user_2"],
      });
      const [updated, untouched] = next.clients[0].addresses ?? [];
      expect(updated.assigned_to).toBe("user_1");
      expect(updated.assigned_member_ids).toEqual(["user_1", "user_2"]);
      expect(updated.assignment).toMatchObject({
        id: "optimistic",
        address_id: target.id,
        user_ids: ["user_1", "user_2"],
        org_id: "org_abc",
      });
      expect(untouched).toBe(other);
    });

    it("clears the assignment when no members are given", () => {
      const target = makeAddress({ assigned_to: "user_1" });
      const next = clientInfoReducer(
        stateWith(makeClient({ addresses: [target] })),
        { type: "update-assignee", addressId: target.id, userIds: [] },
      );
      const updated = next.clients[0].addresses?.[0];
      expect(updated?.assigned_to).toBeNull();
      expect(updated?.assigned_member_ids).toEqual([]);
      expect(updated?.assignment).toBeNull();
    });

    it("treats null userIds as unassigned", () => {
      const target = makeAddress();
      const next = clientInfoReducer(
        stateWith(makeClient({ addresses: [target] })),
        { type: "update-assignee", addressId: target.id, userIds: null },
      );
      expect(next.clients[0].addresses?.[0].assignment).toBeNull();
    });
  });

  describe("update-schedule", () => {
    it("creates an optimistic schedule when none exists", () => {
      const target = makeAddress();
      const next = clientInfoReducer(
        stateWith(makeClient({ addresses: [target] })),
        {
          type: "update-schedule",
          addressId: target.id,
          frequency: "weekly",
          firstCutDate: "2026-06-15",
        },
      );
      const schedule = next.clients[0].addresses?.[0].schedule;
      expect(schedule).toMatchObject({
        id: "optimistic",
        address_id: target.id,
        frequency: "weekly",
        day_of_week: null,
        notes: null,
      });
      expect(schedule?.first_cut_date).toBeInstanceOf(Date);
    });

    it("keeps the existing schedule id and day of week", () => {
      const target = makeAddress({
        schedule: {
          id: "11111111-1111-4111-8111-111111111111",
          address_id: "x",
          frequency: "monthly",
          first_cut_date: new Date(),
          day_of_week: 3,
          notes: null,
        },
      });
      const next = clientInfoReducer(
        stateWith(makeClient({ addresses: [target] })),
        {
          type: "update-schedule",
          addressId: target.id,
          frequency: "weekly",
          firstCutDate: "2026-06-15",
          notes: "Back gate code 1234",
        },
      );
      expect(next.clients[0].addresses?.[0].schedule).toMatchObject({
        id: "11111111-1111-4111-8111-111111111111",
        day_of_week: 3,
        frequency: "weekly",
        notes: "Back gate code 1234",
      });
    });
  });

  it("delete-schedule: removes the schedule from the matching address", () => {
    const target = makeAddress({
      schedule: {
        id: "11111111-1111-4111-8111-111111111111",
        address_id: "x",
        frequency: "weekly",
        first_cut_date: new Date(),
        day_of_week: 1,
      },
    });
    const next = clientInfoReducer(
      stateWith(makeClient({ addresses: [target] })),
      { type: "delete-schedule", addressId: target.id },
    );
    expect(next.clients[0].addresses?.[0].schedule).toBeNull();
  });

  describe("one-time services", () => {
    const service = (id: string) =>
      ({
        id,
        address_id: "a",
        org_id: "org_test",
        name: "Aeration",
        service_type: "other",
        service_date: "2026-06-20",
      }) as OneTimeService;

    it("add-one-time-service appends to the address list", () => {
      const target = makeAddress({ one_time_services: null });
      const s = service("s1");
      const next = clientInfoReducer(
        stateWith(makeClient({ addresses: [target] })),
        { type: "add-one-time-service", addressId: target.id, service: s },
      );
      expect(next.clients[0].addresses?.[0].one_time_services).toEqual([s]);
    });

    it("delete-one-time-service removes only that service", () => {
      const keep = service("keep");
      const drop = service("drop");
      const target = makeAddress({ one_time_services: [keep, drop] });
      const next = clientInfoReducer(
        stateWith(makeClient({ addresses: [target] })),
        {
          type: "delete-one-time-service",
          addressId: target.id,
          serviceId: "drop",
        },
      );
      expect(next.clients[0].addresses?.[0].one_time_services).toEqual([keep]);
    });
  });

  it("does not mutate the previous state", () => {
    const target = makeAddress();
    const prev = stateWith(makeClient({ addresses: [target] }));
    const snapshot = structuredClone(prev);
    clientInfoReducer(prev, {
      type: "update-assignee",
      addressId: target.id,
      userIds: ["user_1"],
    });
    expect(prev).toEqual(snapshot);
  });
});
