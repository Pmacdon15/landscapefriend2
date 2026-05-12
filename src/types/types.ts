import type {
  Address,
  Assignment,
  Client,
  CompletedJob,
  Schedule,
} from "@/zod/schemas";

export interface ClientRow {
  id: string;
  org_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface AddressRow {
  id: string;
  client_id: string;
  street: string;
  city: string;
  state: string | null;
  zip: string | null;
  status: "active" | "disabled" | "deleted";
  assigned_to: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface ScheduleRow {
  id: string;
  address_id: string;
  day_of_week: number | null;
  frequency: string;
  next_cut_date: Date;
  created_at: Date;
  updated_at: Date;
}

export interface RouteOrderRow {
  address_id: string;
  org_id: string;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

export interface AssignmentRow {
  id: string;
  address_id: string;
  org_id: string;
  user_id: string;
  scheduled_date: string;
  created_at: Date;
  updated_at: Date;
}

export interface CompletedJobRow {
  id: string;
  address_id: string;
  org_id: string;
  service_type: "grass" | "snow";
  assigned_to: string | null;
  completed_by: string | null;
  completed_at: Date;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface SiteMapRow {
  id: string;
  address_id: string;
  name: string | null;
  blob_path: string | null;
  map_data: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
}

export interface CompletionPhotoRow {
  id: string;
  completed_job_id: string;
  blob_path: string;
  created_at: Date;
}

export type { Client, Address, Schedule, CompletedJob, Assignment };
