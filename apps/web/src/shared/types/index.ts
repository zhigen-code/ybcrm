// ---- 通用 ----
export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

// ---- 内部 CRM ----
export type UserRole = 'admin' | 'operations' | 'sales'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  teamId: string | null
  capacity: number
  specialization: string[]
  currentLeadsCount: number
  createdAt: string
}

export interface Team {
  id: string
  name: string
  region: string | null
  createdAt: string
}

export type LeadStatus = 'New' | 'Contacted' | 'Qualified' | 'Converted' | 'Lost'
export type IntendedService = '赴美试管' | '代孕' | '供精' | '供卵'
export const SERVICE_OPTIONS: IntendedService[] = ['赴美试管', '代孕', '供精', '供卵']

export interface Lead {
  id: string
  source: string
  name: string
  contactInfo: string
  intendedServices: IntendedService[]
  status: LeadStatus
  notes: string | null
  assignedToUserId: string | null
  assignedToTeamId: string | null
  createdByUserId: string | null
  createdByName: string | null
  createdAt: string
  updatedAt: string
}

export interface Client {
  id: string
  leadId: string | null
  name: string
  email: string | null
  phone: string | null
  detailedProfile: { notes?: string | null; source?: string | null; [key: string]: unknown }
  servicePlans: string[]
  contractStatus: string | null
  assignedSalesUserId: string | null
  createdByUserId: string | null
  createdByName: string | null
  createdAt: string
  updatedAt: string
}

export interface Service {
  id: string
  name: string
  description: string | null
  price: number | null
  processSteps: string[]
  createdAt: string
}

export type PartnerType = 'FertilityCenter' | 'SurrogacyAgency' | 'EggDonationAgency'

export interface Partner {
  id: string
  name: string
  type: PartnerType
  contactPerson: string | null
  contactInfo: string | null
  serviceScope: string[]
  createdAt: string
}

export type ActivityType = 'Call' | 'Meeting' | 'Email' | 'Note'

export interface SalesActivity {
  id: string
  clientId: string | null
  leadId: string | null
  userId: string
  userName: string | null
  activityType: ActivityType
  description: string | null
  activityDate: string
  createdAt: string
}

// ---- 客户门户 ----
export interface ClientUser {
  id: string
  clientId: string
  email: string
  lastLoginAt: string | null
}

export type ResourceType = 'MedicalReport' | 'Contract' | 'PassportCopy' | 'PartnerContact'

export interface ClientResource {
  id: string
  clientId: string
  resourceType: ResourceType
  title: string
  description: string | null
  r2ObjectKey: string | null
  externalUrl: string | null
  uploadedAt: string
}
