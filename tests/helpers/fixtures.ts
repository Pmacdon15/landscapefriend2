import type { Address, Client } from "@/types/types";

let counter = 0;
const nextId = () => {
  counter += 1;
  return `00000000-0000-4000-8000-${counter.toString().padStart(12, "0")}`;
};

export function makeAddress(overrides: Partial<Address> = {}): Address {
  return {
    id: nextId(),
    client_id: nextId(),
    street: "123 Main St",
    city: "Calgary",
    state: "AB",
    zip: "T2P 1J9",
    status: "active",
    sort_order: 0,
    assigned_to: null,
    assigned_member_ids: [],
    schedule: null,
    assignment: null,
    completed_job: null,
    one_time_services: [],
    ...overrides,
  };
}

export function makeClient(overrides: Partial<Client> = {}): Client {
  return {
    id: nextId(),
    org_id: "org_test",
    name: "Jane Doe",
    email: "jane@example.com",
    phone: "403-555-0100",
    status: "active",
    addresses: [makeAddress()],
    ...overrides,
  };
}
