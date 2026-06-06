import { relations } from "drizzle-orm";
import {
  users, stations, stationUsers, inventory, sales,
  bankAccounts, mobileMoneyConfigs, additionalPaymentMethods,
  auditLogs, founderSessions, featureFlags, pricingPlans,
  subscriptions, coupons, apiKeys, webhooks, emailTemplates,
} from "./schema";

export const usersRelations = relations(users, ({ many }) => ({
  stationMemberships: many(stationUsers),
  sales: many(sales),
  auditLogs: many(auditLogs),
  subscriptions: many(subscriptions),
}));

export const stationsRelations = relations(stations, ({ many }) => ({
  members: many(stationUsers),
  inventory: many(inventory),
  sales: many(sales),
  bankAccounts: many(bankAccounts),
  mobileMoneyConfigs: many(mobileMoneyConfigs),
  additionalPaymentMethods: many(additionalPaymentMethods),
  auditLogs: many(auditLogs),
}));

export const stationUsersRelations = relations(stationUsers, ({ one }) => ({
  station: one(stations, { fields: [stationUsers.stationId], references: [stations.id] }),
  user: one(users, { fields: [stationUsers.userId], references: [users.id] }),
}));

export const salesRelations = relations(sales, ({ one }) => ({
  station: one(stations, { fields: [sales.stationId], references: [stations.id] }),
  user: one(users, { fields: [sales.userId], references: [users.id] }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, { fields: [subscriptions.userId], references: [users.id] }),
  plan: one(pricingPlans, { fields: [subscriptions.planId], references: [pricingPlans.id] }),
}));
