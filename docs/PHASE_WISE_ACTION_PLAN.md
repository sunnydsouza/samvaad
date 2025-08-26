# 🚀 MCP Finance Assistant - Phase-Wise Action Plan

## 📋 Overview
This action plan creates a comprehensive roadmap for building the MCP finance assistant with **MCP server-first approach**, followed by the client UI. Both components are designed to be built and run independently within the same monorepo structure.

## 🎯 Project Goals
- **Primary**: Build MCP server that exposes finance tools via Model Context Protocol
- **Secondary**: Build Next.js chat UI that consumes the MCP server
- **Architecture**: Monorepo supporting independent development and deployment

---

## 📁 Repository Structure (Target)
```
finance-assistant/

│   ├── src/
│   │   ├── app/           # App router
│   │   ├── components/    # React components
│   │   ├── lib/           # Utilities & MCP client
│   │   └── styles/        # Tailwind styles
│   ├── package.json
│   ├── next.config.js
│   └── vercel.json
├── shared/                 # Shared types & utilities
│   ├── types/             # TypeScript definitions
│   └── schemas/           # Pydantic/Zod schemas
├── docs/                   # Documentation
├── scripts/                # Development scripts
└── docker-compose.yml      # Local development setup
```

---

## 🔄 Development Phases

### **PHASE 0: Repository & Infrastructure Setup** ⏱️ 2-3 hours

#### 0.1 Monorepo Structure Creation
- [ ] Create directory structure for server/client separation
- [ ] Setup root-level configuration files
- [ ] Create development scripts for independent component management
- [ ] Initialize git submodule structure or workspace configuration

#### 0.2 Environment Configuration
- [ ] Create `.env.template` with all required variables
- [ ] Setup `.env.server` and `.env.client` for component isolation
- [ ] Configure environment variable loading for both components

#### 0.3 Documentation Foundation
- [ ] Create README.md with setup instructions for both components
- [ ] Document MCP protocol integration approach
- [ ] Setup API documentation structure

**Deliverables**: 
- ✅ Functional monorepo structure
- ✅ Environment configuration templates
- ✅ Basic documentation framework

---

### **PHASE 1: MCP Server Foundation** ⏱️ 4-5 hours

#### 1.1 FastAPI + fast-mcp Integration
- [ ] Install and configure FastAPI with fast-mcp
- [ ] Setup MCP protocol handlers and tool discovery
- [ ] Create basic health check and introspection endpoints
- [ ] Configure CORS for cross-origin requests

#### 1.2 MCP Tools Skeleton
- [ ] Implement `query_expenses` tool with stub data
- [ ] Implement `generate_chart` tool with mock responses
- [ ] Implement `create_diagram` tool with placeholder logic
- [ ] Create tool registration and validation system

#### 1.3 Basic Authentication
- [ ] Implement HTTP Basic Auth middleware
- [ ] Create authentication configuration system
- [ ] Add rate limiting and security headers

#### 1.4 Testing Infrastructure
- [ ] Setup pytest with async support
- [ ] Create unit tests for MCP tool functions
- [ ] Implement integration tests for tool discovery
- [ ] Add CLI testing capabilities for MCP protocol

**Deliverables**:
- ✅ Working MCP server with discoverable tools
- ✅ Basic authentication system
- ✅ Test suite covering core functionality
- ✅ CLI testable interface

---

### **PHASE 2: Google Sheets Integration** ⏱️ 4-5 hours

#### 2.1 Google Sheets API Setup
- [ ] Configure Google Service Account authentication
- [ ] Implement Google Sheets API client with proper error handling
- [ ] Create sheet reading and data parsing logic
- [ ] Add data validation and type conversion

#### 2.2 Expense Query Implementation
- [ ] Replace stub data with live Google Sheets data
- [ ] Implement filtering by date, category, amount ranges
- [ ] Add aggregation functions (sum, average, count)
- [ ] Create data caching mechanism to avoid API quotas

#### 2.3 Data Schema & Validation
- [ ] Define Pydantic models for expense data
- [ ] Implement data validation and sanitization
- [ ] Create error handling for malformed sheet data
- [ ] Add support for different sheet structures

#### 2.4 Advanced Query Features
- [ ] Implement SQL-like query parsing
- [ ] Add support for complex filters and grouping
- [ ] Create data transformation utilities
- [ ] Add support for multiple sheet tabs

**Deliverables**:
- ✅ Live Google Sheets integration
- ✅ Robust data querying system
- ✅ Data validation and error handling
- ✅ Caching for performance optimization

---

### **PHASE 3: MCP Tool Enhancement** ⏱️ 3-4 hours

#### 3.1 Chart Data Generation
- [ ] Implement chart data preparation for different chart types
- [ ] Create JSON series generation for Recharts compatibility
- [ ] Add support for pie charts, bar charts, line charts
- [ ] Implement data aggregation for chart visualization

#### 3.2 Mermaid Diagram Generation
- [ ] Integrate Mermaid diagram validation
- [ ] Create diagram templates for financial flows
- [ ] Implement dynamic diagram generation based on data
- [ ] Add error handling and diagram syntax validation

#### 3.3 Tool Response Optimization
- [ ] Optimize tool response times and data formatting
- [ ] Add metadata to tool responses for better UI handling
- [ ] Implement streaming responses for large datasets
- [ ] Create response caching for repeated queries

#### 3.4 MCP Protocol Compliance
- [ ] Ensure full MCP specification compliance
- [ ] Add comprehensive tool documentation
- [ ] Implement tool parameter validation
- [ ] Add support for tool chaining and dependencies

**Deliverables**:
- ✅ Fully functional MCP tools with rich data
- ✅ Chart and diagram generation capabilities
- ✅ MCP protocol compliance
- ✅ Optimized performance and caching

---

### **PHASE 4: Client Foundation Setup** ⏱️ 4-5 hours

#### 4.1 Next.js 15 Application Setup
- [ ] Initialize Next.js 15 with App Router
- [ ] Configure Tailwind CSS and shadcn/ui components
- [ ] Setup TypeScript configuration for strict typing
- [ ] Configure build and development scripts

#### 4.2 MCP Client Integration
- [ ] Install and configure Vercel AI SDK
- [ ] Implement MCP client using `experimental_createMCPClient`
- [ ] Create connection management for MCP server
- [ ] Add authentication handling for MCP requests

#### 4.3 assistant-ui Integration
- [ ] Install and configure assistant-ui components
- [ ] Setup Thread component for chat interface
- [ ] Configure streaming message handling
- [ ] Implement message state management

#### 4.4 Basic Chat Interface
- [ ] Create minimalist ChatGPT-style layout
- [ ] Implement message input and send functionality
- [ ] Add basic message rendering and streaming
- [ ] Setup error handling and loading states

**Deliverables**:
- ✅ Functional Next.js application
- ✅ MCP client connectivity
- ✅ Basic chat interface with streaming
- ✅ assistant-ui integration

---

### **PHASE 5: UI Enhancement & Visualization** ⏱️ 4-5 hours

#### 5.1 Recharts Integration
- [ ] Install and configure Recharts components
- [ ] Create chart rendering components (PieChart, BarChart, LineChart)
- [ ] Implement modal overlay for chart display
- [ ] Add dark mode support for charts

#### 5.2 Mermaid Diagram Rendering
- [ ] Install and configure MermaidJS
- [ ] Create diagram rendering component
- [ ] Add diagram validation and error handling
- [ ] Implement responsive diagram display

#### 5.3 Message Enhancement
- [ ] Add support for rich message formatting
- [ ] Implement code block syntax highlighting
- [ ] Create custom message components for charts/diagrams
- [ ] Add copy-to-clipboard functionality

#### 5.4 UI Polish
- [ ] Implement loading skeletons and animations
- [ ] Add toast notifications for errors and success
- [ ] Create responsive design for mobile devices
- [ ] Add keyboard shortcuts and accessibility features

**Deliverables**:
- ✅ Rich message rendering with charts and diagrams
- ✅ Responsive and accessible UI
- ✅ Error handling and user feedback
- ✅ Professional UI polish

---

### **PHASE 6: Integration & Deployment** ⏱️ 4-5 hours

#### 6.1 End-to-End Integration
- [ ] Test complete MCP server to client flow
- [ ] Validate all three canonical use cases from PRD
- [ ] Implement error recovery and retry logic
- [ ] Add comprehensive logging and monitoring

#### 6.2 Deployment Configuration
- [ ] Configure Fly.io deployment for MCP server
- [ ] Setup Vercel deployment for Next.js client
- [ ] Create environment variable management for production
- [ ] Setup health checks and monitoring

#### 6.3 Security & Performance
- [ ] Implement production security measures
- [ ] Add request rate limiting and DDoS protection
- [ ] Optimize performance for production loads
- [ ] Setup SSL certificates and secure connections

#### 6.4 Documentation & Demo
- [ ] Create comprehensive deployment guide
- [ ] Record demo GIF showing canonical use cases
- [ ] Write API documentation for MCP tools
- [ ] Create troubleshooting guide

**Deliverables**:
- ✅ Production-ready MCP server on Fly.io
- ✅ Production-ready client app on Vercel
- ✅ Complete documentation and demo
- ✅ Security and performance optimization

---

## 🔧 Independent Development Strategy

### MCP Server Development
```bash
# Server-only development
cd server/
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn src.main:app --reload --port 8000

# Test MCP tools independently
python -m pytest tests/
mcp-test-client --server http://localhost:8000
```

### Client Development
```bash
# Client-only development with MCP server mock
cd client/
npm install
npm run dev

# Mock MCP server for frontend development
npm run mock-server
```

### Full Stack Development
```bash
# Run both components together
docker-compose up --build
# OR
npm run dev:full  # Runs both server and client
```

## 🎯 Success Criteria

### MCP Server Success
- [ ] All three canonical questions work via MCP protocol
- [ ] Tools discoverable by Claude CLI, Cursor, etc.
- [ ] Sub-200ms response times for basic queries
- [ ] Handles Google Sheets API quotas gracefully

### Client Success
- [ ] Seamless chat experience with rich visualizations
- [ ] Charts and diagrams render correctly
- [ ] Mobile-responsive design
- [ ] Error states handled gracefully

### Integration Success
- [ ] End-to-end flow works for all use cases
- [ ] Production deployments stable and secure
- [ ] Documentation enables easy setup by new users
- [ ] Demo showcases all major features

## ⚡ Quick Start Commands

```bash
# Initialize entire project
git clone <repo> && cd finance-assistant

# Start MCP server only
make server-dev

# Start client only  
make client-dev

# Start full stack
make dev

# Deploy to production
make deploy
```

This action plan ensures both components can be developed independently while maintaining integration capabilities, following the user's preference for complete, production-grade solutions [[memory:3725230]]. 