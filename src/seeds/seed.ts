/**
 * FR-10: demo/seed data for the whole platform.
 *
 *   npm run seed
 *
 * Wipes every table and rebuilds a coherent dataset - every screen in the
 * frontend has something to show, and the rows reference each other the way
 * the running app would have created them.
 *
 * Two properties worth knowing about:
 *
 * 1. It is deterministic. All "random" values come from a fixed-seed PRNG, so
 *    two runs produce identical data and a bug found in a demo is reproducible.
 *    Dates are relative to the run, so "3 days ago" stays 3 days ago.
 *
 * 2. Enum-ish string values match what the frontend actually submits, not what
 *    reads nicely here. Symptoms are stored as 'Chest pain', not 'CHEST_PAIN',
 *    because that is what the CHW triage form posts and what the UI translates;
 *    routes are 'Oral', not 'ORAL', to match src/lib/prescribing.ts. Writing
 *    the tidier-looking constant makes the UI render raw keys.
 *
 * password_resets is deliberately left empty - a reset token is single-use and
 * time-limited, so a seeded one is either already expired (useless) or a live
 * credential sitting in version control (worse).
 */
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import {
  AppointmentStatus,
  AuditAction,
  ConsultationStatus,
  DiaryMood,
  DispenseStatus,
  NotificationType,
  PrescriptionStatus,
  ReferralStatus,
  ReferralUrgency,
  TreatmentPlanStatus,
  TriageStatus,
  UserRole,
  VisitOutcome,
} from '../auth/user-role.enum';
import { Users } from '../users/users.entity';
import { Doctors } from '../users/doctors.entity';
import { HealthWorkers } from '../users/health-workers.entity';
import { Staff } from '../users/staff.entity';
import { Patients } from '../patients/patients.entity';
import { VitalSigns } from '../triage/vital-signs.entity';
import { SymptomReports } from '../triage/symptom-reports.entity';
import { Consultations } from '../consultations/consultations.entity';
import { ChatMessages } from '../consultations/chat-messages.entity';
import { Prescriptions } from '../prescriptions/prescriptions.entity';
import { PrescriptionItems } from '../prescriptions/prescription-items.entity';
import { DispenseRecords } from '../prescriptions/dispense-records.entity';
import { TreatmentPlans } from '../prescriptions/treatment-plans.entity';
import { Medicines } from '../medicines/medicines.entity';
import { MedicineInventory } from '../medicines/medicine-inventory.entity';
import { MedicineAlternatives } from '../medicines/medicine-alternatives.entity';
import { Appointments } from '../appointments/appointments.entity';
import { Notifications } from '../notifications/notifications.entity';
import { Referrals } from '../referrals/referrals.entity';
import { FieldVisits } from '../visits/field-visits.entity';
import { DiaryEntries } from '../diary/diary-entries.entity';
import { DoctorAvailability } from '../availability/doctor-availability.entity';
import { TimeOff } from '../availability/time-off.entity';
import { PrescriptionTemplates } from '../templates/prescription-templates.entity';
import { TemplateItems } from '../templates/template-items.entity';
import { SystemSettings } from '../settings/system-settings.entity';
import { AuditLogs } from '../audit/audit-logs.entity';
import { PasswordResets } from '../auth/password-resets.entity';
import { DEFAULT_SETTINGS } from '../settings/settings.service';

const ENTITIES = [
  Users, Doctors, HealthWorkers, Staff, Patients, VitalSigns, SymptomReports,
  Consultations, ChatMessages, Prescriptions, PrescriptionItems, DispenseRecords,
  TreatmentPlans, Medicines, MedicineInventory, MedicineAlternatives, Appointments,
  Notifications, Referrals, FieldVisits, DiaryEntries, DoctorAvailability, TimeOff,
  PrescriptionTemplates, TemplateItems, SystemSettings, AuditLogs, PasswordResets,
];

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: Number(process.env.DATABASE_PORT) || 5432,
  username: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME || 'medbridge',
  entities: ENTITIES,
  synchronize: true,
  ssl: process.env.DATABASE_HOST !== 'localhost' ? { rejectUnauthorized: false } : false,
});

// ---------------------------------------------------------------------------
// Profile photos - paste your own hosted image links here, in any order.
// Accounts are assigned one each, in the order they're created below; if
// there are fewer URLs than accounts, it cycles back to the start.
// ---------------------------------------------------------------------------

// Doctors get their own dedicated list, assigned in order (doctor 1 -> first
// URL, doctor 2 -> second URL, etc.), independent of the shared cursor below.
const DOCTOR_IMAGE_URLS: string[] = [
  'https://i.ibb.co.com/KTqKwCk/images-16.jpg',
  'https://i.ibb.co.com/7d7V55tK/images-15.jpg',
  'https://i.ibb.co.com/xtdSNZLP/images-14.jpg',
  'https://i.ibb.co.com/GQvSVnz8/images-13.jpg',
  'https://i.ibb.co.com/0VpQGqJr/images-11.jpg',
  'https://i.ibb.co.com/SDhzgTtC/images-7.jpg',
  'https://i.ibb.co.com/fzgV9QGG/images-9.jpg',
  'https://i.ibb.co.com/G3x5qTX6/images-8.jpg',
  'https://i.ibb.co.com/SDhzgTtC/images-7.jpg',
  'https://i.ibb.co.com/n8rWXzbp/images-6.jpg',
  'https://i.ibb.co.com/QFrcNwtX/images-5.jpg',
  'https://i.ibb.co.com/Y7XD44qZ/images-4.jpg',
  'https://i.ibb.co.com/gMNHJgVs/images-3.jpg',
  'https://i.ibb.co.com/zW8R4gLG/images-2.jpg',
  'https://i.ibb.co.com/rGM7qTTJ/images-1.jpg',
];
/** i-th doctor's photo (wraps if there are more doctors than URLs). */
function doctorAvatar(i: number): string | undefined {
  if (DOCTOR_IMAGE_URLS.length === 0) return undefined;
  return DOCTOR_IMAGE_URLS[i % DOCTOR_IMAGE_URLS.length];
}

// CHWs get their own dedicated list too, assigned in order, independent of
// the shared cursor below.
const CHW_IMAGE_URLS: string[] = [
  'https://i.ibb.co.com/LDVHvCK6/220062224-1.png',
  'https://i.ibb.co.com/nsr1N76f/221030468.jpg',
  'https://i.ibb.co.com/3YPgJxQV/image.jpg',
  'https://i.ibb.co.com/wrCr96Ng/222543893.jpg',
  
];
/** i-th CHW's photo (wraps if there are more CHWs than URLs). */
function chwAvatar(i: number): string | undefined {
  if (CHW_IMAGE_URLS.length === 0) return undefined;
  return CHW_IMAGE_URLS[i % CHW_IMAGE_URLS.length];
}

// Everyone else (admin, pharmacists, staff, patients) cycles through
// this shared list via nextAvatar(). Swap these out with dedicated
// pharmacist / staff links whenever you send them.
const IMAGE_URLS: string[] = [
  'https://i.ibb.co.com/fzgV9QGG/images-9.jpg',
  'https://i.ibb.co.com/G3x5qTX6/images-8.jpg',
  'https://i.ibb.co.com/SDhzgTtC/images-7.jpg',
  'https://i.ibb.co.com/n8rWXzbp/images-6.jpg',
  'https://i.ibb.co.com/QFrcNwtX/images-5.jpg',
  'https://i.ibb.co.com/Y7XD44qZ/images-4.jpg',
  'https://i.ibb.co.com/gMNHJgVs/images-3.jpg',
  'https://i.ibb.co.com/zW8R4gLG/images-2.jpg',
  'https://i.ibb.co.com/rGM7qTTJ/images-1.jpg',
];
let avatarCursor = 0;
/** Next photo URL in sequence, or undefined if IMAGE_URLS is empty. */
function nextAvatar(): string | undefined {
  if (IMAGE_URLS.length === 0) return undefined;
  const url = IMAGE_URLS[avatarCursor % IMAGE_URLS.length];
  avatarCursor++;
  return url;
}

// ---------------------------------------------------------------------------
// Deterministic randomness
// ---------------------------------------------------------------------------

/** mulberry32 - small, fast, and identical across Node versions. */
function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20260826);
const int = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
const float1 = (min: number, max: number) => Math.round((min + rand() * (max - min)) * 10) / 10;
const pick = <T>(list: readonly T[]): T => list[Math.floor(rand() * list.length)];
const chance = (p: number) => rand() < p;

/** n distinct members, order shuffled deterministically. */
function pickN<T>(list: readonly T[], n: number): T[] {
  const pool = [...list];
  const out: T[] = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  return out;
}

// ---------------------------------------------------------------------------
// Clock helpers - one anchor so every relative date agrees
// ---------------------------------------------------------------------------

const NOW = new Date();
const DAY = 86_400_000;
const HOUR = 3_600_000;

const daysAgo = (d: number, hour = 10, minute = 0) => {
  const t = new Date(NOW.getTime() - d * DAY);
  t.setHours(hour, minute, 0, 0);
  return t;
};
const daysAhead = (d: number, hour = 10, minute = 0) => daysAgo(-d, hour, minute);
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * HOUR);
/** 'YYYY-MM-DD' for `type: 'date'` columns. */
const isoDate = (d: Date) => d.toISOString().slice(0, 10);

// ---------------------------------------------------------------------------
// Triage thresholds - read from the same defaults the rule engine uses, so
// seeded vitals and their stored suggestedStatus can never disagree with it.
// ---------------------------------------------------------------------------

const setting = (key: string) => Number(DEFAULT_SETTINGS.find((d) => d.key === key)!.value);
const T = {
  spo2Critical: setting('triage.spo2.critical'),
  systolicHigh: setting('triage.systolic.high'),
  systolicLow: setting('triage.systolic.low'),
  temperatureCritical: setting('triage.temperature.critical'),
  pulseCritical: setting('triage.pulse.critical'),
};

/** Mirrors TriageService.suggestTriage. */
function suggestTriage(v: {
  spo2: number;
  bpSystolic: number;
  temperature: number;
  pulse: number;
}): TriageStatus {
  if (v.spo2 < T.spo2Critical) return TriageStatus.CRITICAL;
  if (v.bpSystolic > T.systolicHigh || v.bpSystolic < T.systolicLow) return TriageStatus.CRITICAL;
  if (v.temperature > T.temperatureCritical) return TriageStatus.CRITICAL;
  if (v.pulse > T.pulseCritical) return TriageStatus.CRITICAL;
  return TriageStatus.NON_CRITICAL;
}

type VitalTier = 'normal' | 'warning' | 'critical';

/** Values chosen to land on the intended side of every threshold above. */
function vitalsFor(tier: VitalTier) {
  if (tier === 'critical') {
    return pick([
      { temperature: float1(39.7, 40.4), bpSystolic: int(150, 158), bpDiastolic: int(92, 99), pulse: int(104, 118), spo2: int(93, 95) },
      { temperature: float1(37.8, 38.6), bpSystolic: int(164, 182), bpDiastolic: int(102, 112), pulse: int(96, 112), spo2: int(93, 96) },
      { temperature: float1(36.4, 37.2), bpSystolic: int(76, 88), bpDiastolic: int(48, 58), pulse: int(108, 118), spo2: int(92, 95) },
      { temperature: float1(38.4, 39.2), bpSystolic: int(128, 148), bpDiastolic: int(82, 94), pulse: int(124, 138), spo2: int(88, 91) },
    ]);
  }
  if (tier === 'warning') {
    // Above a warning line but below every critical one.
    return {
      temperature: float1(37.7, 39.3),
      bpSystolic: int(138, 156),
      bpDiastolic: int(86, 94),
      pulse: int(102, 118),
      spo2: int(93, 95),
    };
  }
  return {
    temperature: float1(36.4, 37.3),
    bpSystolic: int(108, 128),
    bpDiastolic: int(68, 84),
    pulse: int(66, 88),
    spo2: int(96, 99),
  };
}

// ---------------------------------------------------------------------------
// Reference data
// ---------------------------------------------------------------------------

const DEFAULT_PW = 'password123';

const doctorProfiles = [
  { name: 'Dr. Shafiqul Islam',   spec: 'Cardiology',              exp: 15, qual: 'MBBS, MD (Cardiology)' },
  { name: 'Dr. Farhana Akter',    spec: 'Neurology',               exp: 12, qual: 'MBBS, FCPS (Neurology)' },
  { name: 'Dr. Mahbubur Rahman',  spec: 'Pediatrics',              exp: 20, qual: 'MBBS, DCH, FCPS' },
  { name: 'Dr. Nusrat Jahan',     spec: 'Dermatology',             exp: 8,  qual: 'MBBS, DDV' },
  { name: 'Dr. Abdul Kader',      spec: 'General Medicine',        exp: 10, qual: 'MBBS, FCPS (Medicine)' },
  { name: 'Dr. Taslima Begum',    spec: 'Gynecology & Obstetrics', exp: 14, qual: 'MBBS, FCPS (Gynae & Obs), DGO' },
  { name: 'Dr. Ashraful Haque',   spec: 'Orthopedics',             exp: 11, qual: 'MBBS, MS (Orthopedics)' },
  { name: 'Dr. Sultana Razia',    spec: 'ENT',                     exp: 9,  qual: 'MBBS, FCPS (ENT)' },
  { name: 'Dr. Mizanur Rahman',   spec: 'Nephrology',              exp: 16, qual: 'MBBS, MD (Nephrology)' },
  { name: 'Dr. Zahidul Islam',    spec: 'Gastroenterology',        exp: 13, qual: 'MBBS, MD (Gastroenterology)' },
  { name: 'Dr. Shirin Sultana',   spec: 'Psychiatry',              exp: 7,  qual: 'MBBS, MD (Psychiatry)' },
  { name: 'Dr. Golam Mostofa',    spec: 'Pulmonology',             exp: 18, qual: 'MBBS, FCPS (Medicine), MD (Pulmonology)' },
  { name: 'Dr. Rummana Ferdous',  spec: 'Endocrinology',           exp: 9,  qual: 'MBBS, MD (Endocrinology)' },
  { name: 'Dr. Habibur Rahman',   spec: 'Urology',                 exp: 17, qual: 'MBBS, MS (Urology)' },
  { name: 'Dr. Nasreen Akhter',   spec: 'Ophthalmology',           exp: 6,  qual: 'MBBS, DO (Ophthalmology)' },
];

const chwProfiles = [
  { name: 'Rashedul Alam', area: 'Rampur Union - Block A', since: '2022-03-14' },
  { name: 'Kallol Dey', area: 'Char Ramani Union - Block B', since: '2023-01-09' },
  { name: 'Tanvir Ahmed', area: 'Dalal Bazar Union - Block C', since: '2023-07-02' },
  { name: 'Mushiq Rahman', area: 'Mandari Union - Block D', since: '2024-02-20' },
];

const pharmacistProfiles = [
  { name: 'Imran Chowdhury', designation: 'Chief Pharmacist' },
  { name: 'Shirin Akter', designation: 'Pharmacist' },
];

/** Villages paired with their district, so AdminStats.byDistrict has real spread. */
const LOCATIONS = [
  { village: 'Rampur', district: 'Lakshmipur' },
  { village: 'Char Ramani', district: 'Lakshmipur' },
  { village: 'Dalal Bazar', district: 'Lakshmipur' },
  { village: 'Mandari', district: 'Noakhali' },
  { village: 'Sonapur', district: 'Noakhali' },
  { village: 'Hajirhat', district: 'Bhola' },
  { village: 'Borhanuddin', district: 'Bhola' },
  { village: 'Kalmegha', district: 'Feni' },
];

const GIVEN_NAMES = [
  'Rahim', 'Karim', 'Fatema', 'Ayesha', 'Jasim', 'Nasrin', 'Habib', 'Salma',
  'Rafiq', 'Momtaz', 'Shafiq', 'Rina', 'Alamgir', 'Rokeya', 'Farid', 'Sultana',
  'Kamal', 'Bithi', 'Anwar', 'Parvin', 'Jahangir', 'Shefali', 'Mizanur', 'Hasina',
];
const FAMILY_NAMES = ['Ahmed', 'Islam', 'Begum', 'Khan', 'Hossain', 'Uddin', 'Akter', 'Miah'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const RELATIONS = ['SPOUSE', 'PARENT', 'SIBLING', 'CHILD', 'OTHER'];
const ALLERGIES = ['Penicillin', 'Sulfa drugs', 'Aspirin', 'Dust, pollen', 'Shellfish'];
const CHRONIC = [
  'Type 2 Diabetes',
  'Hypertension',
  'Asthma',
  'Type 2 Diabetes, Hypertension',
  'Chronic kidney disease (stage 2)',
  'Rheumatoid arthritis',
];

/** [brand, generic, strength, dosageForm, therapeuticClass, manufacturer] */
const MEDICINE_CATALOG: [string, string, string, string, string, string][] = [
  ['Napa', 'Paracetamol', '500mg', 'TABLET', 'Analgesic / antipyretic', 'Beximco'],
  ['Ace', 'Paracetamol', '650mg', 'TABLET', 'Analgesic / antipyretic', 'Square'],
  ['Napa Syrup', 'Paracetamol', '120mg/5ml', 'SYRUP', 'Analgesic / antipyretic', 'Beximco'],
  ['Napa Extra', 'Paracetamol + Caffeine', '500mg', 'TABLET', 'Analgesic / antipyretic', 'Beximco'],
  ['Amlong', 'Amlodipine', '5mg', 'TABLET', 'Antihypertensive', 'Square'],
  ['Amdocal', 'Amlodipine', '10mg', 'TABLET', 'Antihypertensive', 'Incepta'],
  ['Losartan', 'Losartan Potassium', '50mg', 'TABLET', 'Antihypertensive', 'Renata'],
  ['Tenoric', 'Atenolol', '50mg', 'TABLET', 'Beta blocker', 'Square'],
  ['Bisocor', 'Bisoprolol', '5mg', 'TABLET', 'Beta blocker', 'Incepta'],
  ['Cardura', 'Doxazosin', '2mg', 'TABLET', 'Alpha blocker', 'ACI'],
  ['Seclo', 'Omeprazole', '20mg', 'TABLET', 'Proton pump inhibitor', 'Square'],
  ['Losectil', 'Omeprazole', '40mg', 'TABLET', 'Proton pump inhibitor', 'Eskayef'],
  ['Maxpro', 'Esomeprazole', '20mg', 'TABLET', 'Proton pump inhibitor', 'Renata'],
  ['Sergel', 'Esomeprazole', '40mg', 'TABLET', 'Proton pump inhibitor', 'Healthcare'],
  ['Ranidin', 'Ranitidine', '150mg', 'TABLET', 'H2 blocker', 'Square'],
  ['Antacid Plus', 'Aluminium Hydroxide', '400mg', 'SYRUP', 'Antacid', 'ACI'],
  ['Alatrol', 'Cetirizine', '10mg', 'TABLET', 'Antihistamine', 'Square'],
  ['Fexo', 'Fexofenadine', '120mg', 'TABLET', 'Antihistamine', 'Square'],
  ['Histacin', 'Chlorpheniramine', '4mg', 'TABLET', 'Antihistamine', 'Beximco'],
  ['Monas', 'Montelukast', '10mg', 'TABLET', 'Anti-asthmatic', 'Acme'],
  ['Ventolin Inhaler', 'Salbutamol', '100mcg/dose', 'INJECTION', 'Bronchodilator', 'GSK'],
  ['Azithro', 'Azithromycin', '500mg', 'TABLET', 'Antibiotic (macrolide)', 'Beximco'],
  ['Zimax', 'Azithromycin', '250mg', 'TABLET', 'Antibiotic (macrolide)', 'Square'],
  ['Ciprocin', 'Ciprofloxacin', '500mg', 'TABLET', 'Antibiotic (quinolone)', 'Square'],
  ['Metsafe', 'Metronidazole', '400mg', 'TABLET', 'Antibiotic (antiprotozoal)', 'Incepta'],
  ['Amoxin Syrup', 'Amoxicillin', '125mg/5ml', 'SYRUP', 'Antibiotic (penicillin)', 'Opsonin'],
  ['Ceftron', 'Ceftriaxone', '1g', 'INJECTION', 'Antibiotic (cephalosporin)', 'Square'],
  ['Glucophage', 'Metformin', '500mg', 'TABLET', 'Antidiabetic', 'Radiant'],
  ['Comet', 'Metformin', '850mg', 'TABLET', 'Antidiabetic', 'Square'],
  ['Renata Insulin', 'Insulin (human, isophane)', '100IU/ml', 'INJECTION', 'Antidiabetic', 'Renata'],
  ['Ecosprin', 'Aspirin', '75mg', 'TABLET', 'Antiplatelet', 'Square'],
  ['Flexibac', 'Diclofenac Sodium', '50mg', 'TABLET', 'NSAID', 'Beximco'],
  ['Prednisolone', 'Prednisolone', '5mg', 'TABLET', 'Corticosteroid', 'Opsonin'],
  ['Rivotril', 'Clonazepam', '0.5mg', 'TABLET', 'Anticonvulsant', 'Roche'],
  ['Vitamin D3', 'Cholecalciferol', '2000IU', 'TABLET', 'Vitamin supplement', 'Eskayef'],
  ['Calbo D', 'Calcium + Vitamin D3', '500mg', 'TABLET', 'Mineral supplement', 'Square'],
  ['Orsaline-N', 'Oral Rehydration Salts', '20.5g/l', 'SYRUP', 'Rehydration', 'SMC'],
  ['Optimox', 'Moxifloxacin', '0.5%', 'DROPS', 'Ophthalmic antibiotic', 'Square'],
  ['Otogesic', 'Benzocaine + Phenazone', '1%', 'DROPS', 'Otic analgesic', 'Acme'],
];

/** Exactly the options src/app/chw/triage/[patientId]/page.tsx offers. */
const TRIAGE_SYMPTOMS = [
  'Fever', 'Cough', 'Headache', 'Body ache', 'Vomiting', 'Fatigue',
  'Diarrhea', 'Rash', 'Sore throat', 'Breathing difficulty', 'Chest pain', 'Dizziness',
];
/** Exactly the options src/app/patient/diary/page.tsx offers. */
const DIARY_SYMPTOMS = [
  'Fever', 'Headache', 'Cough', 'Tiredness', 'Dizziness', 'Nausea',
  'Poor sleep', 'Shortness of breath', 'Swelling', 'Rash', 'Body ache',
];
const DURATIONS = ['SINCE_TODAY', '2_DAYS', '1_WEEK', '2_WEEKS_PLUS'];

const ROUTINE_COMPLAINTS = [
  'Fever and body ache for two days',
  'Persistent dry cough',
  'Headache and dizziness in the mornings',
  'Loose motion since yesterday',
  'Itchy rash on both forearms',
  'Sore throat and difficulty swallowing',
  'General weakness and poor appetite',
  'Follow-up on blood pressure medication',
];
const CRITICAL_COMPLAINTS = [
  'Severe chest pain and difficulty breathing',
  'Breathlessness at rest, cannot walk to the road',
  'High fever with confusion since morning',
  'Fainted twice today, very weak pulse',
];

/** Free text on the referral form - stored as the label the UI shows. */
const FACILITIES = [
  { name: 'Lakshmipur Sadar Hospital', type: 'District hospital', dept: 'Emergency' },
  { name: 'Ramgati Upazila Health Complex', type: 'Community health centre', dept: 'Outpatient' },
  { name: 'Noakhali Medical College Hospital', type: 'Medical college', dept: 'Cardiology' },
  { name: 'Chandpur General Hospital', type: 'District hospital', dept: 'Orthopaedics' },
  { name: 'Popular Diagnostic Centre, Feni', type: 'Diagnostic centre', dept: 'Radiology' },
  { name: 'Sonapur Specialist Clinic', type: 'Specialist clinic', dept: 'Obstetrics' },
];

const FREQUENCIES = ['Once daily', 'Twice daily', 'Three times daily', 'Every 8 hours', 'At night', 'As needed'];
const ROUTES = ['Oral', 'Topical', 'Inhalation', 'Intramuscular'];

// ---------------------------------------------------------------------------

async function seed() {
  await dataSource.initialize();
  console.log(`Connected to ${process.env.DATABASE_NAME || 'medbridge'}.`);

  if (DOCTOR_IMAGE_URLS.length === 0) {
    console.log('No entries in DOCTOR_IMAGE_URLS - seeded doctors will have no profileImage (falls back to initials).');
  } else {
    console.log(`Using ${DOCTOR_IMAGE_URLS.length} doctor image URL(s).`);
  }
  if (CHW_IMAGE_URLS.length === 0) {
    console.log('No entries in CHW_IMAGE_URLS - seeded CHWs will have no profileImage (falls back to initials).');
  } else {
    console.log(`Using ${CHW_IMAGE_URLS.length} CHW image URL(s).`);
  }
  if (IMAGE_URLS.length === 0) {
    console.log('No entries in IMAGE_URLS - other seeded accounts will have no profileImage (falls back to initials).');
  } else {
    console.log(`Using ${IMAGE_URLS.length} image URL(s), cycled across the remaining seeded accounts.`);
  }

  // ---------- Wipe ----------
  // One statement so foreign keys never see a half-empty schema. RESTART
  // IDENTITY means ids are stable across runs, which keeps demo URLs valid.
  const tables = ENTITIES.map(
    (e) => `"${dataSource.getMetadata(e).tableName}"`,
  ).join(', ');
  await dataSource.query(`TRUNCATE ${tables} RESTART IDENTITY CASCADE`);
  console.log(`Truncated ${ENTITIES.length} tables.`);

  const repo = <T extends object>(e: new () => T) => dataSource.getRepository<T>(e);
  const usersRepo = repo(Users);
  const patientsRepo = repo(Patients);
  const medsRepo = repo(Medicines);

  // Hashed once and shared: every demo account uses the same published
  // password, and 24 bcrypt rounds of work for identical input is waste.
  const password = await bcrypt.hash(DEFAULT_PW, 10);
  const counts: Record<string, number> = {};
  const track = (label: string, n: number) => (counts[label] = (counts[label] ?? 0) + n);

  // ---------- System settings ----------
  // The service seeds these on boot, but a wipe leaves the table empty until
  // the next restart - so put them back now.
  await repo(SystemSettings).save(
    DEFAULT_SETTINGS.map((d) => ({
      ...d,
      value:
        d.key === 'platform.announcement'
          ? 'Demo environment - seeded data, safe to click anything.'
          : d.value,
    })),
  );
  track('system_settings', DEFAULT_SETTINGS.length);

  // ---------- Admin ----------
  const admin = await usersRepo.save(
    usersRepo.create({
      fullName: 'System Administrator',
      email: 'admin@medbridge.com',
      phone: '+8801700000000',
      password,
      role: UserRole.ADMIN,
      isActive: true,
      profileImage: nextAvatar(),
    }),
  );
  await repo(Staff).save({ user: admin, department: 'Administration', designation: 'System Administrator' });

  // ---------- Doctors ----------
  const doctors: Users[] = [];
  for (const [i, d] of doctorProfiles.entries()) {
    const user = await usersRepo.save(
      usersRepo.create({
        fullName: d.name,
        email: `doctor${i + 1}@medbridge.com`,
        phone: `+8801710${String(100000 + i).padStart(6, '0')}`,
        password,
        role: UserRole.DOCTOR,
        isPublic: true,
        isActive: true,
        profileImage: doctorAvatar(i),
      }),
    );
    await repo(Doctors).save({
      user,
      specialization: d.spec,
      qualifications: d.qual,
      experienceYears: d.exp,
      licenseNumber: `BMDC-A-${1000 + i}`,
      bio:
        `${d.name} has ${d.exp} years in ${d.spec.toLowerCase()} and consults for the ` +
        `Medbridge rural network, mainly by chat with CHW-assisted patients.`,
    });
    doctors.push(user);
  }

  // ---------- CHWs ----------
  const chws: Users[] = [];
  for (const [i, c] of chwProfiles.entries()) {
    const user = await usersRepo.save(
      usersRepo.create({
        fullName: c.name,
        email: `chw${i + 1}@medbridge.com`,
        phone: `+8801810${String(100000 + i).padStart(6, '0')}`,
        password,
        role: UserRole.CHW,
        isPublic: true,
        isActive: true,
        profileImage: chwAvatar(i),
      }),
    );
    await repo(HealthWorkers).save({ user, assignedArea: c.area, activeSince: c.since });
    chws.push(user);
  }

  // ---------- Pharmacists ----------
  const pharmacists: Users[] = [];
  for (const [i, p] of pharmacistProfiles.entries()) {
    const user = await usersRepo.save(
      usersRepo.create({
        fullName: p.name,
        email: `pharmacist${i + 1}@medbridge.com`,
        phone: `+8801910${String(100000 + i).padStart(6, '0')}`,
        password,
        role: UserRole.PHARMACIST,
        isPublic: true,
        isActive: true,
        profileImage: nextAvatar(),
      }),
    );
    await repo(Staff).save({ user, department: 'Pharmacy', designation: p.designation });
    pharmacists.push(user);
  }

  // ---------- Front-desk staff ----------
  const receptionist = await usersRepo.save(
    usersRepo.create({
      fullName: 'Tahmina Rahman',
      email: 'staff1@medbridge.com',
      phone: '+8801610100000',
      password,
      role: UserRole.STAFF,
      isPublic: true,
      isActive: true,
      profileImage: nextAvatar(),
    }),
  );
  await repo(Staff).save({ user: receptionist, department: 'Front Desk', designation: 'Coordinator' });

  // One deactivated account so the admin user list has an inactive row to show.
  await usersRepo.save(
    usersRepo.create({
      fullName: 'Dr. Kamrul Hasan',
      email: 'doctor.former@medbridge.com',
      phone: '+8801710999999',
      password,
      role: UserRole.DOCTOR,
      isPublic: false,
      isActive: false,
      profileImage: nextAvatar(),
    }),
  );
  track('users', 1 + doctors.length + chws.length + pharmacists.length + 2);

  // ---------- Doctor availability ----------
  // Sun-Thu mornings for everyone, plus afternoons for the first three. Friday
  // and Saturday are left clear, which is what the local week looks like.
  const slots: Partial<DoctorAvailability>[] = [];
  doctors.forEach((doctor, i) => {
    for (const dayOfWeek of [0, 1, 2, 3, 4]) {
      slots.push({ doctor, dayOfWeek, startTime: '09:00', endTime: '13:00', slotMinutes: 30, isActive: true });
      if (i < 3) {
        slots.push({ doctor, dayOfWeek, startTime: '16:00', endTime: '19:00', slotMinutes: 20, isActive: true });
      }
    }
  });
  await repo(DoctorAvailability).save(slots);
  track('doctor_availability', slots.length);

  await repo(TimeOff).save([
    { doctor: doctors[0], date: isoDate(daysAhead(3)), reason: 'Conference in Dhaka' },
    { doctor: doctors[0], date: isoDate(daysAhead(4)), reason: 'Conference in Dhaka' },
    { doctor: doctors[1], date: isoDate(daysAhead(9)), reason: 'Personal leave' },
    { doctor: doctors[3], date: isoDate(daysAhead(1)), reason: 'Field camp' },
  ]);
  track('time_off', 4);

  // ---------- Medicines, inventory, alternatives ----------
  const medicines: Medicines[] = [];
  for (const [brand, generic, strength, form, cls, mfr] of MEDICINE_CATALOG) {
    const med = await medsRepo.save(
      medsRepo.create({
        brandName: brand,
        genericName: generic,
        manufacturer: mfr,
        dosageForm: form,
        strength,
        therapeuticClass: cls,
        isAvailable: true,
      }),
    );
    medicines.push(med);
  }
  track('medicines', medicines.length);

  // Stock spread: most healthy, a few at or under threshold, two at zero so
  // the pharmacist dashboard has low-stock and out-of-stock counts to show.
  const inventory = medicines.map((medicine, i) => {
    let stockQty = int(60, 400);
    if (i % 11 === 3) stockQty = int(1, 12); // below threshold
    if (i === 5 || i === 26) stockQty = 0; // out of stock
    return {
      medicine,
      stockQty,
      threshold: 20,
      updatedBy: pick(pharmacists),
    };
  });
  await repo(MedicineInventory).save(inventory);
  track('medicine_inventory', inventory.length);

  // Out-of-stock medicines are marked unavailable, the way the stock endpoint
  // would leave them.
  for (const inv of inventory) {
    if (inv.stockQty === 0) {
      inv.medicine.isAvailable = false;
      await medsRepo.save(inv.medicine);
    }
  }

  // Same generic name => alternatives, written both directions.
  const byGeneric = new Map<string, Medicines[]>();
  medicines.forEach((m) => {
    const list = byGeneric.get(m.genericName) ?? [];
    list.push(m);
    byGeneric.set(m.genericName, list);
  });
  const alternatives: Partial<MedicineAlternatives>[] = [];
  for (const group of byGeneric.values()) {
    for (const a of group) {
      for (const b of group) if (a.id !== b.id) alternatives.push({ medicine: a, alternative: b });
    }
  }
  await repo(MedicineAlternatives).save(alternatives);
  track('medicine_alternatives', alternatives.length);

  // ---------- Patients ----------
  const PATIENT_COUNT = 60;
  const PORTAL_LOGINS = 12; // patients who also have an account they can log into
  const year = NOW.getFullYear();
  const patients: Patients[] = [];

  for (let i = 0; i < PATIENT_COUNT; i++) {
    const given = GIVEN_NAMES[i % GIVEN_NAMES.length];
    const family = FAMILY_NAMES[i % FAMILY_NAMES.length];
    const fullName = `${given} ${family}`;
    const loc = LOCATIONS[i % LOCATIONS.length];
    const gender = i % 7 === 6 ? 'OTHER' : i % 2 === 0 ? 'MALE' : 'FEMALE';

    // Registration dates spread over the last ~5 months so "new in period"
    // stats are non-zero at 7, 30, and 90 days.
    const registeredOn = daysAgo(int(0, 150), int(9, 16), int(0, 59));

    let user: Users | null = null;
    if (i < PORTAL_LOGINS) {
      user = await usersRepo.save(
        usersRepo.create({
          fullName,
          email: `patient${i + 1}@medbridge.com`,
          phone: `+8801720${String(100000 + i).padStart(6, '0')}`,
          password,
          role: UserRole.PATIENT,
          isActive: true,
          profileImage: nextAvatar(),
        }),
      );
    }

    const patient = patientsRepo.create({
      user: user ?? undefined,
      mrn: `P-${year}-${String(i + 1).padStart(6, '0')}`,
      fullName,
      dob: isoDate(new Date(Date.UTC(1950 + ((i * 7) % 62), (i * 5) % 12, ((i * 11) % 27) + 1))),
      gender,
      bloodGroup: BLOOD_GROUPS[i % BLOOD_GROUPS.length],
      phone: `+8801720${String(200000 + i).padStart(6, '0')}`,
      altPhone: chance(0.3) ? `+8801730${String(200000 + i).padStart(6, '0')}` : undefined,
      address: `House ${int(1, 90)}, Ward ${int(1, 9)}, ${loc.village}`,
      village: loc.village,
      district: loc.district,
      emergencyContactName: `${pick(GIVEN_NAMES)} ${family}`,
      emergencyContactRelation: pick(RELATIONS),
      emergencyContactPhone: `+8801740${String(200000 + i).padStart(6, '0')}`,
      allergies: chance(0.22) ? pick(ALLERGIES) : undefined,
      chronicConditions: chance(0.35) ? pick(CHRONIC) : undefined,
      currentMedications: chance(0.25) ? `${pick(medicines).brandName} ${pick(['once daily', 'twice daily'])}` : undefined,
      registeredBy: chws[i % chws.length],
      createdAt: registeredOn,
    });
    patients.push(await patientsRepo.save(patient));
  }
  track('users', PORTAL_LOGINS);
  track('patients', patients.length);

  // ---------- Vitals + symptom reports ----------
  // Roughly two thirds of patients have been triaged at least once; a handful
  // have a short series so the vitals trend on the record has something to plot.
  const vitalsRows: VitalSigns[] = [];
  const reportRows: SymptomReports[] = [];
  const criticalReports: { patient: Patients; report: SymptomReports }[] = [];

  for (const [i, patient] of patients.entries()) {
    if (i % 3 === 2) continue; // never triaged
    const chw = patient.registeredBy ?? chws[i % chws.length];
    const series = i < 8 ? int(3, 5) : int(1, 2);

    for (let s = series - 1; s >= 0; s--) {
      const tier: VitalTier =
        i === 0 || i === PATIENT_COUNT - 1
          ? s === 0
            ? 'critical'
            : 'warning'
          : chance(0.12)
            ? 'critical'
            : chance(0.3)
              ? 'warning'
              : 'normal';

      const v = vitalsFor(tier);
      const recordedAt = daysAgo(s * int(4, 9) + int(0, 3), int(8, 17), int(0, 59));
      const vital = await repo(VitalSigns).save({
        patient,
        ...v,
        respiratoryRate: tier === 'critical' ? int(24, 30) : int(14, 20),
        bloodSugar: chance(0.4) ? int(5, 14) : undefined,
        recordedBy: chw,
        recordedAt,
      } as VitalSigns);
      vitalsRows.push(vital);

      const suggested = suggestTriage(v);
      const isCritical = suggested === TriageStatus.CRITICAL;
      const report = await repo(SymptomReports).save({
        patient,
        vitalSign: vital,
        primaryComplaint: isCritical ? pick(CRITICAL_COMPLAINTS) : pick(ROUTINE_COMPLAINTS),
        symptoms: pickN(TRIAGE_SYMPTOMS, int(2, 4)),
        duration: pick(DURATIONS),
        severity: isCritical ? 'SEVERE' : tier === 'warning' ? 'MODERATE' : 'MILD',
        // The CHW usually accepts the suggestion; occasionally they escalate a
        // non-critical one on judgement, which is exactly why both are stored.
        triageStatus: isCritical
          ? TriageStatus.CRITICAL
          : chance(0.08)
            ? TriageStatus.CRITICAL
            : TriageStatus.NON_CRITICAL,
        suggestedStatus: suggested,
        notes: chance(0.5) ? pick([
          'Advised fluids and rest, will check again on the next round.',
          'Family has the medicine at home, showed them the dosing again.',
          'Lives alone; asked a neighbour to look in this evening.',
          'Walked 40 minutes to reach the house, road flooded.',
        ]) : undefined,
        recordedBy: chw,
        recordedAt,
      } as SymptomReports);
      reportRows.push(report);
      if (report.triageStatus === TriageStatus.CRITICAL) criticalReports.push({ patient, report });
    }
  }
  track('vital_signs', vitalsRows.length);
  track('symptom_reports', reportRows.length);

  // ---------- Field visits ----------
  const visitRows: Partial<FieldVisits>[] = [];
  for (let d = 0; d < 30; d++) {
    for (const chw of chws) {
      for (let v = 0; v < int(1, 3); v++) {
        const patient = pick(patients);
        const outcome = pick([
          VisitOutcome.ROUTINE_CHECK, VisitOutcome.ROUTINE_CHECK, VisitOutcome.TRIAGE_DONE,
          VisitOutcome.TRIAGE_DONE, VisitOutcome.NOT_HOME, VisitOutcome.FOLLOW_UP_NEEDED,
          VisitOutcome.REFERRED,
        ]);
        visitRows.push({
          patient,
          chw,
          visitDate: isoDate(daysAgo(d)),
          outcome,
          notes:
            outcome === VisitOutcome.NOT_HOME
              ? 'No one at home, neighbour said they went to the market.'
              : chance(0.5)
                ? pick([
                    'Vitals taken, nothing concerning.',
                    'Reminded about the evening dose.',
                    'Wound is healing, dressing changed.',
                    'Asked to come to the union centre if the fever returns.',
                  ])
                : undefined,
          village: patient.village,
          travelMinutes: int(10, 95),
          followUpNeeded: outcome === VisitOutcome.FOLLOW_UP_NEEDED || chance(0.15),
          createdAt: daysAgo(d, int(9, 18), int(0, 59)),
        });
      }
    }
  }
  await repo(FieldVisits).save(visitRows);
  track('field_visits', visitRows.length);

  // ---------- Diary entries ----------
  // Only patients with a login keep a diary; that is who the screen is for.
  const diaryRows: Partial<DiaryEntries>[] = [];
  for (const patient of patients.slice(0, PORTAL_LOGINS)) {
    for (let d = 29; d >= 0; d--) {
      if (chance(0.45)) continue; // nobody writes every day
      const mood = pick([DiaryMood.BETTER, DiaryMood.SAME, DiaryMood.SAME, DiaryMood.WORSE]);
      diaryRows.push({
        patient,
        recordedBy: chance(0.85) ? patient.user : pick(chws),
        note: pick([
          'Slept better last night, the cough is easier in the morning.',
          'Head still heavy. Took the tablet after breakfast.',
          'Walked to the shop and back without stopping today.',
          'Pain came back in the evening, worse when I lie down.',
          'Forgot the night dose yesterday, took it this morning instead.',
          'Feeling about the same. Appetite is a little better.',
          'Swelling in the ankles is down since I cut the salt.',
        ]),
        symptoms: chance(0.7) ? pickN(DIARY_SYMPTOMS, int(1, 3)) : undefined,
        mood,
        painLevel: mood === DiaryMood.WORSE ? int(5, 9) : int(0, 4),
        medicationTaken: chance(0.82),
        createdAt: daysAgo(d, int(7, 22), int(0, 59)),
      });
    }
  }
  await repo(DiaryEntries).save(diaryRows);
  track('diary_entries', diaryRows.length);

  // ---------- Consultations + chat transcripts ----------
  const consultations: Consultations[] = [];
  const chatRows: Partial<ChatMessages>[] = [];

  /** A short, plausible transcript. The patient speaks as their own user when
   *  they have one, otherwise the CHW is typing on their behalf. */
  const transcript = (patient: Patients, doctor: Users, chw: Users, complaint: string) => {
    const patientVoice = patient.user ?? chw;
    return [
      { sender: doctor, message: `Assalamu alaikum. I have the vitals from ${chw.fullName}. How are you feeling right now?` },
      { sender: patientVoice, message: complaint },
      { sender: doctor, message: 'Any chest pain, or trouble breathing when you lie flat?' },
      { sender: patientVoice, message: chance(0.5) ? 'No chest pain. Breathing is normal.' : 'A little short of breath when I climb the stairs.' },
      { sender: doctor, message: 'Understood. Are you taking anything for it at the moment?' },
      { sender: patientVoice, message: chance(0.5) ? 'Only paracetamol from the shop.' : 'Nothing yet.' },
      { sender: doctor, message: 'I am sending a prescription to the pharmacy. Rest, plenty of fluids, and let the CHW know if it worsens.' },
      { sender: patientVoice, message: 'Thank you doctor.' },
    ];
  };

  // 14 completed, 4 scheduled ahead, 2 in progress, 2 cancelled.
  for (let i = 0; i < 22; i++) {
    const patient = patients[i % patients.length];
    const doctor = doctors[i % doctors.length];
    const chw = patient.registeredBy ?? chws[i % chws.length];
    const complaint = pick(ROUTINE_COMPLAINTS);

    let status = ConsultationStatus.COMPLETED;
    let scheduledAt = daysAgo(int(1, 40), int(9, 18));
    if (i >= 14 && i < 18) {
      status = ConsultationStatus.SCHEDULED;
      scheduledAt = daysAhead(int(1, 10), pick([9, 10, 11, 16, 17]), pick([0, 30]));
    } else if (i >= 18 && i < 20) {
      status = ConsultationStatus.IN_PROGRESS;
      scheduledAt = hoursAgo(1);
    } else if (i >= 20) {
      status = ConsultationStatus.CANCELLED;
      scheduledAt = daysAgo(int(2, 12), 11);
    }

    const consult = await repo(Consultations).save({
      patient,
      doctor,
      scheduledBy: chw,
      scheduledAt,
      reason: complaint,
      status,
      diagnosis:
        status === ConsultationStatus.COMPLETED
          ? pick(['Viral fever', 'Acute pharyngitis', 'Essential hypertension', 'Acute gastroenteritis', 'Contact dermatitis', 'Iron-deficiency anaemia'])
          : undefined,
      doctorNotes:
        status === ConsultationStatus.COMPLETED
          ? 'Advised rest and fluids. Review in one week if symptoms persist.'
          : status === ConsultationStatus.IN_PROGRESS
            ? 'Waiting on the patient to confirm the current dose.'
            : undefined,
      completedAt: status === ConsultationStatus.COMPLETED ? new Date(scheduledAt.getTime() + 40 * 60_000) : undefined,
      createdAt: new Date(scheduledAt.getTime() - 2 * DAY),
    } as Consultations);
    consultations.push(consult);

    if (status === ConsultationStatus.COMPLETED || status === ConsultationStatus.IN_PROGRESS) {
      const lines = transcript(patient, doctor, chw, complaint);
      const keep = status === ConsultationStatus.IN_PROGRESS ? 4 : lines.length;
      lines.slice(0, keep).forEach((line, n) =>
        chatRows.push({
          consultation: consult,
          sender: line.sender,
          message: line.message,
          sentAt: new Date(scheduledAt.getTime() + n * 4 * 60_000),
        }),
      );
    }
  }
  await repo(ChatMessages).save(chatRows);
  track('consultations', consultations.length);
  track('chat_messages', chatRows.length);

  const completed = consultations.filter((c) => c.status === ConsultationStatus.COMPLETED);

  // ---------- Prescription templates ----------
  const findMed = (brand: string) => medicines.find((m) => m.brandName === brand)!;
  const templateDefs = [
    {
      doctor: doctors[4], name: 'Viral fever - adult', condition: 'Viral fever', isShared: true, useCount: 23,
      notes: 'Standard supportive care. Review if fever persists past three days.',
      items: [
        { medicine: findMed('Napa'), dosage: '1 tablet', frequency: 'Three times daily', duration: '5 days', route: 'Oral', instructions: 'After meals' },
        { medicine: findMed('Alatrol'), dosage: '1 tablet', frequency: 'At night', duration: '5 days', route: 'Oral', instructions: 'May cause drowsiness' },
      ],
    },
    {
      doctor: doctors[0], name: 'Hypertension - first line', condition: 'Essential hypertension', isShared: true, useCount: 41,
      notes: 'Recheck BP in two weeks before any dose change.',
      items: [
        { medicine: findMed('Amlong'), dosage: '1 tablet', frequency: 'Once daily', duration: '30 days', route: 'Oral', instructions: 'Same time each morning' },
        { medicine: findMed('Ecosprin'), dosage: '1 tablet', frequency: 'Once daily', duration: '30 days', route: 'Oral', instructions: 'After dinner' },
      ],
    },
    {
      doctor: doctors[0], name: 'Type 2 diabetes - starter', condition: 'Type 2 diabetes', isShared: false, useCount: 12,
      notes: 'Start low, review fasting sugar after two weeks.',
      items: [
        { medicine: findMed('Glucophage'), dosage: '1 tablet', frequency: 'Twice daily', duration: '30 days', route: 'Oral', instructions: 'With breakfast and dinner' },
      ],
    },
    {
      doctor: doctors[2], name: 'Paediatric fever (syrup)', condition: 'Fever in children', isShared: true, useCount: 34,
      notes: 'Weight-based dosing - confirm the child’s weight before issuing.',
      items: [
        { medicine: findMed('Napa Syrup'), dosage: '5 ml', frequency: 'Three times daily', duration: '3 days', route: 'Oral', instructions: 'Shake well before use' },
        { medicine: findMed('Orsaline-N'), dosage: '1 sachet in 500ml water', frequency: 'As needed', duration: '3 days', route: 'Oral', instructions: 'After each loose motion' },
      ],
    },
    {
      doctor: doctors[3], name: 'Contact dermatitis', condition: 'Contact dermatitis', isShared: false, useCount: 7,
      notes: 'Stop the steroid once the rash settles.',
      items: [
        { medicine: findMed('Prednisolone'), dosage: '1 tablet', frequency: 'Once daily', duration: '5 days', route: 'Oral', instructions: 'With food' },
        { medicine: findMed('Fexo'), dosage: '1 tablet', frequency: 'Once daily', duration: '7 days', route: 'Oral' },
      ],
    },
    {
      doctor: doctors[1], name: 'Acute gastritis', condition: 'Acute gastritis', isShared: true, useCount: 19,
      notes: 'Avoid NSAIDs while on treatment.',
      items: [
        { medicine: findMed('Seclo'), dosage: '1 capsule', frequency: 'Once daily', duration: '14 days', route: 'Oral', instructions: '30 minutes before breakfast' },
        { medicine: findMed('Antacid Plus'), dosage: '10 ml', frequency: 'Three times daily', duration: '7 days', route: 'Oral', instructions: 'After meals' },
      ],
    },
  ];

  let templateItemCount = 0;
  for (const def of templateDefs) {
    const template = await repo(PrescriptionTemplates).save({
      doctor: def.doctor,
      name: def.name,
      condition: def.condition,
      notes: def.notes,
      isShared: def.isShared,
      useCount: def.useCount,
      createdAt: daysAgo(int(20, 200)),
    } as PrescriptionTemplates);
    await repo(TemplateItems).save(def.items.map((i) => ({ ...i, template })));
    templateItemCount += def.items.length;
  }
  track('prescription_templates', templateDefs.length);
  track('template_items', templateItemCount);

  // ---------- Prescriptions, items, dispensing ----------
  const prescriptions: Prescriptions[] = [];
  let itemCount = 0;
  const dispenseRows: Partial<DispenseRecords>[] = [];

  for (const [i, consult] of completed.entries()) {
    const issuedAt = consult.completedAt ?? daysAgo(int(1, 30));

    // Spread across the states the pharmacist queue and history both need.
    let status = PrescriptionStatus.ACTIVE;
    let dispenseStatus = DispenseStatus.PENDING;
    if (i % 7 === 3) dispenseStatus = DispenseStatus.PARTIAL;
    else if (i % 7 === 4 || i % 7 === 5) dispenseStatus = DispenseStatus.DISPENSED;
    if (dispenseStatus === DispenseStatus.DISPENSED && chance(0.5)) status = PrescriptionStatus.COMPLETED;
    const cancelled = i === completed.length - 1;
    if (cancelled) {
      status = PrescriptionStatus.CANCELLED;
      dispenseStatus = DispenseStatus.PENDING;
    }

    const chosen = pickN(medicines.filter((m) => m.isAvailable), int(1, 3));
    const rx = await repo(Prescriptions).save({
      consultation: consult,
      patient: consult.patient,
      doctor: consult.doctor,
      status,
      doctorNotes: pick([
        'Rest for three days, plenty of fluids, return if the fever persists.',
        'Take with food. Stop and call if there is any rash.',
        'Complete the full course even if you feel better.',
        'Recheck blood pressure in two weeks at the union centre.',
      ]),
      dispenseStatus,
      dispensedAt: dispenseStatus === DispenseStatus.PENDING ? undefined : new Date(issuedAt.getTime() + int(2, 30) * HOUR),
      cancelReason: cancelled ? 'Superseded - patient was referred to hospital instead.' : undefined,
      cancelledAt: cancelled ? new Date(issuedAt.getTime() + 6 * HOUR) : undefined,
      issuedAt,
    } as Prescriptions);

    const items = chosen.map((medicine) => ({
      prescription: rx,
      medicine,
      dosage: medicine.dosageForm === 'SYRUP' ? `${pick([5, 10])} ml` : '1 tablet',
      frequency: pick(FREQUENCIES),
      duration: `${pick([3, 5, 7, 10, 14, 30])} days`,
      route: medicine.dosageForm === 'DROPS' ? 'Topical' : medicine.dosageForm === 'INJECTION' ? 'Intramuscular' : 'Oral',
      instructions: chance(0.6) ? pick(['After meals', 'Before breakfast', 'With plenty of water', 'At bedtime']) : undefined,
    }));
    const savedItems = await repo(PrescriptionItems).save(items);
    itemCount += savedItems.length;

    // A PARTIAL prescription has some items released, a DISPENSED one has all.
    if (dispenseStatus !== DispenseStatus.PENDING) {
      const releasing = dispenseStatus === DispenseStatus.DISPENSED ? savedItems : savedItems.slice(0, 1);
      releasing.forEach((item) =>
        dispenseRows.push({
          prescription: rx,
          medicine: item.medicine,
          quantity: int(6, 30),
          dispensedBy: pick(pharmacists),
          notes: dispenseStatus === DispenseStatus.PARTIAL ? 'Remaining item out of stock, patient to return.' : undefined,
          dispensedAt: rx.dispensedAt ?? new Date(issuedAt.getTime() + 4 * HOUR),
        }),
      );
    }
    prescriptions.push(rx);
  }

  // A few prescriptions written without a consultation behind them, which is
  // what happens when a doctor reissues from the patient record.
  for (let i = 0; i < 4; i++) {
    const patient = patients[i + 3];
    const rx = await repo(Prescriptions).save({
      patient,
      doctor: doctors[i % doctors.length],
      status: PrescriptionStatus.ACTIVE,
      doctorNotes: 'Repeat of the previous month’s prescription, no change in dose.',
      dispenseStatus: DispenseStatus.PENDING,
      issuedAt: daysAgo(int(1, 6), int(10, 17)),
    } as Prescriptions);
    const items = pickN(medicines.filter((m) => m.isAvailable), 2).map((medicine) => ({
      prescription: rx,
      medicine,
      dosage: '1 tablet',
      frequency: pick(FREQUENCIES),
      duration: '30 days',
      route: 'Oral',
      instructions: 'Same as before',
    }));
    itemCount += (await repo(PrescriptionItems).save(items)).length;
    prescriptions.push(rx);
  }

  await repo(DispenseRecords).save(dispenseRows);
  track('prescriptions', prescriptions.length);
  track('prescription_items', itemCount);
  track('dispense_records', dispenseRows.length);

  // ---------- Treatment plans ----------
  const planRows: Partial<TreatmentPlans>[] = [];
  for (let i = 0; i < 12; i++) {
    const patient = patients[i];
    const start = daysAgo(int(5, 60));
    const lengthDays = pick([14, 30, 60, 90]);
    const end = new Date(start.getTime() + lengthDays * DAY);
    planRows.push({
      patient,
      doctor: doctors[i % doctors.length],
      title: pick([
        'Blood pressure control - 3 month plan',
        'Diabetes management and diet review',
        'Post-fever recovery and nutrition',
        'Asthma control plan',
        'Anaemia treatment and iron course',
        'Wound care and dressing schedule',
      ]),
      details:
        'Weekly CHW check with vitals. Medication as prescribed, reviewed at each ' +
        'consultation. Escalate to referral if symptoms worsen or vitals cross the ' +
        'critical thresholds.',
      startDate: isoDate(start),
      endDate: isoDate(end),
      status: end < NOW ? TreatmentPlanStatus.COMPLETED : TreatmentPlanStatus.ACTIVE,
      createdAt: start,
    });
  }
  await repo(TreatmentPlans).save(planRows);
  track('treatment_plans', planRows.length);

  // ---------- Referrals ----------
  const referralRows: Partial<Referrals>[] = [];
  const referralStates: [ReferralStatus, ReferralUrgency][] = [
    [ReferralStatus.PENDING, ReferralUrgency.EMERGENCY],
    [ReferralStatus.PENDING, ReferralUrgency.URGENT],
    [ReferralStatus.PENDING, ReferralUrgency.ROUTINE],
    [ReferralStatus.ACKNOWLEDGED, ReferralUrgency.URGENT],
    [ReferralStatus.ACKNOWLEDGED, ReferralUrgency.ROUTINE],
    [ReferralStatus.ACKNOWLEDGED, ReferralUrgency.EMERGENCY],
    [ReferralStatus.COMPLETED, ReferralUrgency.URGENT],
    [ReferralStatus.COMPLETED, ReferralUrgency.ROUTINE],
    [ReferralStatus.COMPLETED, ReferralUrgency.EMERGENCY],
    [ReferralStatus.COMPLETED, ReferralUrgency.ROUTINE],
    [ReferralStatus.CANCELLED, ReferralUrgency.ROUTINE],
    [ReferralStatus.CANCELLED, ReferralUrgency.URGENT],
  ];

  referralStates.forEach(([status, urgency], i) => {
    const patient = patients[i * 3];
    const facility = FACILITIES[i % FACILITIES.length];
    const createdAt = daysAgo(int(1, 45), int(9, 17));
    // Doctors and CHWs both refer; a CHW referral is usually the emergency one.
    const referredBy = urgency === ReferralUrgency.EMERGENCY ? pick(chws) : pick(doctors);
    referralRows.push({
      patient,
      referredBy,
      consultation: chance(0.6) ? pick(completed) : undefined,
      facilityName: facility.name,
      facilityType: facility.type,
      department: facility.dept,
      reason: pick([
        'Needs an ECG and cardiology review, not possible by chat.',
        'Suspected fracture - requires X-ray and immobilisation.',
        'Persistent anaemia, needs transfusion assessment.',
        'Third trimester with raised BP, needs obstetric monitoring.',
        'Chest pain with abnormal vitals, sending in immediately.',
        'Ultrasound needed to rule out gallstones.',
      ]),
      clinicalSummary:
        `${patient.fullName}, ${patient.gender.toLowerCase()}, from ${patient.village}. ` +
        `${patient.chronicConditions ? `Known ${patient.chronicConditions.toLowerCase()}. ` : ''}` +
        'Vitals and symptom history attached to the patient record. Managed by CHW to date.',
      urgency,
      status,
      outcome:
        status === ReferralStatus.COMPLETED
          ? pick([
              'Seen in outpatient, treated and discharged the same day.',
              'Admitted for two nights, now back home on the ward’s medication.',
              'X-ray clear, advised rest and follow-up here.',
              'Referred onward to the medical college for surgery.',
            ])
          : status === ReferralStatus.CANCELLED
            ? 'Patient declined to travel; managing at home with CHW follow-up.'
            : undefined,
      createdAt,
      updatedAt: status === ReferralStatus.PENDING ? createdAt : new Date(createdAt.getTime() + int(4, 72) * HOUR),
    });
  });
  await repo(Referrals).save(referralRows);
  track('referrals', referralRows.length);

  // ---------- Appointments ----------
  const apptRows: Partial<Appointments>[] = [];
  for (let i = 0; i < 10; i++) {
    apptRows.push({
      patient: patients[i],
      doctor: doctors[i % doctors.length],
      scheduledAt: daysAhead(int(1, 21), pick([9, 10, 11, 16, 17]), pick([0, 30])),
      type: pick(['FOLLOW_UP_CHAT', 'REVIEW', 'CONSULTATION', 'HOME_VISIT']),
      status: AppointmentStatus.SCHEDULED,
      createdBy: pick([...doctors, ...chws]),
      reminderSent: false,
      createdAt: daysAgo(int(1, 10)),
    });
  }
  for (let i = 0; i < 6; i++) {
    apptRows.push({
      patient: patients[i + 10],
      doctor: doctors[i % doctors.length],
      scheduledAt: daysAgo(int(3, 30), pick([10, 11, 16])),
      type: pick(['FOLLOW_UP_CHAT', 'REVIEW']),
      status: AppointmentStatus.COMPLETED,
      createdBy: pick(doctors),
      reminderSent: true,
      createdAt: daysAgo(int(31, 45)),
    });
  }
  for (let i = 0; i < 3; i++) {
    apptRows.push({
      patient: patients[i + 20],
      doctor: doctors[i % doctors.length],
      scheduledAt: daysAgo(int(1, 14), 11),
      type: 'FOLLOW_UP_CHAT',
      status: AppointmentStatus.CANCELLED,
      cancelReason: pick(['Patient travelling', 'Doctor unavailable - emergency call', 'Rescheduled at patient’s request']),
      createdBy: pick(chws),
      reminderSent: true,
      createdAt: daysAgo(int(15, 25)),
    });
  }
  await repo(Appointments).save(apptRows);
  track('appointments', apptRows.length);

  // ---------- Notifications ----------
  // Shaped exactly like the ones the services emit, so the panel looks real.
  const notificationRows: Partial<Notifications>[] = [];

  for (const { patient, report } of criticalReports.slice(0, 6)) {
    const title = 'CRITICAL patient flagged';
    const body = `${patient.fullName} (${patient.mrn}): ${report.primaryComplaint}`;
    for (const recipient of [admin, ...doctors]) {
      notificationRows.push({
        user: recipient,
        type: NotificationType.EMERGENCY_ALERT,
        title,
        body,
        refId: patient.id,
        isRead: chance(0.4),
        createdAt: report.recordedAt,
      });
    }
  }

  for (const rx of prescriptions.filter((p) => p.dispenseStatus !== DispenseStatus.PENDING).slice(0, 6)) {
    if (!rx.patient.user) continue;
    notificationRows.push({
      user: rx.patient.user,
      type: NotificationType.PRESCRIPTION_READY,
      title: 'Prescription ready for collection',
      body: `Your prescription from ${rx.doctor.fullName} is ready at the pharmacy.`,
      refId: rx.id,
      isRead: chance(0.5),
      createdAt: rx.dispensedAt ?? rx.issuedAt,
    });
  }

  for (const appt of apptRows.filter((a) => a.status === AppointmentStatus.SCHEDULED).slice(0, 6)) {
    const patientUser = (appt.patient as Patients).user;
    if (!patientUser) continue;
    notificationRows.push({
      user: patientUser,
      type: NotificationType.APPOINTMENT_REMINDER,
      title: 'Appointment reminder',
      body: `You have a consultation with ${(appt.doctor as Users).fullName} tomorrow.`,
      refId: 0,
      isRead: false,
      createdAt: hoursAgo(int(2, 20)),
    });
  }

  for (const inv of inventory.filter((i) => i.stockQty <= i.threshold)) {
    for (const recipient of [...pharmacists, admin]) {
      notificationRows.push({
        user: recipient,
        type: NotificationType.LOW_STOCK,
        title: 'Low stock',
        body: `${inv.medicine.brandName} ${inv.medicine.strength} is down to ${inv.stockQty} units.`,
        refId: inv.medicine.id,
        isRead: chance(0.3),
        createdAt: hoursAgo(int(1, 60)),
      });
    }
  }

  for (const consult of consultations.filter((c) => c.status === ConsultationStatus.SCHEDULED)) {
    notificationRows.push({
      user: consult.doctor,
      type: NotificationType.ASSIGNMENT,
      title: 'New consultation assigned',
      body: `${consult.patient.fullName} (${consult.patient.mrn}) - ${consult.reason}`,
      refId: consult.id,
      isRead: chance(0.5),
      createdAt: consult.createdAt,
    });
  }
  await repo(Notifications).save(notificationRows);
  track('notifications', notificationRows.length);

  // ---------- Audit logs ----------
  const auditRows: Partial<AuditLogs>[] = [];
  const actors = [admin, ...doctors, ...chws, ...pharmacists, receptionist];
  const log = (
    actor: Users,
    action: AuditAction,
    resource: string,
    resourceId: number | undefined,
    detail: string,
    createdAt: Date,
  ) =>
    auditRows.push({
      actor,
      actorEmail: actor.email,
      actorRole: actor.role,
      action,
      resource,
      resourceId,
      detail,
      ip: `10.20.${int(0, 40)}.${int(2, 250)}`,
      createdAt,
    });

  for (const actor of actors) {
    for (let i = 0; i < int(2, 5); i++) {
      log(actor, AuditAction.LOGIN, 'auth', undefined, 'Successful login', daysAgo(int(0, 20), int(7, 20), int(0, 59)));
    }
  }
  for (let i = 0; i < 6; i++) {
    const actor = pick(actors);
    log(actor, AuditAction.LOGIN_FAILED, 'auth', undefined, 'Incorrect password', daysAgo(int(0, 25), int(7, 22), int(0, 59)));
  }
  for (let i = 0; i < 30; i++) {
    const patient = pick(patients);
    log(pick([...doctors, ...chws]), AuditAction.VIEW, 'patients', patient.id, `Viewed record ${patient.mrn}`, daysAgo(int(0, 25), int(8, 19), int(0, 59)));
  }
  for (const patient of patients.slice(0, 14)) {
    log(patient.registeredBy ?? chws[0], AuditAction.CREATE, 'patients', patient.id, `Registered ${patient.fullName} (${patient.mrn})`, patient.createdAt);
  }
  for (const rx of prescriptions.slice(0, 12)) {
    log(rx.doctor, AuditAction.CREATE, 'prescriptions', rx.id, `Issued prescription for ${rx.patient.mrn}`, rx.issuedAt);
  }
  for (const row of dispenseRows.slice(0, 10)) {
    log(row.dispensedBy as Users, AuditAction.DISPENSE, 'prescriptions', (row.prescription as Prescriptions).id, `Dispensed ${(row.medicine as Medicines).brandName} x${row.quantity}`, row.dispensedAt as Date);
  }
  for (let i = 0; i < 8; i++) {
    const patient = pick(patients);
    log(pick(chws), AuditAction.UPDATE, 'patients', patient.id, 'Updated contact details', daysAgo(int(0, 30), int(9, 18), int(0, 59)));
  }
  for (let i = 0; i < 3; i++) {
    log(admin, AuditAction.UPDATE, 'settings', undefined, `Changed ${pick(DEFAULT_SETTINGS).key}`, daysAgo(int(1, 40), int(10, 16)));
  }
  for (let i = 0; i < 2; i++) {
    log(admin, AuditAction.DELETE, 'prescription_templates', int(1, 6), 'Removed an unused template', daysAgo(int(5, 40), 14));
  }
  await repo(AuditLogs).save(auditRows);
  track('audit_logs', auditRows.length);

  // ---------- Summary ----------
  const criticalPatient = patients[PATIENT_COUNT - 1];
  console.log('\nSeed complete.\n');
  const width = Math.max(...Object.keys(counts).map((k) => k.length));
  Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([table, n]) => console.log(`  ${table.padEnd(width)}  ${String(n).padStart(5)}`));
  console.log('  ' + 'password_resets'.padEnd(width) + '      0   (intentional - see file header)');

  console.log(`\nLogins - password for every account is: ${DEFAULT_PW}`);
  console.log('  Admin        admin@medbridge.com');
  console.log(`  Doctor       doctor1@medbridge.com        (${doctorProfiles[0].name}, ${doctorProfiles[0].spec})`);
  console.log(`  CHW          chw1@medbridge.com           (${chwProfiles[0].name})`);
  console.log(`  Pharmacist   pharmacist1@medbridge.com    (${pharmacistProfiles[0].name})`);
  console.log(`  Patient      patient1@medbridge.com       (${patients[0].fullName}, ${patients[0].mrn})`);
  console.log(`  Staff        staff1@medbridge.com         (front desk)`);
  console.log(`\n  Patients patient1..patient${PORTAL_LOGINS}@medbridge.com all have portal logins.`);
  console.log(`  Latest CRITICAL triage: ${criticalPatient.fullName} (${criticalPatient.mrn}), patient id ${criticalPatient.id}.`);

  await dataSource.destroy();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});