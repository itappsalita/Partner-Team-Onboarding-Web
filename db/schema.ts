import { mysqlTable, int, varchar, timestamp, text, mysqlEnum, foreignKey, binary, customType } from 'drizzle-orm/mysql-core';
import { relations } from 'drizzle-orm';

/**
 * Custom type for UUID Binary(16) to handle Hex <-> Buffer conversion automatically
 */
// Standard UUID length is 36 characters
const uuidVarchar = (name: string) => varchar(name, { length: 36 });

// --- ENUMS ---
export const roleEnum = ['SUPERADMIN', 'PARTNER', 'PMO_OPS', 'PROCUREMENT', 'QA', 'PEOPLE_CULTURE'] as const;
export const requestStatusEnum = ['REQUESTED', 'SOURCING', 'ON_TRAINING', 'TRAINED', 'COMPLETED', 'CANCELED'] as const;
export const trainingResultEnum = ['PENDING', 'LULUS', 'TIDAK_LULUS'] as const;

// --- TABLES ---

/**
 * USERS TABLE
 * Stores account information for all roles (Admin, Partner, PMO, QA, etc.)
 */
export const users = mysqlTable('users', {
  id: uuidVarchar('id').primaryKey(),
  seqNumber: int('seq_number').autoincrement().unique(),
  displayId: varchar('display_id', { length: 20 }).unique(),
  name: varchar('name', { length: 150 }).notNull(),
  email: varchar('email', { length: 150 }).unique().notNull(),
  password: varchar('password', { length: 255 }).notNull(),
  role: mysqlEnum('role', roleEnum).default('PARTNER').notNull(),
  companyName: varchar('company_name', { length: 255 }),
  isActive: int('is_active').default(1).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

/**
 * REQUESTS FOR PARTNER (RFP)
 * Main entity representing a procurement request for personnel from PMO Ops.
 */
export const requestForPartners = mysqlTable('request_for_partners', {
  id: uuidVarchar('id').primaryKey(),
  seqNumber: int('seq_number').autoincrement().unique(),
  displayId: varchar('display_id', { length: 20 }).unique(),
  pmoId: uuidVarchar('pmo_id').notNull().references(() => users.id),
  sowPekerjaan: text('sow_pekerjaan').notNull(),
  provinsi: varchar('provinsi', { length: 100 }).notNull(),
  area: varchar('area', { length: 100 }).notNull(),
  jumlahKebutuhan: int('jumlah_kebutuhan').notNull(),
  siteId: varchar('site_id', { length: 100 }),
  membersPerTeam: int('members_per_team').default(0).notNull(),
  status: mysqlEnum('status', requestStatusEnum).default('REQUESTED').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

/**
 * DATA TEAM PARTNERS (Assignments)
 * Junction table mapping specific Partners to a Request with defined quotas.
 */
export const dataTeamPartners = mysqlTable('data_team_partners', {
  id: uuidVarchar('id').primaryKey(),
  seqNumber: int('seq_number').autoincrement().unique(),
  displayId: varchar('display_id', { length: 20 }).unique(),
  requestId: uuidVarchar('request_id').notNull().references(() => requestForPartners.id),
  partnerId: uuidVarchar('partner_id').notNull().references(() => users.id),
  torFilePath: varchar('tor_file_path', { length: 255 }),
  bakFilePath: varchar('bak_file_path', { length: 255 }),
  companyName: varchar('company_name', { length: 255 }),
  // Track specific team sourcing status
  status: varchar('status', { length: 50 }).default('SOURCING'),
  createdAt: timestamp('created_at').defaultNow(),
});

/**
 * TEAMS
 * Groups of personnel under a specific assignment.
 */
export const teams = mysqlTable('teams', {
  id: uuidVarchar('id').primaryKey(),
  seqNumber: int('seq_number').autoincrement().unique(),
  displayId: varchar('display_id', { length: 20 }).unique(),
  dataTeamPartnerId: uuidVarchar('data_team_partner_id').notNull().references(() => dataTeamPartners.id),
  teamNumber: int('team_number').notNull(),
  leaderName: varchar('leader_name', { length: 150 }),
  leaderPhone: varchar('leader_phone', { length: 30 }),
  tkpk1Number: varchar('tkpk1_number', { length: 100 }),
  tkpk1FilePath: varchar('tkpk1_file_path', { length: 255 }),
  firstAidNumber: varchar('first_aid_number', { length: 100 }),
  firstAidFilePath: varchar('first_aid_file_path', { length: 255 }),
  electricalNumber: varchar('electrical_number', { length: 100 }),
  electricalFilePath: varchar('electrical_file_path', { length: 255 }),
  position: varchar('position', { length: 100 }),
  location: varchar('location', { length: 150 }),
  status: varchar('status', { length: 50 }).default('SOURCING'),
  createdAt: timestamp('created_at').defaultNow(),
});

/**
 * TEAM MEMBERS
 * Individual personnel data, including NIK, photos, and certificate status.
 */
export const teamMembers = mysqlTable('team_members', {
  id: uuidVarchar('id').primaryKey(),
  seqNumber: int('seq_number').autoincrement().unique(),
  displayId: varchar('display_id', { length: 20 }).unique(),
  teamId: uuidVarchar('team_id').notNull().references(() => teams.id),
  memberNumber: int('member_number').notNull(),
  name: varchar('name', { length: 150 }).notNull(),
  position: varchar('position', { length: 100 }).notNull(),
  nik: varchar('nik', { length: 50 }).notNull(),
  phone: varchar('phone', { length: 30 }).notNull(),
  ktpFilePath: varchar('ktp_file_path', { length: 255 }).notNull(),
  selfieFilePath: varchar('selfie_file_path', { length: 255 }),
  certificateFilePath: varchar('certificate_file_path', { length: 255 }),
  certificateNumber: int('certificate_number'),
  alitaExtEmail: varchar('alita_ext_email', { length: 150 }),
  alitaEmailPassword: varchar('alita_email_password', { length: 255 }),
  isAttendedTraining: int('is_attended_training').default(0).notNull(),
  score: int('score'),
  isReturning: int('is_returning').default(0).notNull(),
  isActive: int('is_active').default(1).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

/**
 * TRAINING PROCESSES
 * Tracks scheduling and results of QA evaluations for each team.
 */
export const trainingProcesses = mysqlTable('training_processes', {
  id: uuidVarchar('id').primaryKey(),
  seqNumber: int('seq_number').autoincrement().unique(),
  displayId: varchar('display_id', { length: 20 }).unique(),
  teamId: uuidVarchar('team_id').notNull().unique().references(() => teams.id),
  qaId: uuidVarchar('qa_id').references(() => users.id),
  trainingDate: timestamp('training_date'),
  result: mysqlEnum('result', trainingResultEnum).default('PENDING').notNull(),
  whatsappGroupJustification: text('whatsapp_group_justification'),
  evaluationNotes: text('evaluation_notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const passwordResetTokens = mysqlTable('password_reset_tokens', {
  id: uuidVarchar('id').primaryKey(),
  email: varchar('email', { length: 150 }).notNull(),
  token: varchar('token', { length: 255 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

/**
 * NOTIFICATIONS
 * Stores in-app notifications for users.
 */
export const notifications = mysqlTable('notifications', {
  id: uuidVarchar('id').primaryKey(),
  userId: uuidVarchar('user_id').notNull().references(() => users.id),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  type: varchar('type', { length: 50 }).notNull(), // 'RFP', 'TRAINING', 'CERTIFICATE', etc.
  isRead: int('is_read').default(0).notNull(),
  link: varchar('link', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
});


// --- RELATIONS ---

export const usersRelations = relations(users, ({ many }) => ({
  requestsAsPmo: many(requestForPartners),
  partnerTeams: many(dataTeamPartners),
  trainingProcessesAsQa: many(trainingProcesses),
  notifications: many(notifications),
}));

export const requestsRelations = relations(requestForPartners, ({ one, many }) => ({
  pmo: one(users, {
    fields: [requestForPartners.pmoId],
    references: [users.id],
  }),
  dataTeamPartners: many(dataTeamPartners),
}));

export const dataTeamPartnersRelations = relations(dataTeamPartners, ({ one, many }) => ({
  request: one(requestForPartners, {
    fields: [dataTeamPartners.requestId],
    references: [requestForPartners.id],
  }),
  partner: one(users, {
    fields: [dataTeamPartners.partnerId],
    references: [users.id],
  }),
  teams: many(teams),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  dataTeamPartner: one(dataTeamPartners, {
    fields: [teams.dataTeamPartnerId],
    references: [dataTeamPartners.id],
  }),
  members: many(teamMembers),
  trainingProcess: one(trainingProcesses, {
    fields: [teams.id],
    references: [trainingProcesses.teamId],
  }),
}));

export const membersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  })
}));

export const trainingProcessesRelations = relations(trainingProcesses, ({ one }) => ({
  team: one(teams, {
    fields: [trainingProcesses.teamId],
    references: [teams.id],
  }),
  qa: one(users, {
    fields: [trainingProcesses.qaId],
    references: [users.id],
  })
}));
