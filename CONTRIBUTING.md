# Contributing to RepoGPT

Thank you for considering contributing to **RepoGPT**! We welcome contributions of all kinds, including bug fixes, feature enhancements, documentation improvements, and more. This guide will help you get started with contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Features](#suggesting-features)
  - [Improving Documentation](#improving-documentation)
  - [Submitting Pull Requests](#submitting-pull-requests)
- [Development Setup](#development-setup)
  - [Prerequisites](#prerequisites)
  - [Forking the Repository](#forking-the-repository)
  - [Setting Up Your Environment](#setting-up-your-environment)
  - [Running the Application](#running-the-application)
- [Coding Guidelines](#coding-guidelines)
  - [Code Style](#code-style)
  - [Commit Messages](#commit-messages)
- [Testing](#testing)
- [Community and Support](#community-and-support)
- [License](#license)

---

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it to understand the expected behavior in our community.

## How Can I Contribute?

### Reporting Bugs

If you find a bug in the project, please help us by reporting it:

1. **Search Existing Issues**: Before creating a new issue, check if the bug has already been reported.
2. **Create a New Issue**: If it hasn't been reported, create a new issue and include:
   - A clear and descriptive title.
   - Steps to reproduce the problem.
   - Expected vs. actual behavior.
   - Screenshots or logs, if applicable.
   - Environment details (OS, Node.js version, etc.).

### Suggesting Features

We welcome new ideas to improve RepoGPT:

1. **Check for Existing Feature Requests**: See if your idea has already been suggested.
2. **Open a New Issue**: Provide:
   - A detailed description of the feature.
   - Why it would be useful.
   - Any potential drawbacks.

### Improving Documentation

Good documentation helps everyone. You can contribute by:

- Fixing typos or grammatical errors.
- Clarifying instructions.
- Adding examples or tutorials.

### Submitting Pull Requests

We appreciate your efforts to contribute code:

1. **Fork the Repository**: Click the "Fork" button on GitHub to create your own copy.
2. **Create a Branch**: Use a descriptive name (e.g., `fix-login-issue` or `add-chat-feature`).
3. **Make Changes**: Implement your feature or fix.
4. **Commit Changes**: Write clear and concise commit messages.
5. **Push to Your Fork**: `git push origin your-branch-name`.
6. **Create a Pull Request**:
   - Go to the original repository.
   - Click on "New Pull Request".
   - Select your branch and provide a detailed description.

## Development Setup

### Prerequisites

Ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v18 or higher)
- [pnpm](https://pnpm.io/) (preferred package manager)
- [Docker](https://www.docker.com/) (for database setup)
- **PostgreSQL** with the [pgvector extension](https://github.com/pgvector/pgvector)
- [OpenAI API Key](https://platform.openai.com/) (for AI functionalities)

### Forking the Repository

1. Navigate to the [RepoGPT GitHub page](https://github.com/mbarinov/repogpt).
2. Click the **Fork** button to create a copy in your GitHub account.

### Setting Up Your Environment

1. **Clone Your Forked Repository**:

   ```bash
   git clone https://github.com/your-username/repogpt.git
   cd repogpt
   ```

2. **Add Upstream Remote**:

   ```bash
   git remote add upstream https://github.com/mbarinov/repogpt.git
   ```

3. **Install Dependencies**:

   ```bash
   pnpm install
   ```

4. **Set Up PostgreSQL with pgvector**:

   ```bash
   docker run -d \
     --name pgvector \
     -e POSTGRES_USER=postgres \
     -e POSTGRES_PASSWORD=yourpassword \
     -e POSTGRES_DB=repogpt \
     -p 5432:5432 \
     ankane/pgvector
   ```

5. **Create a `.env` File**:

   In the project root directory, create a `.env` file and add:

   ```env
   DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/repogpt
   ```

6. **Initialize the Database Schema**:

   ```bash
   npx prisma db push
   ```

### Running the Application

Start the development server:

```bash
pnpm dev
```

Access the app at `http://localhost:3000`.

## Coding Guidelines

### Code Style

- **Consistency**: Match the existing code style.
- **Formatting**: Use Prettier and ESLint configurations provided in the project.
- **Comments**: Comment complex logic and ensure public methods are documented.
- **Variables and Functions**: Use clear and descriptive names.

### Commit Messages

- **Format**: Use the Conventional Commits standard (e.g., `feat: add new chat feature`).
- **Language**: Write in the imperative mood.
- **Reference Issues**: If applicable, reference related issues (e.g., `fix: resolve login bug closes #123`).

## Community and Support

- **Discussions**: Join our [GitHub Discussions](https://github.com/mbarinov/repogpt/discussions) for questions and community support.
- **Issues**: For bugs and feature requests, use the [GitHub Issues](https://github.com/mbarinov/repogpt/issues) page.
- **Email**: For sensitive matters, contact [me@maxbarinov.com].

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).

---

Thank you for your interest in contributing to RepoGPT! Together, we can make this project even better.
