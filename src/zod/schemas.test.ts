import { describe, expect, it } from "vitest";
import { AddressInputSchema, CreateClientInputSchema } from "./schemas";

describe("CreateClientInputSchema & AddressInputSchema", () => {
  const validAddress = {
    street: "123 Grassland Ave",
    city: "Meadowville",
    state: "UT",
    zip: "84000",
    status: "active" as const,
  };

  const validClientInput = {
    name: "John Miller",
    email: "john.miller@example.com",
    phone: "555-0199",
    addresses: [validAddress],
  };

  it("should successfully parse a valid client creation payload", () => {
    const parsed = CreateClientInputSchema.safeParse(validClientInput);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.name).toBe("John Miller");
      expect(parsed.data.addresses[0].street).toBe("123 Grassland Ave");
      expect(parsed.data.addresses[0].status).toBe("active");
    }
  });

  it("should fail validation with correct custom error when name is empty", () => {
    const invalidInput = {
      ...validClientInput,
      name: "",
    };
    const parsed = CreateClientInputSchema.safeParse(invalidInput);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const issue = parsed.error.issues.find((i) => i.path.includes("name"));
      expect(issue).toBeDefined();
      expect(issue?.message).toBe("Name is required");
    }
  });

  it("should fail validation when email is malformed", () => {
    const invalidInput = {
      ...validClientInput,
      email: "invalid-email-format",
    };
    const parsed = CreateClientInputSchema.safeParse(invalidInput);
    expect(parsed.success).toBe(false);
  });

  it("should fail validation when addresses array is empty", () => {
    const invalidInput = {
      ...validClientInput,
      addresses: [],
    };
    const parsed = CreateClientInputSchema.safeParse(invalidInput);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const issue = parsed.error.issues.find((i) =>
        i.path.includes("addresses"),
      );
      expect(issue).toBeDefined();
      expect(issue?.message).toBe("At least one address is required");
    }
  });

  it("should fail validation when address is missing street or city", () => {
    const invalidAddress = {
      street: "",
      city: "",
      state: "UT",
      zip: "84000",
    };

    const parsed = AddressInputSchema.safeParse(invalidAddress);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const streetIssue = parsed.error.issues.find((i) =>
        i.path.includes("street"),
      );
      const cityIssue = parsed.error.issues.find((i) =>
        i.path.includes("city"),
      );
      expect(streetIssue?.message).toBe("Street is required");
      expect(cityIssue?.message).toBe("City is required");
    }
  });

  it("should supply default status active for addresses when not provided", () => {
    const addressWithoutStatus = {
      street: "123 Meadow Ave",
      city: "Salt Lake",
    };

    const parsed = AddressInputSchema.safeParse(addressWithoutStatus);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.status).toBe("active");
    }
  });
});
