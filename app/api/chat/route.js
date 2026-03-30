import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, tool } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";

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

const webhookTool = tool({
  description: "Make a request to a webhook URL with a specific task name",
  inputSchema: z.object({
    taskName: z
      .enum(["getCalendar", "addCalendar"])
      .describe("The task name to execute - either getCalendar or addCalendar"),
    data: z
      .object({
        // For addCalendar, you might want to include calendar event details
        title: z.string().optional().describe("Event title (for addCalendar)"),
        startTime: z
          .string()
          .optional()
          .describe("Event start time (for addCalendar)"),
        endTime: z
          .string()
          .optional()
          .describe("Event end time (for addCalendar)"),
        description: z
          .string()
          .optional()
          .describe("Event description (for addCalendar)"),
      })
      .optional()
      .describe("Additional data to send with the webhook request"),
  }),
  execute: async ({ taskName, data = {} }) => {
    try {
      const url =
        "https://n8n.aghayan.space/webhook/cb256b94-a5f1-4a32-8343-b5b8662a2663";
      console.log(
        `======= WEBHOOK TOOL ====== Executing ${taskName} at ${url}`,
      );

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          task: taskName,
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
        `======= WEBHOOK TOOL ====== Response for ${taskName}:`,
        result,
      );

      return JSON.stringify({
        success: true,
        taskName,
        data: result,
      });
    } catch (error) {
      console.error(
        `======= WEBHOOK TOOL ====== Error executing ${taskName}:`,
        error,
      );
      return JSON.stringify({
        success: false,
        taskName,
        error: error.message,
      });
    }
  },
});

export async function POST(req) {
  try {
    const { messages } = await req.json();

    const result = await streamText({
      model: openai("gpt-5.4"),
      system: `
        - You are a general helpful assistant for Harut(your sex master).
        - Use the webhookTool when users want to get calendar events or add calendar events.
        - For getCalendar: use webhookTool with taskName "getCalendar".
        - For addCalendar: use webhookTool with taskName "addCalendar" and include event details like title, startTime, endTime, etc.
      `,
      messages: convertToModelMessages(messages),
      tools: {
        logToConsoleTool: logToConsoleTool,
        webhookTool: webhookTool,
      },
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
