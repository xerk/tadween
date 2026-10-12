// Tadween: which OpenAI models the app calls, and what each AI action costs in
// credits. Everything is read from the environment so the owner can trade cost
// for quality without a release; see docs/tadween/ai-credits.md.

const env = (name: string, fallback: string) =>
  (process.env[name] || '').trim() || fallback;

const envInt = (name: string, fallback: number) => {
  const value = parseInt(process.env[name] || '', 10);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
};

export type ImageQuality = 'low' | 'medium' | 'high';

export const aiModels = {
  // The chat agent (Mastra, /agents) and the scheduling MCP tools it drives
  agent: () => env('OPENAI_AGENT_MODEL', 'gpt-5-mini'),
  // Writing: composer assistant, thread splitting, post generator, prompts
  writing: () => env('OPENAI_WRITING_MODEL', 'gpt-4.1-mini'),
  image: () => env('OPENAI_IMAGE_MODEL', 'chatgpt-image-latest'),
  imageQuality: (): ImageQuality => {
    const quality = env('OPENAI_IMAGE_QUALITY', 'medium');
    return quality === 'low' || quality === 'high' ? quality : 'medium';
  },
};

export type AiCreditAction = 'write' | 'agent_message' | 'image' | 'image_hd';

export const aiCreditCost = (action: AiCreditAction) => {
  switch (action) {
    case 'write':
      return envInt('AI_CREDITS_WRITE', 1);
    case 'agent_message':
      return envInt('AI_CREDITS_AGENT_MESSAGE', 2);
    case 'image':
      return envInt('AI_CREDITS_IMAGE', 5);
    case 'image_hd':
      return envInt('AI_CREDITS_IMAGE_HD', 20);
  }
};

// Images are billed by the quality they are generated at
export const imageCreditAction = (): AiCreditAction =>
  aiModels.imageQuality() === 'high' ? 'image_hd' : 'image';

// Fair use: agent messages per workspace per hour
export const agentMessagesPerHour = () =>
  envInt('AI_AGENT_MESSAGES_PER_HOUR', 60);

// One-time top-up packs, priced in USD cents. Purchased credits never expire.
export const aiCreditPacks = [
  { id: 'pack_150', credits: 150, amount: 500 },
  { id: 'pack_350', credits: 350, amount: 1000 },
  { id: 'pack_1000', credits: 1000, amount: 2500 },
];

// A CopilotKit single-endpoint request ({ method, body }) that answers a new
// user message. Tool results the browser sends back to continue the same
// answer, thread loading, connect and stop calls are not charged.
export const isNewCopilotMessage = (body: any) => {
  if (body?.method !== 'agent/run') {
    return false;
  }

  const messages = body?.body?.messages;
  return (
    Array.isArray(messages) &&
    messages.length > 0 &&
    messages[messages.length - 1]?.role === 'user'
  );
};
