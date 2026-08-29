import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const source = pgTable("source", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  title: text("title").notNull(),
  description: text("description"),
  isPrivate: boolean("is_private").notNull().default(true),
  imageUrl: text("image_url"),
  darkImageUrl: text("dark_image_url"),
  videoUrl: text("video_url"),
  darkVideoUrl: text("dark_video_url"),
  from: text("from"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const sourceFile = pgTable("source_file", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  index: integer("index").notNull().default(0),

  sourceId: uuid("source_id")
    .notNull()
    .references(() => source.id, { onDelete: "cascade" }),

  filename: text("filename").notNull(),
  path: text("path"), // optional: "src/components/Button.tsx"
  content: text("content").notNull(),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const shortLink = pgTable("short_link", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  slug: text("slug").notNull().unique(),
  url: text("url").notNull(),
  clicks: integer("clicks").notNull().default(0),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const previousCustomers = pgTable("previous_customers", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  email: text("email").notNull(),
  code: text("code").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Don't change the order of the values
export const projectsTypeValues = [
  "PORTFOLIO",
  "DOCS",
  "MOTION",
  "AGENCY",
  "TEMPLATE",
  "ADMIN",
  "SAASKIT",
  "CMS",
] as const;
export const projectsTypeEnum = pgEnum("projects_type", projectsTypeValues);

export type ProjectType = (typeof projectsTypeValues)[number];
