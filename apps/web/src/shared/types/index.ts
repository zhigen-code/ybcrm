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
  phone: string | null
  role: UserRole
  teamId: string | null
  capacity: number
  specialization: string[]
  currentLeadsCount: number
  currentClientsCount: number
  createdAt: string
  isActive: number
}

export interface Team {
  id: string
  name: string
  region: string | null
  createdAt: string
}

export type LeadStatus = 'New' | 'Contacted' | 'Qualified' | 'Converted' | 'Lost'

export interface Lead {
  id: string
  leadNo: number | null
  source: string
  name: string
  contactInfo: string
  intendedServices: string[]
  status: LeadStatus
  notes: string | null
  lostReason: string | null
  nextContactDate: string | null
  assignedToUserId: string | null
  assignedToTeamId: string | null
  assignedToName: string | null
  createdByUserId: string | null
  createdByName: string | null
  activityCount: number
  adInfo: Record<string, string> | null
  createdAt: string
  updatedAt: string
}

export interface Client {
  id: string
  leadId: string | null
  leadNo: number | null
  name: string
  email: string | null
  phone: string | null
  detailedProfile: { notes?: string | null; source?: string | null; [key: string]: unknown }
  servicePlans: string[]
  contractStatus: string | null
  assignedSalesUserId: string | null
  createdByUserId: string | null
  createdByName: string | null
  nextContactDate: string | null
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

export interface Partner {
  id: string
  name: string
  type: string
  contactPerson: string | null
  contactInfo: string | null
  serviceScope: string[]
  createdAt: string
}

export interface ActivityAttachment {
  key: string
  name: string
  size: number
}

export interface SalesActivity {
  id: string
  clientId: string | null
  clientName: string | null
  leadId: string | null
  leadName: string | null
  userId: string
  userName: string | null
  activityType: string
  description: string | null
  activityDate: string
  nextContactDate: string | null
  extraData: Record<string, unknown> | null
  createdAt: string
  attachments: ActivityAttachment[]
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
