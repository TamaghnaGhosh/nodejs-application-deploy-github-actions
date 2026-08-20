# Node API Docker CI/CD Pipeline

This project is a simple Express API deployed with Docker and GitHub Actions. Every push to the `main` branch connects to an EC2 instance over SSH, pulls the latest code, rebuilds the Docker image, restarts the container, and checks that the app is responding.

## Project Files

- `index.js`: Express API entrypoint
- `Dockerfile`: Docker image instructions
- `docker-compose.yml`: Local Docker Compose runner
- `.dockerignore`: Files excluded from the Docker build context
- `.github/workflows/docker-deploy.yml`: GitHub Actions deployment pipeline

## Local Development

Install dependencies:

```powershell
npm install
```

Run the API locally:

```powershell
npm start
```

Open:

```text
http://localhost:8080/
```

Expected response:

```text
Taskflow API is running
```

## Run With Docker

Build the image:

```powershell
docker build -t taskflow-pro .
```

Run the container:

```powershell
docker run -d --name nodejscicd -p 8080:8080 taskflow-pro
```

Check the container:

```powershell
docker ps
docker logs nodejscicd
```

Stop and remove the container:

```powershell
docker rm -f nodejscicd
```

## Run With Docker Compose

Start:

```powershell
docker compose up -d
```

Check:

```powershell
docker compose ps
docker compose logs -f
```

Stop:

```powershell
docker compose down
```

## How To Create The Pipeline

### 1. Create The Dockerfile

The Dockerfile uses Node 22 Alpine, installs dependencies, copies the app files, exposes port `8080`, and starts `index.js`.

```dockerfile
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 8080

CMD ["node", "index.js"]
```

### 2. Add `.dockerignore`

This keeps the Docker image clean and prevents local files from being copied into the container.

```text
node_modules
npm-debug.log
.git
.github
.env
.env.*
```

### 3. Prepare The EC2 Server

SSH into the EC2 instance:

```bash
ssh -i nodejsappcicd.pem ubuntu@<EC2_PUBLIC_IP>
```

Install Docker and Git if they are not already installed:

```bash
sudo apt update
sudo apt install -y docker.io git
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker ubuntu
```

Log out and log in again after adding the user to the Docker group.

Clone the repository on the EC2 instance:

```bash
git clone https://github.com/TamaghnaGhosh/nodejs-application-deploy-github-actions.git
cd ~/nodejs-application-deploy-github-actions
```

The workflow expects the project path to be:

```text
~/nodejs-application-deploy-github-actions
```

### 4. Add GitHub Repository Secrets

In GitHub, go to:

```text
Repository > Settings > Secrets and variables > Actions > New repository secret
```

Add these secrets:

- `EC2_HOST`: EC2 public IP address or public DNS
- `EC2_USER`: EC2 SSH user, usually `ubuntu`
- `EC2_SSH_KEY`: full private key content from the `.pem` file

For `EC2_SSH_KEY`, paste the complete key including:

```text
-----BEGIN ... PRIVATE KEY-----
...
-----END ... PRIVATE KEY-----
```

### 5. Create The GitHub Actions Workflow

Create this file:

```text
.github/workflows/docker-deploy.yml
```

Add this workflow:

```yaml
name: Build and deploy Docker app

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Setup SSH key
        env:
          EC2_SSH_KEY: ${{ secrets.EC2_SSH_KEY }}
        run: |
          if [ -z "$EC2_SSH_KEY" ]; then
            echo "::error::EC2_SSH_KEY secret is empty"
            exit 1
          fi

          printf '%s\n' "$EC2_SSH_KEY" | tr -d '\r' > /tmp/ec2-key.pem
          chmod 600 /tmp/ec2-key.pem

          ssh-keygen -y -f /tmp/ec2-key.pem > /dev/null

          echo "SSH key setup successful"

      - name: Pull, build, and restart the container
        env:
          EC2_HOST: ${{ secrets.EC2_HOST }}
          EC2_USER: ${{ secrets.EC2_USER }}
        run: |
          if [ -z "$EC2_HOST" ]; then
            echo "::error::EC2_HOST is missing"
            exit 1
          fi

          if [ -z "$EC2_USER" ]; then
            echo "::error::EC2_USER is missing"
            exit 1
          fi

          ssh -i /tmp/ec2-key.pem \
            -o BatchMode=yes \
            -o ConnectTimeout=20 \
            -o StrictHostKeyChecking=no \
            "$EC2_USER@$EC2_HOST" <<'REMOTE_SCRIPT'

            set -e

            cd ~/nodejs-application-deploy-github-actions

            echo "Pulling latest code..."
            git pull origin main

            echo "Building Docker image..."
            docker build -t taskflow-pro .

            echo "Removing old container..."
            docker rm -f nodejscicd 2>/dev/null || true

            echo "Starting new container..."
            docker run -d \
              --name nodejscicd \
              -p 8080:8080 \
              taskflow-pro

            echo "Waiting for application to respond..."
            healthy=false
            for attempt in $(seq 1 30); do
              if curl --fail --silent --show-error http://127.0.0.1:8080/; then
                echo
                echo "Application is healthy"
                healthy=true
                break
              fi

              echo "Attempt $attempt failed; retrying in 2 seconds..."
              sleep 2
            done

            if [ "$healthy" != "true" ]; then
              echo "::error::Application did not respond after 60 seconds"
              docker logs nodejscicd
              exit 1
            fi

            echo "Deployment finished successfully"

          REMOTE_SCRIPT

      - name: Cleanup SSH key
        if: always()
        run: |
          rm -f /tmp/ec2-key.pem
```

The workflow runs on every push to `main`. It:

- validates the SSH key secret
- connects to EC2
- runs `git pull origin main`
- builds the Docker image as `taskflow-pro`
- removes the old `nodejscicd` container
- starts a new container on port `8080`
- waits until the app responds
- prints Docker logs if the app fails

### 6. Understand The Workflow

`name` is the display name shown in the GitHub Actions tab.

`on.push.branches.main` means the pipeline starts automatically whenever code is pushed to the `main` branch.

`runs-on: ubuntu-latest` tells GitHub to run the pipeline on a temporary Ubuntu runner.

The `Setup SSH key` step reads the private key from the `EC2_SSH_KEY` repository secret, writes it to `/tmp/ec2-key.pem`, fixes file permissions with `chmod 600`, and validates the key using `ssh-keygen`.

The `Pull, build, and restart the container` step connects to the EC2 server using:

```bash
ssh -i /tmp/ec2-key.pem "$EC2_USER@$EC2_HOST"
```

Inside the EC2 server, the workflow moves into the project directory:

```bash
cd ~/nodejs-application-deploy-github-actions
```

Then it pulls the latest code:

```bash
git pull origin main
```

After that it builds the Docker image:

```bash
docker build -t taskflow-pro .
```

Then it removes the old running container if it exists:

```bash
docker rm -f nodejscicd 2>/dev/null || true
```

Then it starts a fresh container:

```bash
docker run -d --name nodejscicd -p 8080:8080 taskflow-pro
```

The health check waits for the app to respond at:

```text
http://127.0.0.1:8080/
```

If the app responds, deployment passes. If the app does not respond within 60 seconds, the workflow prints container logs and fails.

The `Cleanup SSH key` step always runs at the end and removes the temporary private key from the GitHub Actions runner.

## Current Deployment Flow

When code is pushed to `main`, GitHub Actions runs:

```bash
git pull origin main
docker build -t taskflow-pro .
docker rm -f nodejscicd 2>/dev/null || true
docker run -d --name nodejscicd -p 8080:8080 taskflow-pro
curl http://127.0.0.1:8080/
```

The deployed app is available on:

```text
http://<EC2_PUBLIC_IP>:8080/
```

Make sure the EC2 security group allows inbound TCP traffic on port `8080`.

## Manual EC2 Restart Commands

Use these on the EC2 instance if you need to restart manually:

```bash
cd ~/nodejs-application-deploy-github-actions
git pull origin main
docker build -t taskflow-pro .
docker rm -f nodejscicd 2>/dev/null || true
docker run -d --name nodejscicd -p 8080:8080 taskflow-pro
docker logs nodejscicd
```

## Troubleshooting

Check container status:

```bash
docker ps -a
```

View logs:

```bash
docker logs nodejscicd
```

Check if port `8080` is already in use:

```bash
sudo lsof -i :8080
```

Restart the container:

```bash
docker restart nodejscicd
```

If GitHub Actions fails during the health check, check the workflow logs. The pipeline prints `docker logs nodejscicd` when the container stops or does not respond within 60 seconds.
