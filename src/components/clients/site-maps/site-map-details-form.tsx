"use client";

import { useForm } from "@tanstack/react-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SiteMapDetailsFormProps {
  initialName: string;
  initialNotes: string;
  onSubmit: (name: string, notes: string) => void;
  isPending: boolean;
  onCancel: () => void;
}

export function SiteMapDetailsForm({
  initialName,
  initialNotes,
  onSubmit,
  isPending,
  onCancel,
}: SiteMapDetailsFormProps) {
  const form = useForm({
    defaultValues: {
      name: initialName,
      notes: initialNotes,
    },
    onSubmit: async ({ value }) => {
      onSubmit(value.name, value.notes);
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="space-y-4"
    >
      <div className="grid gap-4">
        <form.Field name="name">
          {(field) => (
            <div className="grid gap-2">
              <Label htmlFor={field.name}>Area Name</Label>
              <Input
                id={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="e.g. Front Lawn..."
              />
            </div>
          )}
        </form.Field>
        <form.Field name="notes">
          {(field) => (
            <div className="grid gap-2">
              <Label htmlFor={field.name}>Notes</Label>
              <Input
                id={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="Optional notes..."
              />
            </div>
          )}
        </form.Field>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
