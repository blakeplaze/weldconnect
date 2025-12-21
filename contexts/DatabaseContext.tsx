import React, { createContext, useContext, useEffect, useState } from 'react';
import { localDb, Profile, Job, Application, Review } from '@/lib/localDb';

interface DatabaseContextType {
  ready: boolean;
}

const DatabaseContext = createContext<DatabaseContextType>({ ready: false });

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    localDb.initialize().then(() => {
      setReady(true);
    });
  }, []);

  return (
    <DatabaseContext.Provider value={{ ready }}>
      {children}
    </DatabaseContext.Provider>
  );
}

export const useDatabase = () => useContext(DatabaseContext);

export function useJobs(filters?: { status?: string; customer_id?: string }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const { ready } = useDatabase();

  useEffect(() => {
    if (!ready) return;

    localDb.getJobs(filters).then(data => {
      setJobs(data);
      setLoading(false);
    });
  }, [ready, filters?.status, filters?.customer_id]);

  const refresh = async () => {
    setLoading(true);
    const data = await localDb.getJobs(filters);
    setJobs(data);
    setLoading(false);
  };

  return { jobs, loading, refresh };
}

export function useJob(jobId: string | null) {
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const { ready } = useDatabase();

  useEffect(() => {
    if (!ready || !jobId) {
      setLoading(false);
      return;
    }

    localDb.getJob(jobId).then(data => {
      setJob(data);
      setLoading(false);
    });
  }, [ready, jobId]);

  return { job, loading };
}

export function useWelders() {
  const [welders, setWelders] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const { ready } = useDatabase();

  useEffect(() => {
    if (!ready) return;

    localDb.getProfiles({ user_type: 'business' }).then(data => {
      setWelders(data);
      setLoading(false);
    });
  }, [ready]);

  return { welders, loading };
}

export function useProfile(userId: string | null) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const { ready } = useDatabase();

  useEffect(() => {
    if (!ready || !userId) {
      setLoading(false);
      return;
    }

    localDb.getProfile(userId).then(data => {
      setProfile(data);
      setLoading(false);
    });
  }, [ready, userId]);

  const refresh = async () => {
    if (!userId) return;
    setLoading(true);
    const data = await localDb.getProfile(userId);
    setProfile(data);
    setLoading(false);
  };

  return { profile, loading, refresh };
}

export function useApplications(filters?: { job_id?: string; business_id?: string }) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const { ready } = useDatabase();

  useEffect(() => {
    if (!ready) return;

    localDb.getApplications(filters).then(data => {
      setApplications(data);
      setLoading(false);
    });
  }, [ready, filters?.job_id, filters?.business_id]);

  const refresh = async () => {
    setLoading(true);
    const data = await localDb.getApplications(filters);
    setApplications(data);
    setLoading(false);
  };

  return { applications, loading, refresh };
}

export function useReviews(revieweeId: string | null) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const { ready } = useDatabase();

  useEffect(() => {
    if (!ready || !revieweeId) {
      setLoading(false);
      return;
    }

    localDb.getReviews({ reviewee_id: revieweeId }).then(data => {
      setReviews(data);
      setLoading(false);
    });
  }, [ready, revieweeId]);

  return { reviews, loading };
}
