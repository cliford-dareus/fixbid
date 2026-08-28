import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from 'react';
import {Alert} from 'react-native';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {useAuth} from '@/context/auth-context';
import {jobsApi, type Job} from '@/lib/data';
import {fromResult, queryKeys} from '@/lib/query-client';

type JobsContextType = {
  jobs: Job[];
  loading: boolean;
  updateJob: (id: string, updates: Partial<Job>) => Promise<void>;
  fetchJobs: () => Promise<void>;
  getTodayJobs: () => Job[];
  getMonthRevenue: (month?: number, year?: number) => number;
};

const JobsContext = createContext<JobsContextType | undefined>(undefined);

export function JobsProvider({children}: {children: ReactNode}) {
  const {user} = useAuth();
  const userId = user?.id;
  const qc = useQueryClient();

  const jobsQuery = useQuery({
    queryKey: userId ? queryKeys.jobs(userId) : ['jobs', 'none'],
    queryFn: () => fromResult(jobsApi.listJobs(userId!)),
    enabled: Boolean(userId),
  });

  useEffect(() => {
    if (jobsQuery.error) console.error(jobsQuery.error);
  }, [jobsQuery.error]);

  const jobs = jobsQuery.data ?? [];

  const fetchJobs = useCallback(async () => {
    if (!userId) return;
    await qc.invalidateQueries({queryKey: queryKeys.jobs(userId)});
  }, [qc, userId]);

  const updateJob = useCallback(
    async (id: string, updates: Partial<Job>) => {
      if (!id || !userId) return;
      const prev = qc.getQueryData<Job[]>(queryKeys.jobs(userId));
      qc.setQueryData<Job[]>(queryKeys.jobs(userId), (list) =>
        (list ?? []).map((j) => (j.id === id ? {...j, ...updates} : j)),
      );
      try {
        await fromResult(jobsApi.updateJob(id, updates));
      } catch (e) {
        if (prev) qc.setQueryData(queryKeys.jobs(userId), prev);
        console.error(e);
        Alert.alert('Error', e instanceof Error ? e.message : 'Failed to update job');
        throw e;
      }
    },
    [qc, userId],
  );

  const getTodayJobs = useCallback(() => {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      23,
      59,
      59,
    );

    return jobs.filter((job) => {
      if (!job.schedule_date) return false;
      const jobDate = new Date(job.schedule_date);
      return jobDate >= startOfDay && jobDate <= endOfDay;
    });
  }, [jobs]);

  const getMonthRevenue = useCallback(
    (month?: number, year?: number) => {
      const now = new Date();
      const m = month ?? now.getMonth();
      const y = year ?? now.getFullYear();

      return jobs
        .filter((job) => {
          const d = new Date(job.created_at);
          return d.getMonth() === m && d.getFullYear() === y;
        })
        .reduce((acc, job) => {
          const paid = (job.payments || []).reduce(
            (s, payment) => s + (Number(payment.amount) || 0),
            0,
          );
          if (paid > 0) return acc + paid;
          if (job.status === 'paid' || job.status === 'completed') {
            return acc + (Number(job.total_amount) || 0);
          }
          return acc;
        }, 0);
    },
    [jobs],
  );

  const value = useMemo(
    () => ({
      jobs,
      loading: Boolean(userId) && jobsQuery.isLoading,
      updateJob,
      fetchJobs,
      getTodayJobs,
      getMonthRevenue,
    }),
    [
      jobs,
      userId,
      jobsQuery.isLoading,
      updateJob,
      fetchJobs,
      getTodayJobs,
      getMonthRevenue,
    ],
  );

  return <JobsContext.Provider value={value}>{children}</JobsContext.Provider>;
}

export function useJobs() {
  const ctx = useContext(JobsContext);
  if (!ctx) throw new Error('useJobs must be used within JobsProvider');
  return ctx;
}
