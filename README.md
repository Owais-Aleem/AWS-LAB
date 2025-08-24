# Employee App Starter (Frontend + Backend + DB) → Docker → ECR → ECS (Fargate) → Jenkins CI/CD

This repo contains a **minimal but nice** UI, a Node.js + Postgres API, and a Postgres DB. It is set up to run **locally with Docker Compose**, and to **deploy to AWS ECS Fargate** with an **Application Load Balancer**. A `Jenkinsfile` automates build → push → deploy whenever you push code.

## App behavior
- Two boxes:
  - **Add Employee:** submit **id** + **name** to backend (`POST /api/employees`)
  - **See All Employees:** fetch and display all employees (`GET /api/employees`)
- Backend exposes `/api/*` routes.
- In AWS, configure the **ALB** to forward **`/api/*`** to the **backend** target group and `/` to the **frontend**.
- Backend connects to Postgres (in the same ECS task) using `DB_HOST=localhost`.

## Local quickstart
```bash
docker compose up -d --build
# open http://localhost:8081
# API is at http://localhost:3000
```
To reset everything:
```bash
docker compose down -v
```

## What to change for AWS
- In `Jenkinsfile`, update:
  - `AWS_REGION` (e.g., `ap-south-1`), `ECS_CLUSTER`, `ECS_SERVICE`
  - Role ARNs: `EXECUTION_ROLE_ARN`, `TASK_ROLE_ARN`
- In the AWS console:
  1) Create **ECR repos**: `employee-frontend`, `employee-backend`, `employee-db`  
  2) Create **ECS cluster** (Fargate).
  3) Create **ALB** + **two target groups**:
     - TG 1 → forwards to **frontend** container port **80**.
     - TG 2 → forwards to **backend** container port **3000**.
     - Listener rules:
       - Path `/api/*` → TG-backend
       - Default `/` → TG-frontend
  4) Create `ecsTaskExecutionRole` with AWS managed policy **AmazonECSTaskExecutionRolePolicy** (and permissions to read ECR).
  5) Create a security group allowing:
     - ALB SG: inbound 80/443 (from internet), outbound all.
     - Service SG: inbound from ALB SG on 80 and 3000; **no public inbound**.
  6) Create **CloudWatch log group** `/ecs/employee-app`.
  7) Create **ECS service** (Fargate, min 1 task) using your initial task def (you can register it from Jenkins or once manually).
     - Attach **both target groups** to the same service (one for each container name/port).

## Jenkins
- Add Jenkins **credentials**:
  - `aws-access-key-id` (Secret text)
  - `aws-secret-access-key` (Secret text)
  - `aws-account-id-text` (Secret text) *or set AWS_ACCOUNT_ID directly in env.*
- Install AWS CLI on Jenkins agent.
- The pipeline does:
  1. Build images (`frontend`, `backend`, `db`)
  2. Tag & push to ECR (`latest` + Git SHA)
  3. Render taskdef from `taskdef.template.json`
  4. Register task def, update ECS service, wait stable

> **Note:** For production, prefer **Amazon RDS** or **EFS** for DB persistence. The demo uses a Postgres container (suitable for tests/learning).

