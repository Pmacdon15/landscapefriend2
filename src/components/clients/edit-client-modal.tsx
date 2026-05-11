"use client";

import { useForm } from "@tanstack/react-form";
import { Edit2, Loader2, Plus, Trash2 } from "lucide-react";
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
import type { Client } from "@/dal/clients";
import { useUpdateClient } from "@/mutations/clients";
import type { OptimisticAction } from "./client-info/client-info-container";

interface EditClientModalProps {
  client: Client;
  members: { id: string; name: string }[];
  setOptimistic?: (action: OptimisticAction) => void;
}

interface EditAddressFormValue {
  key: string;
  id?: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  status: "active" | "disabled" | "deleted";
  assigned_to: string;
}

export function EditClientModal({
  client,
  members,
  setOptimistic,
}: EditClientModalProps) {
  const [open, setOpen] = useState(false);
  const { mutateAsync: updateClient, isPending } = useUpdateClient();

  const form = useForm({
    defaultValues: {
      name: client.name,
      email: client.email || "",
      phone: client.phone || "",
      addresses: (client.addresses || []).map((addr) => ({
        key: addr.id || crypto.randomUUID(),
        id: addr.id,
        street: addr.street,
        city: addr.city,
        state: addr.state || "",
        zip: addr.zip || "",
        status: addr.status as "active" | "disabled" | "deleted",
        assigned_to: addr.assigned_to || "unassigned",
      })) as EditAddressFormValue[],
    },
    onSubmit: async ({ value }) => {
      if (setOptimistic) {
        const optimisticClient: Client = {
          ...client,
          name: value.name,
          email: value.email || null,
          phone: value.phone || null,
          addresses: value.addresses
            .filter((addr) => addr.status !== "deleted")
            .map((addr) => {
              const existingAddr = client.addresses?.find(
                (a) => a.id === addr.id,
              );
              return {
                id: addr.id || crypto.randomUUID(),
                client_id: client.id,
                street: addr.street,
                city: addr.city,
                state: addr.state || null,
                zip: addr.zip || null,
                status: addr.status,
                assigned_to:
                  addr.assigned_to === "unassigned" ? null : addr.assigned_to,
                sort_order: existingAddr?.sort_order ?? 0,
                schedule: existingAddr?.schedule ?? null,
                assignment: existingAddr?.assignment ?? null,
                completed_job: existingAddr?.completed_job ?? null,
                site_maps: existingAddr?.site_maps ?? [],
              };
            }),
        };

        startTransition(() => {
          setOpen(false);
          setOptimistic({ type: "edit-client", client: optimisticClient });

          updateClient({
            clientId: client.id,
            data: {
              name: value.name,
              email: value.email || null,
              phone: value.phone || null,
              addresses: value.addresses.map((addr: EditAddressFormValue) => ({
                id: addr.id,
                street: addr.street,
                city: addr.city,
                state: addr.state || null,
                zip: addr.zip || null,
                assigned_to:
                  addr.assigned_to === "unassigned" ? null : addr.assigned_to,
                status: addr.status,
              })),
            },
          });
        });
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-500 hover:text-primary"
          >
            <Edit2 className="h-4 w-4" />
            <span className="sr-only">Edit Client</span>
          </Button>
        }
      />

      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Client</DialogTitle>
          <DialogDescription>
            Update client information and addresses. At least one address is
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
                    status: "active",
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
                    (addr: EditAddressFormValue, i: number) => {
                      if (addr.status === "deleted") return null;

                      return (
                        <div
                          key={addr.key}
                          className="relative grid gap-4 p-4 rounded-lg border bg-slate-50/50 dark:bg-slate-900/50"
                        >
                          {field.state.value.filter(
                            (a: EditAddressFormValue) => a.status !== "deleted",
                          ).length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => {
                                if (addr.id) {
                                  form.setFieldValue(
                                    `addresses[${i}].status`,
                                    "deleted",
                                  );
                                } else {
                                  form.removeFieldValue("addresses", i);
                                }
                              }}
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
                                      (member: {
                                        id: string;
                                        name: string;
                                      }) => (
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
                      );
                    },
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
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
