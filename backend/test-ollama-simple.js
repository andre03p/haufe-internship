import { Ollama } from "ollama";

console.log("Testing Ollama with a simple prompt...\n");

const ollama = new Ollama({
  host: "http://127.0.0.1:11434",
});

const model = "qwen2.5-coder:1.5b";

async function testOllama() {
  try {
    console.log(`Using model: ${model}`);
    console.log("Checking if Ollama is running...\n");

    // Check available models
    const models = await ollama.list();
    console.log(
      "Available models:",
      models.models.map((m) => m.name).join(", ")
    );

    const modelExists = models.models.some((m) => m.name === model);
    if (!modelExists) {
      console.error(`\nError: Model ${model} not found!`);
      console.log("Please run: ollama pull qwen2.5-coder:1.5b");
      process.exit(1);
    }

    console.log(`\n✓ Model ${model} is available`);
    console.log("\nSending a simple code analysis request...\n");

    const startTime = Date.now();

    // Simple, fast prompt
    const prompt = `Analyze this JavaScript code and find one issue:

\`\`\`javascript
function add(a, b) {
  return a + b
}
\`\`\`

Reply in JSON format:
{
  "issues": [
    {
      "line": 2,
      "title": "issue title",
      "severity": "MINOR"
    }
  ]
}`;

    let response = "";
    console.log("Generating response (this may take 10-30 seconds)...");

    const stream = await ollama.generate({
      model: model,
      prompt: prompt,
      stream: true,
      options: {
        temperature: 0.3,
        num_predict: 200, // Limit to 200 tokens for faster response
      },
    });

    for await (const chunk of stream) {
      response += chunk.response;
      // Show progress
      if (response.length % 50 === 0) {
        process.stdout.write(".");
      }
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log("\n\n" + "=".repeat(60));
    console.log("RESPONSE:");
    console.log("=".repeat(60));
    console.log(response);
    console.log("=".repeat(60));
    console.log(`\n✓ Test completed in ${duration} seconds`);
    console.log(
      `Response length: ${response.length} characters (~${Math.ceil(
        response.length / 4
      )} tokens)`
    );
  } catch (error) {
    console.error("\n✗ Error:", error.message);
    console.error("\nMake sure:");
    console.error("1. Ollama is running (check with: ollama list)");
    console.error(
      "2. Model is installed (run: ollama pull qwen2.5-coder:1.5b)"
    );
    process.exit(1);
  }
}

testOllama();
