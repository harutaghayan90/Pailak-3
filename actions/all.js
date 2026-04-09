"use server";

const N8N_PROMPT_WEBHOOK_URL = process.env.N8N_PROMPT_WEBHOOK_URL || '';

export const getN8nPrompt = async () => {
  try {
    const response = await fetch(N8N_PROMPT_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "get" }), // sending action get
    });

    const data = await response.json();
    // console.log(data);

    return data?.prompt || '';
  } catch (error) {
    console.error(error);
    return "";
  }
};