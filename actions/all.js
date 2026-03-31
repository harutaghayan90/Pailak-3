"use server";

const N8N_PROMPT_WEBHOOK_URL = process.env.N8N_PROMPT_WEBHOOK_URL || '';

export const getN8nPrompt = async () => {
  try {
    const prompt = await fetch(N8N_PROMPT_WEBHOOK_URL);
    const promptJson = await prompt.json();
    // console.log(promptJson);

    return promptJson?.prompt || '';
  } catch (error) {
    console.error(error);
    return "";
  }
};
