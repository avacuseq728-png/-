import { DrgRule, PatientRecord, User, Role } from '../types';

// Simple Mock Encryption/Decryption Helpers
const encrypt = (data: any): string => {
  try {
    const jsonString = JSON.stringify(data);
    return btoa(encodeURIComponent(jsonString));
  } catch (e) {
    console.error("Encryption failed", e);
    return "";
  }
};

const decrypt = <T>(cipherText: string | null): T | null => {
  if (!cipherText) return null;
  try {
    const jsonString = decodeURIComponent(atob(cipherText));
    return JSON.parse(jsonString) as T;
  } catch (e) {
    console.error("Decryption failed", e);
    return null;
  }
};

// Initial Mock Data
const INITIAL_RULES: DrgRule[] = [
  {
    id: '1',
    diseaseName: '原发性高血压',
    drgCode: 'I10.x',
    maxCost: 150,
    isActive: true,
    requiredMetrics: [
      { key: 'systolic', label: '收缩压', unit: 'mmHg', min: 90, max: 180 },
      { key: 'diastolic', label: '舒张压', unit: 'mmHg', min: 60, max: 110 }
    ]
  },
  {
    id: '2',
    diseaseName: '2型糖尿病',
    drgCode: 'E11.9',
    maxCost: 200,
    isActive: true,
    requiredMetrics: [
      { key: 'fastingGlucose', label: '空腹血糖', unit: 'mmol/L', min: 3.9, max: 10.0 },
      { key: 'hba1c', label: '糖化血红蛋白', unit: '%', min: 4.0, max: 9.0 }
    ]
  },
  {
    id: '3',
    diseaseName: '急性支气管炎',
    drgCode: 'J20.9',
    maxCost: 120,
    isActive: true,
    requiredMetrics: [
      { key: 'temperature', label: '体温', unit: '°C', min: 36.0, max: 39.5 },
      { key: 'wbc', label: '白细胞计数', unit: '10^9/L', min: 3.5, max: 12.0 }
    ]
  },
  {
    id: '4',
    diseaseName: '慢性阻塞性肺疾病(COPD)',
    drgCode: 'J44.9',
    maxCost: 350,
    isActive: true,
    requiredMetrics: [
      { key: 'spo2', label: '血氧饱和度', unit: '%', min: 88, max: 100 },
      { key: 'fev1', label: 'FEV1预计值%', unit: '%', min: 30, max: 100 }
    ]
  },
  {
    id: '5',
    diseaseName: '急性上呼吸道感染',
    drgCode: 'J06.9',
    maxCost: 80,
    isActive: true,
    requiredMetrics: [
      { key: 'temperature', label: '体温', unit: '°C', min: 36.0, max: 40.0 }
    ]
  },
  {
    id: '6',
    diseaseName: '急性胃炎',
    drgCode: 'K29.1',
    maxCost: 150,
    isActive: true,
    requiredMetrics: [
      { key: 'wbc', label: '白细胞计数', unit: '10^9/L', min: 3.5, max: 15.0 },
      { key: 'painLevel', label: '疼痛评分(NRS)', unit: '分', min: 0, max: 10 }
    ]
  }
];

const INITIAL_USERS: User[] = [
  { id: 'u1', username: 'dr_wang', role: Role.DOCTOR, clinicName: '幸福谷社区诊所' },
  { id: 'u2', username: 'admin_li', role: Role.ADMIN, clinicName: '中心卫生局' },
];

const KEYS = {
  RULES: 'drg_rules_enc',
  RECORDS: 'drg_records_enc',
  CURRENT_USER: 'drg_current_user_enc',
  ALL_USERS: 'drg_users_list_enc' // New key for storing the user list
};

export const StorageService = {
  getRules: (): DrgRule[] => {
    const stored = localStorage.getItem(KEYS.RULES);
    if (!stored) {
      const encryptedInitial = encrypt(INITIAL_RULES);
      localStorage.setItem(KEYS.RULES, encryptedInitial);
      return INITIAL_RULES;
    }
    return decrypt<DrgRule[]>(stored) || [];
  },

  saveRules: (rules: DrgRule[]) => {
    const encrypted = encrypt(rules);
    localStorage.setItem(KEYS.RULES, encrypted);
  },

  getRecords: (): PatientRecord[] => {
    const stored = localStorage.getItem(KEYS.RECORDS);
    return decrypt<PatientRecord[]>(stored) || [];
  },

  addRecord: (record: PatientRecord) => {
    const records = StorageService.getRecords();
    records.push(record);
    const encrypted = encrypt(records);
    localStorage.setItem(KEYS.RECORDS, encrypted);
  },

  // Bulk save for demo data generation
  saveRecords: (records: PatientRecord[]) => {
    const encrypted = encrypt(records);
    localStorage.setItem(KEYS.RECORDS, encrypted);
  },

  // --- User Management ---

  getUsers: (): User[] => {
    const stored = localStorage.getItem(KEYS.ALL_USERS);
    if (!stored) {
      const encryptedInitial = encrypt(INITIAL_USERS);
      localStorage.setItem(KEYS.ALL_USERS, encryptedInitial);
      return INITIAL_USERS;
    }
    return decrypt<User[]>(stored) || [];
  },

  addUser: (user: User) => {
    const users = StorageService.getUsers();
    // Simple check to avoid duplicate usernames
    if (users.some(u => u.username === user.username)) {
      throw new Error("用户名已存在");
    }
    users.push(user);
    const encrypted = encrypt(users);
    localStorage.setItem(KEYS.ALL_USERS, encrypted);
  },

  updateUser: (updatedUser: User) => {
    const users = StorageService.getUsers();
    const index = users.findIndex(u => u.id === updatedUser.id);
    if (index === -1) throw new Error("用户不存在");
    
    // Check for duplicate usernames (excluding self)
    if (users.some(u => u.username === updatedUser.username && u.id !== updatedUser.id)) {
      throw new Error("用户名已存在");
    }
    
    users[index] = updatedUser;
    const encrypted = encrypt(users);
    localStorage.setItem(KEYS.ALL_USERS, encrypted);

    // Update current session if editing self
    const currentUser = StorageService.getCurrentUser();
    if (currentUser && currentUser.id === updatedUser.id) {
      const encryptedUser = encrypt(updatedUser);
      localStorage.setItem(KEYS.CURRENT_USER, encryptedUser);
    }
  },

  getCurrentUser: (): User | null => {
    const stored = localStorage.getItem(KEYS.CURRENT_USER);
    return decrypt<User>(stored);
  },

  login: (username: string): User | null => {
    // Now fetch from dynamic storage instead of static MOCK_USERS
    const users = StorageService.getUsers();
    const user = users.find(u => u.username === username);
    if (user) {
      const encrypted = encrypt(user);
      localStorage.setItem(KEYS.CURRENT_USER, encrypted);
    }
    return user || null;
  },

  logout: () => {
    localStorage.removeItem(KEYS.CURRENT_USER);
  }
};