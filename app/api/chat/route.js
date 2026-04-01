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
  description:
    "Make a request to a webhook URL to manage batches of goals/tasks or a specific calendar range.",
  inputSchema: z.object({
    collection: z
      .enum(["goals", "tasks", "events"])
      .describe("Database table name."),
    action: z
      .enum(["get", "create", "update", "delete"])
      .describe(
        "Operations: get, create, update, delete. Use only after confirmation.",
      ),
    data: z
      .object({
        // Batch operations (Arrays)
        goals: z
          .array(
            z.object({
              id: z.string().optional(),
              status: z.enum(["open", "pending", "completed"]).optional(),
              name: z.string().optional(),
              description: z
                .string()
                .optional()
                .describe("Detailed description or notes for the goal."),
              daily_time_limit: z.int32().optional(),
              start_time: z.string().optional(),
              end_time: z.string().optional(),
            }),
          )
          .optional(),

        tasks: z
          .array(
            z.object({
              id: z.string().optional(),
              status: z.enum(["open", "pending", "completed"]).optional(),
              name: z.string().optional(),
              description: z
                .string()
                .optional()
                .describe("Detailed description or notes for the task."),
              start_time: z.string().optional(),
              end_time: z.string().optional(),
              goal_id: z.string().optional(),
            }),
          )
          .optional(),
        // Single object for calendar range
        events: z
          .array(
            z.object({
              id: z.string().optional(),
              title: z.string().optional(),
              description: z.string().optional(),
              start_time: z.string().optional(),
              end_time: z.string().optional(),
            }),
          )
          .optional(),
      })
      .optional()
      .describe(
        "Data payload. Goals and Tasks must be arrays; Calendar is an object.",
      ),
  }),
  execute: async ({ collection, action, data = {} }) => {
    try {
      const url = N8N_WEBHOOK_URL;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      return JSON.stringify({
        success: true,
        collection,
        action,
        data: result,
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
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
