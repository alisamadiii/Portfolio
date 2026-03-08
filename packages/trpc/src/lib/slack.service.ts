// packages/api/src/services/slack.service.ts
import type { KnownBlock } from "@slack/web-api";
import { WebClient } from "@slack/web-api";

import { urls } from "@workspace/ui/lib/company";

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
const CHANNEL_ID = process.env.SLACK_CHANNEL_ID!;

type SlackNotificationParams = {
  requesterId?: string;
  subject: string;
  message: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  projectType: string;
  actorName?: string;
  email?: string;
  userId?: string;
};

const priorityEmoji: Record<string, string> = {
  LOW: "🟢",
  MEDIUM: "🟡",
  HIGH: "🟠",
  URGENT: "🔴",
};

export async function sendSlackNotification(params: SlackNotificationParams) {
  const {
    requesterId,
    subject,
    message,
    priority,
    projectType,
    actorName,
    email,
    userId,
  } = params;
  const emoji = priorityEmoji[priority] ?? "⚪";

  const contextParts: string[] = [];
  if (requesterId) contextParts.push(`# *${requesterId}*`);
  if (actorName) contextParts.push(`👤 *${actorName}*`);
  if (email) contextParts.push(`📧 ${email}`);
  if (userId) contextParts.push(`🆔 \`${userId}\``);

  const blocks: KnownBlock[] = [
    // Header
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `${emoji} ${subject}`,
        emoji: true,
      },
    },

    // Priority & Project Type
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Priority*\n${emoji} ${priority}`,
        },
        {
          type: "mrkdwn",
          text: `*Project Type*\n📁 ${projectType}`,
        },
      ],
    },

    // Message
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Message*\n> ${message}`,
      },
    },

    // Actor context (name, email, userId in one block)
    ...(contextParts.length > 0
      ? ([
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: contextParts.join("  •  "),
              },
            ],
          },
        ] satisfies KnownBlock[])
      : []),

    { type: "divider" },

    // Action button
    ...(userId
      ? ([
          {
            type: "actions",
            elements: [
              {
                type: "button",
                text: {
                  type: "plain_text",
                  text: "📋 View in Dashboard",
                  emoji: true,
                },
                url: `${urls.admin}/agency/${userId}`,
                style: "primary",
                action_id: "view_agency",
              },
            ],
          },
        ] satisfies KnownBlock[])
      : []),
  ];

  await slack.chat.postMessage({
    channel: CHANNEL_ID,
    text: `${emoji} ${subject} — ${message}`,
    blocks,
  });
}
