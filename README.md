# Node API Docker Commands

## Build the image

```powershell
docker build -t api .
```

## Run with Docker Compose

Start the application in the background using `docker-compose.yml`:

```powershell
docker compose up -d
```

Command explanation:

- `docker compose` uses the Compose configuration in `docker-compose.yml`.
- `up` creates and starts the application container.
- `-d` runs the container in detached mode, so the terminal remains available.
- The Compose service builds the image from the `Dockerfile` when needed.
- Port `8080` is available at `http://localhost:8080`.

Check the Compose service and view its logs:

```powershell
docker compose ps
docker compose logs
docker compose logs -f
```

Verify the API is responding:

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:8080/
```

Stop and remove the Compose application:

```powershell
docker compose down
```

`docker compose down` stops and removes the application container and Compose network. It does not remove the Docker image. Start it again later with `docker compose up -d`.

## Run the API

Run the container in the background and publish it on `http://localhost:8080`:

```powershell
docker run -d --name api -p 8080:8080 api
```

Verify the API is responding:

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:8080/
```

## View status and logs

```powershell
docker ps
docker logs api
docker logs -f api
```

## Stop and remove the container

```powershell
docker stop api
docker rm api
```

To stop and remove it in one command:

```powershell
docker rm -f api
```

## Run interactively

Use this command when you want to see the server output in the current terminal:

```powershell
docker run -it --rm -p 8080:8080 api
```

Command explanation:

- `docker run` creates and starts a container from the `api` image.
- `-it` keeps the terminal interactive so you can see the server output.
- `--rm` removes the container automatically after it stops.
- `-p 8080:8080` maps host port `8080` to the container port `8080`.
- `api` is the Docker image name.

Press `Ctrl+C` in the running terminal to stop the container and release port `8080`.

To stop the interactive container from another PowerShell terminal, find its container ID:

```powershell
docker ps --filter publish=8080
```

Then stop it using the displayed container ID:

```powershell
docker stop <CONTAINER_ID>
```

## Troubleshoot port 8080

List containers currently using port `8080`:

```powershell
docker ps --filter publish=8080
```

Stop every Docker container currently publishing port `8080`:

```powershell
docker stop $(docker ps --filter publish=8080 -q)
```

Stop the named API container if it is already running:

```powershell
docker stop api
```

If Docker shows no container but port `8080` is still busy, identify the Windows process using it:

```powershell
Get-NetTCPConnection -LocalPort 8080 -State Listen | Select-Object OwningProcess
```

Stop that process only after confirming its process ID:

```powershell
Stop-Process -Id <PROCESS_ID> -Force
```

Run the API on another host port if `8080` is needed by another application:

```powershell
docker run -d --name api -p 8081:8080 api
```

The API is then available at `http://localhost:8081`.

## Remove the image

```powershell
docker rmi api
```


### Step 1: Existing container stop koro

```
docker stop nodejscicd
```

### Step 2: Existing container remove koro

```
docker rm nodejscicd
```

### Step 3: Correct port mapping diye abar run koro

```
docker run -d --name nodejscicd -p 8080:8080 taskflow-pro
```

### Step 4: Check koro
docker ps


# Start
```powershell
docker start nodejscicd
```

# Stop
```powershell
docker stop nodejscicd
```

# Restart
```powershell
docker restart nodejscicd
```

# Status
```powershell
docker ps
```

