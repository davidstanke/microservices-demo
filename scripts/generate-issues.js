import { execSync, spawnSync } from 'child_process';
import readline from 'readline/promises';
import { GoogleGenAI } from '@google/genai';

// ASCII Art & Color Constants
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

const SERVICES = [
  { name: 'frontend', lang: 'Go', desc: 'Serves the web application UI and routes requests to backend services' },
  { name: 'cartservice', lang: 'C# / .NET', desc: 'Stores users\' shopping carts in a Redis cache' },
  { name: 'productcatalogservice', lang: 'Go', desc: 'Manages product details, search, and inventory metadata' },
  { name: 'currencyservice', lang: 'Node.js', desc: 'Handles exchange rates and converts currency values' },
  { name: 'paymentservice', lang: 'Node.js', desc: 'Charges credit cards via payment gateway simulation' },
  { name: 'shippingassistant', lang: 'Python', desc: 'Calculates shipping fees and handles package fulfillment logistics' },
  { name: 'checkoutservice', lang: 'Go', desc: 'Orchestrates checkout, payments, shipping, and email notifications' },
  { name: 'recommendationservice', lang: 'Python', desc: 'Suggests products to users based on items in their shopping carts' },
  { name: 'emailservice', lang: 'Python', desc: 'Sends order confirmation emails to users' },
  { name: 'adservice', lang: 'Java', desc: 'Provides contextual advertisements based on user page visits' },
  { name: 'shoppingassistantservice', lang: 'Python', desc: 'Gemini-powered shopping assistant to chat and search products' },
  { name: 'loadgenerator', lang: 'Python / Locust', desc: 'Simulates realistic user traffic patterns on the site' }
];

const CATEGORIES = [
  { id: 'frontend-ux', name: 'Frontend UX & Interactivity', desc: 'UI bugs, cart state desync, currency conversion rendering issues' },
  { id: 'backend-grpc', name: 'Backend Logic & gRPC APIs', desc: 'Validation errors, broken schemas, API contract mismatch, inter-service timeouts' },
  { id: 'database-caching', name: 'Database & Caching (Redis/Spanner)', desc: 'Redis connection pool exhaustion, data eviction, stale cache' },
  { id: 'security-compliance', name: 'Security, Compliance & IAM', desc: 'Hardcoded credentials, directory traversal, excessive IAM roles, package vulns' },
  { id: 'networking-mesh', name: 'Networking & Service Mesh (Istio)', desc: 'mTLS handshake failures, faulty DestinationRules/VirtualServices, route timeouts' },
  { id: 'infrastructure-iac', name: 'Infrastructure & IaC (GKE/Terraform)', desc: 'Missing resource limits, CPU throttling, unconfigured HPA, Terraform drifted state' },
  { id: 'cicd-build', name: 'CI/CD & Deployment', desc: 'Cloud Build slow caching, broken integration test gates, container registry issues' },
  { id: 'performance-latency', name: 'Performance & High Latency', desc: 'N+1 querying, blocking event loop, long database lock hold times' },
  { id: 'memory-leak-crash', name: 'Memory Leaks & OOM Crashes', desc: 'Unbounded array accumulation, file descriptor leaks, Kubernetes pod OOM-Kills' },
  { id: 'resiliency-chaos', name: 'Resiliency & Cascading Failures', desc: 'Missing retry budgets, untuned circuit breakers, lack of fallback logic' },
  { id: 'ai-integration', name: 'AI & Shopping Assistant integration', desc: 'Gemini API timeouts, bad prompt injections, vector DB mismatch' }
];

const SEVERITIES = ['low', 'medium', 'high', 'critical'];

// Helper to run shell commands safely
function runCmd(command) {
  try {
    return execSync(command, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch (error) {
    return null;
  }
}

// Check prerequisites
function checkPrerequisites() {
  const ghVersion = runCmd('gh --version');
  if (!ghVersion) {
    console.error(`${COLORS.red}${COLORS.bright}Error: GitHub CLI (gh) is not installed or not in PATH.${COLORS.reset}`);
    console.error('Please install it from https://cli.github.com/ and sign in using `gh auth login`.');
    process.exit(1);
  }

  const ghAuth = runCmd('gh auth status');
  if (ghAuth && ghAuth.includes('Logged in to github.com')) {
    // authenticated
  } else {
    // Double check with exit status
    try {
      execSync('gh repo view', { stdio: 'ignore' });
    } catch {
      console.error(`${COLORS.red}${COLORS.bright}Warning: GitHub CLI (gh) might not be fully authenticated.${COLORS.reset}`);
      console.error('If execution fails, please run: gh auth login');
    }
  }
}

// Detect GCP Project ID
function detectProject() {
  if (process.env.GOOGLE_CLOUD_PROJECT) return process.env.GOOGLE_CLOUD_PROJECT;
  if (process.env.GCLOUD_PROJECT) return process.env.GCLOUD_PROJECT;
  
  const gcloudProject = runCmd('gcloud config get-value project');
  if (gcloudProject && gcloudProject !== '(unset)') {
    return gcloudProject;
  }
  return null;
}

// Parse Command Line Flags
function parseArgs() {
  const args = process.argv.slice(2);
  const flags = {
    service: null,
    category: null,
    severity: null,
    count: 1,
    dryRun: false,
    project: null,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--service':
        flags.service = args[++i];
        break;
      case '--category':
        flags.category = args[++i];
        break;
      case '--severity':
        flags.severity = args[++i];
        break;
      case '--count':
        flags.count = parseInt(args[++i], 10) || 1;
        break;
      case '--dry-run':
        flags.dryRun = true;
        break;
      case '--project':
        flags.project = args[++i];
        break;
      case '--help':
      case '-h':
        flags.help = true;
        break;
    }
  }
  return flags;
}

function printHelp() {
  console.log(`
${COLORS.cyan}${COLORS.bright}GitHub Issue Generator for Microservices Demo${COLORS.reset}
Generate highly realistic, contextual, and complex SRE / development issues using Gemini.

${COLORS.bright}Usage:${COLORS.reset}
  npm run generate-issues [options]

${COLORS.bright}Options:${COLORS.reset}
  --service <name>      Target service (e.g., frontend, cartservice, emailservice, random)
  --category <name>     Type of issue (e.g., frontend-ux, backend-grpc, database-caching, security-compliance, networking-mesh, infrastructure-iac, performance-latency, memory-leak-crash, resiliency-chaos, ai-integration, random)
  --severity <level>    Severity: low, medium, high, critical, random
  --count <number>      Number of issues to generate (default: 1)
  --dry-run             Generate and output issues to terminal without submitting them to GitHub
  --project <id>        Override GCP Project ID for Vertex AI API calls
  --help, -h            Show this help message

${COLORS.bright}Prerequisites:${COLORS.reset}
  1. Authenticated gcloud CLI with Vertex AI API enabled.
  2. Running 'gcloud auth application-default login' in your local shell.
  3. Authenticated GitHub CLI ('gh auth login').
`);
}

// Prompt Helper
async function promptChoice(rl, questionText, items, printValueField = 'name') {
  console.log(`\n${COLORS.bright}${questionText}${COLORS.reset}`);
  items.forEach((item, index) => {
    const val = typeof item === 'string' ? item : item[printValueField];
    const desc = item.desc ? ` - ${COLORS.dim}${item.desc}${COLORS.reset}` : '';
    console.log(`  ${COLORS.green}${index + 1})${COLORS.reset} ${val}${desc}`);
  });
  console.log(`  ${COLORS.green}r)${COLORS.reset} Random`);
  
  const response = await rl.question(`Select an option (1-${items.length} or r) [Random]: `);
  if (!response || response.toLowerCase() === 'r') {
    return 'random';
  }
  const index = parseInt(response, 10) - 1;
  if (isNaN(index) || index < 0 || index >= items.length) {
    console.log(`${COLORS.yellow}Invalid choice. Defaulting to Random.${COLORS.reset}`);
    return 'random';
  }
  return items[index];
}

// Run Interactive CLI wizard
async function runInteractiveWizard() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.clear();
  console.log(`${COLORS.cyan}${COLORS.bright}====================================================`);
  console.log(`   🎨 ONLINE BOUTIQUE - GITHUB ISSUE GENERATOR      `);
  console.log(`====================================================${COLORS.reset}\n`);
  console.log(`This utility uses Vertex AI and Gemini to analyze the repository structure`);
  console.log(`and inject highly realistic developer, SRE, security, or infra issues.\n`);

  const serviceChoice = await promptChoice(rl, 'Select the microservice affected:', SERVICES);
  const categoryChoice = await promptChoice(rl, 'Select the category of the issue:', CATEGORIES);
  const severityChoice = await promptChoice(rl, 'Select the issue severity:', SEVERITIES.map(s => ({ name: s })));
  
  const countResponse = await rl.question(`\n${COLORS.bright}How many issues would you like to generate? [1]: ${COLORS.reset}`);
  const count = parseInt(countResponse, 10) || 1;

  const dryRunResponse = await rl.question(`\n${COLORS.bright}Run in dry-run mode? (Y/n) [Y]: ${COLORS.reset}`);
  const dryRun = dryRunResponse.trim().toLowerCase() !== 'n';

  rl.close();

  return {
    service: serviceChoice === 'random' ? 'random' : serviceChoice.name,
    category: categoryChoice === 'random' ? 'random' : categoryChoice.id,
    severity: severityChoice === 'random' ? 'random' : severityChoice.name,
    count,
    dryRun,
    project: null
  };
}

// Build Prompt for Gemini
function constructPrompt(service, category, severity) {
  const selectedService = service === 'random' 
    ? SERVICES[Math.floor(Math.random() * SERVICES.length)]
    : SERVICES.find(s => s.name === service) || SERVICES[0];

  const selectedCategory = category === 'random'
    ? CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)]
    : CATEGORIES.find(c => c.id === category) || CATEGORIES[0];

  const selectedSeverity = severity === 'random'
    ? SEVERITIES[Math.floor(Math.random() * SEVERITIES.length)]
    : severity;

  const prompt = `You are a Principal SRE and Staff Developer working on the Google Cloud Microservices Demo ("Online Boutique").
We need you to generate a highly detailed, professional, and extremely realistic GitHub Issue depicting a real production or design failure mode.

The issue should target:
- Affected Service: ${selectedService.name} (Written in ${selectedService.lang}. Role: ${selectedService.desc})
- Problem Category: ${selectedCategory.name} (${selectedCategory.desc})
- Severity Level: ${selectedSeverity.toUpperCase()}

Instructions for High Realism:
1. Do NOT make up generic bugs. The issue must sound like it was written by an engineer who investigated a real incident, completed SRE logs triage, or discovered a deep design flaw.
2. Incorporate realistic logs, stack traces, YAML configuration blocks, Terraform code, or gRPC proto file references that look authentic to this microservices stack (Kubernetes, Istio Service Mesh, GCP Memorystore Redis, Spanner, Cloud Build, Kustomize, etc.).
3. If the bug relates to network, service-mesh, database, or infrastructure, reference the exact deployment manifests, Istio VirtualServices, or Terraform GKE resources.
4. Structure the issue body beautifully using GitHub Markdown.

Your output must be a single JSON object. Do not include any markdown block symbols around the JSON itself. The schema of the JSON object must be exactly:
{
  "title": "A short, descriptive, SRE-style title prefixing the service name, e.g., '[cartservice] Redis connection pool exhaustion under high load' or '[frontend] CSP header blocking Shopping Assistant chat widget'",
  "body": "A full, detailed markdown description containing the following structured headings:\\n\\n### 📝 Description\\n[Detailed explanation of the issue, how it manifests, and SRE context]\\n\\n### 🪵 Relevant Logs / Stack Trace\\n\`\`\`[log-syntax]\\n[Realistic multi-line log output or stack trace with correct language/library names]\\n\`\`\`\\n\\n### 🗺️ Steps to Reproduce\\n1. [Step 1]\\n2. [Step 2]\\n\\n### 💥 Impact\\n[Business, performance, and user-experience impacts, e.g., error rate spike, checkout failures]\\n\\n### 💡 Proposed Solution / Fix\\n[Actionable technical solution, patch approach, or config correction]\\n\\n### 📁 Relevant Files\\n- [Exact list of files or directories in this repo that need attention, e.g., 'src/cartservice/src/CartServiceImpl.cs' or 'kubernetes-manifests/frontend.yaml']",
  "labels": ["bug", "area:${selectedService.name}", "severity:${selectedSeverity}", "category:${selectedCategory.id}"]
}

Ensure the issue uses highly specific domain knowledge. For C# (cartservice), use StackExchange.Redis style errors. For Java (adservice), use gRPC io.grpc.StatusRuntimeException. For Go (frontend, productcatalog, checkout, shipping), use standard goroutine stack dumps, context deadline exceeded errors, or json marshaling errors. For Python (emailservice, recommendationservice, shoppingassistantservice), use exception tracebacks, poetry/pip dependency clashes, or asyncio blocking calls.`;

  return prompt;
}

async function callGemini(projectId, prompt) {
  try {
    const ai = new GoogleGenAI({
      vertexai: true,
      project: projectId,
      location: 'us-central1'
    });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.9,
      }
    });

    const text = response.text;
    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanedText);
  } catch (error) {
    console.error(`${COLORS.red}${COLORS.bright}Error calling Vertex AI Gemini API:${COLORS.reset}`, error.message);
    console.error('\nMake sure you have:');
    console.error('  1. run `gcloud auth application-default login`');
    console.error(`  2. set an active GCP project (currently: ${projectId || 'None Detected'})`);
    console.error('  3. enabled the Vertex AI API in that project.');
    process.exit(1);
  }
}

// Create Issue on GitHub via gh CLI
function createGithubIssue(issue) {
  const title = issue.title;
  const body = issue.body;
  const labels = issue.labels || [];

  // Build the CLI arguments
  const args = ['issue', 'create', '--title', title, '--body', body];
  labels.forEach(label => {
    args.push('--label', label);
  });

  try {
    // We use spawnSync to handle arbitrary quotes and characters safely in arguments
    const result = spawnSync('gh', args, { encoding: 'utf-8' });
    if (result.status === 0) {
      const issueUrl = result.stdout.trim();
      console.log(`${COLORS.green}${COLORS.bright}✔ Created Issue: ${COLORS.reset}${issueUrl}`);
      return issueUrl;
    } else {
      // Sometimes labels don't exist yet, we try to create without labels if it fails,
      // or we can prompt standard error. Let's try without labels if first run fails.
      console.log(`${COLORS.yellow}Retrying issue creation without labels...${COLORS.reset}`);
      const fallbackResult = spawnSync('gh', ['issue', 'create', '--title', title, '--body', body], { encoding: 'utf-8' });
      if (fallbackResult.status === 0) {
        const issueUrl = fallbackResult.stdout.trim();
        console.log(`${COLORS.green}${COLORS.bright}✔ Created Issue (Labels skipped): ${COLORS.reset}${issueUrl}`);
        return issueUrl;
      }
      console.error(`${COLORS.red}Error creating GitHub Issue:${COLORS.reset}`, result.stderr || fallbackResult.stderr);
      return null;
    }
  } catch (err) {
    console.error(`${COLORS.red}Exception creating GitHub Issue:${COLORS.reset}`, err.message);
    return null;
  }
}

// Main Execution
async function main() {
  checkPrerequisites();

  const flags = parseArgs();

  if (flags.help) {
    printHelp();
    process.exit(0);
  }

  // Detect GCP Project
  const projectId = flags.project || detectProject();
  if (!projectId) {
    console.error(`${COLORS.red}${COLORS.bright}Error: No GCP Project ID detected.${COLORS.reset}`);
    console.error('Please configure your gcloud project with:');
    console.error('  gcloud config set project <PROJECT_ID>');
    console.error('Or provide it with the --project flag, or GOOGLE_CLOUD_PROJECT environment variable.');
    process.exit(1);
  }

  let options = flags;

  // Determine if we are interactive (if no service/category/severity flag is provided)
  const isInteractive = !flags.service && !flags.category && !flags.severity;
  if (isInteractive) {
    options = await runInteractiveWizard();
    // Inherit the CLI project and override
    if (flags.project) options.project = flags.project;
  }

  console.log(`\n${COLORS.cyan}${COLORS.bright}⚙ Running Configuration:${COLORS.reset}`);
  console.log(`  GCP Project ID: ${COLORS.green}${projectId}${COLORS.reset}`);
  console.log(`  Target Service: ${COLORS.blue}${options.service || 'random'}${COLORS.reset}`);
  console.log(`  Category:       ${COLORS.blue}${options.category || 'random'}${COLORS.reset}`);
  console.log(`  Severity:       ${COLORS.blue}${options.severity || 'random'}${COLORS.reset}`);
  console.log(`  Count:          ${COLORS.green}${options.count}${COLORS.reset}`);
  console.log(`  Dry Run:        ${options.dryRun ? `${COLORS.yellow}Enabled${COLORS.reset}` : `${COLORS.red}Disabled (Issues will be pushed to GitHub)${COLORS.reset}`}\n`);

  for (let c = 1; c <= options.count; c++) {
    console.log(`${COLORS.dim}[${c}/${options.count}]${COLORS.reset} Generating issue outline with Gemini...`);
    const prompt = constructPrompt(options.service, options.category, options.severity);
    const issue = await callGemini(projectId, prompt);

    const title = issue.title || '[Untitled Issue]';
    const body = issue.body || 'No description provided.';
    const labels = issue.labels || [];

    console.log(`\n${COLORS.bright}------------------------------------------------------------`);
    console.log(`${COLORS.cyan}Generated Title:${COLORS.reset} ${COLORS.bright}${title}${COLORS.reset}`);
    console.log(`${COLORS.cyan}Labels:${COLORS.reset} [${labels.join(', ')}]`);
    console.log(`${COLORS.bright}------------------------------------------------------------${COLORS.reset}`);
    
    const safeIssue = { title, body, labels };

    if (options.dryRun) {
      console.log(`\n${COLORS.yellow}--- DRY RUN OUTPUT ---${COLORS.reset}\n`);
      console.log(body);
      console.log(`\n${COLORS.yellow}-----------------------${COLORS.reset}\n`);
    } else {
      console.log('Submitting issue to GitHub...');
      createGithubIssue(safeIssue);
    }
  }

  console.log(`\n${COLORS.green}${COLORS.bright}✔ Done!${COLORS.reset}\n`);
}

main().catch(err => {
  console.error(`${COLORS.red}Fatal Execution Error:${COLORS.reset}`, err);
  process.exit(1);
});
