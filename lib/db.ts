import { sql } from '@vercel/postgres'

export { sql }

export type Company = {
  id: number
  name: string
  url: string
  careers_url: string
  tier: number
  tag: string
  sort_order: number
  job_count?: number
}

export type Job = {
  id: number
  company_id: number
  title: string
  url: string
  status: 'new' | 'interested' | 'submitted' | 'skip'
  notes: string
  salary_range: string
  match_quality: string
  date_applied: string
  created_at: string
  updated_at: string
}

export type CompanyWithJobs = Company & { jobs: Job[] }
