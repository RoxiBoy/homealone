import { apiFetch } from '../config/api';

export type DashboardContact = {
  id: string;
  name: string;
  phone: string;
  countryCode: string;
  email: string;
  priority: number;
  relationship?: string;
};

export type DashboardSubscription = {
  plan: 'free' | 'monthly' | 'yearly';
  status: 'active' | 'past_due' | 'canceled' | 'incomplete' | 'trialing' | null;
  startDate: string | null;
  endDate: string | null;
  autoRenew: boolean;
};

export type DashboardSettings = {
  checkInIntervalHours: number;
  emergencyCountdownMinutes: number;
  sleepTimerEnabled: boolean;
  sleepStartHour: number;
  sleepEndHour: number;
  sleepTimezone: string;
  dnd: boolean;
  effectiveDnd: boolean;
  dndReason: 'manual' | 'sleep' | null;
};

export type DashboardStats = {
  lastAlarmTime: string | null;
  lastContactTime: string | null;
  lastCheckInOk: string | null;
  totalAlarmsEver: number;
  totalContactCallsEver: number;
  totalOkResponses: number;
  totalMissedResponses: number;
  totalEmergencies: number;
};

export type DashboardData = {
  user: {
    name?: string;
    username: string;
    email?: string;
    phone?: string;
  };
  settings: DashboardSettings;
  contacts: DashboardContact[];
  subscription: DashboardSubscription;
  stats: DashboardStats;
};

export async function fetchDashboard(token: string): Promise<DashboardData> {
  return apiFetch<DashboardData>('/users/dashboard', {
    method: 'GET',
    token,
  });
}
