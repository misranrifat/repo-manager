# GitHub Repository Manager

A web application to manage your GitHub repositories. Built with Spring Boot and Angular.

## Stack

- Java 17 / Spring Boot 3.2
- Angular 20 / TypeScript
- Docker & Docker Compose

## Setup

1. Get a GitHub Personal Access Token from [GitHub Settings](https://github.com/settings/tokens/new) with `repo` scope

2. Create `.env` file:
```bash
GITHUB_TOKEN=your_token_here
```

3. Run:
```bash
docker-compose up -d
```

4. Open http://localhost:5777

## Development

For local development without Docker:

```bash
# Backend (port 8081)
cd repo-manager-backend
export GITHUB_TOKEN=your_token_here
./gradlew bootRun

# Frontend (port 5777)
cd repo-manager-frontend
npm install
npm start
```