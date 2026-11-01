-- Generated offline from pinned Better Auth; adult authentication only.
-- Apply only to a separately reviewed MEMBERSHIP_DB, never the AI budget or student storage.
create table "membership_auth_user" ("id" text not null primary key, "name" text not null CHECK ("name" = 'Teacher member'), "email" text not null unique, "emailVerified" integer not null CHECK ("emailVerified" = 1), "image" text CHECK ("image" IS NULL), "createdAt" date not null, "updatedAt" date not null);

create table "membership_auth_session" ("id" text not null primary key, "expiresAt" date not null, "token" text not null unique, "createdAt" date not null, "updatedAt" date not null, "ipAddress" text CHECK ("ipAddress" IS NULL), "userAgent" text CHECK ("userAgent" IS NULL), "userId" text not null references "membership_auth_user" ("id") on delete cascade);

create table "membership_auth_account" ("id" text not null primary key, "accountId" text not null, "providerId" text not null CHECK ("providerId" = 'google'), "userId" text not null references "membership_auth_user" ("id") on delete cascade, "accessToken" text CHECK ("accessToken" IS NULL), "refreshToken" text CHECK ("refreshToken" IS NULL), "idToken" text CHECK ("idToken" IS NULL), "accessTokenExpiresAt" date, "refreshTokenExpiresAt" date, "scope" text CHECK ("scope" IS NULL), "password" text CHECK ("password" IS NULL), "createdAt" date not null, "updatedAt" date not null);

create table "membership_auth_verification" ("id" text not null primary key, "identifier" text not null, "value" text not null, "expiresAt" date not null, "createdAt" date not null, "updatedAt" date not null);

create table "membership_auth_rate_limit" ("id" text not null primary key, "key" text not null unique, "count" integer not null, "lastRequest" bigint not null);

create index "membership_auth_session_userId_idx" on "membership_auth_session" ("userId");

create index "membership_auth_account_userId_idx" on "membership_auth_account" ("userId");

create index "membership_auth_verification_identifier_idx" on "membership_auth_verification" ("identifier");

create unique index "membership_auth_account_provider_subject" on "membership_auth_account" ("providerId", "accountId");
