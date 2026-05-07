import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@workspace/drizzle/index";
import {
  agentConversations,
  agentMessages,
  agentProjects,
} from "@workspace/drizzle/schema";

import { authenticatedProcedure, createTRPCRouter } from "../init";

export const agentProjectsRouter = createTRPCRouter({
  listProjects: authenticatedProcedure.query(async ({ ctx }) => {
    return db
      .select()
      .from(agentProjects)
      .where(eq(agentProjects.userId, ctx.session.user.id))
      .orderBy(agentProjects.updatedAt);
  }),

  getProject: authenticatedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [project] = await db
        .select()
        .from(agentProjects)
        .where(
          and(
            eq(agentProjects.id, input.projectId),
            eq(agentProjects.userId, ctx.session.user.id)
          )
        )
        .limit(1);
      return project ?? null;
    }),

  getConversations: authenticatedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ input }) => {
      return db
        .select()
        .from(agentConversations)
        .where(eq(agentConversations.projectId, input.projectId))
        .orderBy(agentConversations.createdAt);
    }),

  getMessages: authenticatedProcedure
    .input(z.object({ conversationId: z.string().uuid() }))
    .query(async ({ input }) => {
      return db
        .select()
        .from(agentMessages)
        .where(eq(agentMessages.conversationId, input.conversationId))
        .orderBy(agentMessages.createdAt);
    }),

  createConversation: authenticatedProcedure
    .input(z.object({ projectId: z.string().uuid(), title: z.string().optional() }))
    .mutation(async ({ input }) => {
      const [conversation] = await db
        .insert(agentConversations)
        .values({ projectId: input.projectId, title: input.title })
        .returning();
      return conversation;
    }),

  saveMessage: authenticatedProcedure
    .input(
      z.object({
        conversationId: z.string().uuid(),
        role: z.enum(["user", "assistant"]),
        content: z.string(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const [message] = await db
        .insert(agentMessages)
        .values({
          conversationId: input.conversationId,
          role: input.role,
          content: input.content,
          metadata: input.metadata ?? {},
        })
        .returning();
      return message;
    }),
});
