import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  user_type: 'customer' | 'business';
  last_job_posted_at: string | null;
  profile_picture_url: string | null;
  bio?: string | null;
  hourly_rate?: number | null;
  years_experience?: number | null;
  certifications?: string[] | null;
  specialties?: string[] | null;
  rating?: number | null;
  completed_jobs?: number | null;
  location?: string | null;
  created_at?: string;
}

export interface Job {
  id: string;
  customer_id: string;
  title: string;
  description: string;
  location: string;
  latitude?: number | null;
  longitude?: number | null;
  budget_min: number;
  budget_max: number;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  category?: string | null;
  urgency?: 'low' | 'medium' | 'high' | null;
  created_at: string;
  deadline?: string | null;
  image_urls?: string[] | null;
}

export interface Application {
  id: string;
  job_id: string;
  business_id: string;
  bid_amount: number;
  message: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

export interface Review {
  id: string;
  job_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  comment: string;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read: boolean;
}

export interface Conversation {
  id: string;
  participant1_id: string;
  participant2_id: string;
  last_message?: string;
  last_message_at?: string;
  created_at: string;
}

interface LocalDatabase {
  profiles: Profile[];
  jobs: Job[];
  applications: Application[];
  reviews: Review[];
  messages: Message[];
  conversations: Conversation[];
}

class LocalDB {
  private data: LocalDatabase = {
    profiles: [],
    jobs: [],
    applications: [],
    reviews: [],
    messages: [],
    conversations: [],
  };

  private initialized = false;
  private storageKey = 'weldconnect_local_db';

  async initialize() {
    if (this.initialized) return;

    try {
      let stored: string | null = null;

      if (Platform.OS === 'web') {
        stored = localStorage.getItem(this.storageKey);
      } else {
        stored = await SecureStore.getItemAsync(this.storageKey);
      }

      if (stored) {
        this.data = JSON.parse(stored);
      } else {
        this.seedData();
        await this.persist();
      }

      this.initialized = true;
    } catch (e) {
      console.error('Failed to initialize local DB:', e);
      this.seedData();
    }
  }

  private async persist() {
    try {
      const serialized = JSON.stringify(this.data);

      if (Platform.OS === 'web') {
        localStorage.setItem(this.storageKey, serialized);
      } else {
        await SecureStore.setItemAsync(this.storageKey, serialized);
      }
    } catch (e) {
      console.error('Failed to persist local DB:', e);
    }
  }

  private seedData() {
    const now = new Date().toISOString();

    this.data.profiles = [
      {
        id: 'welder-1',
        full_name: 'Mike Johnson',
        phone: '555-0101',
        user_type: 'business',
        last_job_posted_at: null,
        profile_picture_url: null,
        bio: 'Certified welder with 15 years of experience in structural steel and custom fabrication.',
        hourly_rate: 85,
        years_experience: 15,
        certifications: ['AWS D1.1', 'ASME Section IX', '6G Pipe Welding'],
        specialties: ['MIG', 'TIG', 'Structural Steel'],
        rating: 4.9,
        completed_jobs: 127,
        location: 'Austin, TX',
        created_at: now,
      },
      {
        id: 'welder-2',
        full_name: 'Sarah Martinez',
        phone: '555-0102',
        user_type: 'business',
        last_job_posted_at: null,
        profile_picture_url: null,
        bio: 'Specialized in aluminum welding and custom motorcycle parts. Detail-oriented and reliable.',
        hourly_rate: 75,
        years_experience: 8,
        certifications: ['AWS D17.1', 'Aluminum Welding Certification'],
        specialties: ['TIG', 'Aluminum', 'Custom Fabrication'],
        rating: 4.8,
        completed_jobs: 89,
        location: 'Austin, TX',
        created_at: now,
      },
      {
        id: 'welder-3',
        full_name: 'David Chen',
        phone: '555-0103',
        user_type: 'business',
        last_job_posted_at: null,
        profile_picture_url: null,
        bio: 'Expert in pipe welding for oil & gas industry. Available for urgent projects.',
        hourly_rate: 95,
        years_experience: 12,
        certifications: ['6G Pipe Welding', 'API 1104', 'ASME B31.3'],
        specialties: ['Pipe Welding', 'Stick', 'TIG'],
        rating: 4.7,
        completed_jobs: 156,
        location: 'Houston, TX',
        created_at: now,
      },
      {
        id: 'welder-4',
        full_name: 'Jennifer Brown',
        phone: '555-0104',
        user_type: 'business',
        last_job_posted_at: null,
        profile_picture_url: null,
        bio: 'Mobile welding service specializing in on-site repairs and custom gates.',
        hourly_rate: 70,
        years_experience: 10,
        certifications: ['AWS D1.1', 'Mobile Welding Certified'],
        specialties: ['MIG', 'Stick', 'Mobile Welding'],
        rating: 4.9,
        completed_jobs: 203,
        location: 'Austin, TX',
        created_at: now,
      },
      {
        id: 'welder-5',
        full_name: 'Robert Taylor',
        phone: '555-0105',
        user_type: 'business',
        last_job_posted_at: null,
        profile_picture_url: null,
        bio: 'Industrial maintenance welding specialist. Fast turnaround on emergency repairs.',
        hourly_rate: 80,
        years_experience: 18,
        certifications: ['AWS CWI', 'ASME Section IX', 'Maintenance Welding'],
        specialties: ['MIG', 'Stick', 'Maintenance'],
        rating: 4.6,
        completed_jobs: 178,
        location: 'Dallas, TX',
        created_at: now,
      },
      {
        id: 'customer-1',
        full_name: 'John Smith',
        phone: '555-0201',
        user_type: 'customer',
        last_job_posted_at: now,
        profile_picture_url: null,
        created_at: now,
      },
    ];

    this.data.jobs = [
      {
        id: 'job-1',
        customer_id: 'customer-1',
        title: 'Custom Steel Railing for Deck',
        description: 'Need a skilled welder to fabricate and install a modern steel railing for my outdoor deck. Approximately 30 linear feet. Must be powder coated black.',
        location: 'Austin, TX',
        budget_min: 1500,
        budget_max: 2500,
        status: 'open',
        category: 'Residential',
        urgency: 'medium',
        created_at: now,
        deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        image_urls: [],
      },
      {
        id: 'job-2',
        customer_id: 'customer-1',
        title: 'Repair Cracked Trailer Frame',
        description: 'Utility trailer has a crack in the frame near the tongue. Need immediate repair with proper reinforcement. Trailer must be mobile-ready after repair.',
        location: 'Round Rock, TX',
        budget_min: 300,
        budget_max: 600,
        status: 'open',
        category: 'Automotive',
        urgency: 'high',
        created_at: now,
        deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        image_urls: [],
      },
      {
        id: 'job-3',
        customer_id: 'customer-1',
        title: 'Aluminum Boat Transom Repair',
        description: 'Small aluminum fishing boat needs transom repair. Some corrosion damage that needs to be cut out and replaced. Must be watertight.',
        location: 'Lake Travis, TX',
        budget_min: 800,
        budget_max: 1200,
        status: 'open',
        category: 'Marine',
        urgency: 'low',
        created_at: now,
        deadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
        image_urls: [],
      },
      {
        id: 'job-4',
        customer_id: 'customer-1',
        title: 'Custom Gate for Driveway',
        description: 'Looking for a welder to design and build a custom wrought iron style gate for my driveway. Gate opening is 12 feet wide. Want decorative scrollwork.',
        location: 'Cedar Park, TX',
        budget_min: 2000,
        budget_max: 3500,
        status: 'open',
        category: 'Residential',
        urgency: 'low',
        created_at: now,
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        image_urls: [],
      },
      {
        id: 'job-5',
        customer_id: 'customer-1',
        title: 'Industrial Shelving Fabrication',
        description: 'Need heavy-duty steel shelving units for warehouse. 5 units total, each 8ft x 4ft x 6ft. Must support 500lbs per shelf.',
        location: 'Austin, TX',
        budget_min: 3000,
        budget_max: 5000,
        status: 'open',
        category: 'Commercial',
        urgency: 'medium',
        created_at: now,
        deadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
        image_urls: [],
      },
    ];

    this.data.applications = [];
    this.data.reviews = [];
    this.data.messages = [];
    this.data.conversations = [];
  }

  async getProfiles(filters?: { user_type?: string }) {
    await this.initialize();
    let results = [...this.data.profiles];

    if (filters?.user_type) {
      results = results.filter(p => p.user_type === filters.user_type);
    }

    return results;
  }

  async getProfile(id: string) {
    await this.initialize();
    return this.data.profiles.find(p => p.id === id) || null;
  }

  async updateProfile(id: string, updates: Partial<Profile>) {
    await this.initialize();
    const index = this.data.profiles.findIndex(p => p.id === id);

    if (index >= 0) {
      this.data.profiles[index] = { ...this.data.profiles[index], ...updates };
      await this.persist();
      return this.data.profiles[index];
    }

    return null;
  }

  async getJobs(filters?: { status?: string; customer_id?: string }) {
    await this.initialize();
    let results = [...this.data.jobs];

    if (filters?.status) {
      results = results.filter(j => j.status === filters.status);
    }

    if (filters?.customer_id) {
      results = results.filter(j => j.customer_id === filters.customer_id);
    }

    return results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async getJob(id: string) {
    await this.initialize();
    return this.data.jobs.find(j => j.id === id) || null;
  }

  async createJob(job: Omit<Job, 'id' | 'created_at'>) {
    await this.initialize();
    const newJob: Job = {
      ...job,
      id: `job-${Date.now()}`,
      created_at: new Date().toISOString(),
    };

    this.data.jobs.push(newJob);
    await this.persist();
    return newJob;
  }

  async updateJob(id: string, updates: Partial<Job>) {
    await this.initialize();
    const index = this.data.jobs.findIndex(j => j.id === id);

    if (index >= 0) {
      this.data.jobs[index] = { ...this.data.jobs[index], ...updates };
      await this.persist();
      return this.data.jobs[index];
    }

    return null;
  }

  async getApplications(filters?: { job_id?: string; business_id?: string }) {
    await this.initialize();
    let results = [...this.data.applications];

    if (filters?.job_id) {
      results = results.filter(a => a.job_id === filters.job_id);
    }

    if (filters?.business_id) {
      results = results.filter(a => a.business_id === filters.business_id);
    }

    return results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async createApplication(app: Omit<Application, 'id' | 'created_at'>) {
    await this.initialize();
    const newApp: Application = {
      ...app,
      id: `app-${Date.now()}`,
      created_at: new Date().toISOString(),
    };

    this.data.applications.push(newApp);
    await this.persist();
    return newApp;
  }

  async updateApplication(id: string, updates: Partial<Application>) {
    await this.initialize();
    const index = this.data.applications.findIndex(a => a.id === id);

    if (index >= 0) {
      this.data.applications[index] = { ...this.data.applications[index], ...updates };
      await this.persist();
      return this.data.applications[index];
    }

    return null;
  }

  async getReviews(filters?: { reviewee_id?: string }) {
    await this.initialize();
    let results = [...this.data.reviews];

    if (filters?.reviewee_id) {
      results = results.filter(r => r.reviewee_id === filters.reviewee_id);
    }

    return results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async createReview(review: Omit<Review, 'id' | 'created_at'>) {
    await this.initialize();
    const newReview: Review = {
      ...review,
      id: `review-${Date.now()}`,
      created_at: new Date().toISOString(),
    };

    this.data.reviews.push(newReview);
    await this.persist();
    return newReview;
  }

  async getConversations(userId: string) {
    await this.initialize();
    return this.data.conversations.filter(
      c => c.participant1_id === userId || c.participant2_id === userId
    );
  }

  async getMessages(conversationId: string) {
    await this.initialize();
    return this.data.messages
      .filter(m => m.conversation_id === conversationId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  async createMessage(message: Omit<Message, 'id' | 'created_at'>) {
    await this.initialize();
    const newMessage: Message = {
      ...message,
      id: `msg-${Date.now()}`,
      created_at: new Date().toISOString(),
    };

    this.data.messages.push(newMessage);

    const convIndex = this.data.conversations.findIndex(c => c.id === message.conversation_id);
    if (convIndex >= 0) {
      this.data.conversations[convIndex].last_message = message.content;
      this.data.conversations[convIndex].last_message_at = newMessage.created_at;
    }

    await this.persist();
    return newMessage;
  }

  async deleteJob(id: string) {
    await this.initialize();
    this.data.jobs = this.data.jobs.filter(j => j.id !== id);
    await this.persist();
  }

  async deleteApplication(id: string) {
    await this.initialize();
    this.data.applications = this.data.applications.filter(a => a.id !== id);
    await this.persist();
  }

  async deleteConversation(id: string) {
    await this.initialize();
    this.data.conversations = this.data.conversations.filter(c => c.id !== id);
    this.data.messages = this.data.messages.filter(m => m.conversation_id !== id);
    await this.persist();
  }
}

export const localDb = new LocalDB();
