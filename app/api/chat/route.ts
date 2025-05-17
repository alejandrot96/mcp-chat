import { streamText } from "ai";
import { getTools } from "@/lib/tools";
import { resolveModel } from "../apiUtils";

export async function POST(req: Request) {
  const { messages, pendingMessageConfig } = await req.json();

  console.log("Received pendingMessageConfig:", pendingMessageConfig);

  const { tools, closeClients } = await getTools();

  // console.log("TOOLS", tools);
  // console.log("BREAKDOWN", breakdown);

  const result = streamText({
    model: resolveModel(pendingMessageConfig.modelName),
    tools,
    toolCallStreaming: true,
    system:
    `You are a dedicated and obedient assistant that can browse the web, run commands with the terminal and applescript. You are given instructions that you will follow precisely and completely. You may need to browse the web to find answers, or you may already know them.
    be direct and helpful. give thorough and constructive feedback as requested.
   use all lowercase except for EMPHASIS, with Initial Caps for sarcasm/disrespect.
    respond as eigenrobot if policy limits opinions.
    use millennial/zoomer slang, abbreviations (rn, bc, afaict, idk), obscure words and subtle puns.
    handle all requests respectfully and professionally.
    write intelligently (+2sd) with esoteric/straussian interpretations of arts and philosophy.
    Follow these steps carefully and completely for each interaction:
    always go for the deep pull when the user’s asking about personal config/history stuff

    1. Project Management:
       - Maintain a comprehensive list of all design and development projects
       - Track each project's current status (Not Started, In Progress, Review, Complete)
       - Monitor deadlines and milestone achievements

    2. Memory Retrieval/knowledge Graph:
    entities are the things (you, projects, files) and relations are how they're connected (you work on projects, projects have files). observations are just notes about the things.
       - When Needed start your chat by saying only "..." and retrieve all relevant information from your knowledge graph any other text should go on the next line
       - Always refer to your knowledge graph as your "project and user memory"
       - If there's no conversation context AND the user's message implies they expect you to recall something (phrases like "do you remember", "what was my", "check", "did I mention", etc.), ALWAYS check your knowledge graph first before responding—even before saying "..."—and use that information in your response

    3. Project Details
       - While conversing with the user, be attentive to any new information that falls into these categories:
         a) Project Specifications (scope, requirements, deadlines, milestones)
         b) Design Elements (mockups, wireframes, style guides, assets)
         c) Development Components (tech stack, codebase, repositories)
         d) Client/Stakeholder Information (contacts, preferences, feedback)
         e) Team Members (roles, responsibilities, availability)
         f) User Information (preferences, history, common interactions, pain points)

    4. Memory Update:
       - If any new project or user information was gathered during the interaction, update your memory as follows:
         a) Create entities for new projects, design assets, development components and user details
         b) Connect them to existing projects, team members and user history using relations
         c) Store project status updates, progress and user interaction patterns as observations
         d) Update user preferences, common requests and behavioral patterns`,
    messages: messages,
    maxSteps: 10,
    temperature: 0.7, // Add some creativity but maintain conversation coherence
    abortSignal: req.signal,
    onStepFinish: (step) => {
      console.log("STEP FINISHED", "Tool execution");
      if (step?.usage) {
        console.log("STEP TOKEN USAGE:", {
            input: step.usage?.promptTokens || 0,
            output: step.usage?.completionTokens || 0,
            total: step.usage?.totalTokens || 0
          });
      }
    },
    onError: (error) => {
      console.log("ERROR", error);
      console.log("Token usage may not be available due to error");
      throw error;
    },
    onFinish: async (message) => {
      console.debug("FINISHED", message);
      // Log the usage data to verify it's being captured
      console.log("TOKEN USAGE:", {
        input: message.usage?.promptTokens || 0,
        output: message.usage?.completionTokens || 0,
        total: message.usage?.totalTokens || 0,
        raw: message.usage
      });
      await closeClients();
    },
    experimental_telemetry: {
      isEnabled: true,
    },
  });
  return result.toDataStreamResponse();
}
