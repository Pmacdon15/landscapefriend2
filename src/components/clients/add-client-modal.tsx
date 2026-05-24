"use client";

import { useForm } from "@tanstack/react-form";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateClient } from "@/mutations/clients";
import type {
  AddClientModalProps,
  Address,
  AddressFormValue,
  Client,
} from "@/types/types";

export function AddClientModal({
  members,
  setOptimistic,
}: AddClientModalProps) { 
  const [open, setOpen] = useState(false);
  const { mutate: createClient, isPending } = useCreateClient();

  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      addresses: [
        {
          key: crypto.randomUUID(),
          street: "",
          city: "",
          state: "",
          zip: "",
          assigned_to: "unassigned",
        },
      ] as AddressFormValue[],
    },
    onSubmit: async ({ value }) => {
      const addresses: Address[] = value.addresses.map(
        (addr: AddressFormValue) => ({
          id: crypto.randomUUID(),
          client_id: "temp-client-id",
          street: addr.street,
          city: addr.city,
          state: addr.state || null,
          zip: addr.zip || null,
          assigned_to:
            addr.assigned_to === "unassigned" ? null : addr.assigned_to,
          status: "active" as const,
          sort_order: 0,
          schedule: null,
          assignment: null,
          completed_job: null,
        }),
      );

      const optimisticClient: Client = {
        id: "temp-client-id",
        org_id: "temp-org-id",
        status: "active",
        name: value.name,
        email: value.email || null,
        phone: value.phone || null,
        addresses,
      };

      if (setOptimistic) {
        setOpen(false);
        form.reset();
        startTransition(() => {
          setOptimistic({ type: "add-client", client: optimisticClient });
          createClient({
            name: value.name,
            email: value.email || null,
            phone: value.phone || null,
            addresses: value.addresses.map((addr: AddressFormValue) => ({
              street: addr.street,
              city: addr.city,
              state: addr.state || null,
              zip: addr.zip || null,
              assigned_to:
                addr.assigned_to === "unassigned" ? null : addr.assigned_to,
              status: "active" as const,
            })),
          });
        });
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={() => setOpen(!open)}>
      <DialogTrigger
        render={
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Client
          </Button>
        }
      />

      <DialogContent className="sm:max-w-150 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Client</DialogTitle>
          <DialogDescription>
            Add a new client and their addresses. At least one address is
            required.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="grid gap-6 py-4"
        >
          <div className="grid gap-4">
            <form.Field
              name="name"
              validators={{
                onChange: ({ value }) =>
                  !value ? "Name is required" : undefined,
              }}
            >
              {(field) => (
                <div className="grid gap-2">
                  <Label htmlFor={field.name}>Name</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="John Doe"
                  />
                  {field.state.meta.errors ? (
                    <p className="text-sm text-destructive">
                      {field.state.meta.errors.join(", ")}
                    </p>
                  ) : null}
                </div>
              )}
            </form.Field>

            <div className="grid grid-cols-2 gap-4">
              <form.Field name="email">
                {(field) => (
                  <div className="grid gap-2">
                    <Label htmlFor={field.name}>Email (Optional)</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="email"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="john@example.com"
                    />
                  </div>
                )}
              </form.Field>

              <form.Field name="phone">
                {(field) => (
                  <div className="grid gap-2">
                    <Label htmlFor={field.name}>Phone (Optional)</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="(555) 555-5555"
                    />
                  </div>
                )}
              </form.Field>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                Addresses
              </h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  form.pushFieldValue("addresses", {
                    key: crypto.randomUUID(),
                    street: "",
                    city: "",
                    state: "",
                    zip: "",
                    assigned_to: "unassigned",
                  })
                }
                className="h-7 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Address
              </Button>
            </div>

            <form.Field name="addresses" mode="array">
              {(field) => (
                <div className="space-y-6">
                  {field.state.value.map(
                    (addr: AddressFormValue, i: number) => (
                      <div
                        key={addr.key}
                        className="relative grid gap-4 p-4 rounded-lg border bg-slate-50/50 dark:bg-slate-900/50"
                      >
                        {field.state.value.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() =>
                              form.removeFieldValue("addresses", i)
                            }
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}

                        <form.Field
                          name={`addresses[${i}].street`}
                          validators={{
                            onChange: ({ value }) =>
                              !value ? "Street is required" : undefined,
                          }}
                        >
                          {(subField) => (
                            <div className="grid gap-2">
                              <Label htmlFor={subField.name}>Street</Label>
                              <Input
                                id={subField.name}
                                name={subField.name}
                                value={subField.state.value}
                                onBlur={subField.handleBlur}
                                onChange={(e) =>
                                  subField.handleChange(e.target.value)
                                }
                                placeholder="123 Main St"
                              />
                              {subField.state.meta.errors ? (
                                <p className="text-sm text-destructive">
                                  {subField.state.meta.errors.join(", ")}
                                </p>
                              ) : null}
                            </div>
                          )}
                        </form.Field>

                        <div className="grid grid-cols-2 gap-4">
                          <form.Field
                            name={`addresses[${i}].city`}
                            validators={{
                              onChange: ({ value }) =>
                                !value ? "City is required" : undefined,
                            }}
                          >
                            {(subField) => (
                              <div className="grid gap-2">
                                <Label htmlFor={subField.name}>City</Label>
                                <Input
                                  id={subField.name}
                                  name={subField.name}
                                  value={subField.state.value}
                                  onBlur={subField.handleBlur}
                                  onChange={(e) =>
                                    subField.handleChange(e.target.value)
                                  }
                                  placeholder="Anytown"
                                />
                                {subField.state.meta.errors ? (
                                  <p className="text-sm text-destructive">
                                    {subField.state.meta.errors.join(", ")}
                                  </p>
                                ) : null}
                              </div>
                            )}
                          </form.Field>

                          <div className="grid grid-cols-2 gap-2">
                            <form.Field name={`addresses[${i}].state`}>
                              {(subField) => (
                                <div className="grid gap-2">
                                  <Label htmlFor={subField.name}>State</Label>
                                  <Input
                                    id={subField.name}
                                    name={subField.name}
                                    value={subField.state.value}
                                    onBlur={subField.handleBlur}
                                    onChange={(e) =>
                                      subField.handleChange(e.target.value)
                                    }
                                    placeholder="CA"
                                  />
                                </div>
                              )}
                            </form.Field>
                            <form.Field name={`addresses[${i}].zip`}>
                              {(subField) => (
                                <div className="grid gap-2">
                                  <Label htmlFor={subField.name}>Zip</Label>
                                  <Input
                                    id={subField.name}
                                    name={subField.name}
                                    value={subField.state.value}
                                    onBlur={subField.handleBlur}
                                    onChange={(e) =>
                                      subField.handleChange(e.target.value)
                                    }
                                    placeholder="12345"
                                  />
                                </div>
                              )}
                            </form.Field>
                          </div>
                        </div>

                        <form.Field name={`addresses[${i}].assigned_to`}>
                          {(subField) => (
                            <div className="grid gap-2">
                              <Label htmlFor={subField.name}>
                                Default Assignee
                              </Label>
                              <Select
                                value={subField.state.value}
                                onValueChange={(val) =>
                                  subField.handleChange(val as string)
                                }
                              >
                                <SelectTrigger
                                  id={subField.name}
                                  onBlur={subField.handleBlur}
                                >
                                  <SelectValue placeholder="Select member">
                                    {members.find(
                                      (m) => m.id === subField.state.value,
                                    )?.name ||
                                      (subField.state.value === "unassigned"
                                        ? "Unassigned"
                                        : subField.state.value)}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="unassigned">
                                    Unassigned
                                  </SelectItem>
                                  {members.map(
                                    (member: { id: string; name: string }) => (
                                      <SelectItem
                                        key={member.id}
                                        value={member.id}
                                      >
                                        {member.name}
                                      </SelectItem>
                                    ),
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </form.Field>
                      </div>
                    ),
                  )}
                </div>
              )}
            </form.Field>
          </div>

          <div className="flex justify-end gap-2 mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
                form.reset();
              }}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Client
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
