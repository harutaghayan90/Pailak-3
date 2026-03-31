import { getN8nPrompt } from "@/actions/all";
import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, stepCountIs, streamText, tool } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || "";

const logToConsoleTool = tool({
  description: "Log a message to the console",
  inputSchema: z.object({
    message: z.string().describe("The message to log to the console"),
  }),
  execute: async ({ message }) => {
    console.log("=======  TOOL ====== Console log from AI:", message);
    return "aaaa";
  },
});
const n8nWebhookTool = tool({
  description: "Make a request to a webhook URL with a specific task name",
  inputSchema: z.object({
    collection: z
      .string()
      .describe(
        "Database table name, available options are 'goals','tasks' and 'calendar'",
      ),
    action: z
      .string()
      .describe(
        "Possible operations on database tables get, create, update and delete use carefully only when there is user confirmation for the action, otherwise this should not be used.",
      ),
    data: z
      .object({
        // Single item operations
        goal: z
          .object({
            id: z.string().optional(),
            status: z.enum(["open", "pending", "completed"]).optional(),
            name: z.string().optional(),
            daily_time_limit: z.string().optional(),
            tasks: z.array(z.any()).optional(),
          })
          .optional(),
        task: z
          .object({
            id: z.string().optional(),
            status: z.enum(["open", "pending", "completed"]).optional(),
            name: z.string().optional(),
            start_time: z.string().optional(),
            end_time: z.string().optional(),
            goal_id: z.string().optional(),
          })
          .optional(),
        calendar: z
          .object({
            start_time: z.string().optional(),
            end_time: z.string().optional(),
          })
          .optional(),

        // Batch operations
        goals: z
          .array(
            z.object({
              id: z.string().optional(),
              status: z.enum(["open", "pending", "completed"]).optional(),
              name: z.string().optional(),
              daily_time_limit: z.string().optional(),
              tasks: z.array(z.any()).optional(),
            }),
          )
          .optional(),
        tasks: z
          .array(
            z.object({
              id: z.string().optional(),
              status: z.enum(["open", "pending", "completed"]).optional(),
              name: z.string().optional(),
              start_time: z.string().optional(),
              end_time: z.string().optional(),
              goal_id: z.string().optional(),
            }),
          )
          .optional(),
      })
      .optional()
      .describe("Additional data to send with the webhook request"),
  }),
  execute: async ({ collection, action, data = {} }) => {
    try {
      const url = N8N_WEBHOOK_URL;
      console.log(
        `======= WEBHOOK TOOL ====== Executing ${action} on ${collection} at ${url}`,
      );

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          collection,
          action,
          ...data,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Webhook request failed with status ${response.status}`,
        );
      }

      const result = await response.json();
      console.log(
        `======= WEBHOOK TOOL ====== Response for ${action} on ${collection}:`,
        result,
      );

      return JSON.stringify({
        success: true,
        collection,
        action,
        data: result,
      });
    } catch (error) {
      console.error(
        `======= WEBHOOK TOOL ====== Error executing ${action} on ${collection}:`,
        error,
      );
      return JSON.stringify({
        success: false,
        collection,
        action,
        error: error.message,
      });
    }
  },
});

export async function POST(req) {
  try {
    const { messages } = await req.json();

    const n8nPrompt = await getN8nPrompt();
    // console.log(n8nPrompt);

    const result = await streamText({
      model: openai("gpt-5.4"),
      system: n8nPrompt,
      messages: convertToModelMessages(messages),
      tools: {
        // logToConsoleTool: logToConsoleTool,
        n8nWebhookTool: n8nWebhookTool,
      },
      stopWhen: stepCountIs(10),
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("AI SDK error:", error);
    return NextResponse.json(
      { error: error?.message || "unknown error" },
      { status: 500 },
    );
  }
}
