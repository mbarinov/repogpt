# RepoGPT: AI-Powered GitHub Assistant

RepoGPT is an open-source tool that enables developers to interact with their GitHub repositories using natural language. It simplifies repo management and provides AI-driven insights, making it easier to explore and manage codebases efficiently.

## Table of Contents
- [Features](#features)
- [Demo](#demo)
- [Prerequisites](#prerequisites)
- [Installation Guide](#installation-guide)
- [Configuration](#configuration)
- [Running Tests](#running-tests)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

## Features
- **AI-driven repo interaction** – Chat with your repositories to get insights or perform actions.
- **Streamlined repo management** – Import, list, and delete repositories effortlessly.
- **PostgreSQL + pgvector** – Built for efficient AI-powered data processing.
- **Simple setup** – Get up and running in minutes with minimal configuration.

## Demo

Here’s a look at RepoGPT in action:

### Chat with your GitHub repository:
![Chat with Repo](https://storage.googleapis.com/aithelete/chat.png)

### Manage repositories:
![Manage Repos](https://storage.googleapis.com/aithelete/repos.png)

## Prerequisites

Before starting, ensure you have the following:
- [Node.js](https://nodejs.org/) (v16 or higher)
- [pnpm](https://pnpm.io/) (preferred package manager)
- [Docker](https://www.docker.com/) (for database setup)
- PostgreSQL with the pgvector extension installed

## Installation Guide

### 1. Clone the Repository
```bash
git clone https://github.com/mbarinov/repogpt
cd RepoGPT
```

### 2. Install Dependencies
```bash
pnpm install
```

### 3. Set Up the PostgreSQL Database

To leverage AI capabilities, RepoGPT uses pgvector with PostgreSQL. Use Docker to set up the database:

```bash
docker run -d \
  --name pgvector \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=yourpassword \
  -e POSTGRES_DB=repogpt \
  -p 5432:5432 \
  ankane/pgvector
```

### 4. Configure Environment Variables

Create a `.env` file in the project root directory and set the PostgreSQL connection string:

```bash
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/repogpt
```

### 5. Initialize the Database Schema

Use Prisma to push the necessary database schema:

```bash
npx prisma db push
```

### 6. Build and Start the Application

To build and start the app, run:

```bash
pnpm build && pnpm start
```

### 7. Access the Application

Once running, the app will be available at `http://localhost:3000`. You can now start managing and interacting with your repositories via RepoGPT.

## Roadmap

- [ ] Advanced query capabilities for specific file analysis
- [ ] Improve integration with GitHub
- [ ] Integration with other version control systems (e.g., GitLab, Bitbucket)

## Contributing

We love contributions! Fork the repo, make your changes, and submit a pull request. For major changes, please open an issue to discuss your proposal first.

## License

This project is licensed under the MIT License. version should offer a more structured and visually appealing way for developers to engage with RepoGPT. Let me know if you'd like any further changes!