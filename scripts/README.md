# 🎨 Online Boutique - GitHub Issue Generator

This utility dynamically generates and submits extremely detailed, context-aware, and highly realistic development, SRE, security, and infrastructure issues to your GitHub repository. It uses Vertex AI's Gemini API (via Application Default Credentials) to analyze the microservices stack and generate professional issues containing:
- Authenticated, language-specific logs or stack traces
- Specific code file pointers in the repository
- Relevant GitHub labels (e.g., `area:cartservice`, `category:security-compliance`)
- Clear steps to reproduce, impact analysis, and technical fix proposals

---

## ⚙️ Prerequisites

Before running the tool, make sure you have:
1. **GitHub CLI (`gh`)**: Installed and authenticated.
   - Install: [cli.github.com](https://cli.github.com/)
   - Authenticate: `gh auth login`
2. **Google Cloud SDK (`gcloud`)**: Installed and configured.
   - Configure active project: `gcloud config set project <PROJECT_ID>`
3. **Application Default Credentials (ADC)**: Authenticated locally.
   - Run: `gcloud auth application-default login`
   - Ensure the Vertex AI API (`aiplatform.googleapis.com`) is enabled in your Google Cloud Project.

---

## 🚀 Setup & Installation

To install all dependencies (isolated in the `scripts` subdirectory) from the repository root, run:
```bash
npm run setup
```

---

## 🏃 Usage

You can run the script in either **Interactive** or **Automated CLI** mode.

### 1. Interactive Mode (Default)
Run without arguments to start the step-by-step terminal wizard:
```bash
npm run generate-issues
```
The wizard will guide you to select:
- The target microservice (e.g. `frontend`, `cartservice`, `checkoutservice`)
- The issue category (e.g. `security-compliance`, `networking-mesh`, `performance-latency`)
- The severity (`low`, `medium`, `high`, `critical`)
- Number of issues to generate
- Whether to run as a **dry-run** (preview only) or submit directly to GitHub.

### 2. Automated CLI Mode
Pass command-line arguments to bypass the interactive prompts (great for CI/CD, scripting, or rapid batch injection):
```bash
npm run generate-issues -- [options]
```

#### CLI Options:
- `--service <name>`: Specific target service (e.g., `frontend`, `cartservice`, `adservice`, `random`)
- `--category <name>`: Problem category (e.g., `frontend-ux`, `backend-grpc`, `database-caching`, `security-compliance`, `networking-mesh`, `infrastructure-iac`, `performance-latency`, `memory-leak-crash`, `resiliency-chaos`, `ai-integration`, `random`)
- `--severity <level>`: Gravity level (`low`, `medium`, `high`, `critical`, `random`)
- `--count <number>`: Number of issues to generate (default: `1`)
- `--dry-run`: Renders and prints the issues directly to the console instead of pushing them to GitHub
- `--project <id>`: Manually specify a GCP Project ID (overrides default `gcloud` config)
- `--help, -h`: Prints command instructions and usage

#### Examples:
- **Dry-run (Preview) a critical security vulnerability on `paymentservice`**:
  ```bash
  npm run generate-issues -- --service paymentservice --category security-compliance --severity critical --dry-run
  ```
- **Push 3 random performance latency issues to GitHub**:
  ```bash
  npm run generate-issues -- --category performance-latency --count 3
  ```

---

## 🏗️ Supported Problem Categories
- **Frontend UX & Interactivity**: UI failures, cart state desyncs, shopping assistant latency.
- **Backend Logic & gRPC APIs**: Inter-service payload mismatch, proto contract violations, timeout handling.
- **Database & Caching (Redis/Spanner)**: Connection exhaustion, stale caches, slow querying.
- **Security, Compliance & IAM**: Hardcoded credentials, directory traversal, package vulnerabilities, excessive IAM roles.
- **Networking & Service Mesh (Istio)**: mTLS failures, VirtualService route timeout/misconfigurations.
- **Infrastructure & IaC (GKE/Terraform)**: CPU throttling, GKE Auto-pilot configurations, HPA issues, Terraform state drift.
- **CI/CD & Deployment**: Cloud Build optimization bottlenecks, slow container layers.
- **Performance & High Latency**: N+1 queries, blocking loops, locks contention.
- **Memory Leaks & OOM Crashes**: Kubernetes pod OOM-Kills, memory accumulation.
- **Resiliency & Chaos**: Missing retry budgets, cascading failures, untuned circuit breakers.
- **AI & Shopping Assistant**: Gemini API timeouts, bad vector db embeddings, prompt injection bugs.
