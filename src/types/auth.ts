export interface User {
  id: string
  email: string
  first_name?: string
  last_name?: string
  full_name?: string
  company_name?: string
  company_domain?: string
  industry_field?: string
  employee_count?: number
  job_title?: string
  department?: string
  phone_number?: string
  account_type?: 'personal' | 'corporate'
  email_verified?: boolean
  company_verified?: boolean
  onboarding_completed?: boolean
  avatar_url?: string
  created_at?: string
  updated_at?: string
}

export interface CorporateValidationResult {
  valid: boolean
  errors: string[]
  domain: string
  is_corporate_domain: boolean
}

export interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface SignUpData {
  email: string
  password: string
  firstName: string
  lastName: string
  fullName: string
  companyName?: string
  industryField?: string
  employeeCount?: string | number
  jobTitle?: string
  department?: string
  phoneNumber?: string
  accountType: 'personal' | 'corporate'
}

export interface CorporateSignUpData extends SignUpData {
  companyName: string
  industryField?: string
  employeeCount?: string | number
  jobTitle?: string
  department?: string
  phoneNumber?: string
  accountType: 'corporate'
}

export interface ResetPasswordData {
  email: string
}

export interface UpdatePasswordData {
  password: string
  confirmPassword: string
}
