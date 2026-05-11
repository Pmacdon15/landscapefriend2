import { z } from "zod";

export const ScheduleSchema = z.object({
  id: z.string().uuid(),
  address_id: z.string().uuid(),
  day_of_week: z.number().nullable(),
  frequency: z.string(),
  next_cut_date: z.date(),
});

export const AssignmentSchema = z.object({
  id: z.string().uuid(),
  address_id: z.string().uuid(),
  org_id: z.string(),
  user_id: z.string(),
  scheduled_date: z.string(), // ISO date string
});

export const CompletionPhotoSchema = z.object({
  id: z.string().uuid(),
  completed_job_id: z.string().uuid(),
  blob_path: z.string(),
  created_at: z.date(),
});

export const CompletedJobSchema = z.object({
  id: z.string().uuid(),
  address_id: z.string().uuid(),
  org_id: z.string(),
  service_type: z.enum(["grass", "snow"]),
  assigned_to: z.string().nullable().optional(),
  completed_by: z.string().nullable().optional(),
  completed_at: z.date(),
  notes: z.string().nullable().optional(),
  photos: z.array(CompletionPhotoSchema).optional(),
});

export const SiteMapSchema = z.object({
  id: z.string().uuid(),
  address_id: z.string().uuid(),
  name: z.string().nullable().optional(),
  blob_path: z.string().nullable().optional(),
  map_data: z.any().nullable().optional(),
  created_at: z.date(),
});

export const AddressSchema = z.object({
  id: z.string().uuid(),
  client_id: z.string().uuid(),
  street: z.string(),
  city: z.string(),
  state: z.string().nullable().optional(),
  zip: z.string().nullable().optional(),
  status: z.enum(["active", "disabled", "deleted"]).default("active"),
  assigned_to: z.string().nullable().optional(),
  schedule: ScheduleSchema.optional().nullable(),
  sort_order: z.number().default(0),
  assignment: AssignmentSchema.optional().nullable(),
  completed_job: CompletedJobSchema.optional().nullable(),
  site_maps: z.array(SiteMapSchema).optional(),
});

export const AddressInputSchema = z.object({
  id: z.uuid().optional(),
  street: z.string().min(1, "Street is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().nullable().optional(),
  zip: z.string().nullable().optional(),
  status: z.enum(["active", "disabled", "deleted"]).default("active"),
  assigned_to: z.string().nullable().optional(),
});

export const ClientSchema = z.object({
  id: z.uuid(),
  org_id: z.string(),
  name: z.string().min(1, "Name is required"),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  addresses: z.array(AddressSchema).optional(),
});

export const CreateClientInputSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.email().nullable().optional(),
  phone: z.string().nullable().optional(),
  addresses: z
    .array(AddressInputSchema)
    .min(1, "At least one address is required"),
});

export type Client = z.infer<typeof ClientSchema>;
export type Address = z.infer<typeof AddressSchema>;
export type AddressInput = z.infer<typeof AddressInputSchema>;
export type Schedule = z.infer<typeof ScheduleSchema>;
export type CompletedJob = z.infer<typeof CompletedJobSchema>;
export type SiteMap = z.infer<typeof SiteMapSchema>;
export type Assignment = z.infer<typeof AssignmentSchema>;
export type CreateClientInput = z.infer<typeof CreateClientInputSchema>;
