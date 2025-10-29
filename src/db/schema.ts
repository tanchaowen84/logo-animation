import { boolean, pgTable, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const user = pgTable("user", {
	id: text("id").primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	emailVerified: boolean('email_verified').notNull(),
	image: text('image'),
	createdAt: timestamp('created_at').notNull(),
	updatedAt: timestamp('updated_at').notNull(),
	role: text('role'),
	banned: boolean('banned'),
	banReason: text('ban_reason'),
	banExpires: timestamp('ban_expires'),
	customerId: text('customer_id'),
	// Creem related fields
	creemCustomerId: text('creem_customer_id').unique(),
	country: text('country'),
	credits: integer('credits').default(0),
	metadata: jsonb('metadata').default('{}'),
});

export const session = pgTable("session", {
	id: text("id").primaryKey(),
	expiresAt: timestamp('expires_at').notNull(),
	token: text('token').notNull().unique(),
	createdAt: timestamp('created_at').notNull(),
	updatedAt: timestamp('updated_at').notNull(),
	ipAddress: text('ip_address'),
	userAgent: text('user_agent'),
	userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
	impersonatedBy: text('impersonated_by')
});

export const account = pgTable("account", {
	id: text("id").primaryKey(),
	accountId: text('account_id').notNull(),
	providerId: text('provider_id').notNull(),
	userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
	accessToken: text('access_token'),
	refreshToken: text('refresh_token'),
	idToken: text('id_token'),
	accessTokenExpiresAt: timestamp('access_token_expires_at'),
	refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
	scope: text('scope'),
	password: text('password'),
	createdAt: timestamp('created_at').notNull(),
	updatedAt: timestamp('updated_at').notNull()
});

export const verification = pgTable("verification", {
	id: text("id").primaryKey(),
	identifier: text('identifier').notNull(),
	value: text('value').notNull(),
	expiresAt: timestamp('expires_at').notNull(),
	createdAt: timestamp('created_at'),
	updatedAt: timestamp('updated_at')
});

export const payment = pgTable("payment", {
	id: text("id").primaryKey(),
	priceId: text('price_id').notNull(),
	type: text('type').notNull(),
	interval: text('interval'),
	userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
	customerId: text('customer_id').notNull(),
	subscriptionId: text('subscription_id'),
	status: text('status').notNull(),
	periodStart: timestamp('period_start'),
	periodEnd: timestamp('period_end'),
	cancelAtPeriodEnd: boolean('cancel_at_period_end'),
	trialStart: timestamp('trial_start'),
	trialEnd: timestamp('trial_end'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
	// Creem specific fields
	canceledAt: timestamp('canceled_at'),
	metadata: jsonb('metadata').default('{}'),
});

export const creditsHistory = pgTable("credits_history", {
	id: text("id").primaryKey(),
	userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
	amount: integer('amount').notNull(),
	type: text('type').notNull(), // 'add' | 'subtract'
	description: text('description'),
	creemOrderId: text('creem_order_id'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	metadata: jsonb('metadata').default('{}'),
});

export const logoTask = pgTable("logo_task", {
	id: text('id').primaryKey(),
	userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
	status: text('status').notNull().default('vectorized'),
	originalFileKey: text('original_file_key').notNull(),
	originalFileUrl: text('original_file_url'),
	vectorizedFileKey: text('vectorized_file_key'),
	vectorizedFileUrl: text('vectorized_file_url'),
	vectorizedSvg: text('vectorized_svg'),
	labels: jsonb('labels').$type<Array<Record<string, unknown>> | null>().default(sql`'[]'::jsonb`),
	width: integer('width'),
	height: integer('height'),
	originalFormat: text('original_format'),
	compositionId: text('composition_id'),
	compositionDurationInFrames: integer('composition_duration_in_frames'),
	compositionFps: integer('composition_fps'),
	compositionWidth: integer('composition_width'),
	compositionHeight: integer('composition_height'),
	compositionProps: jsonb('composition_props').default(sql`'{}'::jsonb`),
	animationFilePath: text('animation_file_path'),
	renderedVideoKey: text('rendered_video_key'),
	renderedVideoUrl: text('rendered_video_url'),
	renderedAt: timestamp('rendered_at'),
	metadata: jsonb('metadata').default(sql`'{}'::jsonb`),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const logoTaskLog = pgTable("logo_task_log", {
	id: text('id').primaryKey(),
	taskId: text('task_id').notNull().references(() => logoTask.id, { onDelete: 'cascade' }),
	level: text('level').notNull(),
	message: text('message').notNull(),
	details: jsonb('details').default(sql`'{}'::jsonb`),
	createdAt: timestamp('created_at').notNull().defaultNow(),
});
